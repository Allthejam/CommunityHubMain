
'use client';

import * as React from 'react';
import {
  MoreHorizontal,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Shield,
  FileText,
  Truck,
  RotateCw,
  UserX,
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { updateLiaisonApplicationStatusAction } from '@/lib/actions/liaisonActions';
import { updateCourierApplicationStatusAction, unappointCommunityCourierAction } from '@/lib/actions/courierActions';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

// Liaison Application Types
type LiaisonApplicationStatus = 'Pending Leader Review' | 'Pending Admin Verification' | 'Approved' | 'Declined';
type LiaisonApplication = {
  id: string;
  applicantName: string;
  applicantTitle: string;
  communityName: string;
  status: LiaisonApplicationStatus;
  createdAt: { toDate: () => Date };
  justification: string;
  stationName: string;
  stationAddress: string;
  stationPhoneNumber: string;
  referenceName?: string;
  referenceTitle?: string;
  processedBy?: string;
  processedAt?: { toDate: () => Date };
  processingNotes?: string;
};

// Courier Application Types
type CourierApplicationStatus = 'Pending Review' | 'Approved' | 'Declined';
type CourierApplication = {
    id: string;
    applicantName: string;
    applicantId: string;
    communityName: string;
    statement: string;
    vehicleDetails: string;
    status: CourierApplicationStatus;
    createdAt: { toDate: () => Date };
    licenseImageUrl: string;
    selfieImageUrl: string;
    contactEmail: string;
    contactPhone: string;
    refName?: string;
    refRelationship?: string;
    refEmail?: string;
    refPhone?: string;
    processedBy?: string;
    processedAt?: { toDate: () => Date };
}

const LiaisonStatusBadge = ({ status }: { status: LiaisonApplicationStatus }) => {
  const styles = {
    'Pending Leader Review': 'bg-yellow-100 text-yellow-800',
    'Pending Admin Verification': 'bg-blue-100 text-blue-800',
    'Approved': 'bg-green-100 text-green-800',
    'Declined': 'bg-red-100 text-red-800',
  };
  return <Badge className={styles[status] || ''}>{status}</Badge>;
};

const CourierStatusBadge = ({ status }: { status: CourierApplicationStatus }) => {
  const styles = {
    'Pending Review': 'bg-yellow-100 text-yellow-800',
    'Approved': 'bg-green-100 text-green-800',
    'Declined': 'bg-red-100 text-red-800',
  };
  return <Badge className={styles[status] || ''}>{status}</Badge>;
};


export default function LeaderApplicationsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [liaisonApplications, setLiaisonApplications] = React.useState<LiaisonApplication[]>([]);
  const [courierApplications, setCourierApplications] = React.useState<CourierApplication[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("liaison");
  const [viewingApplication, setViewingApplication] = React.useState<LiaisonApplication | CourierApplication | null>(null);
  const [processingNotes, setProcessingNotes] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);
  
  const communityRef = useMemoFirebase(() => (userProfile?.communityId ? doc(db, 'communities', userProfile.communityId) : null), [userProfile?.communityId, db]);
  const { data: communityData } = useDoc(communityRef);
  const currentCourierId = communityData?.courierId;

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'owner';

  React.useEffect(() => {
    if (!userProfile?.communityId || !db) {
      setLoading(false);
      return;
    }

    const liaisonQuery = query(
      collection(db, 'liaison_applications'),
      where('communityId', '==', userProfile.communityId)
    );
    
    const courierQuery = query(
      collection(db, `communities/${userProfile.communityId}/courier_applications`)
    );

    const unsubLiaison = onSnapshot(liaisonQuery, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiaisonApplication));
      setLiaisonApplications(apps);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching liaison applications:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch liaison applications.' });
      setLoading(false);
    });
    
    const unsubCourier = onSnapshot(courierQuery, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourierApplication));
      setCourierApplications(apps);
    }, (error) => {
        console.error("Error fetching courier applications:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch courier applications.' });
    });


    return () => {
        unsubLiaison();
        unsubCourier();
    };
  }, [userProfile?.communityId, db, toast]);

  const handleUpdateLiaisonStatus = async (applicationId: string, status: 'Declined' | 'Approved') => {
    const app = liaisonApplications.find(a => a.id === applicationId);
    const result = await updateLiaisonApplicationStatusAction({ 
        applicationId, 
        status, 
        communityName: app?.communityName,
        applicantName: app?.applicantName
    });

    if (result.success) {
      toast({ title: 'Application Updated', description: 'The application status has been changed.' });
    } else {
      toast({ title: 'Error', description: 'Failed to update application status.', variant: 'destructive' });
    }
  };
  
  const handleUpdateCourierStatus = async (applicationId: string, status: 'Approved' | 'Declined' | 'Pending Review') => {
    if (!userProfile?.communityId || !userProfile.name) return;
    const result = await updateCourierApplicationStatusAction({
      applicationId,
      communityId: userProfile.communityId,
      status,
      actorName: userProfile.name,
    });
    if (result.success) {
      toast({ title: 'Application Updated', description: `The courier application has been ${status === 'Pending Review' ? 'reset to pending' : status.toLowerCase()}.` });
      setViewingApplication(null); // Close dialog on success
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };
  
  const handleUnappointCourier = async () => {
    if (!currentCourierId || !userProfile?.communityId) {
        toast({ title: "Error", description: "No active courier to unappoint.", variant: "destructive" });
        return;
    }
    const result = await unappointCommunityCourierAction({
        userId: currentCourierId,
        communityId: userProfile.communityId,
    });
    if (result.success) {
        toast({ title: 'Courier Unappointed' });
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  const handleEndorse = async () => {
    if (!viewingApplication || !user || !('justification' in viewingApplication)) return;
    setIsProcessing(true);
    const result = await updateLiaisonApplicationStatusAction({
        applicationId: viewingApplication.id,
        status: 'Pending Admin Verification',
        communityName: viewingApplication.communityName,
        applicantName: viewingApplication.applicantName,
        processingNotes,
        processorId: user.uid,
        processorName: userProfile?.name || "Community Leader",
    });

    if (result.success) {
        toast({ title: 'Application Endorsed', description: 'The application has been forwarded for admin verification.' });
        setViewingApplication(null);
        setProcessingNotes('');
    } else {
        toast({ title: 'Error', description: result.error || 'Failed to endorse application.', variant: 'destructive' });
    }
    setIsProcessing(false);
  }
  
  const handleApproveLiaison = async () => {
   if (!viewingApplication) return;
   setIsProcessing(true);
   const result = await updateLiaisonApplicationStatusAction({
       applicationId: viewingApplication.id,
       status: 'Approved',
   });

   if (result.success) {
       toast({ title: 'Application Approved!', description: `${viewingApplication.applicantName} is now a Police Liaison.` });
       setViewingApplication(null);
   } else {
       toast({ title: 'Approval Failed', description: result.error, variant: 'destructive' });
   }
   setIsProcessing(false);
 }

 const handleCloseDialog = () => {
    setViewingApplication(null);
    setProcessingNotes('');
  };

  const isLiaisonApp = (app: any): app is LiaisonApplication => 'justification' in app;

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Applications
          </h1>
          <p className="text-muted-foreground">Review applications for special roles within your community.</p>
        </div>

        <Card>
            <CardHeader>
                 <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="liaison"><Shield className="mr-2 h-4 w-4"/>Police Liaison</TabsTrigger>
                        <TabsTrigger value="courier"><Truck className="mr-2 h-4 w-4"/>Community Courier</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                {activeTab === 'liaison' && (
                    <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Title/Rank</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date Submitted</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                        ) : liaisonApplications.length > 0 ? (
                            liaisonApplications.map(app => (
                            <ContextMenu key={app.id}>
                                <ContextMenuTrigger asChild>
                                    <TableRow>
                                        <TableCell className="font-medium">{app.applicantName}</TableCell>
                                        <TableCell>{app.applicantTitle}</TableCell>
                                        <TableCell><LiaisonStatusBadge status={app.status} /></TableCell>
                                        <TableCell>{format(app.createdAt.toDate(), 'PPP')}</TableCell>
                                        <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onSelect={() => setViewingApplication(app)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                                            {app.status === 'Pending Leader Review' && (
                                                <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => setViewingApplication(app)}><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Endorse</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleUpdateLiaisonStatus(app.id, 'Declined')} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4" /> Decline</DropdownMenuItem>
                                                </>
                                            )}
                                            {isAdmin && app.status === 'Pending Admin Verification' && (
                                                <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => handleApproveLiaison()}><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve Application</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleUpdateLiaisonStatus(app.id, 'Declined')} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4" /> Decline</DropdownMenuItem>
                                                </>
                                            )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuLabel>Actions</ContextMenuLabel>
                                    <ContextMenuItem onSelect={() => setViewingApplication(app)}><Eye className="mr-2 h-4 w-4" /> View Details</ContextMenuItem>
                                    {app.status === 'Pending Leader Review' && (
                                        <>
                                            <ContextMenuSeparator />
                                            <ContextMenuItem onSelect={() => setViewingApplication(app)}><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Endorse</ContextMenuItem>
                                            <ContextMenuItem onSelect={() => handleUpdateLiaisonStatus(app.id, 'Declined')} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4" /> Decline</ContextMenuItem>
                                        </>
                                    )}
                                    {isAdmin && app.status === 'Pending Admin Verification' && (
                                        <>
                                            <ContextMenuSeparator />
                                            <ContextMenuItem onSelect={() => handleApproveLiaison()}><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve Application</ContextMenuItem>
                                            <ContextMenuItem onSelect={() => handleUpdateLiaisonStatus(app.id, 'Declined')} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4" /> Decline</ContextMenuItem>
                                        </>
                                    )}
                                </ContextMenuContent>
                            </ContextMenu>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center">No liaison applications found.</TableCell></TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </div>
                )}
                {activeTab === 'courier' && (
                     <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Applicant</TableHead>
                                <TableHead>Date Submitted</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : courierApplications.length > 0 ? (
                                courierApplications.map(app => (
                                <ContextMenu key={app.id}>
                                    <ContextMenuTrigger asChild>
                                        <TableRow>
                                            <TableCell className="font-medium">{app.applicantName}</TableCell>
                                            <TableCell>{format(app.createdAt.toDate(), 'PPP')}</TableCell>
                                            <TableCell><CourierStatusBadge status={app.status} /></TableCell>
                                            <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onSelect={() => setViewingApplication(app)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {app.status === 'Pending Review' && (
                                                    <>
                                                    <DropdownMenuItem onSelect={() => handleUpdateCourierStatus(app.id, 'Approved')}><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleUpdateCourierStatus(app.id, 'Declined')} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4" /> Decline</DropdownMenuItem>
                                                    </>
                                                )}
                                                {app.status === 'Approved' && app.applicantId === currentCourierId && (
                                                    <DropdownMenuItem onSelect={handleUnappointCourier} className="text-destructive focus:text-destructive"><UserX className="mr-2 h-4 w-4" /> Unappoint Courier</DropdownMenuItem>
                                                )}
                                                {(app.status === 'Approved' || app.status === 'Declined') && (
                                                    <DropdownMenuItem onSelect={() => handleUpdateCourierStatus(app.id, 'Pending Review')}><RotateCw className="mr-2 h-4 w-4" /> Reset to Pending</DropdownMenuItem>
                                                )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuLabel>Actions</ContextMenuLabel>
                                        <ContextMenuItem onSelect={() => setViewingApplication(app)}><Eye className="mr-2 h-4 w-4" /> View Details</ContextMenuItem>
                                        <ContextMenuSeparator />
                                        {app.status === 'Pending Review' && (
                                            <>
                                                <ContextMenuItem onSelect={() => handleUpdateCourierStatus(app.id, 'Approved')}><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve</ContextMenuItem>
                                                <ContextMenuItem onSelect={() => handleUpdateCourierStatus(app.id, 'Declined')} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4" /> Decline</ContextMenuItem>
                                            </>
                                        )}
                                        {app.status === 'Approved' && app.applicantId === currentCourierId && (
                                            <ContextMenuItem onSelect={handleUnappointCourier} className="text-destructive focus:text-destructive"><UserX className="mr-2 h-4 w-4" /> Unappoint Courier</ContextMenuItem>
                                        )}
                                        {(app.status === 'Approved' || app.status === 'Declined') && (
                                            <ContextMenuItem onSelect={() => handleUpdateCourierStatus(app.id, 'Pending Review')}><RotateCw className="mr-2 h-4 w-4" /> Reset to Pending</ContextMenuItem>
                                        )}
                                    </ContextMenuContent>
                                </ContextMenu>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No courier applications found.</TableCell></TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

       <Dialog open={!!viewingApplication} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {viewingApplication && (
             <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-4 py-4 pr-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div><h4 className="font-semibold text-sm">Applicant</h4><p className="text-sm text-muted-foreground">{viewingApplication.applicantName}</p></div>
                        {isLiaisonApp(viewingApplication) && <div><h4 className="font-semibold text-sm">Title/Rank</h4><p className="text-sm text-muted-foreground">{viewingApplication.applicantTitle}</p></div>}
                        <div><h4 className="font-semibold text-sm">Community</h4><p className="text-sm text-muted-foreground">{viewingApplication.communityName}</p></div>
                        <div><h4 className="font-semibold text-sm">Status</h4>{isLiaisonApp(viewingApplication) ? <LiaisonStatusBadge status={viewingApplication.status} /> : <CourierStatusBadge status={viewingApplication.status} />}</div>
                    </div>
                     <Separator />
                     
                    {isLiaisonApp(viewingApplication) ? (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm">Justification</h4>
                                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md mt-1">{viewingApplication.justification}</p>
                            </div>
                            <Separator />
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Station Details</h4>
                                <div className="space-y-1 text-sm">
                                    <p><strong>Station Name:</strong> {viewingApplication.stationName}</p>
                                    <p><strong>Station Address:</strong> {viewingApplication.stationAddress}</p>
                                    <p><strong>Station Phone:</strong> {viewingApplication.stationPhoneNumber}</p>
                                </div>
                            </div>
                            {(viewingApplication.referenceName || viewingApplication.referenceTitle) && (
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Reference Contact</h4>
                                    <div className="space-y-1 text-sm">
                                        {viewingApplication.referenceName && <p><strong>Name:</strong> {viewingApplication.referenceName}</p>}
                                        {viewingApplication.referenceTitle && <p><strong>Title/Rank:</strong> {viewingApplication.referenceTitle}</p>}
                                    </div>
                                </div>
                            )}
                             {viewingApplication.status === 'Pending Leader Review' && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <Label htmlFor="endorsement-notes">Endorsement Notes (Optional)</Label>
                                        <Textarea id="endorsement-notes" placeholder="Add any notes for the platform administrators here..." value={processingNotes} onChange={(e) => setProcessingNotes(e.target.value)} />
                                    </div>
                                </>
                            )}
                            {(viewingApplication.status === 'Pending Admin Verification' || viewingApplication.status === 'Approved' || viewingApplication.status === 'Declined') && viewingApplication.processedBy && (
                                <>
                                    <Separator />
                                    <div>
                                        <h4 className="font-semibold text-sm">Leader Review</h4>
                                        <p className="text-xs text-muted-foreground">Endorsed by {viewingApplication.processedBy} on {viewingApplication.processedAt!.toDate().toLocaleDateString()}</p>
                                        {viewingApplication.processingNotes && <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md mt-1">{viewingApplication.processingNotes}</p>}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                         <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm">Statement</h4>
                                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md mt-1 whitespace-pre-wrap">{viewingApplication.statement}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">Vehicle Details</h4>
                                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md mt-1">{viewingApplication.vehicleDetails}</p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Driving License</h4>
                                    <div className="relative w-full aspect-[1.586] rounded-md overflow-hidden border bg-muted">
                                        <Image src={(viewingApplication as CourierApplication).licenseImageUrl} alt="Driving License" layout="fill" objectFit="contain" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Selfie</h4>
                                    <div className="relative w-full aspect-[1.586] rounded-md overflow-hidden border bg-muted">
                                        <Image src={(viewingApplication as CourierApplication).selfieImageUrl} alt="Selfie" layout="fill" objectFit="contain" />
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <h4 className="font-semibold text-sm">Contact Information</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                    <div><strong>Email:</strong> {(viewingApplication as CourierApplication).contactEmail}</div>
                                    <div><strong>Phone:</strong> {(viewingApplication as CourierApplication).contactPhone}</div>
                                </div>
                            </div>
                            
                            {(viewingApplication as CourierApplication).refName && (
                                <>
                                    <Separator />
                                    <div>
                                        <h4 className="font-semibold text-sm">Reference Details</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                            <div><strong>Name:</strong> {(viewingApplication as CourierApplication).refName}</div>
                                            <div><strong>Relationship:</strong> {(viewingApplication as CourierApplication).refRelationship}</div>
                                            <div><strong>Email:</strong> {(viewingApplication as CourierApplication).refEmail}</div>
                                            <div><strong>Phone:</strong> {(viewingApplication as CourierApplication).refPhone}</div>
                                        </div>
                                    </div>
                                </>
                            )}
                            {(viewingApplication.status === 'Approved' || viewingApplication.status === 'Declined') && viewingApplication.processedBy && (
                                <>
                                    <Separator />
                                    <div>
                                        <h4 className="font-semibold text-sm">Decision</h4>
                                        <p className="text-xs text-muted-foreground">
                                            {viewingApplication.status} by {viewingApplication.processedBy} on {format(viewingApplication.processedAt!.toDate(), "PPP 'at' p")}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseDialog}>Close</Button>
            {viewingApplication && isLiaisonApp(viewingApplication) && viewingApplication.status === 'Pending Leader Review' && (
                <Button onClick={handleEndorse} disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Endorse & Forward to Admin
                </Button>
            )}
            {viewingApplication && isAdmin && isLiaisonApp(viewingApplication) && viewingApplication.status === 'Pending Admin Verification' && (
                <Button onClick={handleApproveLiaison} disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Approve Application
                </Button>
            )}
            {viewingApplication && !isLiaisonApp(viewingApplication) && viewingApplication.status === 'Pending Review' && (
                <>
                    <Button variant="destructive" onClick={() => handleUpdateCourierStatus(viewingApplication.id, 'Declined')} disabled={isProcessing}>Decline</Button>
                    <Button onClick={() => handleUpdateCourierStatus(viewingApplication.id, 'Approved')} disabled={isProcessing}>
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Approve
                    </Button>
                </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
