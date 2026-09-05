'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Store,
  ShieldAlert,
  Megaphone,
  Trees,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  LayoutDashboard,
  Radio,
  Flame,
  ShoppingBag,
  TrendingUp,
  MapPin,
  Calendar,
  Lock,
  Compass,
  FileCheck2,
  Building2,
  HeartHandshake,
  Coins,
  Truck,
  Briefcase,
  BadgeHelp,
  Vote,
  Navigation,
  BookOpen,
  FolderArchive,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type ShowcasePersonaKey = 'personal' | 'business' | 'leader' | 'advertiser' | 'regional';

export interface PersonaDetails {
  key: ShowcasePersonaKey;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  description: string;
  publicSide: {
    title: string;
    description: string;
    points: string[];
    visualBadge: string;
    previewHeading: string;
    previewSubtext: string;
  };
  backOfficeSide: {
    title: string;
    description: string;
    points: string[];
    visualBadge: string;
    toolsHeading: string;
    toolsList: { name: string; desc: string }[];
  };
  syncStory: string;
  sandboxUrl: string;
}

export const SHOWCASE_PERSONAS: Record<ShowcasePersonaKey, PersonaDetails> = {
  personal: {
    key: 'personal',
    title: 'Personal (Resident & Visitor)',
    badge: 'Civic Member & Resident',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    icon: Users,
    tagline: 'Connect with your actual town, discover local jobs, events, transit, and receive verified safety broadcasts.',
    description:
      'A strictly non-toxic, algorithm-free local network built exclusively for verified residents and town visitors. From finding a local job or lost pet to following neighbouring highland villages and booking community hall events—everything is in one private, chronological place.',
    publicSide: {
      title: 'What Residents & Visitors Experience Daily',
      description: 'A rich, chronological town portal keeping you plugged into every facet of community life.',
      points: [
        'Chronological Local Noticeboard with zero advertising algorithms, tracking cookies, or toxic distortion.',
        '1-Click What\'s On & Events: Ceilidhs, Highland Games, Farmers Shows, library groups, and town meetings.',
        'Local Jobs & Apprenticeships: Direct access to verified town employment without recruitment agency fees.',
        'Lost & Found Community Hub: Fast reporting for lost pets, keys, walking gear, and found property.',
        'Digital High Street & Special Offers: Exclusive discounts from local bakeries, butchers, and artisan crafters.',
        'Local Travel & Transit Portal: Real-time bus & train timetables, road passes, and EV charging points.',
        'Inter-Community Explorer: Easily switch and explore neighbouring Scottish towns, discovering regional events and high streets.',
        'Community Forum & Polls: Participate in council consultations, local debates, and community initiatives.'
      ],
      visualBadge: 'Resident Mobile Portal',
      previewHeading: 'Oakridge Town Noticeboard & Everyday Hub',
      previewSubtext: 'Showing 14 local events, 6 high street offers, 3 jobs, and verified flood advice.'
    },
    backOfficeSide: {
      title: 'Resident Privacy, Profile & Community Controls',
      description: 'Full control over your community footprint, notification preferences, and privacy.',
      points: [
        'Multi-Community Following: Set your primary home town and follow neighbouring parishes for regional updates.',
        'Emergency Alert Preferences: Instant push notification and email delivery for severe weather, power outages, and road blocks.',
        'Direct Messaging: Chat safely with verified high street shops, event organizers, and town couriers.',
        'Volunteer Skills Registry: Register your 4x4 transport, chainsaw, or first-aid capability for emergency callouts.'
      ],
      visualBadge: 'Member Profile',
      toolsHeading: 'Resident Toolset & Features',
      toolsList: [
        { name: 'Local Jobs & Careers Board', desc: 'Browse and apply for town-based careers and seasonal positions.' },
        { name: 'Lost & Found Noticeboard', desc: 'Instant local alerts for missing pets, livestock, and personal belongings.' },
        { name: 'Parish Marketplace (Buy/Swap/Sell)', desc: 'Ethical, scam-free classifieds strictly within your community.' },
        { name: 'Community Courier Service', desc: 'Book local doorstep deliveries with appointed town couriers.' }
      ]
    },
    syncStory:
      'A resident posts an urgent appeal for a missing border collie in Lost & Found; nearby dog-walkers and the town courier receive the notification and locate the pet within 45 minutes.',
    sandboxUrl: '/demo/login'
  },
  business: {
    key: 'business',
    title: 'Business (High Street Merchant & Trader)',
    badge: 'Digital High Street & Commerce',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: Store,
    tagline: 'Showcase your local shop, publish daily flash offers, dispatch via local couriers, and boost revenue.',
    description:
      'A dedicated digital storefront for high street shops, butchers, cafes, guest houses, and artisan trades. Reach 100% of verified local residents and incoming tourists organically without paying predatory advertising fees to global tech giants.',
    publicSide: {
      title: 'What Customers See in the High Street Feed',
      description: 'An interactive local directory showcasing verified town businesses, services, and daily specials.',
      points: [
        'Verified Independent Trader Badge with opening hours, live contact links, and interactive map location.',
        'Daily Special Offers & Flash Deals pushed directly to local resident notifications and visitor itineraries.',
        'Community Courier Doorstep Dispatch: Connect orders directly with appointed local couriers for same-day delivery.',
        'Direct Customer Inquiries & Bespoke Orders without third-party commission cuts or middleman markups.',
        'Highland Tourism & Visitor Window: Prominently featured when travellers browse the regional network.'
      ],
      visualBadge: 'Customer High Street View',
      previewHeading: 'Highland Kiltmakers & Strathspey Bakery',
      previewSubtext: '2 active offers: "10% off custom tweed accessories" & "Fresh morning sourdough ready".'
    },
    backOfficeSide: {
      title: 'Merchant Back Office & Promotion Suite',
      description: 'Manage products, promotional campaigns, opening hours, local jobs, and customer messages.',
      points: [
        'Flash Offer Deployer: Publish time-limited discounts with countdown timers and coupon codes in seconds.',
        'Local Job Vacancy Publisher: Post full-time, part-time, and weekend positions directly to town residents.',
        'Customer Messenger & Orders: Manage customer questions, special dietary requests, and table bookings.',
        'Revenue Growth Analytics: Track local impressions, offer bookmarks, and high street footfall engagement.'
      ],
      visualBadge: 'Merchant Dashboard',
      toolsHeading: 'Merchant Toolset & Superpowers',
      toolsList: [
        { name: 'Special Offers Creator', desc: 'Deploy instant discounts to the digital high street feed.' },
        { name: 'Job Vacancy Manager', desc: 'Recruit local staff without paying commercial job board fees.' },
        { name: 'Courier Dispatch Portal', desc: 'Hand off local packages to the appointed Community Courier.' },
        { name: 'Town Co-op Promotion', desc: 'Collaborate with neighbouring shops on joint high street festivals.' }
      ]
    },
    syncStory:
      'A local butcher posts a weekend barbecue special in their merchant back office; the deal appears instantly in the Digital High Street feed of all residents across the parish.',
    sandboxUrl: '/demo/login'
  },
  leader: {
    key: 'leader',
    title: 'Leader (Local Community Council & Parish Trust)',
    badge: 'Local Community Council & Parish Trust',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: ShieldAlert,
    tagline: 'Independent governance for Local Community Councils: earn recurring local revenue, manage resilience SOPs, and broadcast verified alerts.',
    description:
      'Built strictly for independent Local Community Councils, parish trusts, and civic associations so that wealth is generated BY the community, FOR the community. Centralized regional authorities and external corporate entities are never granted administrative control—local autonomy and financial sovereignty remain 100% in the hands of the local community.',
    publicSide: {
      title: 'What The Community Sees From Local Leaders',
      description: 'Official announcements, meeting minutes, public consultations, and emergency civil protection notices.',
      points: [
        'Verified Local Leader Badge guaranteeing authentic local representation, zero impersonation, and anti-spam moderation.',
        'Emergency Alert Beacon: Non-dismissible life-safety alerts across screen banners, push notifications, and email during floods or storms.',
        'Transparent Council Records Archive: Public meeting minutes, agendas, bylaws, and annual financial audits.',
        'Town Polls & Consultations: Real-time resident voting on traffic schemes, planning permissions, and local grant funds.',
        'Community Asset Directory: Live map of emergency sandbag depots, warming centers, and automated external defibrillators (AEDs).',
        'Town Charity & Petition Hub: Official endorsement and visibility for local community fundraising campaigns.'
      ],
      visualBadge: 'Official Council Notices',
      previewHeading: 'Oakridge Community Council Noticeboard',
      previewSubtext: 'Recent publication: "Annual General Meeting Minutes & Winter Resilience Plan".'
    },
    backOfficeSide: {
      title: 'Local Community Council Command & Governance Console',
      description: 'Independent local governance, community revenue management, emergency SOP command, and member moderation.',
      points: [
        'By the Community, For the Community Revenue Share: Receive automatic allocations from platform sponsorships and local ads to fund local town projects, hall repairs, and emergency equipment.',
        'Emergency Broadcast Beacon Dispatcher: Send Standard notices or high-priority non-dismissible Emergency Alerts.',
        'Statutory Emergency Action Plan (SOPs): Pre-configured incident response playbooks for floods, severe snow, power cuts, and wildfires.',
        'Community Courier Appointment: Assign and manage trusted town couriers for local deliveries and welfare logistics.',
        'Volunteer Fleet Mobilization: Dispatch 4x4 drivers, chainsaw operators, and welfare checkers with 1 click.',
        'Public Consultation & Poll Creator: Publish multi-choice votes to gather verified democratic community sentiment.'
      ],
      visualBadge: 'Leader Command Hub',
      toolsHeading: 'Local Civic Leader Toolset & Controls',
      toolsList: [
        { name: 'Civic Revenue Share Ledger', desc: 'Track local sponsorship funds flowing into the local community resilience account.' },
        { name: 'Emergency Broadcast Dispatcher', desc: 'Deploy instant non-dismissible alerts across all devices and channels.' },
        { name: 'Resilience SOP Manager', desc: 'Digital incident command with offline action playbooks and hazard maps.' },
        { name: 'Council Documents Repository', desc: 'Upload meeting minutes, finance reports, and local bylaws.' },
        { name: 'Courier & Asset Dispatcher', desc: 'Appoint community couriers and mobilize local mutual-aid equipment.' },
        { name: 'Public Consultation System', desc: 'Create and analyze binding resident polls on local issues.' }
      ]
    },
    syncStory:
      'During heavy snow, the Local Community Council Resilience Leader activates the "Snowstorm SOP"; the emergency warming center coords, gritting routes, and 4x4 driver roster sync instantly across all resident screens, while the town courier delivers provisions to isolated residents.',
    sandboxUrl: '/demo/login'
  },
  advertiser: {
    key: 'advertiser',
    title: 'Advertiser (Civic Sponsor & Brand Partner)',
    badge: 'Civic Sponsor & Brand Partner',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    icon: Megaphone,
    tagline: 'Sponsor communities with brand-safe local placements that directly fund community resilience.',
    description:
      'Connect your brand with high-intent regional audiences. Unlike predatory programmatic ad networks, Community Hub offers clean, ethical sponsorship cards and "Adopt a Community" initiatives where a percentage of ad spend flows directly into local community resilience coffers.',
    publicSide: {
      title: 'What Residents & Visitors See',
      description: 'Beautiful, native, non-intrusive sponsor cards supporting the local township.',
      points: [
        'Dedicated "Adopted by [Your Brand]" header on community notices and resilience infrastructure.',
        'Native Brand Showcase Carousel placed tastefully in the High Street and What\'s On feeds.',
        'Exclusive Local Perks & Vouchers delivered directly to verified local households.',
        'Zero tracking pixels or intrusive spyware—100% brand safe and UK GDPR compliant.'
      ],
      visualBadge: 'Sponsored Town Feed',
      previewHeading: 'National Civic Partner — Proud Community Sponsor',
      previewSubtext: 'Supporting Oakridge Community Council Clean Green Spaces Fund.'
    },
    backOfficeSide: {
      title: 'National Campaign Management Portal',
      description: 'Launch, target, and monitor multi-community sponsorship campaigns from one dashboard.',
      points: [
        'Regional Geo-Targeting: Target specific postcodes, regional districts, or all member towns.',
        'Civic Sponsorship Allocator: Choose which community halls, sports fields, or emergency funds to support.',
        'Transparent Impact Analytics: Verified impression counts, click-through engagement, and community goodwill metrics.',
        'Creative Asset Manager: Upload high-res banners, interactive vouchers, and co-branded badges.'
      ],
      visualBadge: 'Brand Portal',
      toolsHeading: 'National Advertiser Controls',
      toolsList: [
        { name: 'Multi-Hub Campaign Deployer', desc: 'Distribute one campaign across 20+ member towns with 1 click.' },
        { name: 'Civic Sponsorship Fund Allocator', desc: 'Direct revenue share into local community resilience coffers.' },
        { name: 'Demographic Reach Matrix', desc: 'Analyze verified household coverage across target regions.' }
      ]
    },
    syncStory:
      'A regional brand partner launches a trail campaign; within seconds, member village hubs display verified updates with the sponsor badge, and the ad fee directly funds local community hall repairs.',
    sandboxUrl: '/demo/login'
  },
  regional: {
    key: 'regional',
    title: 'Regional Network (Regional Districts & Cross-Town Tourism)',
    badge: 'Regional Tourism & District Coordination',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    icon: Trees,
    tagline: 'Strategic visibility & cross-town tourism for regional services and district networks.',
    description:
      'Strategic regional visibility for regional networks to broadcast advisories, path closures, and cross-town tourism trails. Regional authorities have zero operational control or revenue claim over local community hubs—local Community Councils maintain absolute independence.',
    publicSide: {
      title: 'What Regional Visitors & Residents See',
      description: 'A seamless regional explorer connecting multiple neighbouring communities.',
      points: [
        'Regional Trail & District Noticeboard: Weather warnings, path diversions, and ranger station alerts.',
        'Cross-Town Events Explorer: See agricultural shows, music festivals, and heritage walks across the whole region.',
        'Eco-Tourism & Heritage Guidelines: Sustainable travel notices and wildlife conservation updates.',
        'Inter-Town Transit Guides: Live links to regional transport routes and community shuttle buses.'
      ],
      visualBadge: 'Regional District Portal',
      previewHeading: 'DemoVille Regional Gateway',
      previewSubtext: 'Covering Oakridge, DemoVille Central, Westpark, and Northfield.'
    },
    backOfficeSide: {
      title: 'Regional Authority Master Dashboard',
      description: 'Strategic coordination and aggregate analytics across all network communities.',
      points: [
        'Multi-Town Threat Readiness Overview: View real-time emergency readiness dials for member towns simultaneously.',
        'Regional Broadcast Dispatcher: Issue environmental hazard alerts that broadcast across every community noticeboard at once.',
        'Resource Mutual-Aid Matrix: Reallocate water storage, generators, or volunteer fleets across town borders.',
        'Regional Tourism Footfall Trends: Measure visitor distribution across high streets and active trails.'
      ],
      visualBadge: 'Regional Authority Console',
      toolsHeading: 'Authority Master Controls',
      toolsList: [
        { name: 'Cross-Town Alert Dispatcher', desc: 'Broadcast a high-priority advisory across member communities.' },
        { name: 'Mutual-Aid Asset Map', desc: 'Locate 4x4 vehicles and emergency generators in neighbouring parishes.' },
        { name: 'Aggregated Footfall Analytics', desc: 'Monitor regional economic health and visitor engagement metrics.' }
      ]
    },
    syncStory:
      'When the Regional Authority declares a High Weather Alert, a single button press syncs the emergency banner across Oakridge, DemoVille Central, and neighbouring townships simultaneously.',
    sandboxUrl: '/demo/login'
  }
};

