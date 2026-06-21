

'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import HomeIcon from 'lucide-react/dist/esm/icons/home';
import UserIcon from 'lucide-react/dist/esm/icons/user';
import UsersIcon from 'lucide-react/dist/esm/icons/users';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Menu from 'lucide-react/dist/esm/icons/menu';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Building from 'lucide-react/dist/esm/icons/building';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Star from 'lucide-react/dist/esm/icons/star';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Tv from 'lucide-react/dist/esm/icons/tv';
import Newspaper from 'lucide-react/dist/esm/icons/newspaper';
import MessagesSquare from 'lucide-react/dist/esm/icons/messages-square';
import Heart from 'lucide-react/dist/esm/icons/heart';
import BookText from 'lucide-react/dist/esm/icons/book-text';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import MapIcon from 'lucide-react/dist/esm/icons/map';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { Store } from 'lucide-react';
import Tag from 'lucide-react/dist/esm/icons/tag';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Truck from 'lucide-react/dist/esm/icons/truck';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import SettingsIcon from 'lucide-react/dist/esm/icons/settings';
import Crown from 'lucide-react/dist/esm/icons/crown';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import HeartHandshake from 'lucide-react/dist/esm/icons/heart-handshake';
import BadgeHelp from 'lucide-react/dist/esm/icons/badge-help';
import Siren from 'lucide-react/dist/esm/icons/siren';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';

