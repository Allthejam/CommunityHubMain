
'use server';

import 'dotenv/config';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/firebase/admin-app';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createOrderAction } from '@/lib/actions/orderActions';
import { handleSubscriptionActivation } from '@/app/api/stripe-webhook/route';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

if (!webhookSecret) {
    console.error('CRITICAL: Stripe webhook secret is not set.');
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
                
                // Set limit to 100 to ensure we don't truncate large multi-business orders
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price.product'], limit: 100 });
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
                            transfer_group: paymentIntent.transfer_group || undefined
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
