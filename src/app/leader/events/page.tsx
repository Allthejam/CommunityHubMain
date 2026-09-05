"use client";

import * as React from "react";
import Link from "next/link";
import {
    Calendar,
    MoreHorizontal,
    PlusCircle,
    Loader2,
    FileEdit,
    Trash2,
    ArrowUpDown,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Archive,
    RotateCcw,
} from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { doc } from 'firebase/firestore';

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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { deleteEventAction, updateEventStatusAction } from "@/lib/actions/eventActions";
import { PaginationControls } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateEventForm } from "@/components/create-event-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseEventDate } from "@/lib/utils/event-utils";
import { cn } from "@/lib/utils";

type CommunityEvent = {
  id: string;
  title: string;
  status: "Live" | "Upcoming" | "Draft" | "Archived" | "Pending Approval" | "Requires Amendment" | "Declined";
  startDate: { toDate: () => Date } | Date | string;
  endDate?: { toDate: () => Date } | Date | string | null;
  repeat?: string;
  businessName: string;
  category: string;
};

const EventRow = React.memo(({ event, onDelete, onUpdateStatus }: { event: CommunityEvent, onDelete: (id: string) => void; onUpdateStatus: (id: string, status: CommunityEvent['status']) => void; }) => {
    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
            onDelete(event.id);
        }
    }
    const formatRepeatLabel = (rep?: string) => {
        if (!rep || rep === 'none') return 'Single Event';
        if (rep === 'yearly') return 'Yearly Repeat';
        if (rep === 'monthly') return 'Monthly Repeat';
        if (rep === 'weekly') return 'Weekly Repeat';
        if (rep === 'bi-weekly') return 'Bi-Weekly Repeat';
        return rep;
    };

    const now = new Date();
    const startDateObj = parseEventDate(event.startDate);
    const endDateObj = parseEventDate(event.endDate) || startDateObj;
    const isPassed = event.status !== 'Archived' && (!event.repeat || event.repeat === 'none') && endDateObj && endDateObj < now;

    return (
        <TableRow className={cn(isPassed && "bg-amber-500/10 dark:bg-amber-950/30 border-l-4 border-l-amber-500 font-medium", event.status === 'Archived' && "opacity-75 bg-muted/30")}>
            <TableCell className="font-medium flex items-center gap-2">
                {isPassed && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
                {event.title}
            </TableCell>
            <TableCell>{event.businessName}</TableCell>
            <TableCell>
                {isPassed ? (
                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white gap-1">
                    <AlertTriangle className="h-3 w-3" /> Passed - Action Needed
                  </Badge>
                ) : (
                  <Badge variant={event.status === 'Archived' ? "outline" : "default"}>{event.status}</Badge>
                )}
            </TableCell>
            <TableCell>{startDateObj ? format(startDateObj, "PPP") : 'N/A'}</TableCell>
            <TableCell>{endDateObj ? format(endDateObj, "PPP") : "N/A"}</TableCell>
            <TableCell>
                <Badge variant={event.repeat && event.repeat !== 'none' ? "outline" : "secondary"} className="capitalize">
                    {formatRepeatLabel(event.repeat)}
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
                         {event.status === 'Pending Approval' && (
                            <>
                                <DropdownMenuItem onClick={() => onUpdateStatus(event.id, 'Live')}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => onUpdateStatus(event.id, 'Declined')}>
                                    <XCircle className="mr-2 h-4 w-4" /> Decline
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem asChild>
                            <Link href={`/leader/events/edit/${event.id}`}>
                                <FileEdit className="mr-2 h-4 w-4" /> {isPassed ? "Edit & Renew Date" : "Edit"}
                            </Link>
                        </DropdownMenuItem>
                        {event.status !== 'Archived' ? (
                            <DropdownMenuItem onClick={() => onUpdateStatus(event.id, 'Archived')}>
                                <Archive className="mr-2 h-4 w-4" /> Archive Event
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={() => onUpdateStatus(event.id, 'Live')}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Restore / Unarchive Event
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Event
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
});

EventRow.displayName = "EventRow";

export default function MyEventsPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [events, setEvents] = React.useState<CommunityEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = React.useState<{ key: keyof CommunityEvent; order: 'asc' | 'desc' }>({ key: 'startDate', order: 'desc' });

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  
  const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
  const demoPrefix = isDemo ? '/demo' : '';
  const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || (userProfile as any)?.impersonating?.communityId || (userProfile as any)?.communityId || 'N3SarfGXPLxBI7XcsinX');

  React.useEffect(() => {
    if (!communityId || !db) {
        setEvents([]);
        setLoading(false);
        return;
    }

    setLoading(true);
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("communityId", "==", communityId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as CommunityEvent[];
        setEvents(eventsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching events:", error);
        toast({ title: "Error", description: "Failed to load events.", variant: "destructive" });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [communityId, db, toast]);

  const handleDeleteEvent = async (eventId: string) => {
    const result = await deleteEventAction({ eventId });
    if (result.success) {
      toast({ title: "Event Deleted", description: "The event has been permanently deleted." });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (eventId: string, status: CommunityEvent['status']) => {
    const result = await updateEventStatusAction({ eventId, status });
    if (result.success) {
      toast({ title: "Event Updated", description: `Event status changed to ${status}.` });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleCreateEventClick = () => {
    if (userProfile?.role === 'president' || userProfile?.role === 'leader' || userProfile?.role === 'administrator') {
      setIsCreateDialogOpen(true);
    } else {
      toast({ title: "Permission Denied", description: "Only Leaders can create community events directly.", variant: "destructive" });
    }
  };

  const handleSort = (key: keyof CommunityEvent) => {
    setSorting(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const activeEvents = React.useMemo(() => {
    if (!events) return [];
    return events.filter(e => e.status !== 'Archived');
  }, [events]);

  const archivedEvents = React.useMemo(() => {
    if (!events) return [];
    return events.filter(e => e.status === 'Archived');
  }, [events]);

  const passedEventsCount = React.useMemo(() => {
    if (!events) return 0;
    const now = new Date();
    return events.filter(e => {
      const end = parseEventDate(e.endDate) || parseEventDate(e.startDate);
      return e.status !== 'Archived' && (!e.repeat || e.repeat === 'none') && end && end < now;
    }).length;
  }, [events]);

  const getSortedList = React.useCallback((list: CommunityEvent[]) => {
    return [...list].sort((a, b) => {
        const key = sorting.key;
        const order = sorting.order === 'asc' ? 1 : -1;
        
        let valA = a[key as keyof CommunityEvent] as any;
        let valB = b[key as keyof CommunityEvent] as any;

        if (key === 'startDate' || key === 'endDate') {
            valA = a[key] ? (parseEventDate(a[key])?.getTime() || 0) : 0;
            valB = b[key] ? (parseEventDate(b[key])?.getTime() || 0) : 0;
            return (valA - valB) * order;
        }

        if (String(valA) < String(valB)) return -1 * order;
        if (String(valA) > valB) return 1 * order;
        return 0;
    });
  }, [sorting]);

  const sortedActiveEvents = React.useMemo(() => getSortedList(activeEvents), [activeEvents, getSortedList]);
  const sortedArchivedEvents = React.useMemo(() => getSortedList(archivedEvents), [archivedEvents, getSortedList]);

  const paginatedActiveEvents = React.useMemo(() => {
      const start = pagination.pageIndex * pagination.pageSize;
      return sortedActiveEvents.slice(start, start + pagination.pageSize);
  }, [sortedActiveEvents, pagination]);

  const activePageCount = Math.ceil(sortedActiveEvents.length / pagination.pageSize);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            My Events
          </h1>
          <p className="text-muted-foreground">
            Create and manage your community & business events.
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleCreateEventClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Event
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl grid-rows-[auto,minmax(0,1fr),auto] p-0 max-h-[90vh]">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Create New Community Event</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-auto">
                  <div className="px-6 pb-6">
                    <CreateEventForm onSaveSuccess={() => setIsCreateDialogOpen(false)} />
                  </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="active" className="gap-2">
            <Calendar className="h-4 w-4" /> Active & Scheduled ({activeEvents.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" /> Archived ({archivedEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {passedEventsCount > 0 && (
            <Alert className="border-amber-400/80 bg-amber-500/10 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <AlertTitle className="font-semibold text-base">
                  Action Required: {passedEventsCount} Past Single Event{passedEventsCount > 1 ? 's' : ''}
                </AlertTitle>
                <AlertDescription className="text-sm mt-1">
                  You have single-instance event(s) whose end date has passed. Highlighted in amber in the table below, click the actions menu to <strong>Edit & Renew Date</strong>, <strong>Archive Event</strong>, or <strong>Delete Event</strong>.
                </AlertDescription>
              </div>
            </Alert>
          )}

          <Card>
            <CardHeader>
                <CardTitle>Active & Scheduled Events</CardTitle>
                <CardDescription>A list of your current and upcoming events.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('title')}>Event Title <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('businessName')}>Business <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('startDate')}>Start Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('endDate')}>End Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('repeat')}>Recurrence <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : paginatedActiveEvents && paginatedActiveEvents.length > 0 ? (
                      paginatedActiveEvents.map((event) => (
                        <EventRow key={event.id} event={event} onDelete={handleDeleteEvent} onUpdateStatus={handleUpdateStatus} />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No active events found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={activePageCount} totalRows={sortedActiveEvents.length} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived" className="space-y-6">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-muted-foreground" /> Archived Events
                </CardTitle>
                <CardDescription>Archived events are hidden from public feeds. You can restore them to active status or delete them permanently.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('title')}>Event Title <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('businessName')}>Business <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('startDate')}>Start Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('endDate')}>End Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => handleSort('repeat')}>Recurrence <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : sortedArchivedEvents && sortedArchivedEvents.length > 0 ? (
                      sortedArchivedEvents.map((event) => (
                        <EventRow key={event.id} event={event} onDelete={handleDeleteEvent} onUpdateStatus={handleUpdateStatus} />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No archived events.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
