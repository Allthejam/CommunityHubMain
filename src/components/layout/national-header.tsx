
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Home as HomeIcon, 
  User as UserIcon, 
  Users as UsersIcon, 
  LogOut, 
  Building2, 
  Megaphone, 
  Calendar, 
  GalleryHorizontal, 
  CreditCard, 
  Eye, 
  Star, 
  Crown, 
  Building, 
  Briefcase, 
  Newspaper, 
  Shield, 
  Truck, 
  Settings as SettingsIcon,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { MobileNav } from './mobile-nav';

/**
 * GLOBAL SCOPED UTILITIES
 */
const accountTypeIcons = {
    personal: UserIcon,
    business: Briefcase,
    leader: UsersIcon,
    president: Crown,
    enterprise: Building,
    advertiser: Star,
    admin: LayoutDashboard,
    owner: LayoutDashboard,
    reporter: Newspaper,
    'police-liaison-officer': Shield,
};

const getInitials = (name: string | undefined) => {
  if (!name) return 'CH';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const navItems = [
  { href: '/national/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/national/company-profile', label: 'View Profile', icon: Eye },
  { href: '/national/company-profile/edit', label: 'Edit Profile', icon: Building2 },
  { href: '/national/adverts', label: 'Adverts', icon: Megaphone },
  { href: '/national/gallery', label: 'Gallery', icon: GalleryHorizontal },
  { href: '/national/billing', label: 'Billing', icon: CreditCard },
];

export default function NationalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isClient, setIsClient] = React.useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
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

  const dashboards = useMemo(() => {
    const availableDashboards: { href?: string; onClick?: () => void; label: string; icon: React.ElementType }[] = [];
    if (!userProfile) return [];

    const isPlatformStaff = userProfile.permissions?.isStaff === true;

    if (isPlatformStaff) {
      availableDashboards.push({ onClick: handleAdminDashboardClick, label: 'Admin', icon: LayoutDashboard });
    }

    const isAnyLeader = (userProfile.role && ['president', 'leader', 'vice-president'].includes(userProfile.role)) ||
      (userProfile.communityRoles && Object.values(userProfile.communityRoles).some((r: any) => ['president', 'leader', 'vice-president'].includes(r.role))) ||
      userProfile.permissions?.hasBackOfficeAccess;
    
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

  const handleLogout = async () => {
    if (!auth || !user || !firestore) return;

    const userRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to set user offline on logout:", error);
    }
    
    await signOut(auth);
    router.push('/');
  };

  const isVisiting = useMemo(() => !!(userProfile && userProfile.communityId !== userProfile.homeCommunityId), [userProfile]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link href="/national/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base">
          <Logo className="h-6 w-6" />
          <span className="text-primary">National Advertiser</span>
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground',
              pathname === item.href && 'text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-4">
            {isClient ? (
                user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={userProfile?.avatar} alt={userProfile?.name || 'User Avatar'} />
                                <AvatarFallback>{userProfile ? getInitials(userProfile.name) : '...'}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                        {isUserLoading || profileLoading ? (
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">Loading...</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    Please wait
                                </p>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{userProfile?.email}</p>
                                </div>
                            )}
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
                        <DropdownMenuItem asChild>
                            <Link href="/home">
                                <HomeIcon className="mr-2 h-4 w-4" />
                                Return to Main App
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href={`/profile/${user.uid}`}><UserIcon className="mr-2 h-4 w-4" /><span>My Profile</span></Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/settings"><SettingsIcon className="mr-2 h-4 w-4" /><span>Settings</span></Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} disabled={isVisiting}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                ) : (
                    <Button asChild>
                        <Link href="/">Sign In</Link>
                    </Button>
                )
            ) : (
                <Skeleton className="h-8 w-16" />
            )}
        </div>
    </header>
  );
}
