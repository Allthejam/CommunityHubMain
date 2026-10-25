

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { collection, query, where, getDocs } from "firebase/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  message?: string;
};

export async function recalculateCommunityCounts(): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const communitiesRef = firestore.collection('communities');
    const usersRef = firestore.collection('users');
    const communitiesSnapshot = await communitiesRef.get();

    if (communitiesSnapshot.empty) {
      return { success: true, message: "No communities found to process." };
    }

    const memberCounts: Record<string, number> = {};
    const leaderCounts: Record<string, number> = {};

    // 1. Single-pass User Scan
    // Accurate calculation based on resident home community and explicit appointed community roles.
    // Visitors who merely browse or visit another community are NEVER counted as members or leaders.
    const usersSnapshot = await usersRef.get();
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const role = (data.role || '').toLowerCase();
      const isGlobalLeader = ['president', 'leader'].includes(role);

      const homeId = data.homeCommunityId || data.primaryHomeCommunityId;
      if (homeId) {
        memberCounts[homeId] = (memberCounts[homeId] || 0) + 1;
        if (isGlobalLeader) {
          leaderCounts[homeId] = (leaderCounts[homeId] || 0) + 1;
        }
      }

      if (data.communityRoles && typeof data.communityRoles === 'object') {
        Object.entries(data.communityRoles).forEach(([cid, roleData]: [string, any]) => {
          if (!cid || cid === homeId) return;
          const cRole = (roleData?.role || '').toLowerCase();
          memberCounts[cid] = (memberCounts[cid] || 0) + 1;
          if (['president', 'leader'].includes(cRole)) {
            leaderCounts[cid] = (leaderCounts[cid] || 0) + 1;
          }
        });
      }
    });

    // 2. Bulk Update Communities
    const batchSize = 450;
    let batch = firestore.batch();
    let currentBatchCount = 0;
    let communitiesUpdated = 0;

    for (const communityDoc of communitiesSnapshot.docs) {
      const communityId = communityDoc.id;
      const commData = communityDoc.data();
      const newMemberCount = memberCounts[communityId] || 0;
      const newLeaderCount = leaderCounts[communityId] || 0;

      const updatePayload: any = {
        memberCount: newMemberCount,
        leaderCount: newLeaderCount,
        lastStatsSync: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (newLeaderCount === 0 && commData.status === 'active') {
        updatePayload.status = 'inactive';
      }

      batch.update(communityDoc.ref, updatePayload);
      communitiesUpdated++;
      currentBatchCount++;

      if (currentBatchCount === batchSize) {
        await batch.commit();
        batch = firestore.batch();
        currentBatchCount = 0;
      }
    }

    if (currentBatchCount > 0) {
      await batch.commit();
    }

    return { success: true, message: `${communitiesUpdated} communities have been successfully re-synced.` };

  } catch (error: any) {
    console.error("Error recalculating community counts:", error);
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}

export async function syncCommunityLocationIds(): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const communitiesRef = firestore.collection('communities');
    const locationsRef = firestore.collection('locations');
    const communitiesSnapshot = await communitiesRef.get();

    if (communitiesSnapshot.empty) {
      return { success: true, message: "No communities to process." };
    }

    const batch = firestore.batch();
    let updatedCount = 0;

    for (const communityDoc of communitiesSnapshot.docs) {
      const communityData = communityDoc.data();
      
      // Skip if already has IDs
      if (communityData.countryId && communityData.stateId && communityData.regionId) {
        continue;
      }
      
      let countryId: string | null = null;
      let stateId: string | null = null;
      let regionId: string | null = null;

      if (communityData.country) {
          const countryQuery = await locationsRef.where('type', '==', 'country').where('name', '==', communityData.country).limit(1).get();
          if (!countryQuery.empty) countryId = countryQuery.docs[0].id;
      }
      if (countryId && communityData.state) {
          const stateQuery = await locationsRef.where('type', '==', 'state').where('parent', '==', countryId).where('name', '==', communityData.state).limit(1).get();
          if (!stateQuery.empty) stateId = stateQuery.docs[0].id;
      }
      if (stateId && communityData.region) {
          const regionQuery = await locationsRef.where('type', '==', 'region').where('parent', '==', stateId).where('name', '==', communityData.region).limit(1).get();
          if (!regionQuery.empty) regionId = regionQuery.docs[0].id;
      }

      if (countryId && stateId && regionId) {
          batch.update(communityDoc.ref, { countryId, stateId, regionId });
          updatedCount++;
      } else {
          console.warn(`Could not resolve location IDs for community: ${communityDoc.id} (${communityData.name})`);
      }
    }

    await batch.commit();

    return { success: true, message: `${updatedCount} communities have been updated with location IDs.` };

  } catch (error: any) {
    console.error("Error syncing community location IDs:", error);
    return { success: false, error: error.message };
  }
}
