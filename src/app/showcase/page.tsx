'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Users,
  Store,
  ShieldAlert,
  Megaphone,
  Trees,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Radio,
  MapPin,
  Flame,
  Building2,
  Calendar,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  HelpCircle,
  Eye,
  Layers,
  Activity,
  Coins,
  Truck,
  Briefcase,
  BadgeHelp,
  Vote,
  Navigation,
  BookOpen,
  FolderArchive,
  Compass,
  Heart,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Share2,
  Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ShowcaseTabContent,
  ShowcasePersonaKey,
  SHOWCASE_PERSONAS
} from '@/components/showcase/ShowcaseTabContent';
import { ShowcaseSeoSchema } from '@/components/showcase/ShowcaseSeoSchema';
import { SHOWCASE_IMAGES } from '@/lib/showcase-images';

const CIVIC_ECOSYSTEM_MODULES = [
  {
    icon: Briefcase,
    title: 'Local Jobs & Careers',
    desc: 'Verified town-based employment, seasonal tourist roles, and apprenticeships with zero agency fees.',
    badge: 'Employment',
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30'
  },
  {
    icon: Search,
    title: 'Lost & Found Network',
    desc: 'Instant community alerts for missing pets, walking gear, keys, and found property across the parish.',
    badge: 'Community Alert',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  {
    icon: Calendar,
    title: "What's On & Events",
    desc: 'Comprehensive community calendar covering ceilidhs, agricultural shows, live music, and town meetings.',
    badge: 'Events & Culture',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  },
  {
    icon: Truck,
    title: 'Community Courier Service',
    desc: 'Appointed local town couriers providing fast doorstep delivery from local shops and vital prescription drops.',
    badge: 'Local Logistics',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  },
  {
    icon: ShieldAlert,
    title: 'Emergency Action Plan (SOPs)',
    desc: 'Statutory ISO 22301-aligned resilience playbooks, sandbag depots, warming centers, and 4x4 fleet dispatch.',
    badge: 'Civil Resilience',
    color: 'text-red-400 bg-red-500/10 border-red-500/30'
  },
  {
    icon: Users,
    title: 'Community Forum & Town Hall',
    desc: 'Algorithm-free, constructive local discussions and neighbourhood noticeboards with zero toxic rage-bait.',
    badge: 'Open Forum',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  },
  {
    icon: Vote,
    title: 'Town Polls & Consultations',
    desc: 'Democratic resident polling on traffic management, planning applications, and local community grant funds.',
    badge: 'Local Democracy',
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30'
  },
  {
    icon: Store,
    title: 'Digital High Street & Offers',
    desc: 'Daily special offers and flash discounts from independent butchers, bakeries, cafes, and artisan crafters.',
    badge: 'Commerce',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  {
    icon: Heart,
    title: 'Local Charities & Petitions',
    desc: 'Official visibility and fundraising hubs for local hospices, mountain rescue teams, and civic campaigns.',
    badge: 'Fundraising',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  },
  {
    icon: Navigation,
    title: 'Local Travel & Transit Portal',
    desc: 'Real-time bus schedules, regional rail connections, winter snow pass statuses, and EV charging points.',
    badge: 'Transit',
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
  },
  {
    icon: BookOpen,
    title: 'Guest Book & Visitor Welcome',
    desc: 'A warm Highland welcome for holidaymakers with visitor reviews, heritage trails, and local etiquette.',
    badge: 'Tourism',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
  },
  {
    icon: FolderArchive,
    title: 'Council Minutes & Audits',
    desc: 'Transparent public archives of meeting minutes, planning agendas, financial balance sheets, and bylaws.',
    badge: 'Governance',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  },
];

export default function ShowcaseBrochurePage() {
  const [activePersona, setActivePersona] = useState<ShowcasePersonaKey>('personal');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-slate-950">
      {/* GOOGLE SEO STRUCTURED DATA INJECTION (JSON-LD) */}
      <ShowcaseSeoSchema townshipName="Oakridge" baseUrl="https://communityhub.app" />

      {/* TOP PROMOTIONAL BANNER */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-b border-emerald-500/30 text-white text-xs py-2 px-4 text-center font-bold tracking-wide flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
        <span>Official Community Hub Product Showcase • 100% Isolated Demo on comfeed DB</span>
        <Link href="/demo/login" className="underline font-black text-emerald-300 hover:text-emerald-200 ml-1">
          Launch Demo →
        </Link>
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-md">
                <Radio className="h-5 w-5 text-slate-950" />
              </div>
              <span className="font-black text-xl tracking-tight text-white font-headline">
                Community<span className="text-sky-400">Hub</span>
              </span>
            </Link>

            <Badge className="hidden sm:inline-flex bg-slate-900 border-slate-700 text-slate-300 text-[11px] font-mono">
              🏛️ Oakridge Model Community Showcase
            </Badge>
          </div>

          <nav className="flex items-center gap-3">
            <Link href="/demo/login">
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-900 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60 font-bold text-xs h-9 gap-1.5 shadow-sm"
              >
                <Sparkles className="h-4 w-4 text-emerald-400" /> Enter Demo Hub
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white text-xs h-9 hidden md:inline-flex"
              >
                Member Log In
              </Button>
            </Link>
            <Link href="/signup/account-type">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 shadow-lg shadow-emerald-950/50"
              >
                Register Your Town
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO SECTION WITH H1 */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-950/40 via-slate-950 to-slate-950 pointer-events-none" />
        
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 relative z-10 space-y-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Statutory Community Resilience, Revenue Share & Digital High Street
          </div>

          {/* H1: PRIMARY PAGE TITLE */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight font-headline max-w-4xl mx-auto leading-tight sm:leading-none">
            One Unified Platform for <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400">Residents, Merchants, & Community Leaders.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            From local jobs, lost & found, and high street offers to inter-community tourism, direct civic revenue share, and statutory emergency action plans—Community Hub powers the full everyday life of your town.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/demo/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base h-13 px-8 gap-2.5 shadow-xl shadow-emerald-950/60">
                <Sparkles className="h-5 w-5" /> Launch Demo Hub (comfeed)
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/signup/account-type" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-slate-900/80 border-slate-700 text-slate-200 hover:text-white text-base h-13 px-7 gap-2">
                <Building2 className="h-5 w-5 text-emerald-400" /> Claim Your Community Hub
              </Button>
            </Link>
          </div>

          {/* Hero Showcase Image */}
          <figure className="pt-8 max-w-5xl mx-auto">
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-slate-900">
              <Image
                src={SHOWCASE_IMAGES.hero.src}
                alt={SHOWCASE_IMAGES.hero.alt}
                title={SHOWCASE_IMAGES.hero.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 text-left">
                <Badge className="bg-sky-500/80 text-slate-950 font-bold text-xs mb-2">Live Show Home Hub</Badge>
                <p className="text-sm sm:text-base font-bold text-white drop-shadow-md">Oakridge & DemoVille Model Community Portal</p>
              </div>
            </div>
            <figcaption className="text-xs text-slate-400 pt-2 italic">
              {SHOWCASE_IMAGES.hero.caption}
            </figcaption>
          </figure>

          {/* Key Value Badges */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-400" /> Direct Civic Revenue Share
            </span>
            <span className="flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5 text-sky-400" /> Inter-Community Network Map
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-red-400" /> ISO Scottish Resilience Aligned
            </span>
            <span className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-emerald-400" /> 100% High Street Centric
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 1: 5-PERSONA BROCHURE TABS WITH DEEP LEADER & MERCHANT SUITES */}
      <section className="py-12 md:py-20 bg-slate-950 relative border-b border-slate-800" id="roles">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase">
              Role-Based Architecture & Back Office
            </Badge>
            {/* H2: SECTION LEVEL TITLE */}
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight font-headline">
              Explore the 5 Core Community Account Types
            </h2>
            <p className="text-sm md:text-base text-slate-300">
              Select an account type below to discover the resident-facing features, back-office superpowers, and how they synchronize in real time.
            </p>
          </div>

          {/* ROLE SELECTOR BUTTONS */}
          <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 no-scrollbar">
            {(Object.keys(SHOWCASE_PERSONAS) as ShowcasePersonaKey[]).map((key) => {
              const persona = SHOWCASE_PERSONAS[key];
              const Icon = persona.icon;
              const isSelected = activePersona === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActivePersona(key)}
                  className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 border text-left ${
                    isSelected
                      ? 'bg-slate-900 border-sky-400 text-white shadow-lg shadow-sky-950/60 ring-2 ring-sky-500/20'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold leading-tight">{persona.title.split('(')[0].trim()}</p>
                    <p className="text-[10px] font-mono text-slate-400 leading-tight">
                      {key === 'personal' && 'Residents'}
                      {key === 'business' && 'Merchants'}
                      {key === 'leader' && 'Community Councils'}
                      {key === 'advertiser' && 'Sponsors'}
                      {key === 'regional' && 'National Parks'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ACTIVE TAB CONTENT DISPLAY (H3, H4, H5, H6 INSIDE) */}
          <ShowcaseTabContent personaKey={activePersona} />
        </div>
      </section>

      {/* SECTION 2: INTER-COMMUNITY NETWORKING & TOURISM */}
      <section className="py-14 bg-slate-950 border-b border-slate-800">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2 max-w-3xl mx-auto">
            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-xs font-mono uppercase">
              Connected Towns Across Scotland
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-headline">
              Inter-Community Networking, Tourism & Cross-Parish Footfall
            </h2>
            <p className="text-sm md:text-base text-slate-300">
              Your hub does not exist in isolation. The Interactive Community Map lets residents visit neighbouring towns, while bringing regional tourists directly to your doorstep.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <figure className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
              <Image
                src={SHOWCASE_IMAGES.regionalCoordination.src}
                alt={SHOWCASE_IMAGES.regionalCoordination.alt}
                title={SHOWCASE_IMAGES.regionalCoordination.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4">
                <Badge className="bg-teal-500 text-slate-950 font-bold text-xs mb-1">Interactive Community Map</Badge>
                <p className="text-xs sm:text-sm font-bold text-white">Cross-Community Explorer & National Park Tourism Hub</p>
              </div>
            </figure>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Compass className="h-5 w-5 text-teal-400" /> Multi-Community Visiting & Switching
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Residents can easily switch to neighbouring villages (e.g. Oakridge, DemoVille Central, Westpark, Northfield) to check event dates, find regional tradesmen, or view local road conditions.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Trees className="h-5 w-5 text-emerald-400" /> Highland Tourism & Eco-Visitor Hub
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Incoming holidaymakers and national trail hikers browse verified guest books, heritage trails, local pubs, and Stagecoach bus transit links directly from your public portal.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Network className="h-5 w-5 text-sky-400" /> Regional Emergency Mutual-Aid Sharing
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When one town faces a major blackout or river breach, neighbouring community councils share emergency generators, 4x4 drivers, and temporary accommodation assets in real time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: THE COMPLETE 360° CIVIC ECOSYSTEM (12 CORE MODULES) */}
      <section className="py-16 bg-slate-900/40 border-b border-slate-800">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2 max-w-3xl mx-auto">
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase">
              Complete Feature Suite
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-headline">
              The Complete 360° Civic Ecosystem
            </h2>
            <p className="text-sm md:text-base text-slate-300">
              Everything your community needs to thrive, communicate, govern, and protect itself in one integrated app.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {CIVIC_ECOSYSTEM_MODULES.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 shadow-md transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${mod.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono border-slate-800 text-slate-400">
                        {mod.badge}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-white pt-1">{mod.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{mod.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 5: VISUAL PILLARS GALLERY WITH H2, H3, FIGURE, FIGCAPTION & ALT TAGS */}
      <section className="py-14 bg-slate-900/40 border-y border-slate-800">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-mono uppercase">
              Visual Platform Tour
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-headline">
              Visual Pillar Overview: Civic Resilience to Digital High Street
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              High-resolution walkthrough of our emergency dispatch, high street trader showcase, and regional perimeter systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Emergency Resilience */}
            <figure className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
              <div>
                <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden">
                  <Image
                    src={SHOWCASE_IMAGES.emergencyResilience.src}
                    alt={SHOWCASE_IMAGES.emergencyResilience.alt}
                    title={SHOWCASE_IMAGES.emergencyResilience.title}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-red-500 text-white text-[10px] font-bold">Civil Resilience</Badge>
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-400" /> Emergency Alert Beacon
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Instant emergency broadcasts that bypass advertising algorithms to deliver live warming center coords, sandbag locations, and road cordons.
                  </p>
                </div>
              </div>
              <figcaption className="p-5 pt-0 text-[11px] text-slate-400 border-t border-slate-900 italic">
                {SHOWCASE_IMAGES.emergencyResilience.caption}
              </figcaption>
            </figure>

            {/* Pillar 2: High Street */}
            <figure className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
              <div>
                <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden">
                  <Image
                    src={SHOWCASE_IMAGES.highStreet.src}
                    alt={SHOWCASE_IMAGES.highStreet.alt}
                    title={SHOWCASE_IMAGES.highStreet.title}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px]">High Street</Badge>
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Store className="h-4 w-4 text-amber-400" /> Digital High Street Shopfronts
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Verified independent butchers, bakeries, cafes, and trades connect directly with residents through organic daily offers and promotions.
                  </p>
                </div>
              </div>
              <figcaption className="p-5 pt-0 text-[11px] text-slate-400 border-t border-slate-900 italic">
                {SHOWCASE_IMAGES.highStreet.caption}
              </figcaption>
            </figure>

            {/* Pillar 3: Regional Authority */}
            <figure className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
              <div>
                <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden">
                  <Image
                    src={SHOWCASE_IMAGES.regionalCoordination.src}
                    alt={SHOWCASE_IMAGES.regionalCoordination.alt}
                    title={SHOWCASE_IMAGES.regionalCoordination.title}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-teal-500 text-slate-950 font-bold text-[10px]">National Parks</Badge>
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Trees className="h-4 w-4 text-teal-400" /> Regional Network Coordination
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    National Parks and Regional Councils coordinate dozens of towns, share mutual-aid assets, and deploy cross-community ranger notices.
                  </p>
                </div>
              </div>
              <figcaption className="p-5 pt-0 text-[11px] text-slate-400 border-t border-slate-900 italic">
                {SHOWCASE_IMAGES.regionalCoordination.caption}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* SECTION 6: WHY COMMUNITY HUB VS SOCIAL GIANTS WITH H2 & H3 */}
      <section className="py-14 bg-slate-950 border-b border-slate-800">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase">
              The Civic Difference
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-headline">
              Why Scottish Towns are Moving Off Generic Social Networks
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/80 border-slate-800 shadow-md">
              <CardHeader className="p-5 pb-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-2">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Zero Life-Safety Delays
                </h3>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-xs text-slate-300 leading-relaxed space-y-2">
                <p>
                  Generic social networks hide crisis warnings behind advertising algorithms. In a flood, power outage, or wildfire, our verified Emergency Alert Beacon broadcasts immediately to all local screens.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 shadow-md">
              <CardHeader className="p-5 pb-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                  <Store className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">
                  100% High Street Centric
                </h3>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-xs text-slate-300 leading-relaxed space-y-2">
                <p>
                  Local butchers, bakeries, and artisans don’t have to pay thousands to global tech giants just to reach people living on their own street. Every verified resident sees local offers organically.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 shadow-md">
              <CardHeader className="p-5 pb-3">
                <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-2">
                  <Trees className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Regional Authority Oversight
                </h3>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-xs text-slate-300 leading-relaxed space-y-2">
                <p>
                  National Parks (Cairngorms, Trossachs) and Regional Councils get aggregate multi-community visibility, mutual-aid asset coordination, and mass transport dispatching during disasters.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 7: SEO FAQ SECTION MATCHING FAQPage SCHEMA WITH H2, H4 */}
      <section className="py-16 bg-slate-900/50 border-b border-slate-800">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase">
              Frequently Asked Questions
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-headline">
              Frequently Asked Questions About Community Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Clear answers regarding revenue sharing, inter-community networking, resilience standards, and town onboarding.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="item-1" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>How does the Community Dividend and Revenue Share work for Town Councils?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                When regional partners and national sponsors fund campaigns or banner placements on your community hub, a percentage of that revenue is automatically credited to the local Community Council / Resilience Fund. This money helps fund local emergency infrastructure (such as sandbags and backup generators), village hall repairs, and community grants.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>How does Inter-Community Networking and Tourism benefit our town?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                The Interactive Community Map connects all participating Scottish towns. Residents can follow neighbouring parishes, and tourists visiting the Cairngorms or Highlands discover your town’s events, high street shops, guest book reviews, and local artisans, significantly boosting local footfall.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>What everyday community tools are included beyond emergency alerts?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                Community Hub includes a full suite of everyday modules: Local Jobs & Careers, Lost & Found alerts, What\'s On & Event bookings, Community Courier doorstep delivery, Civic Discussions, Town Polls & Consultations, Local Charities, and Public Council Minutes archives.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>How does Community Hub differ from traditional social networks?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                Unlike global social platforms that use engagement algorithms and sell private user data, Community Hub is 100% algorithm-free, private, and chronological. Emergency safety broadcasts and local business promotions are displayed directly to verified residents without life-safety delays or pay-to-reach barriers.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>Is Community Hub compliant with UK GDPR and statutory resilience standards?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                Yes. Community Hub adheres strictly to UK GDPR regulations, collects zero tracking cookies, operates role-based access control, and aligns with standard Scottish Civil Resilience emergency management frameworks (ISO 22301 aligned).
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>How can a town council or community group register their own hub?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                Any Scottish community group or council can claim and set up their town hub in minutes through our guided registration wizard, or explore our live Show Home sandbox demo first.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* SECTION 8: FINAL CALL TO ACTION WITH H2 */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800 relative overflow-hidden">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
          <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase px-3 py-1">
            ✨ Interactive Test Drive
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-headline">
            Ready to Experience the Back Office for Yourself?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Jump into our pre-populated Oakridge Show Home sandbox. Test role switching, emergency dispatch, revenue tracking, courier orders, and town setup in 1 click.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="#roles" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-base h-13 px-8 gap-2 shadow-xl shadow-sky-950/60">
                <Sparkles className="h-5 w-5" /> Explore 5 Roles Above
              </Button>
            </a>
            <Link href="/signup/account-type" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-slate-950 border-slate-700 text-slate-200 hover:text-white text-base h-13 px-7 gap-2">
                Register Your Community Hub →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-sky-400" />
            <span className="font-bold text-slate-200">Community Hub Platform</span>
            <span>— Scottish Hyperlocal Resilience & Digital High Street Network</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/demo/login" className="hover:text-sky-300 font-bold">
              Demo Hub (comfeed)
            </Link>
            <Link href="/login" className="hover:text-white">
              Member Sign In
            </Link>
            <Link href="/signup/account-type" className="hover:text-white">
              Register Community
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
