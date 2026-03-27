
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
import { deleteEventAction, updateEventStatusAction } from "@/lib/actions/eventActions";
import { PaginationControls } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateEventForm } from "@/components/create-event-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { createCheckoutSession } from "@/lib/actions/stripeActions";

type CommunityEvent = {
  id: string;
  title: string;
  status: "Live" | "Upcoming" | "Draft" | "Archived" | "Pending Approval" | "Requires Amendment" | "Declined";
  startDate: { toDate: () => Date };
  endDate?: { toDate: () => Date };
  businessName: string;
  category: string;
};

const EventRow = React.memo(({ event, onDelete }: { event: CommunityEvent, onDelete: (id: string) => void; }) => {
    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
            onDelete(event.id);
        }
    }
    return (
        <TableRow>
            <TableCell className="font-medium">{event.title}</TableCell>
            <TableCell>{event.businessName}</TableCell>
            <TableCell>
                <Badge>{event.status}</Badge>
            </TableCell>
            <TableCell>{format(event.startDate.toDate(), "PPP")}</TableCell>
            <TableCell>{event.endDate ? format(event.endDate.toDate(), "PPP") : "N/A"}</TableCell>
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
                            <Link href={`/business/events/edit/${event.id}`}>
                                <FileEdit className="mr-2 h-4 w-4" /> Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
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
  
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const [sorting, setSorting] = React.useState<{ key: keyof CommunityEvent, order: 'asc' | 'desc' }>({ key: 'startDate', order: 'desc' });
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [businessPlan, setBusinessPlan] = React.useState<Plan | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState(false);


  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "events"), where("ownerId", "==", user.uid));
  }, [user, db]);

  const { data: events, isLoading: eventsLoading } = useCollection<CommunityEvent>(eventsQuery);

  const loading = authLoading || eventsLoading || profileLoading;

  React.useEffect(() => {
    const fetchPlans = async () => {
        const plans = await getPricingPlans();
        if (plans.business) {
            setBusinessPlan(plans.business);
        }
    };
    fetchPlans();
  }, []);
  
  const handleDeleteEvent = async (eventId: string) => {
    const result = await deleteEventAction({ eventId });
    if (result.success) {
      toast({ title: "Success", description: "Event has been deleted." });
    } else {
      toast({ title: "Error", description: result.error || "Could not delete event.", variant: "destructive" });
    }
  };
  
   const handleCreateEventClick = async () => {
    if (!user || !userProfile || !businessPlan) return;

    const freeSlots = businessPlan.events ?? 2;
    const currentEventCount = events?.length || 0;

    if (currentEventCount >= freeSlots) {
        setIsRedirecting(true);
        toast({ title: 'Free limit reached', description: 'Redirecting to payment for an additional event slot.' });

        const result = await createCheckoutSession({
            uid: user.uid,
            email: user.email!,
            name: userProfile.name,
            mode: 'payment',
            purchaseType: 'additional_event',
            successUrlPath: '/business/events?payment=success',
            metadata: {
                userId: user.uid,
                purchaseType: 'additional_event',
            }
        });

        if (result.url) {
            router.push(result.url);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
            setIsRedirecting(false);
        }
    } else {
        setIsCreateDialogOpen(true);
    }
  };

  const handleSort = (key: keyof CommunityEvent) => {
    setSorting(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedEvents = React.useMemo(() => {
    if (!events) return [];
    return [...events].sort((a, b) => {
        const key = sorting.key;
        const order = sorting.order === 'asc' ? 1 : -1;
        
        let valA = a[key as keyof CommunityEvent] as any;
        let valB = b[key as keyof CommunityEvent] as any;

        if (key === 'startDate' || key === 'endDate') {
            valA = a[key] ? a[key]!.toDate().getTime() : 0;
            valB = b[key] ? b[key]!.toDate().getTime() : 0;
            return (valA - valB) * order;
        }

        if (String(valA) < String(valB)) return -1 * order;
        if (String(valA) > String(valB)) return 1 * order;
        return 0;
    });
  }, [events, sorting]);

  const paginatedEvents = React.useMemo(() => {
      const start = pagination.pageIndex * pagination.pageSize;
      return sortedEvents.slice(start, start + pagination.pageSize);
  }, [sortedEvents, pagination]);

  const pageCount = Math.ceil(sortedEvents.length / pagination.pageSize);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          My Events
        </h1>
        <p className="text-muted-foreground">
          Create and manage your business events.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
            <div>
                <CardTitle>Your Events</CardTitle>
                <CardDescription>A list of your business's scheduled events.</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleCreateEventClick} disabled={isRedirecting}>
                        {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : paginatedEvents && paginatedEvents.length > 0 ? (
                  paginatedEvents.map((event) => (
                    <EventRow key={event.id} event={event} onDelete={handleDeleteEvent} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No events created yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
           <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={sortedEvents.length} />
        </CardContent>
      </Card>
    </div>
  );
}
