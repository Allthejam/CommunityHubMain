'use server';

import { initializeAdminApp } from '@/firebase/admin-app';

export interface DailyBriefingNotice {
  id: string;
  title: string;
  message: string;
  targetDate: string; // YYYY-MM-DD
  linkUrl?: string;
  authorName: string;
  expiresAtMs: number;
  createdAt: string;
}

async function verifyLeaderAccess(
  firestore: FirebaseFirestore.Firestore,
  uid: string,
  communityId: string
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

  if (isSiteAdmin || isThisCommunityLeader || isLegacyPrimaryLeader) {
    return { allowed: true, authorName };
  }

  return { allowed: false, authorName, error: 'Leader permission required.' };
}

export async function listLeaderBriefingNoticesAction(params: {
  communityId: string;
  uid: string;
}): Promise<{ success: boolean; notices: DailyBriefingNotice[]; error?: string }> {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId);
    if (!auth.allowed) return { success: false, notices: [], error: auth.error };

    const snap = await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('dailyBriefingNotices')
      .orderBy('targetDate', 'asc')
      .get();

    const nowMs = Date.now();
    const cleanupBatch = firestore.batch();
    let hasCleanup = false;
    const notices: DailyBriefingNotice[] = [];

    snap.forEach((docSnap) => {
      const d = docSnap.data() as any;
      if (typeof d.expiresAtMs === 'number' && d.expiresAtMs <= nowMs) {
        cleanupBatch.delete(docSnap.ref);
        hasCleanup = true;
      } else {
        notices.push({
          id: docSnap.id,
          title: d.title || '',
          message: d.message || '',
          targetDate: d.targetDate || '',
          linkUrl: d.linkUrl || '',
          authorName: d.authorName || 'Community Leader',
          expiresAtMs: d.expiresAtMs || 0,
          createdAt: d.createdAt || '',
        });
      }
    });

    if (hasCleanup) {
      await cleanupBatch.commit().catch(() => {});
    }

    return { success: true, notices };
  } catch (error: any) {
    return { success: false, notices: [], error: error?.message || 'Failed to load briefing notices.' };
  }
}

export async function createLeaderBriefingNoticeAction(params: {
  communityId: string;
  uid: string;
  title: string;
  message: string;
  targetDate: string;
  linkUrl?: string;
}): Promise<{ success: boolean; noticeId?: string; error?: string }> {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId);
    if (!auth.allowed) return { success: false, error: auth.error };

    const title = params.title?.trim();
    const message = params.message?.trim();
    const targetDate = params.targetDate?.trim();
    if (!title || !message || !targetDate) {
      return { success: false, error: 'Title, message, and target date are required.' };
    }

    // Auto-delete 20 hours after the 8:00 AM briefing on targetDate
    const briefingStartMs = Date.parse(`${targetDate}T08:00:00Z`);
    const expiresAtMs = (Number.isNaN(briefingStartMs) ? Date.now() : briefingStartMs) + 20 * 60 * 60 * 1000;

    const docRef = await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('dailyBriefingNotices')
      .add({
        title,
        message,
        targetDate,
        linkUrl: params.linkUrl?.trim() || '',
        authorName: auth.authorName,
        postedByUid: params.uid,
        expiresAtMs,
        createdAt: new Date().toISOString(),
      });

    return { success: true, noticeId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to schedule briefing notice.' };
  }
}

export async function deleteLeaderBriefingNoticeAction(params: {
  communityId: string;
  uid: string;
  noticeId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId);
    if (!auth.allowed) return { success: false, error: auth.error };

    await firestore
      .collection('communities')
      .doc(params.communityId)
      .collection('dailyBriefingNotices')
      .doc(params.noticeId)
      .delete();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to delete briefing notice.' };
  }
}
