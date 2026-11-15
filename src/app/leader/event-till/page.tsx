'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  QrCode,
  Plus,
  Minus,
  Trash2,
  Banknote,
  CreditCard,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Store,
  Heart,
  Receipt,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { QrCodeCanvas } from '@/components/leader/qr-code-card';
import {
  getCommunityPosOverviewAction,
  createFundraisingPotAction,
  toggleFundraisingPotAction,
  createPosCatalogItemAction,
  deletePosCatalogItemAction,
  createPosQrCheckoutAction,
  getPosPaymentRequestStatusAction,
  recordCashPosSaleAction,
  type FundraisingPot,
  type PosCatalogItem,
  type PosLineItem,
} from '@/lib/actions/communityPosActions';

function formatGbp(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function LeaderEventTillPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const impersonating = (userProfile as any)?.impersonating;
  const communityId = impersonating?.communityId || userProfile?.communityId || '';
  const communityRoleData = communityId ? userProfile?.communityRoles?.[communityId] : null;
  const permissions =
    impersonating?.communityId === communityId
      ? impersonating?.permissions || {}
      : communityRoleData?.permissions || userProfile?.permissions || {};
  const activeRole = String(communityRoleData?.role || userProfile?.role || '').toLowerCase();
  const accountType = String(userProfile?.accountType || '').toLowerCase();

  const isSuperRole =
    ['president', 'owner', 'admin', 'administrator'].includes(activeRole) ||
    ['owner', 'admin', 'administrator'].includes(accountType);

  const canOperateTill = isSuperRole || permissions?.operateEventTill === true;
  const canOverseeAudit = isSuperRole || permissions?.overseePosTracking === true;

  const [loading, setLoading] = useState(true);
  const [communityName, setCommunityName] = useState('Community Hub');
  const [stripeConnected, setStripeConnected] = useState(false);
  const [pots, setPots] = useState<FundraisingPot[]>([]);
  const [catalog, setCatalog] = useState<PosCatalogItem[]>([]);

  // Till state
  const [selectedPotId, setSelectedPotId] = useState<string>('none');
  const [eventName, setEventName] = useState<string>('');
  const [basket, setBasket] = useState<PosLineItem[]>([]);
  const [customPounds, setCustomPounds] = useState<string>('');
  const [cashNote, setCashNote] = useState<string>('');
  const [processingAction, setProcessingAction] = useState(false);

  // Live QR Payment modal state
  const [activeQrPayment, setActiveQrPayment] = useState<{
    requestId: string;
    amountPence: number;
    publicPayUrl: string;
    checkoutUrl: string;
    status: 'pending' | 'paid' | 'cancelled';
    receiptNumber?: string | null;
  } | null>(null);

  // Catalog form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Baking & Food');

  // Pot form state
  const [newPotTitle, setNewPotTitle] = useState('');
  const [newPotDesc, setNewPotDesc] = useState('');
  const [newPotEvent, setNewPotEvent] = useState('');
  const [newPotPresets, setNewPotPresets] = useState('2, 5, 10, 20');
  const [posterPot, setPosterPot] = useState<FundraisingPot | null>(null);

  const loadData = async () => {
    if (!user?.uid || !communityId || !canOperateTill) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getCommunityPosOverviewAction({ communityId, uid: user.uid });
    if (res.success) {
      setCommunityName(res.communityName || 'Community Hub');
      setStripeConnected(Boolean(res.stripeConnected));
      setPots(res.pots || []);
      setCatalog(res.catalog || []);
    } else {
      toast({
        variant: 'destructive',
        title: 'Could not load Event Till',
        description: res.error || 'Unknown error',
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isUserLoading && !profileLoading) {
      loadData();
    }
  }, [isUserLoading, profileLoading, user?.uid, communityId, canOperateTill]);

  // Poll payment status while QR modal is open & pending
  useEffect(() => {
    if (!activeQrPayment || activeQrPayment.status !== 'pending' || !communityId) return;
    const interval = setInterval(async () => {
      const res = await getPosPaymentRequestStatusAction({
        communityId,
        requestId: activeQrPayment.requestId,
      });
      if (res.success && res.status === 'paid') {
        setActiveQrPayment((prev) =>
          prev ? { ...prev, status: 'paid', receiptNumber: res.receiptNumber } : null
        );
        toast({
          title: 'Payment Received!',
          description: `Receipt ${res.receiptNumber || ''} logged to audit ledger.`,
        });
        setBasket([]);
        setCustomPounds('');
        loadData();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [activeQrPayment?.requestId, activeQrPayment?.status, communityId]);

  const customPence = useMemo(() => {
    const parsed = parseFloat(customPounds);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
  }, [customPounds]);

  const basketTotalPence = useMemo(() => {
    const itemsSum = basket.reduce((sum, item) => sum + item.unitPricePence * item.qty, 0);
    return itemsSum + customPence;
  }, [basket, customPence]);

  const addCatalogItemToBasket = (item: PosCatalogItem) => {
    setBasket((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { id: item.id, name: item.name, qty: 1, unitPricePence: item.pricePence }];
    });
  };

  const adjustItemQty = (index: number, delta: number) => {
    setBasket((prev) =>
      prev
        .map((item, idx) => (idx === index ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const handleStartQrPayment = async () => {
    if (!user?.uid || !communityId) return;
    if (basketTotalPence < 50) {
      toast({
        variant: 'destructive',
        title: 'Minimum £0.50 for Card/QR',
        description: 'Use Record Cash Sale for amounts under 50p.',
      });
      return;
    }

    setProcessingAction(true);
    const res = await createPosQrCheckoutAction({
      communityId,
      uid: user.uid,
      items: basket,
      customAmountPence: customPence,
      potId: selectedPotId !== 'none' ? selectedPotId : null,
      eventName: eventName.trim() || null,
    });
    setProcessingAction(false);

    if (res.success && res.requestId && res.publicPayUrl && res.checkoutUrl) {
      setActiveQrPayment({
        requestId: res.requestId,
        amountPence: res.amountPence || basketTotalPence,
        publicPayUrl: res.publicPayUrl,
        checkoutUrl: res.checkoutUrl,
        status: 'pending',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Could not start QR checkout',
        description: res.error || 'Please check your Stripe setup.',
      });
    }
  };

  const handleRecordCashSale = async () => {
    if (!user?.uid || !communityId) return;
    if (basketTotalPence <= 0) return;

    setProcessingAction(true);
    const res = await recordCashPosSaleAction({
      communityId,
      uid: user.uid,
      items: basket,
      customAmountPence: customPence,
      potId: selectedPotId !== 'none' ? selectedPotId : null,
      eventName: eventName.trim() || null,
      note: cashNote.trim() || null,
    });
    setProcessingAction(false);

    if (res.success) {
      toast({
        title: `Cash Recorded (${formatGbp(res.amountPence || basketTotalPence)})`,
        description: `Audit Receipt: ${res.receiptNumber}`,
      });
      setBasket([]);
      setCustomPounds('');
      setCashNote('');
      loadData();
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to record cash sale',
        description: res.error,
      });
    }
  };

  const handleAddCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !communityId) return;
    const pricePence = Math.round(parseFloat(newItemPrice) * 100);
    const res = await createPosCatalogItemAction({
      communityId,
      uid: user.uid,
      name: newItemName,
      pricePence,
      category: newItemCategory,
    });
    if (res.success) {
      toast({ title: 'Stall item added' });
      setNewItemName('');
      setNewItemPrice('');
      loadData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
    }
  };

  const handleCreatePot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !communityId) return;
    const presetAmounts = newPotPresets
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= 1);

    const res = await createFundraisingPotAction({
      communityId,
      uid: user.uid,
      title: newPotTitle,
      description: newPotDesc,
      eventName: newPotEvent,
      presetAmounts: presetAmounts.length > 0 ? presetAmounts : [2, 5, 10, 20],
    });
    if (res.success) {
      toast({ title: 'Fundraising QR Pot created!' });
      setNewPotTitle('');
      setNewPotDesc('');
      setNewPotEvent('');
      loadData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
    }
  };

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://my-community-hub.co.uk';

  if (isUserLoading || profileLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canOperateTill) {
    return (
      <div className="container mx-auto max-w-2xl py-12 px-4">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Permission Required: Operate Event Till
            </CardTitle>
            <CardDescription>
              Ask your Community President or Administrator to enable{' '}
              <strong>&ldquo;Till Operator: Operate Mobile Event Till &amp; Fundraising QR Pots&rdquo;</strong>{' '}
              for your account in Community Settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <QrCode className="h-7 w-7 text-primary" />
            Event Till &amp; Fundraising QR Pots
          </h1>
          <p className="text-sm text-muted-foreground">
            {communityName} &bull; Mobile popup-tent POS &amp; printable donation QR codes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          {canOverseeAudit && (
            <Button variant="secondary" size="sm" asChild>
              <Link href="/leader/pos-audit">
                <Receipt className="mr-1.5 h-4 w-4" />
                POS Audit Ledger
              </Link>
            </Button>
          )}
        </div>
      </div>

      {!stripeConnected && (
        <Card className="border-amber-300 bg-amber-50/70">
          <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-amber-900 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <span>
                <strong>Stripe Bank Account Not Linked Yet:</strong> Cash sales can still be logged,
                but Card / QR payments require the community&apos;s Stripe Connect setup in{' '}
                <strong>Leader &gt; Financials</strong>.
              </span>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/leader/financials">Go to Financials</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="till" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="till">Mobile Event Till</TabsTrigger>
          <TabsTrigger value="pots">Fundraising QR Pots ({pots.length})</TabsTrigger>
          <TabsTrigger value="catalog">Stall Items ({catalog.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: MOBILE EVENT TILL */}
        <TabsContent value="till" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Stall Items + Custom Amount */}
            <div className="lg:col-span-7 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Event / Fundraiser Link (Optional)</CardTitle>
                  <CardDescription>
                    Tag sales to a specific pot or popup event for clean auditing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Fundraising Pot</Label>
                    <Select value={selectedPotId} onValueChange={setSelectedPotId}>
                      <SelectTrigger>
                        <SelectValue placeholder="General Community Till" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">General Community Till</SelectItem>
                        {pots
                          .filter((p) => p.active !== false)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Event / Stall Name</Label>
                    <Input
                      placeholder="e.g. Saturday Market Gazebo"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    Quick-Tap Stall Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {catalog.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No preset stall items yet. Add items in the <strong>Stall Items</strong> tab
                      (e.g. Cupcake £1.50, Tea £2.00) or enter a custom amount below.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {catalog.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addCatalogItemToBasket(item)}
                          className="flex flex-col items-start justify-between rounded-xl border bg-card p-3 text-left transition hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                        >
                          <span className="text-xs text-muted-foreground">{item.category}</span>
                          <span className="font-semibold text-sm line-clamp-2 mt-0.5">
                            {item.name}
                          </span>
                          <span className="mt-2 font-bold text-primary">
                            {formatGbp(item.pricePence)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t grid gap-3 sm:grid-cols-2 items-end">
                    <div>
                      <Label htmlFor="tillCustom">Custom Amount (£)</Label>
                      <Input
                        id="tillCustom"
                        type="number"
                        min="0"
                        step="0.10"
                        placeholder="0.00"
                        value={customPounds}
                        onChange={(e) => setCustomPounds(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 5, 10].map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setCustomPounds((prev) =>
                              ((parseFloat(prev) || 0) + amt).toFixed(2)
                            )
                          }
                        >
                          +£{amt}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Current Basket & Checkout */}
            <div className="lg:col-span-5">
              <Card className="sticky top-20 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span>Current Till Basket</span>
                    {(basket.length > 0 || customPence > 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBasket([]);
                          setCustomPounds('');
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {basket.length === 0 && customPence === 0 ? (
                    <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                      Tap stall items or enter a custom amount to start a sale.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {basket.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatGbp(item.unitPricePence)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => adjustItemQty(idx, -1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-6 text-center font-semibold">{item.qty}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => adjustItemQty(idx, 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {customPence > 0 && (
                        <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5 text-sm">
                          <span>Custom Amount</span>
                          <span className="font-semibold">{formatGbp(customPence)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t pt-3 flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-2xl text-primary">{formatGbp(basketTotalPence)}</span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <Button
                      type="button"
                      className="w-full h-12 text-base font-semibold"
                      disabled={processingAction || basketTotalPence < 50 || !stripeConnected}
                      onClick={handleStartQrPayment}
                    >
                      {processingAction ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-5 w-5" />
                      )}
                      Take QR / Card Payment
                    </Button>

                    <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                      <Label htmlFor="cashNote" className="text-xs text-muted-foreground">
                        Optional Cash Note (for audit log)
                      </Label>
                      <Input
                        id="cashNote"
                        placeholder="e.g. Cash in tin - Bake stall"
                        value={cashNote}
                        onChange={(e) => setCashNote(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 font-semibold"
                        disabled={processingAction || basketTotalPence <= 0}
                        onClick={handleRecordCashSale}
                      >
                        <Banknote className="mr-2 h-4 w-4 text-emerald-600" />
                        Record Cash Sale ({formatGbp(basketTotalPence)})
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: FUNDRAISING QR POTS */}
        <TabsContent value="pots" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-5 h-fit">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  Create Fundraising QR Pot
                </CardTitle>
                <CardDescription>
                  Generate a scannable QR poster for gazebos, buckets, or flyers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePot} className="space-y-3">
                  <div>
                    <Label htmlFor="potTitle">Fundraiser / Pot Title</Label>
                    <Input
                      id="potTitle"
                      required
                      placeholder="e.g. Village Hall Roof Appeal"
                      value={newPotTitle}
                      onChange={(e) => setNewPotTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="potEvent">Event Name (optional)</Label>
                    <Input
                      id="potEvent"
                      placeholder="e.g. Summer Fete 2026"
                      value={newPotEvent}
                      onChange={(e) => setNewPotEvent(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="potPresets">Quick Amount Buttons (£, comma-separated)</Label>
                    <Input
                      id="potPresets"
                      value={newPotPresets}
                      onChange={(e) => setNewPotPresets(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="potDesc">Short Description</Label>
                    <Textarea
                      id="potDesc"
                      rows={2}
                      placeholder="Every pound goes straight to our community project."
                      value={newPotDesc}
                      onChange={(e) => setNewPotDesc(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create QR Pot
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="lg:col-span-7 space-y-3">
              {pots.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No fundraising QR pots created yet.
                  </CardContent>
                </Card>
              ) : (
                pots.map((pot) => (
                  <Card key={pot.id}>
                    <CardContent className="pt-5 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base truncate">{pot.title}</h3>
                          <Badge variant={pot.active !== false ? 'default' : 'secondary'}>
                            {pot.active !== false ? 'Active' : 'Closed'}
                          </Badge>
                        </div>
                        {pot.eventName && (
                          <p className="text-xs text-muted-foreground">{pot.eventName}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs pt-1">
                          <span className="font-semibold text-emerald-700">
                            Raised: {formatGbp(pot.totalRaisedPence || 0)}
                          </span>
                          <span className="text-muted-foreground">
                            Card/QR: {formatGbp(pot.totalCardPence || 0)}
                          </span>
                          <span className="text-muted-foreground">
                            Cash: {formatGbp(pot.totalCashPence || 0)}
                          </span>
                          <span className="text-muted-foreground">
                            {pot.txCount || 0} payments
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={pot.active !== false}
                          onCheckedChange={async (checked) => {
                            if (!user?.uid) return;
                            await toggleFundraisingPotAction({
                              communityId,
                              uid: user.uid,
                              potId: pot.id,
                              active: checked,
                            });
                            loadData();
                          }}
                        />
                        <Button size="sm" variant="outline" onClick={() => setPosterPot(pot)}>
                          <QrCode className="mr-1.5 h-4 w-4" />
                          QR Poster
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: STALL ITEMS CATALOG */}
        <TabsContent value="catalog" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-5 h-fit">
              <CardHeader>
                <CardTitle className="text-base">Add Quick-Tap Stall Item</CardTitle>
                <CardDescription>
                  Create buttons for common bake-sale, drinks, raffle, or merch items.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCatalogItem} className="space-y-3">
                  <div>
                    <Label htmlFor="itemName">Item Name</Label>
                    <Input
                      id="itemName"
                      required
                      placeholder="e.g. Homemade Brownie"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="itemPrice">Price (£)</Label>
                    <Input
                      id="itemPrice"
                      type="number"
                      min="0.10"
                      step="0.10"
                      required
                      placeholder="1.50"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="itemCat">Category</Label>
                    <Input
                      id="itemCat"
                      placeholder="Baking & Food"
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Item
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="lg:col-span-7 space-y-2.5">
              {catalog.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No stall items configured yet.
                  </CardContent>
                </Card>
              ) : (
                catalog.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="py-3.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.category} &bull; {formatGbp(item.pricePence)}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={async () => {
                          if (!user?.uid) return;
                          await deletePosCatalogItemAction({
                            communityId,
                            uid: user.uid,
                            itemId: item.id,
                          });
                          loadData();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* LIVE QR PAYMENT MODAL */}
      <Dialog
        open={Boolean(activeQrPayment)}
        onOpenChange={(open) => {
          if (!open) setActiveQrPayment(null);
        }}
      >
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>
              {activeQrPayment?.status === 'paid'
                ? 'Payment Confirmed!'
                : `Customer Scan to Pay ${formatGbp(activeQrPayment?.amountPence || 0)}`}
            </DialogTitle>
            <DialogDescription>
              {activeQrPayment?.status === 'paid'
                ? 'Transaction recorded in the community audit ledger.'
                : 'Customer scans with their phone camera to pay via Apple Pay, Google Pay, or Card.'}
            </DialogDescription>
          </DialogHeader>

          {activeQrPayment?.status === 'paid' ? (
            <div className="py-6 space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <p className="text-xl font-bold text-emerald-800">
                {formatGbp(activeQrPayment.amountPence)} PAID
              </p>
              {activeQrPayment.receiptNumber && (
                <p className="font-mono text-xs text-muted-foreground">
                  Receipt: {activeQrPayment.receiptNumber}
                </p>
              )}
              <Button className="w-full" onClick={() => setActiveQrPayment(null)}>
                Next Customer
              </Button>
            </div>
          ) : activeQrPayment ? (
            <div className="py-3 space-y-4">
              <QrCodeCanvas value={activeQrPayment.publicPayUrl} size={230} />
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Waiting for customer confirmation...
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={activeQrPayment.checkoutUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open Checkout on This Device
                </a>
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* FUNDRAISING POT QR POSTER MODAL */}
      <Dialog
        open={Boolean(posterPot)}
        onOpenChange={(open) => {
          if (!open) setPosterPot(null);
        }}
      >
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle>{posterPot?.title}</DialogTitle>
            <DialogDescription>
              {posterPot?.eventName || communityName} &bull; Printable Fundraising QR
            </DialogDescription>
          </DialogHeader>
          {posterPot && (
            <div className="py-2">
              <QrCodeCanvas
                value={`${baseUrl}/donate/${communityId}?pot=${posterPot.id}`}
                size={240}
                title={posterPot.title}
                subtitle={posterPot.description || `Support ${communityName}`}
                showActions
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
