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
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { updateBusinessStatusAction, type BusinessListing as ServerBusinessListing, approveAsFreeListingAction, cancelFreeListingAction, deleteBusinessAction } from "@/lib/actions/businessActions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { useRouter, useSearchParams } from "next/navigation";
import { createCheckoutSession } from "@/lib/actions/stripeActions";
import { cn } from "@/lib/utils";


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
    primaryCommunityId: string;
};


function LeaderBusinessesContent() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [businesses, setBusinesses] = React.useState<BusinessListing[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();
    const [activeTab, setActiveTab] = React.useState("Pending Approval");
    
    const [amendmentBusiness, setAmendmentBusiness] = React.useState<BusinessListing | null>(null);
    const [amendmentReason, setAmendmentReason] = React.useState("");
    const [isSubmittingAmendment, setIsSubmittingAmendment] = React.useState(false);
    
    const [sorting, setSorting] = React.useState<{ key: keyof BusinessListing; order: 'asc' | 'desc' }>({ key: 'businessName', order: 'asc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
    
    const [isFreeListingDialogOpen, setIsFreeListingDialogOpen] = React.useState(false);
    const [businessToChampion, setBusinessToChampion] = React.useState<BusinessListing | null>(null);
    const [businessToAction, setBusinessToAction] = React.useState<BusinessListing | null>(null);
    const [isApprovingFree, setIsApprovingFree] = React.useState(false);
    const [isRedirecting, setIsRedirecting] = React.useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isCancelFreeListingDialogOpen, setIsCancelFreeListingDialogOpen] = React.useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const communityId = (userProfile as any)?.impersonating?.communityId || userProfile?.communityId;
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
        if (isUserLoading || profileLoading || !communityId || !db) {
            setLoading(isUserLoading || profileLoading);
            return;
        }

        setLoading(true);
        setBusinesses([]);

        const businessesRef = collection(db, "businesses");
        const primaryQuery = query(businessesRef, where("primaryCommunityId", "==", communityId));

        const unsubscribe = onSnapshot(primaryQuery, (snapshot) => {
             const primaryBusinesses = snapshot.docs.map((doc: any) => ({ 
                id: doc.id, 
                ...doc.data(),
                isPrimary: true 
            } as BusinessListing));
            
            setBusinesses(primaryBusinesses);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching community businesses:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch businesses.' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [communityId, isUserLoading, profileLoading, db, toast]);
    
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
                variant: "destructive",
            });
        }
        
        setIsApprovingFree(false);
        setIsFreeListingDialogOpen(false);
    }
    
    const handleCancelFreeListingConfirm = async () => {
        if (!businessToAction) return;
        setIsUpdatingStatus(true);
        const result = await cancelFreeListingAction({ businessId: businessToAction.id });
        
        if (result.success) {
            toast({
                title: "Free Listing Cancelled",
                description: `"${businessToAction.businessName}"'s free listing has been revoked.`,
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
            
            let valA = a[key] as any;
            let valB = b[key] as any;
            
            if (key === 'createdAt') {
                valA = valA?.toDate ? valA.toDate().getTime() : 0;
                valB = valB?.toDate ? valB.toDate().getTime() : 0;
                return (valA - valB) * order;
            }

            if (String(valA) < String(valB)) return -1 * order;
            if (String(valA) > String(valB)) return 1 * order;
            return 0;
        });

    }, [businesses, activeTab, sorting]);

    const paginatedBusinesses = React.useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return sortedAndFilteredBusinesses.slice(start, start + pagination.pageSize);
    }, [sortedAndFilteredBusinesses, pagination]);

    const pageCount = Math.ceil(sortedAndFilteredBusinesses.length / pagination.pageSize);
    
    const handleSubscribe = async (business: BusinessListing, isStorefront: boolean) => {
        if (!user || !userProfile) return;
        setIsRedirecting(business.id);
        
        const sessionResult = await createCheckoutSession({
            uid: user.uid,
            email: user.email!,
            name: userProfile.name,
            purchaseType: isStorefront ? 'storefront_subscription' : 'listing_subscription',
            mode: 'subscription',
            successUrlPath: '/business/listings?payment=success',
            businessId: business.id, 
            communityId: business.primaryCommunityId,
            subscriptionType: isStorefront ? 'storefront' : 'listing',
            metadata: {
                userId: user.uid,
                businessId: business.id,
                communityId: business.primaryCommunityId,
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
                        You must connect your Stripe account before you can approve new businesses.
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
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('createdAt')}>Created On <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                                ) : paginatedBusinesses.length > 0 ? (
                                    paginatedBusinesses.map(business => (
                                        <TableRow key={business.id}>
                                            <TableCell className="font-medium">{business.businessName}</TableCell>
                                            <TableCell className="capitalize">{business.accountType || 'Business'}</TableCell>
                                            <TableCell className="capitalize">{business.businessCategory?.replace('-', ' & ')}</TableCell>
                                            <TableCell>{business.createdAt ? format(business.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell>
                                                <BusinessStatusBadge 
                                                    status={business.status} 
                                                    createdAt={business.createdAt}
                                                    isFreeListing={business.isFreeListing}
                                                    freeListingExpiresAt={business.freeListingExpiresAt}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => router.push(`/businesses/${business.id}`)}><Eye className="mr-2 h-4 w-4" />View Listing</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.push(`/business/businesses/edit/${business.id}`)}><FileEdit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {(business.status === 'Pending Approval' || business.status === 'Approved') && (
                                                            <>
                                                                <DropdownMenuItem disabled={!isStripeConnected} onSelect={(e) => { e.preventDefault(); handleUpdateStatus(business.id, 'Approved'); }}><CheckCircle className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>
                                                                <DropdownMenuItem disabled={!isFreeListingAvailable} onSelect={(e) => { e.preventDefault(); setBusinessToChampion(business); setIsFreeListingDialogOpen(true); }}><Gift className="mr-2 h-4 w-4 text-green-500" />Approve as Free Listing</DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                            </>
                                                        )}
                                                        {business.status === 'Pending Approval' && (
                                                             <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAmendmentBusiness(business); }}><FileEdit className="mr-2 h-4 w-4" />Request Amendment</DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => { e.preventDefault(); setBusinessToAction(business); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
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
        
        <Dialog open={isFreeListingDialogOpen} onOpenChange={setIsFreeListingDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Approve as Free Community Listing?</DialogTitle>
                    <DialogDescription>
                        You are about to grant a free 1-year listing with a storefront to <span className="font-bold">{businessToChampion?.businessName}</span>. This is your community's one free sponsored listing for the year.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsFreeListingDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleApproveAsFree} disabled={isApprovingFree}>
                        {isApprovingFree && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & Approve Free
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Business Listing?</DialogTitle>
                    <DialogDescription>This will permanently remove the business and all its data. This cannot be undone.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </>
    );
}

export default function LeaderBusinessesPage() {
    return (
        <React.Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <LeaderBusinessesContent />
        </React.Suspense>
    );
}
