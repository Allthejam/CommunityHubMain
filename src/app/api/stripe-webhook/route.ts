export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecret!, { apiVersion: '2025-07-30.basil' as any });

/**
 * PROPORTIONAL FEE CALCULATION
 * Distributes the Stripe fee across sellers based on their share of the total.
 */
function calculateTransferNet(amount: number, totalAmount: number, totalFee: number): number {
    if (totalAmount <= 0) return 0;
    const proportion = amount / totalAmount;
    const shareOfFee = proportion * totalFee;
    return Math.floor(amount - shareOfFee);
}

/**
 * SHOPPING CART HANDLER
 * Creates orders, updates stock, and triggers transfers.
 */
async function handleCartCheckout(session: Stripe.Checkout.Session) {
    const { firestore } = initializeAdminApp();
    const meta = session.metadata || {};
    
    // Use short keys for metadata to stay under Stripe's character limits
    const userId = meta.uid || meta.userId;
    const communityId = meta.cid || meta.communityId;
    const shippingAddress = meta.sa || meta.shippingAddress;
    const cartMapping = meta.cm ? JSON.parse(meta.cm) : {}; 
    const orderId = session.id;

    if (!userId || !communityId) {
        console.error("❌ [WEBHOOK] Missing critical metadata (uid/cid)");
        return;
    }

    try {
        console.log(`[STRIPE] Processing order: ${orderId}`);
        const totalAmount = session.amount_total || 0;
        // Conservative estimate for fee if balance transaction isn't immediately available
        const totalFee = Math.round(totalAmount * 0.029 + 30); 

        // Retrieve line items
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price.product'] });
        const groups: Record<string, { items: any[], subtotal: number }> = {};

        let deliveryFeeAmount = 0;

        for (const item of lineItems.data) {
            const product = item.price?.product as Stripe.Product;
            
            if (product?.metadata?.isDeliveryFee === 'true') {
                deliveryFeeAmount += item.amount_total || 0;
                continue;
            }

            const productId = product?.metadata?.productId || item.metadata?.productId || 'unknown';
            // Use cartMapping as the primary blueprint for routing
            const bizId = cartMapping[productId] || product?.metadata?.businessId || item.metadata?.businessId;
            
            if (bizId && bizId.trim() !== "") {
                if (!groups[bizId]) groups[bizId] = { items: [], subtotal: 0 };
                groups[bizId].items.push({
                    id: productId,
                    name: item.description,
                    amount: item.amount_total,
                    qty: item.quantity
                });
                groups[bizId].subtotal += (item.amount_total || 0);
            }
        }

        const businessOwnerIdsSet = new Set<string>();

        // Step 1: Database Transaction (Pure logic, no external API calls)
        await firestore.runTransaction(async (transaction) => {
            const masterOrderRef = firestore.collection('orders').doc(orderId);
            
            for (const [bizId, data] of Object.entries(groups)) {
                if (!bizId) continue;
                
                const bizDoc = await transaction.get(firestore.doc(`businesses/${bizId}`));
                const bizData = bizDoc.data();
                const bizOwnerId = bizData?.ownerId;

                if (bizOwnerId) {
                    businessOwnerIdsSet.add(bizOwnerId);
                }

                // Create Business-Specific Receipt
                const bizOrderRef = firestore.doc(`businesses/${bizId}/orders/${orderId}`);
                transaction.set(bizOrderRef, {
                    orderId: orderId,
                    items: data.items,
                    subtotal: data.subtotal / 100,
                    status: 'Received',
                    customerName: session.customer_details?.name || 'Customer',
                    createdAt: Timestamp.now(),
                    shippingAddress,
                    businessId: bizId,
                    businessOwnerId: bizOwnerId || null,
                    communityId: communityId
                });

                // Update Stock Levels
                for (const item of data.items) {
                    if (item.id && item.id !== 'unknown') {
                        const productRef = firestore.doc(`businesses/${bizId}/products/${item.id}`);
                        transaction.update(productRef, { stock: FieldValue.increment(-(item.qty || 1)) });
                    }
                }
            }

            // Create Master Ledger Entry
            transaction.set(masterOrderRef, {
                id: orderId,
                userId,
                communityId,
                totalAmount: totalAmount / 100, 
                totalFee: totalFee / 100,
                status: 'Received',
                createdAt: Timestamp.now(),
                shippingAddress,
                stripeSessionId: session.id,
                businessOwnerIds: Array.from(businessOwnerIdsSet),
                deliveryType: meta.deliveryType || 'click_and_collect',
                customerName: session.customer_details?.name || 'Customer',
            });

            // Create User History Entry
            const userHistoryRef = firestore.doc(`users/${userId}/recent_orders/${orderId}`);
            transaction.set(userHistoryRef, {
                id: orderId,
                totalAmount: totalAmount / 100,
                status: 'Received',
                createdAt: Timestamp.now(),
                communityId,
                shippingAddress
            });
        });

        // Step 2: Payouts and Notifications (External logic)
        for (const [bizId, data] of Object.entries(groups)) {
            const bizDoc = await firestore.doc(`businesses/${bizId}`).get();
            const bizData = bizDoc.data();
            const bizOwnerId = bizData?.ownerId;
            const stripeAccountId = bizData?.stripeAccountId;

            if (bizOwnerId) {
                await firestore.collection('notifications').add({
                    recipientId: bizOwnerId,
                    type: 'New Order',
                    subject: `New order for ${bizData?.businessName}`,
                    from: "Shopping System",
                    date: Timestamp.now().toDate().toISOString(),
                    status: 'new',
                    relatedId: orderId,
                    targetApp: 'main'
                });
            }

            if (stripeAccountId) {
                const netTransfer = calculateTransferNet(data.subtotal, totalAmount, totalFee);
                if (netTransfer > 0) {
                    try {
                        const transferData: any = {
                            amount: netTransfer,
                            currency: 'gbp',
                            destination: stripeAccountId,
                            transfer_group: orderId,
                            metadata: { orderId, businessId: bizId }
                        };
                        // Use source_transaction if payment_intent exists to avoid balance errors
                        if (session.payment_intent) {
                            transferData.source_transaction = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
                        }
                        await stripe.transfers.create(transferData);
                    } catch (e: any) {
                        console.error(`[TRANSFER ERROR] Biz: ${bizId}`, e.message);
                    }
                }
            } else {
                console.error(`[WEBHOOK WARNING] Business ${bizId} has no stripeAccountId. Funds remain with Admin.`);
            }
        }

        // Courier Alert and Payment
        const commDoc = await firestore.doc(`communities/${communityId}`).get();
        const courierId = commDoc.data()?.courierId;
        if (courierId && meta.deliveryType === 'local_courier') {
            // Transfer delivery fee to Courier
            let courierStripeAccountId = null;
            const courierBizQuery = await firestore.collection('businesses').where('ownerId', '==', courierId).limit(1).get();
            if (!courierBizQuery.empty) {
                courierStripeAccountId = courierBizQuery.docs[0].data()?.stripeAccountId;
            }

            if (deliveryFeeAmount > 0) {
                if (courierStripeAccountId) {
                    const netTransfer = calculateTransferNet(deliveryFeeAmount, totalAmount, totalFee);
                    if (netTransfer > 0) {
                        try {
                            const transferData: any = {
                                amount: netTransfer,
                                currency: 'gbp',
                                destination: courierStripeAccountId,
                                transfer_group: orderId,
                                metadata: { orderId, type: 'delivery_fee' }
                            };
                            if (session.payment_intent) {
                                transferData.source_transaction = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
                            }
                            await stripe.transfers.create(transferData);
                        } catch (e: any) {
                            console.error(`[TRANSFER ERROR] Courier Delivery Fee:`, e.message);
                        }
                    }
                } else {
                    console.error(`[WEBHOOK WARNING] Courier ${courierId} has no stripeAccountId. Delivery fee remains with Admin.`);
                }
            }

            await firestore.collection('notifications').add({
                recipientId: courierId,
                type: 'New Order',
                subject: `New delivery task in ${commDoc.data()?.name}`,
                from: "Shopping System",
                date: Timestamp.now().toDate().toISOString(),
                status: 'new',
                relatedId: orderId,
                targetApp: 'main'
            });
        }

        console.log(`✅ [SUCCESS] Order processed: ${orderId}`);

    } catch (e: any) {
        console.error("❌ [WEBHOOK FAILURE]:", e.message);
    }
}

