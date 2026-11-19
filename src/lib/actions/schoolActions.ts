'use server';

import { initializeAdminApp } from '@/firebase/admin-app';

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
  const allowedRoles = ['president', 'leader', 'vice-president', 'admin', 'administrator', 'owner', 'moderator'];

  if (
    allowedRoles.includes(accountType) ||
    allowedRoles.includes(role) ||
    allowedRoles.includes(commRole) ||
    u.permissions?.hasBackOfficeAccess === true ||
    u.communityRoles?.[communityId]?.permissions?.hasBackOfficeAccess === true
  ) {
    return { allowed: true, authorName };
  }

  return { allowed: false, authorName, error: 'Leader permission required.' };
}

export async function createSchoolAlertAction(params: {
  communityId: string;
  uid: string;
  schoolName: string;
  status: 'Closed' | 'Partial Closure' | 'Delayed Opening';
  reason: string;
  expectedReopen?: string;
}) {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId);
    if (!auth.allowed) return { success: false, error: auth.error };

    if (!params.schoolName?.trim() || !params.reason?.trim()) {
      return { success: false, error: 'School name and reason are required.' };
    }

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
        createdAt: new Date().toISOString(),
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
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId);
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
}) {
  try {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId);
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
        postedByUid: params.uid,
        createdAt: new Date().toISOString(),
      });

    return { success: true, holidayId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to add school holiday.' };
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
    const auth = await verifyLeaderAccess(firestore, params.uid, params.communityId);
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
