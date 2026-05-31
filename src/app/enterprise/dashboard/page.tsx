'use client';

import * as React from "react";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  LayoutDashboard,
  PlusCircle,
  Loader2,
  Megaphone,
  Calendar,
  CreditCard,
  Eye,
  Pencil,
  Building,
  Store,
  ShoppingCart,
  ShoppingBag,
  GalleryHorizontal,
  Percent,
  Info,
  Crown,
  Shield,
  Star,
  Newspaper,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, query, where, doc } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getPricingPlans, type Plan, type StorefrontPlan } from '@/lib/actions/pricingActions';
import { createCheckoutSession, createCustomerPortalLink } from "@/lib/actions/stripeActions";
import { differenceInDays } from "date-fns";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateEventForm } from "@/components/create-event-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";


type BusinessListing = {
  id: string;
  businessName: string;
  name?: string; // For backwards compatibility
  shortDescription: string;
  logoImage?: string;
  accountType?: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Hidden";
  storefrontSubscription?: boolean;
  createdAt?: { toDate: () => Date };
  listingSubscriptionStatus?: 'pending_cancellation' | 'payment_failed';
  listingSubscriptionExpiresAt?: { toDate: () => Date };
  storefrontSubscriptionStatus?: 'pending_cancellation' | 'payment_failed';
  storefrontSubscriptionExpiresAt?: { toDate: () => Date };
  primaryCommunityId: string;
};

type Advert = {
    id: string;
    title: string;
    image?: string;
    type: 'featured' | 'partner';
    businessId?: string;
};

type CommunityEvent = {
    id: string;
    title: string;
    image?: string;
}

const toDateHelper = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return null;
};

const getListingEffectiveStatus = (business: BusinessListing): string => {
    const { status, createdAt, listingSubscriptionExpiresAt, listingSubscriptionStatus } = business;
    const now = new Date();
    
    if (listingSubscriptionStatus === 'payment_failed') return "Payment Failed";
    if (listingSubscriptionStatus === 'pending_cancellation') return "Pending Cancellation";

    const subExpiry = toDateHelper(listingSubscriptionExpiresAt);
    if (status === 'Subscribed' && subExpiry && now > subExpiry) return "Subscription Expired";
    
    const creationDate = toDateHelper(createdAt);
    if (status === 'Approved' && creationDate && differenceInDays(now, creationDate) > 14) return "Trial Expired";
    
    return status;
};

const getStorefrontEffectiveStatus = (business: BusinessListing, listingStatus: string): string => {
    if (!business.storefrontSubscription) return "None";

    const { storefrontSubscriptionStatus, storefrontSubscriptionExpiresAt } = business;
    const now = new Date();

    if (storefrontSubscriptionStatus === 'payment_failed') return "Payment Failed";

    // ORPHANED LOGIC
    const listingIsInactive = ["Pending Cancellation", "Subscription Expired", "Trial Expired", "Hidden", "Declined"].includes(listingStatus);
    const storefrontIsStillActive = storefrontSubscriptionStatus !== 'pending_cancellation';

    if (listingIsInactive && storefrontIsStillActive) return "Orphaned";
    if (storefrontSubscriptionStatus === 'pending_cancellation') return "Pending Cancellation";

    const subExpiry = toDateHelper(storefrontSubscriptionExpiresAt);
    if (subExpiry && now > subExpiry) return "Subscription Expired";

    return "Subscribed";
};

