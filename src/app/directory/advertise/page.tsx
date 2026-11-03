'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Coins,
  ShieldCheck,
  ShoppingBag,
  Truck,
  HeartHandshake,
  Users,
  Target,
  Zap,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Flame,
  BadgePercent,
  XCircle,
  Compass,
  Store,
  MapPin,
  PhoneCall,
  Clock,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function AdvertiseWithUsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isDemo = pathname?.startsWith('/demo');
  const demoPrefix = isDemo ? '/demo' : '';

  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user && db ? doc(db, 'users', user.uid) : null),
    [user, db]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const activeCommunityId = isDemo
    ? '9ayHMyZf4SRw2gof1AM9'
    : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) ||
        userProfile?.primaryHomeCommunityId ||
        userProfile?.homeCommunityId ||
        userProfile?.communityId ||
        '9ayHMyZf4SRw2gof1AM9');

  const communityDocRef = useMemoFirebase(
    () => (activeCommunityId && db ? doc(db, 'communities', activeCommunityId) : null),
    [activeCommunityId, db]
  );
  const { data: activeCommunity } = useDoc<any>(communityDocRef);
  const communityName = activeCommunity?.name || (isDemo ? 'Grantown-on-Spey' : 'Our Community');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      {/* Sleek, Distraction-Free Sticky Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push(`${demoPrefix}/directory`);
            }
          }}
          className="text-slate-300 hover:text-white hover:bg-slate-800/80 gap-2 font-medium -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Directory</span>
        </Button>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="hidden sm:inline-flex items-center gap-1.5 border-emerald-500/40 bg-emerald-950/40 text-emerald-300 px-3 py-1 text-xs font-semibold rounded-full"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{communityName} Business Partner Program</span>
          </Badge>

          <Button
            asChild
            size="sm"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
          >
            <Link href={`${demoPrefix}/business/businesses/create`}>
              Register Business <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Colorful Ambient Glow Backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-emerald-600/20 via-teal-500/15 to-purple-600/20 blur-3xl -z-10 rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -right-40 w-[450px] h-[450px] bg-indigo-600/15 blur-3xl -z-10 rounded-full pointer-events-none" />
        <div className="absolute bottom-10 -left-40 w-[450px] h-[450px] bg-emerald-500/15 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold tracking-wide uppercase shadow-sm">
            <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>Support The Community That Supports Your Business</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            It’s Not Just An Advert. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              It’s A Community Partnership.
            </span>
          </h1>

          <p className="text-lg sm:text-2xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            Stop burning budget on social media algorithms that delete your ad after 10 clicks. Get{' '}
            <strong className="text-white font-semibold">24/7 permanent visibility</strong> in {communityName} for just{' '}
            <strong className="text-emerald-400 font-bold">£20/month</strong> — with{' '}
            <span className="underline decoration-emerald-500 decoration-2 underline-offset-4 font-bold text-white">
              60% to 80% reinvested straight back into our town
            </span>
            .
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-14 px-8 text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold shadow-xl shadow-emerald-500/25 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <Link href={`${demoPrefix}/business/businesses/create`}>
                <Store className="h-5 w-5 mr-2" />
                Join The {communityName} Directory Today
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-14 px-6 text-base border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <a href="#comparison">
                See How We Compare vs Big Tech <ChevronRight className="h-4 w-4 ml-1" />
              </a>
            </Button>
          </div>

          {/* 4 Colorful High-Impact Stat Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-10">
            <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900/60 border border-emerald-500/30 text-left">
              <div className="p-2 w-fit rounded-xl bg-emerald-500/20 text-emerald-400 mb-2">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">60% – 80%</p>
              <p className="text-xs sm:text-sm font-semibold text-emerald-300">Reinvested Locally</p>
              <p className="text-[11px] text-slate-400 mt-1">Funds town repairs, floral displays, & festivals.</p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-950/40 to-slate-900/60 border border-cyan-500/30 text-left">
              <div className="p-2 w-fit rounded-xl bg-cyan-500/20 text-cyan-400 mb-2">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">24/7 Always On</p>
              <p className="text-xs sm:text-sm font-semibold text-cyan-300">No Pay-Per-Click Meters</p>
              <p className="text-[11px] text-slate-400 mt-1">Your listing never disappears when clicks run out.</p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-950/40 to-slate-900/60 border border-purple-500/30 text-left">
              <div className="p-2 w-fit rounded-xl bg-purple-500/20 text-purple-400 mb-2">
                <Target className="h-5 w-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">100% Local</p>
              <p className="text-xs sm:text-sm font-semibold text-purple-300">Zero Black-Box Algorithms</p>
              <p className="text-[11px] text-slate-400 mt-1">Directly in front of {communityName} residents & visitors.</p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/40 to-slate-900/60 border border-amber-500/30 text-left">
              <div className="p-2 w-fit rounded-xl bg-amber-500/20 text-amber-400 mb-2">
                <BadgePercent className="h-5 w-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">0% Commission</p>
              <p className="text-xs sm:text-sm font-semibold text-amber-300">Keep 100% Of Your Profit</p>
              <p className="text-[11px] text-slate-400 mt-1">E-Commerce storefront upgrade for just £10 extra/mo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Side-by-Side Comparison: The Big Tech Trap vs Community Hub */}
      <section id="comparison" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 bg-slate-900/40 relative">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="border-red-500/40 bg-red-950/40 text-red-300 uppercase tracking-wider text-xs font-bold">
              The Advertising Reality Check
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              Why Big Tech Ads Are Bleeding Small Businesses
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
              Here is what happens to your £20 marketing budget on traditional social media platforms vs. {communityName} Community Hub.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* The Big Tech Side */}
            <Card className="border-2 border-red-500/30 bg-gradient-to-b from-red-950/20 to-slate-950/80 shadow-2xl flex flex-col justify-between">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400">Social Media &amp; Search Giants</span>
                  <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/30">
                    Pay-Per-Click Bleed
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-white mt-2">
                  The Facebook / Google Trap
                </CardTitle>
                <CardDescription className="text-slate-400">
                  You deposit £20 into an advertising account...
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/30 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-200">Ad Removed After ~10 to 15 Clicks</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      At £1.20–£2.00 per click, your £20 is completely gone in 24–48 hours. When the budget hits £0.00, your business is instantly deleted from view.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/30 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-200">Out-Of-Town &amp; Bot Traffic</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Algorithms optimize for generic clicks rather than verified local customers. You pay for accidental taps from people who will never visit your premises.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/30 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-200">100% Of Your Money Leaves Town</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Not one penny of your marketing budget supports the streets, events, or local community that keeps your doors open.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/30 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-200">High Commission on Food &amp; Retail</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Delivery and online order portals take 15% to 35% commission on every sale, eating away your margins.
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-slate-800/80 bg-red-950/10">
                <p className="text-xs text-red-300 font-medium">
                  Result: Fleeting visibility, constant price bidding, and zero community benefit.
                </p>
              </CardFooter>
            </Card>

            {/* The Community Hub Side */}
            <Card className="border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 via-slate-900/90 to-slate-950 shadow-2xl shadow-emerald-500/10 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                Recommended Choice
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">{communityName} Hub</span>
                  <Badge className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold">
                    Always-On &bull; £20/Month
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-white mt-2">
                  The Community Partnership Model
                </CardTitle>
                <CardDescription className="text-emerald-300/80">
                  Your £20 subscription works for you every minute of the month.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 text-sm text-slate-200">
                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Permanent 24/7 Presence (No Meter!)</p>
                    <p className="text-xs text-emerald-200/80 mt-0.5">
                      Your business profile, photos, opening times, click-to-call, and directions stay live every single day. Whether you get 10 or 1,000 views, the price stays a flat £20.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">60% to 80% Reinvested in {communityName}</p>
                    <p className="text-xs text-emerald-200/80 mt-0.5">
                      Up to £16 of your £20 fee goes directly to local community repair funds, seasonal festivals, town trails, and events that draw footfall straight into local shops.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Direct Local Feed &amp; What’s On Posts</p>
                    <p className="text-xs text-emerald-200/80 mt-0.5">
                      Promote your seasonal offers, weekly menus, or new stock directly to residents browsing their local community app—no algorithm suppression.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">0% Commission E-Commerce Add-On</p>
                    <p className="text-xs text-emerald-200/80 mt-0.5">
                      Add a full digital store for just £10/mo. You keep 100% of your retail sales profit with integrated click &amp; collect and local courier options.
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-slate-800/80 bg-emerald-950/20">
                <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md">
                  <Link href={`${demoPrefix}/business/businesses/create`}>
                    Get Started for £20/Month &rarr;
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* The Community Reinvestment Flywheel */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 relative overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="border-teal-500/40 bg-teal-950/40 text-teal-300 uppercase tracking-wider text-xs font-bold">
              The Circular Economy Flywheel
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              How Your £20 Directly Pays You Back
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
              When money stays local, everyone wins. Here is how your advertising fee creates an engine for high street footfall.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-colors flex flex-col justify-between relative group">
              <span className="text-5xl font-black text-slate-800 group-hover:text-emerald-500/30 transition-colors">01</span>
              <div className="space-y-2 mt-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  £20
                </div>
                <h3 className="font-bold text-white text-lg">You Subscribe</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your business gets a full, beautiful verified profile and promotional advert in {communityName}’s official directory.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-teal-500/40 transition-colors flex flex-col justify-between relative group">
              <span className="text-5xl font-black text-slate-800 group-hover:text-teal-500/30 transition-colors">02</span>
              <div className="space-y-2 mt-4">
                <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  80%
                </div>
                <h3 className="font-bold text-white text-lg">Town Fund Reinvestment</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Up to £16 of your fee is channeled directly into town community initiatives: trail maintenance, floral baskets, &amp; seasonal event budgets.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-colors flex flex-col justify-between relative group">
              <span className="text-5xl font-black text-slate-800 group-hover:text-cyan-500/30 transition-colors">03</span>
              <div className="space-y-2 mt-4">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-lg">Tourism &amp; Local Events</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  These funded community events and vibrant town spaces attract both resident families and high-spending regional visitors into town.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-colors flex flex-col justify-between relative group">
              <span className="text-5xl font-black text-slate-800 group-hover:text-purple-500/30 transition-colors">04</span>
              <div className="space-y-2 mt-4">
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-lg">Direct Footfall &amp; Sales</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Those visitors use the Community Hub to find where to eat, shop, and hire—walking through your doors to spend money with you!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Mobile App Showcase Mockup */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 bg-slate-900/20 relative">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="border-indigo-500/40 bg-indigo-950/40 text-indigo-300 uppercase tracking-wider text-xs font-bold">
              What Customers See On Their Phones
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              Professional, High-Impact Mobile Showcase
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
              Here is how your business is presented to thousands of local smartphone users browsing the {communityName} app.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-center">
            {/* Mockup Card 1: Directory Card */}
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
                <div className="absolute top-3 left-3 z-20 flex gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                    Verified Local
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                    Open Now
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 z-20">
                  <h4 className="font-bold text-white text-lg">Speyside Heritage Bakery &amp; Cafe</h4>
                  <p className="text-xs text-slate-300 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-red-500" /> High Street, {communityName}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">
                Handcrafted sourdough, artisanal Highland pastries, and locally roasted specialty coffees.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button size="sm" variant="outline" className="h-8 text-xs border-slate-700 bg-slate-800 text-slate-200">
                  <PhoneCall className="h-3 w-3 mr-1 text-emerald-400" /> Call Direct
                </Button>
                <Button size="sm" className="h-8 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">
                  <Compass className="h-3 w-3 mr-1" /> Directions
                </Button>
              </div>
            </div>

            {/* Mockup Card 2: Feed Promotion Banner */}
            <div className="p-4 rounded-3xl bg-gradient-to-b from-indigo-950/40 to-slate-900 border-2 border-indigo-500/40 shadow-2xl space-y-3 transform md:-translate-y-2">
              <div className="flex items-center justify-between text-xs text-indigo-300">
                <span className="font-bold flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-amber-400" /> What’s On &bull; Local Offer
                </span>
                <span className="text-[10px] text-slate-400">Featured Partner</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-2">
                <h4 className="font-extrabold text-white text-base">
                  &ldquo;Free Hot Drink with Any Lunch Special This Friday!&rdquo;
                </h4>
                <p className="text-xs text-indigo-200/80 leading-relaxed">
                  Mention the Community Hub app at the till to claim. Fresh local produce daily!
                </p>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Direct to 1,400+ residents
                </span>
                <span className="text-[11px] underline text-indigo-300 font-medium">Claim in App</span>
              </div>
            </div>

            {/* Mockup Card 3: E-Commerce Storefront */}
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5" /> Digital Storefront
                </span>
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                  0% Sales Fee
                </Badge>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold shrink-0">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-xs truncate">Highland Hamper Gift Box</p>
                  <p className="text-xs text-emerald-400 font-extrabold">£34.99 &bull; You keep £34.99</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <span className="flex items-center gap-1 text-[11px]">
                  <Truck className="h-3 w-3" /> Local Courier / Click &amp; Collect
                </span>
                <span className="font-bold text-[11px]">Next-Day</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Pricing Plans */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 relative">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/40 text-emerald-300 uppercase tracking-wider text-xs font-bold">
              Transparent &bull; No Surprises
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              Two Simple, High-Value Packages
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base">
              No hidden booking charges, no pay-per-click bills, and no lock-in contracts. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* Plan 1: Business Listing */}
            <Card className="border border-slate-800 bg-slate-900/60 shadow-xl flex flex-col justify-between">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-slate-700 text-slate-300">
                    Community Partner
                  </Badge>
                  <span className="text-xs text-slate-400">Monthly Rolling</span>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">£20</span>
                    <span className="text-slate-400 font-medium">/ month</span>
                  </div>
                  <p className="text-xs font-bold text-emerald-400 mt-1">
                    Up to £16 reinvested directly back into {communityName}
                  </p>
                </div>
                <CardDescription className="text-slate-300 mt-2">
                  Everything you need to put your business in front of the entire community 24 hours a day.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 text-sm text-slate-300 border-t border-slate-800/80 pt-6">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Full business profile in the verified directory</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>One-tap click-to-call, email, &amp; website links</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Interactive Google Maps walking &amp; driving routes</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Post adverts &amp; offers in the community What’s On feed</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Self-service dashboard to update hours &amp; photos anytime</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>No pay-per-click meters—your advert is always live</span>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-slate-800/80">
                <Button asChild variant="outline" className="w-full h-12 border-slate-700 bg-slate-800 text-white font-bold hover:bg-slate-700">
                  <Link href={`${demoPrefix}/business/businesses/create`}>
                    Join as a Business Partner
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Plan 2: Complete E-Commerce Storefront */}
            <Card className="border-2 border-emerald-500 bg-gradient-to-b from-emerald-950/30 via-slate-900/90 to-slate-950 shadow-2xl shadow-emerald-500/15 flex flex-col justify-between relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs uppercase px-4 py-1 rounded-full shadow-md tracking-wider">
                Full E-Commerce Upgrade
              </div>
              <CardHeader className="pb-4 pt-6">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-500 text-slate-950 font-extrabold">
                    Storefront Partner
                  </Badge>
                  <span className="text-xs text-emerald-300 font-bold">£20 + £10 Add-On</span>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">£30</span>
                    <span className="text-slate-400 font-medium">/ month</span>
                  </div>
                  <p className="text-xs font-bold text-amber-300 mt-1">
                    0% Commission &bull; You keep 100% of your product sales profits
                  </p>
                </div>
                <CardDescription className="text-slate-300 mt-2">
                  Turn your listing into a high-powered online shop to sell physical products, takeaways, or services.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 text-sm text-slate-200 border-t border-slate-800/80 pt-6">
                <div className="flex items-center gap-2.5 font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Everything included in the Business Partner plan</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited products, photos, inventory &amp; variations</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-white">Zero transaction commission on your retail sales</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Instant customer order notifications &amp; order tracker</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Local courier dispatch &amp; Click-and-Collect ready</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>10% of store fee reinvested into the town fund</span>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-slate-800/80">
                <Button asChild className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black shadow-lg shadow-emerald-500/25">
                  <Link href={`${demoPrefix}/business/businesses/create`}>
                    Launch Your Storefront &rarr;
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs font-bold uppercase">
              Frequently Asked Questions
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Got Questions? We Have Answers.
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-slate-800 rounded-xl px-4 bg-slate-900/60">
              <AccordionTrigger className="text-base font-bold text-white hover:text-emerald-400">
                How does this differ from spending £20 on Facebook or Instagram ads?
              </AccordionTrigger>
              <AccordionContent className="text-slate-300 text-sm leading-relaxed">
                When you spend £20 on Facebook, you pay per click. After around 10–15 clicks (often from accidental taps or people outside your service area), your budget hits zero and your advert is permanently deleted from users’ feeds. With Community Hub, you pay a flat £20/month. Your business profile and adverts remain active 24 hours a day, 7 days a week, 30 days a month, right in front of people who live, work, and shop in {communityName}.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-slate-800 rounded-xl px-4 bg-slate-900/60">
              <AccordionTrigger className="text-base font-bold text-white hover:text-emerald-400">
                Where does the 60% to 80% reinvestment money actually go?
              </AccordionTrigger>
              <AccordionContent className="text-slate-300 text-sm leading-relaxed">
                Up to 80% of your £20 fee goes directly to your verified local Community Council and town coordinators. It is spent strictly on high-impact public projects: high street floral planters, seasonal lighting, community repairs, town trail maps, and cultural festivals. These are the exact initiatives that attract tourism and keep local families shopping on your street.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-slate-800 rounded-xl px-4 bg-slate-900/60">
              <AccordionTrigger className="text-base font-bold text-white hover:text-emerald-400">
                Do you take a percentage or commission on my online store sales?
              </AccordionTrigger>
              <AccordionContent className="text-slate-300 text-sm leading-relaxed">
                Never. Unlike Deliveroo, JustEat, or Etsy, which deduct between 15% and 35% from every single sale, Community Hub charges 0% sales commission. For the flat £10/month e-commerce upgrade, you keep 100% of your retail profit.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-slate-800 rounded-xl px-4 bg-slate-900/60">
              <AccordionTrigger className="text-base font-bold text-white hover:text-emerald-400">
                Can I edit my offers, photos, and opening times after publishing?
              </AccordionTrigger>
              <AccordionContent className="text-slate-300 text-sm leading-relaxed">
                Yes! You receive access to a dedicated self-service Business Dashboard. You can update your opening hours, telephone number, menu, photos, special offers, and announcements 24/7 with zero waiting time.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-slate-800 rounded-xl px-4 bg-slate-900/60">
              <AccordionTrigger className="text-base font-bold text-white hover:text-emerald-400">
                Are there contracts or cancellation penalties?
              </AccordionTrigger>
              <AccordionContent className="text-slate-300 text-sm leading-relaxed">
                None whatsoever. All subscriptions are rolling monthly. You can pause or cancel anytime with one click directly from your dashboard.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final Conversion Bottom Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 bg-gradient-to-b from-slate-950 via-emerald-950/20 to-slate-950 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10 pointer-events-none" />
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <Badge className="bg-emerald-500 text-slate-950 font-bold uppercase text-xs">
            Start In Under 3 Minutes
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Ready To Put Your Business In Front Of {communityName}?
          </h2>
          <p className="text-base sm:text-lg text-slate-300">
            Join the local directory today. No pay-per-click traps, no algorithms, and a fee that stays right here in our community.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-14 px-8 text-base bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black shadow-xl shadow-emerald-500/25"
            >
              <Link href={`${demoPrefix}/business/businesses/create`}>
                Register Your Business for £20/mo &rarr;
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push(`${demoPrefix}/directory`)}
              className="w-full sm:w-auto h-14 px-6 border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Business Directory
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
