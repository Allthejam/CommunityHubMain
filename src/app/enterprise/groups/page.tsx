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
  Handshake,
  Loader2,
  PlusCircle,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  CreditCard,
  Store,
  ArrowUpDown,
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { useToast } from "@/hooks/use-toast";
import { deleteBusinessAction, updateBusinessStatusAction } from "@/lib/actions/businessActions";
import { createCheckoutSession } from "@/lib/actions/stripeActions";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { differenceInDays, isValid } from "date-fns";
import { PaginationControls } from "@/components/ui/pagination";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, documentId } from "firebase/firestore";

export type EnterpriseGroup = {
  id: string;
  businessName: string;
  shortDescription: string;
  logoImage?: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Hidden";
  amendmentReason?: string;
  primaryCommunityId: string;
  storefrontSubscription?: boolean;
  createdAt?: any;
  listingStripeSubscriptionId?: string;
  listingSubscriptionExpiresAt?: any;
  listingSubscriptionStatus?: 'pending_cancellation' | 'payment_failed';
  storefrontSubscriptionStatus?: 'pending_cancellation' | 'payment_failed';
  storefrontSubscriptionExpiresAt?: any;
};

const toDateHelper = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds !== undefined) return new Date(timestamp.seconds * 1000);
    const d = new Date(timestamp);
    return isValid(d) ? d : null;
};

const getListingEffectiveStatus = (group: EnterpriseGroup, now: Date): string => {
    const { status, createdAt, listingSubscriptionExpiresAt, listingSubscriptionStatus } = group;
    
    if (listingSubscriptionStatus === 'payment_failed') return "Payment Failed";
    if (listingSubscriptionStatus === 'pending_cancellation') return "Pending Cancellation";

    const subExpiry = toDateHelper(listingSubscriptionExpiresAt);
    if (status === 'Subscribed' && subExpiry && now > subExpiry) return "Subscription Expired";
    
    const creationDate = toDateHelper(createdAt);
    if (status === 'Approved' && creationDate && differenceInDays(now, creationDate) > 14) return "Trial Expired";
    
    return status;
};

