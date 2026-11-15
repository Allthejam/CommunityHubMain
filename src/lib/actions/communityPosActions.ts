'use server';

import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin-app';
import {
  calculateEstimatedStripeFeePence,
  syncCommunityCheckoutSession,
} from '@/lib/stripe/communityPosSync';

export type PosLineItem = {
  id?: string;
  name: string;
  qty: number;
  unitPricePence: number;
};

export type FundraisingPot = {
  id: string;
  title: string;
  description: string;
  eventName: string;
  presetAmounts: number[]; // in GBP pounds, e.g. [2, 5, 10, 20]
  allowCustomAmount: boolean;
  allowCash: boolean;
  active: boolean;
  totalRaisedPence: number;
  totalCardPence: number;
  totalCashPence: number;
  txCount: number;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
};

export type PosCatalogItem = {
  id: string;
  name: string;
  pricePence: number;
  category: string;
  active: boolean;
  createdByUid: string;
  createdAt: string;
};

export type PosAuditEntry = {
  id: string;
  receiptNumber: string;
  source: 'mobile_till' | 'qr_donation_pot';
  paymentMethod: 'stripe_qr_card' | 'cash';
  grossAmountPence: number;
  estimatedFeePence: number;
  netTransferPence: number;
  currency: string;
  potId: string | null;
  potTitle: string | null;
  eventName: string | null;
  items: PosLineItem[];
  operatorUid: string | null;
  operatorName: string | null;
  donorName: string | null;
  donorEmail: string | null;
  donorNote: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  transferStatus: 'transferred' | 'pending_connect' | 'cash_in_hand' | 'failed';
  createdAt: string;
};

