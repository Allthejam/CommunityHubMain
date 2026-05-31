

"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar as CalendarIcon, CircleDot, Loader2, Info, LayoutGrid, List, FilterX } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { collection, query, where, doc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { format, startOfDay, endOfDay } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type CommunityEvent = {
  id: string;
  title: string;
  category: string;
  startDate: { toDate: () => Date };
  endDate?: { toDate: () => Date };
  image: string;
  dataAiHint?: string;
};

const EventCard = ({ event }: { event: CommunityEvent }) => (
    <Card className="flex flex-col overflow-hidden">
        <CardHeader className="p-0">
            <div className="relative w-full aspect-square bg-muted">
                <Image
                src={event.image || "https://picsum.photos/seed/event-live/600/400"}
                alt={event.title}
                fill
                className="object-cover"
                data-ai-hint={event.dataAiHint || "community event"}
                />
            </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
            <h3 className="font-semibold text-base line-clamp-2">{event.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{format(event.startDate.toDate(), "PPP")}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0 mt-auto">
            <Button asChild size="sm" className="w-full">
                <Link href={`/events/${event.id}`}>
                View Details
                </Link>
            </Button>
        </CardFooter>
    </Card>
);

const EventRow = ({ event }: { event: CommunityEvent }) => (
     <Card className="flex items-center p-4">
        <div className="relative h-16 w-16 flex-shrink-0 mr-4 rounded-md overflow-hidden">
             <Image
                src={event.image || "https://picsum.photos/seed/event-live/600/400"}
                alt={event.title}
                fill
                className="object-cover"
                data-ai-hint={event.dataAiHint || "community event"}
            />
        </div>
        <div className="flex-1">
            <h3 className="font-semibold">{event.title}</h3>
            <p className="text-sm text-muted-foreground">{format(event.startDate.toDate(), "PPP")}</p>
        </div>
        <Button asChild variant="secondary" size="sm" className="ml-4">
            <Link href={`/events/${event.id}`}>View Details</Link>
        </Button>
    </Card>
);

export default function EventsPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const [view, setView] = React.useState('grid');
  
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [sortOption, setSortOption] = React.useState('startDate-asc');


  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, "users", user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const eventsQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) {
      return null;
    }
    return query(
      collection(db, "events"),
      where("communityId", "==", userProfile.communityId),
      where("status", "in", ["Live", "Upcoming"])
    );
  }, [db, userProfile?.communityId]);

  const { data: events, isLoading: eventsLoading } = useCollection<CommunityEvent>(eventsQuery);

  const loading = authLoading || profileLoading || eventsLoading;
  
  const filteredAndSortedEvents = React.useMemo(() => {
    let filtered = events || [];

    // Filter by date range
    if (date?.from) {
        const filterStart = startOfDay(date.from);
        const filterEnd = date.to ? endOfDay(date.to) : endOfDay(date.from);
        
        filtered = filtered.filter(event => {
            const eventStart = startOfDay(event.startDate.toDate());
            // If no end date, it's a single-day event
            const eventEnd = event.endDate ? endOfDay(event.endDate.toDate()) : endOfDay(event.startDate.toDate());
            
            // Check for overlap: event starts before filter ends AND event ends after filter starts
            return eventStart <= filterEnd && eventEnd >= filterStart;
        });
    }

    // Sort
    const [key, order] = sortOption.split('-');
    return filtered.sort((a, b) => {
        let valA: string | number, valB: string | number;
        if (key === 'startDate') {
            valA = a.startDate.toDate().getTime();
            valB = b.startDate.toDate().getTime();
        } else { // title
            valA = a.title.toLowerCase();
            valB = b.title.toLowerCase();
        }

        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
    });

  }, [events, date, sortOption]);


  const now = new Date();
  const liveEvents = filteredAndSortedEvents.filter(event => {
      const startDate = event.startDate.toDate();
      const endDate = event.endDate?.toDate() || startDate;
      endDate.setHours(23, 59, 59, 999);
      return startDate <= now && now <= endDate;
  });

  const upcomingEvents = filteredAndSortedEvents.filter(event => event.startDate.toDate() > now);
  
  const isFiltered = !!date;

  const handleReset = () => {
    setDate(undefined);
    setSortOption('startDate-asc');
  };

  if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Local Events</h1>
            <p className="text-muted-foreground">
            Stay up-to-date with the latest events happening in your area.
            </p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-center gap-2">
            <DateRangePicker date={date} onDateChange={setDate} />
            <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="startDate-asc">Date (Soonest)</SelectItem>
                    <SelectItem value="startDate-desc">Date (Furthest)</SelectItem>
                    <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                    <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setView('grid')}>
                    <LayoutGrid className="h-5 w-5" />
                    <span className="hidden sm:inline ml-2">Grid</span>
                </Button>
                <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')}>
                    <List className="h-5 w-5" />
                    <span className="hidden sm:inline ml-2">List</span>
                </Button>
            </div>
             {isFiltered && (
                <Button variant="ghost" onClick={handleReset}>
                    Reset
                    <FilterX className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
      </div>
      
      {(!events || events.length === 0) && (
           <Card className="overflow-hidden">
                <div className="grid md:grid-cols-2 items-center">
                    <div className="p-6 sm:p-8">
                        <AlertTitle className="text-2xl font-bold font-headline flex items-center gap-2 mb-2"><Info /> No Events Yet</AlertTitle>
                        <AlertDescription className="text-muted-foreground">
                            There are currently no events scheduled in your community. Check back soon for updates!
                        </AlertDescription>
                    </div>
                     <div className="h-48 md:h-full w-full relative">
                        <Image
                            src="https://images.unsplash.com/photo-1511795408833-2a1367206173?q=80&w=2070&auto=format&fit=crop"
                            alt="Placeholder image of a community event"
                            fill
                            className="object-cover"
                            data-ai-hint="community event"
                        />
                    </div>
                </div>
            </Card>
      )}

      {liveEvents.length > 0 && (
        <section className="space-y-6">
            <div className="flex items-center gap-3">
            <CircleDot className="h-7 w-7 text-destructive animate-pulse" />
            <h2 className="text-2xl font-bold tracking-tight font-headline">Live Now</h2>
            </div>
             {view === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {liveEvents.map((event) => <EventCard key={event.id} event={event} />)}
                </div>
            ) : (
                <div className="space-y-4">
                    {liveEvents.map((event) => <EventRow key={event.id} event={event} />)}
                </div>
            )}
        </section>
      )}

      {liveEvents.length > 0 && upcomingEvents.length > 0 && <Separator />}

      {upcomingEvents.length > 0 && (
        <section className="space-y-6">
            <div className="flex items-center gap-3">
            <CalendarIcon className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight font-headline">Upcoming Community Events</h2>
            </div>
            {view === 'grid' ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {upcomingEvents.map((event) => <EventCard key={event.id} event={event} />)}
                </div>
            ) : (
                <div className="space-y-4">
                    {upcomingEvents.map((event) => <EventRow key={event.id} event={event} />)}
                </div>
            )}
        </section>
      )}

       {isFiltered && liveEvents.length === 0 && upcomingEvents.length === 0 && (
           <Card className="col-span-full h-48 flex items-center justify-center">
                <p className="text-muted-foreground">No events found for the selected date range.</p>
            </Card>
      )}
    </div>
  );
}
