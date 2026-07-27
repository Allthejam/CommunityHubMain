'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from 'next/cache';

export type CalendarEventType = 'community_event' | 'personal_appointment' | 'holiday' | 'reminder';

export type AddCalendarEventParams = {
  userId: string;
  title: string;
  description?: string;
  startDate: string; // ISO string
  endDate?: string;  // ISO string
  type: CalendarEventType;
  communityId?: string;
  communityName?: string;
  location?: string;
};

type ActionResponse = {
  success: boolean;
  error?: string;
  id?: string;
};

export async function addCalendarEventAction(params: AddCalendarEventParams): Promise<ActionResponse> {
  const { userId, title, description, startDate, endDate, type, communityId, communityName, location } = params;

  if (!userId || !title || !startDate) {
    return { success: false, error: 'User ID, title, and start date are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const calendarRef = firestore.collection(`users/${userId}/calendar_events`).doc();

    await calendarRef.set({
      userId,
      title: title.trim(),
      description: description?.trim() || '',
      startDate: Timestamp.fromDate(new Date(startDate)),
      endDate: endDate ? Timestamp.fromDate(new Date(endDate)) : null,
      type: type || 'personal_appointment',
      communityId: communityId || null,
      communityName: communityName || null,
      location: location?.trim() || '',
      createdAt: Timestamp.now(),
    });

    revalidatePath('/profile/[userId]', 'page');

    return { success: true, id: calendarRef.id };
  } catch (error: any) {
    console.error("Error adding calendar event:", error);
    return { success: false, error: error.message || 'Failed to add calendar event.' };
  }
}

export async function deleteCalendarEventAction(params: { userId: string; eventId: string }): Promise<ActionResponse> {
  const { userId, eventId } = params;
  if (!userId || !eventId) {
    return { success: false, error: 'User ID and Event ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    await firestore.collection(`users/${userId}/calendar_events`).doc(eventId).delete();

    revalidatePath('/profile/[userId]', 'page');

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting calendar event:", error);
    return { success: false, error: error.message || 'Failed to delete event.' };
  }
}

export async function saveCommunityEventToCalendarAction(params: {
  userId: string;
  eventId: string;
  title: string;
  startDate: string;
  communityId: string;
  communityName: string;
  location?: string;
}): Promise<ActionResponse> {
  const { userId, eventId, title, startDate, communityId, communityName, location } = params;
  if (!userId || !title || !startDate) {
    return { success: false, error: 'User ID, title, and date are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const calendarRef = firestore.collection(`users/${userId}/calendar_events`).doc(`community_${eventId}`);

    await calendarRef.set({
      userId,
      communityEventId: eventId,
      title: title.trim(),
      startDate: Timestamp.fromDate(new Date(startDate)),
      type: 'community_event',
      communityId,
      communityName,
      location: location || '',
      createdAt: Timestamp.now(),
    }, { merge: true });

    revalidatePath('/profile/[userId]', 'page');

    return { success: true };
  } catch (error: any) {
    console.error("Error saving community event to calendar:", error);
    return { success: false, error: error.message || 'Failed to save community event.' };
  }
}
