'use client';

import * as React from "react";
import {
    ShoppingBag,
    MoreHorizontal,
    PlusCircle,
    Globe,
    Handshake,
    ArrowRight,
    Loader2,
    FileEdit,
    Trash2,
    PlayCircle,
    PauseCircle,
    Eye,
    Info,
    AlertTriangle,
} from "lucide-react"
import { format } from "date-fns";
import Link from "next/link";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { deleteAdvertAction, updateAdvertStatusAction } from "@/lib/actions/advertActions";
import { createCheckoutSession } from "@/lib/actions/stripeActions";

type AdvertStatus = "Active" | "Scheduled" | "Expired" | "Draft" | "Paused" | "Pending Approval" | "Approved" | "Declined";

export type Advert = {
  id: string;
  title: string;
  status: AdvertStatus;
  startDate?: { toDate: () => Date };
  endDate?: { toDate: () => Date };
  type: 'featured' | 'partner';
  businessId?: string;
};

const StatusBadge = ({ status }: { status: AdvertStatus }) => {
  const statusConfig: { [key in AdvertStatus]: { variant: "default" | "secondary" | "destructive" | "outline", className: string, text: string } } = {
    Active: { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", text: "Active" },
    Scheduled: { variant: "default", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", text: "Scheduled" },
    Expired: { variant: "secondary", className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", text: "Expired" },
    Draft: { variant: "outline", className: "border-dashed", text: "Draft" },
    Paused: { variant: "secondary", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", text: "Paused" },
    "Pending Approval": { variant: "default", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", text: "Pending" },
    "Approved": { variant: "default", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", text: "Approved" },
    "Declined": { variant: "destructive", className: "bg-red-100 text-red-800", text: "Declined" },
  };

  const style = statusConfig[status] || statusConfig['Draft'];

  return (
    <Badge variant={style.variant} className={cn("capitalize", style.className)}>
      {style.text}
    </Badge>
  );
};


export default function EnterpriseAdvertsPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [enterprisePlan, setEnterprisePlan] = React.useState<Plan | null>(null);
    const [isRedirecting, setIsRedirecting] = React.useState(false);

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const groupsQuery = useMemoFirebase(() => (user ? query(collection(db, 'businesses'), where('ownerId', '==', user.uid), where('accountType', '==', 'enterprise')) : null), [user, db]);
    const { data: enterpriseGroups } = useCollection<any>(groupsQuery);

    const advertsQuery = useMemoFirebase(() => {
      if (!user || !db) return null;
      return query(collection(db, "adverts"), where("ownerId", "==", user.uid));
    }, [user, db]);

    const { data: adverts, isLoading: advertsLoading } = useCollection<Advert>(advertsQuery);
    
    const loading = authLoading || advertsLoading || profileLoading;

    const unsubscribedGroups = React.useMemo(() => {
        if (!enterpriseGroups) return [];
        return enterpriseGroups.filter(g => g.status === 'Approved' || g.status === 'Requires Amendment');
    }, [enterpriseGroups]);

     React.useEffect(() => {
        const fetchPlans = async () => {
            const plans = await getPricingPlans();
            if (plans.enterprise) {
                setEnterprisePlan(plans.enterprise);
            }
        };
        fetchPlans();
    }, []);

    const handleCreateAdvert = async () => {
        if (!user || !userProfile || !enterprisePlan) return;

        const freeSlots = enterprisePlan.adverts ?? 10;
        const currentAdCount = adverts?.length || 0;

        if (currentAdCount >= freeSlots) {
            setIsRedirecting(true);
            toast({ title: 'Free limit reached', description: 'Redirecting to payment for an additional advert slot.' });

            const result = await createCheckoutSession({
                uid: user.uid,
                email: user.email!,
                name: userProfile.name,
                mode: 'payment',
                purchaseType: 'additional_advert',
                successUrlPath: '/enterprise/adverts/create?payment=success',
                metadata: {
                    userId: user.uid,
                    purchaseType: 'additional_advert',
                }
            });
            
            if (result.url) {
                router.push(result.url);
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
                setIsRedirecting(false);
            }

        } else {
            router.push('/enterprise/adverts/create');
        }
    };


    const handleUpdateStatus = async (id: string, status: AdvertStatus) => {
        const result = await updateAdvertStatusAction({ advertId: id, status });
        if (result.success) {
            toast({ title: "Success", description: `Campaign has been ${status.toLowerCase()}.` });
        } else {
            toast({ title: "Error", description: result.error || "Could not update campaign status.", variant: "destructive" });
        }
    };
    
    const handleDelete = async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this campaign? This action is permanent.")) return;
        const result = await deleteAdvertAction({ advertId: id });
         if (result.success) {
            toast({ title: "Campaign Deleted", description: "The advertising campaign has been permanently removed." });
        } else {
            toast({ title: "Error", description: result.error || "Could not delete the campaign.", variant: "destructive" });
        }
    };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ShoppingBag className="h-8 w-8" />
            My Adverts
        </h1>
        <p className="text-muted-foreground">
          Create and manage your advertising campaigns.
        </p>
      </div>

       {unsubscribedGroups.length > 0 && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Group Subscriptions Required</AlertTitle>
            <AlertDescription className="space-y-2">
                <p>You have {unsubscribedGroups.length} group(s) that are approved but not yet subscribed. Adverts for these groups will not be displayed until the group is subscribed.</p>
                <Button asChild variant="outline" size="sm" className="bg-white hover:bg-amber-100 border-amber-300">
                    <Link href="/enterprise/groups">Go to Subscriptions</Link>
                </Button>
            </AlertDescription>
          </Alert>
       )}

       <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Advertising Information</AlertTitle>
        <AlertDescription>
            You get {enterprisePlan?.adverts ?? 10} free Local Only adverts with your enterprise subscription.
            Additional local adverts cost £{enterprisePlan?.additionalAdvertPrice ?? 10} each and run for 3 Months Maximum.
            (Optional) You also have the opportunity to create national adverts at cost, these include demographic targeting.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Your Campaigns</CardTitle>
                <CardDescription>A list of your current and past advertising campaigns.</CardDescription>
            </div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Campaign
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Campaign</DialogTitle>
                        <DialogDescription>
                           Select the type of advert you would like to create.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="grid gap-4 py-4">
                        <Link href="/enterprise/adverts/create" className="p-6 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex items-start gap-4">
                            <ShoppingBag className="h-8 w-8 text-green-500 mt-1" />
                            <div>
                                <h3 className="font-semibold mb-1">Local Advert</h3>
                                <p className="text-xs text-muted-foreground">A standard advert displayed within a specific community. Uses your free advert slots.</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto self-center" />
                        </Link>
                        <Link href="/enterprise/adverts/create?type=featured" className="p-6 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex items-start gap-4">
                            <Globe className="h-8 w-8 text-amber-500 mt-1" />
                            <div>
                                <h3 className="font-semibold mb-1">Featured Ad</h3>
                                <p className="text-xs text-muted-foreground">A large advert for the main 'Featured' carousel on the homepage.</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto self-center" />
                        </Link>
                        <Link href="/enterprise/adverts/create?type=partner" className="p-6 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex items-start gap-4">
                            <Handshake className="h-8 w-8 text-primary mt-1" />
                            <div>
                                <h3 className="font-semibold mb-1">Partner Ad</h3>
                                <p className="text-xs text-muted-foreground">A smaller advert for the 'Valued Partners' section.</p>
                            </div>
                             <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto self-center" />
                        </Link>
                    </div>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="animate-spin h-6 w-6 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : adverts && adverts.length > 0 ? (
                  adverts.map((advert) => (
                    <ContextMenu key={advert.id}>
                        <ContextMenuTrigger asChild>
                            <TableRow>
                                <TableCell className="font-medium">{advert.title}</TableCell>
                                <TableCell className="capitalize">{advert.type}</TableCell>
                                <TableCell><StatusBadge status={advert.status} /></TableCell>
                                <TableCell>{advert.startDate?.toDate ? format(advert.startDate.toDate(), "PPP") : 'N/A'}</TableCell>
                                <TableCell>{advert.endDate?.toDate ? format(advert.endDate.toDate(), "PPP") : 'N/A'}</TableCell>
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
                                                <Link href={`/enterprise/adverts/edit/${advert.id}?type=${advert.type}`}>
                                                    <FileEdit className="mr-2 h-4 w-4" />Edit Campaign
                                                </Link>
                                            </DropdownMenuItem>
                                            {advert.status === 'Active' && (
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(advert.id, 'Paused')}><PauseCircle className="mr-2 h-4 w-4"/>Pause Campaign</DropdownMenuItem>
                                            )}
                                            {advert.status === 'Paused' && (
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(advert.id, 'Active')}><PlayCircle className="mr-2 h-4 w-4"/>Resume Campaign</DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(advert.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" />Delete Campaign
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuLabel>{advert.title}</ContextMenuLabel>
                             <ContextMenuItem asChild>
                                <Link href={`/enterprise/adverts/edit/${advert.id}?type=${advert.type}`}>
                                    <FileEdit className="mr-2 h-4 w-4" />Edit Campaign
                                </Link>
                            </ContextMenuItem>
                            {advert.status === 'Active' && (
                                <ContextMenuItem onClick={() => handleUpdateStatus(advert.id, 'Paused')}><PauseCircle className="mr-2 h-4 w-4"/>Pause Campaign</ContextMenuItem>
                            )}
                            {advert.status === 'Paused' && (
                                <ContextMenuItem onClick={() => handleUpdateStatus(advert.id, 'Active')}><PlayCircle className="mr-2 h-4 w-4"/>Resume Campaign</ContextMenuItem>
                            )}
                            <ContextMenuSeparator />
                            <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(advert.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />Delete Campaign
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center"
                    >
                      No campaigns created yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}