'use client';

import * as React from "react";
import { Suspense } from "react";
import Link from 'next/link';
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  PlusCircle,
  MoreHorizontal,
  BadgeCheck,
  Percent,
  Loader2,
  CreditCard,
  Trash2,
  Eye,
  FileEdit,
  Store,
  ArrowUpDown,
  Info,
  ShieldAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { useToast } from "@/hooks/use-toast";
import { createCheckoutSession } from "@/lib/actions/stripeActions";
import { deleteBusinessAction } from "@/lib/actions/businessActions";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { differenceInDays, isValid } from "date-fns";
import { PaginationControls } from "@/components/ui/pagination";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, documentId } from "firebase/firestore";

export type BusinessListing = {
  id: string;
  businessName: string;
  name?: string; 
  businessCategory: string;
  status:
    | "Pending Approval"
    | "Approved"
    | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Hidden" | "Trial Expired";
  createdAt?: any;
  submittedAt?: any;
  listingStripeSubscriptionId?: string;
  listingSubscriptionExpiresAt?: any;
  isFreeListing?: boolean;
  freeListingExpiresAt?: any;
  listingSubscriptionStatus?: 'pending_cancellation' | 'payment_failed';
  storefrontSubscriptionStatus?: 'pending_cancellation' | 'payment_failed';
  storefrontSubscriptionExpiresAt?: any;
  ownerId?: string;
  team?: any[];
  amendmentReason?: string;
  primaryCommunityId: string;
  storefrontSubscription?: boolean;
};

const toDateHelper = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds !== undefined) return new Date(timestamp.seconds * 1000);
    const d = new Date(timestamp);
    return isValid(d) ? d : null;
};

const getListingEffectiveStatus = (business: BusinessListing, now: Date): string => {
    const { status, listingSubscriptionExpiresAt, isFreeListing, freeListingExpiresAt, listingSubscriptionStatus, createdAt } = business;
    
    if (listingSubscriptionStatus === 'payment_failed') return "Payment Failed";
    if (listingSubscriptionStatus === 'pending_cancellation') return "Pending Cancellation";

    const freeExpiry = toDateHelper(freeListingExpiresAt);
    if (isFreeListing && freeExpiry && now > freeExpiry) return "Subscription Expired";

    const subExpiry = toDateHelper(listingSubscriptionExpiresAt);
    if (status === 'Subscribed' && subExpiry && now > subExpiry) return "Subscription Expired";
    
    const creationDate = toDateHelper(createdAt);
    if (status === 'Approved' && creationDate && differenceInDays(now, creationDate) > 14) return "Trial Expired";
    
    return status;
};

const getStorefrontEffectiveStatus = (business: BusinessListing, listingStatus: string, now: Date): string => {
    if (!business.storefrontSubscription) return "None";

    const { storefrontSubscriptionStatus, storefrontSubscriptionExpiresAt } = business;

    if (storefrontSubscriptionStatus === 'payment_failed') return "Payment Failed";

    const listingIsInactive = ["Subscription Expired", "Trial Expired", "Hidden", "Declined"].includes(listingStatus);
    const storefrontIsStillActive = storefrontSubscriptionStatus !== 'pending_cancellation';

    if (listingIsInactive && storefrontIsStillActive) return "Orphaned";
    if (storefrontSubscriptionStatus === 'pending_cancellation') return "Pending Cancellation";

    const subExpiry = toDateHelper(storefrontSubscriptionExpiresAt);
    if (subExpiry && now > subExpiry) return "Subscription Expired";

    return "Subscribed";
};

const TABS: { value: string; label: string }[] = [
    { value: "all", label: "All Active" },
    { value: "Pending Approval", label: "Pending" },
    { value: "Approved", label: "Trial" },
    { value: "Subscribed", label: "Subscribed" },
    { value: "Requires Amendment", label: "Amendment Req." },
    { value: "Hidden", label: "Hidden" },
    { value: "Declined", label: "Declined" },
    { value: "Draft", label: "Drafts" },
];

