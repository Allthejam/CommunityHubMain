
'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp } from 'firebase-admin/firestore';
import { sendPushNotificationAction } from './notificationActions';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type CreatePlatformAnnouncementParams = {
  userId: string;
  subject: string;
  message: string;
  image: string | null;
  type: 'Standard' | 'Emergency';
  severity?: 'normal' | 'urgent';
  status: 'Live' | 'Scheduled';
  audience: any;
  showOnLoginPage: boolean;
  scheduledDates: string;
  startDate: Date | null;
  endDate: Date | null;
  scope: 'platform' | 'community';
  sentBy: string;
  communityId?: string;
};

export async function createPlatformAnnouncementAction(
  params: CreatePlatformAnnouncementParams
): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    
    const announcementData: any = {
      ...params,
      createdAt: Timestamp.now(),
      sentBy: params.sentBy,
    };

    if(params.startDate) {
        announcementData.startDate = Timestamp.fromDate(new Date(params.startDate));
    } else {
        announcementData.startDate = null;
    }
      
    if(params.endDate) {
        announcementData.endDate = Timestamp.fromDate(new Date(params.endDate));
    } else {
        announcementData.endDate = null;
    }


    const newDocRef = await firestore.collection('announcements').add(announcementData);

    // If active immediately, send push notifications
    if (params.status === 'Live') {
        const usersSnapshot = await firestore.collection('users').select().get();
        const allUserIds = usersSnapshot.docs.map(doc => doc.id);
        
        if (allUserIds.length > 0) {
            await sendPushNotificationAction({
                audience: { type: 'users', value: allUserIds },
                notification: {
                    title: `Platform Announcement: ${params.subject}`,
                    body: params.message.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...',
                    tag: newDocRef.id,
                    url: '/home',
                }
            });
        }
    }


    return { success: true };
  } catch (error: any) {
    console.error('Error creating platform announcement:', error);
    return { success: false, error: error.message || 'Failed to create announcement.' };
  }
}

type CreateCommunityAnnouncementParams = {
  userId: string;
  communityId: string;
  subject: string;
  message: string;
  image: string | null;
  type: 'Standard' | 'Emergency';
  severity?: 'normal' | 'urgent';
  status: 'Live' | 'Scheduled';
  scheduledDates: string;
  startDate: Date | null;
  endDate: Date | null;
  sentBy: string;
}

export async function createCommunityAnnouncementAction(
  params: CreateCommunityAnnouncementParams
): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    
    const announcementData: any = {
      subject: params.subject,
      message: params.message,
      image: params.image,
      type: params.type,
      severity: params.severity,
      status: params.status,
      communityId: params.communityId,
      scheduledDates: params.scheduledDates,
      sentBy: params.sentBy,
      scope: 'community',
      createdAt: Timestamp.now(),
    };

    if(params.startDate) {
        announcementData.startDate = Timestamp.fromDate(new Date(params.startDate));
    } else {
        announcementData.startDate = null;
    }
      
    if(params.endDate) {
        announcementData.endDate = Timestamp.fromDate(new Date(params.endDate));
    } else {
        announcementData.endDate = null;
    }

    const newDocRef = await firestore.collection('announcements').add(announcementData);
    
    // If active immediately, send push notifications
    if (params.status === 'Live') {
        const usersSnapshot = await firestore.collection('users').where('memberOf', 'array-contains', params.communityId).get();
        const memberIds = usersSnapshot.docs.map(doc => doc.id);
        
        if (memberIds.length > 0) {
            await sendPushNotificationAction({
                audience: { type: 'users', value: memberIds },
                notification: {
                    title: `Community Announcement: ${params.subject}`,
                    body: params.message.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...',
                    tag: newDocRef.id,
                    url: '/home',
                }
            });
        }
    }


    return { success: true };
  } catch (error: any) {
    console.error('Error creating community announcement:', error);
    return { success: false, error: error.message || 'Failed to create announcement.' };
  }
}
