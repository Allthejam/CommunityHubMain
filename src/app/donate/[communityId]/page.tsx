'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Heart,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  getPublicDonatePageDataAction,
  createPublicDonationCheckoutAction,
  type FundraisingPot,
  type PosLineItem,
} from '@/lib/actions/communityPosActions';

function formatGbp(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function PublicCommunityDonatePage() {
  const params = useParams<{ communityId: string }>();
  const searchParams = useSearchParams();

  const communityId = params?.communityId || '';
  const potId = searchParams.get('pot');
  const requestId = searchParams.get('req');
  const status = searchParams.get('status');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [communityName, setCommunityName] = useState('Community Hub');
  const [stripeConnected, setStripeConnected] = useState(false);
  const [pot, setPot] = useState<FundraisingPot | null>(null);
  const [requestData, setRequestData] = useState<{
    id: string;
    status: string;
    amountPence: number;
    items: PosLineItem[];
    potTitle: string | null;
    eventName: string | null;
    stripeUrl: string | null;
    receiptNumber: string | null;
  } | null>(null);

  const [selectedPounds, setSelectedPounds] = useState<number>(5);
  const [customPounds, setCustomPounds] = useState<string>('');
  const [donorName, setDonorName] = useState('');
  const [donorNote, setDonorNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!communityId) return;
    setLoading(true);
    getPublicDonatePageDataAction({ communityId, potId, requestId })
      .then((res) => {
        if (!res.success) {
          setError(res.error || 'Could not load payment details.');
        } else {
          setCommunityName(res.communityName || 'Community Hub');
          setStripeConnected(Boolean(res.stripeConnected));
          setPot(res.pot || null);
          setRequestData(res.requestData || null);
          if (res.pot?.presetAmounts?.length) {
            setSelectedPounds(res.pot.presetAmounts[0]);
          }
        }
      })
      .catch((err) => setError(err.message || 'Failed to load page.'))
      .finally(() => setLoading(false));
  }, [communityId, potId, requestId]);

  const effectivePence = customPounds.trim()
    ? Math.round(parseFloat(customPounds) * 100)
    : Math.round(selectedPounds * 100);

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!Number.isFinite(effectivePence) || effectivePence < 100) {
      setError('Please enter an amount of at least £1.00.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPublicDonationCheckoutAction({
        communityId,
        potId,
        amountPence: effectivePence,
        donorName,
        donorNote,
      });
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setError(res.error || 'Could not start Stripe checkout.');
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Payment error.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4 flex items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        {status === 'success' ? (
          <Card className="border-emerald-200 shadow-lg">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl text-emerald-900">Thank You!</CardTitle>
              <CardDescription className="text-base">
                Your payment to <strong>{communityName}</strong> has been received.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
              {requestData?.receiptNumber && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-900 font-mono text-xs">
                  Receipt Ref: {requestData.receiptNumber}
                </div>
              )}
              <p>
                Your contribution is logged in the community&apos;s transparent fundraising ledger and routed directly to their verified Stripe account.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = potId
                    ? `/donate/${communityId}?pot=${potId}`
                    : `/donate/${communityId}`;
                }}
              >
                Make Another Contribution
              </Button>
            </CardContent>
          </Card>
        ) : requestId && requestData ? (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <Badge variant="secondary" className="mx-auto mb-2 w-fit">
                <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                Community Event Till
              </Badge>
              <CardTitle className="text-xl">{communityName}</CardTitle>
              <CardDescription>
                {requestData.potTitle || requestData.eventName || 'Event Stall Payment'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status === 'cancelled' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Payment was cancelled. You can complete it below whenever you&apos;re ready.
                </div>
              )}

              {requestData.status === 'paid' ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-emerald-900">Already Paid — Thank You!</p>
                  {requestData.receiptNumber && (
                    <p className="font-mono text-xs text-emerald-700">
                      Ref: {requestData.receiptNumber}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-lg border bg-slate-50 p-3 space-y-2 text-sm">
                    {requestData.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {item.qty}x {item.name}
                        </span>
                        <span className="font-medium">
                          {formatGbp(item.unitPricePence * item.qty)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between text-base font-bold">
                      <span>Total Due</span>
                      <span>{formatGbp(requestData.amountPence)}</span>
                    </div>
                  </div>

                  {requestData.stripeUrl ? (
                    <Button
                      className="w-full h-12 text-base font-semibold"
                      onClick={() => {
                        window.location.href = requestData.stripeUrl!;
                      }}
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      Pay {formatGbp(requestData.amountPence)} (Apple Pay / Card)
                    </Button>
                  ) : (
                    <p className="text-sm text-destructive text-center">
                      Checkout link unavailable. Please ask the till volunteer to refresh the QR code.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Heart className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">{pot?.title || `${communityName} Fundraiser`}</CardTitle>
              <CardDescription>
                {pot?.description || `Support local projects and events in ${communityName}.`}
              </CardDescription>
              {pot?.eventName && (
                <Badge variant="outline" className="mx-auto mt-2 w-fit">
                  {pot.eventName}
                </Badge>
              )}
            </CardHeader>

            <CardContent>
              {!stripeConnected ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 text-center">
                  This community is still finishing its Stripe bank setup. Please check back soon or donate in person at the stall.
                </div>
              ) : pot && pot.active === false ? (
                <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground text-center">
                  This fundraising pot is now closed. Thank you to everyone who contributed!
                </div>
              ) : (
                <form onSubmit={handleDonationSubmit} className="space-y-4">
                  {status === 'cancelled' && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Payment cancelled. No money was taken.
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div>
                    <Label className="mb-2 block">Choose an amount</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {(pot?.presetAmounts || [2, 5, 10, 20]).map((amt) => {
                        const isSelected = !customPounds && selectedPounds === amt;
                        return (
                          <Button
                            key={amt}
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            className="h-11 font-bold"
                            onClick={() => {
                              setSelectedPounds(amt);
                              setCustomPounds('');
                            }}
                          >
                            £{amt}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {pot?.allowCustomAmount !== false && (
                    <div>
                      <Label htmlFor="customAmount">Or enter custom amount (£)</Label>
                      <Input
                        id="customAmount"
                        type="number"
                        min="1"
                        step="0.50"
                        placeholder="e.g. 15.00"
                        value={customPounds}
                        onChange={(e) => setCustomPounds(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="donorName">Your Name (optional)</Label>
                    <Input
                      id="donorName"
                      placeholder="e.g. Sarah M."
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="donorNote">Message / Stall Note (optional)</Label>
                    <Textarea
                      id="donorNote"
                      rows={2}
                      placeholder="Good luck with the fundraiser!"
                      value={donorNote}
                      onChange={(e) => setDonorNote(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={submitting || !Number.isFinite(effectivePence) || effectivePence < 100}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Opening Secure Checkout...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Pay {Number.isFinite(effectivePence) ? formatGbp(effectivePence) : '£0.00'} (Apple Pay / Card)
                      </>
                    )}
                  </Button>
                </form>
              )}

              <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Secured by Stripe &bull; 100% auditable community ledger</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
