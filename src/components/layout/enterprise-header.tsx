'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
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
  Building, 
  Crown, 
  Star, 
  Newspaper, 
  Shield, 
  Truck, 
  Briefcase, 
  Store, 
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

const enterpriseNavItems = [
  { href: '/home', label: 'Home', icon: HomeIcon },
  { href: '/enterprise/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/enterprise/groups', label: 'My Groups', icon: Building2 },
  { href: '/enterprise/storefront', label: 'Storefront', icon: Store },
  { href: '/enterprise/team', label: 'Team', icon: UsersIcon },
  { href: '/enterprise/adverts', label: 'Adverts', icon: Megaphone },
  { href: '/enterprise/events', label: 'Events', icon: Calendar },
  { href: '/enterprise/gallery', label: 'Gallery', icon: GalleryHorizontal },
  { href: '/enterprise/billing', label: 'Billing', icon: CreditCard },
];

export default function EnterpriseHeader() {
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
    
    const userStatusRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userStatusRef, {
            isOnline: false,
            lastSeen: serverTimestamp()
        });
    } catch (error) {
        console.error("Failed to set user offline before logout:", error);
    }
    
    await signOut(auth);
    router.push('/');
  };

  const isVisiting = useMemo(() => !!(userProfile && userProfile.communityId !== userProfile.homeCommunityId), [userProfile]);

  return (
    <header className={cn("sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6")}>
      {isClient && <MobileNav menuItems={enterpriseNavItems as any} />}
      <Link href="/enterprise/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base">
        <Logo className="h-6 w-6" />
        <span className="hidden sm:inline-block">Enterprise Panel</span>
      </Link>
      <nav className="hidden w-full flex-1 md:flex">
        <div className="flex w-full items-center justify-center gap-1 flex-wrap py-2">
            {enterpriseNavItems.map((item) => (
                <Button
                    key={item.href}
                    variant="ghost"
                    asChild
                    size="sm"
                    className={cn(
                    'justify-start text-xs',
                    pathname === item.href && 'bg-primary text-primary-foreground'
                    )}
                >
                    <Link href={item.href}><item.icon className="mr-2 h-4 w-4" />{item.label}</Link>
                </Button>
            ))}
        </div>
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
                        {profileLoading ? (
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">Loading...</p>
                                <p className="text-xs leading-none text-muted-foreground">Please wait</p>
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
                        <DropdownMenuItem asChild><Link href="/home"><HomeIcon className="mr-2 h-4 w-4" />Return to Main App</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href={`/profile/${user.uid}`}><UserIcon className="mr-2 h-4 w-4" /><span>My Public Profile</span></Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/settings"><SettingsIcon className="mr-2 h-4 w-4" /><span>Settings</span></Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} disabled={isVisiting}><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href="/report-issue"><SettingsIcon className="mr-2 h-4 w-4" /><span>Report an Issue</span></Link></DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                ) : <Button asChild><Link href="/">Sign In</Link></Button>
            ) : <Skeleton className="h-8 w-16" />}
        </div>
    </header>
  );
}