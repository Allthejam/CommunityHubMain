'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/**
 * Returns the isolated secondary Firestore instance for the Sandbox (comfeed).
 */
async function getComfeedFirestore() {
  const { adminApp } = initializeAdminApp();
  return getFirestore(adminApp, 'comfeed');
}

/**
 * Returns the default production Firestore instance.
 */
async function getDefaultFirestore() {
  const { firestore } = initializeAdminApp();
  return firestore;
}

export interface SandboxStatus {
  success: boolean;
  communityExists: boolean;
  communityName?: string;
  eventsCount: number;
  newsCount: number;
  noticesCount: number;
  hasEmergencyPlan: boolean;
  error?: string;
}

/**
 * Inspects the current state of the comfeed sandbox database.
 */
export async function getSandboxStatusAction(): Promise<SandboxStatus> {
  try {
    const comfeedDb = await getComfeedFirestore();
    const communityDoc = await comfeedDb.collection('communities').doc('9ayHMyZf4SRw2gof1AM9').get();

    if (!communityDoc.exists) {
      return {
        success: true,
        communityExists: false,
        eventsCount: 0,
        newsCount: 0,
        noticesCount: 0,
        hasEmergencyPlan: false,
      };
    }

    const eventsSnap = await comfeedDb.collection('events').where('communityId', '==', '9ayHMyZf4SRw2gof1AM9').get();
    const newsSnap = await comfeedDb.collection('news').where('communityId', '==', '9ayHMyZf4SRw2gof1AM9').get();
    const noticesSnap = await comfeedDb.collection('announcements').where('communityId', '==', '9ayHMyZf4SRw2gof1AM9').get();
    const epDoc = await comfeedDb.collection('communities').doc('9ayHMyZf4SRw2gof1AM9').collection('emergency_plan').doc('main').get();

    return {
      success: true,
      communityExists: true,
      communityName: communityDoc.data()?.name,
      eventsCount: eventsSnap.size,
      newsCount: newsSnap.size,
      noticesCount: noticesSnap.size,
      hasEmergencyPlan: epDoc.exists,
    };
  } catch (err: any) {
    console.error('Error fetching sandbox status:', err);
    return {
      success: false,
      communityExists: false,
      eventsCount: 0,
      newsCount: 0,
      noticesCount: 0,
      hasEmergencyPlan: false,
      error: err.message,
    };
  }
}

/**
 * 1-Click Seeder: Copies the master Show Home Community from the production (default) database
 * into the isolated (comfeed) database.
 */
