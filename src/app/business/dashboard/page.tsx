
'use client';

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
  Handshake,
  Megaphone,
  Calendar,
  CreditCard,
  Eye,
  Pencil,
  CheckCircle,
  Clock,
  ShieldAlert,
  XCircle,
  Home,
  Building,
  Store,
  ShoppingBag,
  GalleryHorizontal,
  Percent,
  Gift,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState, Suspense } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { doc } from "firebase/firestore";
import { getPricingPlans, type Plan, type StorefrontPlan } from '@/lib/actions/pricingActions';
import { createCheckoutSession, verifyCheckoutSessionAction, createCustomerPortalLink } from "@/lib/actions/stripeActions";
import { differenceInDays } from "date-fns";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateEventForm } from "@/components/create-event-form";
import { ScrollArea } from "@/components/ui/scroll-area";


type BusinessListing = {
  id: string;
  businessName: string;
  name?: string; // For backwards compatibility
  shortDescription: string;
  logoImage?: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Hidden";
  storefrontSubscription?: boolean;
  createdAt?: { toDate: () => Date };
  listingSubscriptionStatus?: 'pending_cancellation';
  listingSubscriptionExpiresAt?: { toDate: () => Date };
};

type Advert = {
    id: string;
    title: string;
    image?: string;
    type: 'featured' | 'partner';
};

type CommunityEvent = {
    id: string;
    title: string;
    image?: string;
}

