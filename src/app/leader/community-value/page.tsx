'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Crown,
  Coins,
  FileDown,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Award,
  Users,
  Store,
  Truck,
  Printer,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommunityRevenueCalculator } from '@/components/showcase/CommunityRevenueCalculator';
import { CivicComparisonTable } from '@/components/showcase/CivicComparisonTable';
import { LeaderPillarsGrid } from '@/components/showcase/LeaderPillarsGrid';
import { CouncilProposalDownload } from '@/components/showcase/CouncilProposalDownload';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { triggerCouncilProposalPdf } from '@/lib/council-proposal-generator';

export default function LeaderCommunityValuePage() {
  const { user } = useUser();
  const db = useFirestore();

  const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
  const demoPrefix = isDemo ? '/demo' : '';

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const impersonating = userProfile?.impersonating;
  const communityId = isDemo
    ? '9ayHMyZf4SRw2gof1AM9'
    : (impersonating?.communityId || (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || 'N3SarfGXPLxBI7XcsinX');

  const communityRef = useMemoFirebase(() => (communityId && db ? doc(db, 'communities', communityId) : null), [communityId, db]);
  const { data: communityData } = useDoc<any>(communityRef);

  const communityName = impersonating?.communityName || communityData?.name || userProfile?.primaryHomeCommunityName || userProfile?.homeCommunityName || userProfile?.communityName || 'Your Community';

  // Count active businesses in this community
  const businessesQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(collection(db, 'businesses'), where('communityId', '==', communityId));
  }, [communityId, db]);
  const { data: businesses } = useCollection(businessesQuery);

  const activeBusinessCount = businesses?.length || 24;

  const handle1ClickCouncilPack = () => {
    triggerCouncilProposalPdf({
      townshipName: communityName,
      directoryCount: activeBusinessCount,
      storefrontCount: Math.round(activeBusinessCount * 0.4),
      meetingDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    });
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500/15 via-primary/10 to-card border-2 border-emerald-500/30 p-6 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1.5 shadow-xs">
                <Coins className="h-3.5 w-3.5" />
                Council Treasury & Community Value
              </Badge>
              <Badge variant="outline" className="bg-background/80 text-foreground border-border text-xs font-semibold">
                🏛️ {communityName}
              </Badge>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {activeBusinessCount} Registered High Street Merchants
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-headline text-foreground">
              Council Revenue Share & Community Value Overview
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Understand the full civic breakdown, local courier logistics fund, and forecast your Council Treasury income as local businesses join <strong className="text-foreground">{communityName}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <Button
              type="button"
              size="lg"
              onClick={handle1ClickCouncilPack}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md gap-2 h-11 px-5"
            >
              <FileDown className="h-4 w-4" />
              <span>1-Click Council Brief (PDF)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Dual Slider Revenue Calculator pre-populated for this community */}
      <section className="space-y-4">
        <CommunityRevenueCalculator
          communityName={communityName}
          initialDirectoryCount={Math.max(activeBusinessCount, 15)}
          initialStorefrontCount={Math.round(Math.max(activeBusinessCount, 15) * 0.35)}
        />
      </section>

      {/* Download Custom Council Meeting Pack */}
      <section className="space-y-4">
        <CouncilProposalDownload
          defaultTownName={communityName}
          defaultDirectoryCount={Math.max(activeBusinessCount, 25)}
          defaultStorefrontCount={Math.round(Math.max(activeBusinessCount, 25) * 0.4)}
        />
      </section>

      {/* The 6 Core Pillars */}
      <section className="space-y-4 pt-4">
        <LeaderPillarsGrid />
      </section>

      {/* Civic Comparison Table */}
      <section className="space-y-4 pt-4">
        <CivicComparisonTable />
      </section>
    </div>
  );
}
