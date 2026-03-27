
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";

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
