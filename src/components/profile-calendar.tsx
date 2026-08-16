'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Trash2, CalendarDays, ExternalLink, Loader2, Sparkles, Bell, ArrowRight, BookmarkCheck } from 'lucide-react';
import { format, isSameDay, startOfDay, endOfDay, isValid } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { parseEventDate } from '@/lib/utils/event-utils';
import { deleteUserCalendarEvent } from '@/lib/actions/calendarActions';

interface ProfileCalendarProps {
  userId: string;
  communityId?: string | null;
}

interface NormalizedEvent {
  id: string;
  title: string;
  dateObj: Date | null;
  endDateObj?: Date | null;
  repeat?: string | null;
  repeatUntilObj?: Date | null;
  timeStr: string;
  category: string;
  location?: string;
  isPersonal: boolean;
  details?: string;
  link?: string;
  eventId?: string;
  sourceCollection: 'calendarEvents' | 'user_calendars' | 'events';
}

/**
 * Checks whether an event occurs on a specific target date (taking single dates,
 * multi-day spans, and recurrence rules into account).
 */
function isEventOnDate(event: NormalizedEvent, targetDate: Date): boolean {
  if (!event.dateObj || !isValid(event.dateObj) || !isValid(targetDate)) return false;

  const targetDay = startOfDay(targetDate);
  const startDay = startOfDay(event.dateObj);
  const endDay = event.endDateObj && isValid(event.endDateObj) ? startOfDay(event.endDateObj) : startDay;
  const repeatUntilDay = event.repeatUntilObj && isValid(event.repeatUntilObj) ? endOfDay(event.repeatUntilObj) : null;
  const repeat = event.repeat || 'none';

  // If repeatUntil is set and target is after that, recurrence has ended
  if (repeatUntilDay && targetDay > repeatUntilDay) {
    return false;
  }

  // Non-repeating event: check if target is between start and end
  if (repeat === 'none') {
    return targetDay.getTime() >= startDay.getTime() && targetDay.getTime() <= endDay.getTime();
  }

  // If target date is before the event even starts, it cannot match
  if (targetDay.getTime() < startDay.getTime()) {
    return false;
  }

  const durationDays = Math.max(0, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)));

  if (repeat === 'yearly') {
    const occStart = new Date(targetDay.getFullYear(), startDay.getMonth(), startDay.getDate());
    const occEnd = new Date(occStart.getTime() + durationDays * 86400000);
    return targetDay.getTime() >= occStart.getTime() && targetDay.getTime() <= occEnd.getTime();
  }

  if (repeat === 'monthly') {
    const occStart = new Date(targetDay.getFullYear(), targetDay.getMonth(), Math.min(startDay.getDate(), 28));
    const occEnd = new Date(occStart.getTime() + durationDays * 86400000);
    return targetDay.getTime() >= occStart.getTime() && targetDay.getTime() <= occEnd.getTime();
  }

  if (repeat === 'weekly') {
    const dayDiff = (targetDay.getDay() - startDay.getDay() + 7) % 7;
    return dayDiff <= durationDays;
  }

  if (repeat === 'bi-weekly') {
    const daysFromStart = Math.round((targetDay.getTime() - startDay.getTime()) / 86400000);
    if (daysFromStart >= 0 && (daysFromStart % 14) <= durationDays) {
      return true;
    }
    return false;
  }

  return targetDay.getTime() >= startDay.getTime() && targetDay.getTime() <= endDay.getTime();
}

