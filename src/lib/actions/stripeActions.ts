
'use server';

import 'dotenv/config';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createOrderAction } from '@/lib/actions/orderActions';
import { handleSubscriptionActivation } from '@/app/api/stripe-webhook/route';

type ActionResponse = {
    success: boolean;
    url?: string | null;
    error?: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  businessId: string;
}

type CheckoutParams = {
    uid: string;
    email: string;
    name: string;
    mode: 'subscription' | 'payment';
    purchaseType: 'listing_subscription' | 'storefront_subscription' | 'enterprise_subscription' | 'cart_checkout' | 'national_advert_campaign' | 'additional_advert' | 'additional_event';
    successUrlPath: string;
    cancelUrlPath?: string;
    cartItems?: CartItem[];
    price?: number;
    productName?: string;
    metadata?: Record<string, string>;
    businessId?: string; // Crucial for linking subscriptions
    subscriptionType?: 'listing' | 'storefront';
    totalDeliveryFee?: number;
}

export async function createCheckoutSession(params: CheckoutParams): Promise<ActionResponse> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const { 
    uid, email, name, 
    mode, successUrlPath, cancelUrlPath, purchaseType, cartItems, price, productName, metadata, businessId, subscriptionType, totalDeliveryFee
  } = params;
    
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const { firestore } = initializeAdminApp();

  try {
    const userList = await stripe.customers.list({ email: email, limit: 1 });
    let customerId;

    if (userList.data.length > 0) {
      customerId = userList.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email, name });
      customerId = customer.id;
    }
    
    const userRef = firestore.collection('users').doc(uid);
    await userRef.update({ stripeCustomerId: customerId });

    const sessionPayload: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        customer: customerId,
        line_items: [],
        mode: mode,
        success_url: `${baseUrl}${successUrlPath}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}${cancelUrlPath || '/'}`,
    };

    if (mode === 'subscription') {
      let priceId;
       switch (purchaseType) {
        case 'listing_subscription': priceId = process.env.STRIPE_BUSINESS_PRICE_ID; break;
        case 'storefront_subscription': priceId = process.env.STRIPE_STOREFRONT_PRICE_ID; break;
        case 'enterprise_subscription': priceId = process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID; break;
        default: return { success: false, error: 'Invalid subscription type.' };
      }

      if (!priceId) { return { success: false, error: `Pricing for '${purchaseType}' is not configured.` }; }
      if (!businessId) { return { success: false, error: 'Business ID is required for subscriptions.' }; }
      
      sessionPayload.line_items = [{ price: priceId, quantity: 1 }];
      
      const businessDoc = await firestore.collection('businesses').doc(businessId).get();
      if (!businessDoc.exists) { return { success: false, error: 'Business not found.' } }
      
      const primaryCommunityId = businessDoc.data()?.primaryCommunityId;
      if (!primaryCommunityId) { return { success: false, error: 'Business is not linked to a primary community.' }; }

      const communityDoc = await firestore.collection('communities').doc(primaryCommunityId).get();
      if (!communityDoc.exists) { return { success: false, error: 'Community not found.' }; }
      
      const stripeAccountId = communityDoc.data()?.stripeAccountId;
      const revenueShare = communityDoc.data()?.revenueShare || 40;
      
      sessionPayload.subscription_data = {
        metadata: {
            businessId: businessId,
            subscriptionType: subscriptionType,
        }
      };
      
      // Only apply revenue share for main listing subscriptions, not storefronts
      if (stripeAccountId && subscriptionType !== 'storefront') {
        sessionPayload.subscription_data.transfer_data = {
            destination: stripeAccountId,
            amount_percent: revenueShare,
        };
      } else {
        console.warn(`⚠️ Revenue sharing is not being applied for this transaction. Community Stripe Account: ${stripeAccountId ? 'Exists' : 'Missing'}, Subscription Type: ${subscriptionType}`);
      }

    } else if (mode === 'payment') {
        sessionPayload.metadata = { userId: uid, purchaseType, ...(metadata || {}) };

        if (purchaseType === 'cart_checkout' && cartItems) {
            sessionPayload.line_items = cartItems.map(item => ({
                price_data: { 
                    currency: 'gbp', 
                    product_data: { 
                        name: item.name,
                        metadata: {
                            productId: item.id,
                            businessId: item.businessId,
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
                        product_data: { name: 'Delivery Fee' },
                        unit_amount: Math.round(totalDeliveryFee * 100),
                    },
                    quantity: 1,
                });
            }
            // Explicitly group these transfers together in the Stripe dashboard
            sessionPayload.payment_intent_data = {
                transfer_group: `order_${uid}_${Date.now()}`
            };
        } else if (price && productName) {
             let priceId;
            switch (purchaseType) {
                case 'additional_advert': priceId = process.env.STRIPE_BUSINESS_ADDITIONAL_ADVERT_PRICE_ID; break;
                case 'additional_event': priceId = process.env.STRIPE_BUSINESS_ADDITIONAL_EVENT_PRICE_ID; break;
                default: break;
            }

            if (priceId) {
                sessionPayload.line_items = [{ price: priceId, quantity: 1 }];
            } else {
                sessionPayload.line_items = [{ price_data: { currency: 'gbp', product_data: { name: productName }, unit_amount: Math.round(price * 100), }, quantity: 1, }];
            }
        } else {
            return { success: false, error: 'Invalid payment parameters.' };
        }
        
        if (sessionPayload.line_items.length === 0) {
          return { success: false, error: 'Cannot create a checkout session with no items.' };
        }

    } else {
        return { success: false, error: 'Invalid checkout mode.' };
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);
    return { success: true, url: session.url };

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return { success: false, error: error.message };
  }
}

