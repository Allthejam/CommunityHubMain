
'use client';

import * as React from "react";
import {
  MoreHorizontal,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  ShieldAlert,
  FileEdit,
  Clock,
  ArrowUpDown,
  User,
  Save,
  Archive,
  AlertTriangle,
} from "lucide-react";
import { collection, query, where, doc, onSnapshot, orderBy } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { format, isValid } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
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
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateReportStatusAction } from "@/lib/actions/reportActions";
import { PaginationControls } from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


type ReportStatus = "New" | "In Progress" | "Resolved" | "Archived";

type Report = {
  id: string;
  subject: string;
  category: string;
  reporterName: string;
  createdAt: { toDate: () => Date } | any;
  status: ReportStatus;
  description: string;
  severity: "Low" | "Moderate" | "Severe";
  image?: string;
  reporterId: string;
  resolutionNotes?: string;
  resolvedAt?: { toDate: () => Date } | any;
  acknowledgedAt?: { toDate: () => Date } | any;
  acknowledgedBy?: string;
  communityId?: string;
  communityName?: string;
};

const StatusBadge = ({ status }: { status: ReportStatus }) => {
  const statusConfig: { [key in ReportStatus]: string } = {
    New: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    "In Progress":
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    Resolved: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    Archived: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };
  return <Badge className={statusConfig[status]}>{status}</Badge>;
};

const SeverityBadge = ({ severity }: { severity: Report["severity"] }) => {
    const severityStyles = {
        Low: "bg-gray-100 text-gray-800",
        Moderate: "bg-yellow-100 text-yellow-800",
        Severe: "bg-red-100 text-red-800",
    }
    return <Badge className={severityStyles[severity]}>{severity}</Badge>
}

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "New", label: "New" },
  { value: "In Progress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Archived", label: "Archived" },
];

