

'use client';

import * as React from "react";
import {
    MoreHorizontal,
    Building2,
    CheckCircle,
    XCircle,
    FileEdit,
    Clock,
    Loader2,
    ArrowUpDown,
    ShieldAlert,
    Eye,
    Archive,
    Trash2,
    Gift,
    CreditCard,
    EyeOff,
    HelpCircle,
} from "lucide-react"
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";

import { Button } from "@/components/ui/button";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { updateBusinessStatusAction, type BusinessListing as ServerBusinessListing, approveAsFreeListingAction, cancelFreeListingAction } from "@/lib/actions/businessActions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { createCheckoutSession } from "@/lib/actions/stripeActions";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


const TABS: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    { value: "Pending Approval", label: "Pending" },
    { value: "Approved", label: "Trial" },
    { value: "Subscribed", label: "Subscribed" },
    { value: "Requires Amendment", label: "Amendment Req." },
    { value: "Hidden", label: "Hidden" },
    { value: "Declined", label: "Declined" },
    { value: "Draft", label: "Drafts" },
];

type BusinessListing = Omit<ServerBusinessListing, 'subscriptionExpiresAt'> & {
    accountType: string;
    isPrimary: boolean;
    isFreeListing?: boolean;
    freeListingExpiresAt?: { toDate: () => Date };
    listingSubscriptionStatus?: 'pending_cancellation';
    listingSubscriptionExpiresAt?: { toDate: () => Date };
    storefrontSubscriptionStatus?: 'pending_cancellation';
    storefrontSubscriptionExpiresAt?: { toDate: () => Date };
};


