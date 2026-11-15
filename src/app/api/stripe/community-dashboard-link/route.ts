export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/firebase/admin-app';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get('communityId');
    if (!communityId) {
      return NextResponse.json({ success: false, error: 'Community ID is missing.' }, { status: 400 });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return NextResponse.json({ success: false, error: 'Stripe configuration missing.' }, { status: 500 });
    }

    const { firestore } = initializeAdminApp();
    const docSnap = await firestore.collection('communities').doc(communityId).get();
    const stripeId = docSnap.data()?.stripeAccountId;

    if (!stripeId) {
      return NextResponse.json(
        { success: false, error: 'No Stripe account is linked to this community yet.' },
        { status: 404 }
      );
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' as any });
    const account = await stripe.accounts.retrieve(stripeId);

    if (account.type === 'standard') {
      return NextResponse.json({ success: true, url: 'https://dashboard.stripe.com' });
    }

    if (!account.details_submitted) {
      const origin = new URL(req.url).origin;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || 'https://my-community-hub.co.uk';
      const onboardingLink = await stripe.accountLinks.create({
        account: stripeId,
        refresh_url: `${baseUrl}/leader/financials?reauth=true`,
        return_url: `${baseUrl}/leader/financials?stripe_return=true`,
        type: 'account_onboarding',
      });
      return NextResponse.json({ success: true, url: onboardingLink.url });
    }

    const loginLink = await stripe.accounts.createLoginLink(stripeId);
    return NextResponse.json({ success: true, url: loginLink.url });
  } catch (e: any) {
    console.error('[API STRIPE DASHBOARD LINK ERROR]', e?.message || e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to open Stripe dashboard.' },
      { status: 500 }
    );
  }
}
