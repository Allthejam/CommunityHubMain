"use client";

import * as React from "react";
import Link from "next/link";
import {
    HeartHandshake,
    MoreHorizontal,
    PlusCircle,
    CheckCircle2,
    XCircle,
    FileEdit,
    Loader2,
    Trash2,
    PauseCircle,
    Info,
    RotateCw,
} from "lucide-react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { deleteCharityAction, updateCharityStatusAction } from "@/lib/actions/charityActions";

export type CharityStatus = "Pending" | "Active" | "Archived" | "Declined" | "Paused";

export type Charity = {
  id: string;
  title: string;
  description: string;
  status: CharityStatus;
  createdAt: { toDate: () => Date };
};

const CharityRow = React.memo(({ charity, onUpdateStatus, onDelete, demoPrefix = '' }: { charity: Charity; onUpdateStatus: (id: string, status: Charity['status']) => void; onDelete: (id: string) => void; demoPrefix?: string; }) => {
    const contextMenuItems = (
        <>
            <ContextMenuLabel>Actions</ContextMenuLabel>
            {charity.status === "Pending" && (
                <>
                    <ContextMenuItem onClick={() => onUpdateStatus(charity.id, 'Active')}><CheckCircle2 className="mr-2 h-4 w-4 text-green-500"/>Approve</ContextMenuItem>
                    <ContextMenuItem onClick={() => onUpdateStatus(charity.id, 'Declined')} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4"/>Decline</ContextMenuItem>
                    <ContextMenuSeparator />
                </>
            )}
            <ContextMenuItem asChild>
                <Link href={`${demoPrefix}/leader/charities/edit/${charity.id}`}><FileEdit className="mr-2 h-4 w-4"/>Edit Listing</Link>
            </ContextMenuItem>
            {charity.status === "Active" && (
                <ContextMenuItem onClick={() => onUpdateStatus(charity.id, 'Paused')}><PauseCircle className="mr-2 h-4 w-4"/>Pause</ContextMenuItem>
            )}
            {charity.status === "Paused" && (
                <ContextMenuItem onClick={() => onUpdateStatus(charity.id, 'Active')}><RotateCw className="mr-2 h-4 w-4"/>Re-approve</ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(charity.id)}>
                <Trash2 className="mr-2 h-4 w-4"/>Delete Listing
            </ContextMenuItem>
        </>
    );
    
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <TableRow>
                    <TableCell className="font-medium">{charity.title}</TableCell>
                    <TableCell className="max-w-xs">
                        <div
                            className="line-clamp-2 text-sm text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: charity.description }}
                        />
                    </TableCell>
                    <TableCell>
                        <Badge variant={
                            charity.status === 'Active' ? 'default' :
                            charity.status === 'Declined' ? 'destructive' :
                            'secondary'
                        } className={charity.status === 'Active' ? "bg-green-100 text-green-800" : ""}>
                            {charity.status}
                        </Badge>
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
                                {charity.status === "Pending" && (
                                    <>
                                        <DropdownMenuItem onClick={() => onUpdateStatus(charity.id, 'Active')}><CheckCircle2 className="mr-2 h-4 w-4 text-green-500"/>Approve</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onUpdateStatus(charity.id, 'Declined')} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4"/>Decline</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem asChild>
                                    <Link href={`${demoPrefix}/leader/charities/edit/${charity.id}`}><FileEdit className="mr-2 h-4 w-4"/>Edit Listing</Link>
                                </DropdownMenuItem>
                                {charity.status === "Active" && (
                                    <DropdownMenuItem onClick={() => onUpdateStatus(charity.id, 'Paused')}><PauseCircle className="mr-2 h-4 w-4"/>Pause</DropdownMenuItem>
                                )}
                                {charity.status === "Paused" && (
                                    <DropdownMenuItem onClick={() => onUpdateStatus(charity.id, 'Active')}><RotateCw className="mr-2 h-4 w-4"/>Re-approve</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(charity.id)}>
                                    <Trash2 className="mr-2 h-4 w-4"/>Delete Listing
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            </ContextMenuTrigger>
            <ContextMenuContent>
                {contextMenuItems}
            </ContextMenuContent>
        </ContextMenu>
    );
});
CharityRow.displayName = 'CharityRow';

export default function LeaderCharitiesPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
    const demoPrefix = isDemo ? '/demo' : '';
    const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || (userProfile as any)?.impersonating?.communityId || (userProfile as any)?.communityId || 'N3SarfGXPLxBI7XcsinX');

    const [charities, setCharities] = React.useState<Charity[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();
    const [enterprisePlan, setEnterprisePlan] = React.useState<Plan | null>(null);

    const yearlyLimit = 6;
    const additionalCost = 5;

    const loadDemoCharities = React.useCallback(() => {
        if (!isDemo || typeof window === 'undefined') return [];
        try {
            return JSON.parse(
                sessionStorage.getItem(`demo_charities_${communityId}`) || 
                localStorage.getItem(`demo_charities_${communityId}`) || '[]'
            );
        } catch {
            return [];
        }
    }, [isDemo, communityId]);

    React.useEffect(() => {
        if (isUserLoading || profileLoading || !communityId || !db) {
            if (isDemo) {
                setCharities(loadDemoCharities());
            }
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(collection(db, "charities"), where("communityId", "==", communityId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const charitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Charity));
            if (isDemo) {
                const localList = loadDemoCharities();
                const combined = [...localList, ...charitiesData.filter(d => !localList.some(l => l.id === d.id))];
                setCharities(combined);
            } else {
                setCharities(charitiesData);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching charities:", error);
            if (isDemo) {
                setCharities(loadDemoCharities());
            } else {
                toast({ variant: "destructive", title: "Error", description: "Could not fetch charities." });
            }
            setLoading(false);
        });
        
        const fetchPlans = async () => {
            const plans = await getPricingPlans();
            setEnterprisePlan(plans.enterprise);
        };
        fetchPlans();

        const handleUpdate = () => {
            if (isDemo) {
                const localList = loadDemoCharities();
                setCharities(prev => [...localList, ...prev.filter(d => !localList.some(l => l.id === d.id))]);
            }
        };
        window.addEventListener('demo_charities_updated', handleUpdate);

        return () => {
            unsubscribe();
            window.removeEventListener('demo_charities_updated', handleUpdate);
        };
    }, [communityId, isDemo, loadDemoCharities, isUserLoading, profileLoading, toast, db]);
    
    const currentCount = charities.length;

    const handleUpdateStatus = async (id: string, status: Charity['status']) => {
        if (id.startsWith('demo_') || !user) {
            try {
                const stored = loadDemoCharities();
                const updated = stored.map((c: any) => c.id === id ? { ...c, status } : c);
                sessionStorage.setItem(`demo_charities_${communityId}`, JSON.stringify(updated));
                localStorage.setItem(`demo_charities_${communityId}`, JSON.stringify(updated));
                setCharities(prev => prev.map(c => c.id === id ? { ...c, status } : c));
                toast({ title: 'Status Updated', description: 'The charity listing has been updated.' });
            } catch (e: any) {
                toast({ title: 'Error', description: e.message, variant: 'destructive' });
            }
            return;
        }

        const result = await updateCharityStatusAction(id, status, communityId);
        if (result.success) {
            toast({ title: 'Status Updated', description: 'The charity listing has been updated.' });
        } else {
            toast({ title: 'Error', description: 'Failed to update the charity status.', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this listing?")) {
            return;
        }

        if (id.startsWith('demo_') || !user) {
            try {
                const stored = loadDemoCharities();
                const updated = stored.filter((c: any) => c.id !== id);
                sessionStorage.setItem(`demo_charities_${communityId}`, JSON.stringify(updated));
                localStorage.setItem(`demo_charities_${communityId}`, JSON.stringify(updated));
                setCharities(prev => prev.filter(c => c.id !== id));
                toast({ title: 'Listing Deleted', description: 'The charity listing has been removed.' });
            } catch (e: any) {
                toast({ title: 'Error', description: e.message, variant: 'destructive' });
            }
            return;
        }

        const result = await deleteCharityAction(id, communityId);
        if (result.success) {
            toast({ title: 'Listing Deleted', description: 'The charity listing has been removed.' });
        } else {
            toast({ title: 'Error', description: 'Failed to delete the listing.', variant: 'destructive' });
        }
    };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <HeartHandshake className="h-8 w-8" />
            Manage Local Charities
        </h1>
        <p className="text-muted-foreground">Approve, create, and manage charity listings for your community.</p>
      </div>
      
      {userProfile?.accountType === 'enterprise' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Charity Listing Rules for Private Hubs</AlertTitle>
            <AlertDescription>
              Your account includes {yearlyLimit} free charity listings. Additional listings can be purchased for £{additionalCost} each.
            </AlertDescription>
          </Alert>
      )}

       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Charity Listings</CardTitle>
                 <CardDescription>
                    {userProfile?.accountType === 'enterprise' 
                        ? `You have created ${currentCount} of your ${yearlyLimit} charity listings.`
                        : 'A list of all charities submitted for your community.'
                    }
                </CardDescription>
            </div>
            <Button asChild>
                <Link href={`${demoPrefix}/leader/charities/create`}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Listing
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Charity Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : charities.length > 0 ? (
                            charities.map((charity) => (
                                <CharityRow key={charity.id} charity={charity} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} demoPrefix={demoPrefix} />
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No charities have been submitted yet.
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