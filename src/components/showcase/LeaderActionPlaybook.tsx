'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Users,
  Store,
  Megaphone,
  TrendingUp,
  Coins,
  CheckCircle2,
  Share2,
  Printer,
  ShieldCheck,
  Building2,
  HeartHandshake,
  Crown,
  Compass,
} from 'lucide-react';

export function LeaderActionPlaybook() {
  return (
    <Card className="border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xl overflow-hidden">
      <CardHeader className="p-6 sm:p-8 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-b">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge className="bg-amber-600 text-white font-extrabold text-xs gap-1.5 shadow-xs">
            <HeartHandshake className="h-3.5 w-3.5" />
            The Civic Partnership
          </Badge>
          <span className="text-xs text-slate-950 dark:text-white font-black">
            Our Technology + Your Local Leadership = Real Town Revenue
          </span>
        </div>
        <CardTitle className="text-2xl sm:text-4xl font-black font-headline text-foreground tracking-tight">
          We Provide the Engine — You Drive the High Street
        </CardTitle>
        <CardDescription className="text-sm sm:text-base text-slate-950 dark:text-white font-medium mt-2 leading-relaxed max-w-4xl">
          Community Hub provides the entire cloud infrastructure, mobile apps, payment rails, emergency broadcast sirens, and marketing assets at <strong>£0 upfront cost to the Council</strong>. But software alone cannot knock on shop doors — a thriving digital town square requires <strong>active local leadership to invite and onboard high street businesses</strong>.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-8">
        {/* Core Reality Alert Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-black text-sm">
            <Coins className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Why Local Business Participation is the Key to Everything:</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-950 dark:text-white font-medium leading-relaxed">
            Without local businesses advertising and taking storefronts, there is no treasury revenue share for the Council, no delivery jobs for local couriers, and no online marketplace for residents. <strong>When you champion local shops, you directly fund your town's public projects.</strong>
          </p>
        </div>

        {/* 3-Step Action Playbook */}
        <div className="space-y-4">
          <div className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>The 3-Step Leader Action Playbook:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl bg-background border-2 border-border/80 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center text-sm">
                  1
                </div>
                <h4 className="text-base font-extrabold text-foreground font-headline">
                  Walk the High Street with Ready Packs
                </h4>
                <p className="text-xs text-slate-950 dark:text-white font-medium leading-relaxed">
                  Print our ready-made 1-Page Merchant Pitch Flyers. Show your butchers, bakers, cafés, and trades how £20/mo gives them an interactive mobile presence while funding community projects.
                </p>
              </div>
              <div className="pt-2 border-t text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ready-to-print flyers supplied
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl bg-background border-2 border-border/80 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-9 w-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center text-sm">
                  2
                </div>
                <h4 className="text-base font-extrabold text-foreground font-headline">
                  Appoint a Business Liaison Officer
                </h4>
                <p className="text-xs text-slate-950 dark:text-white font-medium leading-relaxed">
                  Use the Leader Console permission manager to delegate a proactive councillor or Chamber of Commerce champion as your dedicated High Street Liaison to guide new business onboarding.
                </p>
              </div>
              <div className="pt-2 border-t text-[11px] text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Built into Leader permissions
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl bg-background border-2 border-border/80 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 font-black flex items-center justify-center text-sm">
                  3
                </div>
                <h4 className="text-base font-extrabold text-foreground font-headline">
                  Feature & Celebrate Every Merchant
                </h4>
                <p className="text-xs text-slate-950 dark:text-white font-medium leading-relaxed">
                  Give new businesses VIP treatment. Broadcast a welcome spotlight on the Community Feed and encourage residents to order through the Virtual High Street to boost local trade.
                </p>
              </div>
              <div className="pt-2 border-t text-[11px] text-purple-700 dark:text-purple-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Instant Community Feed reach
              </div>
            </div>
          </div>
        </div>

        {/* Provided Toolkit & Collateral Section */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-muted/80 via-muted/50 to-background border-2 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Full Marketing Toolkit Provided Free in Your Leader Console</span>
            </div>
            <h4 className="text-lg font-black text-foreground font-headline">
              Ready-Made Advertising Artwork, Posters & Outreach Scripts
            </h4>
            <p className="text-xs text-slate-950 dark:text-white font-medium max-w-2xl leading-relaxed">
              We provide downloadable shop window window-stickers, QR code posters, merchant onboarding email templates, and high-impact social media graphics ready for immediate use.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Button asChild size="default" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-1.5 shadow-md w-full sm:w-auto h-10 px-5">
              <Link href="/demo/login?role=leader&redirect=/demo/leader/marketing">
                <Crown className="h-4 w-4" />
                <span>Launch Leader Toolkit (Demo)</span>
              </Link>
            </Button>
            <Button asChild size="default" variant="outline" className="font-bold text-xs gap-1.5 border-2 w-full sm:w-auto h-10 px-4 bg-card hover:bg-muted text-foreground">
              <Link href="/showcase?persona=leader#roles">
                <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Explore Leader Features</span>
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
