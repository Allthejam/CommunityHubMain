

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

    let communitiesUpdated = 0;
    const batch = firestore.batch();

    for (const communityDoc of communitiesSnapshot.docs) {
      const communityId = communityDoc.id;

      // Count members for this community
      const membersQuery = usersRef.where('memberOf', 'array-contains', communityId);
      const membersSnapshot = await membersQuery.get();
      const memberCount = membersSnapshot.size;

      // Count leaders for this community
      const leadersQuery = usersRef
        .where('memberOf', 'array-contains', communityId)
        .where('role', 'in', ['president', 'leader']);
      const leadersSnapshot = await leadersQuery.get();
      const leaderCount = leadersSnapshot.size;

      // Update the community document
      const communityRef = communitiesRef.doc(communityId);
      batch.update(communityRef, {
        memberCount: memberCount,
        leaderCount: leaderCount
      });
      communitiesUpdated++;
    }

    await batch.commit();

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
