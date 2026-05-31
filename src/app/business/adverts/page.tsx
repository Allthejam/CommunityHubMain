
"use client";

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
} from "lucide-react"
import { format } from "date-fns";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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
import { doc } from "firebase/firestore";

type AdvertStatus = "Active" | "Scheduled" | "Expired" | "Draft" | "Paused" | "Pending Approval" | "Approved" | "Declined";

export type Advert = {
  id: string;
  title: string;
  status: AdvertStatus;
  startDate?: { toDate: () => Date };
  endDate?: { toDate: () => Date };
  type: 'featured' | 'partner';
};

const StatusBadge = ({ status }: { status: AdvertStatus }) => {
  const statusStyles: { [key in AdvertStatus]: { variant: "default" | "secondary" | "destructive" | "outline", className: string, text: string } } = {
    Active: { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", text: "Active" },
    Scheduled: { variant: "default", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", text: "Scheduled" },
    Expired: { variant: "secondary", className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", text: "Expired" },
    Draft: { variant: "outline", className: "border-dashed", text: "Draft" },
    Paused: { variant: "secondary", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", text: "Paused" },
    "Pending Approval": { variant: "default", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", text: "Pending" },
    "Approved": { variant: "default", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", text: "Approved" },
    "Declined": { variant: "destructive", className: "bg-red-100 text-red-800", text: "Declined" },
  };

  const style = statusStyles[status] || statusStyles['Draft'];

  return (
    <Badge variant={style.variant} className={cn("capitalize", style.className)}>
      {style.text}
    </Badge>
  );
};


export default function MyAdvertsPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [businessPlan, setBusinessPlan] = React.useState<Plan | null>(null);
    const [isRedirecting, setIsRedirecting] = React.useState(false);

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const advertQuery = useMemoFirebase(() => {
      if (!user || !db) return null;
      return query(collection(db, "adverts"), where("ownerId", "==", user.uid));
    }, [user, db]);

    const { data: advertData, isLoading: advertsLoading } = useCollection<Advert>(advertQuery);
    const loading = authLoading || advertsLoading || profileLoading;

     React.useEffect(() => {
        const fetchPlans = async () => {
            const plans = await getPricingPlans();
            if (plans.business) {
                setBusinessPlan(plans.business);
            }
        };
        fetchPlans();
    }, []);

    const handleCreateAdvert = async () => {
        if (!user || !userProfile || !businessPlan) return;

        const freeSlots = businessPlan.adverts ?? 3;
        const currentAdCount = advertData?.length || 0;

        if (currentAdCount >= freeSlots) {
            setIsRedirecting(true);
            toast({ title: 'Free limit reached', description: 'Redirecting to payment for an additional advert slot.' });

            const result = await createCheckoutSession({
                uid: user.uid,
                email: user.email!,
                name: userProfile.name,
                mode: 'payment',
                purchaseType: 'additional_advert',
                successUrlPath: '/business/adverts/create?payment=success',
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
            router.push('/business/adverts/create');
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
            Create and manage your advertising campaigns for your business.
        </p>
      </div>

       <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Local Advertising Information</AlertTitle>
        <AlertDescription>
            Adverts are displayed within your primary community.
            <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>
                    You get {businessPlan?.adverts ?? 3} free adverts with your business subscription.
                </li>
                 <li>
                    Additional adverts cost £{businessPlan?.additionalAdvertPrice ?? 5} each and run for 28 days.
                </li>
            </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Your Campaigns</CardTitle>
                <CardDescription>A list of your current and past advertising campaigns.</CardDescription>
            </div>
            <Button onClick={handleCreateAdvert} disabled={isRedirecting}>
                {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                Create New Advert
            </Button>
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
                ) : advertData && advertData.length > 0 ? (
                  advertData.map((advert) => (
                    <ContextMenu key={advert.id}>
                        <ContextMenuTrigger asChild>
                            <TableRow>
                                <TableCell className="font-medium">{advert.title}</TableCell>
                                <TableCell className="capitalize">{advert.type || 'Business'}</TableCell>
                                <TableCell><StatusBadge status={advert.status} /></TableCell>
                                <TableCell>{advert.startDate ? format(advert.startDate.toDate(), "PPP") : 'N/A'}</TableCell>
                                <TableCell>{advert.endDate ? format(advert.endDate.toDate(), "PPP") : 'N/A'}</TableCell>
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
                                            <DropdownMenuItem asChild><Link href={`/business/adverts/edit/${advert.id}`}><FileEdit className="mr-2 h-4 w-4" />Edit Campaign</Link></DropdownMenuItem>
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
                             <ContextMenuLabel>Actions</ContextMenuLabel>
                            <ContextMenuItem asChild><Link href={`/business/adverts/edit/${advert.id}`}><FileEdit className="mr-2 h-4 w-4" />Edit Campaign</Link></ContextMenuItem>
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