const BusinessCard = ({ business, onSubscribe, onManageBilling, isGlobalRedirecting }: { business: BusinessListing, onSubscribe: (businessId: string, communityId: string, isStorefront: boolean) => void, onManageBilling: () => void, isGlobalRedirecting: boolean }) => {
    const [isLocalRedirecting, setIsLocalRedirecting] = React.useState<boolean>(false);
    
    const isProcessing = isLocalRedirecting || isGlobalRedirecting;
    const listingStatus = getListingEffectiveStatus(business);
    const storefrontStatus = getStorefrontEffectiveStatus(business, listingStatus);

    const handleSubscribeClick = async (isStorefront: boolean) => {
        setIsLocalRedirecting(true);
        await onSubscribe(business.id, business.primaryCommunityId, isStorefront);
        setIsLocalRedirecting(false);
    }
    
    const canSubscribe = business.status === 'Approved' || listingStatus === 'Trial Expired';
    const canUpgradeStore = business.status === 'Subscribed' && !business.storefrontSubscription;

    return (
        <Card className="col-span-1 overflow-hidden flex flex-col h-full shadow-sm border-t-4 border-primary">
            <div className="relative">
                <Image
                    src={business.logoImage || "https://picsum.photos/seed/ent/400/200"}
                    alt={business.businessName || business.name || 'Enterprise Group Logo'}
                    width={400}
                    height={200}
                    className="w-full h-32 object-contain bg-muted p-2"
                />
            </div>
            <CardHeader className="p-4">
                <div className="flex flex-col gap-2">
                     <CardTitle className="text-lg truncate">{business.businessName || business.name}</CardTitle>
                     <div className="flex flex-wrap gap-2">
                        <BusinessStatusBadge 
                            status={listingStatus as any} 
                            createdAt={business.createdAt}
                            listingSubscriptionStatus={business.listingSubscriptionStatus}
                            listingSubscriptionExpiresAt={business.listingSubscriptionExpiresAt}
                        />
                        {business.storefrontSubscription && (
                             <BusinessStatusBadge 
                                status={storefrontStatus as any}
                                listingSubscriptionStatus={business.storefrontSubscriptionStatus}
                                listingSubscriptionExpiresAt={business.storefrontSubscriptionExpiresAt}
                            />
                        )}
                     </div>
                </div>
                <CardDescription className="line-clamp-2 text-xs h-8 mt-2">{business.shortDescription || "No description provided."}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pb-4 px-4">
                 {canSubscribe && (
                    <Button size="sm" className="w-full font-bold shadow-md bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSubscribeClick(false)} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4"/>}
                        Subscribe Group
                    </Button>
                )}
                {canUpgradeStore && (
                    <Button size="sm" className="w-full font-bold shadow-md bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSubscribeClick(true)} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Store className="mr-2 h-4 w-4"/>}
                        Upgrade to Storefront
                    </Button>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 p-4 bg-muted/20 border-t">
                <div className="flex w-full gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/businesses/${business.id}`}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/enterprise/groups/edit/${business.id}`}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Link>
                    </Button>
                </div>
                 {(business.status === 'Subscribed' || business.storefrontSubscription) && (
                    <Button size="sm" variant="ghost" className="w-full text-[10px] h-6 uppercase tracking-tighter" onClick={onManageBilling} disabled={isProcessing}>
                        Manage Subscriptions
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
};

const ContentCard = ({ item, type, businesses }: { item: Advert | CommunityEvent, type: 'advert' | 'event', businesses: BusinessListing[] }) => {
    const parentBusiness = item.businessId ? businesses.find(b => b.id === item.businessId) : null;
    const isUnsubscribed = parentBusiness && (parentBusiness.status || '').trim() !== 'Subscribed';

    return (
        <Card className="overflow-hidden flex flex-col h-full shadow-sm">
            <div className="relative h-32 w-full">
                <Image src={item.image || 'https://picsum.photos/seed/promo/400/200'} alt={item.title} fill className="object-cover bg-muted" />
            </div>
            <CardHeader className="p-3">
                <CardTitle className="text-base truncate">{item.title}</CardTitle>
                {isUnsubscribed && (
                    <Badge variant="destructive" className="text-[10px] uppercase font-bold">Inactive - Subscribe Group</Badge>
                )}
            </CardHeader>
            <CardFooter className="p-3 pt-0 mt-auto flex flex-col gap-2">
                <Button variant="secondary" size="sm" asChild className="w-full">
                    <Link href={`/enterprise/${type}s/edit/${item.id}`}>Manage</Link>
                </Button>
                {isUnsubscribed && (
                     <Button size="sm" variant="outline" asChild className="w-full text-[10px] h-7 bg-amber-50 border-amber-200 text-amber-700">
                        <Link href="/enterprise/groups">Subscribe Now</Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

const ContentSection = ({ title, description, items, type, loading, businesses, onCreateClick }: { title: string, description: string, items: (Advert[] | CommunityEvent[]), type: 'advert' | 'event', loading: boolean, businesses: BusinessListing[], onCreateClick: () => void }) => {
    const itemsToDisplay = Array.isArray(items) ? items.slice(0, 4) : [];

    return (
    <Card className="col-span-1 md:col-span-3 shadow-md">
        <CardHeader className="flex flex-row justify-between items-center bg-muted/30 rounded-t-lg">
            <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </div>
             <Button onClick={onCreateClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New
            </Button>
        </CardHeader>
        <CardContent className="pt-6">
            {loading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : itemsToDisplay.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {itemsToDisplay.map(item => <ContentCard key={item.id} item={item as Advert & CommunityEvent} type={type} businesses={businesses} />)}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-md">
                    <p>No active {title.toLowerCase()} found.</p>
                </div>
            )}
        </CardContent>
    </Card>
    );
};


function EnterpriseDashboardPageContent() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [enterprisePlan, setEnterprisePlan] = React.useState<Plan | null>(null);
  const [storefrontPlan, setStorefrontPlan] = React.useState<StorefrontPlan | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = React.useState(true);

  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);
  
  const groupQuery = useMemoFirebase(() => user?.uid && db ? query(collection(db, 'businesses'), where('ownerId', '==', user.uid), where('accountType', '==', 'enterprise')) : null, [user, db]);
  const advertQuery = useMemoFirebase(() => user?.uid && db ? query(collection(db, 'adverts'), where('ownerId', '==', user.uid), where('status', 'in', ['Active', 'Approved', 'Pending Approval'])) : null, [user, db]);
  const eventQuery = useMemoFirebase(() => user?.uid && db ? query(collection(db, 'events'), where('ownerId', '==', user.uid), where('status', 'in', ['Live', 'Upcoming', 'Pending Approval'])) : null, [user, db]);

  const { data: enterpriseGroupsData, isLoading: groupsLoading } = useCollection<BusinessListing>(groupQuery);
  
  const enterpriseGroups = React.useMemo(() => {
    if (!enterpriseGroupsData) return [];
    return enterpriseGroupsData.map(d => ({
      ...d,
      businessName: d.businessName || d.name || 'Untitled Business',
    }));
  }, [enterpriseGroupsData]);

  const { data: adverts, isLoading: advertsLoading } = useCollection<Advert>(advertQuery);
  const { data: events, isLoading: eventsLoading } = useCollection<CommunityEvent>(eventQuery);

  const loading = authLoading || groupsLoading || advertsLoading || eventsLoading || loadingPlans;

  React.useEffect(() => {
      const fetchPlans = async () => {
          setLoadingPlans(true);
          const plans = await getPricingPlans();
          setEnterprisePlan(plans.enterprise);
          setStorefrontPlan(plans.storefront);
          setLoadingPlans(false);
      };
      fetchPlans();
  }, []);

  const handleSubscribe = React.useCallback(async (businessId: string, communityId: string, isStorefront: boolean) => {
    if (!user || !userProfile) return;
    setIsRedirecting(businessId);

    const sessionResult = await createCheckoutSession({
        uid: user.uid,
        email: user.email!,
        name: userProfile.name,
        purchaseType: isStorefront ? 'storefront_subscription' : 'enterprise_subscription',
        mode: 'subscription',
        successUrlPath: '/enterprise/dashboard?payment=success',
        cancelUrlPath: '/enterprise/dashboard',
        businessId: businessId,
        communityId: communityId,
        subscriptionType: isStorefront ? 'enterprise_storefront' : 'enterprise',
        metadata: {
            userId: user.uid,
            businessId: businessId,
            communityId: communityId,
            subscriptionType: isStorefront ? 'enterprise_storefront' : 'enterprise',
        }
    });

    if (sessionResult.url) {
        router.push(sessionResult.url);
    } else {
        toast({ title: "Error", description: sessionResult.error, variant: "destructive" });
        setIsRedirecting(null);
    }
  }, [user, userProfile, router, toast]);

  const handleManageBilling = React.useCallback(async () => {
    if (!user) return;
    setIsRedirecting('manage');
    const result = await createCustomerPortalLink({userId: user.uid, returnPath: '/enterprise/dashboard'});
    if ('url' in result && result.url) {
        window.location.href = result.url;
    } else {
        toast({ title: "Error", description: 'url' in result ? "Could not create billing portal link." : result.error, variant: "destructive" });
        setIsRedirecting(null);
    }
  }, [user, toast]);


  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8" />
            Enterprise Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome! Manage your enterprise groups and platform-wide activities.
        </p>
      </div>
      
       {searchParams.get('payment') === 'success' && (
           <Alert className="bg-blue-50 border-blue-200">
               <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
               <AlertTitle>Verifying with Stripe...</AlertTitle>
               <AlertDescription>Waiting for server confirmation. This takes a few seconds.</AlertDescription>
           </Alert>
       )}

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
             <Card>
                <CardHeader>
                    <CardTitle className="text-primary">Enterprise Group</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-9 w-24" /> : <p className="text-3xl font-bold">£{enterprisePlan?.monthlyPrice ?? '...'}<span className="text-sm font-normal text-muted-foreground">/month</span></p>}
                </CardContent>
             </Card>
              <Card>
                <CardHeader>
                    <CardTitle className="text-primary">Storefront Add-on</CardTitle>
                </CardHeader>
                <CardContent>
                     {loading ? <Skeleton className="h-9 w-24" /> : <p className="text-3xl font-bold">£{storefrontPlan?.monthlyPrice ?? '...'}<span className="text-sm font-normal text-muted-foreground">/month</span></p>}
                </CardContent>
             </Card>
             <Card className="col-span-1 md:col-span-2">
                <CardHeader>
                    <CardTitle>Included Features & Terms</CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {loading ? (
                      <>
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-32" />
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-2 font-medium"><ShoppingBag className="h-4 w-4 text-primary"/> Up to {enterprisePlan?.adverts ?? '20'} free adverts</p>
                        <p className="flex items-center gap-2 font-medium"><Calendar className="h-4 w-4 text-primary"/> Up to {enterprisePlan?.events ?? '12'} events/year</p>
                        <p className="flex items-center gap-2"><GalleryHorizontal className="h-4 w-4 text-primary"/> {enterprisePlan?.galleryImages ?? '50'} gallery images</p>
                        <p className="flex items-center gap-2 text-green-600 font-semibold"><Percent className="h-4 w-4"/> 40% Community Give-Back</p>
                      </>
                    )}
                </CardContent>
                <CardFooter className="pt-2">
                   <Button variant="link" asChild className="p-0 h-auto text-xs">
                        <Link href="/enterprise/terms">View Full Enterprise Terms</Link>
                    </Button>
                </CardFooter>
             </Card>
      </div>

       <div className="grid gap-6">
        <Card className="col-span-1 md:col-span-4 shadow-md">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 rounded-t-lg">
                <div>
                    <CardTitle>Your Enterprise Groups</CardTitle>
                    <CardDescription>Manage all your enterprise entities from one place.</CardDescription>
                </div>
                 <Button asChild>
                    <Link href="/enterprise/groups/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Group
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="pt-6">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : enterpriseGroups && enterpriseGroups.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {enterpriseGroups.map(group => (
                            <BusinessCard 
                                key={group.id} 
                                business={group} 
                                onSubscribe={handleSubscribe} 
                                onManageBilling={handleManageBilling} 
                                isGlobalRedirecting={isRedirecting === group.id || isRedirecting === 'manage'}
                            />
                        ))}
                    </div>
                ) : (
                     <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                        <p>You haven't created any enterprise groups yet.</p>
                         <Button asChild variant="link">
                            <Link href="/enterprise/groups/create">Create your first group now</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
             {enterpriseGroups && enterpriseGroups.length > 3 && (
                <CardFooter className="border-t pt-4">
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href="/enterprise/groups">Manage All Groups</Link>
                    </Button>
                </CardFooter>
            )}
        </Card>
        <ContentSection
          title="Active Adverts"
          description="Your currently active campaigns across all communities."
          items={adverts || []}
          type="advert"
          loading={loading}
          businesses={enterpriseGroups}
          onCreateClick={() => router.push('/enterprise/adverts/create')}
        />
        <ContentSection
          title="Active & Upcoming Events"
          description="Your currently active and upcoming events."
          items={events || []}
          type="event"
          loading={loading}
          businesses={enterpriseGroups}
          onCreateClick={() => setIsCreateEventDialogOpen(true)}
        />
      </div>
    </div>
     <Dialog open={isCreateEventDialogOpen} onOpenChange={setIsCreateEventDialogOpen}>
        <DialogContent className="sm:max-w-3xl grid grid-rows-[auto,minmax(0,1fr),auto] p-0 max-h-[90vh]">
            <DialogHeader className="p-6 pb-2">
                <DialogTitle>Create New Community Event</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-auto">
                <div className="px-6 pb-6">
                <CreateEventForm onSaveSuccess={() => setIsCreateEventDialogOpen(false)} />
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
    </>
  );
}

export default function EnterpriseDashboardPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>}>
            <EnterpriseDashboardPageContent />
        </Suspense>
    )
}
