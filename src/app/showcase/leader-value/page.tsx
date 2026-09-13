'use client';

import React from 'react';
import Link from 'next/link';
import {
  Crown,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Building2,
  Coins,
  Store,
  Truck,
  Vote,
  Heart,
  FileDown,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Scale,
  Award,
  ArrowLeft,
  Users,
  Compass,
  Zap,
  ShieldCheck,
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
import { CommunityRevenueCalculator } from '@/components/showcase/CommunityRevenueCalculator';
import { CivicComparisonTable } from '@/components/showcase/CivicComparisonTable';
import { LeaderPillarsGrid } from '@/components/showcase/LeaderPillarsGrid';
import { CouncilProposalDownload } from '@/components/showcase/CouncilProposalDownload';
import { ShowcaseSeoSchema } from '@/components/showcase/ShowcaseSeoSchema';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { BackToTopButton } from '@/components/ui/back-to-top-button';

const LEADER_FAQS = [
  {
    q: 'Is there really zero upfront cost or annual software license for our Council?',
    a: 'Yes, 100% free for the Council. Setup, mobile apps, web portal hosting, database maintenance, SMS emergency servers, and ISO 22301 tools are delivered at £0 capital cost to the public purse. The platform self-funds through local commercial business participation (£20/mo directory listings and £10/mo storefronts).',
  },
  {
    q: 'How does our Community Council receive its recurring revenue share?',
    a: 'All subscription payouts are calculated automatically via Stripe Connected Accounts and deposited directly into your designated Council Treasury or Community Development Trust bank account every month. Full financial statements are transparently visible in the Leader Console.',
  },
  {
    q: 'How does the Discretionary Rural Support Grant (75% to 90%) work for small villages?',
    a: 'Because tiny rural villages have lower commercial density and minimal server traffic, the Platform Owner can manually award small or model communities an elevated 75% to 90% revenue stake. This ensures rural parishes benefit equally and helps expand the national UK grid.',
  },
  {
    q: 'How does the Emergency Broadcast Siren work during severe weather or storms?',
    a: 'When an incident occurs (e.g. river flooding, winter road blocks, or power cuts), authorized leaders can trigger a multi-channel emergency alert. This instantly broadcasts high-visibility warning sirens on the website, sends push notifications to residents, and triggers SMS alerts to registered keyholders.',
  },
  {
    q: 'Can we appoint our own committee delegates, police liaisons, and moderators?',
    a: 'Absolutely. The Council President/Leader has granular role management tools in the Leader Console. You can appoint Vice-Presidents, Emergency Coordinators, Business Liaisons, Police Representatives, and Youth Community Reporters with specific permission levels.',
  },
  {
    q: 'How does Community Hub protect high street shops from big tech monopolies?',
    a: 'By providing an integrated Virtual High Street. Local butchers, bakers, and independent merchants get online catalogs, click & collect, and local courier doorstep delivery. Furthermore, 40% of all storefront subscriptions fund local town couriers, creating sustainable green delivery jobs right in your parish.',
  },
];

export default function LeaderValueShowcasePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
      <ShowcaseSeoSchema
        townshipName="Oakridge & DemoVille"
        baseUrl="https://my-community-hub.co.uk"
      />

      <Header />

      <main className="flex-1">
        {/* Navigation Breadcrumb Bar */}
        <section className="bg-muted/40 border-b py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Link href="/showcase" className="hover:text-foreground flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Platform Showcase
              </Link>
              <span>/</span>
              <span className="text-foreground font-bold">Community Leader Value & Revenue</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs font-semibold">
                <Link href="/demo/leader/dashboard">
                  <Crown className="mr-1 h-3.5 w-3.5 text-primary" /> Test Live Leader Console
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 bg-gradient-to-b from-primary/10 via-background to-background border-b">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold shadow-xs">
              <Crown className="h-4 w-4" />
              <span>Official Community Council & Leader Value Guide</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-headline tracking-tight text-foreground leading-[1.15]">
              Empower Your Town. <br className="hidden sm:inline" />
              Protect Your Residents. <br className="hidden sm:inline" />
              <span className="text-primary bg-clip-text">Fund Your Community Council.</span>
            </h1>

            <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
              A complete, self-funding digital ecosystem engineered specifically for UK Parishes, Town Councils, and Business Chambers — combining <strong className="text-foreground font-black">Virtual High Street commerce</strong>, <strong className="text-foreground font-black">statutory ISO 22301 Civil Emergency readiness</strong>, and <strong className="text-foreground font-black">recurring treasury revenue</strong> at <span className="underline decoration-primary font-black text-foreground">£0 upfront cost to the public purse</span>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold shadow-lg h-12 px-7 text-sm gap-2">
                <a href="#revenue-calculator">
                  <Coins className="h-4 w-4" /> Calculate Your Town Income
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-bold h-12 px-6 text-sm bg-card hover:bg-muted gap-2 border-2">
                <Link href="/demo/leader/dashboard">
                  <Compass className="h-4 w-4 text-primary" /> Test Leader Console (Demo)
                </Link>
              </Button>
            </div>

            {/* Trust Pill Badges */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/90 border shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Statutory ISO 22301 Aligned
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/90 border shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> £0 Public Purse Cost
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/90 border shadow-2xs">
                <Coins className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> 40% to 75%+ Council Revenue Share
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/90 border shadow-2xs">
                <Truck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Local Courier Job Creation
              </span>
            </div>
          </div>
        </section>

        {/* Section 1: Interactive Revenue Calculator */}
        <section id="revenue-calculator" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <Badge variant="outline" className="text-xs font-bold gap-1 text-primary border-primary/30">
              <Coins className="h-3.5 w-3.5" />
              Interactive Financial Modeler
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-headline tracking-tight text-foreground">
              Calculate Your Town&apos;s Recurring Treasury Revenue
            </h2>
            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              Slide the counters to forecast monthly and annual funding generated from local high street participation.
            </p>
          </div>

          <CommunityRevenueCalculator />
        </section>

        {/* Section 2: The 6 Core Pillars Grid */}
        <section className="py-16 bg-muted/30 border-y px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <LeaderPillarsGrid />
          </div>
        </section>

        {/* Section 3: Before vs After Comparison Table */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
          <CivicComparisonTable />
        </section>

        {/* Section 4: Downloadable Council Presentation Pack */}
        <section className="py-16 bg-gradient-to-b from-muted/20 via-muted/40 to-background border-t px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <CouncilProposalDownload />
          </div>
        </section>

        {/* Section 5: FAQs for Council Members & Leaders */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-xs font-bold gap-1 text-primary border-primary/30">
              <HelpCircle className="h-3.5 w-3.5" />
              Frequently Asked Questions
            </Badge>
            <h3 className="text-2xl sm:text-3xl font-extrabold font-headline text-foreground">
              Questions from Community Councils & Clerks
            </h3>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
              Everything your committee needs to know about governance, funding, and adoption.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {LEADER_FAQS.map((faq, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                className="border-2 border-border/80 rounded-xl px-4 bg-card shadow-xs"
              >
                <AccordionTrigger className="text-left font-bold text-sm sm:text-base hover:no-underline py-4 text-foreground">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed pb-4 pt-2 border-t">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Section 6: Final Call to Action */}
        <section className="py-16 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white px-4 sm:px-6 lg:px-8 border-t">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge className="bg-emerald-500 text-white font-bold text-xs gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Ready for Your Parish
            </Badge>

            <h2 className="text-3xl sm:text-5xl font-black font-headline tracking-tight">
              Bring Community Hub to Your Town Today
            </h2>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
              Experience the live Leader Console in our interactive demo, generate your council briefing pack, or connect directly with our deployment team to launch your parish.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-lg h-12 px-8 text-sm gap-2">
                <Link href="/demo/leader/dashboard">
                  <Crown className="h-4 w-4" /> Open Live Leader Console
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-bold h-12 px-7 text-sm bg-white/10 hover:bg-white/20 text-white border-white/30 gap-2">
                <Link href="/showcase">
                  <Compass className="h-4 w-4" /> View Full Platform Showcase
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTopButton />
    </div>
  );
}
