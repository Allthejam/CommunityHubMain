export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecret!, { apiVersion: '2025-07-30.basil' as any });

/**
 * PROPORTIONAL FEE CALCULATION
 */
function calculateTransferNet(amount: number, totalAmount: number, totalFee: number): number {
    if (totalAmount <= 0) return 0;
    const proportion = amount / totalAmount;
    const shareOfFee = proportion * totalFee;
    return Math.floor(amount - shareOfFee);
}

/**
 * SHOPPING CART HANDLER
 */
async function handleCartCheckout(session: Stripe.Checkout.Session) {
    const { firestore } = initializeAdminApp();
    const meta = session.metadata || {};
    const userId = meta.userId;
    const communityId = meta.communityId;
    const shippingAddress = meta.shippingAddress;
    const cartMapping = meta.cartMapping ? JSON.parse(meta.cartMapping) : {};
    const orderId = session.id;

    if (!userId || !communityId) {
        console.error("❌ [CART CHECKOUT] Missing essential metadata");
        return;
    }

    try {
        console.log(`[STRIPE] Processing cart checkout: ${orderId}`);
        const totalAmount = session.amount_total || 0;
        const totalFee = Math.round(totalAmount * 0.029 + 30); 

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price.product'] });
        const groups: Record<string, { items: any[], subtotal: number }> = {};

        for (const item of lineItems.data) {
            const product = item.price?.product as Stripe.Product;
            const productId = product?.metadata?.productId || item.metadata?.productId || 'unknown';
            const bizId = product?.metadata?.businessId || item.metadata?.businessId || cartMapping[productId];
            
            if (bizId) {
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

        await firestore.runTransaction(async (transaction) => {
            const masterOrderRef = firestore.collection('orders').doc(orderId);
            
            for (const [bizId, data] of Object.entries(groups)) {
                const bizDoc = await transaction.get(firestore.doc(`businesses/${bizId}`));
                const bizData = bizDoc.data();
                const bizOwnerId = bizData?.ownerId;

                if (bizOwnerId) {
                    businessOwnerIdsSet.add(bizOwnerId);
                }

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

                for (const item of data.items) {
                    if (item.id !== 'unknown') {
                        const productRef = firestore.doc(`businesses/${bizId}/products/${item.id}`);
                        transaction.update(productRef, { stock: FieldValue.increment(-(item.qty || 1)) });
                    }
                }
            }

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
                deliveryType: meta.deliveryType || 'standard',
                customerName: session.customer_details?.name || 'Customer',
            });

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

        for (const [bizId, data] of Object.entries(groups)) {
            const bizDoc = await firestore.doc(`businesses/${bizId}`).get();
            const bizData = bizDoc.data();
            const bizOwnerId = bizData?.ownerId;
            const stripeAccountId = bizData?.stripeAccountId;

            if (bizOwnerId) {
                await firestore.collection('notifications').add({
                    recipientId: bizOwnerId,
                    type: 'New Order',
                    subject: `New order received for ${bizData?.businessName}`,
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
                        await stripe.transfers.create({
                            amount: netTransfer,
                            currency: 'gbp',
                            destination: stripeAccountId,
                            transfer_group: orderId,
                            metadata: { orderId, businessId: bizId }
                        });
                    } catch (e: any) {
                        console.error(`[STRIPE TRANSFER ERROR] Biz: ${bizId}`, e.message);
                    }
                }
            }
        }

        const commDoc = await firestore.doc(`communities/${communityId}`).get();
        const courierId = commDoc.data()?.courierId;
        if (courierId) {
            await firestore.collection('notifications').add({
                recipientId: courierId,
                type: 'New Order',
                subject: `New delivery task available in ${commDoc.data()?.name}`,
                from: "Shopping System",
                date: Timestamp.now().toDate().toISOString(),
                status: 'new',
                relatedId: orderId,
                targetApp: 'main'
            });
        }

        console.log(`✅ [STRIPE] Successfully processed cart order: ${orderId}`);

    } catch (e: any) {
        console.error("❌ [WEBHOOK ERROR]:", e.message);
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
    let businessId = meta.businessId;
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
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.metadata?.purchaseType === 'cart_checkout') {
                    await handleCartCheckout(session);
                } else if (session.metadata?.businessId) {
                    await syncBusinessStatus(firestore, session.metadata.businessId, session.subscription as string, session.metadata.subscriptionType || 'listing');
                }
                break;
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await handleSubscriptionLifecycle(firestore, event.data.object as Stripe.Subscription, event.type);
                break;
        }
    } catch (e: any) { console.error("❌ [API ERROR]:", e.message); }
    
    return NextResponse.json({ received: true });
}
