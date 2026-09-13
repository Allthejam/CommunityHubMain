'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { XCircle, CheckCircle2, ArrowRight, ShieldCheck, Scale, Sparkles } from 'lucide-react';

const COMPARISON_POINTS = [
  {
    category: 'Civic Communication & Reach',
    legacy: 'Disjointed Facebook groups & noticeboards where social media algorithms bury important town notices and commercial ads dominate discussions.',
    communityHub: 'Dedicated parish mobile app and unified web portal. Chronologically sorted, 100% town-focused, with instant emergency push & SMS broadcast sirens.',
  },
  {
    category: 'High Street Economy & Delivery',
    legacy: 'Independent butchers, bakeries, and high street shops lose business to online tech giants, with no shared local online catalog or delivery system.',
    communityHub: 'Unified Virtual High Street with digital storefronts, click & collect, gift vouchers, and an appointed local courier fleet for rapid doorstep delivery.',
  },
  {
    category: 'Emergency Preparedness & Resilience',
    legacy: 'A dusty 50-page PDF or paper emergency binder sitting in a council cabinet, impossible to coordinate in real time when floods or power cuts strike.',
    communityHub: 'Statutory ISO 22301-aligned live emergency console with interactive sandbag/shelter muster hubs, vulnerable resident checks, and 1-Click Auditor Grab-Bags.',
  },
  {
    category: 'Public Purse & Council Budget',
    legacy: 'Council budgets drained by web developer maintenance fees, software subscription licenses, and expensive printed newsletter distribution.',
    communityHub: '£0 Upfront Cost to the Council. Self-funds through local commercial participation and returns 40% to 75%+ (£1,500–£20,000+/yr) to your treasury.',
  },
  {
    category: 'Democratic Consensus & Polling',
    legacy: 'Unverified social media arguments with zero safeguards against non-resident trolls or repeated voting on local planning matters.',
    communityHub: 'Verified resident-only community petitions and structured advisory/binding democratic polls with clear voter verification and audit records.',
  },
  {
    category: 'Charity & Community Group Support',
    legacy: 'Local sports teams, food banks, and heritage trusts lose 5%–15% of donor contributions in third-party platform processing cuts.',
    communityHub: 'Dedicated community charity hub providing 100% commission-free donations directly to verified local non-profit groups.',
  },
];

export function CivicComparisonTable() {
  return (
    <Card className="border-2 border-border/80 shadow-lg overflow-hidden bg-card">
      <CardHeader className="p-6 pb-4 bg-muted/30 border-b">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs font-bold gap-1 text-primary border-primary/30">
            <Scale className="h-3.5 w-3.5" />
            Direct Civic Comparison
          </Badge>
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-extrabold font-headline">
          Traditional Town Struggles vs. The Community Hub Model
        </CardTitle>
        <CardDescription className="text-sm">
          Why forward-thinking UK Community Councils, Parishes, and Business Chambers are modernizing with Community Hub.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y">
          {/* Table Header (Desktop) */}
          <div className="hidden md:grid md:grid-cols-12 bg-muted/60 text-xs font-extrabold uppercase tracking-wider text-muted-foreground p-4">
            <div className="md:col-span-3">Civic Area</div>
            <div className="md:col-span-4 text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Traditional Town Situation
            </div>
            <div className="md:col-span-5 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pl-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              With Community Hub Platform
            </div>
          </div>

          {/* Comparison Rows */}
          {COMPARISON_POINTS.map((item, index) => (
            <div
              key={item.category}
              className={`grid grid-cols-1 md:grid-cols-12 p-4 sm:p-5 gap-3 md:gap-4 transition-colors hover:bg-muted/20 ${
                index % 2 === 1 ? 'bg-muted/5' : 'bg-transparent'
              }`}
            >
              {/* Category */}
              <div className="md:col-span-3 flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0 md:hidden" />
                <span className="font-extrabold text-sm text-foreground font-headline">
                  {item.category}
                </span>
              </div>

              {/* Legacy / Before */}
              <div className="md:col-span-4 p-3 rounded-xl bg-red-500/5 border border-red-500/15 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{item.legacy}</span>
              </div>

              {/* Community Hub / After */}
              <div className="md:col-span-5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-foreground font-medium leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item.communityHub}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
