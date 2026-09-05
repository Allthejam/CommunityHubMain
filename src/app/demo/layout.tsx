'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { SandboxFirebaseClientProvider } from '@/firebase/sandbox-client-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ShieldAlert,
  Store,
  Users as UsersIcon,
  User as UserIcon,
  Megaphone,
  Trees,
  LogOut,
  Sparkles,
  Database,
  Radio,
  ChevronDown,
  Building2,
  FileText,
  Map as MapIcon,
  Bus,
  ShoppingCart,
  MessagesSquare,
  Newspaper,
  Calendar as CalendarIcon,
  Tv,
  Briefcase,
  Star,
  HeartHandshake,
  Heart,
  Settings as SettingsIcon,
  Siren,
  Home as HomeIcon,
  LayoutDashboard,
  Crown,
  MapPin,
  ArrowLeft,
  Navigation,
  Globe,
  DollarSign,
  GalleryHorizontal,
  CreditCard,
  BadgeHelp,
  Info,
  ListTodo,
  Target,
  BookOpen,
  Shield,
  Tag,
  Search
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { CommunitySelector, type CommunitySelection } from '@/components/community-selector';
import { ScrollArea } from '@/components/ui/scroll-area';

const PERSONA_CONFIGS: Record<string, {
  name: string;
  email: string;
  roleLabel: string;
  accountType: string;
  icon: any;
  color: string;
  badge: string;
  dashboardUrl: string | null;
  dashboardLabel: string | null;
}> = {
  leader: {
    name: 'Fiona Macleod (Leader)',
    email: 'leader.fiona@oakridge-council.org.uk',
    roleLabel: 'Community Council President',
    accountType: 'leader',
    icon: Crown,
    color: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dashboardUrl: '/demo/leader/dashboard',
    dashboardLabel: 'Leader Dashboard',
  },
  business: {
    name: 'Callum Stewart (Merchant)',
    email: 'callum@oakridge-butchery.co.uk',
    roleLabel: 'High Street Business Owner',
    accountType: 'business',
    icon: Store,
    color: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dashboardUrl: '/demo/business/dashboard',
    dashboardLabel: 'Business Dashboard',
  },
  personal: {
    name: 'Morag Campbell (Resident)',
    email: 'morag.campbell@oakridge-resident.net',
    roleLabel: 'Verified Parish Resident',
    accountType: 'personal',
    icon: UsersIcon,
    color: 'text-sky-400',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    dashboardUrl: null, // Strict rule: 0 backoffice dashboards for personal resident
    dashboardLabel: null,
  },
  advertiser: {
    name: 'Marcus Vance (Brand Director)',
    email: 'marcus.vance@demoville-partners.com',
    roleLabel: 'National Civic Partner',
    accountType: 'advertiser',
    icon: Megaphone,
    color: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    dashboardUrl: '/demo/national/dashboard',
    dashboardLabel: 'Advertiser Dashboard',
  },
  regional: {
    name: 'Alastair Roy (Ranger Service)',
    email: 'alastair.roy@demoville-authority.gov.uk',
    roleLabel: 'Regional Network Authority',
    accountType: 'regional',
    icon: Trees,
    color: 'text-teal-400',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    dashboardUrl: '/demo/regional/dashboard',
    dashboardLabel: 'Regional Dashboard',
  },
};

// ─── LEADER BACKOFFICE SUBMENUS (Exact Match to live leader-header.tsx) ───────────────
const leaderReviewSubItems = [
  { href: '/demo/leader/reports', label: 'Reports', icon: FileText },
  { href: '/demo/leader/applications', label: 'Applications', icon: Shield },
  { href: '/demo/leader/reviews', label: 'Guest Book Reviews', icon: Star },
];

const leaderContentSubItems = [
  { href: '/demo/leader/travel', label: 'Travel & Transit', icon: Navigation },
  { href: '/demo/leader/news', label: 'News', icon: Newspaper },
  { href: '/demo/leader/events', label: 'Events', icon: CalendarIcon },
  { href: '/demo/leader/whatson', label: "What's On", icon: Tv },
  { href: '/demo/leader/forum', label: 'Forum', icon: MessagesSquare },
  { href: '/demo/leader/faq', label: 'FAQ', icon: BadgeHelp },
  { href: '/demo/leader/charities', label: 'Local Charities', icon: Heart },
  { href: '/demo/leader/about', label: 'About Page', icon: Info },
  { href: '/demo/leader/lost-and-found', label: 'Lost & Found', icon: HeartHandshake },
];

