'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Coins,
  Truck,
  Building2,
  Store,
  Sparkles,
  TrendingUp,
  Award,
  Info,
  Calendar,
  CheckCircle2,
  Layers,
  HelpCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface CommunityRevenueCalculatorProps {
  initialDirectoryCount?: number;
  initialStorefrontCount?: number;
  communityName?: string;
  className?: string;
}

export function CommunityRevenueCalculator({
  initialDirectoryCount = 25,
  initialStorefrontCount = 8,
  communityName,
  className = '',
}: CommunityRevenueCalculatorProps) {
  const [directoryCount, setDirectoryCount] = useState<number>(initialDirectoryCount);
  const [storefrontCount, setStorefrontCount] = useState<number>(initialStorefrontCount);
  const [isAnnual, setIsAnnual] = useState<boolean>(true);
  const [isDiscretionaryMode, setIsDiscretionaryMode] = useState<boolean>(false);
  const [discretionaryRate, setDiscretionaryRate] = useState<number>(85); // 75, 85, or 90

  // Constrain storefronts if directory count drops below storefront count
  const effectiveStorefrontCount = Math.min(storefrontCount, directoryCount);

  // Pricing constants
  const DIRECTORY_PRICE = 20; // £20 / month
  const STOREFRONT_PRICE = 10; // £10 / month

  // Directory split calculations
  const directorySplitPercent = useMemo(() => {
    if (isDiscretionaryMode) {
      return discretionaryRate;
    }
    return directoryCount > 50 ? 60 : 40;
  }, [isDiscretionaryMode, discretionaryRate, directoryCount]);

  const directoryCommunityAmountPerSub = (DIRECTORY_PRICE * directorySplitPercent) / 100;
  const directoryPlatformAmountPerSub = DIRECTORY_PRICE - directoryCommunityAmountPerSub;

  const monthlyDirectoryToCommunity = directoryCount * directoryCommunityAmountPerSub;
  const monthlyDirectoryToPlatform = directoryCount * directoryPlatformAmountPerSub;

  // Storefront split calculations (Fixed 50% Platform / 40% Courier / 10% Community)
  const monthlyStorefrontToCommunity = effectiveStorefrontCount * 1.0; // 10%
  const monthlyStorefrontToCourier = effectiveStorefrontCount * 4.0; // 40%
  const monthlyStorefrontToPlatform = effectiveStorefrontCount * 5.0; // 50%

  // Totals
  const monthlyTotalCommunity = monthlyDirectoryToCommunity + monthlyStorefrontToCommunity;
  const monthlyTotalCourier = monthlyStorefrontToCourier;
  const monthlyTotalPlatform = monthlyDirectoryToPlatform + monthlyStorefrontToPlatform;
  const monthlyTotalLocalEconomyRetained = monthlyTotalCommunity + monthlyTotalCourier;

  const multiplier = isAnnual ? 12 : 1;
  const displayCommunityFund = monthlyTotalCommunity * multiplier;
  const displayCourierFund = monthlyTotalCourier * multiplier;
  const displayLocalRetained = monthlyTotalLocalEconomyRetained * multiplier;
  const displayPlatformShare = monthlyTotalPlatform * multiplier;

  // Milestone achievements based on annual yield
  const annualTotal = monthlyTotalCommunity * 12;
  const milestone = useMemo(() => {
    if (annualTotal < 2000) {
      return {
        badge: 'Foundation Civic Fund',
        title: 'Floral Displays & Town Noticeboards',
        description: 'Funds seasonal village planters, hanging baskets, and maintenance for public civic noticeboards.',
        icon: Sparkles,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      };
    } else if (annualTotal < 5000) {
      return {
        badge: 'Civic Resilience & Festivities',
        title: 'Christmas Lights & Public Defibrillator',
        description: 'Covers the annual town Christmas lighting switch-on plus installation of a 24/7 Public Access Defibrillator (PAD).',
        icon: Zap,
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      };
    } else if (annualTotal < 12000) {
      return {
        badge: 'Emergency & Community Action',
        title: 'ISO Emergency Store & Senior Day Trips',
        description: 'Fully equips local sandbag & winter flood stores, subsidises senior citizen bus outings, and supports local youth clubs.',
        icon: ShieldCheck,
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      };
    } else if (annualTotal < 22000) {
      return {
        badge: 'Town Infrastructure Grant',
        title: 'Community Minibus & Village Hall Grants',
        description: 'Maintains a dedicated community transport vehicle, sponsors local sports clubs, and repairs community hall facilities.',
        icon: Building2,
        color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      };
    } else {
      return {
        badge: 'Premier Civic Endowment',
        title: 'Major Civic Projects & Town Warden',
        description: 'Provides capital reserves for major parish improvements, flagship heritage festivals, and dedicated local civic staff.',
        icon: Award,
        color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      };
    }
  }, [annualTotal]);

  const applyPreset = (dirs: number, stores: number) => {
    setDirectoryCount(dirs);
    setStorefrontCount(stores);
  };

  return (
    <Card className={`overflow-hidden border-2 border-primary/20 shadow-xl bg-card ${className}`}>
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className="bg-primary text-primary-foreground font-bold text-xs gap-1">
                <Coins className="h-3.5 w-3.5" />
                Community Revenue Engine
              </Badge>
              {isDiscretionaryMode ? (
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 text-xs font-semibold gap-1">
                  <Award className="h-3 w-3" />
                  Owner Discretionary Tier ({discretionaryRate}%)
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-semibold gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {directoryCount > 50 ? 'Tier 2: 60% Community Share' : 'Tier 1: 40% Community Share'}
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold font-headline">
              {communityName ? `${communityName} Income Calculator` : 'Community Treasury & Revenue Calculator'}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Estimate the exact recurring funding your Community Council generates from local business participation.
            </CardDescription>
          </div>

          {/* Monthly / Annual Toggle */}
          <div className="flex items-center bg-muted p-1 rounded-xl shrink-0 self-start sm:self-center border">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isAnnual
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly View
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isAnnual
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Annual View</span>
              <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-extrabold">
                12 Mo
              </span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* Quick Town Presets */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Quick Town Size Presets:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              type="button"
              variant={directoryCount === 12 && storefrontCount === 4 ? 'default' : 'outline'}
              size="sm"
              className="text-xs font-semibold justify-start h-9"
              onClick={() => applyPreset(12, 4)}
            >
              🏡 Rural Village (12)
            </Button>
            <Button
              type="button"
              variant={directoryCount === 35 && storefrontCount === 12 ? 'default' : 'outline'}
              size="sm"
              className="text-xs font-semibold justify-start h-9"
              onClick={() => applyPreset(35, 12)}
            >
              🏘️ Market Town (35)
            </Button>
            <Button
              type="button"
              variant={directoryCount === 75 && storefrontCount === 25 ? 'default' : 'outline'}
              size="sm"
              className="text-xs font-semibold justify-start h-9"
              onClick={() => applyPreset(75, 25)}
            >
              🏙️ Bustling Town (75)
            </Button>
            <Button
              type="button"
              variant={directoryCount === 130 && storefrontCount === 45 ? 'default' : 'outline'}
              size="sm"
              className="text-xs font-semibold justify-start h-9"
              onClick={() => applyPreset(130, 45)}
            >
              🌟 Regional Parish (130)
            </Button>
          </div>
        </div>

        {/* Sliders Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-muted/40 border">
          {/* Slider 1: Directory Listings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  Business Directory Listings
                </span>
                <p className="text-xs text-muted-foreground">Standard Town App & Web profile (£20/mo)</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-foreground">{directoryCount}</span>
                <span className="text-xs text-muted-foreground block font-medium">shops / trades</span>
              </div>
            </div>

            <Slider
              value={[directoryCount]}
              min={1}
              max={150}
              step={1}
              onValueChange={(val) => {
                setDirectoryCount(val[0]);
                if (storefrontCount > val[0]) {
                  setStorefrontCount(val[0]);
                }
              }}
              className="py-2"
            />

            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>1 Business</span>
              <span>50 (Tier 2 Jump)</span>
              <span>150+ Businesses</span>
            </div>

            <div className="bg-background/80 p-2.5 rounded-lg border text-xs flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Community Split for Listings:</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {directorySplitPercent}% = £{directoryCommunityAmountPerSub.toFixed(2)}/mo per shop
              </span>
            </div>
          </div>

          {/* Slider 2: Storefronts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Store className="h-4 w-4 text-emerald-500" />
                  Virtual High Street Storefronts
                </span>
                <p className="text-xs text-muted-foreground">Online ordering, catalogs & courier delivery (£10/mo)</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-foreground">{effectiveStorefrontCount}</span>
                <span className="text-xs text-muted-foreground block font-medium">retail stores</span>
              </div>
            </div>

            <Slider
              value={[effectiveStorefrontCount]}
              min={0}
              max={Math.min(50, directoryCount)}
              step={1}
              onValueChange={(val) => setStorefrontCount(val[0])}
              className="py-2"
            />

            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>0 Storefronts</span>
              <span>25 Retailers</span>
              <span>{Math.min(50, directoryCount)} Max</span>
            </div>

            <div className="bg-background/80 p-2.5 rounded-lg border text-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Council Oversight (10%):</span>
                <span className="font-bold text-foreground">£1.00 / mo per store</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Local Courier Pool (40%):</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">£4.00 / mo per store</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tier Mode Selector & Discretionary Grant Option */}
        <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-500" />
                Community Tier & Discretionary Rural Support Model:
              </span>
              <p className="text-xs text-muted-foreground">
                Standard automatic tiers are 40% (1–50) and 60% (51+). The Platform Owner can manually award small rural villages or model towns a 75%–90% grant.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant={!isDiscretionaryMode ? 'default' : 'outline'}
                size="sm"
                className="text-xs font-bold h-8"
                onClick={() => setIsDiscretionaryMode(false)}
              >
                Standard Tiers (40% / 60%)
              </Button>
              <Button
                type="button"
                variant={isDiscretionaryMode ? 'default' : 'outline'}
                size="sm"
                className="text-xs font-bold h-8 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                onClick={() => setIsDiscretionaryMode(true)}
              >
                Simulate Owner Grant (75%–90%)
              </Button>
            </div>
          </div>

          {isDiscretionaryMode && (
            <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground font-medium">
                Select Discretionary Grant Stake Rate:
              </span>
              <div className="flex items-center gap-1.5">
                {[75, 85, 90].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setDiscretionaryRate(rate)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      discretionaryRate === rate
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-background border text-foreground hover:bg-muted'
                    }`}
                  >
                    {rate}% Stake (£{((20 * rate) / 100).toFixed(2)}/mo)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Calculation Output Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Output 1: Community Treasury */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-card p-5 space-y-2 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Town Treasury Yield
              </span>
              <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                {isAnnual ? 'Per Year' : 'Per Month'}
              </Badge>
            </div>
            <div className="text-3xl sm:text-4xl font-black font-headline text-foreground tracking-tight">
              £{displayCommunityFund.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Direct discretionary civic funds to spend on town projects, lights, defibs, and local grants.
            </p>
          </div>

          {/* Output 2: Local Courier Logistics Pool */}
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="h-4 w-4" />
                Local Courier Pool
              </span>
              <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                {isAnnual ? 'Per Year' : 'Per Month'}
              </Badge>
            </div>
            <div className="text-3xl sm:text-4xl font-black font-headline text-foreground tracking-tight">
              £{displayCourierFund.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Dedicated delivery pool sustaining local green courier jobs and doorstep town logistics.
            </p>
          </div>

          {/* Output 3: Total Town Economic Impact */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 via-primary/5 to-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="h-4 w-4" />
                Total Retained in Town
              </span>
              <Badge variant="outline" className="border-primary/40 text-primary font-bold text-[10px]">
                Council + Courier
              </Badge>
            </div>
            <div className="text-3xl sm:text-4xl font-black font-headline text-foreground tracking-tight">
              £{displayLocalRetained.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Circulating directly within the local economy rather than siphoned away to Silicon Valley tech monopolies.
            </p>
          </div>
        </div>

        {/* Milestone Indicator ("What This Funds") */}
        <div className={`p-5 rounded-2xl border ${milestone.color} flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all duration-300`}>
          <div className="p-3 rounded-xl bg-background shadow-xs shrink-0">
            <milestone.icon className="h-7 w-7 text-foreground" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-background text-foreground border text-[11px] font-bold">
                {milestone.badge}
              </Badge>
              <span className="text-xs font-extrabold text-foreground">
                Unlocked with £{(monthlyTotalCommunity * 12).toLocaleString('en-GB', { maximumFractionDigits: 0 })}/year Treasury Yield
              </span>
            </div>
            <h4 className="text-base font-bold text-foreground font-headline">
              {milestone.title}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {milestone.description}
            </p>
          </div>
        </div>

        {/* Platform Transparency Breakdown */}
        <div className="p-4 rounded-xl bg-muted/30 border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong>Platform Operational Share (£{displayPlatformShare.toFixed(2)}{isAnnual ? '/yr' : '/mo'})</strong>: Covers AWS/Google Cloud hosting, Stripe payment rails, ISO 22301 compliance tooling, automated app maintenance, and SMS emergency broadcast servers with <strong>£0 upfront cost to the Council</strong>.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