function BusinessListingsContent() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isClient, setIsClient] = React.useState(false);
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<any>(userProfileRef);

  const [businessPlan, setBusinessPlan] = React.useState<Plan | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [businessToAction, setBusinessToAction] = React.useState<BusinessListing | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [activeTab, setActiveTab] = React.useState("all");
  const [sorting, setSorting] = React.useState<{ key: keyof BusinessListing; order: 'asc' | 'desc' }>({ key: 'businessName', order: 'asc' });
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  
  const [amendmentReason, setAmendmentReason] = React.useState<string | null>(null);
  const [isAmendmentDialogOpen, setIsAmendmentDialogOpen] = React.useState(false);

  const ownedBusinessesQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(collection(db, 'businesses'), where('ownerId', '==', user.uid));
  }, [user, db]);

  const teamBusinessesQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(collection(db, 'businesses'), where('teamMemberIds', 'array-contains', user.uid));
  }, [user, db]);

  const { data: ownedBusinessesData, isLoading: loadingOwned } = useCollection<BusinessListing>(ownedBusinessesQuery);
  const { data: teamBusinesses, isLoading: loadingTeam } = useCollection<BusinessListing>(teamBusinessesQuery);
  
  const businesses: BusinessListing[] = React.useMemo(() => {
    const all = new Map<string, BusinessListing>();
    const owned = (ownedBusinessesData || []).filter(b => {
        if ((b as any).accountType === 'courier') return b.status === 'Hidden';
        return true;
    });

    const team = (teamBusinesses || []).filter(b => (b as any).accountType !== 'courier');

    owned.forEach(b => all.set(b.id, { ...b, businessName: b.businessName || b.name || 'Untitled Business' }));
    team.forEach(b => {
        if (!all.has(b.id)) {
            all.set(b.id, { ...b, businessName: b.businessName || b.name || 'Untitled Business' });
        }
    });

    return Array.from(all.values());
  }, [ownedBusinessesData, teamBusinesses]);
  
  const loading = authLoading || loadingOwned || loadingTeam || profileLoading || !isClient || !now;

  React.useEffect(() => {
    const fetchPlans = async () => {
      const plans = await getPricingPlans();
      if (plans.business) {
        setBusinessPlan(plans.business);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (businessId: string, communityId: string, isStorefront: boolean) => {
    if (!user || !userProfile) return;
    setIsRedirecting(businessId);
    
    const result = await createCheckoutSession({
        uid: user.uid,
        email: user.email!,
        name: userProfile.name,
        purchaseType: isStorefront ? 'storefront_subscription' : 'listing_subscription',
        mode: 'subscription',
        successUrlPath: '/business/listings?payment=success',
        businessId: businessId, 
        communityId: communityId,
        subscriptionType: isStorefront ? 'storefront' : 'listing',
        metadata: {
            userId: user.uid,
            businessId: businessId,
            communityId: communityId,
            subscriptionType: isStorefront ? 'storefront' : 'listing',
        }
    });

    if (result.url) {
        router.push(result.url);
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        setIsRedirecting(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!businessToAction || !user) return;
    setIsDeleting(true);
    const result = await deleteBusinessAction({ businessId: businessToAction.id, userId: user.uid });
    
    if (result.success) {
      toast({ title: "Business Deleted" });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
    setBusinessToAction(null);
  }

  const handleEdit = (business: BusinessListing) => {
    router.push(`/business/businesses/edit/${business.id}`);
  }

  const handleSort = (key: keyof BusinessListing) => {
    setSorting(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedAndFilteredBusinesses = React.useMemo(() => {
    if (!businesses || !now) return [];
    
    let filtered = businesses.filter(business => {
        const listingStatus = getListingEffectiveStatus(business, now!);
        
        if (activeTab === "all") {
            return !['Hidden', 'Declined', 'Draft', 'Subscription Expired', 'Trial Expired', 'Payment Failed'].includes(listingStatus);
        }
        
        if (activeTab === "Approved") {
             return listingStatus === "Approved" || listingStatus === "Trial Expired";
        }

        if (activeTab === "Subscribed") {
             return business.status === activeTab && !["Subscription Expired", "Payment Failed"].includes(listingStatus);
        }

        return business.status === activeTab;
    });

    return [...filtered].sort((a,b) => {
        const key = sorting.key;
        const valA = a[key] as any;
        const valB = b[key] as any;
        const order = sorting.order === 'asc' ? 1 : -1;

        if (key === 'createdAt' || key === 'submittedAt') {
            const dateA = toDateHelper(valA)?.getTime() || 0;
            const dateB = toDateHelper(valB)?.getTime() || 0;
            return (dateA - dateB) * order;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB) * order;
        }
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
    });

  }, [businesses, activeTab, sorting, now]);

  const pageCount = Math.ceil(sortedAndFilteredBusinesses.length / pagination.pageSize);
  const paginatedBusinesses = React.useMemo(() => {
    return sortedAndFilteredBusinesses.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
    );
  }, [sortedAndFilteredBusinesses, pagination]);

  const handleViewAmendment = (business: BusinessListing) => {
    setAmendmentReason(business.amendmentReason || "No reason provided.");
    setIsAmendmentDialogOpen(true);
  };


  if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground animate-pulse">Initializing Dashboard...</p>
        </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            My Businesses
          </h1>
          <p className="text-muted-foreground">Manage your business listings and subscriptions.</p>
        </div>

        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardHeader>
            <CardTitle className="text-primary">Business Listing Information</CardTitle>
            <CardDescription className="text-primary/80">Everything included with your subscription.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-background/80 rounded-lg border">
                <CardTitle className="text-base mb-2">£{businessPlan?.monthlyPrice ?? 20} /mo</CardTitle>
                <p className="text-sm text-muted-foreground">Base fee per listing.</p>
            </div>
            <div className="p-4 bg-background/80 rounded-lg border">
              <CardTitle className="text-base flex items-center gap-2 mb-2"><Percent className="h-5 w-5 text-green-500" /> 40% Give-Back</CardTitle>
              <p className="text-sm text-muted-foreground">Goes directly to your local area.</p>
            </div>
             <div className="p-4 bg-background/80 rounded-lg border">
                <CardTitle className="text-base flex items-center gap-2 mb-2"><BadgeCheck className="h-5 w-5 text-blue-500" /> Multi-Ads</CardTitle>
                <p className="text-sm text-muted-foreground">{businessPlan?.adverts ?? 3} ads & {businessPlan?.events ?? 2} events/year.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <CardTitle>Business Index</CardTitle>
              <Button asChild><Link href="/business/businesses/create"><PlusCircle className="mr-2 h-4 w-4" />New Business</Link></Button>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 h-auto">
                    {TABS.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="text-xs">{tab.label}</TabsTrigger>)}
                </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Button variant="ghost" className="p-0 h-auto font-bold hover:bg-transparent" onClick={() => handleSort('businessName')}>Business Name <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Listing Status</TableHead>
                    <TableHead>Storefront</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBusinesses.length > 0 ? (
                    paginatedBusinesses.map((business) => {
                      const listingStatus = getListingEffectiveStatus(business, now!);
                      const storefrontStatus = getStorefrontEffectiveStatus(business, listingStatus, now!);
                      return (
                        <ContextMenu key={business.id}>
                          <ContextMenuTrigger asChild>
                            <TableRow className="cursor-pointer" onClick={() => handleEdit(business)}>
                              <TableCell className="font-medium">{business.businessName}</TableCell>
                              <TableCell className="capitalize">{business.businessCategory?.replace('-', ' ')}</TableCell>
                              <TableCell>
                                <BusinessStatusBadge 
                                    status={listingStatus as any} 
                                    createdAt={business.createdAt}
                                    isFreeListing={business.isFreeListing}
                                    freeListingExpiresAt={business.freeListingExpiresAt}
                                    listingSubscriptionStatus={business.listingSubscriptionStatus}
                                    listingSubscriptionExpiresAt={business.listingSubscriptionExpiresAt}
                                    amendmentReason={business.amendmentReason}
                                    now={now}
                                />
                              </TableCell>
                              <TableCell>
                                <BusinessStatusBadge 
                                    status={storefrontStatus as any}
                                    listingSubscriptionStatus={business.storefrontSubscriptionStatus}
                                    listingSubscriptionExpiresAt={business.storefrontSubscriptionExpiresAt}
                                    now={now}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => router.push(`/businesses/${business.id}`), 100); }}><Eye className="mr-2 h-4 w-4" />View Listing</DropdownMenuItem>
                                    {business.status === 'Requires Amendment' && (
                                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => handleViewAmendment(business), 100); }}>
                                            <ShieldAlert className="mr-2 h-4 w-4 text-orange-500" /> View Amendment Details
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => handleEdit(business), 100); }}><FileEdit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                    {(listingStatus === "Approved" || listingStatus === "Trial Expired" || listingStatus === "Payment Failed") && (
                                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleSubscribe(business.id, business.primaryCommunityId, false); }} disabled={isRedirecting === business.id}>
                                          {isRedirecting === business.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4" />}
                                          Subscribe Listing
                                      </DropdownMenuItem>
                                    )}
                                    {business.status === 'Subscribed' && !business.storefrontSubscription && (
                                         <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleSubscribe(business.id, business.primaryCommunityId, true); }} disabled={isRedirecting === business.id}>
                                          {isRedirecting === business.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Store className="mr-2 h-4 w-4"/>}
                                          Add Storefront
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); setBusinessToAction(business); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuLabel>{business.businessName}</ContextMenuLabel>
                            <ContextMenuItem onSelect={() => router.push(`/businesses/${business.id}`)}>View Listing</ContextMenuItem>
                            <ContextMenuItem onSelect={() => handleEdit(business)}>Edit</ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem className="text-destructive" onSelect={() => { setBusinessToAction(business); setIsDeleteDialogOpen(true); }}>Delete</ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })
                  ) : (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No results found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
             <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={sortedAndFilteredBusinesses.length} />
          </CardContent>
        </Card>

       <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>This will permanently delete "{businessToAction?.businessName}" and all associated data. This action is irreversible.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleDeleteConfirm} variant="destructive" disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Deletion
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAmendmentDialogOpen} onOpenChange={setIsAmendmentDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Amendment Reason</DialogTitle>
                <DialogDescription>
                    The community leader has requested changes for the following reason:
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <p className="text-sm p-4 bg-muted rounded-md">{amendmentReason}</p>
            </div>
            <DialogFooter>
                <Button onClick={() => setIsAmendmentDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MyBusinessesPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <BusinessListingsContent />
        </Suspense>
    )
}