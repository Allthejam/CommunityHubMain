

"use client";

import * as React from "react";
import Link from 'next/link';
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
  ShoppingBag,
  Calendar,
  BadgeCheck,
  Percent,
  Gift,
  Loader2,
  CreditCard,
  Trash2,
  EyeOff,
  Eye,
  FileEdit,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { useToast } from "@/hooks/use-toast";
import { createCheckoutSession } from "@/lib/actions/stripeActions";
import { useRouter } from "next/navigation";
import { deleteBusinessAction, updateBusinessStatusAction } from "@/lib/actions/businessActions";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogContent, DialogClose, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { BusinessStatusBadge } from "@/components/business-status-badge";


export type BusinessListing = {
  id: string;
  businessName: string;
  name?: string; // For backwards compatibility
  businessCategory: string;
  status:
    | "Pending Approval"
    | "Approved"
    | "Requires Amendment"
    | "Declined"
    | "Subscribed"
    | "Draft"
    | "Hidden";
  createdAt?: { toDate: () => Date };
  subscriptionExpiresAt?: { toDate: () => Date };
};


const TABS: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    { value: "Pending Approval", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Subscribed", label: "Subscribed" },
    { value: "Requires Amendment", label: "Amendment Req." },
    { value: "Hidden", label: "Hidden" },
    { value: "Declined", label: "Declined" },
    { value: "Draft", label: "Drafts" },
];