export function ProfileCalendar({ userId, communityId }: ProfileCalendarProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'day' | 'all'>('day');
  const [showCommunityFeedEvents, setShowCommunityFeedEvents] = useState(false);

  // Form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('10:00');
  const [eventCategory, setEventCategory] = useState('Reminder');
  const [eventNotes, setEventNotes] = useState('');

  // 1. Fetch User Personal Reminders from subcollection
  const personalEventsRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return collection(db, 'users', userId, 'calendarEvents');
  }, [db, userId]);
  const { data: personalEventsDocs, isLoading: loadingPersonal } = useCollection(personalEventsRef);

  // 2. Fetch User Saved Events from user_calendars collection
  const userCalendarsRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return query(
      collection(db, 'user_calendars'),
      where('userId', '==', userId)
    );
  }, [db, userId]);
  const { data: userCalendarsDocs, isLoading: loadingUserCalendars } = useCollection(userCalendarsRef);

  // 3. Optional: Fetch Community Events for user's community
  const communityEventsRef = useMemoFirebase(() => {
    if (!db || !showCommunityFeedEvents) return null;
    if (communityId) {
      return query(
        collection(db, 'events'),
        where('communityId', '==', communityId),
        where('status', 'in', ['Live', 'Upcoming', 'approved'])
      );
    }
    return query(
      collection(db, 'events'),
      where('status', 'in', ['Live', 'Upcoming', 'approved'])
    );
  }, [db, communityId, showCommunityFeedEvents]);
  const { data: communityEventsDocs, isLoading: loadingCommunity } = useCollection(communityEventsRef);

  // Combined normalized events with strict deduplication
  const allEvents = useMemo(() => {
    const combined: Array<NormalizedEvent> = [];
    const savedEventIds = new Set<string>();

    // A. Process Personal Reminders (users/{userId}/calendarEvents)
    if (personalEventsDocs) {
      personalEventsDocs.forEach((docSnap: any) => {
        const data = docSnap;
        const dateObj = parseEventDate(data.date);
        const endDateObj = parseEventDate(data.endDate);
        const repeatUntilObj = parseEventDate(data.repeatUntil);

        combined.push({
          id: docSnap.id,
          title: data.title || 'Personal Reminder',
          dateObj,
          endDateObj,
          repeat: data.repeat || 'none',
          repeatUntilObj,
          timeStr: data.time || 'All Day',
          category: data.category || 'Reminder',
          details: data.notes || '',
          isPersonal: true,
          sourceCollection: 'calendarEvents',
        });
      });
    }

    // B. Process Saved Calendar Items (user_calendars)
    if (userCalendarsDocs) {
      userCalendarsDocs.forEach((docSnap: any) => {
        const data = docSnap;
        const dateObj = parseEventDate(data.date);
        const endDateObj = parseEventDate(data.endDate);

        if (data.eventId) {
          savedEventIds.add(data.eventId);
        }

        combined.push({
          id: docSnap.id,
          title: data.title || 'Saved Event',
          dateObj,
          endDateObj,
          timeStr: data.time || 'All Day',
          category: data.type || data.category || 'Saved Event',
          details: data.details || data.description || '',
          isPersonal: true, // It is in the user's personal calendar
          eventId: data.eventId,
          link: data.eventId ? `/events/${data.eventId}` : undefined,
          sourceCollection: 'user_calendars',
        });
      });
    }

    // C. Process Community Events ONLY if the user explicitly enabled community feed overlay
    if (showCommunityFeedEvents && communityEventsDocs) {
      communityEventsDocs.forEach((docSnap: any) => {
        // Skip if this event is already saved by the user in user_calendars
        if (savedEventIds.has(docSnap.id)) {
          return;
        }

        const data = docSnap;
        const dateObj = parseEventDate(data.startDate || data.date);
        const endDateObj = parseEventDate(data.endDate);
        const repeatUntilObj = parseEventDate(data.repeatUntil);

        combined.push({
          id: docSnap.id,
          title: data.title || 'Community Event',
          dateObj,
          endDateObj,
          repeat: data.repeat || 'none',
          repeatUntilObj,
          timeStr: data.time || 'Scheduled',
          category: data.category || 'Community',
          location: data.location || data.venue || 'Local Community Hub',
          details: data.description || '',
          isPersonal: false,
          link: `/events/${docSnap.id}`,
          sourceCollection: 'events',
        });
      });
    }

    // Sort chronologically by start date
    return combined.sort((a, b) => {
      const timeA = a.dateObj ? a.dateObj.getTime() : 0;
      const timeB = b.dateObj ? b.dateObj.getTime() : 0;
      return timeA - timeB;
    });
  }, [personalEventsDocs, userCalendarsDocs, communityEventsDocs, showCommunityFeedEvents]);

  // Events on the currently selected date
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return allEvents.filter(ev => isEventOnDate(ev, selectedDate));
  }, [allEvents, selectedDate]);

  // All upcoming / future events list
  const upcomingEventsList = useMemo(() => {
    const today = startOfDay(new Date());
    return allEvents.filter(ev => {
      if (!ev.dateObj) return false;
      const evDate = startOfDay(ev.dateObj);
      return evDate.getTime() >= today.getTime() || ev.repeat !== 'none';
    });
  }, [allEvents]);

  // Handle adding a new personal event
  const handleAddPersonalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !userId || !selectedDate || !eventTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      await addDoc(collection(db, 'users', userId, 'calendarEvents'), {
        title: eventTitle.trim(),
        date: dateString,
        time: eventTime,
        category: eventCategory,
        notes: eventNotes.trim(),
        createdAt: serverTimestamp()
      });

      toast({
        title: 'Event Added',
        description: `"${eventTitle}" has been added to your calendar.`
      });

      setEventTitle('');
      setEventNotes('');
      setIsAddDialogOpen(false);
    } catch (err: any) {
      console.error('Error adding calendar event:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to save calendar event.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a personal or saved event
  const handleDeleteEvent = async (item: NormalizedEvent) => {
    if (!userId || !item.id) return;
    try {
      const res = await deleteUserCalendarEvent({
        userId,
        docId: item.id,
        sourceCollection: item.sourceCollection === 'calendarEvents' ? 'calendarEvents' : 'user_calendars',
      });

      if (res.success) {
        toast({
          title: 'Event Removed',
          description: `"${item.title}" removed from your personal schedule.`
        });
      } else {
        toast({
          title: 'Error',
          description: res.error || 'Failed to delete event.',
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      console.error('Error deleting event:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete event.',
        variant: 'destructive'
      });
    }
  };

  const isLoading = loadingPersonal || loadingUserCalendars || (showCommunityFeedEvents && loadingCommunity);

  return (
    <Card className="shadow-sm border border-border/80">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <CalendarDays className="h-5 w-5 text-primary" />
              My Personal Calendar & Schedule
            </CardTitle>
            <CardDescription>
              Manage your personal schedule, reminders, and saved community events.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg px-2.5 py-1.5 bg-background">
              <Switch
                id="show-community-toggle"
                checked={showCommunityFeedEvents}
                onCheckedChange={setShowCommunityFeedEvents}
              />
              <Label htmlFor="show-community-toggle" className="text-xs cursor-pointer">
                Show Community Hub Feed
              </Label>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 shadow-sm font-semibold">
                  <Plus className="h-4 w-4" /> Add Reminder / Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleAddPersonalEvent}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" /> Add Calendar Entry
                    </DialogTitle>
                    <DialogDescription>
                      Create a personal reminder or schedule item for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'selected date'}.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="event-title">Title / Activity *</Label>
                      <Input
                        id="event-title"
                        placeholder="e.g. Community Meeting, Market Visit..."
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="event-time">Time</Label>
                        <Input
                          id="event-time"
                          type="time"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-category">Category</Label>
                        <Select value={eventCategory} onValueChange={setEventCategory}>
                          <SelectTrigger id="event-category">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Reminder">Reminder</SelectItem>
                            <SelectItem value="Personal">Personal</SelectItem>
                            <SelectItem value="Meeting">Meeting</SelectItem>
                            <SelectItem value="Volunteer">Volunteer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="event-notes">Notes / Details (Optional)</Label>
                      <Textarea
                        id="event-notes"
                        placeholder="Add any extra notes or reminders..."
                        rows={3}
                        value={eventNotes}
                        onChange={(e) => setEventNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !eventTitle.trim()}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save to Calendar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Clean Calendar Grid with Date Event Highlighting */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 border rounded-xl bg-card shadow-xs">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setActiveTab('day');
                }
              }}
              modifiers={{
                hasPersonal: (date) => allEvents.some(ev => ev.isPersonal && isEventOnDate(ev, date)),
                hasCommunity: (date) => allEvents.some(ev => !ev.isPersonal && isEventOnDate(ev, date)),
              }}
              modifiersClassNames={{
                hasPersonal: "font-bold text-emerald-600 dark:text-emerald-400 underline decoration-emerald-500 decoration-2 underline-offset-4",
                hasCommunity: "font-bold text-primary underline decoration-primary decoration-2 underline-offset-4",
              }}
              className="p-0 w-full"
            />
            <div className="w-full pt-3 mt-3 border-t flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> My Saved Items & Reminders
              </span>
              {showCommunityFeedEvents && (
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-primary"></span> Community Events
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Schedule & Agenda Stream */}
          <div className="lg:col-span-7 space-y-4">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'day' | 'all')} className="w-full">
              <div className="flex items-center justify-between border-b pb-2">
                <TabsList className="grid grid-cols-2 w-[280px]">
                  <TabsTrigger value="day" className="text-xs">
                    {selectedDate ? format(selectedDate, 'MMM d') : 'Day'} View ({selectedDayEvents.length})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">
                    All Scheduled ({upcomingEventsList.length})
                  </TabsTrigger>
                </TabsList>

                <Badge variant="secondary" className="text-xs">
                  {activeTab === 'day' ? `${selectedDayEvents.length} on date` : `${upcomingEventsList.length} total`}
                </Badge>
              </div>

              {/* Tab 1: Events on Selected Day */}
              <TabsContent value="day" className="space-y-3 mt-3">
                <div className="flex items-center gap-2 pb-1 text-sm font-semibold text-muted-foreground">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span>{selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}</span>
                </div>

                {isLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedDayEvents.length > 0 ? (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {selectedDayEvents.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 md:p-4 rounded-lg border bg-background hover:bg-muted/40 transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={item.isPersonal ? "outline" : "default"}
                              className={item.isPersonal ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px]" : "text-[10px]"}
                            >
                              {item.category}
                            </Badge>
                            {item.sourceCollection === 'user_calendars' && (
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                <BookmarkCheck className="h-3 w-3 text-emerald-500" /> Saved
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {item.timeStr}
                            </span>
                            {item.repeat && item.repeat !== 'none' && (
                              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                Repeats {item.repeat}
                              </Badge>
                            )}
                          </div>
                          <h5 className="font-semibold text-sm">{item.title}</h5>
                          {item.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {item.location}
                            </p>
                          )}
                          {item.details && (
                            <p className="text-xs text-muted-foreground line-clamp-2 pt-1">{item.details}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-1">
                          {item.link && (
                            <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                              <Link href={item.link}>
                                Details <ExternalLink className="h-3 w-3" />
                              </Link>
                            </Button>
                          )}
                          {item.isPersonal && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Delete / Remove from Calendar"
                              onClick={() => handleDeleteEvent(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl bg-muted/10 space-y-3">
                    <Bell className="h-8 w-8 text-muted-foreground/50" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">No events scheduled for this day</p>
                      <p className="text-xs text-muted-foreground">Add a personal reminder or explore all upcoming scheduled dates.</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Add Reminder
                      </Button>
                      {upcomingEventsList.length > 0 && (
                        <Button size="sm" variant="secondary" className="text-xs gap-1" onClick={() => setActiveTab('all')}>
                          View All Upcoming ({upcomingEventsList.length})
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: All Scheduled Events (Chronological List across All Dates & Next Year) */}
              <TabsContent value="all" className="space-y-3 mt-3">
                {isLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : upcomingEventsList.length > 0 ? (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {upcomingEventsList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 md:p-4 rounded-lg border bg-background hover:bg-muted/40 transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={item.isPersonal ? "outline" : "default"}
                              className={item.isPersonal ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px]" : "text-[10px]"}
                            >
                              {item.category}
                            </Badge>
                            {item.sourceCollection === 'user_calendars' && (
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                <BookmarkCheck className="h-3 w-3 text-emerald-500" /> Saved
                              </Badge>
                            )}
                            <span className="text-xs font-medium text-foreground flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3 text-primary" />
                              {item.dateObj ? format(item.dateObj, 'EEE, MMM d, yyyy') : 'Scheduled'}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {item.timeStr}
                            </span>
                            {item.repeat && item.repeat !== 'none' && (
                              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                Repeats {item.repeat}
                              </Badge>
                            )}
                          </div>
                          <h5 className="font-semibold text-sm">{item.title}</h5>
                          {item.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {item.location}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-1">
                          {item.dateObj && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => {
                                if (item.dateObj) {
                                  setSelectedDate(item.dateObj);
                                  setActiveTab('day');
                                }
                              }}
                            >
                              Jump to Date <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                          {item.link && (
                            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                              <Link href={item.link}>
                                Details <ExternalLink className="h-3 w-3" />
                              </Link>
                            </Button>
                          )}
                          {item.isPersonal && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Delete / Remove from Calendar"
                              onClick={() => handleDeleteEvent(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl bg-muted/10 space-y-3">
                    <Bell className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No upcoming events or reminders found</p>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="h-3.5 w-3.5" /> Add Reminder
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/10 border-t p-3 text-xs text-muted-foreground flex justify-between items-center">
        <span>Click any date on the calendar grid or use &quot;All Scheduled&quot; to view future dates.</span>
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs font-medium">
          <Link href="/events">View Community Events Feed &rarr;</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
