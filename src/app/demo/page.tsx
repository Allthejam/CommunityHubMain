'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Users,
  Store,
  ShieldAlert,
  Megaphone,
  Trees,
  Database,
  RefreshCw,
  UserPlus,
  Crown,
  ArrowRight,
  ArrowLeft,
  Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getSandboxStatusAction, seedShowHomeToComfeedAction, SandboxStatus } from '@/lib/actions/sandboxActions';

export default function DemoGatewayPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [status, setStatus] = useState<SandboxStatus | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    const res = await getSandboxStatusAction();
    setStatus(res);
  }

  async function handleReseed() {
    setIsSeeding(true);
    try {
      const res = await seedShowHomeToComfeedAction();
      if (res.success) {
        toast({
          title: 'Demo Database Synchronized! 🚀',
          description: res.message || 'Show Home baseline data copied to comfeed sandbox.',
        });
        await loadStatus();
      } else {
        toast({ title: 'Sync Failed', description: res.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsSeeding(false);
    }
  }

  const handleSelectPersona = (personaKey: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('visitedCommunityId', '9ayHMyZf4SRw2gof1AM9');
      sessionStorage.setItem('sandboxPersona', personaKey);
      sessionStorage.setItem('isDemoMode', 'true');
    }

    toast({
      title: `Entering Demo as ${personaKey.toUpperCase()}`,
      description: 'Viewing Demo Showcase Community on comfeed DB.',
    });

    if (personaKey === 'leader') {
      router.push('/demo/home');
    } else if (personaKey === 'business') {
      router.push('/demo/home');
    } else if (personaKey === 'advertiser') {
      router.push('/demo/national/dashboard');
    } else if (personaKey === 'regional') {
      router.push('/demo/regional/dashboard');
    } else {
      router.push('/demo/home');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
      {/* BACKGROUND GLOW */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl space-y-8 z-10 my-auto">
        {/* TOP NAVIGATION BAR: BACK TO SHOWCASE */}
        <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-800/80">
          <Link href="/showcase">
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-900 border-sky-400/50 text-sky-300 hover:text-white hover:bg-sky-950/80 font-bold text-xs h-9 px-4 gap-2 shadow-md"
            >
              <ArrowLeft className="h-4 w-4 text-sky-400" /> Back to Product Showcase
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
              <Radio className="h-4 w-4 text-emerald-400" />
              <span className="font-bold text-slate-300 hidden sm:inline">CommunityHub</span>
            </Link>
          </div>
        </div>

        {/* HEADER SECTION */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            100% Isolated Demo Sandbox
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-headline">
            Experience the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Showcase Community</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Select a persona below to explore live features, test interactive dashboards, create mock businesses, and broadcast emergency alerts in a risk-free playground.
          </p>
        </div>

        {/* 6 PERSONA SELECTION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Persona 1: Leader */}
          <Card className="bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 transition-all shadow-xl flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                  Leadership Tier (40% Rev Share)
                </Badge>
                <Crown className="h-5 w-5 text-emerald-400" />
              </div>
              <CardTitle className="text-base font-bold text-white pt-2">
                🏛️ Community Council Leader
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Full leader powers: edit emergency plans, manage civic consultations, review revenue share, and moderate boards.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button
                onClick={() => handleSelectPersona('leader')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-9 gap-1.5 shadow"
              >
                Enter as Community Leader →
              </Button>
            </CardContent>
          </Card>

          {/* Persona 2: Business */}
          <Card className="bg-slate-900/90 border-slate-800 hover:border-amber-500/50 transition-all shadow-xl flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                  High Street Commerce
                </Badge>
                <Store className="h-5 w-5 text-amber-400" />
              </div>
              <CardTitle className="text-base font-bold text-white pt-2">
                🛍️ High Street Merchant
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Manage storefronts, product catalogs, customer reviews, promotions, and member discount programs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button
                onClick={() => handleSelectPersona('business')}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold h-9 gap-1.5 shadow"
              >
                Enter as High Street Merchant →
              </Button>
            </CardContent>
          </Card>

          {/* Persona 3: Resident */}
          <Card className="bg-slate-900/90 border-slate-800 hover:border-sky-500/50 transition-all shadow-xl flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px]">
                  Local Citizen
                </Badge>
                <Users className="h-5 w-5 text-sky-400" />
              </div>
              <CardTitle className="text-base font-bold text-white pt-2">
                🏡 Local Resident
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Vote in community consultations, browse High Street shops, join volunteer hubs, and follow emergency alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button
                onClick={() => handleSelectPersona('resident')}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold h-9 gap-1.5 shadow"
              >
                Enter as Local Resident →
              </Button>
            </CardContent>
          </Card>

          {/* Persona 4: Reporter */}
          <Card className="bg-slate-900/90 border-slate-800 hover:border-purple-500/50 transition-all shadow-xl flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px]">
                  Civic Journalism
                </Badge>
                <Megaphone className="h-5 w-5 text-purple-400" />
              </div>
              <CardTitle className="text-base font-bold text-white pt-2">
                📰 Community Reporter
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Publish local news articles, council meeting minutes, event announcements, and regional bulletins.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button
                onClick={() => handleSelectPersona('reporter')}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold h-9 gap-1.5 shadow"
              >
                Enter as Community Reporter →
              </Button>
            </CardContent>
          </Card>

          {/* Persona 5: Regional Authority */}
          <Card className="bg-slate-900/90 border-slate-800 hover:border-teal-500/50 transition-all shadow-xl flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-[10px]">
                  National Parks & Councils
                </Badge>
                <Trees className="h-5 w-5 text-teal-400" />
              </div>
              <CardTitle className="text-base font-bold text-white pt-2">
                🌲 Regional Network
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Cross-town threat readiness overview, park-wide broadcasts, and mutual-aid asset maps.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button
                onClick={() => handleSelectPersona('regional')}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold h-9 gap-1.5 shadow"
              >
                Test Drive Regional View →
              </Button>
            </CardContent>
          </Card>

          {/* Action 6: Account Type Registration */}
          <Card className="bg-slate-900/90 border-dashed border-emerald-500/40 hover:border-emerald-500 transition-all shadow-xl flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                  Account Types
                </Badge>
                <UserPlus className="h-5 w-5 text-emerald-400" />
              </div>
              <CardTitle className="text-base font-bold text-white pt-2">
                📝 Register an Account
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Explore our real registration flow and audio guides for all 6 account types.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Link href="/demo/register">
                <Button
                  variant="outline"
                  className="w-full border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/60 text-xs font-bold h-9 gap-1.5"
                >
                  Explore Sign-Up Options →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM UTILITY: DATABASE RE-SYNC & EXIT */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-slate-200">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">
                Sandbox Database: <span className="font-mono text-emerald-400 font-black">comfeed</span>
              </p>
              <p className="text-xs text-slate-300">
                Current baseline: <strong className="text-emerald-300">{status?.eventsCount ?? 0} events</strong>, <strong className="text-emerald-300">{status?.newsCount ?? 0} news stories</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
            <Button
              size="sm"
              disabled={isSeeding}
              onClick={handleReseed}
              className="h-9 text-xs font-bold bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 hover:text-white hover:bg-emerald-800 gap-2 px-4 shadow-md shadow-emerald-950/50"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-400 ${isSeeding ? 'animate-spin' : ''}`} />
              {isSeeding ? 'Re-Syncing Baseline Data...' : 'Reset & Re-Sync Mock Data'}
            </Button>
            <Link href="/showcase">
              <Button size="sm" className="h-9 text-xs font-black bg-sky-600 hover:bg-sky-500 text-white px-4 gap-1.5 shadow-md shadow-sky-950/60">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Showcase
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
