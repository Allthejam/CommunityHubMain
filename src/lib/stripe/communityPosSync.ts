import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin-app';

export function calculateEstimatedStripeFeePence(totalAmountPence: number): number {
  if (!Number.isFinite(totalAmountPence) || totalAmountPence <= 0) return 0;
  return Math.round(totalAmountPence * 0.015 + 20);
}

/**
 * Idempotently records a paid Stripe Checkout Session for Community POS / Donation
 * into Firestore (`posAuditLedger`, `fundraisingPots`, and `posPaymentRequests`),
 * and ensures funds are transferred to the community's Stripe Connect account
 * if the session was not already created as a destination charge.
 */
export async function syncCommunityCheckoutSession(
  stripe: Stripe,
  sessionInput: Stripe.Checkout.Session | string
): Promise<{ synced: boolean; receiptNumber?: string; alreadyRecorded?: boolean }> {
  const session =
    typeof sessionInput === 'string'
      ? await stripe.checkout.sessions.retrieve(sessionInput, {
          expand: ['payment_intent.latest_charge'],
        })
      : sessionInput;

  if (session.payment_status !== 'paid') {
    return { synced: false };
  }

  const meta = session.metadata || {};
  const purchaseType = meta.purchaseType || meta.pt;
  if (purchaseType !== 'community_pos' && purchaseType !== 'community_donation') {
    return { synced: false };
  }

  const communityId = meta.cid || meta.communityId;
  if (!communityId) {
    console.error('❌ [COMMUNITY POS SYNC] Missing communityId in metadata');
    return { synced: false };
  }

  const { firestore } = initializeAdminApp();
  const ledgerRef = firestore.doc(`communities/${communityId}/posAuditLedger/${session.id}`);

  const existing = await ledgerRef.get();
  if (existing.exists) {
    return {
      synced: true,
      alreadyRecorded: true,
      receiptNumber: existing.data()?.receiptNumber,
    };
  }

  const totalAmount = session.amount_total || 0;
  const estimatedFee = calculateEstimatedStripeFeePence(totalAmount);
  const netTransfer = Math.max(0, totalAmount - estimatedFee);
  const transferGroup = meta.tg || session.id;

  let piId: string | null = null;
  let chargeId: string | null = null;
  let existingTransferId: string | null = null;
  let isDestinationCharge = false;

  if (session.payment_intent) {
    if (typeof session.payment_intent === 'string') {
      piId = session.payment_intent;
      try {
        const pi = await stripe.paymentIntents.retrieve(piId, {
          expand: ['latest_charge'],
        });
        if (pi.transfer_data?.destination) {
          isDestinationCharge = true;
        }
        if (pi.latest_charge && typeof pi.latest_charge !== 'string') {
          chargeId = pi.latest_charge.id;
          if (typeof pi.latest_charge.transfer === 'string') {
            existingTransferId = pi.latest_charge.transfer;
          } else if (pi.latest_charge.transfer?.id) {
            existingTransferId = pi.latest_charge.transfer.id;
          }
        } else if (typeof pi.latest_charge === 'string') {
          chargeId = pi.latest_charge;
        }
      } catch (err: any) {
        console.error('❌ [COMMUNITY POS SYNC] Error retrieving PaymentIntent:', err.message);
      }
    } else {
      const pi = session.payment_intent;
      piId = pi.id;
      if (pi.transfer_data?.destination) {
        isDestinationCharge = true;
      }
      if (pi.latest_charge && typeof pi.latest_charge !== 'string') {
        chargeId = pi.latest_charge.id;
        if (typeof pi.latest_charge.transfer === 'string') {
          existingTransferId = pi.latest_charge.transfer;
        } else if (pi.latest_charge.transfer?.id) {
          existingTransferId = pi.latest_charge.transfer.id;
        }
      } else if (typeof pi.latest_charge === 'string') {
        chargeId = pi.latest_charge;
      }
    }
  }

  const commDoc = await firestore.doc(`communities/${communityId}`).get();
  const commStripeAccountId = commDoc.data()?.stripeAccountId;

  let stripeTransferId: string | null = existingTransferId;
  let transferStatus: 'transferred' | 'pending_connect' | 'failed' = isDestinationCharge
    ? 'transferred'
    : 'pending_connect';

  // Fallback transfer only if this was NOT already a destination charge
  if (!isDestinationCharge && commStripeAccountId && netTransfer > 0) {
    try {
      const transferData: Stripe.TransferCreateParams = {
        amount: netTransfer,
        currency: session.currency || 'gbp',
        destination: commStripeAccountId,
        transfer_group: transferGroup,
      };
      if (chargeId) {
        transferData.source_transaction = chargeId;
      }
      const transfer = await stripe.transfers.create(transferData);
      stripeTransferId = transfer.id;
      transferStatus = 'transferred';
    } catch (err: any) {
      console.error(`❌ [COMMUNITY POS SYNC] Transfer failed for ${communityId}:`, err.message);
      transferStatus = 'failed';
    }
  }

  let parsedItems: any[] = [];
  if (meta.itemsJson) {
    try {
      parsedItems = JSON.parse(meta.itemsJson);
    } catch {
      parsedItems = [];
    }
  }

  const now = new Date().toISOString();
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const receiptNumber = `CH-${purchaseType === 'community_pos' ? 'POS' : 'DON'}-${ymd}-${session.id.slice(-4).toUpperCase()}`;

  // Use a Firestore transaction so concurrent webhook + return URL calls never double-count
  const recorded = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ledgerRef);
    if (snap.exists) {
      return { alreadyRecorded: true, receiptNumber: snap.data()?.receiptNumber as string };
    }

    tx.set(ledgerRef, {
      receiptNumber,
      source: purchaseType === 'community_pos' ? 'mobile_till' : 'qr_donation_pot',
      paymentMethod: 'stripe_qr_card',
      grossAmountPence: totalAmount,
      estimatedFeePence: estimatedFee,
      netTransferPence: netTransfer,
      currency: session.currency || 'gbp',
      potId: meta.potId || null,
      potTitle: meta.potTitle || null,
      eventName: meta.ev || null,
      items: parsedItems,
      operatorUid: meta.opUid || null,
      operatorName: meta.opName || null,
      donorName: meta.dn || session.customer_details?.name || null,
      donorEmail: session.customer_details?.email || null,
      donorNote: meta.dNote || null,
      stripeSessionId: session.id,
      stripePaymentIntentId: piId,
      stripeTransferId,
      transferStatus,
      createdAt: now,
    });

    if (meta.potId) {
      const potRef = firestore.doc(`communities/${communityId}/fundraisingPots/${meta.potId}`);
      tx.update(potRef, {
        totalRaisedPence: FieldValue.increment(totalAmount),
        totalCardPence: FieldValue.increment(totalAmount),
        txCount: FieldValue.increment(1),
        updatedAt: now,
      });
    }

    if (meta.reqId) {
      const reqRef = firestore.doc(`communities/${communityId}/posPaymentRequests/${meta.reqId}`);
      tx.update(reqRef, {
        status: 'paid',
        paidAt: now,
        receiptNumber,
      });
    }

    return { alreadyRecorded: false, receiptNumber };
  });

  return {
    synced: true,
    alreadyRecorded: recorded.alreadyRecorded,
    receiptNumber: recorded.receiptNumber,
  };
}
