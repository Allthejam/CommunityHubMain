

/**
 * =================================================================
 * |                    ** PROTECTED FILE **                       |
 * =================================================================
 * This file is part of the core announcements system. It has been
 * identified as a critical file and should not be modified without
 * explicit confirmation from the user.
 *
 * @see /src/app/(app)/leader/announcements/page.tsx
 * @see /src/app/(admin)/announcements/page.tsx
 * @see /src/components/broadcast-composer.tsx
 * @see /src/components/community-broadcast-composer.tsx
 * @see /src/components/announcement-banners.tsx
 * @see /src/components/emergency-alert.tsx
 * @see /src/lib/announcement-data.ts
 * =================================================================
 */

"use client";

import * as React from "react";
import {
    MoreHorizontal,
    Bell,
    Archive,
    PauseCircle,
    PlayCircle,
    Eye,
    XCircle,
    Info,
    ChevronDown,
    FilterX,
    Loader2,
    ArrowUpDown,
    ChevronsLeft,
    ChevronLeft,
    ChevronRight,
    ChevronsRight,
} from "lucide-react"
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { CommunityBroadcastComposer } from "@/components/community-broadcast-composer";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Announcement } from "@/lib/announcement-data";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import Image from "next/image";

const announcementTypes: (Announcement['type'] | 'Urgent')[] = ["Standard", "Urgent"];
const allStatuses: Announcement['status'][] = ["Live", "Scheduled", "Paused", "Archived"];


const AnnouncementRow = React.memo(({ announcement, onPause, onReactivate, onCancel, onView }: {
    announcement: Announcement;
    onPause: (id: string) => void;
    onReactivate: (id: string) => void;
    onCancel: (id: string) => void;
    onView: (announcement: Announcement) => void;
}) => {
    const isArchived = announcement.status === 'Archived';
    const isLive = announcement.status === 'Live';
    const isPaused = announcement.status === 'Paused';
    const isScheduled = announcement.status === 'Scheduled';

    const getTypeBadge = () => {
         if (announcement.type === 'Standard' && announcement.severity === 'urgent') {
          return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">Urgent</Badge>;
        }
        const typeStyles: { [key in Announcement["type"]]: string } = {
            Standard: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
            Emergency: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
        };
        return <Badge className={cn(typeStyles[announcement.type])}>{announcement.type}</Badge>;
    };

    const getStatusBadge = () => {
         const statusStyles: { [key in Announcement["status"]]: string } = {
            Live: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
            Paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
            Scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
            Archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
        };
        return <Badge className={cn(statusStyles[announcement.status])}>{announcement.status}</Badge>;
    }
    
    const cardBorderColor = announcement.type === 'Emergency' 
        ? 'border-red-500' 
        : announcement.severity === 'urgent' 
        ? 'border-amber-500' 
        : 'border-blue-500';

    const menuContent = (
        <>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onView(announcement)}>
                <Eye className="mr-2 h-4 w-4" />
                View Announcement
            </DropdownMenuItem>
            {!isArchived && <DropdownMenuSeparator />}
            {isLive && (
                <DropdownMenuItem onClick={() => onPause(announcement.id)}>
                    <PauseCircle className="mr-2 h-4 w-4" />
                    Pause
                </DropdownMenuItem>
            )}
            {(isPaused || isScheduled) && !isArchived && (
                <DropdownMenuItem onClick={() => onReactivate(announcement.id)}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Reactivate
                </DropdownMenuItem>
            )}
            {!isArchived && <DropdownMenuSeparator />}
            {!isArchived && (
                <DropdownMenuItem 
                onClick={() => onCancel(announcement.id)}
                className="text-amber-600 focus:bg-amber-100 focus:text-amber-700 dark:text-amber-400 dark:focus:bg-amber-900/50 dark:focus:text-amber-300">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                </DropdownMenuItem>
            )}
        </>
    );

    const contextMenuContent = (
        <ContextMenuContent>
            <ContextMenuLabel>Actions</ContextMenuLabel>
            <ContextMenuItem onSelect={() => onView(announcement)}>
                <Eye className="mr-2 h-4 w-4" />
                View Announcement
            </ContextMenuItem>
            
            {!isArchived && <ContextMenuSeparator />}
            
            {isLive && (
                <ContextMenuItem onSelect={() => onPause(announcement.id)}>
                    <PauseCircle className="mr-2 h-4 w-4" />
                    Pause
                </ContextMenuItem>
            )}

            {(isPaused || isScheduled) && !isArchived && (
                <ContextMenuItem onSelect={() => onReactivate(announcement.id)}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Reactivate
                </ContextMenuItem>
            )}

            {!isArchived && <ContextMenuSeparator />}
            
            {!isArchived && (
                <ContextMenuItem 
                onSelect={() => onCancel(announcement.id)}
                className="text-amber-600 focus:bg-amber-100 focus:text-amber-700 dark:text-amber-400 dark:focus:bg-amber-900/50 dark:focus:text-amber-300">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                </ContextMenuItem>
            )}
        </ContextMenuContent>
    );

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <TableRow className="block md:table-row border-b md:border-none p-0">
                    {/* Mobile View */}
                    <td colSpan={8} className="p-2 md:hidden">
                        <div className={cn("flex items-center justify-between gap-2 p-3 rounded-lg border-l-4", cardBorderColor, "bg-card")}>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-semibold truncate">{announcement.subject}</p>
                                <p className="text-xs text-muted-foreground">{announcement.scheduledDates}</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                   {menuContent}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </td>
                    {/* Desktop View */}
                    <TableCell className="hidden md:table-cell"><Checkbox /></TableCell>
                    <TableCell className="hidden md:table-cell font-medium">{announcement.subject}</TableCell>
                    <TableCell className="hidden md:table-cell">{getTypeBadge()}</TableCell>
                    <TableCell className="hidden md:table-cell">{getStatusBadge()}</TableCell>
                    <TableCell className="hidden md:table-cell">{announcement.scheduledDates}</TableCell>
                    <TableCell className="hidden md:table-cell">{announcement.sentBy}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                               {menuContent}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            </ContextMenuTrigger>
            {contextMenuContent}
        </ContextMenu>
    )
});
AnnouncementRow.displayName = 'AnnouncementRow';


