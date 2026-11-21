'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendPushNotificationAction } from './notificationActions';

async function verifyLeaderAccess(
  firestore: FirebaseFirestore.Firestore,
  uid: string,
  communityId: string,
  allowDelegatedSchoolPoster = false
): Promise<{ allowed: boolean; authorName: string; error?: string }> {
  if (!uid || !communityId) {
    return { allowed: false, authorName: '', error: 'Missing user or community ID.' };
  }
  const userDoc = await firestore.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return { allowed: false, authorName: '', error: 'User profile not found.' };
  }

  const u = userDoc.data() || {};
  const authorName =
    u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Community Leader';
  const accountType = String(u.accountType || '').toLowerCase();
  const role = String(u.role || '').toLowerCase();
  const commRole = String(u.communityRoles?.[communityId]?.role || '').toLowerCase();
  const siteAdminRoles = ['admin', 'administrator', 'superadmin', 'owner'];
  const allowedRoles = ['president', 'leader', 'vice-president', 'admin', 'administrator', 'owner', 'moderator'];

  const isSiteAdmin =
    siteAdminRoles.includes(accountType) ||
    siteAdminRoles.includes(role) ||
    u.isAdmin === true ||
    u.isStaff === true;
  const isThisCommunityLeader =
    allowedRoles.includes(commRole) ||
    u.communityRoles?.[communityId]?.permissions?.hasBackOfficeAccess === true;
  const isLegacyPrimaryLeader =
    !u.communityRoles &&
    (u.primaryCommunityId === communityId || u.communityId === communityId) &&
    (allowedRoles.includes(accountType) || allowedRoles.includes(role) || u.permissions?.hasBackOfficeAccess === true);
  const isDelegatedSchoolPoster =
    allowDelegatedSchoolPoster &&
    (u.communityRoles?.[communityId]?.permissions?.canPostSchoolClosures === true ||
      (Array.isArray(u.schoolClosureCommunities) && u.schoolClosureCommunities.includes(communityId)));

  if (isSiteAdmin || isThisCommunityLeader || isLegacyPrimaryLeader || isDelegatedSchoolPoster) {
    return { allowed: true, authorName };
  }

  return { allowed: false, authorName, error: 'Leader or authorized school poster permission required.' };
}

async function dispatchSchoolAlertNotifications(
  firestore: FirebaseFirestore.Firestore,
  params: {
    communityId: string;
    alertId: string;
    schoolName: string;
    status: string;
    reason: string;
    creatorUid: string;
  }
) {
  try {
    const commDoc = await firestore.collection('communities').doc(params.communityId).get();
    const communityName = commDoc.data()?.name || 'Local Community';

    const usersSnap = await firestore.collection('users').get();
    if (usersSnap.empty) return;

    const targetIds: string[] = [];
    usersSnap.forEach((uDoc) => {
      const u = uDoc.data();
      const uid = uDoc.id;
      const userCommunities = new Set<string>();
      if (u.communityId) userCommunities.add(u.communityId);
      if (u.homeCommunityId) userCommunities.add(u.homeCommunityId);
      if (u.primaryHomeCommunityId) userCommunities.add(u.primaryHomeCommunityId);
      if (Array.isArray(u.memberOf)) {
        u.memberOf.forEach((cid: string) => cid && userCommunities.add(cid));
      }
      if (u.communityRoles && typeof u.communityRoles === 'object') {
        Object.keys(u.communityRoles).forEach((cid) => cid && userCommunities.add(cid));
      }

      if (!userCommunities.has(params.communityId) && uid !== params.creatorUid) return;
      if (u.mailingLists?.standard !== false || uid === params.creatorUid) {
        targetIds.push(uid);
      }
    });

    if (targetIds.length === 0) return;

    const subject = `🏫 School ${params.status}: ${params.schoolName} (${communityName})`;
    const cleanReason = params.reason.replace(/\s+/g, ' ').trim();
    const shortBody = cleanReason.length > 140 ? cleanReason.slice(0, 140) + '...' : cleanReason;

    await sendPushNotificationAction({
      audience: { type: 'users', value: targetIds },
      notification: {
        title: subject,
        body: shortBody,
        tag: `school-alert-${params.alertId}`,
        url: '/',
      },
    });

    const CHUNK_SIZE = 400;
    for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
      const chunk = targetIds.slice(i, i + CHUNK_SIZE);
      const batch = firestore.batch();
      const ts = Timestamp.now();
      chunk.forEach((uid) => {
        const notifRef = firestore.collection('notifications').doc();
        batch.set(notifRef, {
          type: 'School Closure Alert',
          subject,
          from: `${communityName} School Updates`,
          date: ts,
          status: 'new',
          recipientId: uid,
          relatedId: params.alertId,
          actionUrl: '/',
          details: {
            communityId: params.communityId,
            message: shortBody,
          },
        });
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not dispatch school alert notifications:', err);
  }
}

export async function createSchoolAlertAction(params: {
  communityId: string;
  uid: string;
  schoolName: string;
  status: 'Closed' | 'Partial Closure' | 'Delayed Opening';
  reason: string;
  expectedReopen?: string;
  durationHours?: number;
}) {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId, true);
    if (!auth.allowed) return { success: false, error: auth.error };

    if (!params.schoolName?.trim() || !params.reason?.trim()) {
      return { success: false, error: 'School name and reason are required.' };
    }

    const hours = Math.min(Math.max(Number(params.durationHours || 24), 6), 168);
    const expiresAtMs = Date.now() + hours * 60 * 60 * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();

    const docRef = await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('schoolAlerts')
      .add({
        schoolName: params.schoolName.trim(),
        status: params.status || 'Closed',
        reason: params.reason.trim(),
        expectedReopen: params.expectedReopen?.trim() || '',
        active: true,
        postedByUid: params.uid,
        postedByName: auth.authorName,
        expiresAt,
        expiresAtMs,
        createdAt: new Date().toISOString(),
      });

    // Immediately notify community members via Notifications Bell & Web Push
    await dispatchSchoolAlertNotifications(firestore, {
      communityId: params.communityId,
      alertId: docRef.id,
      schoolName: params.schoolName.trim(),
      status: params.status || 'Closed',
      reason: params.reason.trim(),
      creatorUid: params.uid,
    });

    return { success: true, alertId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to post school alert.' };
  }
}

export async function clearSchoolAlertAction(params: {
  communityId: string;
  uid: string;
  alertId: string;
}) {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId, true);
    if (!auth.allowed) return { success: false, error: auth.error };

    await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('schoolAlerts')
      .doc(params.alertId)
      .update({
        active: false,
        clearedAt: new Date().toISOString(),
        clearedByUid: params.uid,
      });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to clear school alert.' };
  }
}

