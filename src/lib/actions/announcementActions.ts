

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { sendPushNotificationAction } from './notificationActions';
import { sendEmail } from './emailActions';

type ActionResponse = {
  success: boolean;
  error?: string;
};

async function dispatchAnnouncementNotifications(
  firestore: FirebaseFirestore.Firestore,
  announcementId: string,
  announcementData: any,
  shouldSendEmail = false
) {
  try {
    // Atomically mark notificationsDispatched = true so Admin App and Main App never double-send
    const annRef = firestore.collection('announcements').doc(announcementId);
    const shouldProceed = await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(annRef);
      if (snap.exists && snap.data()?.notificationsDispatched === true) {
        return false;
      }
      if (snap.exists) {
        tx.update(annRef, {
          notificationsDispatched: true,
          notificationsDispatchedAt: Timestamp.now(),
        });
      }
      return true;
    });

    if (!shouldProceed) {
      return;
    }

    const isEmergency =
      announcementData.type === 'Emergency' ||
      announcementData.severity === 'emergency' ||
      announcementData.broadcastType === 'emergency';
    const isUrgent = announcementData.severity === 'urgent';

    const targetCommunitySet = new Set<string>();
    let isGlobalPlatform = false;

    if (announcementData.communityId) {
      targetCommunitySet.add(announcementData.communityId);
    }
    if (Array.isArray(announcementData.targetCommunityIds)) {
      announcementData.targetCommunityIds.forEach((id: string) => {
        if (id) targetCommunitySet.add(id);
      });
    }

    const aud = announcementData.audience;
    if (aud) {
      const audCommunities: string[] = Array.isArray(aud.communities) ? aud.communities : [];
      const audRegions: string[] = Array.isArray(aud.regions) ? aud.regions : [];
      const audStates: string[] = Array.isArray(aud.states) ? aud.states : [];
      const audCountries: string[] = Array.isArray(aud.countries) ? aud.countries : [];

      audCommunities.forEach((id) => {
        if (id) targetCommunitySet.add(id);
      });

      if (audRegions.length > 0 || audStates.length > 0 || audCountries.length > 0) {
        const commSnap = await firestore.collection('communities').get();
        commSnap.forEach((cDoc) => {
          const c = cDoc.data();
          if (
            (c.regionId && audRegions.includes(c.regionId)) ||
            (c.stateId && audStates.includes(c.stateId)) ||
            (c.countryId && audCountries.includes(c.countryId))
          ) {
            targetCommunitySet.add(cDoc.id);
          }
        });
      }

      if (
        announcementData.scope === 'platform' &&
        !announcementData.isRegionalNetwork &&
        targetCommunitySet.size === 0 &&
        audRegions.length === 0 &&
        audStates.length === 0 &&
        audCountries.length === 0
      ) {
        isGlobalPlatform = true;
      }
    } else if (announcementData.scope === 'platform' && !announcementData.isRegionalNetwork && targetCommunitySet.size === 0) {
      isGlobalPlatform = true;
    }

    const usersSnapshot = await firestore.collection('users').get();
    if (usersSnapshot.empty) return;

    const matchedMembers: {
      id: string;
      email?: string;
      name?: string;
      pushAllowed: boolean;
      emailSubscribed: boolean;
      communityId?: string;
    }[] = [];

    const now = new Date();

    usersSnapshot.forEach((uDoc) => {
      const u = uDoc.data();
      const uid = uDoc.id;

      const userCommunities = new Set<string>();
      if (u.communityId) userCommunities.add(u.communityId);
      if (u.homeCommunityId) userCommunities.add(u.homeCommunityId);
      if (u.primaryHomeCommunityId) userCommunities.add(u.primaryHomeCommunityId);
      if (Array.isArray(u.memberOf)) {
        u.memberOf.forEach((cid: string) => {
          if (cid) userCommunities.add(cid);
        });
      }
      if (u.communityRoles && typeof u.communityRoles === 'object') {
        Object.keys(u.communityRoles).forEach((cid) => {
          if (cid) userCommunities.add(cid);
        });
      }

      const isCreator =
        uid === announcementData.ownerId || uid === announcementData.creatorId;
      let isTargeted = isGlobalPlatform || isCreator;

      if (!isTargeted && targetCommunitySet.size > 0) {
        for (const cid of userCommunities) {
          if (targetCommunitySet.has(cid)) {
            isTargeted = true;
            break;
          }
        }
      }

      if (!isTargeted) return;

      const standardEnabled = u.mailingLists?.standard !== false;
      let emergencyEnabled = u.mailingLists?.emergency !== false;
      const snoozedUntil = u.settings?.emergencyNotificationsSnoozedUntil?.toDate
        ? u.settings.emergencyNotificationsSnoozedUntil.toDate()
        : null;
      if (snoozedUntil && now < snoozedUntil) {
        emergencyEnabled = false;
      }

      const pushAllowed = isEmergency ? emergencyEnabled || isCreator : standardEnabled || isCreator;

      matchedMembers.push({
        id: uid,
        email: u.email,
        name: u.name || u.displayName || 'Community Member',
        pushAllowed,
        emailSubscribed: standardEnabled,
        communityId:
          announcementData.communityId ||
          u.primaryHomeCommunityId ||
          u.homeCommunityId ||
          u.communityId ||
          Array.from(targetCommunitySet)[0] ||
          '',
      });
    });

    const plainBody = (announcementData.message || '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const shortBody =
      plainBody.length > 140 ? plainBody.substring(0, 140) + '...' : plainBody;

    const pushTitle = isEmergency
      ? `🚨 EMERGENCY ALERT: ${announcementData.subject}`
      : isUrgent
      ? `⚠️ Urgent Announcement: ${announcementData.subject}`
      : `📢 Announcement: ${announcementData.subject}`;

    const pushRecipients = matchedMembers.filter((m) => m.pushAllowed).map((m) => m.id);

    if (pushRecipients.length > 0) {
      await sendPushNotificationAction({
        audience: { type: 'users', value: pushRecipients },
        notification: {
          title: pushTitle,
          body: shortBody || 'Tap to view the latest community announcement.',
          tag: `announcement-${announcementId}`,
          url: '/home',
        },
      });
    }

    // Create in-app notifications so NotificationBell & /notifications update immediately
    if (pushRecipients.length > 0) {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < matchedMembers.length; i += CHUNK_SIZE) {
        const chunk = matchedMembers.slice(i, i + CHUNK_SIZE).filter((m) => m.pushAllowed);
        if (chunk.length === 0) continue;
        const batch = firestore.batch();
        const ts = Timestamp.now();

        chunk.forEach((member) => {
          const notifRef = firestore.collection('notifications').doc();
          batch.set(notifRef, {
            type: isEmergency ? 'Public Emergency Alert' : 'Community Announcement',
            subject: pushTitle,
            from:
              announcementData.sentBy ||
              announcementData.creator ||
              'Community Administration',
            date: ts,
            status: 'new',
            recipientId: member.id,
            relatedId: announcementId,
            actionUrl: '/home',
            details: {
              communityId: member.communityId || '',
              message: shortBody,
            },
          });
        });

        await batch.commit();
      }
    }

    // Send emails if Emergency or explicitly requested
    const finalShouldSendEmail = isEmergency || shouldSendEmail;
    if (finalShouldSendEmail) {
      const emailRecipients = matchedMembers
        .filter((m) => m.email && (isEmergency || m.emailSubscribed))
        .map((m) => ({ email: m.email!, name: m.name }));

      if (emailRecipients.length > 0) {
        await sendEmail({
          to: emailRecipients,
          subject: pushTitle,
          htmlContent: `<h2>${announcementData.subject}</h2><div>${announcementData.message}</div>`,
        });
      }
    }
  } catch (notifyErr) {
    console.error('Error dispatching announcement notifications:', notifyErr);
  }
}

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
    const dbId = params.communityId === '9ayHMyZf4SRw2gof1AM9' ? 'comfeed' : undefined;
    const { firestore } = initializeAdminApp(dbId);
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
      await dispatchAnnouncementNotifications(
        firestore,
        newDocRef.id,
        announcementData,
        params.type === 'Emergency'
      );
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
  sendEmail: boolean;
}

