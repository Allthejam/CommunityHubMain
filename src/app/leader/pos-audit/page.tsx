'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Receipt,
  Download,
  RefreshCw,
  ShieldAlert,
  Loader2,
  CreditCard,
  Banknote,
  TrendingUp,
  Search,
  Users,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getPosAuditLedgerAction,
  type PosAuditEntry,
  type FundraisingPot,
} from '@/lib/actions/communityPosActions';

function formatGbp(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function LeaderPosAuditPage() {
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

  const canOverseeAudit = isSuperRole || permissions?.overseePosTracking === true;
  const canOperateTill = isSuperRole || permissions?.operateEventTill === true;

  const [loading, setLoading] = useState(true);
  const [communityName, setCommunityName] = useState('Community Hub');
  const [entries, setEntries] = useState<PosAuditEntry[]>([]);
  const [pots, setPots] = useState<FundraisingPot[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'stripe_qr_card' | 'cash'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'mobile_till' | 'qr_donation_pot'>('all');
  const [potFilter, setPotFilter] = useState<string>('all');

  const loadAudit = async () => {
    if (!user?.uid || !communityId || !canOverseeAudit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getPosAuditLedgerAction({ communityId, uid: user.uid });
    if (res.success) {
      setCommunityName(res.communityName || 'Community Hub');
      setEntries(res.entries || []);
      setPots(res.pots || []);
    } else {
      toast({
        variant: 'destructive',
        title: 'Could not load POS Audit Ledger',
        description: res.error,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isUserLoading && !profileLoading) {
      loadAudit();
    }
  }, [isUserLoading, profileLoading, user?.uid, communityId, canOverseeAudit]);

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return entries.filter((e) => {
      if (methodFilter !== 'all' && e.paymentMethod !== methodFilter) return false;
      if (sourceFilter !== 'all' && e.source !== sourceFilter) return false;
      if (potFilter !== 'all' && (e.potId || 'none') !== potFilter) return false;
      if (!q) return true;
      const haystack = [
        e.receiptNumber,
        e.operatorName,
        e.donorName,
        e.donorNote,
        e.potTitle,
        e.eventName,
        e.stripeTransferId,
        e.stripeSessionId,
        ...(e.items || []).map((i) => i.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, methodFilter, sourceFilter, potFilter, searchTerm]);

  const summary = useMemo(() => {
    let gross = 0;
    let cardGross = 0;
    let cashGross = 0;
    let fees = 0;
    let net = 0;

    const byOperator: Record<
      string,
      { name: string; cardPence: number; cashPence: number; count: number }
    > = {};

    for (const e of filteredEntries) {
      gross += e.grossAmountPence || 0;
      fees += e.estimatedFeePence || 0;
      net += e.netTransferPence || 0;
      if (e.paymentMethod === 'cash') {
        cashGross += e.grossAmountPence || 0;
      } else {
        cardGross += e.grossAmountPence || 0;
      }

      const opKey = e.operatorUid || 'public_qr';
      const opLabel = e.operatorName || (e.source === 'qr_donation_pot' ? 'Public QR Poster' : 'Unknown');
      if (!byOperator[opKey]) {
        byOperator[opKey] = { name: opLabel, cardPence: 0, cashPence: 0, count: 0 };
      }
      byOperator[opKey].count += 1;
      if (e.paymentMethod === 'cash') {
        byOperator[opKey].cashPence += e.grossAmountPence || 0;
      } else {
        byOperator[opKey].cardPence += e.grossAmountPence || 0;
      }
    }

    return {
      gross,
      cardGross,
      cashGross,
      fees,
      net,
      count: filteredEntries.length,
      operators: Object.values(byOperator).sort(
        (a, b) => b.cardPence + b.cashPence - (a.cardPence + a.cashPence)
      ),
    };
  }, [filteredEntries]);

  const handleExportCsv = () => {
    const headers = [
      'Receipt Number',
      'Date (UTC)',
      'Source',
      'Payment Method',
      'Operator',
      'Fundraiser Pot',
      'Event Name',
      'Items / Note',
      'Donor Name',
      'Gross (GBP)',
      'Est Stripe Fee (GBP)',
      'Net to Community (GBP)',
      'Transfer Status',
      'Stripe Transfer ID',
      'Stripe Session ID',
    ];

    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = filteredEntries.map((e) => {
      const itemsText = (e.items || [])
        .map((i) => `${i.qty}x ${i.name} (£${(i.unitPricePence / 100).toFixed(2)})`)
        .join('; ');
      const noteText = [itemsText, e.donorNote].filter(Boolean).join(' | ');
      return [
        e.receiptNumber,
        e.createdAt,
        e.source,
        e.paymentMethod,
        e.operatorName || 'Public QR',
        e.potTitle || 'General',
        e.eventName || '',
        noteText,
        e.donorName || '',
        (e.grossAmountPence / 100).toFixed(2),
        (e.estimatedFeePence / 100).toFixed(2),
        (e.netTransferPence / 100).toFixed(2),
        e.transferStatus,
        e.stripeTransferId || '',
        e.stripeSessionId || '',
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `community-pos-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isUserLoading || profileLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canOverseeAudit) {
    return (
      <div className="container mx-auto max-w-2xl py-12 px-4">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Permission Required: Oversee POS Tracking
            </CardTitle>
            <CardDescription>
              Ask your Community President or Administrator to enable{' '}
              <strong>
                &ldquo;Auditor / Treasurer: Oversee POS Tracking, Cash Reconciliation &amp; Audit Ledger&rdquo;
              </strong>{' '}
              for your account in Community Settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-6 px-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />
            POS Tracking &amp; Audit Ledger
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {communityName} &bull; Immutable, 100% transparent fundraising &amp; event till records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAudit}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filteredEntries.length === 0}>
            <Download className="mr-1.5 h-4 w-4" />
            Export Audit CSV
          </Button>
          {canOperateTill && (
            <Button size="sm" asChild>
              <Link href="/leader/event-till">
                <QrCode className="mr-1.5 h-4 w-4" />
                Open Event Till
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPI SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              Total Gross Raised
            </CardDescription>
            <CardTitle className="text-2xl">{formatGbp(summary.gross)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary.count} audited transaction{summary.count === 1 ? '' : 's'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-blue-600" />
              QR / Card (Stripe)
            </CardDescription>
            <CardTitle className="text-2xl">{formatGbp(summary.cardGross)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Est. Fees: {formatGbp(summary.fees)} &bull; Net: {formatGbp(summary.net - summary.cashGross)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Banknote className="h-4 w-4 text-emerald-600" />
              Cash Recorded (In Hand)
            </CardDescription>
            <CardTitle className="text-2xl">{formatGbp(summary.cashGross)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Logged by named till operators for cash tin reconciliation
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-violet-600" />
              Active Collectors / Pots
            </CardDescription>
            <CardTitle className="text-2xl">
              {summary.operators.length} / {pots.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Operators &amp; QR pots in current view
          </CardContent>
        </Card>
      </div>

      {/* OPERATOR RECONCILIATION BREAKDOWN */}
      {summary.operators.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Operator &amp; QR Pot Reconciliation</CardTitle>
            <CardDescription>
              Use this breakdown to reconcile cash tins against each volunteer&apos;s recorded sales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.operators.map((op, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="truncate">{op.name}</span>
                    <Badge variant="outline">{op.count} tx</Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>QR / Card: {formatGbp(op.cardPence)}</span>
                    <span className="font-medium text-emerald-700">
                      Cash Tin: {formatGbp(op.cashPence)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FILTERS & TABLE */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search receipt #, operator, donor, item, Stripe ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={methodFilter} onValueChange={(v: any) => setMethodFilter(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="stripe_qr_card">QR / Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={(v: any) => setSourceFilter(v)}>
                <SelectTrigger className="w-[165px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="mobile_till">Mobile Till</SelectItem>
                  <SelectItem value="qr_donation_pot">QR Donation Pot</SelectItem>
                </SelectContent>
              </Select>

              <Select value={potFilter} onValueChange={setPotFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Pots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pots</SelectItem>
                  <SelectItem value="none">General Community Till</SelectItem>
                  {pots.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt &amp; Time</TableHead>
                  <TableHead>Operator / Donor</TableHead>
                  <TableHead>Method &amp; Source</TableHead>
                  <TableHead>Pot / Event / Items</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Audit / Stripe Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No POS or fundraising transactions match your filters yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold">{e.receiptNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.createdAt ? format(new Date(e.createdAt), 'dd MMM yyyy HH:mm') : '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">
                          {e.operatorName || 'Public QR Scan'}
                        </div>
                        {e.donorName && (
                          <div className="text-muted-foreground">Donor: {e.donorName}</div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant={e.paymentMethod === 'cash' ? 'secondary' : 'default'}
                          className="mr-1"
                        >
                          {e.paymentMethod === 'cash' ? 'Cash' : 'QR / Card'}
                        </Badge>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {e.source === 'mobile_till' ? 'Mobile Till' : 'Donation QR Pot'}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px] text-xs">
                        <div className="font-medium truncate">
                          {e.potTitle || e.eventName || 'General Community Till'}
                        </div>
                        {e.items?.length > 0 && (
                          <div className="text-muted-foreground truncate">
                            {e.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                          </div>
                        )}
                        {e.donorNote && (
                          <div className="italic text-muted-foreground truncate">
                            &ldquo;{e.donorNote}&rdquo;
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatGbp(e.grossAmountPence)}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">
                        <div>{formatGbp(e.netTransferPence)}</div>
                        {e.estimatedFeePence > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            -{formatGbp(e.estimatedFeePence)} fee
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant={
                            e.transferStatus === 'transferred' || e.transferStatus === 'cash_in_hand'
                              ? 'outline'
                              : 'destructive'
                          }
                        >
                          {e.transferStatus}
                        </Badge>
                        {e.stripeTransferId && (
                          <div className="font-mono text-[10px] text-muted-foreground mt-1">
                            {e.stripeTransferId}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
