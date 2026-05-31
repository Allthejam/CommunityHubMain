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
  Newspaper,
  MessagesSquare,
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
  Tag,
  Siren,
  Calendar,
  Tv
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, onSnapshot, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';

import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { MobileNav } from './mobile-nav';
import { Badge } from '../ui/badge';
import { Sheet, SheetTrigger } from '../ui/sheet';
import { Cart } from '../cart';
import { useCart } from '@/contexts/cart-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { type Notification } from '@/lib/types/notifications';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { CommunitySelector, type CommunitySelection } from '../community-selector';
import { useToast } from '@/hooks/use-toast';
import { updateUserCommunityAction, returnToHomeCommunityAction } from '@/lib/actions/userActions';
import { runAddCommunityToLeadership } from '@/lib/actions/teamActions';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';

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

export default function ShoppingHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { cartCount } = useCart();
  
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [visitedCommunityId, setVisitedCommunityId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [isCommunityDialogOpen, setIsCommunityDialogOpen] = useState(false);
  const [communitySelection, setCommunitySelection] = useState<CommunitySelection | null>({
    id: null, country: null, state: null, region: null, community: null,
  });
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLocationVerified, setIsLocationVerified] = useState(false);

  const getInitials = useCallback((name: string | undefined) => {
    if (!name) return 'CH';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, []);

  const handleAdminDashboardClick = useCallback(() => {
    const email = user?.email || userProfile?.email;
    if (!email) {
      toast({ title: "Error", description: "Could not retrieve email.", variant: "destructive" });
      return;
    }
    window.location.href = `https://admin.my-community-hub.co.uk/?email=${encodeURIComponent(email)}`;
  }, [user, toast]);
  
  const handleAdvertiserDashboardClick = useCallback(() => {
    const email = user?.email || userProfile?.email;
    if (!email) {
      toast({ title: "Error", description: "Could not retrieve email.", variant: "destructive" });
      return;
    }
    window.location.href = `https://www.advertiser.my-community-hub.co.uk/?email=${encodeURIComponent(email)}`;
  }, [user, toast]);
  
  const handleCourierDashboardClick = useCallback(() => {
    const email = user?.email || userProfile?.email;
    if (!email) {
      toast({ title: "Error", description: "Could not retrieve email.", variant: "destructive" });
      return;
    }
    window.location.href = `https://www.courier.my-community-hub.co.uk/?email=${encodeURIComponent(email)}`;
  }, [user, toast]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const isVisiting = useMemo(() => !!(userProfile && userProfile.communityId !== userProfile.homeCommunityId), [userProfile]);

  const visitedCommunityIdEffective = useMemo(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('visitedCommunityId') || userProfile?.communityId || null;
    }
    return userProfile?.communityId || null;
  }, [userProfile?.communityId]);

  const visitedCommunityRef = useMemoFirebase(() => {
    if (!visitedCommunityIdEffective || !firestore) return null;
    return doc(firestore, 'communities', visitedCommunityIdEffective);
  }, [visitedCommunityIdEffective, firestore]);
  const { data: visitedCommunityData } = useDoc(visitedCommunityRef);
  
  const visitedCommunityHasNoLeader = useMemo(() => isVisiting && visitedCommunityData?.leaderCount === 0, [isVisiting, visitedCommunityData]);

  const dashboards = useMemo(() => {
    const availableDashboards: { href?: string; onClick?: () => void; label: string; icon: React.ElementType }[] = [];
    if (!userProfile) return [];

    const isPlatformStaff = userProfile.isStaff === true ||
                            userProfile.permissions?.isStaff === true || 
                            userProfile.permissions?.isAdmin === true ||
                            userProfile.role === 'admin' || 
                            userProfile.role === 'owner' ||
                            userProfile.accountType === 'admin' ||
                            userProfile.accountType === 'owner';
    
    if (isPlatformStaff) {
      availableDashboards.push({ onClick: handleAdminDashboardClick, label: 'Admin', icon: LayoutDashboard });
    }

    const isAnyLeader = isPlatformStaff ||
                        userProfile.permissions?.actionImpersonateLeader === true ||
                        (userProfile.role && ['president', 'leader', 'vice-president'].includes(userProfile.role)) ||
                        (userProfile.communityRoles && Object.values(userProfile.communityRoles).some((r: any) => ['president', 'leader', 'vice-president'].includes(r.role))) ||
                        userProfile.permissions?.hasBackOfficeAccess === true;

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

  const menuItems = useMemo(() => [
    { href: '/home', label: 'Back to App', icon: HomeIcon },
    { href: '/shopping', label: 'Shop Home', icon: Store },
    {
      href: '/shopping/highstreet',
      label: 'The Highstreet',
      icon: Store,
      subItems: [
          { href: '/shopping/highstreet', label: 'The Highstreet' },
          { href: '/shopping/favourites/local', label: 'Local Favourites' },
          { href: '/shopping/favourites/all', label: 'All Favourites' },
      ]
    },
    { href: '/chat', label: 'Community Chat', icon: MessagesSquare },
    { href: '/shopping/offers', label: 'Special Offers', icon: Tag },
  ], []);

  const handleLogout = useCallback(async () => {
    if (!auth || !user || !firestore) return;
    sessionStorage.removeItem('visitedCommunityId');
    sessionStorage.removeItem('visitedCommunityName');

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
    setIsClient(true);
    const updateCurrentTime = () => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    updateCurrentTime();
    const timer = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(timer);
  }, []);

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

  const handleCommunitySwitch = async () => {
    if (!communitySelection?.community || communitySelection.community === 'other' || !user) {
      toast({ title: 'No Community Selected', description: 'Please select a community to switch to.', variant: 'destructive' });
      return;
    }
    setIsSwitching(true);
    const result = await updateUserCommunityAction({ userId: user.uid, communityId: communitySelection.community });
    if (result.success && result.communityName) {
      setIsCommunityDialogOpen(false);
      sessionStorage.setItem('visitedCommunityId', communitySelection.community);
      sessionStorage.setItem('visitedCommunityName', result.communityName);
      setVisitedCommunityId(communitySelection.community);
      toast({ title: 'Community Switched!', description: `You are now viewing the ${result.communityName} hub.` });
      window.location.reload();
    } else {
      toast({ title: 'Switch Failed', description: result.error || 'Could not switch communities.', variant: 'destructive' });
    }
    setIsSwitching(false);
  }
  
  const handleReturnHome = async () => {
    if (!user) return;
    setIsSwitching(true);
    const result = await returnToHomeCommunityAction({ userId: user.uid });
    if (result.success) {
      sessionStorage.removeItem('visitedCommunityId');
      sessionStorage.removeItem('visitedCommunityName');
      setVisitedCommunityId(null);
      toast({ title: 'Returned Home' });
      window.location.reload();
    } else {
      toast({ title: "Error Returning Home", description: result.error, variant: 'destructive' });
    }
    setIsSwitching(false);
  }
  
  const handleClaimLeadership = async () => {
    if (!user || !visitedCommunityIdEffective) {
        toast({ title: "Error", description: "You must be logged in to claim a community.", variant: "destructive"});
        return;
    }
    setIsSwitching(true);
    const result = await runAddCommunityToLeadership({ userId: user.uid, communityId: visitedCommunityIdEffective });
    if (result.success) {
        toast({ title: "Congratulations!", description: "You are now the leader of this community." });
        window.location.reload();
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsSwitching(false);
  }

  const businessesQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !firestore) return null;
    return query(
      collection(firestore, "businesses"),
      where("primaryCommunityId", "==", userProfile.communityId),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [firestore, userProfile?.communityId]);

  const { data: businesses } = useCollection<{id: string, businessCategory?: string}>(businessesQuery);

  const businessSubItems = useMemo(() => {
    if (!businesses || !Array.isArray(businesses)) return [];
    const uniqueCategories = [...new Set(businesses.map(b => b.businessCategory).filter(Boolean))];
    
    const categoryItems = uniqueCategories.sort().map(categoryValue => {
        const categoryLabel = (categoryValue || '').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ');
        return {
            href: `/directory?category=${categoryValue}`,
            label: categoryLabel,
            icon: Briefcase,
        };
    });
    
    return [
      { href: '/directory', label: 'All Businesses', icon: Building2 },
      ...categoryItems
    ];
  }, [businesses]);

  const renderAuthControls = () => {
    if (!isClient || isUserLoading || profileLoading) {
        return (
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-16" />
            </div>
        );
    }
    if (user) {
        const CurrentAccountIcon = userProfile?.role ? accountTypeIcons[userProfile.role as keyof typeof accountTypeIcons] || UserIcon : UserIcon;
        return (
            <>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                          <Bell className="h-5 w-5" />
                          {!loadingNotifications && notifications.length > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">{notifications.length}</Badge>}
                          <span className="sr-only">View notifications</span>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80" align="end">
                      <DropdownMenuItem asChild>
                          <Link href="/notifications" className="cursor-pointer w-full">
                              <DropdownMenuLabel>See All Notifications</DropdownMenuLabel>
                          </Link>
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
              
              <Sheet>
                  <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                          <ShoppingCart className="h-5 w-5" />
                          {cartCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">{cartCount}</Badge>}
                          <span className="sr-only">Open basket</span>
                      </Button>
                  </SheetTrigger>
                  <Cart />
              </Sheet>

              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                  >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.avatar} alt={userProfile?.name || "Avatar"} />
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
                      <Sheet>
                        <SheetTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                <span>My Basket</span>
                                {cartCount > 0 && <Badge variant="secondary" className="ml-auto">{cartCount}</Badge>}
                            </DropdownMenuItem>
                        </SheetTrigger>
                        <Cart />
                      </Sheet>
                       <DropdownMenuItem asChild>
                          <Link href="/orders">
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              <span>My Orders</span>
                          </Link>
                      </DropdownMenuItem>
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
                              Public Home
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link href={user ? `/profile/${user.uid}` : '#'}>
                          <UserIcon className="mr-2 h-4 w-4" />
                          <span>My Public Profile</span>
                      </Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/settings"><SettingsIcon className="mr-2 h-4 w-4" /><span>Settings</span></Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/report-issue"><ShieldAlert className="mr-2 h-4 w-4" /><span>Report an Issue</span></Link></DropdownMenuItem>
                      <Dialog open={isCommunityDialogOpen} onOpenChange={setIsCommunityDialogOpen}>
                          <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}><MapIcon className="mr-2 h-4 w-4" /><span>Visit Another Community</span></DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg grid grid-rows-[auto,minmax(0,1fr),auto] p-0 max-h-[90vh]">
                              <DialogHeader className="p-6 pb-0">
                                  <DialogTitle>Switch Community</DialogTitle>
                                  <DialogDescription>Select a new community to view its content.</DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="h-auto">
                                  <div className="p-6">
                                      <CommunitySelector selection={communitySelection} onSelectionChange={setCommunitySelection} isLocationVerified={isLocationVerified} onVerificationChange={setIsLocationVerified} allowCreation={false} />
                                  </div>
                              </ScrollArea>
                              <DialogFooter className="p-6 pt-0 border-t">
                                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                  <Button onClick={handleCommunitySwitch} disabled={isSwitching || !communitySelection?.community || communitySelection.community === 'other'}>
                                      {isSwitching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Switch Community
                                  </Button>
                              </DialogFooter>
                          </DialogContent>
                      </Dialog>
                      {userProfile?.settings?.hasBroadcastAccess && (
                          <DropdownMenuItem asChild><Link href="/broadcast"><Siren className="mr-2 h-4 w-4 text-destructive" /><span>Broadcast System</span></Link></DropdownMenuItem>
                      )}
                      <DropdownMenuItem disabled>
                          <CurrentAccountIcon className="mr-2 h-4 w-4" /><span className='capitalize'>{userProfile?.role || 'Personal'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                          <div className={cn(isVisiting && "cursor-not-allowed")}>
                              <DropdownMenuItem onClick={handleLogout} disabled={isVisiting}>
                              <LogOut className="mr-2 h-4 w-4" />Log out
                              </DropdownMenuItem>
                          </div>
                          </TooltipTrigger>
                          {isVisiting && <TooltipContent><p>Return to your home community before logging out.</p></TooltipContent>}
                      </Tooltip>
                      </TooltipProvider>
                  </DropdownMenuContent>
              </DropdownMenu>
            </>
        );
    }
    return <Button asChild><Link href="/">Sign In</Link></Button>;
  };
  
  return (
    <header className={cn("sticky top-0 z-30 flex h-auto min-h-16 flex-col justify-center border-b bg-card")}>
       {isClient && isVisiting && (
        <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-2 text-sm flex items-center justify-center gap-4">
          <p>You are currently visiting the <strong>{visitedCommunityData?.name || 'a community'}</strong> hub.</p>
          <div className="flex gap-2">
            {isVisiting && visitedCommunityData?.leaderCount === 0 ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground"><Crown className="mr-2 h-4 w-4" />Become the Leader</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Confirm Leadership of {visitedCommunityData?.name}</DialogTitle></DialogHeader>
                  <div className="py-4"><p className="text-sm text-muted-foreground">As a leader, you will earn a <strong>40% revenue share</strong> from subscriptions in this community.</p></div>
                  <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleClaimLeadership} disabled={isSwitching}>{isSwitching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm & Become Leader</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
            <Button size="sm" variant="outline" className="border-amber-300 dark:border-amber-700 bg-amber-200 dark:bg-amber-800/50 hover:bg-amber-300 dark:hover:bg-amber-800" onClick={handleReturnHome} disabled={isSwitching}>{isSwitching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HomeIcon className="mr-2 h-4 w-4" />}Return to Home</Button>
          </div>
        </div>
      )}
      <div className="flex w-full items-center gap-4 px-4 sm:px-6 py-2">
        {isClient && <MobileNav menuItems={menuItems} />}
        <Link href="/shopping" className="flex items-center gap-2 font-bold text-lg mr-4">
            <Store className="w-8 h-8 text-primary" />
            <div>
                <span className="text-primary hidden sm:inline-block leading-tight">Community Marketplace</span>
                <p className="text-xs text-muted-foreground font-normal hidden sm:block leading-tight">Shop Local</p>
            </div>
        </Link>
          <div className="flex w-full items-center">
            <nav className="hidden w-full flex-1 md:flex">
                {isClient ? (
                    <div className="flex w-full flex-wrap items-center justify-center gap-1">
                        {menuItems.map((item) => (
                            item.subItems ? (
                                <DropdownMenu key={item.label}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="justify-start text-xs"><item.icon className="mr-2 h-4 w-4" />{item.label}<ChevronDown className="ml-1 h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {item.subItems.map(subItem => (
                                            <DropdownMenuItem key={subItem.href} asChild><Link href={subItem.href}>{subItem.label}</Link></DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <Button key={item.href} variant="ghost" size="sm" asChild className={cn('justify-start text-xs', pathname === item.href && "bg-accent text-accent-foreground")}>
                                    <Link href={item.href}><item.icon className="mr-2 h-4 w-4" />{item.label}</Link>
                                </Button>
                            )
                        ))}
                    </div>
                ) : (
                    <div className="flex w-full items-center justify-center gap-2">
                        <Skeleton className="h-8 w-24 rounded-md" /><Skeleton className="h-8 w-24 rounded-md" /><Skeleton className="h-8 w-24 rounded-md" /><Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                )}
            </nav>
            <div className="ml-auto flex items-center gap-2 shrink-0">{renderAuthControls()}</div>
          </div>
       </div>
    </header>
  )
}
