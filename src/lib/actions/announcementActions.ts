

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue, collection, query, where, getDocs } from "firebase-admin/firestore";
import { sendPushNotificationAction } from './notificationActions';
import { sendEmail } from './emailActions';

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
  audience: any[];
  showOnLoginPage: boolean;
  scheduledDates: string;
  startDate: Date | null;
  endDate: Date | null;
  scope: 'platform' | 'community';
  sentBy: string;
  communityId?: string;
  coverageArea?: string;
  ownerId?: string;
};

export async function createPlatformAnnouncementAction(
  params: CreatePlatformAnnouncementParams
): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const { userId, audience, ...restOfParams } = params;
    
    const finalAudienceObject = {
        countries: new Set<string>(),
        states: new Set<string>(),
        regions: new Set<string>(),
        communities: new Set<string>(),
    };

    if (Array.isArray(audience)) {
        audience.forEach((scope: any) => {
            if (scope.communities && scope.communities.length > 0) {
                scope.communities.forEach((id: string) => finalAudienceObject.communities.add(id));
            } else if (scope.regions && scope.regions.length > 0) {
                scope.regions.forEach((id: string) => finalAudienceObject.regions.add(id));
            } else if (scope.states && scope.states.length > 0) {
                scope.states.forEach((id: string) => finalAudienceObject.states.add(id));
            } else if (scope.country) {
                finalAudienceObject.countries.add(scope.country);
            }
        });
    }

    const announcementData: any = {
      ownerId: userId,
      subject: params.subject,
      message: params.message,
      image: params.image,
      type: params.type,
      severity: params.severity,
      status: params.status,
      audience: {
        type: 'location',
        countries: Array.from(finalAudienceObject.countries),
        states: Array.from(finalAudienceObject.states),
        regions: Array.from(finalAudienceObject.regions),
        communities: Array.from(finalAudienceObject.communities),
      },
      showOnLoginPage: params.showOnLoginPage,
      scheduledDates: params.scheduledDates,
      scope: params.scope,
      sentBy: params.sentBy,
      createdAt: Timestamp.now(),
      history: [
        {
          status: params.status,
          timestamp: Timestamp.now(),
          actorId: userId,
        }
      ]
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

    if (params.status === 'Live') {
      // TODO: This logic needs to be robust to handle large audiences.
      // For now, it's a placeholder. A real implementation would use Cloud Functions
      // and FCM topics for scalability.
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error creating platform announcement:', error);
    return { success: false, error: error.message || 'Failed to create announcement.' };
  }
}

// ... rest of the file is unchanged ...
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
  sendEmail: boolean;
}

export async function createCommunityAnnouncementAction(
  params: CreateCommunityAnnouncementParams
): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    
    const { sendEmail: shouldSendEmail, userId, ...restOfData } = params;
    let finalShouldSendEmail = shouldSendEmail;

    if (params.type === 'Emergency') {
        finalShouldSendEmail = true;
    }

    const announcementData: any = {
      ...restOfData,
      ownerId: userId,
      scope: 'community',
      createdAt: Timestamp.now(),
      history: [
        {
          status: params.status,
          timestamp: Timestamp.now(),
          actorId: userId,
        }
      ]
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
    
    if (params.status === 'Live') {
        const usersSnapshot = await firestore.collection('users').where('memberOf', 'array-contains', params.communityId).get();
        
        if (!usersSnapshot.empty) {
            const members = usersSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    email: data.email,
                    name: data.name,
                    pushSubscribed: true, 
                    emailSubscribed: data.mailingLists?.standard !== false,
                };
            });

            const pushRecipients = members.map(m => m.id);
            if (pushRecipients.length > 0) {
                await sendPushNotificationAction({
                    audience: { type: 'users', value: pushRecipients },
                    notification: {
                        title: `Community Announcement: ${params.subject}`,
                        body: params.message.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...',
                        tag: newDocRef.id,
                        url: '/home',
                    }
                });
            }

            if (finalShouldSendEmail) {
                const emailRecipients = members
                    .filter(member => member.email && (params.type === 'Emergency' || member.emailSubscribed))
                    .map(member => ({ email: member.email, name: member.name }));
                
                if (emailRecipients.length > 0) {
                    await sendEmail({
                        to: emailRecipients,
                        subject: `Community Announcement: ${params.subject}`,
                        htmlContent: `<h2>${params.subject}</h2>${params.message}`
                    });
                }
            }
        }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error creating community announcement:', error);
    return { success: false, error: error.message || 'Failed to create announcement.' };
  }
}

export async function updateAnnouncementStatusAction(params: {
  announcementId: string;
  status: 'Paused' | 'Live' | 'Archived';
  actorId: string;
}): Promise<ActionResponse> {
  const { announcementId, status, actorId } = params;

  if (!announcementId || !status || !actorId) {
    return { success: false, error: 'Announcement ID, status, and actor ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const announcementRef = firestore.collection('announcements').doc(announcementId);

    await announcementRef.update({
      status: status,
      history: FieldValue.arrayUnion({
        status: status,
        timestamp: Timestamp.now(),
        actorId: actorId,
      }),
    });

    return { success: true };
  } catch (error: any) {
    console.error(`Error updating announcement ${announcementId}:`, error);
    return { success: false, error: error.message || 'Failed to update announcement status.' };
  }
}