export default function LeaderReportsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState("all");
  const [viewingReport, setViewingReport] = React.useState<Report | null>(null);
  const [resolutionNotes, setResolutionNotes] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [sorting, setSorting] = React.useState<{ key: keyof Report; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  
  const communityId = (userProfile as any)?.impersonating?.communityId || userProfile?.communityId;

  // Use a simpler query and filter/sort client side to avoid potential index/permission sync issues
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!communityId || !db) {
        if (!profileLoading) setLoading(false);
        return;
    }

    setLoading(true);
    const q = query(collection(db, "community_reports"), where("communityId", "==", communityId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const reportsData = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        } as Report));
        setReports(reportsData);
        setLoading(false);
    }, (err) => {
        console.error("Reports query failed:", err);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [communityId, db, profileLoading]);

  const filteredAndSortedReports = React.useMemo(() => {
    let filtered = reports;

    // Tab filtering
    if (activeTab !== "all") {
        filtered = filtered.filter((report) => report.status === activeTab);
    }
    
    // Client-side sorting
    return [...filtered].sort((a, b) => {
        const key = sorting.key;
        const order = sorting.order === 'asc' ? 1 : -1;
        
        let valA = a[key as keyof Report] as any;
        let valB = b[key as keyof Report] as any;

        if (key === 'createdAt') {
            const timeA = valA?.toDate ? valA.toDate().getTime() : (valA ? new Date(valA).getTime() : 0);
            const timeB = valB?.toDate ? valB.toDate().getTime() : (valB ? new Date(valB).getTime() : 0);
            return (timeA - timeB) * order;
        }

        if (String(valA) < String(valB)) return -1 * order;
        if (String(valA) > String(valB)) return 1 * order;
        return 0;
    });
  }, [reports, activeTab, sorting]);

  const handleUpdateStatus = async (report: Report, status: ReportStatus, notes?: string) => {
    setIsProcessing(true);
    try {
        const result = await updateReportStatusAction({
            reportId: report.id,
            status,
            resolutionNotes: notes,
            resolvedBy: userProfile?.name,
            acknowledgedBy: userProfile?.name,
            reportType: 'community'
        });
        if(result.success) {
            toast({ title: 'Success', description: `Report status updated.`});
        } else {
            throw new Error(result.error);
        }
    } catch(error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to update report status.', variant: 'destructive'});
    } finally {
        setIsProcessing(false);
    }
  };

  const handleResolveClick = () => {
    if (viewingReport) {
      handleUpdateStatus(viewingReport, "Resolved", resolutionNotes).then(() => {
        setViewingReport(null);
        setResolutionNotes("");
      });
    }
  };
  
  const handleAcknowledgeClick = () => {
    if (viewingReport) {
      handleUpdateStatus(viewingReport, "In Progress").then(() => {
        setViewingReport(null);
      });
    }
  };
  
  const handleArchiveClick = () => {
      if (viewingReport) {
          handleUpdateStatus(viewingReport, "Archived").then(() => {
              setViewingReport(null);
          });
      }
  };


  const handleCloseDialog = () => {
    setViewingReport(null);
    setResolutionNotes("");
  };

  const handleSort = (key: keyof Report) => {
    setSorting(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const paginatedReports = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredAndSortedReports.slice(start, end);
  }, [filteredAndSortedReports, pagination]);

  const pageCount = Math.ceil(filteredAndSortedReports.length / pagination.pageSize);
  
  const overallLoading = profileLoading || loading;

  const formatDate = (date: any) => {
      if (!date) return 'N/A';
      const d = date.toDate ? date.toDate() : new Date(date);
      return isValid(d) ? format(d, "PPP") : 'Invalid Date';
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ShieldAlert className="h-8 w-8" />
            Reports Management
          </h1>
          <p className="text-muted-foreground">
            Review and manage reports submitted by community members for {userProfile?.communityName || 'your community'}.
          </p>
        </div>

        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-xs sm:text-sm"
                  >
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
                    <TableHead><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => handleSort('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => handleSort('category')}>Category <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => handleSort('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => handleSort('severity')}>Severity <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => handleSort('reporterName')}>Reported By <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => handleSort('createdAt')}>Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overallLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading reports...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedReports.length > 0 ? (
                    paginatedReports.map((report) => (
                      <ContextMenu key={report.id}>
                        <ContextMenuTrigger asChild>
                          <TableRow className="cursor-pointer" onClick={() => setViewingReport(report)}>
                            <TableCell className="font-medium">{report.subject}</TableCell>
                            <TableCell className="capitalize">{report.category}</TableCell>
                            <TableCell>
                               <div className="flex flex-col items-start">
                                <StatusBadge status={report.status} />
                                {report.status === 'In Progress' && report.acknowledgedAt && (
                                    <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">
                                        Acknowledged: {formatDate(report.acknowledgedAt)}
                                    </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                                <SeverityBadge severity={report.severity} />
                            </TableCell>
                             <TableCell>
                               {report.reporterName ? (
                                    <div className="flex items-center gap-2 text-xs">
                                        <User className="h-3 w-3" />
                                        {report.reporterName}
                                    </div>
                               ) : <span className="text-xs text-muted-foreground">Anonymous</span>}
                            </TableCell>
                            <TableCell>
                                {formatDate(report.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                    <span className="sr-only">More options</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onSelect={(e) => { 
                                      e.preventDefault(); 
                                      setTimeout(() => setViewingReport(report), 100); 
                                  }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details & Manage
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                           <ContextMenuItem onSelect={() => setViewingReport(report)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details & Manage
                            </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                        No reports found for this community hub.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
             <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={filteredAndSortedReports.length} />
          </CardContent>
        </Card>
      </div>

       <Dialog open={!!viewingReport} onOpenChange={handleCloseDialog}>
            <DialogContent className="sm:max-w-lg grid grid-rows-[auto,1fr,auto] p-0 max-h-[90vh]">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle>{viewingReport?.subject}</DialogTitle>
                    <DialogDescription>
                        Reported on {viewingReport?.createdAt ? formatDate(viewingReport.createdAt) : ""}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-full">
                    <div className="px-6">
                        <div className="space-y-4 py-4">
                            {viewingReport?.image && (
                                 <div className="relative w-full aspect-video rounded-md overflow-hidden">
                                     <Image src={viewingReport.image} alt="Report image" fill className="object-contain" />
                                </div>
                            )}
                             <div className="space-y-1">
                                <h4 className="text-sm font-semibold">Description</h4>
                                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{viewingReport?.description}</p>
                            </div>
                             <div className="space-y-4 pt-4 border-t">
                                <h4 className="text-sm font-semibold">Details</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2"><strong>Status:</strong> <StatusBadge status={viewingReport?.status!} /></div>
                                    <div className="flex items-center gap-2"><strong>Severity:</strong> <SeverityBadge severity={viewingReport?.severity!} /></div>
                                    <div><strong>Reported By:</strong> {viewingReport?.reporterName || 'Anonymous'}</div>
                                </div>
                            </div>
                            
                            {(viewingReport?.status !== 'New' && viewingReport?.acknowledgedAt) && (
                                <div className="space-y-2 pt-4 border-t">
                                    <h4 className="text-sm font-semibold">Acknowledgement Details</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Acknowledged by {viewingReport.acknowledgedBy} on {formatDate(viewingReport.acknowledgedAt)}
                                    </p>
                                </div>
                            )}

                            {viewingReport?.status === 'Resolved' && viewingReport?.resolutionNotes && (
                              <div className="space-y-2 pt-4 border-t">
                                <h4 className="text-sm font-semibold">Resolution Notes</h4>
                                {viewingReport.resolvedBy && viewingReport.resolvedAt && (
                                    <p className="text-xs text-muted-foreground">
                                        Resolved by {viewingReport.resolvedBy} on {formatDate(viewingReport.resolvedAt)}
                                    </p>
                                )}
                                <div className="text-sm text-muted-foreground bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-200 dark:border-green-800">{viewingReport.resolutionNotes}</div>
                              </div>
                            )}

                            {viewingReport?.status === 'In Progress' && (
                                <div className="space-y-2 pt-4 border-t">
                                    <Label htmlFor="resolution-notes">Resolution Notes</Label>
                                    <Textarea
                                        id="resolution-notes"
                                        placeholder="Describe the actions taken and the outcome..."
                                        value={resolutionNotes}
                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
                 <DialogFooter className="p-6 pt-4 border-t sm:justify-between">
                    <Button variant="outline" onClick={handleCloseDialog}>Close</Button>
                     <div className="flex gap-2">
                        {viewingReport?.status === 'New' && (
                            <Button onClick={handleAcknowledgeClick} disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <CheckCircle className="mr-2 h-4 w-4" /> Acknowledge
                            </Button>
                        )}
                        {viewingReport?.status === 'In Progress' && (
                            <Button onClick={handleResolveClick} disabled={!resolutionNotes.trim() || isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Save className="mr-2 h-4 w-4" /> Resolve
                            </Button>
                        )}
                        {viewingReport?.status === 'Resolved' && (
                            <Button onClick={handleArchiveClick} disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Archive className="mr-2 h-4 w-4" /> Archive
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