export default function MyBusinessesPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const [businessPlan, setBusinessPlan] = React.useState<Plan | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState<string | null>(
    null
  );
  const { toast } = useToast();
  const router = useRouter();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [businessToAction, setBusinessToAction] = React.useState<BusinessListing | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  const [activeTab, setActiveTab] = React.useState("all");

  const businessQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "businesses"),
      where("ownerId", "==", user.uid)
    );
  }, [user, db]);

  const { data, isLoading } = useCollection<BusinessListing>(businessQuery);
  const businesses: BusinessListing[] = React.useMemo(() => {
    if (!data) return [];
    return data.map(d => ({
        ...d,
        businessName: d.businessName || d.name || 'Untitled Business',
    }));
  }, [data]);
  
  const loading = authLoading || isLoading;

  React.useEffect(() => {
    const fetchPlans = async () => {
      const plans = await getPricingPlans();
      if (plans.business) {
        setBusinessPlan(plans.business);
      }
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

  const handleUpdateStatus = async (business: BusinessListing, status: BusinessListing['status']) => {
      setIsUpdatingStatus(true);
      const result = await updateBusinessStatusAction({ businessId: business.id, status });
      if(result.success) {
          toast({ title: 'Status Updated', description: `"${business.businessName}" status has been changed.` });
      } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
      setIsUpdatingStatus(false);
  }
  
  const handleEdit = (business: BusinessListing) => {
    router.push(`/business/businesses/edit/${business.id}`);
  }

  const filteredBusinesses = React.useMemo(() => {
    if (!businesses) return [];
    if (activeTab === "all") return businesses;
    return businesses.filter(b => b.status === activeTab);
  }, [businesses, activeTab]);

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            My Businesses
          </h1>
          <p className="text-muted-foreground">
            Manage your business listings.
          </p>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">
              Business Listing Information
            </CardTitle>
            <CardDescription className="text-primary/80 dark:text-primary/90">
              Here’s what’s included with your business listing on our platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-background/80 rounded-lg border">
                <CardTitle className="text-base flex items-center gap-2 mb-2">£{businessPlan?.monthlyPrice ?? 20} per month</CardTitle>
                <p className="text-sm text-muted-foreground">
                  The monthly fee for each active business listing.
                </p>
            </div>
            <div className="p-4 bg-background/80 rounded-lg border">
              <CardTitle className="text-base flex items-center gap-2 mb-2">
                <Percent className="h-5 w-5 text-green-500" /> 40% Community Give-Back
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                We donate 40% of your fee back to your registered local
                community.
              </p>
            </div>
             <div className="p-4 bg-background/80 rounded-lg border">
                <CardTitle className="text-base flex items-center gap-2 mb-2"><BadgeCheck className="h-5 w-5 text-blue-500" /> Included Features</CardTitle>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Up to {businessPlan?.adverts ?? 3} free adverts</li>
                    <li>Up to {businessPlan?.events ?? 2} free events per year</li>
                </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                  <CardTitle>Your Business Listings</CardTitle>
                  <CardDescription>
                      View, create, and manage your businesses.
                  </CardDescription>
              </div>
              <Button asChild>
                  <Link href="/business/businesses/create">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create New Business
                  </Link>
              </Button>
            </div>
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
                    <TableHead>Business Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Storefront</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredBusinesses.length > 0 ? (
                    filteredBusinesses.map((business) => {
                      const categoryLabel =
                        business.businessCategory
                          ?.split("-")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" & ") || "N/A";
                      const { status } = business;

                      return (
                        <ContextMenu key={business.id}>
                          <ContextMenuTrigger asChild>
                            <TableRow>
                              <TableCell>{business.businessName}</TableCell>
                              <TableCell>{categoryLabel}</TableCell>
                              <TableCell>{(business as any).storefrontSubscription ? 'Yes' : 'No'}</TableCell>
                              <TableCell>
                                <BusinessStatusBadge status={status} />
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/businesses/${business.id}`}>
                                        <Eye className="mr-2 h-4 w-4" /> View Listing
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEdit(business)}>
                                      <FileEdit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    {status === "Approved" && (
                                      <DropdownMenuItem onClick={() => handleSubscribe(business.id, false)} disabled={isRedirecting === business.id}>
                                          {isRedirecting === business.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4" />}
                                          Subscribe Now
                                      </DropdownMenuItem>
                                    )}
                                    {status === 'Subscribed' && !(business as any).storefrontSubscription && (
                                         <DropdownMenuItem onClick={() => handleSubscribe(business.id, true)} disabled={isRedirecting === business.id}>
                                          {isRedirecting === business.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Store className="mr-2 h-4 w-4"/>}
                                          Open a Shopfront
                                      </DropdownMenuItem>
                                    )}
                                     {(business as any).storefrontSubscription && (
                                        <DropdownMenuItem onClick={() => {}} disabled>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Close Storefront
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    {(status === "Subscribed" || status === "Approved") && (
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(business, 'Hidden')}>
                                            <EyeOff className="mr-2 h-4 w-4" /> Hide Listing
                                        </DropdownMenuItem>
                                    )}
                                    {status === 'Pending Approval' && (
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(business, 'Draft')}>
                                            <FileEdit className="mr-2 h-4 w-4" /> Revert to Draft
                                        </DropdownMenuItem>
                                    )}
                                    {status === "Hidden" && (
                                         <DropdownMenuItem onClick={() => handleUpdateStatus(business, 'Subscribed')}>
                                            <Eye className="mr-2 h-4 w-4" /> Show Listing
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => openDeleteDialog(business)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuLabel>Actions for {business.businessName}</ContextMenuLabel>
                            <ContextMenuItem asChild>
                              <Link href={`/businesses/${business.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> View Listing
                              </Link>
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleEdit(business)}>
                              <FileEdit className="mr-2 h-4 w-4" /> Edit
                            </ContextMenuItem>
                            {status === "Approved" && (
                              <ContextMenuItem onClick={() => handleSubscribe(business.id, false)} disabled={isRedirecting === business.id}>
                                  {isRedirecting === business.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4" />}
                                  Subscribe Now
                              </ContextMenuItem>
                            )}
                            {status === 'Subscribed' && !(business as any).storefrontSubscription && (
                                  <ContextMenuItem onClick={() => handleSubscribe(business.id, true)} disabled={isRedirecting === business.id}>
                                  {isRedirecting === business.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Store className="mr-2 h-4 w-4"/>}
                                  Open a Shopfront
                              </ContextMenuItem>
                            )}
                             {(business as any).storefrontSubscription && (
                                <ContextMenuItem disabled>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Close Storefront
                                </ContextMenuItem>
                            )}
                            <ContextMenuSeparator />
                             {(status === "Subscribed" || status === "Approved") && (
                                <ContextMenuItem onClick={() => handleUpdateStatus(business, 'Hidden')}>
                                    <EyeOff className="mr-2 h-4 w-4" /> Hide Listing
                                </ContextMenuItem>
                            )}
                            {status === 'Pending Approval' && (
                                <ContextMenuItem onClick={() => handleUpdateStatus(business, 'Draft')}>
                                    <FileEdit className="mr-2 h-4 w-4" /> Revert to Draft
                                </ContextMenuItem>
                            )}
                            {status === "Hidden" && (
                                    <ContextMenuItem onClick={() => handleUpdateStatus(business, 'Subscribed')}>
                                    <Eye className="mr-2 h-4 w-4" /> Show Listing
                                </ContextMenuItem>
                            )}
                            <ContextMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => openDeleteDialog(business)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No businesses found in this category.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

       <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                    This action cannot be undone. This will permanently delete the business listing for <span className="font-bold">{businessToAction?.businessName}</span> and all associated adverts and events.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Deletion
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    