export async function createCommunityAnnouncementAction(
  params: CreateCommunityAnnouncementParams
): Promise<ActionResponse> {
  try {
    const dbId = params.communityId === '9ayHMyZf4SRw2gof1AM9' ? 'comfeed' : undefined;
    const { firestore } = initializeAdminApp(dbId);
    
    const { sendEmail: shouldSendEmail, userId, ...restOfData } = params;
    let finalShouldSendEmail = shouldSendEmail;

    if (params.type === 'Emergency') {
        finalShouldSendEmail = true;
    }

    const announcementData: any = {
      ...restOfData,
      communityId: params.communityId,
      targetCommunityIds: [params.communityId],
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
      await dispatchAnnouncementNotifications(
        firestore,
        newDocRef.id,
        announcementData,
        finalShouldSendEmail
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error creating community announcement:', error);
    return { success: false, error: error.message || 'Failed to create announcement.' };
  }
}

export async function dispatchRegionalBroadcastNotificationsAction(params: {
  announcementId: string;
  subject: string;
  message: string;
  type: 'Standard' | 'Emergency';
  severity?: 'normal' | 'urgent';
  targetCommunityIds: string[];
  sentBy: string;
  creatorId: string;
}): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    await dispatchAnnouncementNotifications(
      firestore,
      params.announcementId,
      {
        subject: params.subject,
        message: params.message,
        type: params.type,
        severity: params.severity,
        scope: params.type === 'Emergency' ? 'community' : 'platform',
        isRegionalNetwork: true,
        targetCommunityIds: params.targetCommunityIds,
        sentBy: params.sentBy,
        creatorId: params.creatorId,
      },
      false // Regional page already handles its own Brevo emergency email template
    );
    return { success: true };
  } catch (error: any) {
    console.error('Error dispatching regional broadcast notifications:', error);
    return { success: false, error: error.message };
  }
}

