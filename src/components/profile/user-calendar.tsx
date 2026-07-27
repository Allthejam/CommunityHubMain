'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Plus, Trash2, MapPin, Clock, Tag, Filter, Loader2, Sparkles, CheckCircle2, Palmtree, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameDay, isValid, startOfMonth, getDaysInMonth, getDay, addMonths, subMonths, isToday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addCalendarEventAction, deleteCalendarEventAction, CalendarEventType } from '@/lib/actions/calendarActions';

export type UserCalendarProps = {
  userId: string;
  isOwner?: boolean;
};

type CalendarEventDoc = {
  id: string;
  title: string;
  description?: string;
  startDate: any;
  endDate?: any;
  type: CalendarEventType;
  communityId?: string;
  communityName?: string;
  location?: string;
};

const CATEGORY_CONFIG: Record<CalendarEventType, { label: string; badgeBg: string; dotBg: string; textClass: string; icon: any }> = {
  community_event: {
    label: 'Community Event',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    dotBg: 'bg-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
    icon: Sparkles,
  },
  personal_appointment: {
    label: 'Personal Appointment',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    dotBg: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  holiday: {
    label: 'Holiday & Vacation',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    dotBg: 'bg-purple-500',
    textClass: 'text-purple-600 dark:text-purple-400',
    icon: Palmtree,
  },
  reminder: {
    label: 'Reminder & Note',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    dotBg: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    icon: Tag,
  },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function UserCalendar({ userId, isOwner = false }: UserCalendarProps) {
  const db = useFirestore();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventTime, setEventTime] = useState('10:00');
  const [eventType, setEventType] = useState<CalendarEventType>('personal_appointment');
  const [location, setLocation] = useState('');

  // Real-time listener for user calendar events
  const eventsQuery = useMemoFirebase(() => {
    if (!userId || !db) return null;
    return query(collection(db, `users/${userId}/calendar_events`), orderBy('startDate', 'asc'));
  }, [userId, db]);

  const { data: rawEvents, isLoading } = useCollection<CalendarEventDoc>(eventsQuery);

  const events = useMemo(() => {
    if (!rawEvents) return [];
    return rawEvents.map(evt => {
      const dateObj = evt.startDate?.toDate ? evt.startDate.toDate() : new Date(evt.startDate);
      return {
        ...evt,
        parsedDate: isValid(dateObj) ? dateObj : new Date(),
      };
    });
  }, [rawEvents]);

  // Filter events by selected category
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events;
    return events.filter(e => e.type === filterType);
  }, [events, filterType]);

  // Events on currently highlighted date
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(e => isSameDay(e.parsedDate, selectedDate));
  }, [filteredEvents, selectedDate]);

  // Month navigation
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
  };

  // Calculate 7-column calendar grid properties
  const daysInMonthCount = getDaysInMonth(currentMonth);
  const monthStartDayOfWeek = getDay(startOfMonth(currentMonth)); // 0 = Sun, 1 = Mon ...

  const calendarCells = useMemo(() => {
    const cells = [];
    // Empty leading padding cells for previous month
    for (let i = 0; i < monthStartDayOfWeek; i++) {
      cells.push(null);
    }
    // Days of current month
    for (let day = 1; day <= daysInMonthCount; day++) {
      const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      cells.push({ day, date: cellDate });
    }
    return cells;
  }, [currentMonth, daysInMonthCount, monthStartDayOfWeek]);

  // Handle Add Event submit
  const handleAddEvent = async () => {
    if (!title.trim()) {
      toast({ title: 'Title Required', description: 'Please enter a title for your event.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedDateTimeStr = `${eventDate}T${eventTime || '00:00'}:00`;
      const result = await addCalendarEventAction({
        userId,
        title: title.trim(),
        description: description.trim(),
        startDate: new Date(combinedDateTimeStr).toISOString(),
        type: eventType,
        location: location.trim(),
      });

      if (result.success) {
        toast({ title: '🎉 Event Added', description: 'Your schedule has been updated.' });
        setIsDialogOpen(false);
        setTitle('');
        setDescription('');
        setLocation('');
      } else {
        toast({ title: 'Failed to Add Event', description: result.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Event
  const handleDeleteEvent = async (eventId: string) => {
    setDeletingId(eventId);
    try {
      const result = await deleteCalendarEventAction({ userId, eventId });
      if (result.success) {
        toast({ title: 'Event Removed' });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="w-full shadow-sm border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              My Interactive Calendar
            </CardTitle>
            <CardDescription className="mt-1">
              Your personal schedule of community events, holidays & appointments.
            </CardDescription>
          </div>

          {isOwner && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />
                  Add Event / Holiday
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Add Calendar Entry
                  </DialogTitle>
                  <DialogDescription>
                    Add a personal appointment, holiday, or reminder to your schedule.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-title">Event Title *</Label>
                    <Input
                      id="event-title"
                      placeholder="e.g. Doctor Appointment, Summer Vacation"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="event-type">Category *</Label>
                    <Select value={eventType} onValueChange={(val: CalendarEventType) => setEventType(val)}>
                      <SelectTrigger id="event-type">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal_appointment">🟢 Personal Appointment</SelectItem>
                        <SelectItem value="holiday">🟣 Holiday & Vacation</SelectItem>
                        <SelectItem value="reminder">🟡 Reminder & Note</SelectItem>
                        <SelectItem value="community_event">🔵 Community Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="event-date">Date *</Label>
                      <Input
                        id="event-date"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="event-time">Time</Label>
                      <Input
                        id="event-time"
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="event-location">Location (optional)</Label>
                    <Input
                      id="event-location"
                      placeholder="e.g. Local Clinic, Inverness"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="event-description">Notes (optional)</Label>
                    <Textarea
                      id="event-description"
                      placeholder="Additional details or notes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <DialogClose asChild>
                    <Button variant="outline" type="button" disabled={isSubmitting}>Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddEvent} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Event
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Category Legend & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t mt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Legend:
            </span>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <Badge
                key={key}
                variant="outline"
                className={cn('cursor-pointer transition-all gap-1.5 py-1 px-2.5', config.badgeBg, filterType === key && 'ring-2 ring-primary')}
                onClick={() => setFilterType(filterType === key ? 'all' : key)}
              >
                <span className={cn('h-2 w-2 rounded-full', config.dotBg)} />
                {config.label}
              </Badge>
            ))}
          </div>

          {filterType !== 'all' && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setFilterType('all')}>
              Clear Filter
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Left Column: 100% Mathematically Aligned 7-Column Square Monthly Grid */}
          <div className="flex flex-col p-5 rounded-xl border bg-card shadow-xs min-h-[380px] w-full justify-between space-y-4">
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-bold text-base min-w-[140px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold" onClick={goToToday}>
                Today
              </Button>
            </div>

            {/* Weekday Labels (7 Equal Columns) */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-muted-foreground border-b pb-2">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Date Grid (7 Equal Columns) */}
            <div className="grid grid-cols-7 gap-1 text-center flex-1 items-center">
              {calendarCells.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-10 w-full" />;
                }

                const isSelected = isSameDay(cell.date, selectedDate);
                const isCurrentToday = isToday(cell.date);
                
                // Find events on this day
                const dayEvents = filteredEvents.filter(e => isSameDay(e.parsedDate, cell.date));

                return (
                  <button
                    key={cell.day}
                    type="button"
                    onClick={() => setSelectedDate(cell.date)}
                    className={cn(
                      'relative h-10 w-full rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all hover:bg-accent focus:outline-none',
                      isSelected && 'bg-primary text-primary-foreground font-bold hover:bg-primary hover:text-primary-foreground shadow-xs',
                      isCurrentToday && !isSelected && 'border-2 border-primary text-primary font-bold',
                      !isSelected && !isCurrentToday && 'hover:bg-muted/80'
                    )}
                  >
                    <span>{cell.day}</span>
                    
                    {/* Category Event Indicator Dots */}
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 flex items-center justify-center gap-0.5">
                        {dayEvents.slice(0, 3).map((evt, i) => {
                          const dotClass = CATEGORY_CONFIG[evt.type]?.dotBg || 'bg-primary';
                          return (
                            <span
                              key={i}
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                isSelected ? 'bg-primary-foreground' : dotClass
                              )}
                            />
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Square Proportioned Agenda / Schedule Box */}
          <div className="flex flex-col p-5 rounded-xl border bg-card shadow-xs min-h-[380px] w-full justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b mb-3">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  {selectedDate ? format(selectedDate, 'EEEE, dd MMM yyyy') : 'Selected Date'}
                </h3>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {selectedDateEvents.length} Event{selectedDateEvents.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : selectedDateEvents.length > 0 ? (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {selectedDateEvents.map((evt) => {
                    const config = CATEGORY_CONFIG[evt.type] || CATEGORY_CONFIG.personal_appointment;
                    const Icon = config.icon;

                    return (
                      <div
                        key={evt.id}
                        className={cn(
                          'flex flex-col gap-2 p-3.5 rounded-xl border transition-all hover:shadow-xs',
                          config.badgeBg
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Icon className={cn('h-4 w-4 shrink-0', config.textClass)} />
                            <h4 className="font-semibold text-sm leading-tight text-foreground">{evt.title}</h4>
                          </div>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => handleDeleteEvent(evt.id)}
                              disabled={deletingId === evt.id}
                            >
                              {deletingId === evt.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>

                        {evt.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{evt.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {format(evt.parsedDate, 'HH:mm')}
                          </span>
                          {evt.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {evt.location}
                            </span>
                          )}
                          {evt.communityName && (
                            <span className="flex items-center gap-1 font-medium text-primary">
                              <Sparkles className="h-3.5 w-3.5" />
                              {evt.communityName} Hub
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center gap-2 border border-dashed rounded-xl p-6 text-muted-foreground bg-muted/10">
                  <CalendarIcon className="h-10 w-10 opacity-20" />
                  <p className="text-sm font-medium">No events scheduled for this date.</p>
                  {isOwner && (
                    <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => {
                      setEventDate(format(selectedDate, 'yyyy-MM-dd'));
                      setIsDialogOpen(true);
                    }}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Event or Holiday
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