const getStorefrontEffectiveStatus = (group: EnterpriseGroup, listingStatus: string, now: Date): string => {
    if (!group.storefrontSubscription) return "None";

    const { storefrontSubscriptionStatus, storefrontSubscriptionExpiresAt } = group;

    if (storefrontSubscriptionStatus === 'payment_failed') return "Payment Failed";

    const listingIsInactive = ["Pending Cancellation", "Subscription Expired", "Trial Expired", "Hidden", "Declined"].includes(listingStatus);
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

function EnterpriseGroupsContent() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
  }, []);

  const [enterprisePlan, setEnterprisePlan] = React.useState<Plan | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [groupToDelete, setGroupToDelete] = React.useState<EnterpriseGroup | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isRedirecting, setIsRedirecting] = React.useState<string | null>(null);
  
  const [activeTab, setActiveTab] = React.useState("all");
  const [sorting, setSorting] = React.useState<{ key: keyof EnterpriseGroup; order: 'asc' | 'desc' }>({ key: 'businessName', order: 'asc' });
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const groupsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(
      collection(db, "businesses"),
      where("ownerId", "==", user.uid),
      where("accountType", "==", "enterprise")
    );
  }, [user, db]);

  const { data: groups, isLoading: groupsLoading } = useCollection<EnterpriseGroup>(groupsQuery);
  const loading = authLoading || groupsLoading || profileLoading || !now;

  React.useEffect(() => {
    const fetchPlans = async () => {
      const plans = await getPricingPlans();
      if (plans.enterprise) {
        setEnterprisePlan(plans.enterprise);
      }
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
        successUrlPath: '/enterprise/groups?payment=success',
        cancelUrlPath: '/enterprise/groups',
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

  const handleSort = (key: keyof EnterpriseGroup) => {
    setSorting(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedAndFilteredGroups = React.useMemo(() => {
    if (!groups || !now) return [];
    
    let filtered = groups.filter(group => {
        const listingStatus = getListingEffectiveStatus(group, now);
        
        if (activeTab === "all") {
            return !['Hidden', 'Declined', 'Draft', 'Subscription Expired', 'Trial Expired', 'Payment Failed'].includes(listingStatus);
        }
        
        if (activeTab === "Approved") {
             return listingStatus === "Approved" || listingStatus === "Trial Expired";
        }
        
        if (activeTab === "Subscribed") {
             return group.status === activeTab && !["Subscription Expired", "Payment Failed"].includes(listingStatus);
        }

        return group.status === activeTab;
    });

    return [...filtered].sort((a,b) => {
        const key = sorting.key;
        const valA = a[key] as any;
        const valB = b[key] as any;
        const order = sorting.order === 'asc' ? 1 : -1;
        return String(valA).localeCompare(String(valB)) * order;
    });
  }, [groups, activeTab, sorting, now]);

  const pageCount = Math.ceil(sortedAndFilteredGroups.length / pagination.pageSize);
  const paginatedGroups = sortedAndFilteredGroups.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  const handleDeleteConfirm = async () => {
    if (!groupToDelete || !user) return;
    setIsDeleting(true);
    const result = await deleteBusinessAction({ businessId: groupToDelete.id, userId: user.uid });
    
    if (result.success) {
      toast({
        title: "Group Deleted",
        description: `"${groupToDelete.businessName}" has been successfully removed.`,
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
    setGroupToDelete(null);
  };

  if (loading) {
      return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Handshake className="h-8 w-8 text-primary" />
                My Enterprise Groups
            </h1>
            <p className="text-muted-foreground">Manage your group subscriptions and settings.</p>
        </div>
        <Button asChild>
            <Link href="/enterprise/groups/create">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                            <TableHead><Button variant="ghost" className="p-0 h-auto font-bold hover:bg-transparent" onClick={() => handleSort('businessName')}>Group Name <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                            <TableHead>Listing Status</TableHead>
                            <TableHead>Storefront Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedGroups.length > 0 ? (
                            paginatedGroups.map(group => {
                                const listingStatus = getListingEffectiveStatus(group, now!);
                                const storefrontStatus = getStorefrontEffectiveStatus(group, listingStatus, now!);
                                const needsSub = group.status === 'Approved' || listingStatus === 'Trial Expired' || listingStatus === 'Payment Failed';
                                const needsStoreUpgrade = group.status === 'Subscribed' && !group.storefrontSubscription;

                                return (
                                <ContextMenu key={group.id}>
                                  <ContextMenuTrigger asChild>
                                    <TableRow className="cursor-pointer" onClick={() => router.push(`/enterprise/groups/edit/${group.id}`)}>
                                        <TableCell className="font-medium">{group.businessName || (group as any).name}</TableCell>
                                        <TableCell>
                                            <BusinessStatusBadge 
                                                status={listingStatus as any} 
                                                createdAt={group.createdAt}
                                                listingSubscriptionStatus={group.listingSubscriptionStatus}
                                                listingSubscriptionExpiresAt={group.listingSubscriptionExpiresAt}
                                                now={now!}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <BusinessStatusBadge 
                                                status={storefrontStatus as any}
                                                listingSubscriptionStatus={group.storefrontSubscriptionStatus}
                                                listingSubscriptionExpiresAt={group.storefrontSubscriptionExpiresAt}
                                                now={now!}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {needsSub && (
                                                    <Button size="sm" className="font-bold bg-green-600 hover:bg-green-700 text-white" onClick={(e) => { e.stopPropagation(); handleSubscribe(group.id, group.primaryCommunityId, false); }} disabled={isRedirecting === group.id}>
                                                        {isRedirecting === group.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4" />}
                                                        Subscribe Now
                                                    </Button>
                                                )}
                                                {needsStoreUpgrade && (
                                                    <Button size="sm" variant="outline" className="font-bold border-blue-600 text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); handleSubscribe(group.id, group.primaryCommunityId, true); }} disabled={isRedirecting === group.id}>
                                                        {isRedirecting === group.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Store className="mr-2 h-4 w-4" />}
                                                        Add Storefront
                                                    </Button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => router.push(`/businesses/${group.id}`)}><Eye className="mr-2 h-4 w-4" /> View Profile</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.push(`/enterprise/groups/edit/${group.id}`)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onClick={() => { setGroupToDelete(group); setIsDeleteDialogOpen(true); }}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                  </ContextMenuTrigger>
                                  <ContextMenuContent>
                                    <ContextMenuItem onClick={() => router.push(`/businesses/${group.id}`)}>View Profile</ContextMenuItem>
                                    <ContextMenuItem onClick={() => router.push(`/enterprise/groups/edit/${group.id}`)}>Edit</ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem className="text-destructive" onSelect={() => { setGroupToDelete(group); setIsDeleteDialogOpen(true); }}>Delete</ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No enterprise groups found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={sortedAndFilteredGroups.length} />
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Delete Group?</DialogTitle>
                <DialogDescription>This will permanently remove {groupToDelete?.businessName} and all associated data.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm Deletion
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EnterpriseGroupsPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>}>
            <EnterpriseGroupsContent />
        </Suspense>
    );
}