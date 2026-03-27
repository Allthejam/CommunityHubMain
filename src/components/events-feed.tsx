
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { ArrowRight, Calendar, CircleDot, Clock, User, Loader2 } from 'lucide-react';
import { mockEvents } from '@/lib/mock-data';
import { format } from 'date-fns';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';

type CommunityEvent = {
    id: string;
    title: string;
    category: string;
    startDate: { toDate: () => Date };
    endDate?: { toDate: () => Date };
    image?: string;
    dataAiHint?: string;
    description: string;
    authorName?: string;
    businessName?: string;
};

const EventDialogContent = ({ event }: { event: CommunityEvent }) => (
    <>
        <DialogHeader className="p-6 pb-2">
            {event.image && (
                <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted mb-4">
                    <Image
                        src={event.image}
                        alt={event.title}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            )}
            <Badge variant="secondary" className="mb-2 w-fit">{event.category}</Badge>
            <DialogTitle className="text-2xl">{event.title}</DialogTitle>
        </DialogHeader>
        <div className="grid overflow-y-auto">
            <ScrollArea className="max-h-[60vh] px-6">
                <div className="space-y-4 pr-1 pb-4">
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                                {format(event.startDate.toDate(), "PPP")}
                                {event.endDate && ` - ${format(event.endDate.toDate(), "PPP")}`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Starts at 8:00 PM</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Hosted by {event.businessName || event.authorName || 'the community'}</span>
                        </div>
                    </div>
                    <Separator />
                    <div className="text-sm text-muted-foreground prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: event.description }} />
                </div>
            </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-4 border-t">
            <Button asChild>
                <Link href={`/events/${event.id}`}>
                    View Full Details <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </DialogFooter>
    </>
);


export function EventsFeed() {
  const { user } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
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
  
  const { data: liveEventsData, isLoading: eventsLoading } = useCollection<CommunityEvent>(eventsQuery);

  const now = new Date();

  const [upcomingCount, setUpcomingCount] = React.useState(3);
  
  const eventsToDisplay = (liveEventsData && liveEventsData.length > 0) 
    ? liveEventsData 
    : mockEvents.map(e => ({...e, image: e.image?.imageUrl || '', description: e.description || '', startDate: { toDate: () => new Date(e.startDate) }, endDate: e.endDate ? { toDate: () => new Date(e.endDate) } : undefined }));

  const liveEvents = eventsToDisplay.filter(event => {
      const startDate = event.startDate.toDate();
      const endDate = event.endDate?.toDate() || new Date(startDate);
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      return startDate <= now && now <= endOfDay;
  }).sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());

  const upcomingEvents = eventsToDisplay.filter(event => {
      const startDate = event.startDate.toDate();
      return startDate > now;
  }).sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());
  
  const isLoading = profileLoading || eventsLoading;

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Community Events</CardTitle>
                <CardDescription>What's happening in your community.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  if (eventsToDisplay.length === 0) {
    return null; // Don't show the card if there's no mock data and no real data.
  }

  return (
    <div className="space-y-8">
      {liveEvents.length > 0 && (
        <Card className={cn("transition-colors", "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-green-800 dark:text-green-300">
              <CircleDot className="h-7 w-7 animate-pulse" />
              Live Now
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-400">These events are happening right now in your community.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveEvents.slice(0, 3).map((event) => (
                <Dialog key={event.id}>
                    <DialogTrigger asChild>
                         <Card className="flex flex-col overflow-hidden bg-background cursor-pointer hover:shadow-lg transition-shadow duration-300">
                            <CardHeader className="p-0">
                                <div className="relative w-full h-48">
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
                                <Badge variant="secondary" className="mb-2">{event.category}</Badge>
                                <h3 className="font-semibold text-lg">{event.title}</h3>
                                {event.endDate && <p className="text-sm text-muted-foreground mt-1">
                                    Ends {format(event.endDate.toDate(), "PPP")}
                                </p>}
                            </CardContent>
                            <CardFooter className="p-4 pt-0">
                                <p className="text-sm font-medium text-primary w-full text-center">View Details</p>
                            </CardFooter>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl p-0 grid grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
                       <EventDialogContent event={event} />
                    </DialogContent>
                </Dialog>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {upcomingEvents.length > 0 && (
        <>
          {liveEvents.length > 0 && <Separator />}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                    <CardTitle className="flex items-center gap-3">
                        <Calendar className="h-7 w-7 text-primary" />
                        Upcoming Events
                    </CardTitle>
                    <CardDescription>Check out what's coming up in your community.</CardDescription>
                </div>
                <div className="w-full sm:w-auto">
                    <Select value={String(upcomingCount)} onValueChange={(value) => setUpcomingCount(Number(value))}>
                        <SelectTrigger className="w-full sm:w-[120px]">
                            <SelectValue placeholder="Show..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="3">Show 3</SelectItem>
                            <SelectItem value="6">Show 6</SelectItem>
                            <SelectItem value="9">Show 9</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {upcomingEvents.slice(0, upcomingCount).map((event) => (
                    <Dialog key={event.id}>
                        <DialogTrigger asChild>
                            <Card className="flex flex-col overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300">
                                <CardHeader className="p-0">
                                    <div className="relative w-full aspect-[4/3]">
                                        {event.image && (
                                            <Image
                                                src={event.image}
                                                alt={event.title}
                                                fill
                                                className="object-cover"
                                                data-ai-hint={event.dataAiHint || "local event"}
                                            />
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 flex-grow">
                                    <Badge variant="secondary" className="mb-2">{event.category}</Badge>
                                    <h3 className="font-semibold text-lg">{event.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{format(event.startDate.toDate(), "PPP")}</p>
                                </CardContent>
                                <CardFooter className="p-4 pt-0">
                                     <p className="text-sm font-medium text-primary w-full text-center">View Details</p>
                                </CardFooter>
                            </Card>
                         </DialogTrigger>
                         <DialogContent className="sm:max-w-xl p-0 grid grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
                            <EventDialogContent event={event} />
                         </DialogContent>
                    </Dialog>
                ))}
              </div>
            </CardContent>
            <CardFooter>
                <Button variant="outline" asChild>
                    <Link href="/events">
                        See All Events <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}