function makeReceiptNumber(prefix = 'POS') {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CH-${prefix}-${ymd}-${rand}`;
}

/**
 * Verifies that a community has a Stripe Connect account that has completed
 * onboarding and is enabled for payouts and transfers so funds never remain
 * in the platform account.
 */
async function verifyCommunityStripeConnected(
  stripeAccountId: string | undefined | null
): Promise<{ connected: boolean; reason?: string }> {
  if (!stripeAccountId) {
    return {
      connected: false,
      reason: 'This community has not connected its Stripe account yet (see Leader > Financials).',
    };
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return {
      connected: false,
      reason: 'Stripe configuration missing on server.',
    };
  }

  try {
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const transfersActive = account.capabilities?.transfers === 'active';
    const isReady = Boolean(account.details_submitted && account.payouts_enabled && transfersActive);

    if (!isReady) {
      return {
        connected: false,
        reason:
          'This community has not completed its Stripe Connect verification and payout setup yet (see Leader > Financials).',
      };
    }

    return { connected: true };
  } catch (err: any) {
    console.error('Error verifying community Stripe Connect account:', err?.message || err);
    return {
      connected: false,
      reason: 'Could not verify the community Stripe payout account. Please reconnect in Leader > Financials.',
    };
  }
}

export type PosUnlockStatus = {
  unlocked: boolean;
  activePaidSubscriptions: number;
  requiredSubscriptions: number;
  isAdminOverride: boolean;
};

async function getCommunityPosUnlockStatus(
  firestore: FirebaseFirestore.Firestore,
  communityId: string,
  commData?: Record<string, any>
): Promise<PosUnlockStatus> {
  const requiredSubscriptions = 3;
  const isAdminOverride = commData?.posCardUnlockedOverride === true;

  const snap = await firestore
    .collection('businesses')
    .where('primaryCommunityId', '==', communityId)
    .where('status', '==', 'Subscribed')
    .get();

  const activePaidSubscriptions = snap.docs.filter((d) => {
    const data = d.data() || {};
    return data.isFreeListing !== true;
  }).length;

  return {
    unlocked: isAdminOverride || activePaidSubscriptions >= requiredSubscriptions,
    activePaidSubscriptions,
    requiredSubscriptions,
    isAdminOverride,
  };
}

async function verifyCommunityPosPermission(
  firestore: FirebaseFirestore.Firestore,
  uid: string,
  communityId: string,
  requiredPerm: 'operateEventTill' | 'overseePosTracking'
): Promise<{ allowed: boolean; operatorName: string; error?: string }> {
  if (!uid || !communityId) {
    return { allowed: false, operatorName: '', error: 'Missing user or community ID.' };
  }

  const userDoc = await firestore.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return { allowed: false, operatorName: '', error: 'User profile not found.' };
  }

  const userData = userDoc.data() || {};
  const operatorName =
    userData.name ||
    userData.displayName ||
    [userData.firstName, userData.lastName].filter(Boolean).join(' ') ||
    userData.email ||
    'Community Operator';

  const accountType = String(userData.accountType || '').toLowerCase();
  if (['owner', 'admin', 'administrator'].includes(accountType)) {
    return { allowed: true, operatorName };
  }

  const communityRoleData = userData.communityRoles?.[communityId];
  const activeRole = String(
    communityRoleData?.role || (userData.communityId === communityId ? userData.role : '') || ''
  ).toLowerCase();

  if (['president', 'owner', 'admin', 'administrator'].includes(activeRole)) {
    return { allowed: true, operatorName };
  }

  const impersonating = userData.impersonating;
  const activePerms =
    impersonating?.communityId === communityId
      ? impersonating?.permissions || {}
      : communityRoleData?.permissions || (userData.communityId === communityId ? userData.permissions : {}) || {};

  if (activePerms?.[requiredPerm] === true) {
    return { allowed: true, operatorName };
  }

  return {
    allowed: false,
    operatorName,
    error: `Permission denied: "${requiredPerm}" is required.`,
  };
}

export async function getCommunityPosOverviewAction(params: {
  communityId: string;
  uid: string;
}) {
  try {
    const { firestore } = initializeAdminApp();
    const auth = await verifyCommunityPosPermission(firestore, params.uid, params.communityId, 'operateEventTill');
    if (!auth.allowed) {
      return { success: false, error: auth.error };
    }

    const commDoc = await firestore.collection('communities').doc(params.communityId).get();
    const commData = commDoc.data() || {};

    const [potsSnap, catalogSnap] = await Promise.all([
      firestore
        .collection('communities')
        .doc(params.communityId)
        .collection('fundraisingPots')
        .orderBy('createdAt', 'desc')
        .get(),
      firestore
        .collection('communities')
        .doc(params.communityId)
        .collection('posCatalog')
        .orderBy('createdAt', 'desc')
        .get(),
    ]);

    const pots: FundraisingPot[] = potsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    const catalog: PosCatalogItem[] = catalogSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    const [stripeStatus, unlockStatus] = await Promise.all([
      verifyCommunityStripeConnected(commData.stripeAccountId),
      getCommunityPosUnlockStatus(firestore, params.communityId, commData),
    ]);

    return {
      success: true,
      communityName: commData.name || 'Community Hub',
      stripeConnected: stripeStatus.connected,
      unlockStatus,
      pots,
      catalog,
    };
  } catch (error: any) {
    console.error('Error loading POS overview:', error);
    return { success: false, error: error.message || 'Failed to load Event Till.' };
  }
}

export async function createFundraisingPotAction(params: {
  communityId: string;
  uid: string;
  title: string;
  description?: string;
  eventName?: string;
  presetAmounts?: number[];
  allowCustomAmount?: boolean;
  allowCash?: boolean;
}) {
  try {
    const { firestore } = initializeAdminApp();
    const auth = await verifyCommunityPosPermission(firestore, params.uid, params.communityId, 'operateEventTill');
    if (!auth.allowed) return { success: false, error: auth.error };

    const title = params.title?.trim();
    if (!title) return { success: false, error: 'Fundraiser title is required.' };

    const now = new Date().toISOString();
    const docRef = await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('fundraisingPots')
      .add({
        title,
        description: params.description?.trim() || '',
        eventName: params.eventName?.trim() || '',
        presetAmounts:
          params.presetAmounts && params.presetAmounts.length > 0 ? params.presetAmounts : [2, 5, 10, 20],
        allowCustomAmount: params.allowCustomAmount !== false,
        allowCash: params.allowCash !== false,
        active: true,
        totalRaisedPence: 0,
        totalCardPence: 0,
        totalCashPence: 0,
        txCount: 0,
        createdByUid: params.uid,
        createdByName: auth.operatorName,
        createdAt: now,
        updatedAt: now,
      });

    return { success: true, potId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create fundraising pot.' };
  }
}

export async function toggleFundraisingPotAction(params: {
  communityId: string;
  uid: string;
  potId: string;
  active: boolean;
}) {
  try {
    const { firestore } = initializeAdminApp();
    const auth = await verifyCommunityPosPermission(firestore, params.uid, params.communityId, 'operateEventTill');
    if (!auth.allowed) return { success: false, error: auth.error };

    await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('fundraisingPots')
      .doc(params.potId)
      .update({
        active: params.active,
        updatedAt: new Date().toISOString(),
      });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update pot.' };
  }
}

export async function createPosCatalogItemAction(params: {
  communityId: string;
  uid: string;
  name: string;
  pricePence: number;
  category?: string;
}) {
  try {
    const { firestore } = initializeAdminApp();
    const auth = await verifyCommunityPosPermission(firestore, params.uid, params.communityId, 'operateEventTill');
    if (!auth.allowed) return { success: false, error: auth.error };

    const name = params.name?.trim();
    if (!name) return { success: false, error: 'Item name is required.' };
    if (!Number.isFinite(params.pricePence) || params.pricePence < 10) {
      return { success: false, error: 'Price must be at least £0.10.' };
    }

    const docRef = await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('posCatalog')
      .add({
        name,
        pricePence: Math.round(params.pricePence),
        category: params.category?.trim() || 'Stall',
        active: true,
        createdByUid: params.uid,
        createdAt: new Date().toISOString(),
      });

    return { success: true, itemId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add stall item.' };
  }
}

export async function deletePosCatalogItemAction(params: {
  communityId: string;
  uid: string;
  itemId: string;
}) {
  try {
    const { firestore } = initializeAdminApp();
    const auth = await verifyCommunityPosPermission(firestore, params.uid, params.communityId, 'operateEventTill');
    if (!auth.allowed) return { success: false, error: auth.error };

    await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('posCatalog')
      .doc(params.itemId)
      .delete();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete stall item.' };
  }
}

export async function createPosQrCheckoutAction(params: {
  communityId: string;
  uid: string;
  items: PosLineItem[];
  customAmountPence?: number;
  potId?: string | null;
  eventName?: string | null;
}) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return { success: false, error: 'Stripe configuration missing on server.' };

    const { firestore } = initializeAdminApp();
    const auth = await verifyCommunityPosPermission(firestore, params.uid, params.communityId, 'operateEventTill');
    if (!auth.allowed) return { success: false, error: auth.error };

    const commDoc = await firestore.collection('communities').doc(params.communityId).get();
    const commData = commDoc.data() || {};
    const unlockStatus = await getCommunityPosUnlockStatus(firestore, params.communityId, commData);
    if (!unlockStatus.unlocked) {
      return {
        success: false,
        error: `QR / Card payments unlock once your community reaches ${unlockStatus.requiredSubscriptions} active paid business subscriptions (${unlockStatus.activePaidSubscriptions}/${unlockStatus.requiredSubscriptions} active).`,
      };
    }

    const stripeStatus = await verifyCommunityStripeConnected(commData.stripeAccountId);
    if (!stripeStatus.connected) {
      return {
        success: false,
        error: stripeStatus.reason || 'This community has not linked its Stripe bank account yet (see Leader > Financials).',
      };
    }

    const cleanItems: PosLineItem[] = (params.items || [])
      .filter((i) => i.qty > 0 && i.unitPricePence > 0)
      .map((i) => ({
        id: i.id || undefined,
        name: String(i.name || 'Stall Item').slice(0, 80),
        qty: Math.round(i.qty),
        unitPricePence: Math.round(i.unitPricePence),
      }));

    const customPence = Math.max(0, Math.round(params.customAmountPence || 0));
    if (customPence > 0) {
      cleanItems.push({
        name: 'Custom Event Sale / Donation',
        qty: 1,
        unitPricePence: customPence,
      });
    }

    const totalPence = cleanItems.reduce((sum, item) => sum + item.unitPricePence * item.qty, 0);
    if (totalPence < 50) {
      return { success: false, error: 'Minimum card/QR payment is £0.50 (use Cash for smaller amounts).' };
    }

    let potTitle = '';
    if (params.potId) {
      const potSnap = await firestore
        .collection('communities')
        .doc(params.communityId)
        .collection('fundraisingPots')
        .doc(params.potId)
        .get();
      potTitle = potSnap.data()?.title || '';
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://my-community-hub.co.uk';
    const requestRef = firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('posPaymentRequests')
      .doc();

    const transferGroup = `tg_pos_${Date.now()}_${requestRef.id.substring(0, 6)}`;
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });

    // Omit payment_method_types so Stripe Dynamic Payment Methods offer Apple Pay, Google Pay, Card, Link, Pay by Bank, etc.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: cleanItems.map((item) => ({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: item.name,
          },
          unit_amount: item.unitPricePence,
        },
        quantity: item.qty,
      })),
      payment_intent_data: {
        application_fee_amount: calculateEstimatedStripeFeePence(totalPence),
        transfer_data: {
          destination: commData.stripeAccountId,
        },
        transfer_group: transferGroup,
      },
      success_url: `${baseUrl}/donate/${params.communityId}?status=success&req=${requestRef.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/donate/${params.communityId}?status=cancelled&req=${requestRef.id}`,
      metadata: {
        pt: 'community_pos',
        cid: params.communityId,
        reqId: requestRef.id,
        potId: params.potId || '',
        potTitle: potTitle.slice(0, 120),
        ev: (params.eventName || '').slice(0, 120),
        opUid: params.uid,
        opName: auth.operatorName.slice(0, 80),
        tg: transferGroup,
        itemsJson: JSON.stringify(cleanItems).slice(0, 480),
      },
    });

    await requestRef.set({
      amountPence: totalPence,
      items: cleanItems,
      potId: params.potId || null,
      potTitle: potTitle || null,
      eventName: params.eventName?.trim() || null,
      operatorUid: params.uid,
      operatorName: auth.operatorName,
      status: 'pending',
      stripeSessionId: session.id,
      stripeUrl: session.url,
      createdAt: new Date().toISOString(),
      paidAt: null,
      receiptNumber: null,
    });

    return {
      success: true,
      requestId: requestRef.id,
      amountPence: totalPence,
      checkoutUrl: session.url,
      publicPayUrl: `${baseUrl}/donate/${params.communityId}?req=${requestRef.id}`,
    };
  } catch (error: any) {
    console.error('Error creating POS QR checkout:', error);
    return { success: false, error: error.message || 'Failed to create QR checkout.' };
  }
}

export async function getPosPaymentRequestStatusAction(params: {
  communityId: string;
  requestId: string;
}) {
  try {
    const { firestore } = initializeAdminApp();
    const docSnap = await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('posPaymentRequests')
      .doc(params.requestId)
      .get();

    if (!docSnap.exists) {
      return { success: false, error: 'Payment request not found.' };
    }

    const data = docSnap.data() || {};

    if (data.status === 'pending' && data.stripeSessionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2025-07-30.basil' as any,
        });
        const syncRes = await syncCommunityCheckoutSession(stripe, data.stripeSessionId);
        if (syncRes.synced) {
          return {
            success: true,
            status: 'paid' as const,
            paidAt: new Date().toISOString(),
            receiptNumber: syncRes.receiptNumber || null,
          };
        }
      } catch (err) {
        console.error('Error syncing pending POS request with Stripe:', err);
      }
    }

    return {
      success: true,
      status: data.status as 'pending' | 'paid' | 'cancelled',
      paidAt: data.paidAt || null,
      receiptNumber: data.receiptNumber || null,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function confirmCommunityPosCheckoutSessionAction(params: {
  communityId: string;
  sessionId: string;
}) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret || !params.sessionId || !params.communityId) {
      return { success: false };
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });
    const syncRes = await syncCommunityCheckoutSession(stripe, params.sessionId);
    return {
      success: syncRes.synced,
      receiptNumber: syncRes.receiptNumber || null,
    };
  } catch (error: any) {
    console.error('Error confirming POS checkout session:', error);
    return { success: false, error: error.message };
  }
}

export async function recordCashPosSaleAction(params: {
  communityId: string;
  uid: string;
  items: PosLineItem[];
  customAmountPence?: number;
  potId?: string | null;
  eventName?: string | null;
  note?: string | null;
}) {
  try {
    const { firestore } = initializeAdminApp();
    const auth = await verifyCommunityPosPermission(firestore, params.uid, params.communityId, 'operateEventTill');
    if (!auth.allowed) return { success: false, error: auth.error };

    const cleanItems: PosLineItem[] = (params.items || [])
      .filter((i) => i.qty > 0 && i.unitPricePence > 0)
      .map((i) => ({
        id: i.id || undefined,
        name: String(i.name || 'Stall Item').slice(0, 80),
        qty: Math.round(i.qty),
        unitPricePence: Math.round(i.unitPricePence),
      }));

    const customPence = Math.max(0, Math.round(params.customAmountPence || 0));
    if (customPence > 0) {
      cleanItems.push({
        name: 'Custom Cash Sale / Donation',
        qty: 1,
        unitPricePence: customPence,
      });
    }

    const totalPence = cleanItems.reduce((sum, item) => sum + item.unitPricePence * item.qty, 0);
    if (totalPence <= 0) {
      return { success: false, error: 'Amount must be greater than £0.00.' };
    }

    let potTitle: string | null = null;
    if (params.potId) {
      const potSnap = await firestore
        .collection('communities')
        .doc(params.communityId)
        .collection('fundraisingPots')
        .doc(params.potId)
        .get();
      potTitle = potSnap.data()?.title || null;
    }

    const receiptNumber = makeReceiptNumber('CASH');
    const now = new Date().toISOString();
    const ledgerRef = firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('posAuditLedger')
      .doc();

    await ledgerRef.set({
      receiptNumber,
      source: 'mobile_till',
      paymentMethod: 'cash',
      grossAmountPence: totalPence,
      estimatedFeePence: 0,
      netTransferPence: totalPence,
      currency: 'gbp',
      potId: params.potId || null,
      potTitle,
      eventName: params.eventName?.trim() || null,
      items: cleanItems,
      operatorUid: params.uid,
      operatorName: auth.operatorName,
      donorName: null,
      donorEmail: null,
      donorNote: params.note?.trim() || null,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      stripeTransferId: null,
      transferStatus: 'cash_in_hand',
      createdAt: now,
    });

    if (params.potId) {
      await firestore
        .collection('communities')
        .doc(params.communityId)
        .collection('fundraisingPots')
        .doc(params.potId)
        .update({
          totalRaisedPence: FieldValue.increment(totalPence),
          totalCashPence: FieldValue.increment(totalPence),
          txCount: FieldValue.increment(1),
          updatedAt: now,
        });
    }

    return {
      success: true,
      receiptNumber,
      amountPence: totalPence,
    };
  } catch (error: any) {
    console.error('Error recording cash sale:', error);
    return { success: false, error: error.message || 'Failed to record cash sale.' };
  }
}

export async function getPublicDonatePageDataAction(params: {
  communityId: string;
  potId?: string | null;
  requestId?: string | null;
}) {
  try {
    const { firestore } = initializeAdminApp();
    const commDoc = await firestore.collection('communities').doc(params.communityId).get();
    if (!commDoc.exists) {
      return { success: false, error: 'Community not found.' };
    }
    const commData = commDoc.data() || {};

    let pot: FundraisingPot | null = null;
    if (params.potId) {
      const potDoc = await firestore
        .collection('communities')
        .doc(params.communityId)
        .collection('fundraisingPots')
        .doc(params.potId)
        .get();
      if (potDoc.exists) {
        pot = { id: potDoc.id, ...(potDoc.data() as any) };
      }
    }

    let requestData: {
      id: string;
      status: string;
      amountPence: number;
      items: PosLineItem[];
      potTitle: string | null;
      eventName: string | null;
      stripeUrl: string | null;
      receiptNumber: string | null;
    } | null = null;

    if (params.requestId) {
      const reqDoc = await firestore
        .collection('communities')
        .doc(params.communityId)
        .collection('posPaymentRequests')
        .doc(params.requestId)
        .get();
      if (reqDoc.exists) {
        const d = reqDoc.data() || {};
        requestData = {
          id: reqDoc.id,
          status: d.status,
          amountPence: d.amountPence,
          items: d.items || [],
          potTitle: d.potTitle || null,
          eventName: d.eventName || null,
          stripeUrl: d.stripeUrl || null,
          receiptNumber: d.receiptNumber || null,
        };
      }
    }

    const [stripeStatus, unlockStatus] = await Promise.all([
      verifyCommunityStripeConnected(commData.stripeAccountId),
      getCommunityPosUnlockStatus(firestore, params.communityId, commData),
    ]);

    return {
      success: true,
      communityName: commData.name || 'Community Hub',
      stripeConnected: stripeStatus.connected,
      stripeStatusReason: stripeStatus.reason || null,
      unlockStatus,
      pot,
      requestData,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load payment page.' };
  }
}

export async function createPublicDonationCheckoutAction(params: {
  communityId: string;
  potId?: string | null;
  amountPence: number;
  donorName?: string;
  donorNote?: string;
}) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return { success: false, error: 'Stripe configuration missing.' };

    const amountPence = Math.round(params.amountPence);
    if (!Number.isFinite(amountPence) || amountPence < 100) {
      return { success: false, error: 'Minimum donation is £1.00.' };
    }

    const { firestore } = initializeAdminApp();
    const commDoc = await firestore.collection('communities').doc(params.communityId).get();
    const commData = commDoc.data() || {};
    const unlockStatus = await getCommunityPosUnlockStatus(firestore, params.communityId, commData);
    if (!unlockStatus.unlocked) {
      return {
        success: false,
        error: `QR / Card payments unlock once your community reaches ${unlockStatus.requiredSubscriptions} active paid business subscriptions (${unlockStatus.activePaidSubscriptions}/${unlockStatus.requiredSubscriptions} active).`,
      };
    }

    const stripeStatus = await verifyCommunityStripeConnected(commData.stripeAccountId);
    if (!stripeStatus.connected) {
      return {
        success: false,
        error: stripeStatus.reason || 'This community has not enabled online Stripe donations yet.',
      };
    }

    let potTitle = `${commData.name || 'Community'} Fundraiser`;
    let eventName = '';
    if (params.potId) {
      const potSnap = await firestore
        .collection('communities')
        .doc(params.communityId)
        .collection('fundraisingPots')
        .doc(params.potId)
        .get();
      if (potSnap.exists) {
        const p = potSnap.data() || {};
        if (p.active === false) {
          return { success: false, error: 'This fundraising pot is currently closed.' };
        }
        potTitle = p.title || potTitle;
        eventName = p.eventName || '';
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://my-community-hub.co.uk';
    const transferGroup = `tg_don_${Date.now()}_${params.communityId.substring(0, 6)}`;
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });

    // Omit payment_method_types so Stripe Dynamic Payment Methods offer Apple Pay, Google Pay, Card, Link, Pay by Bank, etc.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: potTitle,
              description: eventName ? `${commData.name || 'Community'} • ${eventName}` : (commData.name || 'Community Donation'),
            },
            unit_amount: amountPence,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: calculateEstimatedStripeFeePence(amountPence),
        transfer_data: {
          destination: commData.stripeAccountId,
        },
        transfer_group: transferGroup,
      },
      success_url: `${baseUrl}/donate/${params.communityId}?status=success&session_id={CHECKOUT_SESSION_ID}${params.potId ? `&pot=${params.potId}` : ''}`,
      cancel_url: `${baseUrl}/donate/${params.communityId}?status=cancelled${params.potId ? `&pot=${params.potId}` : ''}`,
      metadata: {
        pt: 'community_donation',
        cid: params.communityId,
        potId: params.potId || '',
        potTitle: potTitle.slice(0, 120),
        ev: eventName.slice(0, 120),
        dn: (params.donorName || '').trim().slice(0, 80),
        dNote: (params.donorNote || '').trim().slice(0, 200),
        tg: transferGroup,
      },
    });

    return { success: true, url: session.url };
  } catch (error: any) {
    console.error('Error creating public donation checkout:', error);
    return { success: false, error: error.message || 'Failed to start checkout.' };
  }
}

export async function getPosAuditLedgerAction(params: {
  communityId: string;
  uid: string;
}) {
  try {
    const { firestore } = initializeAdminApp();
    const auth = await verifyCommunityPosPermission(firestore, params.uid, params.communityId, 'overseePosTracking');
    if (!auth.allowed) {
      return { success: false, error: auth.error };
    }

    const commDoc = await firestore.collection('communities').doc(params.communityId).get();
    const commData = commDoc.data() || {};

    const [ledgerSnap, potsSnap] = await Promise.all([
      firestore
        .collection('communities')
        .doc(params.communityId)
        .collection('posAuditLedger')
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get(),
      firestore
        .collection('communities')
        .doc(params.communityId)
        .collection('fundraisingPots')
        .orderBy('createdAt', 'desc')
        .get(),
    ]);

    const entries: PosAuditEntry[] = ledgerSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    const pots: FundraisingPot[] = potsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    const stripeStatus = await verifyCommunityStripeConnected(commData.stripeAccountId);

    return {
      success: true,
      communityName: commData.name || 'Community Hub',
      stripeConnected: stripeStatus.connected,
      entries,
      pots,
    };
  } catch (error: any) {
    console.error('Error loading POS audit ledger:', error);
    return { success: false, error: error.message || 'Failed to load POS audit ledger.' };
  }
}

export async function getCommunityPosFinancialSummaryAction(params: {
  communityId: string;
}): Promise<{
  success: boolean;
  totalGrossPence: number;
  cardGrossPence: number;
  cardNetPence: number;
  cashGrossPence: number;
  txCount: number;
  error?: string;
}> {
  try {
    if (!params.communityId) {
      return {
        success: false,
        totalGrossPence: 0,
        cardGrossPence: 0,
        cardNetPence: 0,
        cashGrossPence: 0,
        txCount: 0,
        error: 'Missing communityId.',
      };
    }

    const { firestore } = initializeAdminApp();
    const snap = await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('posAuditLedger')
      .get();

    let totalGrossPence = 0;
    let cardGrossPence = 0;
    let cardNetPence = 0;
    let cashGrossPence = 0;

    for (const d of snap.docs) {
      const data = d.data() || {};
      const gross = Number(data.grossAmountPence || 0);
      const net = Number(data.netTransferPence || gross);
      totalGrossPence += gross;
      if (data.paymentMethod === 'cash') {
        cashGrossPence += gross;
      } else {
        cardGrossPence += gross;
        cardNetPence += net;
      }
    }

    return {
      success: true,
      totalGrossPence,
      cardGrossPence,
      cardNetPence,
      cashGrossPence,
      txCount: snap.size,
    };
  } catch (error: any) {
    return {
      success: false,
      totalGrossPence: 0,
      cardGrossPence: 0,
      cardNetPence: 0,
      cashGrossPence: 0,
      txCount: 0,
      error: error.message,
    };
  }
}
