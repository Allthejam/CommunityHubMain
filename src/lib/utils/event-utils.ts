import { addWeeks, addMonths, addYears, startOfDay, endOfDay } from 'date-fns';

export interface EventLike {
  id?: string;
  startDate: { toDate: () => Date } | Date | string;
  endDate?: { toDate: () => Date } | Date | string | null;
  repeat?: string | null;
  repeatUntil?: { toDate: () => Date } | Date | string | null;
  pastOccurrences?: Array<{ startDate: any; endDate: any; archivedAt: any }>;
}

export function parseEventDate(d: any): Date | null {
  if (!d) return null;
  if (typeof d?.toDate === 'function') {
    try {
      return d.toDate();
    } catch {
      return null;
    }
  }
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  if (typeof d === 'string' || typeof d === 'number') {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof d === 'object') {
    if (typeof d._seconds === 'number') {
      return new Date(d._seconds * 1000 + (d._nanoseconds ? d._nanoseconds / 1e6 : 0));
    }
    if (typeof d.seconds === 'number') {
      return new Date(d.seconds * 1000 + (d.nanoseconds ? d.nanoseconds / 1e6 : 0));
    }
  }
  return null;
}

/**
 * Returns whether an event is live RIGHT NOW taking into account single duration and recurrence pattern.
 */
export function isEventLiveNow(event: EventLike, now: Date = new Date()): boolean {
  const start = parseEventDate(event.startDate);
  if (!start) return false;

  const rawEnd = parseEventDate(event.endDate) || start;
  const repeatUntil = parseEventDate(event.repeatUntil);
  const repeat = event.repeat || 'none';

  // Calculate duration of a single occurrence in milliseconds
  const durationMs = Math.max(rawEnd.getTime() - start.getTime(), 0);

  // If repeatUntil is specified and now > repeatUntil, the entire recurrence has ended
  if (repeatUntil && now > endOfDay(repeatUntil)) {
    return false;
  }

  if (repeat === 'none') {
    const startOfEvent = start;
    const endOfEvent = durationMs === 0 ? endOfDay(rawEnd) : rawEnd;
    return now >= startOfEvent && now <= endOfEvent;
  }

  if (repeat === 'yearly') {
    const occStart = new Date(start);
    occStart.setFullYear(now.getFullYear());
    
    let occEnd = new Date(occStart.getTime() + durationMs);
    if (durationMs === 0) {
      occEnd = endOfDay(occStart);
    }

    return now >= occStart && now <= occEnd;
  }

  if (repeat === 'monthly') {
    const occStart = new Date(start);
    occStart.setFullYear(now.getFullYear());
    occStart.setMonth(now.getMonth(), Math.min(start.getDate(), 28));
    
    let occEnd = new Date(occStart.getTime() + durationMs);
    if (durationMs === 0) {
      occEnd = endOfDay(occStart);
    }

    return now >= occStart && now <= occEnd;
  }

  if (repeat === 'weekly') {
    if (now.getDay() === start.getDay()) {
      const occStart = new Date(now);
      occStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
      let occEnd = new Date(occStart.getTime() + durationMs);
      if (durationMs === 0) {
        occEnd = endOfDay(occStart);
      }
      return now >= occStart && now <= occEnd;
    }
    return false;
  }

  if (repeat === 'bi-weekly') {
    const daysDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 0 && daysDiff % 14 < (durationMs > 0 ? Math.ceil(durationMs / 86400000) : 1)) {
      if (now.getDay() === start.getDay()) {
        const occStart = new Date(now);
        occStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
        let occEnd = new Date(occStart.getTime() + durationMs);
        if (durationMs === 0) {
          occEnd = endOfDay(occStart);
        }
        return now >= occStart && now <= occEnd;
      }
    }
    return false;
  }

  const startOfEvent = start;
  const endOfEvent = durationMs === 0 ? endOfDay(rawEnd) : rawEnd;
  return now >= startOfEvent && now <= endOfEvent;
}

/**
 * Returns whether an event is UPCOMING (future occurrence exists and event is not live right now).
 */
export function isEventUpcoming(event: EventLike, now: Date = new Date()): boolean {
  const start = parseEventDate(event.startDate);
  if (!start) return false;

  const repeatUntil = parseEventDate(event.repeatUntil);
  const repeat = event.repeat || 'none';

  if (repeatUntil && now > endOfDay(repeatUntil)) {
    return false;
  }

  // If live now, it's categorized under live events
  if (isEventLiveNow(event, now)) {
    return false;
  }

  if (repeat === 'none') {
    return start > now;
  }

  // For repeating events, an upcoming instance exists in the future
  return true;
}

