
'use server';

import 'dotenv/config';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/firebase/admin-app';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createOrderAction } from '@/lib/actions/orderActions';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

if (!webhookSecret) {
    console.error('CRITICAL: Stripe webhook secret is not set.');
}

/**
 * The single source of truth for activating or updating a subscription in the database.
 * This function is called by webhooks when a payment is confirmed.
 */
export async function handleSubscriptionActivation(subscription: Stripe.Subscription) {
    const { firestore } = initializeAdminApp();
    const { id: subscriptionId, metadata } = subscription;
    console.log(`[STRIPE WEBHOOK] Inside handleSubscriptionActivation for sub ID: ${subscriptionId}`);

    try {
        const businessId = metadata?.businessId;
        const subscriptionType = metadata?.subscriptionType;

        if (!businessId) {
            console.error(`❌ [STRIPE WEBHOOK] CRITICAL: No businessId found in subscription metadata. Sub ID: ${subscriptionId}. Metadata:`, metadata);
            return;
        }

        console.log(`[STRIPE WEBHOOK] Found businessId: ${businessId} and type: ${subscriptionType}. Preparing to update Firestore...`);
        const businessRef = firestore.collection('businesses').doc(businessId);
        
        const updatePayload: { [key: string]: any } = {
            updatedAt: Timestamp.now(),
        };

        if (subscriptionType === 'storefront') {
            updatePayload.storefrontSubscription = true;
            updatePayload.storefrontSubscriptionExpiresAt = Timestamp.fromDate(new Date(subscription.current_period_end * 1000));
            updatePayload.storefrontSubscriptionStatus = FieldValue.delete();
            console.log(`[STRIPE WEBHOOK] Payload for storefront:`, updatePayload);
        } else { // 'listing' or 'enterprise'
            updatePayload.status = 'Subscribed';
            updatePayload.stripeSubscriptionId = subscriptionId;
            updatePayload.stripeCustomerId = subscription.customer as string;
            updatePayload.listingSubscriptionExpiresAt = Timestamp.fromDate(new Date(subscription.current_period_end * 1000));
            updatePayload.listingSubscriptionStatus = FieldValue.delete();
            console.log(`[STRIPE WEBHOOK] Payload for listing/enterprise:`, updatePayload);
        }

        await businessRef.update(updatePayload);
        console.log(`✅ [STRIPE WEBHOOK] Firestore updated successfully for business ${businessId}.`);

        const businessDoc = await businessRef.get();
        if (businessDoc.exists) {
            const businessData = businessDoc.data()!;
            
            // Check for revenue share update (only for main subscriptions)
            if (subscriptionType !== 'storefront') {
                const primaryCommunityId = businessData.primaryCommunityId;
                if (primaryCommunityId) {
                    const businessesInCommunityQuery = firestore.collection('businesses')
                        .where('primaryCommunityId', '==', primaryCommunityId)
                        .where('status', '==', 'Subscribed');
                    const subscriberSnapshot = await businessesInCommunityQuery.get();
                    const subscriberCount = subscriberSnapshot.size;

                    const communityRef = firestore.collection('communities').doc(primaryCommunityId);
                    const communityDoc = await communityRef.get();

                    if (communityDoc.exists) {
                        const communityData = communityDoc.data()!;
                        if (subscriberCount >= 51 && communityData.revenueShare !== 60) {
                            await communityRef.update({
                                revenueShare: 60,
                                revenueShareHistory: FieldValue.arrayUnion({
                                    share: 60,
                                    reason: `Automatic increase for reaching ${subscriberCount} subscribers.`,
                                    effectiveDate: Timestamp.now()
                                })
                            });
                            console.log(`[STRIPE WEBHOOK] Community ${primaryCommunityId} reached ${subscriberCount} subscribers. Revenue share updated to 60%.`);

                            // Notify admins
                            const adminUsersQuery = firestore.collection('users').where('role', 'in', ['admin', 'owner']);
                            const adminSnapshot = await adminUsersQuery.get();
                            if (!adminSnapshot.empty) {
                                const batch = firestore.batch();
                                adminSnapshot.forEach(adminDoc => {
                                    const notificationRef = firestore.collection('notifications').doc();
                                    batch.set(notificationRef, {
                                        recipientId: adminDoc.id,
                                        type: 'Community Milestone',
                                        subject: `${communityData.name} reached 51+ subscribers!`,
                                        from: 'Platform System',
                                        date: Timestamp.now(),
                                        status: 'new',
                                        relatedId: primaryCommunityId,
                                        actionUrl: `/admin/communities/${primaryCommunityId}`,
                                        details: {
                                            communityId: primaryCommunityId,
                                            communityName: communityData.name,
                                            message: `The revenue share for ${communityData.name} has been automatically increased to 60%.`
                                        }
                                    });
                                });
                                await batch.commit();
                                console.log(`[STRIPE WEBHOOK] Notified admins about revenue share increase for community ${primaryCommunityId}.`);
                            }
                        }
                    }
                }
            }
            
            // Notify business owner of successful subscription
            if (businessData.ownerId) {
                const notificationRef = firestore.collection('notifications').doc();
                await notificationRef.set({
                    recipientId: businessData.ownerId,
                    type: "Business Submission",
                    subject: `Your subscription for "${businessData.businessName}" is now active!`,
                    from: "Platform Billing",
                    date: Timestamp.now().toDate().toISOString(),
                    status: 'new',
                    relatedId: businessId,
                });
                console.log(`✅ [STRIPE WEBHOOK] Created success notification for user ${businessData.ownerId}.`);
            }
        }
    } catch (error: any) {
        console.error(`❌ [STRIPE WEBHOOK] Error in handleSubscriptionActivation for subscription ${subscriptionId}:`, error);
    }
}