const leaderBusinessSubItems = [
  { href: '/demo/leader/businesses', label: 'Businesses', icon: Briefcase },
  { href: '/demo/leader/adverts', label: 'Adverts', icon: Megaphone },
];

const leaderAdminSubItems = [
  { href: '/demo/leader/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/demo/leader/marketing', label: 'Marketing', icon: Sparkles },
  { href: '/demo/leader/financials', label: 'Financials', icon: DollarSign },
  { href: '/demo/leader/polls', label: 'Polls', icon: ListTodo },
  { href: '/demo/leader/campaigns', label: 'Petitions', icon: Target },
  { href: '/demo/leader/settings', label: 'Community Settings', icon: SettingsIcon },
];

// ─── PUBLIC HUB SUBMENUS (Exact Match to live header.tsx) ─────────────────────────
const discoverSubItems = [
  { href: '/demo/travel', label: 'Local Travel & Transit', icon: Navigation },
  { href: '/demo/events', label: 'Events', icon: CalendarIcon },
  { href: '/demo/whatson', label: "What's On", icon: Tv },
  { href: '/demo/news', label: 'News', icon: Newspaper },
  { href: '/demo/directory', label: 'Businesses', icon: Building2 },
  { href: '/demo/enterprise-partners', label: 'Enterprise Partners', icon: Briefcase },
  { href: '/demo/national-advertisers', label: 'National Advertisers', icon: Star },
  { href: '/demo/regional-networks', label: 'Regional Networks', icon: MapIcon },
];

const engageSubItems = [
  { href: '/demo/communities', label: 'Community Map', icon: MapIcon },
  { href: '/demo/forum', label: 'Forum', icon: UsersIcon },
  { href: '/demo/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/demo/marketplace', label: 'Buy, Swap & Sell', icon: ShoppingCart },
  { href: '/demo/lost-and-found', label: 'Lost & Found', icon: HeartHandshake },
  { href: '/demo/charities', label: 'Charities', icon: Heart },
  { href: '/demo/polls', label: 'Polls', icon: BadgeHelp },
  { href: '/demo/campaigns', label: 'Local Petitions', icon: Target },
  { href: '/demo/guestbook', label: 'Guest Book', icon: BookOpen },
];

function DemoLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const isOwner = (
    user?.email === 'allan_jamieson@outlook.com' ||
    userProfile?.accountType === 'owner' ||
    userProfile?.role === 'owner'
  );

  const [currentPersona, setCurrentPersona] = useState<string>('leader');
  const [isCommunityDialogOpen, setIsCommunityDialogOpen] = useState(false);
  const [communitySelection, setCommunitySelection] = useState<CommunitySelection | null>({
    country: 'GB',
    state: 'Scotland',
    region: 'Highland',
    community: '9ayHMyZf4SRw2gof1AM9',
  });
  const [isLocationVerified, setIsLocationVerified] = useState(true);

  const visitedId = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') || '9ayHMyZf4SRw2gof1AM9' : '9ayHMyZf4SRw2gof1AM9';
  const communityRef = useMemoFirebase(() => (visitedId && db ? doc(db, 'communities', visitedId) : null), [visitedId, db]);
  const { data: communityDoc } = useDoc<any>(communityRef);

  const activeCommunityName = communityDoc?.name || 'Show Home Community';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('sandboxPersona') || 'leader';
      setCurrentPersona(saved);
    }
  }, [pathname]);

  const activePersona = PERSONA_CONFIGS[currentPersona] || PERSONA_CONFIGS.leader;
  const PersonaIcon = activePersona.icon;

  const isLoginPage = pathname === '/demo' || pathname === '/demo/login' || pathname.startsWith('/demo/register') || pathname.startsWith('/demo/signup');

  const isLeaderBackoffice = pathname === '/demo/leader' || pathname.startsWith('/demo/leader/');
  const isBusinessBackoffice = pathname === '/demo/business' || pathname.startsWith('/demo/business/');
  const isNationalBackoffice = pathname === '/demo/national' || pathname.startsWith('/demo/national/');
  const isRegionalBackoffice = pathname === '/demo/regional' || pathname.startsWith('/demo/regional/');
  const isShoppingPage = pathname === '/demo/shopping' || pathname.startsWith('/demo/shopping/');

  const handleCommunitySwitch = () => {
    setIsCommunityDialogOpen(false);
    router.push('/demo/home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      {/* 1. TOP AIR-GAP DEMO HUD BANNER */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-950 to-teal-950 border-b border-emerald-500/30 text-white text-xs py-2 px-4 sticky top-0 z-[80] shadow-xl backdrop-blur-md">
        <div className="container max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <Link href="/showcase">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-black bg-slate-900/90 border-sky-400/60 text-sky-300 hover:text-white hover:bg-sky-950 gap-1.5 px-3 shadow-md"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-sky-400" />
                <span>Back to Showcase</span>
              </Button>
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/50 text-[10px] font-mono uppercase font-bold px-2 py-0.5">
                🛡️ 100% Demo Sandbox (comfeed)
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
            {/* CURRENT PERSONA BADGE */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <PersonaIcon className={`h-3.5 w-3.5 ${activePersona.color}`} />
              <span className="text-slate-300 text-[11px]">Simulating:</span>
              <strong className="text-white text-[11px]">{activePersona.roleLabel}</strong>
            </div>

            <Link href="/demo/login">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-bold bg-slate-900 border-slate-700 text-emerald-300 hover:text-white gap-1 px-2.5 shadow-sm"
              >
                <Sparkles className="h-3 w-3 text-emerald-400" /> Switch Role
              </Button>
            </Link>
            <Link href="/showcase">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-bold text-sky-300 hover:text-white hover:bg-sky-950/60 gap-1 px-2"
              >
                <LogOut className="h-3 w-3 text-sky-400" /> Exit Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>

        {/* 2. DEMO APPLICATION HEADER */}
        {!isLoginPage && (
          <header className="sticky top-[37px] z-[70] backdrop-blur-md bg-background/95 border-b border-border">
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
              {/* BRAND LOGO */}
              <div className="flex items-center gap-3">
                {isShoppingPage ? (
                  <Link href="/demo/shopping" className="flex items-center gap-2 font-bold text-lg mr-2">
                    <Store className="w-8 h-8 text-primary" />
                    <div>
                      <span className="text-primary hidden sm:inline-block leading-tight font-black text-lg">
                        Community Marketplace
                      </span>
                      <p className="text-[11px] text-muted-foreground font-normal hidden sm:block leading-tight">
                        Shop Local
                      </p>
                    </div>
                  </Link>
                ) : (
                  <Link href="/demo/home" className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-md">
                      <Radio className="h-5 w-5 text-slate-950" />
                    </div>
                    <span className="font-black text-xl tracking-tight font-headline text-foreground">
                      Community<span className="text-emerald-500">Hub</span>
                      <span className="ml-1.5 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
                        Demo
                      </span>
                    </span>
                  </Link>
                )}

                {/* Backoffice Badge Indicator */}
                {isLeaderBackoffice && (
                  <Badge variant="outline" className="hidden sm:inline-flex bg-emerald-950/40 text-emerald-300 border-emerald-500/40 text-xs font-bold gap-1">
                    <Crown className="h-3 w-3" /> Leader Console
                  </Badge>
                )}
                {isBusinessBackoffice && (
                  <Badge variant="outline" className="hidden sm:inline-flex bg-amber-950/40 text-amber-300 border-amber-500/40 text-xs font-bold gap-1">
                    <Store className="h-3 w-3" /> Merchant Portal
                  </Badge>
                )}
                {isNationalBackoffice && (
                  <Badge variant="outline" className="hidden sm:inline-flex bg-purple-950/40 text-purple-300 border-purple-500/40 text-xs font-bold gap-1">
                    <Megaphone className="h-3 w-3" /> Brand Sponsor Portal
                  </Badge>
                )}
                {isRegionalBackoffice && (
                  <Badge variant="outline" className="hidden sm:inline-flex bg-teal-950/40 text-teal-300 border-teal-500/40 text-xs font-bold gap-1">
                    <Trees className="h-3 w-3" /> Regional Authority Console
                  </Badge>
                )}
              </div>

              {/* NAVIGATION BAR - ADAPTS ACCORDING TO SHOPPING / BACKOFFICE / PUBLIC */}
              <nav className="hidden lg:flex items-center gap-1">
                {isShoppingPage ? (
                  /* 2A. DEDICATED SHOPPING MARKETPLACE NAVIGATION (Matches live shopping-header.tsx) */
                  <>
                    <Link href="/demo/home">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <HomeIcon className="h-3.5 w-3.5" /> Back to App
                      </Button>
                    </Link>
                    <Link href="/demo/shopping">
                      <Button variant={pathname === '/demo/shopping' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <Store className="h-3.5 w-3.5" /> Shop Home
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                          <Store className="h-3.5 w-3.5 text-amber-500" />
                          <span>The Highstreet</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem asChild>
                          <Link href="/demo/shopping/highstreet" className="cursor-pointer text-xs flex items-center gap-2">
                            <Store className="h-4 w-4 text-amber-500" />
                            <span>The Highstreet</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/demo/shopping/favourites/local" className="cursor-pointer text-xs flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-500" />
                            <span>Local Favourites</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/demo/directory" className="cursor-pointer text-xs flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-emerald-500" />
                            <span>All Businesses</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Link href="/demo/chat">
                      <Button variant={pathname === '/demo/chat' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <MessagesSquare className="h-3.5 w-3.5" /> Community Chat
                      </Button>
                    </Link>
                    <Link href="/demo/shopping/offers">
                      <Button variant={pathname === '/demo/shopping/offers' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <Tag className="h-3.5 w-3.5 text-emerald-500" /> Special Offers
                      </Button>
                    </Link>
                  </>
                ) : isLeaderBackoffice ? (
                  <>
                    <Link href="/demo/leader/dashboard">
                      <Button variant={pathname === '/demo/leader/dashboard' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                      </Button>
                    </Link>
                    <Link href="/demo/leader/members">
                      <Button variant={pathname.startsWith('/demo/leader/members') ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <UsersIcon className="h-3.5 w-3.5" /> Members
                      </Button>
                    </Link>
                    <Link href="/demo/leader/emergency-plan">
                      <Button variant={pathname.startsWith('/demo/leader/emergency-plan') ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1 text-red-400">
                        <ShieldAlert className="h-3.5 w-3.5" /> Emergency Plan
                      </Button>
                    </Link>

                    {/* LEADER REVIEW SUBMENU */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                          <span>Review</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuLabel className="text-xs font-bold">Review & Moderation</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {leaderReviewSubItems.map((item) => (
                          <DropdownMenuItem key={item.label} asChild>
                            <Link href={item.href} className="cursor-pointer text-xs flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-emerald-500" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* LEADER CONTENT SUBMENU */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                          <span>Content</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuLabel className="text-xs font-bold">Content Management</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {leaderContentSubItems.map((item) => (
                          <DropdownMenuItem key={item.label} asChild>
                            <Link href={item.href} className="cursor-pointer text-xs flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-emerald-500" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* LEADER BUSINESS SUBMENU */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                          <span>Business</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuLabel className="text-xs font-bold">Business Network</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {leaderBusinessSubItems.map((item) => (
                          <DropdownMenuItem key={item.label} asChild>
                            <Link href={item.href} className="cursor-pointer text-xs flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-emerald-500" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* LEADER ADMIN SUBMENU */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                          <span>Admin</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel className="text-xs font-bold">Civic Administration</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {leaderAdminSubItems.map((item) => (
                          <DropdownMenuItem key={item.label} asChild>
                            <Link href={item.href} className="cursor-pointer text-xs flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-emerald-500" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Link href="/demo/home">
                      <Button variant="outline" size="sm" className="text-xs font-bold h-9 gap-1 ml-2 border-slate-700">
                        <HomeIcon className="h-3.5 w-3.5" /> Return to Public Hub
                      </Button>
                    </Link>
                  </>
                ) : isBusinessBackoffice ? (
                  /* 2B. FULL BUSINESS BACKOFFICE NAVIGATION (Matches live business-header.tsx) */
                  <>
                    <Link href="/demo/business/dashboard">
                      <Button variant={pathname === '/demo/business/dashboard' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                      </Button>
                    </Link>
                    <Link href="/demo/business/dashboard">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <Building2 className="h-3.5 w-3.5" /> My Listings
                      </Button>
                    </Link>
                    <Link href="/demo/shopping">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <Store className="h-3.5 w-3.5" /> Storefront
                      </Button>
                    </Link>
                    <Link href="/demo/business/dashboard">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <UsersIcon className="h-3.5 w-3.5" /> Team
                      </Button>
                    </Link>
                    <Link href="/demo/shopping">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <Megaphone className="h-3.5 w-3.5" /> My Adverts
                      </Button>
                    </Link>
                    <Link href="/demo/feed">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" /> My Events
                      </Button>
                    </Link>
                    <Link href="/demo/business/dashboard">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <CreditCard className="h-3.5 w-3.5" /> Billing
                      </Button>
                    </Link>
                    <Link href="/demo/home">
                      <Button variant="outline" size="sm" className="text-xs font-bold h-9 gap-1 ml-2 border-slate-700">
                        <HomeIcon className="h-3.5 w-3.5" /> Return to Public Hub
                      </Button>
                    </Link>
                  </>
                ) : isNationalBackoffice ? (
                  /* 2C. FULL NATIONAL ADVERTISER BACKOFFICE NAVIGATION */
                  <>
                    <Link href="/demo/national/dashboard">
                      <Button variant={pathname === '/demo/national/dashboard' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <Megaphone className="h-3.5 w-3.5" /> Campaign Dashboard
                      </Button>
                    </Link>
                    <Link href="/demo/national/dashboard">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <Star className="h-3.5 w-3.5" /> Ad Placements
                      </Button>
                    </Link>
                    <Link href="/demo/national/dashboard">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <CreditCard className="h-3.5 w-3.5" /> Budget &amp; Billing
                      </Button>
                    </Link>
                    <Link href="/demo/home">
                      <Button variant="outline" size="sm" className="text-xs font-bold h-9 gap-1 ml-2 border-slate-700">
                        <HomeIcon className="h-3.5 w-3.5" /> Return to Public Hub
                      </Button>
                    </Link>
                  </>
                ) : isRegionalBackoffice ? (
                  /* 2D. FULL REGIONAL NETWORK BACKOFFICE NAVIGATION */
                  <>
                    <Link href="/demo/regional/dashboard">
                      <Button variant={pathname === '/demo/regional/dashboard' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <Trees className="h-3.5 w-3.5" /> Regional Dashboard
                      </Button>
                    </Link>
                    <Link href="/demo/regional/dashboard">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <MapIcon className="h-3.5 w-3.5" /> Network Communities
                      </Button>
                    </Link>
                    <Link href="/demo/regional/dashboard">
                      <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                        <Siren className="h-3.5 w-3.5" /> Regional Broadcasts
                      </Button>
                    </Link>
                    <Link href="/demo/home">
                      <Button variant="outline" size="sm" className="text-xs font-bold h-9 gap-1 ml-2 border-slate-700">
                        <HomeIcon className="h-3.5 w-3.5" /> View Network Hubs
                      </Button>
                    </Link>
                  </>
                ) : (
                  /* 2E. PUBLIC HUB NAVIGATION: Home, Feed, Travel, Shopping, Chat + Discover + Engage */
                  <>
                    <Link href="/demo/home">
                      <Button variant={pathname === '/demo/home' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <HomeIcon className="h-3.5 w-3.5" /> Home
                      </Button>
                    </Link>
                    <Link href="/demo/feed">
                      <Button variant={pathname === '/demo/feed' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <Newspaper className="h-3.5 w-3.5" /> Feed
                      </Button>
                    </Link>
                    <Link href="/demo/travel">
                      <Button variant={pathname === '/demo/travel' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <Bus className="h-3.5 w-3.5" /> Travel
                      </Button>
                    </Link>
                    <Link href="/demo/shopping">
                      <Button variant={pathname === '/demo/shopping' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <Store className="h-3.5 w-3.5" /> Shopping
                      </Button>
                    </Link>
                    <Link href="/demo/chat">
                      <Button variant={pathname === '/demo/chat' ? 'secondary' : 'ghost'} size="sm" className="text-xs font-bold h-9 gap-1">
                        <MessagesSquare className="h-3.5 w-3.5" /> Chat
                      </Button>
                    </Link>

                    {/* DISCOVER SUBMENU */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                          <span>Discover</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel className="text-xs font-bold">Discover Speyside</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {discoverSubItems.map((item) => (
                          <DropdownMenuItem key={item.label} asChild>
                            <Link href={item.href} className="cursor-pointer text-xs flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-emerald-500" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* ENGAGE SUBMENU */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs font-bold h-9 gap-1">
                          <span>Engage</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel className="text-xs font-bold">Community Action</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {engageSubItems.map((item) => (
                          <DropdownMenuItem key={item.label} asChild>
                            <Link href={item.href} className="cursor-pointer text-xs flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-emerald-500" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </nav>

              {/* USER PROFILE AVATAR DROPDOWN (Matches Live Site Structure) */}
              <div className="flex items-center gap-2">
                <Link href="/demo/search">
                  <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full hover:bg-muted" title="Search Ecosystem">
                    <Search className="h-4 w-4 text-foreground" />
                    <span className="sr-only">Search</span>
                  </Button>
                </Link>

                <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="sr-only">Open basket</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-emerald-500/40 p-0">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-emerald-950 text-emerald-300 text-xs font-bold">
                          {activePersona.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end" forceMount>
                    {/* User Profile Header */}
                    <DropdownMenuLabel className="font-normal p-3 pb-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-bold text-foreground">{activePersona.name}</p>
                        <p className="text-xs text-muted-foreground">{activePersona.email}</p>
                        <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1 pt-1">
                          <PersonaIcon className="h-3 w-3" /> {activePersona.roleLabel}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Basket & Orders */}
                    <DropdownMenuItem asChild>
                      <Link href="/demo/shopping" className="cursor-pointer text-xs">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        <span>My Basket (0 Items)</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/demo/shopping" className="cursor-pointer text-xs">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        <span>My Orders</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    {/* Role-Specific Dashboard (Exact match to live header logic) */}
                    {activePersona.dashboardUrl ? (
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-[11px] font-bold uppercase text-muted-foreground">
                          Dashboards
                        </DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={activePersona.dashboardUrl} className="cursor-pointer text-xs font-bold">
                            <PersonaIcon className="mr-2 h-4 w-4 text-emerald-500" />
                            <span>{activePersona.dashboardLabel}</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    ) : (
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground italic">
                        Personal Resident (No Backoffice Links)
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Public Community Home */}
                    <DropdownMenuItem asChild>
                      <Link href="/demo/home" className="cursor-pointer text-xs">
                        <HomeIcon className="mr-2 h-4 w-4" />
                        <span>Public Community Home</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/demo/home" className="cursor-pointer text-xs">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>My Public Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/demo/home" className="cursor-pointer text-xs">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>

                    {/* Report an Issue */}
                    <DropdownMenuItem asChild>
                      <Link href="/demo/home" className="cursor-pointer text-xs">
                        <ShieldAlert className="mr-2 h-4 w-4 text-amber-500" />
                        <span>Report an Issue</span>
                      </Link>
                    </DropdownMenuItem>

                    {/* Visit Another Community Dialog */}
                    <Dialog open={isCommunityDialogOpen} onOpenChange={setIsCommunityDialogOpen}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-xs">
                          <MapIcon className="mr-2 h-4 w-4 text-sky-500" />
                          <span>Visit Another Community</span>
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg grid grid-rows-[auto,minmax(0,1fr),auto] p-0 max-h-[90vh]">
                        <DialogHeader className="p-6 pb-0">
                          <DialogTitle>Switch Community (Demo)</DialogTitle>
                          <DialogDescription>Select a new community to view in the demo sandbox.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-auto">
                          <div className="p-6">
                            <CommunitySelector
                              selection={communitySelection}
                              onSelectionChange={setCommunitySelection}
                              isLocationVerified={isLocationVerified}
                              onVerificationChange={setIsLocationVerified}
                              allowCreation={false}
                            />
                          </div>
                        </ScrollArea>
                        <DialogFooter className="p-6 pt-0 border-t">
                          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                          <Button onClick={handleCommunitySwitch}>Switch Community</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <DropdownMenuSeparator />

                    {/* Switch Persona / Exit */}
                    <DropdownMenuItem asChild>
                      <Link href="/demo/login" className="cursor-pointer text-xs font-bold text-emerald-500">
                        <Sparkles className="mr-2 h-4 w-4" />
                        <span>Switch Persona Role...</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/" className="cursor-pointer text-xs text-red-500">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Exit Demo to Live Hub</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
        )}

        {/* 3. MAIN DEMO CONTENT */}
        <main className="flex-1">
          {(!isOwner && (isLeaderBackoffice || isBusinessBackoffice || isNationalBackoffice || isRegionalBackoffice)) ? (
            <div className="container max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 shadow-md">
                <Crown className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-black font-headline text-foreground">
                  Owner Privilege Required
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Only the platform Owner (<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-primary">allan_jamieson@outlook.com</code>) has administrative privileges to configure and edit backoffice showcase data.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild className="font-bold shadow">
                  <Link href="/demo/home">
                    Explore Public Demo Hub →
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">
                    Sign In as Owner on Live Hub
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
  );
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <SandboxFirebaseClientProvider>
      <DemoLayoutContent>{children}</DemoLayoutContent>
    </SandboxFirebaseClientProvider>
  );
}