export async function createSchoolHolidayAction(params: {
  communityId: string;
  uid: string;
  title: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  replacesBankHolidayKey?: string;
}) {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId, true);
    if (!auth.allowed) return { success: false, error: auth.error };

    if (!params.title?.trim() || !params.startDate?.trim()) {
      return { success: false, error: 'Holiday title and start date are required.' };
    }

    const docRef = await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('schoolHolidays')
      .add({
        title: params.title.trim(),
        startDate: params.startDate.trim(),
        endDate: params.endDate?.trim() || params.startDate.trim(),
        notes: params.notes?.trim() || '',
        replacesBankHolidayKey: params.replacesBankHolidayKey?.trim() || '',
        postedByUid: params.uid,
        createdAt: new Date().toISOString(),
      });

    return { success: true, holidayId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to add school holiday.' };
  }
}

export async function updateSchoolHolidayAction(params: {
  communityId: string;
  uid: string;
  holidayId: string;
  title: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}) {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId, true);
    if (!auth.allowed) return { success: false, error: auth.error };

    if (!params.holidayId || !params.title?.trim() || !params.startDate?.trim()) {
      return { success: false, error: 'Holiday ID, title, and start date are required.' };
    }

    await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('schoolHolidays')
      .doc(params.holidayId)
      .update({
        title: params.title.trim(),
        startDate: params.startDate.trim(),
        endDate: params.endDate?.trim() || params.startDate.trim(),
        notes: params.notes?.trim() || '',
        updatedByUid: params.uid,
        updatedAt: new Date().toISOString(),
      });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update school holiday.' };
  }
}

export async function deleteSchoolHolidayAction(params: {
  communityId: string;
  uid: string;
  holidayId: string;
}) {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId, true);
    if (!auth.allowed) return { success: false, error: auth.error };

    await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('schoolHolidays')
      .doc(params.holidayId)
      .delete();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to delete school holiday.' };
  }
}

export async function listCommunityMembersForSchoolPermsAction(params: {
  communityId: string;
  uid: string;
}) {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId, false);
    if (!auth.allowed) return { success: false, members: [], error: auth.error };

    const usersSnap = await firestore.collection('users').get();
    const members: Array<{ id: string; name: string; email: string; canPostSchoolClosures: boolean }> = [];

    usersSnap.forEach((docSnap) => {
      const u = docSnap.data() || {};
      const belongs =
        u.communityId === params.communityId ||
        u.homeCommunityId === params.communityId ||
        u.primaryHomeCommunityId === params.communityId ||
        u.primaryCommunityId === params.communityId ||
        (Array.isArray(u.memberOf) && u.memberOf.includes(params.communityId)) ||
        Boolean(u.communityRoles?.[params.communityId]);

      if (!belongs) return;

      const canPost =
        u.communityRoles?.[params.communityId]?.permissions?.canPostSchoolClosures === true ||
        (Array.isArray(u.schoolClosureCommunities) && u.schoolClosureCommunities.includes(params.communityId));

      members.push({
        id: docSnap.id,
        name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Member',
        email: u.email || '',
        canPostSchoolClosures: canPost,
      });
    });

    members.sort((a, b) => Number(b.canPostSchoolClosures) - Number(a.canPostSchoolClosures) || a.name.localeCompare(b.name));
    return { success: true, members };
  } catch (error: any) {
    return { success: false, members: [], error: error?.message || 'Failed to load members.' };
  }
}

export async function setSchoolClosurePosterPermissionAction(params: {
  communityId: string;
  uid: string;
  targetUid: string;
  allowed: boolean;
}) {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId, false);
    if (!auth.allowed) return { success: false, error: auth.error };

    const userRef = firestore.collection('users').doc(params.targetUid);
    await userRef.set(
      {
        communityRoles: {
          [params.communityId]: {
            permissions: {
              canPostSchoolClosures: params.allowed,
            },
          },
        },
        schoolClosureCommunities: params.allowed
          ? FieldValue.arrayUnion(params.communityId)
          : FieldValue.arrayRemove(params.communityId),
      },
      { merge: true }
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update permission.' };
  }
}