export default function LeaderBusinessesPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [businesses, setBusinesses] = React.useState<BusinessListing[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();
    const [activeTab, setActiveTab] = React.useState("Pending Approval");
    
    const [amendmentBusiness, setAmendmentBusiness] = React.useState<BusinessListing | null>(null);
    const [amendmentReason, setAmendmentReason] = React.useState("");
    const [isSubmittingAmendment, setIsSubmittingAmendment] = React.useState(false);
    
    const [sorting, setSorting] = React.useState<{ key: keyof BusinessListing; order: 'asc' | 'desc' }>({ key: 'submittedAt', order: 'desc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
    
    const [isFreeListingDialogOpen, setIsFreeListingDialogOpen] = React.useState(false);
    const [businessToChampion, setBusinessToChampion] = React.useState<BusinessListing | null>(null);
    const [businessToAction, setBusinessToAction] = React.useState<BusinessListing | null>(null);
    const [isApprovingFree, setIsApprovingFree] = React.useState(false);
    const [isRedirecting, setIsRedirecting] = React.useState<string | null>(null);
    const router = useRouter();
    const [isCancelFreeListingDialogOpen, setIsCancelFreeListingDialogOpen] = React.useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);


    const communityId = userProfile?.communityId;
    const communityRef = useMemoFirebase(() => (communityId && db ? doc(db, 'communities', communityId) : null), [communityId, db]);
    const { data: communityData, isLoading: communityIsLoading } = useDoc(communityRef);

    const isStripeConnected = !!communityData?.stripeAccountId;
    
    const isFreeListingAvailable = React.useMemo(() => {
        if (!communityData) return false;
        const lastGranted = communityData.freeListingGrantedAt?.toDate();
        if (!lastGranted) return true; // Never granted before

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return lastGranted < oneYearAgo;
    }, [communityData]);


    React.useEffect(() => {
        if (isUserLoading || profileLoading || !userProfile?.communityId || !db) {
            return;
        }

        setLoading(true);

        const communityId = userProfile.communityId;
        const businessesRef = collection(db, "businesses");

        const primaryQuery = query(businessesRef, where("primaryCommunityId", "==", communityId));
        
        const additionalQuery = query(businessesRef, where("additionalCommunityIds", "array-contains", communityId));

        const processSnapshot = (snapshot: any, isPrimary: boolean) => {
            return snapshot.docs.map((doc: any) => ({ 
                id: doc.id, 
                ...doc.data(),
                isPrimary: isPrimary 
            } as BusinessListing));
        };

        const unsubPrimary = onSnapshot(primaryQuery, (snapshot) => {
             const primaryBusinesses = processSnapshot(snapshot, true);
             setBusinesses(prev => {
                 const newMap = new Map(prev.map(b => [b.id, b]));
                 primaryBusinesses.forEach(b => newMap.set(b.id, b));
                 return Array.from(newMap.values());
             });
             setLoading(false);
        }, (error) => {
            console.error("Error fetching primary businesses:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch primary businesses.' });
            setLoading(false);
        });

        const unsubAdditional = onSnapshot(additionalQuery, (snapshot) => {
             const additionalBusinesses = processSnapshot(snapshot, false);
             setBusinesses(prev => {
                 const newMap = new Map(prev.map(b => [b.id, b]));
                 additionalBusinesses.forEach(b => {
                     if (!newMap.has(b.id)) {
                         newMap.set(b.id, b);
                     }
                 });
                 return Array.from(newMap.values());
             });
             setLoading(false);
        }, (error) => {
            console.error("Error fetching additional businesses:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch additional businesses.' });
            setLoading(false);
        });

        return () => {
            unsubPrimary();
            unsubAdditional();
        };
    }, [userProfile?.communityId, isUserLoading, profileLoading, db, toast]);
    
    const handleUpdateStatus = async (businessId: string, status: BusinessListing['status'], reason?: string) => {
        const result = await updateBusinessStatusAction({ businessId, status, amendmentReason: reason });
        if (result.success) {
            toast({ title: 'Status Updated', description: `Business status changed to ${status}.` });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };
    
    const handleRequestAmendment = () => {
        if (!amendmentBusiness || !amendmentReason) return;
        setIsSubmittingAmendment(true);
        handleUpdateStatus(amendmentBusiness.id, 'Requires Amendment', amendmentReason).then(() => {
            setAmendmentBusiness(null);
            setAmendmentReason("");
            setIsSubmittingAmendment(false);
        });
    }

    const openFreeListingDialog = (business: BusinessListing) => {
        setBusinessToChampion(business);
        setIsFreeListingDialogOpen(true);
    };

    const handleApproveAsFree = async () => {
        if (!businessToChampion || !communityId) return;
        setIsApprovingFree(true);
        
        const result = await approveAsFreeListingAction({
            businessId: businessToChampion.id,
            communityId: communityId,
        });
    
        if (result.success) {
            toast({
                title: 'Success!',
                description: `"${businessToChampion.businessName}" has been granted a free 1-year listing.`,
            });
        } else {
            toast({
                title: 'Error',
                description: result.error,
                variant: 'destructive',
            });
        }
        
        setIsApprovingFree(false);
        setIsFreeListingDialogOpen(false);
    }
    
    const openCancelFreeListingDialog = (business: BusinessListing) => {
        setBusinessToAction(business);
        setIsCancelFreeListingDialogOpen(true);
    };

    const handleCancelFreeListingConfirm = async () => {
        if (!businessToAction) return;
        setIsUpdatingStatus(true);
        const result = await cancelFreeListingAction({ businessId: businessToAction.id });
        
        if (result.success) {
            toast({
                title: "Free Listing Cancelled",
                description: `"${businessToAction.businessName}"'s free listing has been revoked and it is now pending approval.`,
            });
        } else {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive",
            });
        }

        setIsUpdatingStatus(false);
        setIsCancelFreeListingDialogOpen(false);
        setBusinessToAction(null);
    }
    
    const openDeleteDialog = (business: BusinessListing) => {
        setBusinessToAction(business);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!businessToAction || !user) return;
        setIsDeleting(true);
        const result = await deleteBusinessAction({ businessId: businessToAction.id, userId: user.uid });
        
        if (result.success) {
        toast({
            title: "Business Deleted",
            description: `"${businessToAction.businessName}" has been successfully removed.`,
        });
        } else {
        toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
        });
        }

        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        setBusinessToAction(null);
    }

    const handleSort = (key: keyof BusinessListing) => {
        setSorting(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedAndFilteredBusinesses = React.useMemo(() => {
        let filtered = businesses;
        if (activeTab !== "all") {
            filtered = businesses.filter(b => b.status === activeTab);
        }

        return [...filtered].sort((a, b) => {
            const key = sorting.key;
            const order = sorting.order === 'asc' ? 1 : -1;
            
            let valA = a[key as keyof BusinessListing] as any;
            let valB = b[key as keyof BusinessListing] as any;
            
            if (key === 'createdAt' || key === 'submittedAt') {
                valA = valA?.toDate ? valA.toDate().getTime() : 0;
                valB = valB?.toDate ? valB.toDate().getTime() : 0;
                return (valA - valB) * order;
            }

            if (String(valA) < String(valB)) return -1 * order;
            if (String(valA) > valB) return 1 * order;
            return 0;
        });

    }, [businesses, activeTab, sorting]);

    const paginatedBusinesses = React.useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return sortedAndFilteredBusinesses.slice(start, start + pagination.pageSize);
    }, [sortedAndFilteredBusinesses, pagination]);

    const pageCount = Math.ceil(sortedAndFilteredBusinesses.length / pagination.pageSize);
    
    const handleSubscribe = async (businessId: string, isStorefront: boolean) => {
        if (!user || !userProfile) return;
        
        setIsRedirecting(businessId);
        
        const sessionResult = await createCheckoutSession({
            uid: user.uid,
            email: user.email!,
            name: userProfile.name,
            purchaseType: isStorefront ? 'storefront_subscription' : 'listing_subscription',
            mode: 'subscription',
            successUrlPath: '/business/listings?payment=success',
            businessId: businessId, 
            subscriptionType: isStorefront ? 'storefront' : 'listing',
            metadata: {
                userId: user.uid,
                businessId: businessId,
                subscriptionType: isStorefront ? 'storefront' : 'listing',
            }
        });

        if (sessionResult.url) {
            router.push(sessionResult.url);
        } else {
            toast({ title: "Error", description: sessionResult.error, variant: "destructive" });
            setIsRedirecting(null);
        }
    };


    return (
      <>
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Building2 className="h-8 w-8" />
                    Manage Businesses
                </h1>
                <p className="text-muted-foreground">
                    Approve, decline, and manage business listings for your community.
                </p>
            </div>
             {!isStripeConnected && sortedAndFilteredBusinesses.some(b => b.status === 'Pending Approval') && (
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Action Required: Connect Your Stripe Account</AlertTitle>
                    <AlertDescription>
                        You must connect your Stripe account before you can approve new businesses. This ensures you can receive your community's revenue share from their subscriptions.
                        <Button asChild variant="link" className="p-0 h-auto ml-1">
                            <Link href="/leader/financials">Go to Financials to connect.</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Business & Enterprise Applications</CardTitle>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 h-auto">
                            {TABS.map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('businessName')}>Business Name <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('accountType')}>Type <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('businessCategory')}>Category <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('submittedAt')}>Submitted On <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                                ) : paginatedBusinesses.length > 0 ? (
                                    paginatedBusinesses.map(business => (
                                        <ContextMenu key={business.id}>
                                            <ContextMenuTrigger asChild>
                                                <TableRow>
                                                    <TableCell className="font-medium">{business.businessName}</TableCell>
                                                    <TableCell className="capitalize">{business.accountType || 'Business'}</TableCell>
                                                    <TableCell className="capitalize">{business.businessCategory?.replace('-', ' & ')}</TableCell>
                                                    <TableCell>{business.submittedAt ? format(business.submittedAt.toDate(), 'PPP') : (business.createdAt ? format(business.createdAt.toDate(), 'PPP') : 'N/A')}</TableCell>
                                                    <TableCell>
                                                        <BusinessStatusBadge 
                                                            status={business.status} 
                                                            createdAt={business.createdAt}
                                                            isFreeListing={business.isFreeListing}
                                                            freeListingExpiresAt={business.freeListingExpiresAt}
                                                            storefrontSubscriptionStatus={business.storefrontSubscriptionStatus}
                                                            storefrontSubscriptionExpiresAt={business.storefrontSubscriptionExpiresAt}
                                                            listingSubscriptionStatus={business.listingSubscriptionStatus}
                                                            listingSubscriptionExpiresAt={business.listingSubscriptionExpiresAt}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions for {business.businessName}</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem asChild><Link href={`/businesses/${business.id}`}><Eye className="mr-2 h-4 w-4" />View Listing</Link></DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => router.push(`/business/businesses/edit/${business.id}`)}><FileEdit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                {(business.status === 'Pending Approval' || business.status === 'Approved') && (
                                                                    <>
                                                                        <TooltipProvider><Tooltip><TooltipTrigger asChild><div className={!isStripeConnected ? "cursor-not-allowed" : ""}><DropdownMenuItem disabled={!isStripeConnected} onSelect={(e) => !isStripeConnected ? e.preventDefault() : handleUpdateStatus(business.id, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem></div></TooltipTrigger>{!isStripeConnected && (<TooltipContent><p>Connect Stripe account in Financials to approve.</p></TooltipContent>)}</Tooltip></TooltipProvider>
                                                                        <TooltipProvider><Tooltip><TooltipTrigger asChild><div className={!isFreeListingAvailable ? "cursor-not-allowed" : ""}><DropdownMenuItem disabled={!isFreeListingAvailable} onSelect={(e) => !isFreeListingAvailable ? e.preventDefault() : openFreeListingDialog(business)}><Gift className="mr-2 h-4 w-4 text-green-500" />Approve as Free Listing</DropdownMenuItem></div></TooltipTrigger>{!isFreeListingAvailable && (<TooltipContent><p>A free listing has already been granted in the last year.</p></TooltipContent>)}</Tooltip></TooltipProvider>
                                                                        <DropdownMenuSeparator />
                                                                    </>
                                                                )}
                                                                {business.status === 'Pending Approval' && (
                                                                     <DropdownMenuItem onClick={() => setAmendmentBusiness(business)}><FileEdit className="mr-2 h-4 w-4" />Request Amendment</DropdownMenuItem>
                                                                )}
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div>
                                                                                {business.status === "Approved" && (
                                                                                    <DropdownMenuItem onClick={() => handleSubscribe(business.id, false)} disabled={isRedirecting === business.id}>
                                                                                        {isRedirecting === business.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4" />}
                                                                                        Subscribe Now
                                                                                    </DropdownMenuItem>
                                                                                )}
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Generate a payment link for the business owner to subscribe.</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                                {business.isFreeListing && (
                                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openCancelFreeListingDialog(business)}>
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Cancel Free Listing
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleUpdateStatus(business.id, 'Declined')}><XCircle className="mr-2 h-4 w-4" />Decline</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent>
                                                <ContextMenuLabel>Actions for {business.businessName}</ContextMenuLabel>
                                                <ContextMenuItem asChild><Link href={`/businesses/${business.id}`}><Eye className="mr-2 h-4 w-4" />View Listing</Link></ContextMenuItem>
                                                <ContextMenuItem onClick={() => router.push(`/business/businesses/edit/${business.id}`)}><FileEdit className="mr-2 h-4 w-4" /> Edit</ContextMenuItem>
                                                <ContextMenuSeparator />
                                                {(business.status === 'Pending Approval' || business.status === 'Approved') && (
                                                    <>
                                                        <TooltipProvider><Tooltip><TooltipTrigger asChild><div className={!isStripeConnected ? "cursor-not-allowed" : ""}><ContextMenuItem disabled={!isStripeConnected} onSelect={() => handleUpdateStatus(business.id, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" />Approve</ContextMenuItem></div></TooltipTrigger>{!isStripeConnected && (<TooltipContent><p>Connect Stripe to approve.</p></TooltipContent>)}</Tooltip></TooltipProvider>
                                                        <TooltipProvider><Tooltip><TooltipTrigger asChild><div className={!isFreeListingAvailable ? "cursor-not-allowed" : ""}><ContextMenuItem disabled={!isFreeListingAvailable} onSelect={() => openFreeListingDialog(business)}><Gift className="mr-2 h-4 w-4 text-green-500" />Approve as Free Listing</ContextMenuItem></div></TooltipTrigger>{!isFreeListingAvailable && (<TooltipContent><p>Free listing already granted this year.</p></TooltipContent>)}</Tooltip></TooltipProvider>
                                                        <ContextMenuSeparator />
                                                    </>
                                                )}
                                                {business.status === 'Pending Approval' && (
                                                    <ContextMenuItem onSelect={() => setAmendmentBusiness(business)}><FileEdit className="mr-2 h-4 w-4" />Request Amendment</ContextMenuItem>
                                                )}
                                                 {business.isFreeListing && (
                                                    <ContextMenuItem className="text-destructive" onSelect={() => openCancelFreeListingDialog(business)}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Cancel Free Listing
                                                    </ContextMenuItem>
                                                )}
                                                <ContextMenuItem className="text-destructive" onSelect={() => handleUpdateStatus(business.id, 'Declined')}><XCircle className="mr-2 h-4 w-4" />Decline</ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No businesses in this category.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={sortedAndFilteredBusinesses.length} />
                </CardContent>
            </Card>
        </div>
        
        <Dialog open={isCancelFreeListingDialogOpen} onOpenChange={setIsCancelFreeListingDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>
                        This will cancel the free listing for <span className="font-bold">{businessToAction?.businessName}</span>. The business will revert to "Pending Approval" status and lose its storefront access.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCancelFreeListingDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleCancelFreeListingConfirm} disabled={isUpdatingStatus}>
                        {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Cancellation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the business listing for <span className="font-bold">{businessToAction?.businessName}</span> and all associated adverts and events.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Deletion
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!amendmentBusiness} onOpenChange={(open) => !open && setAmendmentBusiness(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request Amendment for {amendmentBusiness?.businessName}</DialogTitle>
                    <DialogDescription>
                        Explain what changes are needed before this business listing can be approved. The business owner will be notified.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="amendment-reason">Reason for Amendment</Label>
                    <Textarea 
                        id="amendment-reason" 
                        value={amendmentReason} 
                        onChange={(e) => setAmendmentReason(e.target.value)}
                        placeholder="e.g., Please upload a higher quality logo image and provide a more detailed business description."
                        className="min-h-[120px]"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setAmendmentBusiness(null)}>Cancel</Button>
                    <Button onClick={handleRequestAmendment} disabled={isSubmittingAmendment || !amendmentReason.trim()}>
                        {isSubmittingAmendment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isFreeListingDialogOpen} onOpenChange={setIsFreeListingDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Approve as Free Community Listing?</DialogTitle>
                    <DialogDescription>
                        You are about to grant a free 1-year listing with a storefront to <span className="font-bold">{businessToChampion?.businessName}</span>. This is your community's one free sponsored listing for the year. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                        Once granted, you cannot grant another free listing for 365 days. The business will revert to 'Pending Approval' after one year.
                    </AlertDescription>
                </Alert>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsFreeListingDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleApproveAsFree} disabled={isApprovingFree}>
                        {isApprovingFree && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & Approve Free
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </>
    );
}
