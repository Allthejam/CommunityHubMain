'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Store,
  ShieldAlert,
  Trees,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Radio,
  Flame,
  Building2,
  Coins,
  Navigation,
  BookOpen,
  FolderArchive,
  Compass,
  Heart,
  Network,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ShowcaseTabContent,
  ShowcasePersonaKey,
  SHOWCASE_PERSONAS,
} from '@/components/showcase/ShowcaseTabContent';
import { SHOWCASE_IMAGES } from '@/lib/showcase-images';
import {
  DEFAULT_SHOWCASE_SEO_DATA,
  type ShowcaseSectionKey,
  type ShowcaseSeoData,
} from '@/lib/seo/page-seo-defaults';
import {
  SeoEditPencil,
  SeoHeading,
  SeoManagerBar,
  SeoMetaEditorDialog,
  SeoSectionEditorDialog,
  useIsSeoManager,
} from '@/components/about/seo-editor-controls';

const CIVIC_ECOSYSTEM_MODULES = [
  {
    icon: ShieldAlert,
    title: 'Statutory Emergency Resilience',
    desc: 'ISO 22301-aligned disaster planning, evacuation maps, safe refuge points, and real-time amber/red emergency alert beacons.',
    badge: 'Life-Safety',
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
  },
  {
    icon: Store,
    title: 'Virtual High Street & Offers',
    desc: 'Every local butcher, baker, artisan, and café gets an algorithm-free digital shopfront to reach local residents directly.',
    badge: 'Local Trade',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    icon: Network,
    title: 'Inter-Community Map & Tourism',
    desc: 'Seamless town-to-town visiting, regional trail guides, and incoming tourist footfall directly into local shops.',
    badge: 'Networking',
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  },
  {
    icon: Coins,
    title: 'Community Dividend & Revenue Share',
    desc: 'Transparent split of regional sponsor and partner ad revenue returns directly to your local Community Council fund.',
    badge: 'Revenue',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    icon: Sparkles,
    title: 'What’s On & Community Events',
    desc: 'Town markets, ceilidhs, village hall workshops, and council meetings with 1-click calendar sync and attendance tracking.',
    badge: 'Calendar',
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  },
  {
    icon: Building2,
    title: 'Local Jobs & Careers Board',
    desc: 'Hyperlocal job vacancies posted directly by high street businesses, farms, estates, and community councils.',
    badge: 'Employment',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  },
  {
    icon: Compass,
    title: 'Lost & Found Rapid Alert',
    desc: 'Instant neighbourhood broadcasting for missing pets, keys, farm equipment, or lost hiking gear.',
    badge: 'Community Care',
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  },
  {
    icon: Navigation,
    title: 'Community Courier Delivery',
    desc: 'Hyperlocal doorstep delivery connecting high street orders with verified local volunteer or paid riders.',
    badge: 'Logistics',
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  },
  {
    icon: Heart,
    title: 'Local Charities & Petitions',
    desc: 'Official visibility and fundraising hubs for local hospices, mountain rescue teams, and civic campaigns.',
    badge: 'Fundraising',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  },
  {
    icon: Navigation,
    title: 'Local Travel & Transit Portal',
    desc: 'Real-time bus schedules, regional rail connections, winter snow pass statuses, and EV charging points.',
    badge: 'Transit',
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    icon: BookOpen,
    title: 'Guest Book & Visitor Welcome',
    desc: 'A warm Highland welcome for holidaymakers with visitor reviews, heritage trails, and local etiquette.',
    badge: 'Tourism',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  },
  {
    icon: FolderArchive,
    title: 'Council Minutes & Audits',
    desc: 'Transparent public archives of meeting minutes, planning agendas, financial balance sheets, and bylaws.',
    badge: 'Governance',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
];

export function ShowcaseContent({
  initialSeoData,
  initialPersona,
}: {
  initialSeoData?: ShowcaseSeoData;
  initialPersona?: string | null;
}) {
  const [seoData, setSeoData] = useState<ShowcaseSeoData>(
    initialSeoData || DEFAULT_SHOWCASE_SEO_DATA
  );
  const { isSeoManager } = useIsSeoManager();
  const [showPencils, setShowPencils] = useState(true);
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<{
    key: ShowcaseSectionKey;
    label: string;
  } | null>(null);

  const validPersona =
    initialPersona &&
    ['personal', 'business', 'leader', 'advertiser', 'regional'].includes(initialPersona)
      ? (initialPersona as ShowcasePersonaKey)
      : 'personal';

  const [activePersona, setActivePersona] = useState<ShowcasePersonaKey>(validPersona);

  useEffect(() => {
    if (
      initialPersona &&
      ['personal', 'business', 'leader', 'advertiser', 'regional'].includes(initialPersona)
    ) {
      const elem = document.getElementById('roles');
      if (elem) {
        setTimeout(() => elem.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, [initialPersona]);

  const canEdit = isSeoManager && showPencils;
  const { sections, meta } = seoData;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-slate-950">
      {/* TOP PROMOTIONAL BANNER */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-b border-emerald-500/30 text-white text-xs py-2 px-4 text-center font-bold tracking-wide flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
        <span>Official Community Hub Product Showcase • Interactive Live Model Experience</span>
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

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/showcase/leader-value">
              <Button
                variant="outline"
                size="sm"
                className="bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-950/60 font-bold text-xs h-9 gap-1.5 shadow-sm"
              >
                <Coins className="h-4 w-4 text-amber-400" /> Leader Value &amp; Revenue
              </Button>
            </Link>
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

      {isSeoManager && (
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <SeoManagerBar
            seoData={seoData}
            showPencils={showPencils}
            onTogglePencils={() => setShowPencils((prev) => !prev)}
            onOpenMetaEditor={() => setMetaDialogOpen(true)}
          />
        </div>
      )}

      {/* HERO SECTION WITH H1 */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-950/40 via-slate-950 to-slate-950 pointer-events-none" />

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 relative z-10 space-y-8 text-center">
          {canEdit && (
            <div className="flex justify-end">
              <SeoEditPencil
                label="Hero"
                tagHint={sections.hero.headingTag}
                onClick={() => setEditingSection({ key: 'hero', label: 'Hero Section' })}
              />
            </div>
          )}

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> {sections.hero.badge}
          </div>

          {/* H1: PRIMARY PAGE TITLE */}
          <SeoHeading
            tag={sections.hero.headingTag}
            className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight font-headline max-w-4xl mx-auto leading-tight sm:leading-none"
          >
            {sections.hero.heading}
          </SeoHeading>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {sections.hero.description}
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/demo/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base h-13 px-8 gap-2.5 shadow-xl shadow-emerald-950/60">
                <Sparkles className="h-5 w-5" /> Launch Interactive Demo Hub
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
          <figure className="pt-8 max-w-5xl mx-auto relative">
            {canEdit && (
              <div className="absolute top-10 right-3 z-20">
                <SeoEditPencil
                  label="Hero Image"
                  tagHint={sections.heroImage.headingTag}
                  onClick={() => setEditingSection({ key: 'heroImage', label: 'Hero Showcase Image' })}
                />
              </div>
            )}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-slate-900">
              <Image
                src={sections.heroImage.imageUrl || SHOWCASE_IMAGES.hero.src}
                alt={sections.heroImage.imageAlt || SHOWCASE_IMAGES.hero.alt}
                title={sections.heroImage.imageTitle || SHOWCASE_IMAGES.hero.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 text-left">
                <Badge className="bg-sky-500/80 text-slate-950 font-bold text-xs mb-2">Live Show Home Hub</Badge>
                <SeoHeading tag={sections.heroImage.headingTag} className="text-sm sm:text-base font-bold text-white drop-shadow-md">
                  {sections.heroImage.heading}
                </SeoHeading>
              </div>
            </div>
            <figcaption className="text-xs text-slate-400 pt-2 italic">
              {sections.heroImage.description}
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
              <Flame className="h-3.5 w-3.5 text-red-400" /> ISO 22301 Civil Resilience Aligned
            </span>
            <span className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-emerald-400" /> 100% High Street Centric
            </span>
          </div>
        </div>
      </section>

      {/* FEATURED BANNER: WHAT DOES YOUR COMMUNITY GET & REVENUE CALCULATOR */}
      <section className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border-b border-emerald-500/30 py-8 px-4 sm:px-6">
        <div className="container max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-slate-900/60 border border-emerald-500/20 shadow-2xl backdrop-blur-xs">
          <div className="space-y-2 text-center md:text-left max-w-3xl">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <Badge className="bg-emerald-500 text-slate-950 font-bold text-xs gap-1">
                <Crown className="h-3.5 w-3.5" />
                Community Council &amp; Leader Value Guide
              </Badge>
              <span className="text-xs text-emerald-400 font-semibold">
                £0 Public Cost • 40% to 75%+ Revenue Share
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-headline">
              What Does Your Town Get with Community Hub?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore the full civic breakdown: Virtual High Street, ISO 22301 Civil Emergency Broadcasts, Democratic Resident Polling, and use our <strong className="text-white">Dual-Slider Community Revenue Calculator</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <Link href="/showcase/leader-value" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm h-11 px-6 gap-2 shadow-lg shadow-emerald-950/50">
                <Coins className="h-4 w-4" /> Calculate Town Income &amp; View Guide
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 1: 5-PERSONA BROCHURE TABS */}
      <section className="py-12 md:py-20 bg-slate-950 relative border-b border-slate-800" id="roles">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            {canEdit && (
              <div className="flex justify-end">
                <SeoEditPencil
                  label="5 Roles"
                  tagHint={sections.personas.headingTag}
                  onClick={() => setEditingSection({ key: 'personas', label: '5 Core Account Types' })}
                />
              </div>
            )}
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase">
              {sections.personas.badge}
            </Badge>
            <SeoHeading tag={sections.personas.headingTag} className="text-2xl sm:text-4xl font-black text-white tracking-tight font-headline">
              {sections.personas.heading}
            </SeoHeading>
            <p className="text-sm md:text-base text-slate-300">
              {sections.personas.description}
            </p>
          </div>

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

          <ShowcaseTabContent personaKey={activePersona} />
        </div>
      </section>

      {/* SECTION 2: INTER-COMMUNITY NETWORKING & TOURISM */}
      <section className="py-14 bg-slate-950 border-b border-slate-800">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2 max-w-3xl mx-auto">
            {canEdit && (
              <div className="flex justify-end">
                <SeoEditPencil
                  label="Regional Network"
                  tagHint={sections.regionalAuthority.headingTag}
                  onClick={() => setEditingSection({ key: 'regionalAuthority', label: 'Regional Network & Tourism' })}
                />
              </div>
            )}
            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-xs font-mono uppercase">
              {sections.regionalAuthority.badge}
            </Badge>
            <SeoHeading tag={sections.regionalAuthority.headingTag} className="text-2xl sm:text-4xl font-black text-white font-headline">
              {sections.regionalAuthority.heading}
            </SeoHeading>
            <p className="text-sm md:text-base text-slate-300">
              {sections.regionalAuthority.description}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <figure className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
              <Image
                src={sections.regionalAuthority.imageUrl || SHOWCASE_IMAGES.regionalCoordination.src}
                alt={sections.regionalAuthority.imageAlt || SHOWCASE_IMAGES.regionalCoordination.alt}
                title={sections.regionalAuthority.imageTitle || SHOWCASE_IMAGES.regionalCoordination.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4">
                <Badge className="bg-teal-500 text-slate-950 font-bold text-xs mb-1">Interactive Community Map</Badge>
                <p className="text-xs sm:text-sm font-bold text-white">Cross-Community Explorer &amp; National Park Tourism Hub</p>
              </div>
            </figure>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Compass className="h-5 w-5 text-teal-400" /> Multi-Community Visiting &amp; Switching
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Residents can easily switch to neighbouring villages (e.g. Oakridge, DemoVille Central, Westpark, Northfield) to check event dates, find regional tradesmen, or view local road conditions.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Trees className="h-5 w-5 text-emerald-400" /> Highland Tourism &amp; Eco-Visitor Hub
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

      {/* SECTION 4: THE COMPLETE 360° CIVIC ECOSYSTEM */}
      <section className="py-16 bg-slate-900/40 border-b border-slate-800">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2 max-w-3xl mx-auto">
            {canEdit && (
              <div className="flex justify-end">
                <SeoEditPencil
                  label="Civic Suite"
                  tagHint={sections.everydayModules.headingTag}
                  onClick={() => setEditingSection({ key: 'everydayModules', label: '360° Civic Ecosystem' })}
                />
              </div>
            )}
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase">
              {sections.everydayModules.badge}
            </Badge>
            <SeoHeading tag={sections.everydayModules.headingTag} className="text-2xl sm:text-4xl font-black text-white font-headline">
              {sections.everydayModules.heading}
            </SeoHeading>
            <p className="text-sm md:text-base text-slate-300">
              {sections.everydayModules.description}
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

      {/* SECTION 5: VISUAL PILLARS GALLERY */}
      <section className="py-14 bg-slate-900/40 border-y border-slate-800">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            {canEdit && (
              <div className="flex justify-end">
                <SeoEditPencil
                  label="Visual Tour"
                  tagHint={sections.visualGallery.headingTag}
                  onClick={() => setEditingSection({ key: 'visualGallery', label: 'Visual Pillar Tour' })}
                />
              </div>
            )}
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-mono uppercase">
              {sections.visualGallery.badge}
            </Badge>
            <SeoHeading tag={sections.visualGallery.headingTag} className="text-2xl sm:text-3xl font-black text-white font-headline">
              {sections.visualGallery.heading}
            </SeoHeading>
            <p className="text-xs sm:text-sm text-slate-300">
              {sections.visualGallery.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

      {/* SECTION 6: WHY COMMUNITY HUB VS SOCIAL GIANTS */}
      <section className="py-14 bg-slate-950 border-b border-slate-800">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            {canEdit && (
              <div className="flex justify-end">
                <SeoEditPencil
                  label="Civic Difference"
                  tagHint={sections.civicDifference.headingTag}
                  onClick={() => setEditingSection({ key: 'civicDifference', label: 'The Civic Difference' })}
                />
              </div>
            )}
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase">
              {sections.civicDifference.badge}
            </Badge>
            <SeoHeading tag={sections.civicDifference.headingTag} className="text-2xl sm:text-3xl font-black text-white font-headline">
              {sections.civicDifference.heading}
            </SeoHeading>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/80 border-slate-800 shadow-md">
              <CardHeader className="p-5 pb-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-2">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">Zero Life-Safety Delays</h3>
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
                <h3 className="text-base font-bold text-white">100% High Street Centric</h3>
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
                <h3 className="text-base font-bold text-white">Regional Authority Oversight</h3>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-xs text-slate-300 leading-relaxed space-y-2">
                <p>
                  National Parks, Regional Districts, and Municipal Councils get aggregate multi-community visibility, mutual-aid asset coordination, and mass transport dispatching during disasters.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 7: SEO FAQ SECTION */}
      <section className="py-16 bg-slate-900/50 border-b border-slate-800">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            {canEdit && (
              <div className="flex justify-end">
                <SeoEditPencil
                  label="FAQ"
                  tagHint={sections.faq.headingTag}
                  onClick={() => setEditingSection({ key: 'faq', label: 'FAQ Section' })}
                />
              </div>
            )}
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase">
              {sections.faq.badge}
            </Badge>
            <SeoHeading tag={sections.faq.headingTag} className="text-2xl sm:text-3xl font-black text-white font-headline">
              {sections.faq.heading}
            </SeoHeading>
            <p className="text-xs sm:text-sm text-slate-300">
              {sections.faq.description}
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="item-1" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>How does the Community Dividend and Revenue Share work for Town Councils?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                When regional partners and national sponsors fund campaigns or banner placements on your community hub, a percentage of that revenue is automatically credited to the local Community Council / Resilience Fund.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>How does Inter-Community Networking and Tourism benefit our town?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                The Interactive Community Map connects all participating towns and districts. Residents can follow neighbouring communities, and visitors discover your town’s events, high street shops, guest book reviews, and local artisans.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>What everyday community tools are included beyond emergency alerts?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                Community Hub includes a full suite of everyday modules: Local Jobs &amp; Careers, Lost &amp; Found alerts, What&apos;s On &amp; Event bookings, Community Courier doorstep delivery, Civic Discussions, Town Polls &amp; Consultations, Local Charities, and Public Council Minutes archives.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>How does Community Hub differ from traditional social networks?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                Unlike global social platforms that use engagement algorithms and sell private user data, Community Hub is 100% algorithm-free, private, and chronological.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>Is Community Hub compliant with UK GDPR and statutory resilience standards?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                Yes. Community Hub adheres strictly to UK GDPR regulations, collects zero tracking cookies, operates role-based access control, and aligns with statutory Civil Resilience and emergency management frameworks (ISO 22301 aligned).
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-slate-800 rounded-xl px-4 bg-slate-950/80">
              <AccordionTrigger className="text-sm font-bold text-white hover:text-sky-300 text-left">
                <h4>How can a town council or community group register their own hub?</h4>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-300 leading-relaxed">
                Any community group, town council, or municipality can claim and set up their town hub in minutes through our guided registration wizard, or explore our live Show Home sandbox demo first.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* SECTION 8: FINAL CALL TO ACTION */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800 relative overflow-hidden">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
          {canEdit && (
            <div className="flex justify-end">
              <SeoEditPencil
                label="Final CTA"
                tagHint={sections.finalCta.headingTag}
                onClick={() => setEditingSection({ key: 'finalCta', label: 'Final Call to Action' })}
              />
            </div>
          )}
          <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase px-3 py-1">
            ✨ {sections.finalCta.badge}
          </Badge>
          <SeoHeading tag={sections.finalCta.headingTag} className="text-3xl sm:text-5xl font-black text-white tracking-tight font-headline">
            {sections.finalCta.heading}
          </SeoHeading>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {sections.finalCta.description}
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
            <span>— Hyperlocal Resilience &amp; Digital High Street Network</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/demo/login" className="hover:text-sky-300 font-bold">
              Interactive Demo Hub
            </Link>
            <Link href="/login" className="hover:text-white">
              Member Sign In
            </Link>
            <Link href="/signup/account-type" className="hover:text-white">
              Register Community
            </Link>
            <span className="text-slate-600">Updated: {meta.lastUpdatedLabel}</span>
          </div>
        </div>
      </footer>

      {isSeoManager && (
        <>
          <SeoMetaEditorDialog
            pageId="showcase"
            open={metaDialogOpen}
            onOpenChange={setMetaDialogOpen}
            meta={meta}
            onSaved={(updated) => setSeoData(updated)}
          />
          <SeoSectionEditorDialog
            pageId="showcase"
            open={Boolean(editingSection)}
            onOpenChange={(open) => {
              if (!open) setEditingSection(null);
            }}
            sectionKey={editingSection?.key || null}
            sectionLabel={editingSection?.label || ''}
            sectionData={editingSection ? sections[editingSection.key] : null}
            onSaved={(updated) => setSeoData(updated)}
          />
        </>
      )}
    </div>
  );
}