async function syncBusinessStatus(firestore: any, businessId: string, subscriptionId: string, type: string) {
    const isStorefront = type.includes('storefront');
    const updatePayload: any = { status: 'Subscribed', updatedAt: Timestamp.now() };
    if (isStorefront) {
        updatePayload.storefrontSubscription = true;
        updatePayload.storefrontStripeSubscriptionId = subscriptionId;
    } else {
        updatePayload.listingStripeSubscriptionId = subscriptionId;
    }
    await firestore.collection('businesses').doc(businessId).update(updatePayload);
}

async function handleSubscriptionLifecycle(firestore: any, subscription: Stripe.Subscription, eventType: string) {
    const subId = subscription.id;
    const meta = subscription.metadata || {};
    let businessId = meta.businessId || meta.bid;
    let track: 'listing' | 'storefront' | null = null;

    const listingMatch = await firestore.collection('businesses').where('listingStripeSubscriptionId', '==', subId).limit(1).get();
    if (!listingMatch.empty) { businessId = listingMatch.docs[0].id; track = 'listing'; }
    else {
        const storefrontMatch = await firestore.collection('businesses').where('storefrontStripeSubscriptionId', '==', subId).limit(1).get();
        if (!storefrontMatch.empty) { businessId = storefrontMatch.docs[0].id; track = 'storefront'; }
    }

    if (!businessId) return;

    const updateData: any = { updatedAt: Timestamp.now() };
    if (eventType === 'customer.subscription.deleted') {
        if (track === 'storefront') updateData.storefrontSubscription = false;
        else updateData.status = 'Approved';
    } else {
        const isPendingCancel = subscription.cancel_at_period_end === true;
        if (track === 'storefront') updateData.storefrontSubscriptionStatus = isPendingCancel ? 'pending_cancellation' : FieldValue.delete();
        else updateData.listingSubscriptionStatus = isPendingCancel ? 'pending_cancellation' : FieldValue.delete();
    }
    await firestore.collection('businesses').doc(businessId).update(updateData);
}