export async function verifyCheckoutSessionAction(params: { sessionId: string }): Promise<ActionResponse> {
    if (!process.env.STRIPE_SECRET_KEY) {
        return { success: false, error: 'Stripe is not configured.' };
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    try {
        const session = await stripe.checkout.sessions.retrieve(params.sessionId, {
            expand: ['subscription'], // Ensure the subscription object is expanded
        });

        if (session.payment_status === 'paid' && session.subscription) {
            const subscription = session.subscription as Stripe.Subscription;
            
            if (subscription.status === 'active') {
                console.log("Client-side verification: Subscription is active. Triggering database update.");
                // This is now the primary method to trigger the DB update.
                await handleSubscriptionActivation(subscription);
                return { success: true };
            } else {
                console.warn(`Client-side verification: Subscription ${subscription.id} payment was paid, but status is '${subscription.status}'. Webhook will handle final activation.`);
                return { success: false, error: `Subscription status is not active yet (${subscription.status}).`};
            }
        } else {
             return { success: false, error: 'Payment not completed or no subscription found.' };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function createCustomerPortalLink(params: { userId: string, returnPath?: string }): Promise<ActionResponse> {
    if (!params.userId) {
        return { success: false, error: 'User ID is required.' };
    }
    
    try {
        const { firestore } = initializeAdminApp();
        const userRef = firestore.collection('users').doc(params.userId);
        const userDoc = await userRef.get();
        const customerId = userDoc.data()?.stripeCustomerId;

        if (!customerId) {
            return { success: false, error: 'Stripe customer ID not found for this user.' };
        }
        
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL}${params.returnPath || '/'}`,
        });

        return { success: true, url: portalSession.url };

    } catch (error: any) {
        console.error('Error creating customer portal link:', error);
        return { success: false, error: error.message };
    }
}

export async function createStripeConnectAccountLinkForCommunity(communityId: string): Promise<ActionResponse> {
  if (!communityId) {
    return { success: false, error: "Community ID is required." };
  }
  const { firestore } = initializeAdminApp();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const communityRef = firestore.collection('communities').doc(communityId);
    const communityDoc = await communityRef.get();
    if (!communityDoc.exists) {
      throw new Error("Community not found.");
    }
    
    let stripeAccountId = communityDoc.data()?.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      await communityRef.update({ stripeAccountId });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/leader/financials?reauth=true`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/leader/financials?stripe_return=true`,
      type: 'account_onboarding',
    });

    return { success: true, url: accountLink.url };
  } catch (error: any) {
    console.error("Error creating Stripe connect link:", error);
    return { success: false, error: error.message };
  }
}

export async function createStripeDashboardLinkForCommunity(communityId: string): Promise<ActionResponse> {
    if (!communityId) {
        return { success: false, error: 'Community ID is required.' };
    }
    const { firestore } = initializeAdminApp();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    try {
        const communityRef = firestore.collection('communities').doc(communityId);
        const communityDoc = await communityRef.get();
        if (!communityDoc.exists) {
            throw new Error("Community not found.");
        }
        
        const stripeAccountId = communityDoc.data()?.stripeAccountId;
        if (!stripeAccountId) {
            throw new Error("This community does not have a Stripe account connected.");
        }

        const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

        return { success: true, url: loginLink.url };

    } catch (error: any) {
        console.error('Error creating Stripe dashboard link for community:', error);
        return { success: false, error: error.message };
    }
}

export async function createStripeConnectAccountLinkForBusiness(businessId: string): Promise<ActionResponse> {
  if (!businessId) {
    return { success: false, error: "Business ID is required." };
  }
  const { firestore } = initializeAdminApp();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const businessRef = firestore.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();
    if (!businessDoc.exists) {
      throw new Error("Business not found.");
    }
    
    let stripeAccountId = businessDoc.data()?.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      await businessRef.update({ stripeAccountId });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/business/storefront?reauth=true&businessId=${businessId}`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/business/storefront?stripe_return=true`,
      type: 'account_onboarding',
    });

    return { success: true, url: accountLink.url };
  } catch (error: any) {
    console.error("Error creating Stripe connect link for business:", error);
    return { success: false, error: error.message };
  }
}

export async function createStripeDashboardLinkForBusiness(businessId: string): Promise<ActionResponse> {
    if (!businessId) {
        return { success: false, error: 'Business ID is required.' };
    }
    const { firestore } = initializeAdminApp();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    try {
        const businessRef = firestore.collection('businesses').doc(businessId);
        const businessDoc = await businessRef.get();
        if (!businessDoc.exists) {
            throw new Error("Business not found.");
        }
        
        const stripeAccountId = businessDoc.data()?.stripeAccountId;
        if (!stripeAccountId) {
            throw new Error("This business does not have a Stripe account connected.");
        }

        const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

        return { success: true, url: loginLink.url };

    } catch (error: any) {
        console.error('Error creating Stripe dashboard link:', error);
        return { success: false, error: error.message };
    }
}
