'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Trash2, CalendarDays, ExternalLink, Loader2, Sparkles, Bell } from 'lucide-react';
import { format, isSameDay, parseISO, isValid } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface ProfileCalendarProps {
  userId: string;
  communityId?: string | null;
}

export function ProfileCalendar({ userId, communityId }: ProfileCalendarProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('10:00');
  const [eventCategory, setEventCategory] = useState('Reminder');
  const [eventNotes, setEventNotes] = useState('');

  // 1. Fetch User Personal Reminders from Firestore
  const personalEventsRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return collection(db, 'users', userId, 'calendarEvents');
  }, [db, userId]);
  const { data: personalEventsDocs, isLoading: loadingPersonal } = useCollection(personalEventsRef);

  // 2. Fetch Community Events for user's community
  const communityEventsRef = useMemoFirebase(() => {
    if (!db || !communityId) return null;
    return query(
      collection(db, 'events'),
      where('communityId', '==', communityId),
      where('status', '==', 'approved')
    );
  }, [db, communityId]);
  const { data: communityEventsDocs, isLoading: loadingCommunity } = useCollection(communityEventsRef);

  // Combined normalized events
  const allEvents = useMemo(() => {
    const combined: Array<{
      id: string;
      title: string;
      dateObj: Date | null;
      timeStr: string;
      category: string;
      location?: string;
      isPersonal: boolean;
      details?: string;
      link?: string;
    }> = [];

    // Process Personal Events
    if (personalEventsDocs) {
      personalEventsDocs.forEach((docSnap: any) => {
        const data = docSnap;
        let dateObj: Date | null = null;
        if (data.date) {
          dateObj = typeof data.date === 'string' ? parseISO(data.date) : (data.date.toDate ? data.date.toDate() : new Date(data.date));
        }
        combined.push({
          id: docSnap.id,
          title: data.title || 'Personal Event',
          dateObj: dateObj && isValid(dateObj) ? dateObj : null,
          timeStr: data.time || 'All Day',
          category: data.category || 'Personal',
          details: data.notes || '',
          isPersonal: true,
        });
      });
    }

    // Process Community Events
    if (communityEventsDocs) {
      communityEventsDocs.forEach((docSnap: any) => {
        const data = docSnap;
        let dateObj: Date | null = null;
        if (data.date) {
          dateObj = typeof data.date === 'string' ? parseISO(data.date) : (data.date.toDate ? data.date.toDate() : new Date(data.date));
        } else if (data.startDate) {
          dateObj = typeof data.startDate === 'string' ? parseISO(data.startDate) : (data.startDate.toDate ? data.startDate.toDate() : new Date(data.startDate));
        }
        combined.push({
          id: docSnap.id,
          title: data.title || 'Community Event',
          dateObj: dateObj && isValid(dateObj) ? dateObj : null,
          timeStr: data.time || 'Scheduled',
          category: data.category || 'Community',
          location: data.location || data.venue || 'Local Community Hub',
          details: data.description || '',
          isPersonal: false,
          link: `/events/${docSnap.id}`
        });
      });
    }

    return combined;
  }, [personalEventsDocs, communityEventsDocs]);

  // Events on the currently selected date
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return allEvents.filter(ev => ev.dateObj && isSameDay(ev.dateObj, selectedDate));
  }, [allEvents, selectedDate]);

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

  // Handle deleting a personal event
  const handleDeletePersonalEvent = async (eventId: string) => {
    if (!db || !userId || !eventId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'calendarEvents', eventId));
      toast({
        title: 'Event Removed',
        description: 'Personal reminder removed from your calendar.'
      });
    } catch (err: any) {
      console.error('Error deleting event:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete event.',
        variant: 'destructive'
      });
    }
  };

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
              View upcoming community events and manage your personal reminders.
            </CardDescription>
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
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Clean Perfectly-Aligned Calendar Grid */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 border rounded-xl bg-card shadow-xs">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="p-0 w-full"
            />
            <div className="w-full pt-3 mt-3 border-t flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Personal Entry
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-primary"></span> Community Event
              </span>
            </div>
          </div>

          {/* Right Column: Event & Agenda Stream for Selected Date */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm md:text-base">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                </h4>
              </div>
              <Badge variant="secondary" className="text-xs">
                {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'event' : 'events'}
              </Badge>
            </div>

            {loadingPersonal || loadingCommunity ? (
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
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {item.timeStr}
                        </span>
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
                      {item.isPersonal ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete Reminder"
                          onClick={() => handleDeletePersonalEvent(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : item.link ? (
                        <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                          <Link href={item.link}>
                            Details <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl bg-muted/10 space-y-3">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">No events scheduled for this day</p>
                  <p className="text-xs text-muted-foreground">Add a personal reminder or explore community happenings.</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Add Reminder
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="text-xs gap-1">
                    <Link href="/events">
                      Explore Events <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/10 border-t p-3 text-xs text-muted-foreground flex justify-between items-center">
        <span>Click any date on the calendar grid to filter your schedule.</span>
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs font-medium">
          <Link href="/events">View Community Events Feed &rarr;</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