import { signOut } from 'firebase/auth';
import { doc, collection, query, where, onSnapshot, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

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
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Sheet, SheetTrigger } from '../ui/sheet';
import { Cart } from '../cart';
import { useCart } from '@/contexts/cart-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { type Notification } from '@/lib/types/notifications';
import { isValid, formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { CommunitySelector, type CommunitySelection } from '../community-selector';
import { useToast } from '@/hooks/use-toast';
import { updateUserCommunityAction, returnToHomeCommunityAction } from '@/lib/actions/userActions';
import { runAddCommunityToLeadership } from '@/lib/actions/teamActions';
import { ScrollArea } from '../ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '../ui/skeleton';


const mainNavItems = [
    { href: '/home', label: 'Home', icon: HomeIcon, permission: 'viewHome' },
    { href: '/feed', label: 'Feed', icon: Newspaper, permission: 'viewFeed' },
    { href: '/shopping', label: 'Shopping', icon: Store, permission: 'viewShop' },
    { href: '/chat', label: 'Chat', icon: MessagesSquare, permission: 'viewChat' },
];

const discoverSubItems = [
    { href: '/events', label: 'Events', icon: Calendar, permission: 'viewEvents' },
    { href: '/whatson', label: "What's On", icon: Tv, permission: 'viewWhatson' },
    { href: '/news', label: 'News', icon: Newspaper, permission: 'viewNews' },
    { href: '/directory', label: 'Businesses', icon: Building2, permission: 'viewDirectory' },
    { href: '/enterprise-partners', label: 'Enterprise Partners', icon: Briefcase, permission: 'viewEnterprise' },
    { href: '/national-advertisers', label: 'National Advertisers', icon: Star, permission: 'viewNationalAdvertisers' },
];

const engageSubItems = [
    { href: '/forum', label: 'Forum', icon: UsersIcon, permission: 'viewForum' },
    { href: '/jobs', label: 'Jobs', icon: Briefcase, permission: 'viewJobs' },
    { href: '/marketplace', label: 'Buy, Swap & Sell', icon: ShoppingCart, permission: 'viewMarketplace' },
    { href: '/lost-and-found', label: 'Lost & Found', icon: HeartHandshake, permission: 'viewLostAndFound' },
    { href: '/charities', label: 'Charities', icon: Heart, permission: 'viewCharities' },
    { href: '/polls', label: 'Polls', icon: BadgeHelp, permission: 'viewPolls' },
    { href: '/guestbook', label: 'Guest Book', icon: BookOpen, permission: 'viewGuestBook' },
];

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

export default function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast();
  
  const [visitedCommunityId, setVisitedCommunityId] = useState<string | null>(null);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = React.useState(true);
  const [isCommunityDialogOpen, setIsCommunityDialogOpen] = useState(false);
  const [communitySelection, setCommunitySelection] = useState<CommunitySelection | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const { toast: showToast } = useToast();
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  
  const [isClient, setIsClient] = useState(false);
  const [visitingCommunityName, setVisitingCommunityName] = useState<string | null>(null);
  const { cartCount } = useCart();
  const [currentTime, setCurrentTime] = useState('');
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const visitedCommunityRef = useMemoFirebase(() => {
    if (!visitedCommunityId || !firestore) return null;
    return doc(firestore, 'communities', visitedCommunityId);
  }, [visitedCommunityId, firestore]);
  const { data: visitedCommunityData } = useDoc(visitedCommunityRef);
  
  const businessesQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !firestore) return null;
    return query(
      collection(firestore, "businesses"),
      where("primaryCommunityId", "==", userProfile.communityId),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [firestore, userProfile?.communityId]);

  const { data: businesses } = useCollection<{id: string, businessCategory?: string}>(businessesQuery);

  const businessSubItems = React.useMemo(() => {
    if (!businesses) return [];
    const uniqueCategories = [...new Set(businesses.map(b => b.businessCategory).filter(Boolean))];
    
    const categoryItems = uniqueCategories.sort().map(categoryValue => {
        const categoryLabel = categoryValue.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ');
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

  useEffect(() => {
    setIsClient(true);
    const updateCurrentTime = () => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    updateCurrentTime();
    const timer = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVisitedCommunityId(sessionStorage.getItem('visitedCommunityId') || userProfile?.communityId);
    } else {
      setVisitedCommunityId(userProfile?.communityId);
    }
  }, [userProfile?.communityId]);
  
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


  const handleLogout = async () => {
    if (!auth || !user || !firestore) return;
    sessionStorage.removeItem('visitedCommunityId');
    sessionStorage.removeItem('visitedCommunityName');

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
  }

  const getInitials = (name: string | undefined) => {
    if (!name) return 'CH';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const handleAdvertiserDashboardClick = () => {
    const email = user?.email || userProfile?.email;
    if (!email) {
      toast({
        title: "Could not retrieve email",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
      return;
    }
    const url = `https://www.advertiser.my-community-hub.co.uk/?email=${encodeURIComponent(email)}`;
    window.location.href = url;
  };
  
  const handleAdminDashboardClick = () => {
    const email = user?.email || userProfile?.email;
    if (!email) {
      toast({
        title: "Could not retrieve email",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
      return;
    }
    const url = `https://admin.my-community-hub.co.uk/?email=${encodeURIComponent(email)}`;
    window.location.href = url;
  };
  
  const handleCourierDashboardClick = () => {
    const email = user?.email || userProfile?.email;
    if (!email) {
      toast({
        title: "Could not retrieve email",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
      return;
    }
    const url = `https://www.courier.my-community-hub.co.uk/?email=${encodeURIComponent(email)}`;
    window.location.href = url;
  };

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
  }, [userProfile]);

  const CurrentAccountIcon = userProfile?.role ? accountTypeIcons[userProfile.role as keyof typeof accountTypeIcons] || UserIcon : UserIcon;
  const isVisiting = userProfile && userProfile.communityId !== userProfile.homeCommunityId;
  const visitedCommunityHasNoLeader = isVisiting && visitedCommunityData?.leaderCount === 0;

  const handleCommunitySwitch = async () => {
    if (!communitySelection?.community || communitySelection.community === 'other' || !user) {
      showToast({ title: 'No Community Selected', description: 'Please select a community to switch to.', variant: 'destructive' });
      return;
    }
    
    setIsSwitching(true);
    const result = await updateUserCommunityAction({ userId: user.uid, communityId: communitySelection.community });
    setIsSwitching(false);

    if (result.success && result.communityName) {
      setIsCommunityDialogOpen(false);
      sessionStorage.setItem('visitedCommunityId', communitySelection.community);
      sessionStorage.setItem('visitedCommunityName', result.communityName);
      setVisitedCommunityId(communitySelection.community);
      showToast({ title: 'Community Switched!', description: `You are now viewing the ${result.communityName} hub.` });
      window.location.reload();
    } else {
      showToast({ title: 'Switch Failed', description: result.error || 'Could not switch communities.', variant: 'destructive' });
    }
  }
  
  const handleReturnHome = async () => {
    if (!user) return;
    setIsSwitching(true);
    const result = await returnToHomeCommunityAction({ userId: user.uid });
    setIsSwitching(false);
    if (result.success) {
      sessionStorage.removeItem('visitedCommunityId');
      sessionStorage.removeItem('visitedCommunityName');
      setVisitedCommunityId(null);
      showToast({ title: 'Returned Home', description: `You are now back in your home community.` });
      window.location.reload();
    } else {
      showToast({ title: "Error Returning Home", description: result.error, variant: 'destructive' });
    }
  }
  
  const handleClaimLeadership = async () => {
    if (!user || !visitedCommunityId) {
        showToast({ title: "Error", description: "You must be logged in to claim a community.", variant: "destructive"});
        return;
    }
    setIsSwitching(true);
    const result = await runAddCommunityToLeadership({ userId: user.uid, communityId: visitedCommunityId });
    if (result.success) {
        showToast({ title: "Congratulations!", description: "You are now the leader of this community. It is now available in your Leadership Hubs on your profile." });
        window.location.reload();
    } else {
        showToast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsSwitching(false);
  }

  const { allNavItems, visibleDiscoverItems, visibleEngageItems } = useMemo(() => {
    const all = [...mainNavItems];
    if (discoverSubItems.length > 0) {
      all.push({
        href: '#', // placeholder href
        label: 'Discover',
        icon: MapIcon,
        subItems: discoverSubItems,
      });
    }
    if (engageSubItems.length > 0) {
      all.push({
        href: '#', // placeholder href
        label: 'Engage',
        icon: UsersIcon,
        subItems: engageSubItems,
      });
    }

    return {
      allNavItems: all,
      visibleDiscoverItems: discoverSubItems,
      visibleEngageItems: engageSubItems,
    };
  }, []);

  const renderAuthControls = () => {
    if (!isClient) {
        return (
            <>
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-16" />
            </>
        );
    }
    if (user) {
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
                      <AvatarImage
                          src={userProfile?.avatar}
                          alt={userProfile?.name || "User Avatar"}
                      />
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
                          <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                          </div>
                      )}
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
                          {dashboards.length === 1 ? (
                              (() => {
                                  const dash = dashboards[0];
                                  const Icon = dash.icon;
                                  if (dash.href) {
                                      return (
                                          <DropdownMenuItem asChild>
                                              <Link href={dash.href}>
                                                  <Icon className="mr-2 h-4 w-4" />
                                                  <span>{dash.label} Dashboard</span>
                                              </Link>
                                          </DropdownMenuItem>
                                      );
                                  } else if (dash.onClick) {
                                      return (
                                          <DropdownMenuItem onClick={dash.onClick}>
                                              <Icon className="mr-2 h-4 w-4" />
                                              <span>{dash.label} Dashboard</span>
                                          </DropdownMenuItem>
                                      );
                                  }
                                  return null;
                              })()
                          ) : (
                              <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                  <LayoutDashboard className="mr-2 h-4 w-4" />
                                  <span>Switch Dashboard</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                  {dashboards.map((dash) => {
                                    const Icon = dash.icon;
                                    return dash.href ? (
                                      <DropdownMenuItem key={dash.label} asChild>
                                        <Link href={dash.href}>
                                          <Icon className="mr-2 h-4 w-4" />
                                          {dash.label}
                                        </Link>
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem key={dash.label} onClick={dash.onClick}>
                                        <Icon className="mr-2 h-4 w-4" />
                                        {dash.label}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                  </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                              </DropdownMenuSub>
                          )}
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
                      <DropdownMenuItem asChild>
                          <Link href={user ? `/profile/${user.uid}` : '#'}>
                              <UserIcon className="mr-2 h-4 w-4" />
                              <span>My Public Profile</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                          <Link href="/settings">
                              <SettingsIcon className="mr-2 h-4 w-4" />
                              <span>Settings</span>
                          </Link>
                      </DropdownMenuItem>
                       <DropdownMenuItem asChild>
                          <Link href="/report-issue">
                              <ShieldAlert className="mr-2 h-4 w-4" />
                              <span>Report an Issue</span>
                          </Link>
                      </DropdownMenuItem>
                      <Dialog open={isCommunityDialogOpen} onOpenChange={setIsCommunityDialogOpen}>
                          <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <MapIcon className="mr-2 h-4 w-4" />
                                  <span>Visit Another Community</span>
                              </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg grid-rows-[auto,minmax(0,1fr),auto] p-0 max-h-[90vh]">
                              <DialogHeader className="p-6 pb-0">
                                  <DialogTitle>Switch Community</DialogTitle>
                                  <DialogDescription>Select a new community to view its content.</DialogDescription>
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
                                  <Button onClick={handleCommunitySwitch} disabled={isSwitching || !communitySelection?.community || communitySelection.community === 'other'}>
                                      {isSwitching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Switch Community
                                  </Button>
                              </DialogFooter>
                          </DialogContent>
                      </Dialog>
                      {userProfile?.settings?.hasBroadcastAccess && (
                          <DropdownMenuItem asChild>
                              <Link href="/broadcast">
                                  <Siren className="mr-2 h-4 w-4 text-destructive" />
                                  <span>Broadcast System</span>
                              </Link>
                          </DropdownMenuItem>
                      )}
                      <DropdownMenuItem disabled>
                          <CurrentAccountIcon className="mr-2 h-4 w-4" />
                          <span className='capitalize'>{userProfile?.role || 'Personal'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                          <div className={cn(isVisiting && "cursor-not-allowed")}>
                              <DropdownMenuItem onClick={handleLogout} disabled={isVisiting}>
                              <LogOut className="mr-2 h-4 w-4" />
                              Log out
                              </DropdownMenuItem>
                          </div>
                          </TooltipTrigger>
                          {isVisiting && (
                          <TooltipContent>
                              <p>Return to your home community before logging out.</p>
                          </TooltipContent>
                          )}
                      </Tooltip>
                      </TooltipProvider>
                  </DropdownMenuContent>
              </DropdownMenu>
            </>
        );
    }
    return (
      <Button asChild>
        <Link href="/">Sign In</Link>
      </Button>
    );
  };
  
  return (
    <header className={cn("sticky top-0 z-30 flex h-auto min-h-16 flex-col justify-center border-b bg-card")}>
       {isClient && isVisiting && (
        <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-2 text-sm flex items-center justify-center gap-4">
          <p>
            You are currently visiting the <strong>{visitedCommunityData?.name || 'a community'}</strong> hub.
          </p>
          <div className="flex gap-2">
            {visitedCommunityHasNoLeader ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Crown className="mr-2 h-4 w-4" />
                    Become the Leader
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Leadership of {visitedCommunityData?.name}</DialogTitle>
                    <DialogDescription>
                      Becoming a leader is a commitment. Please confirm you understand the responsibilities.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">As a leader, you will be responsible for managing content, approving businesses, and fostering a positive environment. You will also earn a <strong>40% revenue share</strong> from subscriptions in this community.</p>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleClaimLeadership} disabled={isSwitching}>
                      {isSwitching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm & Become Leader
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
            <Button size="sm" variant="outline" className="border-amber-300 dark:border-amber-700 bg-amber-200 dark:bg-amber-800/50 hover:bg-amber-300 dark:hover:bg-amber-800" onClick={handleReturnHome} disabled={isSwitching}>
              {isSwitching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HomeIcon className="mr-2 h-4 w-4" />}
              Return to Home
            </Button>
          </div>
        </div>
      )}
      <div className="flex w-full items-center gap-4 px-4 sm:px-6 py-2">
        {isClient && <MobileNav menuItems={allNavItems} />}
        
        <Link href="/home" className="flex items-center gap-2 font-bold text-lg mr-4">
            <Logo className="w-8 h-8" />
            <div className="flex items-baseline gap-2">
              <span className="text-primary hidden sm:inline-block leading-tight">Community Hub</span>
              {isClient && <p className="text-xs font-mono text-muted-foreground hidden lg:inline-block">{currentTime}</p>}
            </div>
        </Link>
        
        <div className="flex w-full items-center">
            <nav className="hidden w-full flex-1 md:flex">
                {isClient ? (
                    <ScrollArea className="w-full">
                        <div className="flex items-center justify-center gap-1 flex-wrap py-2">
                            {mainNavItems.map((item) => (
                                <Button
                                    key={item.href}
                                    variant="ghost"
                                    asChild
                                    size="sm"
                                    className={cn(
                                        'justify-start text-xs',
                                        pathname === item.href &&
                                        'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                                    )}
                                >
                                    <Link href={item.href}>
                                        <item.icon className="mr-2 h-4 w-4" />
                                        {item.label}
                                    </Link>
                                </Button>
                            ))}
                            {visibleDiscoverItems.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="justify-start text-xs">
                                            <MapIcon className="mr-2 h-4 w-4" /> Discover <ChevronDown className="ml-1 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {visibleDiscoverItems.map(subItem => {
                                            if (subItem.label === 'Businesses') {
                                                return (
                                                    <DropdownMenuSub key={subItem.href}>
                                                        <DropdownMenuSubTrigger>
                                                            <subItem.icon className="mr-2 h-4 w-4" />
                                                            <span>{subItem.label}</span>
                                                        </DropdownMenuSubTrigger>
                                                        <DropdownMenuPortal>
                                                            <DropdownMenuSubContent>
                                                            {businessSubItems.map(bizItem => {
                                                                const Icon = bizItem.icon;
                                                                return (
                                                                    <DropdownMenuItem key={bizItem.href} asChild>
                                                                        <Link href={bizItem.href}>
                                                                            <Icon className="mr-2 h-4 w-4" />
                                                                            {bizItem.label}
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                )
                                                            })}
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuPortal>
                                                    </DropdownMenuSub>
                                                )
                                            }
                                            const Icon = subItem.icon;
                                            return (
                                                <DropdownMenuItem key={subItem.href} asChild>
                                                    <Link href={subItem.href}><Icon className="mr-2 h-4 w-4" /> {subItem.label}</Link>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {visibleEngageItems.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="justify-start text-xs">
                                            <UsersIcon className="mr-2 h-4 w-4" /> Engage <ChevronDown className="ml-1 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {visibleEngageItems.map(subItem => {
                                            const Icon = subItem.icon;
                                            return (
                                                <DropdownMenuItem key={subItem.href} asChild>
                                                    <Link href={subItem.href}><Icon className="mr-2 h-4 w-4" /> {subItem.label}</Link>
                                                </DropdownMenuItem>
                                            )
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex w-full items-center justify-center gap-2">
                        <Skeleton className="h-8 w-24 rounded-md" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                )}
            </nav>


            <div className="ml-auto flex items-center gap-2 shrink-0">
                {renderAuthControls()}
            </div>
          </div>
       </div>
    </header>
  );
}