/**
 * Returns the next occurrence date for display purposes.
 */
export function getEventNextOccurrenceStart(event: EventLike, now: Date = new Date()): Date | null {
  const start = parseEventDate(event.startDate);
  if (!start) return null;

  const repeatUntil = parseEventDate(event.repeatUntil);
  const repeat = event.repeat || 'none';

  if (repeatUntil && now > endOfDay(repeatUntil)) {
    return null;
  }

  if (repeat === 'none') {
    return start;
  }

  if (repeat === 'yearly') {
    const occStart = new Date(start);
    occStart.setFullYear(now.getFullYear());
    const durationMs = Math.max((parseEventDate(event.endDate) || start).getTime() - start.getTime(), 0);
    let occEnd = new Date(occStart.getTime() + durationMs);
    if (durationMs === 0) occEnd = endOfDay(occStart);

    if (now > occEnd) {
      occStart.setFullYear(now.getFullYear() + 1);
    }
    return occStart;
  }

  if (repeat === 'monthly') {
    const occStart = new Date(start);
    occStart.setFullYear(now.getFullYear());
    occStart.setMonth(now.getMonth(), Math.min(start.getDate(), 28));
    const durationMs = Math.max((parseEventDate(event.endDate) || start).getTime() - start.getTime(), 0);
    let occEnd = new Date(occStart.getTime() + durationMs);
    if (durationMs === 0) occEnd = endOfDay(occStart);

    if (now > occEnd) {
      occStart.setMonth(now.getMonth() + 1);
    }
    return occStart;
  }

  if (repeat === 'weekly') {
    let occStart = new Date(start);
    while (occStart <= now) {
      occStart = addWeeks(occStart, 1);
    }
    return occStart;
  }

  if (repeat === 'bi-weekly') {
    let occStart = new Date(start);
    while (occStart <= now) {
      occStart = addWeeks(occStart, 2);
    }
    return occStart;
  }

  return start;
}

/**
 * Checks if a repeating event's current occurrence has passed.
 * If passed, returns the updated event object with past occurrence appended to `pastOccurrences` audit trail,
 * and `startDate` & `endDate` advanced to the next occurrence.
 */
export function getAdvancedRepeatingEvent(event: any, now: Date = new Date()): { hasAdvanced: boolean; updatedEvent: any } {
  if (!event || !event.repeat || event.repeat === 'none') {
    return { hasAdvanced: false, updatedEvent: event };
  }

  const start = parseEventDate(event.startDate);
  if (!start) return { hasAdvanced: false, updatedEvent: event };

  const rawEnd = parseEventDate(event.endDate) || start;
  const durationMs = Math.max(rawEnd.getTime() - start.getTime(), 0);
  const endOfOccurrence = durationMs === 0 ? endOfDay(rawEnd) : rawEnd;

  const repeatUntil = parseEventDate(event.repeatUntil);
  if (repeatUntil && now > endOfDay(repeatUntil)) {
    return { hasAdvanced: false, updatedEvent: event };
  }

  if (now > endOfOccurrence) {
    let nextStart: Date = new Date(start);
    switch (event.repeat) {
      case 'weekly':
        while (nextStart <= now) {
          nextStart = addWeeks(nextStart, 1);
        }
        break;
      case 'bi-weekly':
        while (nextStart <= now) {
          nextStart = addWeeks(nextStart, 2);
        }
        break;
      case 'monthly':
        while (nextStart <= now) {
          nextStart = addMonths(nextStart, 1);
        }
        break;
      case 'yearly':
        while (nextStart <= now) {
          nextStart = addYears(nextStart, 1);
        }
        break;
      default:
        return { hasAdvanced: false, updatedEvent: event };
    }

    const nextEnd = new Date(nextStart.getTime() + durationMs);

    const pastOccurrences = Array.isArray(event.pastOccurrences) ? [...event.pastOccurrences] : [];
    pastOccurrences.push({
      startDate: start.toISOString(),
      endDate: rawEnd.toISOString(),
      archivedAt: now.toISOString(),
    });

    const updatedEvent = {
      ...event,
      startDate: nextStart,
      endDate: nextEnd,
      pastOccurrences,
    };

    return { hasAdvanced: true, updatedEvent };
  }

  return { hasAdvanced: false, updatedEvent: event };
}