export async function POST(req: Request) {
  console.log("--- [STRIPE WEBHOOK] Received a request ---");
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`[STRIPE WEBHOOK] Event successfully constructed. Type: ${event.type}`);
  } catch (err: any) {
    console.error(`❌ [STRIPE WEBHOOK] Signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }
  
  const { firestore } = initializeAdminApp();

  try {
    switch (event.type) {
        
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[STRIPE WEBHOOK] Handling checkout.session.completed for session: ${session.id}`);
        
        if (session.mode === 'payment' && session.payment_status === 'paid') {
            console.log("[STRIPE WEBHOOK] This is a one-time payment, processing cart logic...");
            const { purchaseType, shippingAddress, userId } = session.metadata || {};

            if (purchaseType === 'cart_checkout') {
                if (!userId || !shippingAddress) {
                    console.error('Webhook Error: Missing required metadata for cart checkout.');
                    return NextResponse.json({ received: true, error: 'Missing metadata' });
                }
                
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price.product'] });
                const ordersByBusiness: { [key: string]: { items: any[], totalAmount: number } } = {};
                
                for (const item of lineItems.data) {
                    if (!item.price || !item.price.product || typeof item.price.product === 'string') continue;
                    const productMetadata = item.price.product.metadata;
                    const businessId = productMetadata.businessId;
                    const productId = productMetadata.productId;
                    const unitAmount = item.price.unit_amount || 0;

                    if (!businessId || !productId) {
                       if (item.description !== 'Delivery Fee') {
                            console.warn(`Webhook Warning: Skipping line item without businessId or productId: ${item.description}`);
                        }
                        continue;
                    }

                    if (!ordersByBusiness[businessId]) {
                        ordersByBusiness[businessId] = { items: [], totalAmount: 0 };
                    }
                    
                    ordersByBusiness[businessId].items.push({
                        productId: productId,
                        name: item.description,
                        quantity: item.quantity || 0,
                        price: unitAmount / 100,
                    });
                    ordersByBusiness[businessId].totalAmount += (unitAmount * (item.quantity || 0)) / 100;
                }

                const paymentIntentId = session.payment_intent as string;
                if (!paymentIntentId) throw new Error('Payment Intent ID missing from checkout session.');
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                const chargeId = paymentIntent.latest_charge as string;
                if (!chargeId) throw new Error(`Could not find charge ID for Payment Intent ${paymentIntentId}.`);

                for (const businessId in ordersByBusiness) {
                    const order = ordersByBusiness[businessId];
                    await createOrderAction({ userId, businessId, items: order.items, totalAmount: order.totalAmount, shippingAddress });

                    try {
                        const businessDoc = await firestore.collection('businesses').doc(businessId).get();
                        if (!businessDoc.exists) { console.error(`Webhook Transfer Error: Business ${businessId} not found.`); continue; }
                        
                        const stripeAccountId = businessDoc.data()?.stripeAccountId;
                        if (!stripeAccountId) { console.warn(`Webhook Transfer Warning: Business ${businessId} has no connected Stripe account.`); continue; }

                        await stripe.transfers.create({
                            amount: Math.round(order.totalAmount * 100),
                            currency: 'gbp',
                            destination: stripeAccountId,
                            source_transaction: chargeId,
                        });
                        console.log(`✅ [Webhook] Initiated transfer of £${order.totalAmount.toFixed(2)} to business ${businessId}.`);
                    } catch (transferError: any) {
                        console.error(`❌ [Webhook] FATAL: Failed to transfer funds for business ${businessId}: ${transferError.message}`);
                    }
                }
            }
        } else {
           console.log(`[STRIPE WEBHOOK] Ignoring checkout.session.completed for mode: ${session.mode}. Subscription logic handled by invoice.payment_succeeded.`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[STRIPE WEBHOOK] Handling invoice.payment_succeeded for invoice: ${invoice.id}`);
        
        if (invoice.subscription) {
            const subscriptionId = invoice.subscription as string;
            console.log(`[STRIPE WEBHOOK] Invoice is for subscription ID: ${subscriptionId}. Retrieving subscription details...`);
            
            // CRITICAL FIX: Fetch the subscription object from the ID
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            
            console.log(`[STRIPE WEBHOOK] Subscription retrieved. Status: ${subscription.status}, Metadata:`, subscription.metadata);
            
            if (subscription.status === 'active') {
                console.log(`[STRIPE WEBHOOK] Subscription is active. Calling handleSubscriptionActivation...`);
                await handleSubscriptionActivation(subscription);
            } else {
                console.warn(`[STRIPE WEBHOOK] Subscription status is '${subscription.status}', not 'active'. No action taken.`);
            }
        } else {
            console.log(`[STRIPE WEBHOOK] Invoice ${invoice.id} is not for a subscription. Ignoring.`);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[STRIPE WEBHOOK] Handling customer.subscription.updated for sub: ${subscription.id}`);
        const { businessId, subscriptionType } = subscription.metadata;

        if (businessId) {
            const businessRef = firestore.collection('businesses').doc(businessId);
            const updateData: any = {};
            const businessDoc = await businessRef.get();
            if (!businessDoc.exists) break;
            const businessData = businessDoc.data();

            if (subscription.cancel_at_period_end) {
                console.log(`[STRIPE WEBHOOK] Subscription ${subscription.id} for business ${businessId} is scheduled to cancel.`);
                if (subscriptionType === 'storefront') {
                    updateData.storefrontSubscriptionStatus = 'pending_cancellation';
                } else {
                    updateData.listingSubscriptionStatus = 'pending_cancellation';
                }
            } else {
                 if (subscriptionType === 'storefront' && businessData?.storefrontSubscriptionStatus === 'pending_cancellation') {
                    updateData.storefrontSubscriptionStatus = FieldValue.delete();
                 } else if (businessData?.listingSubscriptionStatus === 'pending_cancellation') {
                    updateData.listingSubscriptionStatus = FieldValue.delete();
                 }
            }
             if (Object.keys(updateData).length > 0) {
                await businessRef.update(updateData);
                console.log(`✅ [STRIPE WEBHOOK] Updated subscription status flags for business ${businessId}.`);
            }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[STRIPE WEBHOOK] Handling customer.subscription.deleted for sub: ${subscription.id}`);
        
        const { businessId, subscriptionType } = subscription.metadata;
        if (businessId) {
            const businessRef = firestore.collection('businesses').doc(businessId);
            const businessDoc = await businessRef.get();
            if (businessDoc.exists) {
                const updateData: any = {};
                if (subscriptionType === 'storefront') {
                    updateData.storefrontSubscription = false;
                    updateData.storefrontSubscriptionExpiresAt = FieldValue.delete();
                    updateData.storefrontSubscriptionStatus = FieldValue.delete();
                } else {
                    updateData.status = 'Approved'; // Revert to trial/approved status.
                    updateData.stripeSubscriptionId = FieldValue.delete();
                    updateData.listingSubscriptionExpiresAt = FieldValue.delete();
                    updateData.listingSubscriptionStatus = FieldValue.delete();
                }
                await businessRef.update(updateData);
                console.log(`✅ [STRIPE WEBHOOK] Processed cancellation for business ${businessId}, type: ${subscriptionType}.`);
            }
        }
        break;
      }
    }
  } catch (error: any) {
    console.error(`❌ [STRIPE WEBHOOK] UNHANDLED ERROR processing event ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed internally.' }, { status: 500 });
  }

  console.log("--- [STRIPE WEBHOOK] Finished processing request ---");
  return NextResponse.json({ received: true });
}
