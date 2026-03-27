
"use client";

import * as React from "react";
import {
    MoreHorizontal,
    Megaphone,
    CheckCircle,
    XCircle,
    FileEdit,
    Clock,
    Loader2,
} from "lucide-react"
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { updateAdvertStatusAction } from "@/lib/actions/advertActions";

type AdvertStatus = "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Active" | "Paused" | "Expired" | "Draft";

export type Advert = {
  id: string;
  title: string;
  businessName: string;
  status: AdvertStatus;
  startDate?: { toDate: () => Date };
  endDate?: { toDate: () => Date };
  submittedAt?: { toDate: () => Date };
  createdAt: { toDate: () => Date };
};


const TABS: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    { value: "Pending Approval", label: "Pending" },
    { value: "Active", label: "Active" },
    { value: "Paused", label: "Paused" },
    { value: "Requires Amendment", label: "Amendment Req." },
    { value: "Declined", label: "Declined" },
    { value: "Draft", label: "Drafts" },
];


export default function LeaderAdvertsPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [adverts, setAdverts] = React.useState<Advert[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();
    const [activeTab, setActiveTab] = React.useState("Pending Approval");
    
    const [amendmentAdvert, setAmendmentAdvert] = React.useState<Advert | null>(null);
    const [amendmentReason, setAmendmentReason] = React.useState("");
    const [isSubmittingAmendment, setIsSubmittingAmendment] = React.useState(false);


    React.useEffect(() => {
        if (isUserLoading || profileLoading || !userProfile?.communityId || !db) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const communityId = userProfile.communityId;
        const advertsRef = collection(db, "adverts");

        const q = query(advertsRef, where("communityId", "==", communityId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
             const advertsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Advert));
             setAdverts(advertsData);
             setLoading(false);
        }, (error) => {
            console.error("Error fetching adverts:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch adverts.' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile?.communityId, isUserLoading, profileLoading, db, toast]);
    
    const handleUpdateStatus = async (advertId: string, status: AdvertStatus, reason?: string) => {
        const result = await updateAdvertStatusAction({ advertId, status, amendmentReason: reason });
        if (result.success) {
            toast({ title: 'Status Updated', description: `Advert status changed to ${status}.` });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };
    
    const handleRequestAmendment = () => {
        if (!amendmentAdvert || !amendmentReason) return;
        setIsSubmittingAmendment(true);
        handleUpdateStatus(amendmentAdvert.id, 'Requires Amendment', amendmentReason).then(() => {
            setAmendmentAdvert(null);
            setAmendmentReason("");
            setIsSubmittingAmendment(false);
        });
    }

    const filteredAdverts = React.useMemo(() => {
        if (activeTab === "all") return adverts;
        return adverts.filter(b => b.status === activeTab);
    }, [adverts, activeTab]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Megaphone className="h-8 w-8" />
                    Manage Adverts
                </h1>
                <p className="text-muted-foreground">
                    Approve, decline, and manage advert submissions for your community.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Advert Submissions</CardTitle>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 h-auto">
                            {TABS.map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm h-auto whitespace-normal">
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
                                    <TableHead>Advert Title</TableHead>
                                    <TableHead>Business Name</TableHead>
                                    <TableHead>Submitted On</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                                ) : filteredAdverts.length > 0 ? (
                                    filteredAdverts.map(advert => (
                                        <TableRow key={advert.id}>
                                            <TableCell className="font-medium">{advert.title}</TableCell>
                                            <TableCell>{advert.businessName}</TableCell>
                                            <TableCell>{advert.submittedAt ? format(advert.submittedAt.toDate(), 'PPP') : (advert.createdAt ? format(advert.createdAt.toDate(), 'PPP') : 'N/A')}</TableCell>
                                            <TableCell><BusinessStatusBadge status={advert.status} /></TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Moderation</DropdownMenuLabel>
                                                        {advert.status === 'Pending Approval' && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleUpdateStatus(advert.id, 'Approved')}>
                                                                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setAmendmentAdvert(advert)}>
                                                                    <FileEdit className="mr-2 h-4 w-4" /> Request Amendment
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive" onClick={() => handleUpdateStatus(advert.id, 'Declined')}>
                                                                    <XCircle className="mr-2 h-4 w-4" /> Decline
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                         {(advert.status !== 'Pending Approval' && advert.status !== 'Draft') && (
                                                             <DropdownMenuItem className="text-destructive" onClick={() => handleUpdateStatus(advert.id, 'Declined')}>
                                                                <XCircle className="mr-2 h-4 w-4" /> Suspend Advert
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No adverts in this category.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             <Dialog open={!!amendmentAdvert} onOpenChange={(open) => !open && setAmendmentAdvert(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Amendment for "{amendmentAdvert?.title}"</DialogTitle>
                        <DialogDescription>
                            Explain what changes are needed before this advert can be approved. The business owner will be notified.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="amendment-reason">Reason for Amendment</Label>
                        <Textarea 
                            id="amendment-reason" 
                            value={amendmentReason} 
                            onChange={(e) => setAmendmentReason(e.target.value)}
                            placeholder="e.g., The advert image is blurry. Please upload a higher quality version."
                            className="min-h-[120px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAmendmentAdvert(null)}>Cancel</Button>
                        <Button onClick={handleRequestAmendment} disabled={isSubmittingAmendment || !amendmentReason.trim()}>
                            {isSubmittingAmendment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
