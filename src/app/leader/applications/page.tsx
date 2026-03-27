
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
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { doc } from 'firebase/firestore';

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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { updateLiaisonApplicationStatusAction } from '@/lib/actions/liaisonActions';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ApplicationStatus = 'Pending Leader Review' | 'Pending Admin Verification' | 'Approved' | 'Declined';

type Application = {
  id: string;
  applicantName: string;
  applicantTitle: string;
  communityName: string;
  status: ApplicationStatus;
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

const StatusBadge = ({ status }: { status: ApplicationStatus }) => {
  const styles = {
    'Pending Leader Review': 'bg-yellow-100 text-yellow-800',
    'Pending Admin Verification': 'bg-blue-100 text-blue-800',
    'Approved': 'bg-green-100 text-green-800',
    'Declined': 'bg-red-100 text-red-800',
  };
  return <Badge className={styles[status] || ''}>{status}</Badge>;
};

export default function LeaderApplicationsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('pending');
  const [viewingApplication, setViewingApplication] = React.useState<Application | null>(null);
  const [processingNotes, setProcessingNotes] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'owner';

  React.useEffect(() => {
    if (!userProfile?.communityId || !db) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'liaison_applications'),
      where('communityId', '==', userProfile.communityId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
      setApplications(apps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.communityId, db]);

  const handleUpdateStatus = async (applicationId: string, status: 'Declined' | 'Approved') => {
    const app = applications.find(a => a.id === applicationId);
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

  const handleEndorse = async () => {
    if (!viewingApplication || !user) return;
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
  
  const handleApprove = async () => {
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

  const filteredApplications = React.useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return applications.filter(app => app.status === 'Pending Leader Review');
      case 'endorsed':
        return applications.filter(app => app.status === 'Pending Admin Verification');
      case 'approved':
        return applications.filter(app => app.status === 'Approved');
      case 'declined':
        return applications.filter(app => app.status === 'Declined');
      default:
        return [];
    }
  }, [applications, activeTab]);

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Liaison Applications
          </h1>
          <p className="text-muted-foreground">Review and manage police liaison applications for your community.</p>
        </div>

        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="endorsed">Endorsed</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="declined">Declined</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
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
                  ) : filteredApplications.length > 0 ? (
                    filteredApplications.map(app => (
                      <ContextMenu key={app.id}>
                        <ContextMenuTrigger asChild>
                          <TableRow>
                            <TableCell className="font-medium">{app.applicantName}</TableCell>
                            <TableCell>{app.applicantTitle}</TableCell>
                            <TableCell><StatusBadge status={app.status} /></TableCell>
                            <TableCell>{format(app.createdAt.toDate(), 'PPP')}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onSelect={() => setViewingApplication(app)}>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                  </DropdownMenuItem>
                                  {app.status === 'Pending Leader Review' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onSelect={() => setViewingApplication(app)}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Endorse for Admin Review
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => handleUpdateStatus(app.id, 'Declined')} className="text-destructive focus:text-destructive">
                                        <XCircle className="mr-2 h-4 w-4" /> Decline
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {isAdmin && app.status === 'Pending Admin Verification' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onSelect={() => handleUpdateStatus(app.id, 'Approved')}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve Application
                                      </DropdownMenuItem>
                                       <DropdownMenuItem onSelect={() => handleUpdateStatus(app.id, 'Declined')} className="text-destructive focus:text-destructive">
                                        <XCircle className="mr-2 h-4 w-4" /> Decline
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                           <ContextMenuLabel>Actions</ContextMenuLabel>
                           <ContextMenuItem onSelect={() => setViewingApplication(app)}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                            </ContextMenuItem>
                            {app.status === 'Pending Leader Review' && (
                                <>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onSelect={() => setViewingApplication(app)}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Endorse for Admin Review
                                    </ContextMenuItem>
                                    <ContextMenuItem onSelect={() => handleUpdateStatus(app.id, 'Declined')} className="text-destructive focus:text-destructive">
                                        <XCircle className="mr-2 h-4 w-4" /> Decline
                                    </ContextMenuItem>
                                </>
                            )}
                             {isAdmin && app.status === 'Pending Admin Verification' && (
                                <>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onSelect={() => handleUpdateStatus(app.id, 'Approved')}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve Application
                                    </ContextMenuItem>
                                      <ContextMenuItem onSelect={() => handleUpdateStatus(app.id, 'Declined')} className="text-destructive focus:text-destructive">
                                        <XCircle className="mr-2 h-4 w-4" /> Decline
                                      </ContextMenuItem>
                                </>
                            )}
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No applications in this category.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewingApplication} onOpenChange={() => { setViewingApplication(null); setProcessingNotes(''); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {viewingApplication && (
             <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-4 py-4 pr-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div><h4 className="font-semibold text-sm">Applicant</h4><p className="text-sm text-muted-foreground">{viewingApplication.applicantName}</p></div>
                        <div><h4 className="font-semibold text-sm">Title/Rank</h4><p className="text-sm text-muted-foreground">{viewingApplication.applicantTitle}</p></div>
                        <div><h4 className="font-semibold text-sm">Community</h4><p className="text-sm text-muted-foreground">{viewingApplication.communityName}</p></div>
                        <div><h4 className="font-semibold text-sm">Status</h4><StatusBadge status={viewingApplication.status} /></div>
                    </div>
                     <Separator />
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
                                <Textarea
                                    id="endorsement-notes"
                                    placeholder="Add any notes for the platform administrators here..."
                                    value={processingNotes}
                                    onChange={(e) => setProcessingNotes(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                     {(viewingApplication.status === 'Pending Admin Verification' || viewingApplication.status === 'Approved' || viewingApplication.status === 'Declined') && viewingApplication.processedBy && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold text-sm">Leader Review</h4>
                                <p className="text-xs text-muted-foreground">Endorsed by {viewingApplication.processedBy} on {format(viewingApplication.processedAt!.toDate(), 'PPP')}</p>
                                {viewingApplication.processingNotes && <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md mt-1">{viewingApplication.processingNotes}</p>}
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {setViewingApplication(null); setProcessingNotes('');}}>Close</Button>
            {viewingApplication?.status === 'Pending Leader Review' && (
                <Button onClick={handleEndorse} disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Endorse & Forward to Admin
                </Button>
            )}
            {isAdmin && viewingApplication?.status === 'Pending Admin Verification' && (
                <Button onClick={handleApprove} disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Approve Application
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