const BusinessCard = ({ business, onSubscribe, onManageBilling }: { business: BusinessListing, onSubscribe: (businessId: string, isStorefront: boolean) => void, onManageBilling: () => void }) => {
    const [isRedirecting, setIsRedirecting] = React.useState<boolean>(false);
    
    const handleSubscribeClick = async (isStorefront: boolean) => {
        setIsRedirecting(true);
        await onSubscribe(business.id, isStorefront);
        // No need to set isRedirecting to false as it will navigate away
    }
    
    return (
        <Card className="col-span-1 overflow-hidden">
            <div className="relative">
                <Image
                    src={business.logoImage || "https://picsum.photos/400/200"}
                    alt={business.businessName || business.name || 'Business Logo'}
                    width={400}
                    height={200}
                    className="w-full h-32 object-contain bg-muted p-2"
                />
            </div>
            <CardHeader>
                <div className="flex justify-between items-start">
                     <CardTitle className="text-lg">{business.businessName || business.name}</CardTitle>
                     <BusinessStatusBadge 
                        status={business.status} 
                        createdAt={business.createdAt}
                        listingSubscriptionStatus={business.listingSubscriptionStatus}
                        listingSubscriptionExpiresAt={business.listingSubscriptionExpiresAt}
                     />
                </div>
                <CardDescription className="line-clamp-2 text-xs">{business.shortDescription || "No description."}</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-2">
                <div className="flex w-full gap-2">
                    <Button asChild variant="secondary" size="sm" className="flex-1">
                        <Link href={`/businesses/${business.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/business/businesses/edit/${business.id}`}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Link>
                    </Button>
                </div>
                {business.status === 'Approved' && (
                    <Button size="sm" className="w-full" onClick={() => handleSubscribeClick(false)} disabled={isRedirecting}>
                        {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4"/>}
                        Subscribe
                    </Button>
                )}
                 {business.status === 'Subscribed' && !business.storefrontSubscription && (
                    <Button size="sm" className="w-full" onClick={() => handleSubscribeClick(true)}>
                        {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Store className="mr-2 h-4 w-4"/>}
                        Upgrade to Storefront
                    </Button>
                )}
                 {business.status === 'Subscribed' && (
                    <Button size="sm" variant="outline" className="w-full" onClick={onManageBilling}>
                        Manage Billing
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
};

const ContentCard = ({ item, type, onCreateClick }: { item: Advert | CommunityEvent, type: 'advert' | 'event', onCreateClick: () => void; }) => (
    <Card className="overflow-hidden">
        <Image src={item.image || 'https://picsum.photos/400/200'} alt={item.title} width={400} height={200} className="w-full h-32 object-cover bg-muted" />
        <CardHeader>
            <CardTitle className="text-base truncate">{item.title}</CardTitle>
        </CardHeader>
        <CardFooter>
            <Button variant="secondary" size="sm" asChild>
                <Link href={`/business/${type}s/edit/${item.id}`}>Manage</Link>
            </Button>
        </CardFooter>
    </Card>
);

const ContentSection = ({ title, description, items, type, loading, onCreateClick }: { title: string, description: string, items: (Advert[] | CommunityEvent[]), type: 'advert' | 'event', loading: boolean, onCreateClick: () => void }) => (
    <Card className="col-span-1 md:col-span-3">
        <CardHeader className="flex-row justify-between items-center">
            <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </div>
             <Button onClick={onCreateClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New
            </Button>
        </CardHeader>
        <CardContent>
            {loading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {items.map(item => <ContentCard key={item.id} item={item as Advert & CommunityEvent} type={type} onCreateClick={onCreateClick} />)}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-8">
                    <p>No active {title.toLowerCase()} found.</p>
                </div>
            )}
        </CardContent>
    </Card>
);

function BusinessDashboardPageContent() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [businessPlan, setBusinessPlan] = React.useState<Plan | null>(null);
  const [storefrontPlan, setStorefrontPlan] = React.useState<StorefrontPlan | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = React.useState(true);

  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);
  
  const businessQuery = useMemoFirebase(() => user?.uid && db ? query(collection(db, 'businesses'), where('ownerId', '==', user.uid)) : null, [user, db]);
  const advertQuery = useMemoFirebase(() => user?.uid && db ? query(collection(db, 'adverts'), where('ownerId', '==', user.uid), where('status', 'in', ['Active', 'Approved'])) : null, [user, db]);
  const eventQuery = useMemoFirebase(() => user?.uid && db ? query(collection(db, 'events'), where('ownerId', '==', user.uid), where('status', 'in', ['Live', 'Upcoming'])) : null, [user, db]);

  const { data: businessesData, isLoading: businessesLoading } = useCollection<BusinessListing>(businessQuery);
  
  const businesses = React.useMemo(() => {
    if (!businessesData) return [];
    return businessesData.map(d => ({
      ...d,
      businessName: d.businessName || d.name || 'Untitled Business',
    }));
  }, [businessesData]);

  const { data: adverts, isLoading: advertsLoading } = useCollection<Advert>(advertQuery);
  const { data: events, isLoading: eventsLoading } = useCollection<CommunityEvent>(eventQuery);

  const loading = authLoading || businessesLoading || advertsLoading || eventsLoading || loadingPlans;

  React.useEffect(() => {
      const sessionId = searchParams.get('session_id');
      if (searchParams.get('payment') === 'success' && sessionId) {
          const verify = async () => {
              toast({ title: 'Payment Successful!', description: 'Verifying subscription status...' });
              const result = await verifyCheckoutSessionAction({ sessionId });
              if (result.success) {
                  toast({ title: 'Subscription Activated!', description: 'Your business is now subscribed.' });
              } else if (result.error) {
                  toast({ title: 'Verification Failed', description: `Your payment was successful, but we couldn't automatically verify your subscription. Please check again in a few minutes or contact support. Error: ${result.error}`, variant: 'destructive', duration: 10000 });
              }
          };
          verify();
      }
  }, [searchParams, toast]);

  React.useEffect(() => {
      const fetchPlans = async () => {
          setLoadingPlans(true);
          const plans = await getPricingPlans();
          setBusinessPlan(plans.business);
          setStorefrontPlan(plans.storefront);
          setLoadingPlans(false);
      };
      fetchPlans();
  }, []);

  const handleSubscribe = async (businessId: string, isStorefront: boolean) => {
    if (!user || !userProfile) return;
    setIsRedirecting(businessId);

    const sessionResult = await createCheckoutSession({
        uid: user.uid,
        email: user.email!,
        name: userProfile.name,
        purchaseType: isStorefront ? 'storefront_subscription' : 'listing_subscription',
        mode: 'subscription',
        successUrlPath: '/business/dashboard?payment=success',
        businessId: businessId,
        subscriptionType: isStorefront ? 'storefront' : 'listing',
    });

    if (sessionResult.url) {
        router.push(sessionResult.url);
    } else {
        toast({ title: "Error", description: sessionResult.error, variant: "destructive" });
        setIsRedirecting(null);
    }
  };

  const handleManageBilling = async () => {
    if (!user) return;
    setIsRedirecting('manage');
    const result = await createCustomerPortalLink({userId: user.uid, returnPath: '/business/dashboard'});
    if ('url' in result && result.url) {
        window.location.href = result.url;
    } else {
        toast({ title: "Error", description: 'url' in result ? "Could not create billing portal link." : result.error, variant: "destructive" });
        setIsRedirecting(null);
    }
  };


  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8" />
            Business Dashboard
        </h1>
        <p className="text-muted-foreground">
            Welcome to your business dashboard. Manage your listings, adverts, events, and finances.
        </p>
      </div>
      
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
             <Card>
                <CardHeader>
                    <CardTitle className="text-primary">Business Listing</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-9 w-24" /> : <p className="text-3xl font-bold">£{businessPlan?.monthlyPrice ?? '...'}<span className="text-sm font-normal text-muted-foreground">/month</span></p>}
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
                    <CardTitle>Included Features</CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    {loading ? (
                      <>
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-32" />
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary"/> Up to {businessPlan?.adverts ?? '...'} free adverts</p>
                        <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary"/> Up to {businessPlan?.events ?? '...'} free events/year</p>
                        <p className="flex items-center gap-2"><GalleryHorizontal className="h-4 w-4 text-primary"/> {businessPlan?.galleryImages ?? '...'} gallery images</p>
                      </>
                    )}
                </CardContent>
             </Card>
      </div>

       <div className="grid gap-6">
             <Card className="col-span-1 md:col-span-3">
                <CardHeader className="flex-row justify-between items-center">
                    <div>
                        <CardTitle>Your Business Listings</CardTitle>
                        <CardDescription>Manage all your businesses from one place.</CardDescription>
                    </div>
                     <Button asChild>
                        <Link href="/business/businesses/create">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create New Business
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : businesses && businesses.length > 0 ? (
                        <>
                        <Alert variant="default" className="mb-4">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Please note: Any edits or amendments made to an existing business listing will require the listing to be re-submitted for approval by the community leader.
                            </AlertDescription>
                        </Alert>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {businesses.slice(0,3).map(biz => <BusinessCard key={biz.id} business={biz} onSubscribe={handleSubscribe} onManageBilling={handleManageBilling} />)}
                        </div>
                        </>
                    ) : (
                         <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                            <p>You haven't created any business listings yet.</p>
                             <Button asChild variant="link">
                                <Link href="/business/businesses/create">Create your first business listing now</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
                 {businesses && businesses.length > 3 && (
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href="/business/listings">Manage All Listings</Link>
                        </Button>
                    </CardFooter>
                )}
            </Card>
            <ContentSection title="Active Adverts" description="Your currently active campaigns." items={adverts || []} type="advert" loading={loading} onCreateClick={() => router.push('/business/adverts/create')} />
            <ContentSection title="Active & Upcoming Events" description="Your currently active and upcoming events." items={events || []} type="event" loading={loading} onCreateClick={() => setIsCreateEventDialogOpen(true)} />
      </div>
    </div>
     <Dialog open={isCreateEventDialogOpen} onOpenChange={setIsCreateEventDialogOpen}>
        <DialogContent className="sm:max-w-3xl grid-rows-[auto,minmax(0,1fr),auto] p-0 max-h-[90vh]">
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

export default function BusinessDashboardPage() {
    return (
        <Suspense>
            <BusinessDashboardPageContent />
        </Suspense>
    )
}
