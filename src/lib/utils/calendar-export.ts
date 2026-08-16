import { parseEventDate } from './event-utils';

export function downloadIcsFile(event: { title: string; description?: string; startDate: any; endDate?: any; businessName?: string }) {
  const start = parseEventDate(event.startDate) || new Date();
  const end = parseEventDate(event.endDate) || new Date(start.getTime() + 3600000);

  const formatDateToIcs = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const plainDescription = (event.description || '').replace(/<[^>]*>?/gm, '').replace(/\n/g, ' ');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Community Hub App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${plainDescription}`,
    `DTSTART:${formatDateToIcs(start)}`,
    `DTEND:${formatDateToIcs(end)}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function openGoogleCalendarUrl(event: { title: string; description?: string; startDate: any; endDate?: any }) {
  const start = parseEventDate(event.startDate) || new Date();
  const end = parseEventDate(event.endDate) || new Date(start.getTime() + 3600000);

  const formatDateToGoogle = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent((event.description || '').replace(/<[^>]*>?/gm, ''));
  const dates = `${formatDateToGoogle(start)}/${formatDateToGoogle(end)}`;

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
  window.open(url, '_blank');
}
