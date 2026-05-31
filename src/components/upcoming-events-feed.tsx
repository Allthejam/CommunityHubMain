
'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { ArrowRight, Calendar, Clock, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from './ui/separator';
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
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
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


export function UpcomingEventsFeed() {
  const { user } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const eventsQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) return null;
    return query(
        collection(db, "events"), 
        where("communityId", "==", userProfile.communityId),
        where("status", "in", ["Upcoming", "Live"])
    );
  }, [db, userProfile?.communityId]);
  
  const { data: events, isLoading: eventsLoading } = useCollection<CommunityEvent>(eventsQuery);

  const upcomingEvents = React.useMemo(() => {
    if (!events) return [];
    const now = new Date();
    return events
        .filter(event => event.startDate.toDate() > now)
        .sort((a,b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());
  }, [events]);

  const loading = profileLoading || eventsLoading;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent className="h-24 flex justify-center items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {upcomingEvents.slice(0, 5).map((event) => (
            <li key={event.id}>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors">
                    <p className="font-semibold text-sm truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{format(event.startDate.toDate(), "PPP")}</p>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl p-0 grid grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
                  <EventDialogContent event={event} />
                </DialogContent>
              </Dialog>
            </li>
          ))}
        </ul>
      </CardContent>
       <CardFooter>
        <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/events">
                View all events
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