const PaginationControls = ({ pagination, setPagination, pageCount, totalRows }: {
    pagination: { pageIndex: number; pageSize: number; };
    setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number; }>>;
    pageCount: number;
    totalRows: number;
}) => (
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                {totalRows} total row(s).
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={`${pagination.pageSize}`}
                        onValueChange={(value) => {
                            setPagination({ pageIndex: 0, pageSize: Number(value) });
                        }}
                        >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={`${pagination.pageSize}`} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {pageSize}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-full sm:w-[100px] items-center justify-center text-sm font-medium">
                    Page {pagination.pageIndex + 1} of{" "}
                    {pageCount}
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))} disabled={pagination.pageIndex === 0}><span className="sr-only">Go to first page</span><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))} disabled={pagination.pageIndex === 0}><span className="sr-only">Go to previous page</span><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={pagination.pageIndex >= pageCount - 1}><span className="sr-only">Go to next page</span><ChevronRight className="h-4 w-4" /></Button>
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPagination(p => ({ ...p, pageIndex: pageCount - 1 }))} disabled={pagination.pageIndex >= pageCount - 1}><span className="sr-only">Go to last page</span><ChevronsRight className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
);


export default function LeaderAnnouncementsPage() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewingAnnouncement, setViewingAnnouncement] = React.useState<Announcement | null>(null);
  const { user } = useUser();
  const db = useFirestore();
   const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);
  const { toast } = useToast();

  const [subjectFilter, setSubjectFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  
  const [archivedSubjectFilter, setArchivedSubjectFilter] = React.useState("");
  const [archivedTypeFilter, setArchivedTypeFilter] = React.useState<string[]>([]);
  
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [archivedPagination, setArchivedPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  
  const [sorting, setSorting] = React.useState<{ key: keyof Announcement; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
  const [archivedSorting, setArchivedSorting] = React.useState<{ key: keyof Announcement; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });

  React.useEffect(() => {
    if (!user || !userProfile?.communityId || !db) {
        setLoading(false);
        return;
    };

    setLoading(true);

    const q = query(
        collection(db, "announcements"), 
        where("communityId", "==", userProfile.communityId)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const communityAnnouncements: Announcement[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            communityAnnouncements.push({ 
              id: doc.id,
              ...data,
              scheduledDates: data.scheduledDates || (data.startDate && data.endDate ? `${format(data.startDate.toDate(), "PPP")} - ${format(data.endDate.toDate(), "PPP")}` : format(data.createdAt.toDate(), "PPP")),
             } as Announcement);
        });
        setAnnouncements(communityAnnouncements);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching announcements:", error);
        toast({ title: "Error", description: "Could not fetch announcements.", variant: "destructive"});
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userProfile, db, toast]);

  const updateAnnouncementStatus = React.useCallback(async (announcementId: string, status: Announcement['status']) => {
    if (!db) return;
    const announcementRef = doc(db, 'announcements', announcementId);
    try {
        await updateDoc(announcementRef, { status });
        toast({ title: "Success", description: `Announcement status updated to ${status}.`});
    } catch (error) {
        console.error("Error updating status:", error);
        toast({ title: "Error", description: "Failed to update announcement status.", variant: "destructive"});
    }
  }, [db, toast]);
  
  const handlePause = React.useCallback((announcementId: string) => updateAnnouncementStatus(announcementId, 'Paused'), [updateAnnouncementStatus]);
  const handleReactivate = React.useCallback((announcementId: string) => updateAnnouncementStatus(announcementId, 'Live'), [updateAnnouncementStatus]);
  const handleCancel = React.useCallback((announcementId: string) => updateAnnouncementStatus(announcementId, 'Archived'), [updateAnnouncementStatus]);
  const handleView = React.useCallback((announcement: Announcement) => setViewingAnnouncement(announcement), []);

  const createSortHandler = (setter: React.Dispatch<React.SetStateAction<{ key: keyof Announcement; order: 'asc' | 'desc' }>>) => (key: keyof Announcement) => {
    setter(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortAnnouncements = (data: Announcement[], sortConfig: { key: keyof Announcement; order: 'asc' | 'desc' }) => {
    return [...data].sort((a,b) => {
        const valA = a[sortConfig.key as keyof Announcement] ?? '';
        const valB = b[sortConfig.key as keyof Announcement] ?? '';
        const order = sortConfig.order === 'asc' ? 1 : -1;
        if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB) * order;
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
     });
  };

  const filteredLiveAnnouncements = React.useMemo(() => {
    let filtered = announcements
      .filter(a => a.status !== 'Archived')
      .filter(a => subjectFilter ? a.subject.toLowerCase().includes(subjectFilter.toLowerCase()) : true)
      .filter(a => {
        if (typeFilter.length === 0) return true;
        const announcementType = a.type === 'Standard' && a.severity === 'urgent' ? 'Urgent' : a.type;
        return typeFilter.includes(announcementType);
      })
      .filter(a => statusFilter.length > 0 ? statusFilter.includes(a.status) : true);
    return sortAnnouncements(filtered, sorting);
  }, [announcements, subjectFilter, typeFilter, statusFilter, sorting]);

  const paginatedLiveAnnouncements = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredLiveAnnouncements.slice(start, start + pagination.pageSize);
  }, [filteredLiveAnnouncements, pagination]);
  
  const pageCount = Math.ceil(filteredLiveAnnouncements.length / pagination.pageSize);

  const filteredArchivedAnnouncements = React.useMemo(() => {
      let filtered = announcements
        .filter(a => a.status === 'Archived')
        .filter(a => archivedSubjectFilter ? a.subject.toLowerCase().includes(archivedSubjectFilter.toLowerCase()) : true)
        .filter(a => {
          if (archivedTypeFilter.length === 0) return true;
          const announcementType = a.type === 'Standard' && a.severity === 'urgent' ? 'Urgent' : a.type;
          return archivedTypeFilter.includes(announcementType);
        });
      return sortAnnouncements(filtered, archivedSorting);
  }, [announcements, archivedSubjectFilter, archivedTypeFilter, archivedSorting]);

  const paginatedArchivedAnnouncements = React.useMemo(() => {
    const start = archivedPagination.pageIndex * archivedPagination.pageSize;
    return filteredArchivedAnnouncements.slice(start, start + archivedPagination.pageSize);
  }, [filteredArchivedAnnouncements, archivedPagination]);
  const archivedPageCount = Math.ceil(filteredArchivedAnnouncements.length / archivedPagination.pageSize);

  
  if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  return (
    <>
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Bell className="h-8 w-8 text-primary" />
                Community Announcements
            </h1>
            <p className="text-muted-foreground">
                Create and manage announcements for your community. Includes the "Standard" versus "Emergency" broadcast type selector system.
            </p>
        </div>

        <CommunityBroadcastComposer />

        <Card>
            <CardHeader>
                 <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Community Announcements</CardTitle>
                        <CardDescription>View and manage all scheduled and active announcements for your community.</CardDescription>
                    </div>
                </div>
                 <div className="flex items-center gap-2 pt-4">
                    <Input
                        placeholder="Filter by subject..."
                        value={subjectFilter}
                        onChange={(event) => setSubjectFilter(event.target.value)}
                        className="max-w-xs"
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                            Type <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {announcementTypes.map(type => (
                                <DropdownMenuCheckboxItem
                                    key={type}
                                    checked={typeFilter.includes(type)}
                                    onCheckedChange={() => {
                                        setTypeFilter(prev => prev.includes(type) ? prev.filter(p => p !== type) : [...prev, type]);
                                    }}
                                >
                                    {type}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                            Status <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                             {allStatuses.filter(s => s !== 'Archived').map(status => (
                                <DropdownMenuCheckboxItem
                                    key={status}
                                    checked={statusFilter.includes(status)}
                                    onCheckedChange={() => {
                                        setStatusFilter(prev => prev.includes(status) ? prev.filter(p => p !== status) : [...prev, status]);
                                    }}
                                >
                                    {status}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {(subjectFilter || typeFilter.length > 0 || statusFilter.length > 0) && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSubjectFilter("");
                                setTypeFilter([]);
                                setStatusFilter([]);
                            }}
                        >
                            Reset
                            <FilterX className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border md:border-0">
                    <Table className="responsive-table">
                        <TableHeader className="hidden md:table-header-group">
                            <TableRow>
                                <TableHead><Checkbox /></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('type')}>Type <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('scheduledDates')}>Scheduled Dates <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('sentBy')}>Sent By <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedLiveAnnouncements.length > 0 ? (
                                paginatedLiveAnnouncements.map((announcement) => (
                                    <AnnouncementRow
                                        key={announcement.id}
                                        announcement={announcement}
                                        onPause={handlePause}
                                        onReactivate={handleReactivate}
                                        onCancel={handleCancel}
                                        onView={handleView}
                                    />
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={filteredLiveAnnouncements.length} />
            </CardContent>
        </Card>

        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5" />
                        <h3 className="text-lg font-medium">View Archived Announcements</h3>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <Card>
                        <CardHeader>
                            <CardTitle>Archived Announcements</CardTitle>
                            <CardDescription>A list of all past and archived announcements for your community.</CardDescription>
                             <div className="flex items-center gap-2 pt-4">
                                <Input
                                    placeholder="Filter by subject..."
                                    value={archivedSubjectFilter}
                                    onChange={(event) => setArchivedSubjectFilter(event.target.value)}
                                    className="max-w-xs"
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                        Type <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {announcementTypes.map(type => (
                                            <DropdownMenuCheckboxItem
                                                key={type}
                                                checked={archivedTypeFilter.includes(type)}
                                                onCheckedChange={() => {
                                                     setArchivedTypeFilter(prev => prev.includes(type) ? prev.filter(p => p !== type) : [...prev, type]);
                                                }}
                                            >
                                                {type}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {(archivedSubjectFilter || archivedTypeFilter.length > 0) && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setArchivedSubjectFilter("");
                                            setArchivedTypeFilter([]);
                                        }}
                                    >
                                        Reset
                                        <FilterX className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="rounded-md border md:border-0">
                                <Table className="responsive-table">
                                    <TableHeader className="hidden md:table-header-group">
                                        <TableRow>
                                            <TableHead><Checkbox /></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('type')}>Type <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('scheduledDates')}>Scheduled Dates <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('sentBy')}>Sent By <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedArchivedAnnouncements.length > 0 ? (
                                            paginatedArchivedAnnouncements.map((announcement) => (
                                                <AnnouncementRow
                                                    key={announcement.id}
                                                    announcement={announcement}
                                                    onPause={handlePause}
                                                    onReactivate={handleReactivate}
                                                    onCancel={handleCancel}
                                                    onView={handleView}
                                                />
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center">
                                                    No archived announcements found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <PaginationControls pagination={archivedPagination} setPagination={setArchivedPagination} pageCount={archivedPageCount} totalRows={filteredArchivedAnnouncements.length} />
                        </CardContent>
                    </Card>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
    
    <Dialog open={!!viewingAnnouncement} onOpenChange={(isOpen) => !isOpen && setViewingAnnouncement(null)}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Announcement Details</DialogTitle>
                <DialogDescription>
                    A detailed view of the announcement and its configuration.
                </DialogDescription>
            </DialogHeader>
            {viewingAnnouncement && (
                <div className="grid gap-4 py-4">
                    {viewingAnnouncement.image && (
                        <div className="relative w-full aspect-video rounded-md overflow-hidden">
                            <Image src={viewingAnnouncement.image} alt="Announcement Image" layout="fill" objectFit="cover" />
                        </div>
                    )}
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Subject</h4>
                        <p className="text-sm text-muted-foreground">{viewingAnnouncement.subject}</p>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Message</h4>
                        <div className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: viewingAnnouncement.message }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <h4 className="text-sm font-semibold">Type</h4>
                            <p className="text-sm text-muted-foreground">{viewingAnnouncement.type}</p>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold">Status</h4>
                            <p className="text-sm text-muted-foreground">{viewingAnnouncement.status}</p>
                        </div>
                         <div className="space-y-1">
                            <h4 className="text-sm font-semibold">Scheduled Dates</h4>
                            <p className="text-sm text-muted-foreground">{viewingAnnouncement.scheduledDates}</p>
                        </div>
                         <div className="space-y-1">
                            <h4 className="text-sm font-semibold">Sent By</h4>
                            <p className="text-sm text-muted-foreground">{viewingAnnouncement.sentBy}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-dashed mt-2">
                        <Info className="h-3 w-3" />
                        Announcement ID: {viewingAnnouncement.id}
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setViewingAnnouncement(null)}>Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
