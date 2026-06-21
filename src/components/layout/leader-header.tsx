'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Home as HomeIcon,
  User as UserIcon,
  Users as UsersIcon,
  Bell,
  LogOut,
  Building,
  Briefcase,
  Star,
  Megaphone,
  Calendar,
  Tv,
  Newspaper,
  MessagesSquare,
  Heart,
  Building2,
  Map as MapIcon,
  Loader2,
  Store,
  ChevronDown,
  Shield,
  Truck,
  ShieldAlert,
  Settings as SettingsIcon,
  Crown,
  ShoppingCart,
  BadgeHelp,
  Siren,
  FileText,
  DollarSign,
  Info,
  ListTodo,
  Sparkles,
  HeartHandshake
} from 'lucide-react';

import { signOut } from 'firebase/auth';
import { doc, collection, query, where, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';

import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { MobileNav } from './mobile-nav';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { type Notification } from '@/lib/types/notifications';
import { useToast } from '@/hooks/use-toast';

const mainLeaderNavItems = [
  { href: '/leader/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'viewDashboard' },
  { href: '/leader/members', label: 'Members', icon: UsersIcon, permission: 'viewUsers' },
];

const reviewSubItems = [
    { href: '/leader/reports', label: 'Reports', icon: FileText, permission: 'viewReports' },
    { href: '/leader/applications', label: 'Applications', icon: Shield, permission: 'viewApplications' },
    { href: '/leader/reviews', label: 'Guest Book Reviews', icon: Star, permission: 'actionApproveGuestBook' },
];

const contentSubItems = [
    { href: '/leader/news', label: 'News', icon: Newspaper, permission: 'viewNewsManagement' },
    { href: '/leader/events', label: 'Events', icon: Calendar, permission: 'viewEvents' },
    { href: '/leader/whatson', label: "What's On", icon: Tv, permission: 'viewWhatson' },
    { href: '/leader/forum', label: 'Forum', icon: MessagesSquare, permission: 'viewForumManagement' },
    { href: '/leader/faq', label: 'FAQ', icon: BadgeHelp, permission: 'viewFaq' },
    { href: '/leader/charities', label: 'Local Charities', icon: Heart, permission: 'viewCharities' },
    { href: '/leader/about', label: 'About Page', icon: Info, permission: 'viewAbout' },
    { href: '/leader/lost-and-found', label: 'Lost & Found', icon: HeartHandshake, permission: 'viewLostAndFound' },
];

const businessSubItemsList = [
    { href: '/leader/businesses', label: 'Businesses', icon: Briefcase, permission: 'viewBusinesses' },
    { href: '/leader/adverts', label: 'Adverts', icon: Megaphone, permission: 'viewAdverts' },
];

const adminSubItems = [
    { href: '/leader/announcements', label: 'Announcements', icon: Megaphone, permission: 'viewAnnouncements' },
    { href: '/leader/marketing', label: 'Marketing', icon: Sparkles, permission: 'viewMarketing' },
    { href: '/leader/financials', label: 'Financials', icon: DollarSign, permission: 'viewFinancials' },
    { href: '/leader/polls', label: 'Polls', icon: ListTodo, permission: 'viewPolls' },
    { href: '/leader/settings', label: 'Community Settings', icon: SettingsIcon, permission: 'viewSettings' },
];

const getInitials = (name: string | undefined) => {
  if (!name) return 'CH';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
};

export default function LeaderHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const handleAdminDashboardClick = useCallback(() => {
    const email = user?.email || userProfile?.email;
    if (!email) {
      toast({ title: "Error", description: "Could not retrieve email.", variant: "destructive" });
      return;
    }
    window.location.href = `https://admin.my-community-hub.co.uk/?email=${encodeURIComponent(email)}`;
  }, [user, userProfile, toast]);
  
  const handleAdvertiserDashboardClick = useCallback(() => {
    const email = user?.email || userProfile?.email;
    if (!email) {
      toast({ title: "Error", description: "Could not retrieve email.", variant: "destructive" });
      return;
    }
    window.location.href = `https://www.advertiser.my-community-hub.co.uk/?email=${encodeURIComponent(email)}`;
  }, [user, userProfile, toast]);
  
  const handleCourierDashboardClick = useCallback(() => {
    const email = user?.email || userProfile?.email;
    if (!email) {
      toast({ title: "Error", description: "Could not retrieve email.", variant: "destructive" });
      return;
    }
    window.location.href = `https://www.courier.my-community-hub.co.uk/?email=${encodeURIComponent(email)}`;
  }, [user, userProfile, toast]);

  const handleLogout = useCallback(async () => {
    if (!auth || !user || !firestore) return;
    const userStatusRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userStatusRef, { isOnline: false, lastSeen: serverTimestamp() });
    } catch (error) {
        console.error("Failed to set user offline before logout:", error);
    }
    
    await signOut(auth);
    router.push('/');
  }, [auth, user, firestore, router]);

  useEffect(() => {
    if (!user || !firestore) {
      setLoadingNotifications(false);
      return;
    }
    const q = query(collection(firestore, "notifications"), where("recipientId", "==", user.uid), where("status", "==", "new"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
        setLoadingNotifications(false);
    });
    return () => unsubscribe();
  }, [user, firestore]);

  const dashboards = useMemo(() => {
    const availableDashboards: { href?: string; onClick?: () => void; label: string; icon: React.ElementType }[] = [];
    if (!userProfile) return [];

    const isPlatformStaff = userProfile.permissions?.isStaff === true;

    if (isPlatformStaff) {
      availableDashboards.push({ onClick: handleAdminDashboardClick, label: 'Admin', icon: LayoutDashboard });
    }

    const isAnyLeader = (userProfile.role && ['president', 'leader', 'vice-president'].includes(userProfile.role)) ||
      (userProfile.communityRoles && Object.values(userProfile.communityRoles).some((r: any) => ['president', 'leader', 'vice-president'].includes(r.role))) ||
      userProfile.permissions?.hasBackOfficeAccess ||
      ['owner', 'admin', 'administrator'].includes(userProfile.accountType);
    
    if (isAnyLeader) {
      availableDashboards.push({ href: '/leader/dashboard', label: 'Leader', icon: Crown });
    }

    if (userProfile.accountType === 'business' || userProfile.permissions?.isBusinessOwner || userProfile.permissions?.isBusinessTeamMember) {
      availableDashboards.push({ href: '/business/dashboard', label: 'Business', icon: Briefcase });
    }
    
    if (userProfile.accountType === 'enterprise' || userProfile.permissions?.isEnterpriseUser) {
      availableDashboards.push({ href: '/enterprise/dashboard', label: 'Enterprise', icon: Building });
    }

    if (userProfile.accountType === 'advertiser' || userProfile.accountType === 'national') {
      availableDashboards.push({ onClick: handleAdvertiserDashboardClick, label: 'Advertiser', icon: Star });
    }

    if (userProfile.role === 'reporter') {
      availableDashboards.push({ href: '/reporter/dashboard', label: 'Reporter', icon: Newspaper });
    }

    const isPoliceLiaison = (userProfile.role === 'police-liaison-officer') || 
                            (userProfile.communityRoles && Object.values(userProfile.communityRoles).some((r: any) => r.role === 'police-liaison-officer'));
    if (isPoliceLiaison) {
        availableDashboards.push({ href: '/leader/dashboard', label: 'Police', icon: Shield });
    }

    if (userProfile.permissions?.isCourier) {
        availableDashboards.push({ onClick: handleCourierDashboardClick, label: 'Courier', icon: Truck });
    }
    
    return Array.from(new Map(availableDashboards.map(item => [item.label, item])).values());
  }, [userProfile, handleAdminDashboardClick, handleAdvertiserDashboardClick, handleCourierDashboardClick]);

  const allLeaderMenuItems = useMemo(() => {
    if (!userProfile) return [];

    const impersonating = (userProfile as any)?.impersonating;
    const activeCommunityId = impersonating?.communityId || userProfile.communityId;
    const communityRoleData = activeCommunityId ? userProfile.communityRoles?.[activeCommunityId] : null;

    const permissions = communityRoleData?.permissions || userProfile.permissions || {};
    const activeRole = communityRoleData?.role || userProfile.role;

    const isPlatformAdmin = ['owner', 'admin', 'administrator'].includes(userProfile.accountType);
    const hasAccess = (permissionKey: string) => {
        if (isPlatformAdmin) return true;
        if (activeRole === 'president' || activeRole === 'admin' || activeRole === 'owner') return true;
        return !!permissions[permissionKey];
    };
    
    const visibleMainItems = mainLeaderNavItems.filter(item => hasAccess(item.permission));
    const visibleReviewItems = reviewSubItems.filter(item => hasAccess(item.permission));
    const visibleContentItems = contentSubItems.filter(item => hasAccess(item.permission));
    const visibleBusinessItems = businessSubItemsList.filter(item => hasAccess(item.permission));
    const visibleAdminItems = adminSubItems.filter(item => hasAccess(item.permission));

    const all = [...visibleMainItems];
    if (visibleReviewItems.length > 0) all.push({ href: '#', label: 'Review', icon: FileText, subItems: visibleReviewItems });
    if (visibleContentItems.length > 0) all.push({ href: '#', label: 'Content', icon: MapIcon, subItems: visibleContentItems });
    if (visibleBusinessItems.length > 0) all.push({ href: '#', label: 'Business', icon: Briefcase, subItems: visibleBusinessItems });
    if (visibleAdminItems.length > 0) all.push({ href: '#', label: 'Administration', icon: SettingsIcon, subItems: visibleAdminItems });

    return all;
  }, [userProfile]);

  const isVisiting = useMemo(() => !!(userProfile && userProfile.communityId !== userProfile.homeCommunityId), [userProfile]);

  return (
    <header className={cn("sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6")}>
      {isClient && <MobileNav menuItems={allLeaderMenuItems as any} />}
      <Link href="/leader/dashboard" className="mr-4 flex items-center gap-2 text-lg font-bold shrink-0">
        <Logo className="h-8 w-8" />
        <span className="text-primary hidden sm:inline-block">Leader Panel</span>
      </Link>

      <nav className="hidden w-full flex-1 md:flex">
        <div className="flex w-full items-center justify-center gap-1 flex-wrap py-2">
          {allLeaderMenuItems.map((item) => (
            item.subItems ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="justify-start text-xs">
                    <item.icon className="mr-2 h-4 w-4" />{item.label}<ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {item.subItems.map((subItem: any) => (
                    <DropdownMenuItem key={subItem.href} asChild>
                      <Link href={subItem.href}><subItem.icon className="mr-2 h-4 w-4" /> {subItem.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                key={item.href}
                variant="ghost"
                asChild
                size="sm"
                className={cn('justify-start text-xs', pathname === item.href && 'bg-primary text-primary-foreground')}
              >
                <Link href={item.href}><item.icon className="mr-2 h-4 w-4" />{item.label}</Link>
              </Button>
            )
          ))}
        </div>
      </nav>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        {isClient ? (
            user ? (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                            <AvatarFallback>{userProfile ? getInitials(userProfile.name) : '...'}</AvatarFallback>
                        </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {dashboards.length > 0 && (
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Dashboards</DropdownMenuLabel>
                            {dashboards.map((dash) => (
                                <DropdownMenuItem key={dash.label} onClick={dash.onClick || (() => router.push(dash.href!))}>
                                    <dash.icon className="mr-2 h-4 w-4" />{dash.label} Dashboard
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link href="/home"><HomeIcon className="mr-2 h-4 w-4" />Public Home</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link href={`/profile/${user.uid}`}><UserIcon className="mr-2 h-4 w-4" /><span>My Profile</span></Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/settings"><SettingsIcon className="mr-2 h-4 w-4" /><span>Settings</span></Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} disabled={isVisiting}><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            ) : <Button asChild><Link href="/">Sign In</Link></Button>
        ) : <Skeleton className="h-8 w-16" />}
      </div>
    </header>
  );
}