export async function seedShowHomeToComfeedAction(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const defaultDb = await getDefaultFirestore();
    const comfeedDb = await getComfeedFirestore();

    const showHomeId = '9ayHMyZf4SRw2gof1AM9';

    // 1. Copy Community Document
    const commDoc = await defaultDb.collection('communities').doc(showHomeId).get();
    if (!commDoc.exists) {
      return { success: false, error: 'Source Show Home Community not found in default database.' };
    }
    await comfeedDb.collection('communities').doc(showHomeId).set(commDoc.data()!, { merge: true });

    // 2. Copy Emergency Plan Document
    const epDoc = await defaultDb.collection('communities').doc(showHomeId).collection('emergency_plan').doc('main').get();
    if (epDoc.exists) {
      await comfeedDb.collection('communities').doc(showHomeId).collection('emergency_plan').doc('main').set(epDoc.data()!, { merge: true });
    }

    // 3. Copy Events
    const eventsSnap = await defaultDb.collection('events').where('communityId', '==', showHomeId).get();
    for (const doc of eventsSnap.docs) {
      await comfeedDb.collection('events').doc(doc.id).set(doc.data(), { merge: true });
    }

    // 4. Copy News
    const newsSnap = await defaultDb.collection('news').where('communityId', '==', showHomeId).get();
    for (const doc of newsSnap.docs) {
      await comfeedDb.collection('news').doc(doc.id).set(doc.data(), { merge: true });
    }

    // 5. Copy Announcements / Notices
    const noticesSnap = await defaultDb.collection('announcements').where('communityId', '==', showHomeId).get();
    for (const doc of noticesSnap.docs) {
      await comfeedDb.collection('announcements').doc(doc.id).set(doc.data(), { merge: true });
    }

    // 6. Seed Demo Personas in comfeed
    const personas = [
      {
        uid: 'demo-leader',
        data: {
          name: 'Demo Community Leader',
          firstName: 'Demo',
          lastName: 'Leader',
          email: 'leader-demo@communityhub.app',
          accountType: 'leader',
          role: 'president',
          communityId: showHomeId,
          homeCommunityId: showHomeId,
          primaryCommunityId: showHomeId,
          selectedCommunity: { id: showHomeId, name: 'Show Home Community, "Display Only"' },
          onboardingCompleted: true,
          isDemoUser: true,
          demoPersona: 'leader',
          permissions: {
            hasBackOfficeAccess: true,
            viewDashboard: true,
            viewReports: true,
            viewUsers: true,
            viewNewsManagement: true,
            viewAdvertsManagement: true,
            viewEmergencyPlan: true,
            manageEmergencyPlan: true,
            viewAudit: true,
          },
          communityRoles: {
            [showHomeId]: {
              role: 'president',
              permissions: { hasBackOfficeAccess: true, viewDashboard: true },
            },
          },
          updatedAt: Timestamp.now(),
        },
      },
      {
        uid: 'demo-business',
        data: {
          name: 'Demo Business Owner',
          firstName: 'Demo',
          lastName: 'Merchant',
          email: 'business-demo@communityhub.app',
          accountType: 'business',
          role: 'business',
          communityId: showHomeId,
          homeCommunityId: showHomeId,
          primaryCommunityId: showHomeId,
          selectedCommunity: { id: showHomeId, name: 'Show Home Community, "Display Only"' },
          onboardingCompleted: true,
          isDemoUser: true,
          demoPersona: 'business',
          permissions: { isBusinessOwner: true, hasBackOfficeAccess: false },
          communityRoles: {},
          updatedAt: Timestamp.now(),
        },
      },
      {
        uid: 'demo-personal',
        data: {
          name: 'Demo Resident',
          firstName: 'Demo',
          lastName: 'Resident',
          email: 'resident-demo@communityhub.app',
          accountType: 'personal',
          role: 'personal',
          communityId: showHomeId,
          homeCommunityId: showHomeId,
          primaryCommunityId: showHomeId,
          selectedCommunity: { id: showHomeId, name: 'Show Home Community, "Display Only"' },
          onboardingCompleted: true,
          isDemoUser: true,
          demoPersona: 'personal',
          permissions: { hasBackOfficeAccess: false },
          communityRoles: {},
          updatedAt: Timestamp.now(),
        },
      },
      {
        uid: 'demo-advertiser',
        data: {
          name: 'Demo National Advertiser',
          firstName: 'Demo',
          lastName: 'Brand',
          email: 'advertiser-demo@communityhub.app',
          accountType: 'advertiser',
          role: 'advertiser',
          communityId: showHomeId,
          homeCommunityId: showHomeId,
          primaryCommunityId: showHomeId,
          onboardingCompleted: true,
          isDemoUser: true,
          demoPersona: 'advertiser',
          permissions: { hasBackOfficeAccess: false },
          communityRoles: {},
          updatedAt: Timestamp.now(),
        },
      },
      {
        uid: 'demo-regional',
        data: {
          name: 'Demo Regional Authority',
          firstName: 'Demo',
          lastName: 'Authority',
          email: 'regional-demo@communityhub.app',
          accountType: 'regional',
          role: 'regional',
          communityId: showHomeId,
          homeCommunityId: showHomeId,
          primaryCommunityId: showHomeId,
          onboardingCompleted: true,
          isDemoUser: true,
          demoPersona: 'regional',
          permissions: { isRegionalNetwork: true, hasBackOfficeAccess: false },
          communityRoles: {},
          updatedAt: Timestamp.now(),
        },
      },
    ];

    for (const persona of personas) {
      await comfeedDb.collection('users').doc(persona.uid).set(persona.data, { merge: true });
    }

    return {
      success: true,
      message: `Successfully seeded Show Home Community (${eventsSnap.size} events, ${newsSnap.size} news, ${noticesSnap.size} notices, emergency plan, and 5 demo personas) to the comfeed database!`,
    };
  } catch (err: any) {
    console.error('Error seeding comfeed database:', err);
    return { success: false, error: err.message };
  }
}
