'use server';

import 'dotenv/config';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/firebase/admin-app';

type ActionResponse = {
    success: boolean;
    url?: string | null;
    error?: string;
};

type CheckoutParams = {
    uid: string;
    email: string;
    name: string;
    mode: 'subscription' | 'payment';
    purchaseType: string;
    successUrlPath: string;
    businessId?: string;
    communityId?: string;
    subscriptionType?: string;
    price?: number;
    productName?: string;
    cancelUrlPath?: string;
    metadata?: Record<string, string>;
    cartItems?: { id: string, name: string, price: number, quantity: number, businessId: string }[];
    totalDeliveryFee?: number;
}

export async function createCheckoutSession(params: CheckoutParams): Promise<ActionResponse> {
    const { 
        uid, email, name, mode, successUrlPath, purchaseType, 
        businessId, communityId, subscriptionType, price, 
        productName, cancelUrlPath, metadata: extraMetadata,
        cartItems, totalDeliveryFee
    } = params;

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return { success: false, error: "Stripe configuration missing on server." };

    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://my-community-hub.co.uk';

    try {
        const { firestore } = initializeAdminApp();
        const userRef = firestore.collection('users').doc(uid);

        const userList = await stripe.customers.list({ email, limit: 1 });
        let customerId;
        if (userList.data.length > 0) {
            customerId = userList.data[0].id;
        } else {
            const customer = await stripe.customers.create({ email, name, metadata: { userId: uid } });
            customerId = customer.id;
        }
        
        await userRef.update({ stripeCustomerId: customerId });

        // Build a robust cart map for the webhook to use as a blueprint
        const cartMap: Record<string, string> = {};
        if (cartItems) {
            cartItems.forEach(item => {
                cartMap[item.id] = item.businessId;
            });
        }

        // Generate a unique transfer group for grouping split payouts on Connect
        const transferGroup = `tg_${Date.now()}_${uid.substring(0, 8)}`;

        // COMPACT METADATA: Keys and values must be concise to stay within limits
        const metadata: Record<string, string> = {
            uid: String(uid),
            pt: String(purchaseType),
            cid: String(communityId || ''),
            bid: String(businessId || ''),
            tg: transferGroup,
            cm: JSON.stringify(cartMap).substring(0, 500), // Enforce limit
            ...extraMetadata
        };

        const sessionPayload: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            customer: customerId,
            mode: mode,
            success_url: `${baseUrl}${successUrlPath}`,
            cancel_url: `${baseUrl}${cancelUrlPath || '/home'}`,
            metadata,
        };

        if (mode === 'payment') {
            sessionPayload.payment_intent_data = {
                transfer_group: transferGroup
            };
        }

        if (purchaseType === 'cart_checkout' && cartItems) {
            sessionPayload.line_items = cartItems.map(item => ({
                price_data: {
                    currency: 'gbp',
                    product_data: { 
                        name: item.name,
                        metadata: { 
                            businessId: String(item.businessId), 
                            productId: String(item.id) 
                        }
                    },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity,
            }));

            if (totalDeliveryFee && totalDeliveryFee > 0) {
                sessionPayload.line_items.push({
                    price_data: {
                        currency: 'gbp',
                        product_data: { 
                            name: 'Local Delivery Fee',
                            metadata: { isDeliveryFee: 'true' }
                        },
                        unit_amount: Math.round(totalDeliveryFee * 100),
                    },
                    quantity: 1,
                });
            }
        } else if (mode === 'subscription') {
            const type = (subscriptionType || 'listing').toLowerCase().trim();
            let priceId: string | undefined;

            if (type === 'enterprise_storefront') {
                priceId = process.env.STRIPE_ENTERPRISE_STOREFRONT_PRICE_ID || process.env.STRIPE_ENTERPRISE_STOREFRONT_MONTHLY_PRICE_ID;
            } else if (type === 'storefront') {
                priceId = process.env.STRIPE_STOREFRONT_PRICE_ID || process.env.STRIPE_STOREFRONT_MONTHLY_PRICE_ID;
            } else if (type === 'enterprise') {
                priceId = process.env.STRIPE_ENTERPRISE_PRICE_ID || process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID;
            } else {
                priceId = process.env.STRIPE_BUSINESS_PRICE_ID || process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID;
            }

            if (!priceId) throw new Error(`Missing Price ID for: ${type}`);
            
            sessionPayload.line_items = [{ price: priceId, quantity: 1 }];
            sessionPayload.subscription_data = { metadata };
        } else if (price) {
            sessionPayload.line_items = [{
                price_data: {
                    currency: 'gbp',
                    product_data: { name: productName || 'Purchase', metadata },
                    unit_amount: Math.round(price * 100),
                },
                quantity: 1,
            }];
        }

        const session = await stripe.checkout.sessions.create(sessionPayload);
        return { success: true, url: session.url };
    } catch (error: any) {
        console.error("[STRIPE ERROR]", error.message);
        return { success: false, error: error.message };
    }
}