async function handleInvoicePaymentSucceeded(firestore: any, invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;
    
    const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
    
    // We only split Storefront Subscriptions.
    const storefrontMatch = await firestore.collection('businesses').where('storefrontStripeSubscriptionId', '==', subId).limit(1).get();
    if (storefrontMatch.empty) return;

    const subscription = await stripe.subscriptions.retrieve(subId);
    const communityId = subscription.metadata?.cid;
    if (!communityId) return;

    const totalAmount = invoice.amount_paid;
    if (totalAmount <= 0) return;

    const commDoc = await firestore.doc(`communities/${communityId}`).get();
    const commData = commDoc.data();
    if (!commData) return;

    const chargeId = typeof invoice.charge === 'string' ? invoice.charge : invoice.charge?.id;

    // 10% to Community Leader
    const leaderStripeId = commData.stripeAccountId;
    if (leaderStripeId) {
        const leaderAmount = Math.floor(totalAmount * 0.10);
        if (leaderAmount > 0 && chargeId) {
            try {
                await stripe.transfers.create({
                    amount: leaderAmount,
                    currency: invoice.currency,
                    destination: leaderStripeId,
                    source_transaction: chargeId,
                    metadata: { reason: 'storefront_subscription_split_leader', invoiceId: invoice.id }
                });
                console.log(`[SUBSCRIPTION SPLIT] Sent ${leaderAmount} to Leader ${leaderStripeId}`);
            } catch (e: any) {
                console.error('[TRANSFER ERROR] Leader Split:', e.message);
            }
        }
    }

    // 40% to Community Courier
    const courierId = commData.courierId;
    if (courierId) {
        const courierBizQuery = await firestore.collection('businesses').where('ownerId', '==', courierId).limit(1).get();
        if (!courierBizQuery.empty) {
            const courierStripeId = courierBizQuery.docs[0].data()?.stripeAccountId;
            if (courierStripeId) {
                const courierAmount = Math.floor(totalAmount * 0.40);
                if (courierAmount > 0 && chargeId) {
                    try {
                        await stripe.transfers.create({
                            amount: courierAmount,
                            currency: invoice.currency,
                            destination: courierStripeId,
                            source_transaction: chargeId,
                            metadata: { reason: 'storefront_subscription_split_courier', invoiceId: invoice.id }
                        });
                        console.log(`[SUBSCRIPTION SPLIT] Sent ${courierAmount} to Courier ${courierStripeId}`);
                    } catch (e: any) {
                        console.error('[TRANSFER ERROR] Courier Split:', e.message);
                    }
                }
            } else {
                console.error(`[SUBSCRIPTION SPLIT WARNING] Courier ${courierId} has no stripeAccountId. 40% split remains with Admin.`);
            }
        }
    }
}

export async function POST(req: Request) {
    if (!stripeSecret) return new NextResponse("Missing secret", { status: 500 });
    const body = await req.text();
    const sig = req.headers.get('stripe-signature') || '';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CHECKOUT || process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret!);
    } catch (err: any) {
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const { firestore } = initializeAdminApp();
    
    // ASYNC PROCESSING: Respond immediately to Stripe, then process
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};
        const purchaseType = meta.purchaseType || meta.pt;
        const businessId = meta.businessId || meta.bid;
        const subscriptionType = meta.subscriptionType || meta.st;

        if (purchaseType === 'cart_checkout') {
            // Background processing
            handleCartCheckout(session).catch(e => console.error("Async Order Error:", e));
        } else if (businessId) {
            syncBusinessStatus(firestore, businessId, session.subscription as string, subscriptionType || 'listing');
        }
    } else if (['customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
        handleSubscriptionLifecycle(firestore, event.data.object as Stripe.Subscription, event.type);
    } else if (event.type === 'invoice.payment_succeeded') {
        handleInvoicePaymentSucceeded(firestore, event.data.object as Stripe.Invoice).catch(e => console.error("Async Invoice Error:", e));
    }
    
    return NextResponse.json({ received: true });
}