export async function updateAnnouncementStatusAction(params: {
  announcementId: string;
  status: 'Paused' | 'Live' | 'Archived';
  actorId: string;
  communityId?: string;
}): Promise<ActionResponse> {
  const { announcementId, status, actorId, communityId } = params;

  if (!announcementId || !status || !actorId) {
    return { success: false, error: 'Announcement ID, status, and actor ID are required.' };
  }

  try {
    let dbId = communityId === '9ayHMyZf4SRw2gof1AM9' ? 'comfeed' : undefined;
    let { firestore } = initializeAdminApp(dbId);
    let announcementRef = firestore.collection('announcements').doc(announcementId);
    let docSnap = await announcementRef.get();

    if (!docSnap.exists && dbId === undefined) {
      const comfeedAdmin = initializeAdminApp('comfeed');
      const comfeedSnap = await comfeedAdmin.firestore.collection('announcements').doc(announcementId).get();
      if (comfeedSnap.exists) {
        firestore = comfeedAdmin.firestore;
        announcementRef = firestore.collection('announcements').doc(announcementId);
        docSnap = comfeedSnap;
      }
    }

    const previousStatus = docSnap.exists ? docSnap.data()?.status : null;

    await announcementRef.update({
      status: status,
      history: FieldValue.arrayUnion({
        status: status,
        timestamp: Timestamp.now(),
        actorId: actorId,
      }),
    });

    if (status === 'Live' && previousStatus !== 'Live' && docSnap.exists) {
      await dispatchAnnouncementNotifications(
        firestore,
        announcementId,
        docSnap.data(),
        docSnap.data()?.type === 'Emergency'
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error updating announcement ${announcementId}:`, error);
    return { success: false, error: error.message || 'Failed to update announcement status.' };
  }
}

export async function ensureAnnouncementNotificationsDispatchedAction(
  announcementId: string
): Promise<ActionResponse> {
  if (!announcementId) return { success: false, error: 'Missing announcementId' };
  try {
    const { firestore } = initializeAdminApp();
    const docSnap = await firestore.collection('announcements').doc(announcementId).get();
    if (!docSnap.exists) {
      return { success: false, error: 'Announcement not found' };
    }
    const data = docSnap.data()!;
    if (data.status !== 'Live' || data.notificationsDispatched === true) {
      return { success: true };
    }
    await dispatchAnnouncementNotifications(
      firestore,
      announcementId,
      data,
      data.type === 'Emergency' || Boolean(data.sendEmail)
    );
    return { success: true };
  } catch (error: any) {
    console.error('Error in ensureAnnouncementNotificationsDispatchedAction:', error);
    return { success: false, error: error.message };
  }
}
