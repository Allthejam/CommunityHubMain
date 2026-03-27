
"use client";

import * as React from "react";
import {
  LineChart,
  Eye,
  CheckCircle,
  Archive,
  MoreHorizontal,
  Loader2,
  ArrowUpDown,
  User,
  ShieldAlert,
  Save,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  writeBatch,
  where,
  documentId,
  getDocs,
  type Query,
} from "firebase/firestore";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";

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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateReportStatusAction } from "@/lib/actions/reportActions";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { PaginationControls } from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";

type ReportStatus = "New" | "In Progress" | "Resolved" | "Archived";

type Report = {
  id: string;
  subject: string;
  category: string;
  reporterName: string;
  createdAt: { toDate: () => Date };
  status: ReportStatus;
  description: string;
  severity: "Low" | "Moderate" | "Severe";
  image?: string;
  reporterId: string;
  resolutionNotes?: string;
  resolvedAt?: { toDate: () => Date };
  resolvedBy?: string;
  acknowledgedAt?: { toDate: () => Date };
  acknowledgedBy?: string;
  communityId?: string;
  communityName?: string; // Added for display
};

const StatusBadge = ({ status }: { status: ReportStatus }) => {
  const statusStyles: { [key in ReportStatus]: string } = {
    New: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    "In Progress":
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    Resolved: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    Archived: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };
  return <Badge className={statusStyles[status]}>{status}</Badge>;
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
  const { user, isUserLoading } = useUser();
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
  const [communityNameMap, setCommunityNameMap] = React.useState<Map<string, string>>(new Map());
  
  const [reports, setReports] = React.useState<Report[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);


  React.useEffect(() => {
    if (!userProfile || !db) {
        setIsLoading(isUserLoading || profileLoading);
        return;
    }

    setIsLoading(true);
    const reportsRef = collection(db, "community_reports");
    const unsubscribes: (() => void)[] = [];
    let initialLoadCompleted = false;

    const isPoliceLiaison = userProfile.role === 'police-liaison-officer' || Object.values(userProfile.communityRoles || {}).some((r: any) => r.role === 'police-liaison-officer');

    if (isPoliceLiaison) {
        const liaisonCommunities: { id: string, permissions: any }[] = [];
        if (userProfile.communityId && userProfile.role === 'police-liaison-officer') {
            liaisonCommunities.push({ id: userProfile.communityId, permissions: userProfile.permissions || {} });
        }
        if (userProfile.communityRoles) {
            for (const cid in userProfile.communityRoles) {
                if ((userProfile.communityRoles[cid] as any).role === 'police-liaison-officer' && !liaisonCommunities.some(c => c.id === cid)) {
                    liaisonCommunities.push({ id: cid, permissions: (userProfile.communityRoles[cid] as any).permissions || {} });
                }
            }
        }
        
        if (liaisonCommunities.length === 0) {
            setReports([]);
            setIsLoading(false);
            return () => {};
        }

        const allCommunityIds = liaisonCommunities.map(c => c.id);
        const communityDocsQuery = query(collection(db, 'communities'), where(documentId(), 'in', allCommunityIds.slice(0, 30)));
        getDocs(communityDocsQuery).then(communitySnapshot => {
            const nameMap = new Map<string, string>();
            communitySnapshot.forEach(doc => nameMap.set(doc.id, doc.data().name));
            setCommunityNameMap(nameMap);
        });

        const setupListeners = () => {
            liaisonCommunities.forEach(community => {
                let q: Query | null = null;
                const permissions = community.permissions || {};
                
                if (permissions.canViewAllCommunityReports) {
                    q = query(reportsRef, where('communityId', '==', community.id));
                } else {
                    let allowedCategories = ['Report a crime']; // Ensure 'report a crime' is always included
                    if (permissions.viewableReportCategories) {
                        const categories = Array.isArray(permissions.viewableReportCategories) 
                            ? permissions.viewableReportCategories 
                            : Object.keys(permissions.viewableReportCategories);
                        if (categories.length > 0) {
                            allowedCategories = [...new Set([...allowedCategories, ...categories])];
                        }
                    }
                    if(allowedCategories.length > 0) {
                       q = query(reportsRef, where('communityId', '==', community.id), where('category', 'in', allowedCategories.slice(0, 10)));
                    }
                }

                if (q) {
                    const unsub = onSnapshot(q, (snapshot) => {
                        const newReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
                        setReports(prev => {
                            const otherReports = prev.filter(r => r.communityId !== community.id);
                            return [...otherReports, ...newReports];
                        });
                        if (!initialLoadCompleted) {
                           setIsLoading(false);
                           initialLoadCompleted = true;
                        }
                    }, (error) => {
                        console.error(`Error fetching reports for community ${community.id}:`, error);
                        setIsLoading(false);
                    });
                    unsubscribes.push(unsub);
                }
            });
             if (unsubscribes.length === 0) {
              setReports([]);
              setIsLoading(false);
            }
        };

        setupListeners();
    } else { // Regular leader/admin
        const communityId = (userProfile as any)?.impersonating?.communityId || userProfile.communityId;
        const communityName = (userProfile as any)?.impersonating?.communityName || userProfile.communityName;
        
        if (!communityId) {
            setReports([]);
            setIsLoading(false);
            return () => {};
        }
        const q = query(reportsRef, where("communityId", "==", communityId));
        const unsub = onSnapshot(q, (snapshot) => {
            const reportsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                communityName: communityName,
            } as Report));
            setReports(reportsData);
            setIsLoading(false);
        });
        unsubscribes.push(unsub);
    }

    return () => unsubscribes.forEach(unsub => unsub());

  }, [userProfile, db, isUserLoading, profileLoading]);


  const reportsWithCommunityNames = React.useMemo(() => {
    const isPoliceLiaison = userProfile?.role === 'police-liaison-officer' || Object.values(userProfile?.communityRoles || {}).some((r: any) => r.role === 'police-liaison-officer');
    
    if (isPoliceLiaison) {
        return reports.map(r => ({
            ...r,
            communityName: communityNameMap.get(r.communityId || '') || r.communityId
        }));
    }
    return reports;
  }, [reports, communityNameMap, userProfile]);

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
        console.error("Error updating status: ", error);
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

  const filteredAndSortedReports = React.useMemo(() => {
    if (!reportsWithCommunityNames) return [];
    let filtered = reportsWithCommunityNames;
    if (activeTab !== "all") {
        filtered = reportsWithCommunityNames.filter((report) => report.status === activeTab);
    }
    
    return [...filtered].sort((a, b) => {
        const key = sorting.key;
        const order = sorting.order === 'asc' ? 1 : -1;
        
        let valA = a[key as keyof Report] as any;
        let valB = b[key as keyof Report] as any;

        if (key === 'createdAt') {
            valA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            valB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return (valA - valB) * order;
        }

        if (String(valA) < String(valB)) return -1 * order;
        if (String(valA) > valB) return 1 * order;
        return 0;
    });
  }, [reportsWithCommunityNames, activeTab, sorting]);
  
  const paginatedReports = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredAndSortedReports.slice(start, end);
  }, [filteredAndSortedReports, pagination]);

  const pageCount = Math.ceil(filteredAndSortedReports.length / pagination.pageSize);
  
  const ArchiveCountdown = ({ resolvedAt }: { resolvedAt?: { toDate: () => Date } }) => {
    if (!resolvedAt) return null;
    const resolvedDate = resolvedAt.toDate();
    const deletionDate = addDays(resolvedDate, 28);
    const daysRemaining = differenceInDays(deletionDate, new Date());
    
    if (daysRemaining <= 0) {
        return <span className="text-xs text-muted-foreground">Ready for archival</span>;
    }
    
    return <span className="text-xs text-muted-foreground">Archives in {daysRemaining} days</span>;
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <LineChart className="h-8 w-8" />
            Reports
          </h1>
          <p className="text-muted-foreground">
            Review and manage reports submitted by community members.
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
                    <TableHead><Button variant="ghost" onClick={() => handleSort('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('communityName')}>Community <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('category')}>Category <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('severity')}>Severity <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('reporterName')}>Reported By <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('createdAt')}>Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
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
                          <TableRow>
                            <TableCell className="font-medium">{report.subject}</TableCell>
                            <TableCell>{report.communityName}</TableCell>
                            <TableCell className="capitalize">{report.category}</TableCell>
                            <TableCell>
                               <div className="flex flex-col items-start">
                                <StatusBadge status={report.status} />
                                {report.status === 'In Progress' && report.acknowledgedAt && (
                                    <span className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                                        {format(report.acknowledgedAt.toDate(), "dd MMM, p")}
                                    </span>
                                )}
                                {report.status === 'Resolved' && report.resolvedAt && (
                                    <ArchiveCountdown resolvedAt={report.resolvedAt} />
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
                              {report.createdAt ? format(report.createdAt.toDate(), "PPP") : 'N/A'}
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
                                  <DropdownMenuItem onSelect={() => setViewingReport(report)}>
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
                      <TableCell colSpan={8} className="h-24 text-center">
                        No reports in this category.
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
            <DialogContent className="sm:max-w-lg grid grid-rows-[auto,minmax(0,1fr),auto] p-0 max-h-[90vh]">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle>{viewingReport?.subject}</DialogTitle>
                    <DialogDescription>
                        Reported on {viewingReport?.createdAt ? format(viewingReport.createdAt.toDate(), "PPP 'at' p") : ""}
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
                                    <div><strong>Community:</strong> {viewingReport?.communityName || 'N/A'}</div>
                                </div>
                            </div>
                            
                            {(viewingReport?.status !== 'New' && viewingReport?.acknowledgedAt) && (
                                <div className="space-y-2 pt-4 border-t">
                                    <h4 className="text-sm font-semibold">Acknowledgement Details</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Acknowledged by {viewingReport.acknowledgedBy} on {format(viewingReport.acknowledgedAt.toDate(), "PPP 'at' p")}
                                    </p>
                                </div>
                            )}

                            {viewingReport?.status === 'Resolved' && viewingReport?.resolutionNotes && (
                              <div className="space-y-2 pt-4 border-t">
                                <h4 className="text-sm font-semibold">Resolution Notes</h4>
                                {viewingReport.resolvedBy && viewingReport.resolvedAt && (
                                    <p className="text-xs text-muted-foreground">
                                        Resolved by {viewingReport.resolvedBy} on {format(viewingReport.resolvedAt.toDate(), "PPP 'at' p")}
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
                                <CheckCircle className="mr-2 h-4 w-4" /> Acknowledge & Begin
                            </Button>
                        )}
                        {viewingReport?.status === 'In Progress' && (
                            <Button onClick={handleResolveClick} disabled={!resolutionNotes.trim() || isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Save className="mr-2 h-4 w-4" /> Mark as Resolved
                            </Button>
                        )}
                        {viewingReport?.status === 'Resolved' && (
                            <Button onClick={handleArchiveClick} disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Archive className="mr-2 h-4 w-4" /> Archive Report
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}

    