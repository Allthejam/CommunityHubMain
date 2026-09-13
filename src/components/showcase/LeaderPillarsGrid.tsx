'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  Truck,
  ShieldAlert,
  Vote,
  Users,
  Heart,
  Megaphone,
  Calendar,
  Search,
  CheckCircle2,
  FileDown,
  Sparkles,
  Siren,
  Building2,
  Coins,
  ShieldCheck,
  Award,
} from 'lucide-react';

const PILLARS = [
  {
    id: 'high-street',
    title: 'Virtual High Street & Local Courier Fleet',
    tagline: 'Defend and revitalize independent high street commerce',
    badge: 'Commerce & Jobs',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: Store,
    gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    features: [
      'Digital storefronts with live product catalogs, restaurant menus & gift vouchers',
      'Click & Collect integration alongside in-store promotions',
      'Appointed local green courier network providing same-day doorstep delivery',
      '40% of storefront subscriptions retained in the town logistics fund to create local courier jobs',
    ],
  },
  {
    id: 'resilience',
    title: 'ISO 22301 Civil Resilience & Emergency Hub',
    tagline: 'Statutory emergency playbooks and instant community sirens',
    badge: 'Civil Protection',
    badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    icon: ShieldAlert,
    gradient: 'from-red-500/15 via-red-500/5 to-transparent',
    features: [
      'Instant multi-channel emergency broadcast alerts (SMS, Push, & Website Banner Siren)',
      'Pre-configured Standard Operating Procedures (SOPs) for floods, winter storms, and power grid cuts',
      'Interactive sandbag depots, warming centers, and 4x4 volunteer fleet dispatch locations',
      '1-Click Auditor-Ready Emergency Grab-Bag Dossier (PDF) generator for Police and Regional Planners',
    ],
  },
  {
    id: 'democracy',
    title: 'Hyper-Local Citizen Democracy & Polling',
    tagline: 'Give every verified local resident a genuine voice',
    badge: 'Civic Engagement',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: Vote,
    gradient: 'from-blue-500/15 via-blue-500/5 to-transparent',
    features: [
      'Verified resident-only community petitions on local planning, roads, and village amenities',
      'Advisory and binding democratic community polls with tamper-resistant audit trails',
      'Centralised "What\'s On" community event calendar with ticketing links and ceilidh schedules',
      'Rapid Lost & Found network for missing pets, walking gear, keys, and found property',
    ],
  },
  {
    id: 'governance',
    title: 'Autonomous Council Console & Committee Delegation',
    tagline: 'Professional administration with zero IT headaches',
    badge: 'Council Leadership',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    icon: Users,
    gradient: 'from-indigo-500/15 via-indigo-500/5 to-transparent',
    features: [
      'Dedicated Leader Back-Office Console (/leader/dashboard) tailored for Community Councils',
      'Granular committee role delegation (Vice-President, Emergency Lead, Police Liaison, Business Officer, Youth Reporter)',
      'Built-in civic moderation, transparent audit logging, and member verification controls',
      'Direct oversight of incoming community revenue share and annual civic reserve funds',
    ],
  },
  {
    id: 'charity',
    title: 'Direct Charity & Community Group Hub',
    tagline: '100% direct donations with zero commission deductions',
    badge: 'Social Impact',
    badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30',
    icon: Heart,
    gradient: 'from-pink-500/15 via-pink-500/5 to-transparent',
    features: [
      'Showcase local volunteer groups, amateur sports clubs, heritage trusts, and food banks',
      '100% direct donation portal without third-party commission cuts',
      'Volunteer call-outs and community action appeal publishing',
      'Zero advertising clutter around charity and non-profit community appeals',
    ],
  },
  {
    id: 'network',
    title: 'Interconnected UK Parish Network',
    tagline: 'Put your town on the nationwide regional map',
    badge: 'Tourism & Network',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: Award,
    gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
    features: [
      '"Visit Another Community" feature connecting your town to visitors and staycation tourists',
      'Regional advertiser revenue distributions sharing national corporate budgets with local councils',
      'Inter-town courier logistics enabling cross-parish delivery of local artisanal goods',
      'High-reliability cloud architecture with 99.9% uptime and zero maintenance burden on the council',
    ],
  },
];

export function LeaderPillarsGrid() {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <Badge variant="outline" className="text-xs font-bold gap-1 text-primary border-primary/30">
          <Sparkles className="h-3.5 w-3.5" />
          The Complete Civic Ecosystem
        </Badge>
        <h3 className="text-2xl sm:text-4xl font-extrabold font-headline tracking-tight text-foreground">
          Everything Your Town Receives on Day One
        </h3>
        <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
          Community Hub is not just a website — it is a fully integrated digital town square, emergency response engine, and self-funding economic platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Card
              key={pillar.id}
              className="border-2 border-border/70 hover:border-primary/40 transition-all duration-300 shadow-md hover:shadow-xl bg-card flex flex-col justify-between overflow-hidden group"
            >
              <div className={`p-6 bg-gradient-to-br ${pillar.gradient} border-b space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-background/90 border shadow-xs group-hover:scale-105 transition-transform">
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  <Badge variant="outline" className={`text-xs font-bold ${pillar.badgeColor}`}>
                    {pillar.badge}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-lg font-extrabold font-headline text-foreground leading-snug">
                    {pillar.title}
                  </h4>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold mt-1">
                    {pillar.tagline}
                  </p>
                </div>
              </div>

              <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <ul className="space-y-2.5">
                  {pillar.features.map((feat, i) => (
                    <li key={i} className="text-xs text-slate-800 dark:text-slate-200 font-medium flex items-start gap-2.5 leading-relaxed">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
