'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar, Clock, Loader2, CircleDot, CalendarPlus, Download, Globe, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { downloadIcsFile, openGoogleCalendarUrl } from '@/lib/utils/calendar-export';
import { addEventToUserCalendar } from '@/lib/actions/calendarActions';
import { mockEvents } from '@/lib/mock-data';
import { isEventLiveNow, isEventUpcoming, getAdvancedRepeatingEvent, parseEventDate } from '@/lib/utils/event-utils';
import { updateEventAction } from '@/lib/actions/eventActions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommunityEvent = {
  id: string;
  title: string;
  category: string;
  startDate: { toDate: () => Date } | Date | string;
  endDate?: { toDate: () => Date } | Date | string | null;
  repeat?: string | null;
  repeatUntil?: { toDate: () => Date } | Date | string | null;
  pastOccurrences?: Array<any>;
  image?: string;
  dataAiHint?: string;
  description: string;
  authorName?: string;
  businessName?: string;
};

type EventsFeedProps = {
  communityId: string | null;
};

// ---------------------------------------------------------------------------
// Event dialog content (popup)
// ---------------------------------------------------------------------------

const EventDialogContent = ({ event }: { event: CommunityEvent }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const startDateObj = parseEventDate(event.startDate);
  const endDateObj = parseEventDate(event.endDate);
  const isMultiDay = startDateObj && endDateObj && format(startDateObj, 'yyyy-MM-dd') !== format(endDateObj, 'yyyy-MM-dd');

  const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
  const demoPrefix = isDemo ? '/demo' : '';

  const formatRepeatLabel = (rep?: string | null) => {
    if (!rep || rep === 'none') return null;
    if (rep === 'yearly') return 'Repeats Yearly (Annual event)';
    if (rep === 'monthly') return 'Repeats Monthly';
    if (rep === 'weekly') return 'Repeats Weekly';
    if (rep === 'bi-weekly') return 'Repeats Every 2 Weeks';
    return `Repeats ${rep}`;
  };

  const handleSaveToAppCalendar = async () => {
    if (!user) {
      toast({ title: 'Please log in', description: 'You must be logged in to save events to your calendar.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    const res = await addEventToUserCalendar({
      userId: user.uid,
      event: {
        title: event.title,
        date: startDateObj ? startDateObj.toISOString() : new Date().toISOString(),
        time: 'All Day',
        type: event.category,
        eventId: event.id,
      },
    });
    setIsSaving(false);
    if (res.success) {
      toast({ title: 'Added to App Calendar!', description: `${event.title} saved to your profile calendar.` });
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  const handleDownloadIcs = () => {
    downloadIcsFile({
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      businessName: event.businessName,
    });
    toast({ title: 'Calendar File Downloaded', description: 'Import .ics into Apple Calendar, Outlook, or mobile.' });
  };

  const handleGoogleCalendar = () => {
    openGoogleCalendarUrl({
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
    });
  };

  return (
    <>
      <DialogHeader className="p-6 pb-2">
        {event.image && (
          <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted mb-4">
            <Image src={event.image} alt={event.title} fill className="object-cover" priority />
          </div>
        )}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="secondary" className="w-fit">{event.category}</Badge>
          {event.repeat && event.repeat !== 'none' && (
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-xs">
              {formatRepeatLabel(event.repeat)}
            </Badge>
          )}
        </div>
        <DialogTitle className="text-2xl">{event.title}</DialogTitle>
      </DialogHeader>

      <div className="grid overflow-y-auto">
        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-4 pr-1 pb-4">
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">
                  {startDateObj ? format(startDateObj, 'PPP') : ''}
                  {isMultiDay && endDateObj ? ` - ${format(endDateObj, 'PPP')}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Starts at 8:00 PM</span>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-foreground mb-1">About this event</h4>
              <div
                className="text-sm text-muted-foreground prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: event.description || '' }}
              />
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground">
              <p>Hosted by {event.businessName || event.authorName || 'Community Member'}</p>
            </div>
          </div>
        </ScrollArea>
      </div>

      <DialogFooter className="p-6 pt-4 border-t flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
        {event.id ? (
          <Button variant="outline" asChild className="w-full sm:w-auto font-medium">
            <Link href={`${demoPrefix}/events/${event.id}`}>
              See More / Full Details <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full sm:w-auto" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
              Add to Calendar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Add / Sync Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSaveToAppCalendar}>
              <Calendar className="mr-2 h-4 w-4" /> Save to Profile Calendar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadIcs}>
              <Download className="mr-2 h-4 w-4" /> Download .ics File (Apple / Outlook)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleGoogleCalendar}>
              <Globe className="mr-2 h-4 w-4" /> Open in Google Calendar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </DialogFooter>

    </>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EventsFeed({ communityId }: EventsFeedProps) {
  const db = useFirestore();
  const [upcomingCount, setUpcomingCount] = React.useState(3);

  const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));

  const [demoEvents, setDemoEvents] = React.useState<CommunityEvent[]>([]);

  React.useEffect(() => {
    if (isDemo && typeof window !== 'undefined' && communityId) {
      try {
        const stored = JSON.parse(
          sessionStorage.getItem(`demo_events_${communityId}`) || 
          localStorage.getItem(`demo_events_${communityId}`) || '[]'
        );
        setDemoEvents(stored);
      } catch {
        setDemoEvents([]);
      }

      const handleUpdate = () => {
        try {
          const stored = JSON.parse(
            sessionStorage.getItem(`demo_events_${communityId}`) || 
            localStorage.getItem(`demo_events_${communityId}`) || '[]'
          );
          setDemoEvents(stored);
        } catch {}
      };
      window.addEventListener('demo_events_updated', handleUpdate);
      return () => window.removeEventListener('demo_events_updated', handleUpdate);
    }
  }, [isDemo, communityId]);

  // Only query when we have both db and communityId
  const eventsQuery = useMemoFirebase(() => {
    if (!db || !communityId) return null;
    return query(
      collection(db, 'events'),
      where('communityId', '==', communityId),
      where('status', 'in', ['Live', 'Upcoming'])
    );
  }, [db, communityId]);

  const { data: liveEventsData, isLoading: eventsLoading } = useCollection<CommunityEvent>(eventsQuery);

  const now = React.useMemo(() => new Date(), []);

  const eventsToDisplay = React.useMemo(() => {
    let rawList: CommunityEvent[] = [];
    if (liveEventsData && liveEventsData.length > 0) {
      rawList = isDemo ? [...demoEvents, ...liveEventsData.filter(d => !demoEvents.some(l => l.id === d.id))] : liveEventsData;
    } else if (demoEvents.length > 0) {
      rawList = demoEvents;
    } else {
      rawList = mockEvents.map((e) => ({
        ...e,
        image: e.image?.imageUrl || '',
        description: e.description || '',
        startDate: new Date(e.startDate),
        endDate: e.endDate ? new Date(e.endDate) : undefined,
      }));
    }

    return rawList.map((event) => {
      const { updatedEvent } = getAdvancedRepeatingEvent(event, now);
      return updatedEvent;
    });
  }, [liveEventsData, demoEvents, isDemo, now]);

  // Auto-advance repeating events in Firestore (side-effect only)
  React.useEffect(() => {
    if (!liveEventsData || liveEventsData.length === 0) return;
    liveEventsData.forEach((event) => {
      const { hasAdvanced, updatedEvent } = getAdvancedRepeatingEvent(event, now);
      if (hasAdvanced && event.id) {
        updateEventAction(event.id, {
          startDate: updatedEvent.startDate,
          endDate: updatedEvent.endDate,
          pastOccurrences: updatedEvent.pastOccurrences,
        });
      }
    });
  }, [liveEventsData, now]);

  const liveEvents = eventsToDisplay.filter((event) => isEventLiveNow(event, now));
  const upcomingEvents = eventsToDisplay.filter((event) => isEventUpcoming(event, now));

  // Only show spinner when we have a communityId and are genuinely waiting for data
  if (communityId && eventsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Events</CardTitle>
          <CardDescription>What&apos;s happening in your community.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (eventsToDisplay.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Live Now section */}
      {liveEvents.length > 0 && (
        <Card className={cn('transition-colors', 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-green-800 dark:text-green-300">
              <CircleDot className="h-7 w-7 animate-pulse" />
              Live Now
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-400">
              These events are happening right now in your community.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveEvents.slice(0, 3).map((event) => {
                const startDateObj = parseEventDate(event.startDate);
                const endDateObj = parseEventDate(event.endDate);
                const isMultiDay = startDateObj && endDateObj && format(startDateObj, 'yyyy-MM-dd') !== format(endDateObj, 'yyyy-MM-dd');

                return (
                <Dialog key={event.id}>
                  <DialogTrigger asChild>
                    <Card className="flex flex-col overflow-hidden bg-background cursor-pointer hover:shadow-lg transition-shadow duration-300">
                      <CardHeader className="p-0">
                        <div className="relative w-full h-48">
                          <Image
                            src={event.image || 'https://picsum.photos/seed/event-live/600/400'}
                            alt={event.title}
                            fill
                            className="object-cover"
                            data-ai-hint={event.dataAiHint || 'community event'}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 flex-grow">
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <Badge variant="secondary">{event.category}</Badge>
                          {event.repeat === 'yearly' && (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                              Annual Event
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        {isMultiDay && endDateObj ? (
                          <p className="text-sm text-muted-foreground mt-1">
                            Runs until {format(endDateObj, 'PPP')}
                          </p>
                        ) : (
                          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                            Happening Today
                          </p>
                        )}
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events section */}
      {upcomingEvents.length > 0 && (
        <>
          {liveEvents.length > 0 && <Separator />}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-xl flex items-center gap-2 font-headline">Upcoming Events</CardTitle>
                <CardDescription>Check out what&apos;s coming up in your community.</CardDescription>
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
                {upcomingEvents.slice(0, upcomingCount).map((event) => {
                  const startObj = parseEventDate(event.startDate);
                  const endObj = parseEventDate(event.endDate);
                  const isMultiDay = startObj && endObj && format(startObj, 'yyyy-MM-dd') !== format(endObj, 'yyyy-MM-dd');

                  return (
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
                                  data-ai-hint={event.dataAiHint || 'local event'}
                                />
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 flex-grow">
                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                              <Badge variant="secondary">{event.category}</Badge>
                              {event.repeat && event.repeat !== 'none' && (
                                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/5">
                                  {event.repeat === 'yearly' ? 'Yearly' : event.repeat}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {startObj ? format(startObj, 'PPP') : ''}
                              {isMultiDay && endObj ? ` - ${format(endObj, 'PPP')}` : ''}
                            </p>
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
                  );
                })}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild>
                <Link href={`${typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo')) ? '/demo' : ''}/events`}>
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