export function ShowcaseTabContent({ personaKey }: { personaKey: ShowcasePersonaKey }) {
  const p = SHOWCASE_PERSONAS[personaKey];
  const Icon = p.icon;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* HEADER SUMMARY CARD */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`text-xs font-mono uppercase px-3 py-1 font-bold ${p.badgeColor}`}>
              <Icon className="h-3.5 w-3.5 mr-1.5 inline" /> {p.badge}
            </Badge>
            <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs font-mono">
              Role Showcase & Sandbox Tour
            </Badge>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight font-headline flex items-center gap-3">
              {p.title}
            </h3>
            <p className="text-base md:text-lg font-medium text-sky-200/90 max-w-3xl">
              {p.tagline}
            </p>
            <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {p.description}
            </p>
          </div>

          {/* Quick Action Bar */}
          <div className="pt-3 flex flex-wrap items-center gap-3 border-t border-slate-800">
            <Link href={p.sandboxUrl}>
              <Button size="lg" className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm h-11 px-6 gap-2 shadow-lg shadow-sky-950/50">
                <Sparkles className="h-4 w-4" /> Launch Full Community as {p.title.split('(')[0].trim()}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/signup/account-type">
              <Button size="lg" variant="outline" className="bg-slate-950/80 border-slate-700 text-slate-200 hover:text-white text-sm h-11 px-5 gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Create Real Account for My Town
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* DUAL VIEW: PUBLIC EXPERIENCE VS BACK-OFFICE SUPERPOWERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. PUBLIC EXPERIENCE CARD */}
        <Card className="border-slate-800 bg-slate-950/80 shadow-xl flex flex-col justify-between">
          <div>
            <CardHeader className="p-6 pb-4 border-b border-slate-800 bg-muted/10">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[11px] font-mono">
                  <Smartphone className="h-3.5 w-3.5 mr-1 inline" /> {p.publicSide.visualBadge}
                </Badge>
                <h6 className="text-[10px] text-slate-400 font-mono">Front-End Portal</h6>
              </div>
              <h4 className="text-lg font-bold text-white pt-2">
                {p.publicSide.title}
              </h4>
              <CardDescription className="text-xs text-slate-300">
                {p.publicSide.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {/* Visual Simulation Snippet */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                    <MapPin className="h-3 w-3" /> Oakridge (DE1 4MO)
                  </span>
                  <span>Live Feed Preview</span>
                </div>
                <p className="text-xs font-bold text-white">{p.publicSide.previewHeading}</p>
                <p className="text-[11px] text-slate-300">{p.publicSide.previewSubtext}</p>
              </div>

              {/* Bullet Points */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Front-End Capabilities:</h5>
                {p.publicSide.points.map((pt, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </div>

          <div className="p-6 pt-0">
            <Link href={p.sandboxUrl}>
              <Button variant="outline" size="sm" className="w-full bg-slate-900 border-slate-700 text-slate-300 hover:text-white text-xs h-9 gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-sky-400" /> Enter Live Community ({p.title.split('(')[0].trim()})
              </Button>
            </Link>
          </div>
        </Card>

        {/* 2. BACK-OFFICE SUPERPOWERS CARD */}
        <Card className="border-slate-800 bg-slate-950/80 shadow-xl flex flex-col justify-between">
          <div>
            <CardHeader className="p-6 pb-4 border-b border-slate-800 bg-muted/10">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] font-mono">
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1 inline" /> {p.backOfficeSide.visualBadge}
                </Badge>
                <h6 className="text-[10px] text-emerald-400 font-mono font-bold">Admin / Leader Console</h6>
              </div>
              <h4 className="text-lg font-bold text-white pt-2">
                {p.backOfficeSide.title}
              </h4>
              <CardDescription className="text-xs text-slate-300">
                {p.backOfficeSide.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {/* Backoffice Feature Toolset Grid */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {p.backOfficeSide.toolsHeading}:
                </h5>
                <div className="grid grid-cols-1 gap-2.5">
                  {p.backOfficeSide.toolsList.map((tool, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-0.5">
                      <h6 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> {tool.name}
                      </h6>
                      <p className="text-[11px] text-slate-300">{tool.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bullet Points */}
              <div className="space-y-2.5 pt-1">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Management Superpowers:</h5>
                {p.backOfficeSide.points.map((pt, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </div>

          <div className="p-6 pt-0">
            <Link href={p.sandboxUrl}>
              <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" /> Launch {p.title.split('(')[0].trim()} Full Back Office →
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* REAL-TIME SYNCHRONIZATION STORY BOX */}
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-sky-500/30 shadow-lg flex flex-col sm:flex-row items-center gap-4">
        <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400 shrink-0">
          <Radio className="h-6 w-6" />
        </div>
        <div className="space-y-1 text-center sm:text-left flex-1">
          <h5 className="text-xs font-mono uppercase font-bold tracking-wider text-sky-300">
            How The Back Office & The Public Portal Interact:
          </h5>
          <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
            {p.syncStory}
          </p>
        </div>
        <Link href={p.sandboxUrl} className="shrink-0 w-full sm:w-auto">
          <Button size="sm" className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs h-9 gap-1.5">
            Test Interactive Sync <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* BESPOKE PERSONA DEEP-DIVE SECTIONS (VISIBLE ONLY FOR ACTIVE PERSONA)       */}
      {/* ========================================================================= */}

      {/* 1. LEADER EXCLUSIVE: UNCAPPED COMMUNITY REVENUE ENGINE */}
      {personaKey === 'leader' && (
        <div className="pt-6 space-y-8 animate-in fade-in duration-300">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-mono uppercase px-3.5 py-1 font-bold">
              👑 Local Community Council Exclusive • 💰 By The Community, For The Community
            </Badge>
            <h3 className="text-2xl sm:text-4xl font-black text-white font-headline tracking-tight">
              For Local Community Councils: Earn From <span className="text-amber-400">£8/Month</span> on a Single Listing Up to an Uncapped <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-300 to-teal-400">75% Revenue Share</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              This commercial model was designed from day one so wealth is generated <span className="text-amber-300 font-bold">BY the community, FOR the community</span>. It is reserved exclusively for <span className="text-white font-bold">Local Community Councils, Parish Trusts, and Civic Committees</span>—ensuring local funds remain strictly within the local parish rather than absorbed into centralized regional budgets. Every local shop, tradesman, and advertiser listing on your hub generates recurring monthly revenue deposited directly into your Community Council bank account.
            </p>
          </div>

          {/* 3-TIER REVENUE SCALING LADDER */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* TIER 1 */}
            <Card className="bg-slate-950 border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-slate-900 text-slate-300 border-slate-700 text-xs font-mono">1 – 15 Listings</Badge>
                  <span className="text-xs font-bold text-slate-400 font-mono">Starter Tier</span>
                </div>
                <div>
                  <h4 className="text-xl font-black text-white">40% Community Share</h4>
                  <p className="text-2xl font-black text-amber-400 pt-1 font-mono">£8.00 <span className="text-xs text-slate-400 font-normal">/ month per active business</span></p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Start earning for your local Community Council from your very first local shop, cafe, or trade registration. Immediate baseline return with zero initial setup fees.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">Community Council Projection:</p>
                  <p className="text-sm font-bold text-emerald-400">10 Businesses = £80.00 / mo</p>
                  <p className="text-[10px] text-slate-400 font-mono">(£960.00 / year recurring into local fund)</p>
                </div>
              </div>
              <div className="p-6 pt-0 text-[11px] text-slate-400 border-t border-slate-900 italic">
                ✓ Covers parish digital hosting, emergency sandbag supplies & local meeting costs.
              </div>
            </Card>

            {/* TIER 2 */}
            <Card className="bg-slate-950 border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono">16 – 49 Listings</Badge>
                  <span className="text-xs font-bold text-sky-400 font-mono">Growth Tier</span>
                </div>
                <div>
                  <h4 className="text-xl font-black text-white">50% – 60% Community Share</h4>
                  <p className="text-2xl font-black text-sky-400 pt-1 font-mono">£10 – £12 <span className="text-xs text-slate-400 font-normal">/ month per active business</span></p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  As high street momentum builds across your parish, your Community Council profit split increases automatically across all active listings.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">Community Council Projection:</p>
                  <p className="text-sm font-bold text-sky-400">35 Businesses = £385.00 / mo</p>
                  <p className="text-[10px] text-slate-400 font-mono">(£4,620.00 / year recurring into local fund)</p>
                </div>
              </div>
              <div className="p-6 pt-0 text-[11px] text-slate-400 border-t border-slate-900 italic">
                ✓ Funds village hall upkeep, public AED defibrillator batteries & festive lights.
              </div>
            </Card>

            {/* TIER 3 - 75% UNLIMITED */}
            <Card className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-emerald-500/60 shadow-2xl shadow-emerald-950/40 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase font-mono px-3 py-1 rounded-bl-xl">
                Community Top Tier • Uncapped
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-mono">50+ Listings</Badge>
                  <span className="text-xs font-bold text-emerald-400 font-mono">Thriving Town</span>
                </div>
                <div>
                  <h4 className="text-xl font-black text-white">75% Community Share</h4>
                  <p className="text-2xl font-black text-emerald-400 pt-1 font-mono">£15.00+ <span className="text-xs text-slate-400 font-normal">/ month per active business</span></p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Hit 50 listings and unlock the maximum 75% split for your Community Council. Uncapped earnings scale as regional advertisers and corporate sponsors join.
                </p>
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                  <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider font-mono">Uncapped Local Projections:</p>
                  <p className="text-sm font-bold text-white">60 Businesses = <span className="text-emerald-400 font-mono">£900 / mo</span> (£10,800/yr)</p>
                  <p className="text-sm font-bold text-white">120 Businesses + Ads = <span className="text-emerald-400 font-mono">£2,250+ / mo</span> (£27,000+/yr)</p>
                </div>
              </div>
              <div className="p-6 pt-0 text-[11px] text-emerald-300/90 border-t border-emerald-950 italic">
                ✓ Can employ a dedicated town development manager or fund major community capital projects!
              </div>
            </Card>
          </div>

          {/* FINANCIAL ASSURANCE CALLOUT BOX */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Coins className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Automated Monthly Payouts to Local Community Councils via Stripe Connect</h4>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Earnings are calculated transparently and paid directly into your verified Local Community Council or Parish Trust bank account every month. Live ledger breakdown available inside your council back office.
                </p>
              </div>
            </div>
            <Link href="/signup/account-type" className="shrink-0 w-full md:w-auto">
              <Button size="lg" className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm h-11 px-6 gap-2 shadow-lg shadow-amber-950/60">
                Claim Your Town For Your Community Council →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. PERSONAL / RESIDENT EXCLUSIVE: EVERYDAY LIVING & PRIVACY SUITE */}
      {personaKey === 'personal' && (
        <div className="pt-6 space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-sky-500/30 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono uppercase">
                  👤 Resident & Visitor Exclusive
                </Badge>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  100% Free, Private & Algorithm-Free Everyday Community App
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  As a resident or visitor, you never pay a penny and your data is never monetized. Connect with verified town neighbours, apply for local jobs, report lost pets, book doorstep courier deliveries, and follow neighbouring Scottish villages with zero invasive ads.
                </p>
              </div>
              <Link href="/demo/login" className="shrink-0 w-full md:w-auto">
                <Button size="lg" className="w-full md:w-auto bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs h-11 px-6 gap-2 shadow-lg shadow-sky-950/60">
                  <Smartphone className="h-4 w-4" /> Try Resident App in Demo →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3. BUSINESS / MERCHANT EXCLUSIVE: 0% COMMISSION DIGITAL HIGH STREET */}
      {personaKey === 'business' && (
        <div className="pt-6 space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-mono uppercase">
                  🛍️ Merchant & High Street Trader Exclusive
                </Badge>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Keep 100% of Your Revenue with 0% Commission & Organic Reach
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Unlike corporate delivery and advertising giants that take 20% to 35% cuts, Community Hub charges zero commission on sales. Every verified resident and Highland tourist in your parish sees your daily special offers organically in their town feed.
                </p>
              </div>
              <Link href="/signup/account-type" className="shrink-0 w-full md:w-auto">
                <Button size="lg" className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-11 px-6 gap-2 shadow-lg shadow-amber-950/60">
                  <Store className="h-4 w-4" /> Register Your High Street Shop →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADVERTISER EXCLUSIVE: CIVIC SPONSORSHIP & BRAND REPUTATION */}
      {personaKey === 'advertiser' && (
        <div className="pt-6 space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs font-mono uppercase">
                  📢 Civic Sponsor & Brand Partner Exclusive
                </Badge>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Ethical Regional Sponsorships that Directly Fund Town Resilience
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Put your brand in front of engaged Highland households in a 100% brand-safe, non-toxic environment. A portion of your sponsorship spend directly funds local community generators, emergency sandbags, and village hall restoration.
                </p>
              </div>
              <Link href="/signup/account-type" className="shrink-0 w-full md:w-auto">
                <Button size="lg" className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white font-black text-xs h-11 px-6 gap-2 shadow-lg shadow-purple-950/60">
                  <Megaphone className="h-4 w-4" /> Become a Community Sponsor →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 5. REGIONAL AUTHORITY EXCLUSIVE: MULTI-COMMUNITY COMMAND & MUTUAL AID */}
      {personaKey === 'regional' && (
        <div className="pt-6 space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-teal-500/30 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-xs font-mono uppercase">
                  🌲 Regional Authority & National Park Exclusive
                </Badge>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Multi-Parish Real-Time Map, Ranger Alerts & Mutual Aid Dispatch
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Manage dozens of Scottish Highland and National Park communities under a single unified dashboard. Broadcast regional ranger advisories, monitor flood alerts across river catchments, and coordinate mutual-aid volunteer fleets between parishes.
                </p>
              </div>
              <Link href="/signup/account-type" className="shrink-0 w-full md:w-auto">
                <Button size="lg" className="w-full md:w-auto bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs h-11 px-6 gap-2 shadow-lg shadow-teal-950/60">
                  <Trees className="h-4 w-4" /> Register Regional Authority →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
