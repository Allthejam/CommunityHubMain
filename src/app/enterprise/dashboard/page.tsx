
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


type EnterpriseGroup = {
  id: string;
  businessName: string;
  name?: string; // For backwards compatibility
  shortDescription: string;
  logoImage?: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Hidden";
  storefrontSubscription?: boolean;
  createdAt?: { toDate: () => Date };
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

const EnterpriseGroupCard = ({ group, onSubscribe, onManageBilling }: { group: EnterpriseGroup, onSubscribe: (businessId: string, isStorefront: boolean) => void, onManageBilling: () => void }) => {
    const [isRedirecting, setIsRedirecting] = React.useState<boolean>(false);
    
    const handleSubscribeClick = async (isStorefront: boolean) => {
        setIsRedirecting(true);
        await onSubscribe(group.id, isStorefront);
    }
    
    return (
        <Card className="col-span-1 overflow-hidden">
            <div className="relative">
                <Image
                    src={group.logoImage || "https://picsum.photos/400/200"}
                    alt={group.businessName || group.name || 'Enterprise Group Logo'}
                    width={400}
                    height={200}
                    className="w-full h-32 object-contain bg-muted p-2"
                />
            </div>
            <CardHeader>
                <div className="flex justify-between items-start">
                     <CardTitle className="text-lg">{group.businessName || group.name}</CardTitle>
                     <BusinessStatusBadge status={group.status} createdAt={group.createdAt} />
                </div>
                <CardDescription className="line-clamp-2 text-xs">{group.shortDescription || "No description."}</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-2">
                <div className="flex w-full gap-2">
                    <Button asChild variant="secondary" size="sm" className="flex-1">
                        <Link href={`/businesses/${group.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/enterprise/groups/edit/${group.id}`}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Link>
                    </Button>
                </div>
                {group.status === 'Approved' && (
                    <Button size="sm" className="w-full" onClick={() => handleSubscribeClick(false)} disabled={isRedirecting}>
                        {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4"/>}
                        Subscribe
                    </Button>
                )}
                 {group.status === 'Subscribed' && !group.storefrontSubscription && (
                    <Button size="sm" className="w-full" onClick={() => handleSubscribeClick(true)}>
                        {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Store className="mr-2 h-4 w-4"/>}
                        Upgrade to Storefront
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
                <Link href={`/enterprise/${type}s/edit/${item.id}`}>Manage</Link>
            </Button>
        </CardFooter>
    </Card>
);

const ContentSection = ({ title, description, items, type, loading, onCreateClick }: { title: string, description: string, items: (Advert[] | CommunityEvent[]), type: 'advert' | 'event', loading: boolean, onCreateClick: () => void }) => {
    // Check if items is defined and is an array before calling slice
    const itemsToDisplay = Array.isArray(items) ? items.slice(0, 4) : [];

    return (
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
            ) : itemsToDisplay.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {itemsToDisplay.map(item => <ContentCard key={item.id} item={item as Advert & CommunityEvent} type={type} onCreateClick={onCreateClick} />)}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-8">
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
  const advertQuery = useMemoFirebase(() => user?.uid && db ? query(collection(db, 'adverts'), where('ownerId', '==', user.uid), where('status', 'in', ['Active', 'Approved'])) : null, [user, db]);
  const eventQuery = useMemoFirebase(() => user?.uid && db ? query(collection(db, 'events'), where('ownerId', '==', user.uid), where('status', 'in', ['Live', 'Upcoming'])) : null, [user, db]);

  const { data: enterpriseGroupsData, isLoading: groupsLoading } = useCollection<EnterpriseGroup>(groupQuery);
  
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
          setEnterprisePlan(plans.enterprise);
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
        purchaseType: isStorefront ? 'storefront_subscription' : 'enterprise_subscription',
        mode: 'subscription',
        successUrlPath: '/enterprise/dashboard?payment=success',
        businessId: businessId,
        subscriptionType: isStorefront ? 'storefront' : 'enterprise',
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
            Enterprise Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome! Manage your enterprise groups and platform-wide activities.
        </p>
      </div>
      
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
         <Card className="col-span-1 md:col-span-4 bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="text-primary">Pricing & Terms</CardTitle>
                <CardDescription className="text-primary/80 dark:text-primary/90">A summary of your current enterprise plan costs.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-background/80 rounded-lg border">
                    <CardTitle className="text-base flex items-center gap-2 mb-2"><Handshake /> Groups</CardTitle>
                    <p className="text-2xl font-bold">£{enterprisePlan?.monthlyPrice ?? '...'}</p>
                    <p className="text-xs text-muted-foreground">per group / per month</p>
                </div>
                 <div className="p-4 bg-background/80 rounded-lg border">
                    <CardTitle className="text-base flex items-center gap-2 mb-2"><Megaphone /> Adverts</CardTitle>
                    <p className="text-2xl font-bold">£{enterprisePlan?.additionalAdvertPrice ?? '...'}</p>
                    <p className="text-xs text-muted-foreground">per additional advert</p>
                </div>
                 <div className="p-4 bg-background/80 rounded-lg border">
                    <CardTitle className="text-base flex items-center gap-2 mb-2"><Calendar /> Events</CardTitle>
                    <p className="text-2xl font-bold">£{enterprisePlan?.additionalEventPrice ?? '...'}</p>
                    <p className="text-xs text-muted-foreground">per additional event</p>
                </div>
             <div className="p-4 bg-background/80 rounded-lg border">
              <CardTitle className="text-base flex items-center gap-2 mb-2">
                <Percent className="h-5 w-5 text-green-500" /> 40% Community Give-Back
              </CardTitle>
              <p className="text-muted-foreground text-sm">We donate 40% of your fee back to the registered local community.</p>
            </div>
            </CardContent>
             <CardFooter>
                 <Button variant="link" asChild className="p-0 h-auto">
                    <Link href="/enterprise/terms">See Full Terms & Conditions</Link>
                </Button>
             </CardFooter>
        </Card>

        <Card className="col-span-1 md:col-span-4">
            <CardHeader className="flex-row justify-between items-center">
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
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : enterpriseGroups && enterpriseGroups.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {enterpriseGroups.slice(0,3).map(group => <EnterpriseGroupCard key={group.id} group={group} onSubscribe={handleSubscribe} onManageBilling={handleManageBilling}/>)}
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
                <CardFooter>
                    <Button asChild variant="outline">
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
          onCreateClick={() => router.push('/enterprise/adverts/create')}
        />
        <ContentSection
          title="Active & Upcoming Events"
          description="Your currently active and upcoming events."
          items={events || []}
          type="event"
          loading={loading}
          onCreateClick={() => setIsCreateEventDialogOpen(true)}
        />
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

export default function EnterpriseDashboardPage() {
    return (
        <Suspense>
            <EnterpriseDashboardPageContent />
        </Suspense>
    )
}
