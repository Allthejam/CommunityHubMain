

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  User,
  Bell,
  Menu,
  LogOut,
  Building,
  Briefcase,
  Users,
  Star,
  Megaphone,
  Calendar,
  Tv,
  Newspaper,
  MessagesSquare,
  Heart,
  BookText,
  Building2,
  Map,
  Loader2,
  HomeIcon,
  Store,
  HeartHandshake,
  ShieldAlert,
  Smartphone,
  Settings as SettingsIcon,
  Crown,
  ChevronDown,
  ShoppingCart,
  FileText,
  DollarSign,
  MessageCircle,
  Settings,
  Info,
  HelpCircle,
  Sparkles,
  ListTodo,
  Shield,
} from 'lucide-react';
import { signOut } from 'firebase/auth';

import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
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
import { doc, collection, onSnapshot, query, where, getDoc } from 'firebase/firestore';
import { type Notification } from '@/lib/types/notifications';
import { Badge } from '../ui/badge';
import { MobileNav } from './mobile-nav';
import { Cart } from '../cart';
import { useCart } from '@/contexts/cart-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetTrigger } from '../ui/sheet';
import { CommunitySelector, type CommunitySelection } from '../community-selector';
import { useToast } from '@/hooks/use-toast';
import { updateUserCommunityAction, returnToHomeCommunityAction } from '@/lib/actions/userActions';
import { runAddCommunityToLeadership } from '@/lib/actions/teamActions';
import { isValid, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '../ui/skeleton';


const mainLeaderNavItems = [
  { href: '/leader/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'viewDashboard' },
  { href: '/leader/members', label: 'Members', icon: Users, permission: 'viewUsers' },
];

const reviewSubItems = [
    { href: '/leader/reports', label: 'Reports', icon: FileText, permission: 'viewReports' },
    { href: '/leader/applications', label: 'Applications', icon: Shield, permission: 'viewApplications' },
];

const contentSubItems = [
    { href: '/leader/news', label: 'News', icon: Newspaper, permission: 'viewNewsManagement' },
    { href: '/leader/events', label: 'Events', icon: Calendar, permission: 'viewEvents' },
    { href: '/leader/whatson', label: "What's On", icon: Tv, permission: 'viewWhatson' },
    { href: '/leader/forum', label: 'Forum', icon: MessagesSquare, permission: 'viewForumManagement' },
    { href: '/leader/faq', label: 'FAQ', icon: HelpCircle, permission: 'viewFaq' },
    { href: '/leader/charities', label: 'Local Charities', icon: Heart, permission: 'viewCharities' },
    { href: '/leader/about', label: 'About Page', icon: Info, permission: 'viewAbout' },
    { href: '/leader/lost-and-found', label: 'Lost & Found', icon: HeartHandshake, permission: 'viewLostAndFound' },
];

const businessSubItems = [
    { href: '/leader/businesses', label: 'Businesses', icon: Briefcase, permission: 'viewBusinesses' },
    { href: '/leader/adverts', label: 'Adverts', icon: Megaphone, permission: 'viewAdverts' },
];

const adminSubItems = [
    { href: '/leader/announcements', label: 'Announcements', icon: Megaphone, permission: 'viewAnnouncements' },
    { href: '/leader/marketing', label: 'Marketing', icon: Sparkles, permission: 'viewMarketing' },
    { href: '/leader/financials', label: 'Financials', icon: DollarSign, permission: 'viewFinancials' },
    { href: '/leader/polls', label: 'Polls', icon: ListTodo, permission: 'viewPolls' },
    { href: '/leader/settings', label: 'Community Settings', icon: Settings, permission: 'viewSettings' },
    { href: '/leader/shopping-settings', label: 'High Street Graphics', icon: Store, permission: 'viewSettings' },
];

const accountTypeIcons = {
    personal: User,
    business: Briefcase,
    leader: Users,
    president: Crown,
    enterprise: Building,
    advertiser: Star,
    admin: LayoutDashboard,
    owner: LayoutDashboard,
    reporter: User,
    'police-liaison-officer': User,
}

export default function LeaderHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isClient, setIsClient] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = React.useState(true);
  const { cartCount } = useCart();
  const [isCommunityDialogOpen, setIsCommunityDialogOpen] = useState(false);
  const [communitySelection, setCommunitySelection] = useState<CommunitySelection | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const { toast } = useToast();
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [visitedCommunityId, setVisitedCommunityId] = useState<string | null>(null);


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
  
  useEffect(() => {
    setIsClient(true);
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
    if (!auth) return;
    sessionStorage.removeItem('visitedCommunityId');
    sessionStorage.removeItem('visitedCommunityName');
    await signOut(auth)
    router.push('/')
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

  const { hasAccess, allLeaderMenuItems, visibleContentItems, visibleBusinessItems, visibleAdminItems, visibleReviewItems } = React.useMemo(() => {
    if (!userProfile) {
        return { hasAccess: () => false, allLeaderMenuItems: [], visibleContentItems: [], visibleBusinessItems: [], visibleAdminItems: [], visibleReviewItems: [] };
    }

    const impersonating = (userProfile as any)?.impersonating;
    const communityId = impersonating?.communityId || userProfile.communityId;
    
    const communityRoleData = communityId ? userProfile.communityRoles?.[communityId] : null;

    const activeRole = communityRoleData?.role || userProfile.role;
    const permissions = communityRoleData?.permissions || userProfile.permissions || {};

    const checkAccess = (permissionKey: keyof typeof permissions) => {
        if (activeRole === 'president' || userProfile.role === 'admin' || userProfile.role === 'owner') {
            return true;
        }
        return !!permissions[permissionKey];
    };
    
    const visibleMainItems = mainLeaderNavItems.filter(item => checkAccess(item.permission as keyof typeof permissions));
    const visibleReviewItems = reviewSubItems.filter(item => checkAccess(item.permission as keyof typeof permissions));
    const visibleContentItems = contentSubItems.filter(item => checkAccess(item.permission as keyof typeof permissions));
    const visibleBusinessItems = businessSubItems.filter(item => checkAccess(item.permission as keyof typeof permissions));
    const visibleAdminItems = adminSubItems.filter(item => checkAccess(item.permission as keyof typeof permissions));

    return {
        hasAccess: checkAccess,
        allLeaderMenuItems: [...visibleMainItems, ...visibleReviewItems, ...visibleContentItems, ...visibleBusinessItems, ...visibleAdminItems],
        visibleContentItems,
        visibleBusinessItems,
        visibleAdminItems,
        visibleReviewItems,
    };

  }, [userProfile]);
  
  const showAdminDashboard = ['admin', 'owner'].includes(userProfile?.role || '');
  const showLeaderDashboard = hasAccess('viewDashboard');
  const showBusinessDashboard = userProfile?.accountType === 'business';
  const showEnterpriseDashboard = userProfile?.accountType === 'enterprise';
  const showAdvertiserDashboard = userProfile?.accountType === 'advertiser';
  const showReporterDashboard = userProfile?.role === 'reporter';
  
  const CurrentAccountIcon = userProfile?.role ? accountTypeIcons[userProfile.role as keyof typeof accountTypeIcons] || User : User;
  const isVisiting = userProfile && visitedCommunityId && userProfile.homeCommunityId !== visitedCommunityId;
  const visitedCommunityHasNoLeader = isVisiting && visitedCommunityData?.leaderCount === 0;

  const handleCommunitySwitch = async () => {
    if (!communitySelection?.community || communitySelection.community === 'other' || !user) {
      toast({ title: 'No Community Selected', description: 'Please select a community to switch to.', variant: 'destructive' });
      return;
    }
    
    setIsSwitching(true);
    const result = await updateUserCommunityAction({ userId: user.uid, communityId: communitySelection.community });
    setIsSwitching(false);

    if (result.success && result.communityName) {
      setIsCommunityDialogOpen(false);
      sessionStorage.setItem('visitedCommunityId', communitySelection.community);
      sessionStorage.setItem('visitedCommunityName', result.communityName);
      toast({ title: 'Community Switched!', description: `You are now viewing the ${result.communityName} hub.` });
      window.location.reload();
    } else {
      toast({ title: 'Switch Failed', description: result.error || 'Could not switch communities.', variant: 'destructive' });
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
      toast({ title: 'Returned Home', description: `You are now back in your home community.` });
      window.location.reload();
    } else {
      toast({ title: "Error Returning Home", description: result.error, variant: 'destructive' });
    }
  }
  
  const handleClaimLeadership = async () => {
    if (!user || !visitedCommunityId) {
        toast({ title: "Error", description: "You must be logged in to claim a community.", variant: "destructive"});
        return;
    }
    setIsSwitching(true);
    const result = await runAddCommunityToLeadership({ userId: user.uid, communityId: visitedCommunityId });
    if (result.success) {
        toast({ title: "Congratulations!", description: "You are now the leader of this community. It is now available in your Leadership Hubs on your profile." });
        window.location.reload();
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsSwitching(false);
  }

  return (
    <header className="sticky top-0 z-30 flex h-auto min-h-16 flex-col justify-center border-b bg-card px-4 sm:px-6">
       {isClient && isVisiting && (
        <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-2 text-sm flex items-center justify-center gap-4">
          <p>
            You are currently visiting the <strong>{visitedCommunityData?.name || 'a community'}</strong> hub.
          </p>
          <div className="flex gap-2">
            {visitedCommunityHasNoLeader ? (
              <Button size="sm" onClick={handleClaimLeadership} disabled={isSwitching} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isSwitching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
                  Become the Leader
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="border-amber-300 dark:border-amber-700 bg-amber-200 dark:bg-amber-800/50 hover:bg-amber-300 dark:hover:bg-amber-800" onClick={handleReturnHome} disabled={isSwitching}>
                {isSwitching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HomeIcon className="mr-2 h-4 w-4" />}
                Return to Home
            </Button>
          </div>
        </div>
      )}
      <div className="flex w-full items-center gap-4">
        <MobileNav menuItems={allLeaderMenuItems} />
        
        <Link href="/leader/dashboard" className="mr-4 flex items-center gap-2 text-lg font-bold shrink-0">
            <Logo className="h-8 w-8" />
            <span className="text-primary hidden sm:inline-block">Leader Panel</span>
        </Link>
        
        <div className="flex w-full items-center">
            <nav className="hidden w-full flex-1 md:flex">
              {isClient ? (
                <div className="flex w-full items-center justify-center gap-1 flex-wrap">
                    {mainLeaderNavItems.map((item) => (
                    hasAccess(item.permission as keyof typeof permissions) && (
                            <Button
                                key={item.href}
                                variant="ghost"
                                asChild
                                size="sm"
                                className={cn( 'justify-start text-xs', pathname === item.href && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' )}
                            >
                                <Link href={item.href}>
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                </Link>
                            </Button>
                    )
                    ))}
                    {visibleReviewItems.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="justify-start text-xs">
                                <ListTodo className="mr-2 h-4 w-4" /> Review <ChevronDown className="ml-1 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {visibleReviewItems.map(item => (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link href={item.href}>
                                            <item.icon className="mr-2 h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {visibleContentItems.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="justify-start text-xs">
                                <FileText className="mr-2 h-4 w-4" /> Content <ChevronDown className="ml-1 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {visibleContentItems.map(item => (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link href={item.href}>
                                            <item.icon className="mr-2 h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {visibleBusinessItems.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="justify-start text-xs">
                                <Briefcase className="mr-2 h-4 w-4" /> Business <ChevronDown className="ml-1 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {visibleBusinessItems.map(item => (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link href={item.href}>
                                            <item.icon className="mr-2 h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {visibleAdminItems.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="justify-start text-xs">
                                <Users className="mr-2 h-4 w-4" /> Administration <ChevronDown className="ml-1 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {visibleAdminItems.map(item => (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link href={item.href}>
                                            <item.icon className="mr-2 h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
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
                {isClient ? (
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
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Dashboards</DropdownMenuLabel>
                              {showAdminDashboard && (
                                  <DropdownMenuItem onClick={handleAdminDashboardClick}>
                                      <LayoutDashboard className="mr-2 h-4 w-4" /><span>Admin Dashboard</span>
                                  </DropdownMenuItem>
                              )}
                              {showLeaderDashboard && userProfile?.role !== 'police-liaison-officer' && (
                                  <DropdownMenuItem asChild>
                                      <Link href="/leader/dashboard">
                                          <LayoutDashboard className="mr-2 h-4 w-4" />
                                          <span>Leader Dashboard</span>
                                      </Link>
                                  </DropdownMenuItem>
                              )}
                                {userProfile?.role === 'police-liaison-officer' && (
                                    <DropdownMenuItem asChild>
                                      <Link href="/leader/dashboard">
                                          <Shield className="mr-2 h-4 w-4" />
                                          <span>Police Dashboard</span>
                                      </Link>
                                  </DropdownMenuItem>
                                )}
                              {showBusinessDashboard && (
                                  <DropdownMenuItem asChild>
                                  <Link href="/business/dashboard">
                                      <LayoutDashboard className="mr-2 h-4 w-4" />
                                      <span>Business Dashboard</span>
                                  </Link>
                                  </DropdownMenuItem>
                              )}
                               {showEnterpriseDashboard && (
                                  <DropdownMenuItem asChild>
                                  <Link href="/enterprise/dashboard">
                                      <LayoutDashboard className="mr-2 h-4 w-4" />
                                      <span>Enterprise Dashboard</span>
                                  </Link>
                                  </DropdownMenuItem>
                              )}
                             {showAdvertiserDashboard && (
                              <DropdownMenuItem onClick={handleAdvertiserDashboardClick}>
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                <span>Advertiser Dashboard</span>
                              </DropdownMenuItem>
                          )}
                          {showReporterDashboard && (
                            <DropdownMenuItem asChild>
                                <Link href="/reporter/dashboard">
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    <span>Reporter Dashboard</span>
                                </Link>
                            </DropdownMenuItem>
                          )}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                <Link href="/home">
                                    <Home className="mr-2 h-4 w-4" />
                                    Public Home
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={user ? `/profile/${user.uid}` : '#'}>
                                    <User className="mr-2 h-4 w-4" />
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
                                        <Map className="mr-2 h-4 w-4" />
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
                ) : (
                    <Skeleton className="h-8 w-16" />
                )}
            </div>
          </div>
       </div>
    </header>
  );
}
