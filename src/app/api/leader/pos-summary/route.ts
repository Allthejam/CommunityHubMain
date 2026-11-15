export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/firebase/admin-app';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get('communityId');
    if (!communityId) {
      return NextResponse.json(
        { success: false, totalGrossPence: 0, cardGrossPence: 0, cardNetPence: 0, cashGrossPence: 0, txCount: 0 },
        { status: 400 }
      );
    }

    const { firestore } = initializeAdminApp();
    const snap = await firestore
      .collection('communities')
      .doc(communityId)
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

    return NextResponse.json(
      {
        success: true,
        totalGrossPence,
        cardGrossPence,
        cardNetPence,
        cashGrossPence,
        txCount: snap.size,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[API POS SUMMARY ERROR]', e?.message || e);
    return NextResponse.json(
      {
        success: false,
        totalGrossPence: 0,
        cardGrossPence: 0,
        cardNetPence: 0,
        cashGrossPence: 0,
        txCount: 0,
        error: e?.message || 'Failed to load POS summary.',
      },
      { status: 500 }
    );
  }
}
