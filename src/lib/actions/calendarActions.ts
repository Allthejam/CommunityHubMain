'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type CalendarEvent = {
  title: string;
  date: string;
  time: string;
  type: string;
  eventId?: string;
};

export async function addEventToUserCalendar(params: {
  userId: string;
  event: CalendarEvent;
}): Promise<ActionResponse> {
  const { userId, event } = params;

  if (!userId || !event) {
    return { success: false, error: "User and event information is required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    await firestore.collection('user_calendars').add({
      userId,
      title: event.title,
      date: event.date,
      time: event.time,
      type: event.type,
      eventId: event.eventId || null,
      addedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding event to user calendar:", error);
    return { success: false, error: error.message || "Failed to add event to calendar." };
  }
}

export async function deleteUserCalendarEvent(params: {
  userId: string;
  docId: string;
  sourceCollection?: 'user_calendars' | 'calendarEvents';
}): Promise<ActionResponse> {
  const { userId, docId, sourceCollection = 'user_calendars' } = params;

  if (!userId || !docId) {
    return { success: false, error: "User and document ID are required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    if (sourceCollection === 'calendarEvents') {
      await firestore.collection('users').doc(userId).collection('calendarEvents').doc(docId).delete();
    } else {
      await firestore.collection('user_calendars').doc(docId).delete();
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting calendar event:", error);
    return { success: false, error: error.message || "Failed to delete event." };
  }
}
