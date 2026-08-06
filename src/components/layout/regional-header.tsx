'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Home as HomeIcon, 
  User as UserIcon, 
  Users as UsersIcon, 
  LogOut, 
  Map as MapIcon, 
  Megaphone, 
  Building, 
  Crown, 
  Star, 
  Newspaper, 
  Shield, 
  Truck, 
  Briefcase,
  Radio,
  Settings as SettingsIcon,
  Globe,
  ExternalLink,
  ChevronDown,
  Camera
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

const getInitials = (name: string | undefined) => {
  if (!name) return 'RN';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function RegionalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const homeFeedId = userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId;
  const homeFeedHref = homeFeedId ? `/home?community=${homeFeedId}` : '/home';

  const regionalNavItems = useMemo(() => [
    { href: homeFeedHref, label: 'Home Feed', icon: HomeIcon },
    { href: '/regional/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/regional/map', label: 'Boundary & Perimeter Map', icon: MapIcon },
    { href: '/regional/communities', label: 'Encompassed Communities', icon: Globe },
    { href: '/regional/broadcasts', label: 'Regional Broadcasts', icon: Radio },
    { href: '#', label: 'Public Site', icon: ExternalLink, subItems: [
      { href: '/regional/public-site', label: 'Public Billboard', icon: ExternalLink },
      { href: '/regional/public-site/photos', label: 'Photos', icon: Camera },
    ]},
    { href: '/regional/settings', label: 'Authority Settings', icon: SettingsIcon },
  ], [homeFeedHref]);

  const handleLogout = async () => {
    if (!auth || !user || !firestore) return;
    const userStatusRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userStatusRef, {
        isOnline: false,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to set user offline:", error);
    }
    await signOut(auth);
    router.push('/');
  };

  const dashboards = useMemo(() => {
    const availableDashboards: { href?: string; onClick?: () => void; label: string; icon: React.ElementType }[] = [];
    if (!userProfile) return [];

    if (userProfile.accountType === 'regional' || userProfile.permissions?.isRegionalNetwork) {
      availableDashboards.push({ href: '/regional/dashboard', label: 'Regional Network', icon: MapIcon });
    }
    if (userProfile.accountType === 'business' || userProfile.permissions?.isBusinessOwner) {
      availableDashboards.push({ href: '/business/dashboard', label: 'Business', icon: Briefcase });
    }
    if (userProfile.accountType === 'leader' || userProfile.role === 'president') {
      availableDashboards.push({ href: '/leader/dashboard', label: 'Leader', icon: Crown });
    }

    return Array.from(new Map(availableDashboards.map(item => [item.label, item])).values());
  }, [userProfile]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center px-4">
        <MobileNav menuItems={regionalNavItems as any} />
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/regional/dashboard" className="flex items-center space-x-2">
            <Logo className="h-8 w-8 text-emerald-600" />
            <span className="inline-block font-bold text-lg font-headline">
              Regional Back-Office
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
            {regionalNavItems.map((item: any) => (
              item.subItems ? (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center text-sm font-medium transition-colors hover:text-primary outline-none",
                        pathname?.startsWith('/regional/public-site') ? "text-emerald-600 font-bold" : "text-muted-foreground"
                      )}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                      <ChevronDown className="ml-1 h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {item.subItems.map((sub: any) => (
                      <DropdownMenuItem key={sub.href} asChild>
                        <Link href={sub.href} className="flex items-center">
                          <sub.icon className="mr-2 h-4 w-4" />
                          {sub.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors hover:text-primary",
                    pathname === item.href ? "text-emerald-600 font-bold" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              )
            ))}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {userProfile && (
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-sm font-semibold text-foreground">
                {userProfile.organizationName || userProfile.businessName || userProfile.name}
              </span>
              <span className="text-xs text-emerald-600 font-medium">Regional Network Authority</span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-emerald-500">
                  <AvatarImage src={userProfile?.photoURL} alt={userProfile?.name} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold">
                    {getInitials(userProfile?.organizationName || userProfile?.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userProfile?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {dashboards.map((dash) => (
                  <DropdownMenuItem key={dash.label} onClick={() => dash.href && router.push(dash.href)}>
                    <dash.icon className="mr-2 h-4 w-4" />
                    <span>{dash.label} Dashboard</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