export async function createStripeConnectAccountLinkForBusiness(businessId: string, returnPath: string = '/business/storefront'): Promise<ActionResponse> {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return { success: false, error: "Stripe configuration missing." };
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });

    const { firestore } = initializeAdminApp();
    try {
        const bizRef = firestore.collection('businesses').doc(businessId);
        const docSnap = await bizRef.get();
        let stripeId = docSnap.data()?.stripeAccountId;

        if (!stripeId) {
            const account = await stripe.accounts.create({ type: 'express', country: 'GB' });
            stripeId = account.id;
            await bizRef.update({ stripeAccountId: stripeId });
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://my-community-hub.co.uk';

        const link = await stripe.accountLinks.create({
            account: stripeId,
            refresh_url: `${baseUrl}${returnPath}?reauth=true`,
            return_url: `${baseUrl}${returnPath}?stripe_return=true`,
            type: 'account_onboarding',
        });
        return { success: true, url: link.url };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createCustomerPortalLink(params: { userId: string, returnPath?: string }): Promise<{ url?: string; error?: string }> {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return { error: "Stripe configuration missing." };
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });

    try {
        const { firestore } = initializeAdminApp();
        const userDoc = await firestore.collection('users').doc(params.userId).get();
        const customerId = userDoc.data()?.stripeCustomerId;
        if (!customerId) return { error: 'No Stripe profile found for this user.' };

        const portal = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://my-community-hub.co.uk'}${params.returnPath || '/'}`,
        });
        return { url: portal.url };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function createStripeConnectAccountLinkForCommunity(params: { communityId: string, userId: string }): Promise<ActionResponse> {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return { success: false, error: "Stripe configuration missing." };
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });
    
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        const docSnap = await communityRef.get();
        let stripeId = docSnap.data()?.stripeAccountId;

        if (!stripeId) {
            const account = await stripe.accounts.create({ 
                type: 'express', 
                country: 'GB',
                capabilities: { transfers: { requested: true } }
            });
            stripeId = account.id;
            await communityRef.update({ stripeAccountId: stripeId, stripeAccountOwnerId: params.userId });
        }

        const link = await stripe.accountLinks.create({
            account: stripeId,
            refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://my-community-hub.co.uk'}/leader/financials?reauth=true`,
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://my-community-hub.co.uk'}/leader/financials?stripe_return=true`,
            type: 'account_onboarding',
        });
        return { success: true, url: link.url };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createStripeDashboardLinkForCommunity(communityId: string): Promise<ActionResponse> {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return { success: false, error: "Stripe configuration missing." };
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });

    const { firestore } = initializeAdminApp();
    try {
        const docSnap = await firestore.collection('communities').doc(communityId).get();
        const stripeId = docSnap.data()?.stripeAccountId;
        if (!stripeId) throw new Error("Stripe account not found.");
        const link = await stripe.accounts.createLoginLink(stripeId);
        return { success: true, url: link.url };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function cancelSubscriptionAction(params: { subscriptionId: string }): Promise<ActionResponse> {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return { success: false, error: "Stripe configuration missing." };
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });

    try {
        await stripe.subscriptions.update(params.subscriptionId, { cancel_at_period_end: true });
        return { success: true };
    } catch (e: any) {
        console.error("[STRIPE CANCEL ERROR]", e.message);
        return { success: false, error: e.message };
    }
}
