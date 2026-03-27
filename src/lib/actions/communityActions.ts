

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export type Community = {
  id: string;
  name: string;
  type: "geographic" | "topic";
  category?: string;
  visibility: "public" | "private";
  country: string;
  state: string;
  region: string;
  leaders: number;
  status: "active" | "suspended" | "pending" | "under construction" | "under investigation";
  users: number;
  businesses: number;
  createdAt: any; 
  createdBy: string;
  monthlyIncome: number;
  revenueShare?: number;
};

export async function updateCommunityStatusAction(params: {communityId: string, newStatus: Community['status']}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ status: params.newStatus });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function renameCommunityAction(params: {communityId: string, newName: string}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ name: params.newName });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateCommunityTypeAction(params: {communityId: string, newType: Community['type']}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ type: params.newType });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateCommunityVisibilityAction(params: {communityId: string, newVisibility: Community['visibility']}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ visibility: params.newVisibility });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runSetCommunityRevenueShare(params: {communityId: string, share: number, reason: string, leaderId: string | null}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ revenueShare: params.share });
        // In a real app, you would log this change with the reason and leaderId for auditing.
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function checkCommunityLeaderAction(communityId: string): Promise<{ hasLeader: boolean }> {
  try {
    const { firestore } = initializeAdminApp();
    const usersRef = firestore.collection('users');
    const q1 = usersRef.where(`communityRoles.${communityId}.role`, 'in', ['president', 'leader']).limit(1);
    const q2 = usersRef.where('homeCommunityId', '==', communityId).where('role', 'in', ['president', 'leader']).limit(1);
    
    const [snapshot1, snapshot2] = await Promise.all([q1.get(), q2.get()]);

    return { hasLeader: !snapshot1.empty || !snapshot2.empty };
  } catch (error) {
    console.error("Error checking for community leader:", error);
    // In case of error, assume there might be a leader to be safe
    return { hasLeader: true };
  }
}

export async function claimCommunityLeadershipAction(params: { userId: string, communityId: string }): Promise<ActionResponse> {
    const { userId, communityId } = params;
    if (!userId || !communityId) {
        return { success: false, error: 'User and Community must be specified.' };
    }
    const { firestore } = initializeAdminApp();

    try {
        await firestore.runTransaction(async (transaction) => {
            const communityRef = firestore.collection('communities').doc(communityId);
            const userRef = firestore.collection('users').doc(userId);

            const [communityDoc, userDoc] = await Promise.all([
                transaction.get(communityRef),
                transaction.get(userRef)
            ]);

            if (!communityDoc.exists) throw new Error("Community does not exist.");
            if (!userDoc.exists) throw new Error("User does not exist.");
            
            const communityData = communityDoc.data();
            if ((communityData?.leaderCount || 0) > 0) {
                 throw new Error("This community already has a leader.");
            }
            
            const userData = userDoc.data()!;
            let finalStatus: Community['status'] = 'pending';

            if (userData.homeCommunityId) {
                const homeCommunityDoc = await transaction.get(firestore.collection('communities').doc(userData.homeCommunityId));
                if (homeCommunityDoc.exists && homeCommunityDoc.data()?.status === 'active') {
                    finalStatus = 'active'; // Auto-approve if user already leads an active community
                }
            }


            // Update the user's role
            transaction.update(userRef, {
                role: 'president',
                title: 'President',
                communityId: communityId, // Make this their primary community
                homeCommunityId: communityId,
                memberOf: FieldValue.arrayUnion(communityId),
                [`communityRoles.${communityId}`]: {
                    role: 'president',
                    title: 'President'
                }
            });

            // Update the community's leader count and status
            transaction.update(communityRef, {
                leaderCount: FieldValue.increment(1),
                status: finalStatus,
                revenueShare: 40 // Set default revenue share
            });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error claiming community leadership:", error);
        return { success: false, error: error.message };
    }
}


export async function runSaveNewsCategories(params: { communityId: string; categories: string[] }): Promise<ActionResponse> {
    console.log('Saving news categories:', params);
    try {
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ newsCategories: params.categories });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runSavePoliceLiaison(params: {
  communityId: string;
  officerId: string;
}): Promise<ActionResponse> {
  const { communityId, officerId } = params;
  if (!communityId || !officerId) {
    return { success: false, error: 'Community and Officer ID are required.' };
  }

  const { firestore } = initializeAdminApp();
  try {
    // NEW CHECK: Verify against approved applications, not the user's primary role.
    const applicationsRef = firestore.collection('liaison_applications');
    const q = applicationsRef
        .where('applicantId', '==', officerId)
        .where('status', '==', 'Approved');
    const approvedAppsSnapshot = await q.get();

    if (approvedAppsSnapshot.empty) {
        throw new Error("This user is not a verified police liaison officer (no approved application found).");
    }
    // Get data from the first approved app to populate station details etc.
    const applicationData = approvedAppsSnapshot.docs[0].data();
    
    // Get the officer's current data for their name and email.
    const officerDoc = await firestore.collection('users').doc(officerId).get();
    if (!officerDoc.exists) {
        throw new Error("Selected officer user profile does not exist.");
    }
    const officerData = officerDoc.data()!;
    
    const batch = firestore.batch();
    const communityProfileRef = firestore.collection('community_profiles').doc(communityId);
    
    const policeContactPayload = {
        officerId: officerId,
        officerName: officerData.name,
        contactEmail: officerData.email,
        officerRank: applicationData.applicantTitle || '',
        stationName: applicationData.stationName || '',
        stationAddress: applicationData.stationAddress || '',
        contactPhone: applicationData.stationPhoneNumber || '',
    };
    
    batch.set(communityProfileRef, { policeContact: policeContactPayload }, { merge: true });
    
    const userRef = firestore.collection('users').doc(officerId);
    batch.update(userRef, {
        [`communityRoles.${communityId}`]: {
            role: 'police-liaison-officer',
            title: 'Police Liaison Officer',
        },
        memberOf: FieldValue.arrayUnion(communityId)
    });

    const communityDoc = await firestore.collection('communities').doc(communityId).get();
    const communityName = communityDoc.data()?.name || 'a community';

    const notificationRef = firestore.collection('notifications').doc();
    batch.set(notificationRef, {
        recipientId: officerId,
        type: "Account Update",
        subject: `You have been assigned as Police Liaison for ${communityName}`,
        from: "Community Leadership",
        date: Timestamp.now(),
        status: 'new',
        relatedId: communityId,
        communityId: communityId,
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error saving police liaison:", error);
    return { success: false, error: error.message };
  }
}

export async function runRemovePoliceLiaison(params: {
  communityId: string;
  officerId: string;
}): Promise<ActionResponse> {
  const { communityId, officerId } = params;
  if (!communityId || !officerId) {
    return { success: false, error: "Community and Officer ID are required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    const communityProfileRef = firestore.collection('community_profiles').doc(communityId);
    const userRef = firestore.collection('users').doc(officerId);
    const notificationRef = firestore.collection('notifications').doc();

    const batch = firestore.batch();

    // Remove policeContact from community_profiles
    batch.update(communityProfileRef, {
      policeContact: FieldValue.delete()
    });

    // Remove community role from user
    batch.update(userRef, {
      [`communityRoles.${communityId}`]: FieldValue.delete()
    });
    
    // Get community name for notification
    const communityDoc = await firestore.collection('communities').doc(communityId).get();
    const communityName = communityDoc.data()?.name || 'a community';

    // Notify the officer
    batch.set(notificationRef, {
      recipientId: officerId,
      type: "Account Update",
      subject: `You have been unassigned as Police Liaison for ${communityName}`,
      from: "Community Leadership",
      date: Timestamp.now(),
      status: 'new',
      relatedId: communityId,
      communityId: communityId,
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error removing police liaison:", error);
    return { success: false, error: error.message };
  }
}

export async function runSaveCommunityBoundary(params: { communityId: string; geoJsonString: string }): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ boundary: params.geoJsonString });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runCheckBoundaryOverlap(params: { communityId: string; geoJson: any }): Promise<{ overlaps: boolean; reason: string; overlappingCommunityId?: string; overlappingCommunityName?: string; conflictingCommunityGeoJson?: string; }> {
    // This is a simplified mock. A real implementation would use a geospatial database or service.
    if (params.geoJson.geometry.coordinates[0][0][0] > 0) {
        return { 
            overlaps: true, 
            reason: "Boundary overlaps with 'Eastwood'.",
            overlappingCommunityId: "mock-eastwood-id",
            overlappingCommunityName: "Eastwood",
            // In a real scenario, you'd fetch and return the actual GeoJSON of the conflicting community
            conflictingCommunityGeoJson: JSON.stringify(params.geoJson.geometry) 
        };
    }
    return { overlaps: false, reason: "No overlaps detected with neighboring communities." };
}

export async function runCreateDisputeFromOverlap(params: {
  reportingCommunityId: string;
  reportingCommunityName: string;
  overlappingCommunityId: string;
  overlappingCommunityName: string;
  reportedBy: string;
}): Promise<ActionResponse> {
  try {
    // In a real app, this would create a dispute ticket in a separate collection for admin review.
    console.log("Dispute created:", params);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runGetAllBoundaries(): Promise<{ boundaries: { id: string; name: string; boundary: string }[] }> {
    try {
        const { firestore } = initializeAdminApp();
        const communitiesRef = firestore.collection('communities');
        const snapshot = await communitiesRef.where('boundary', '!=', null).get();

        if (snapshot.empty) {
            return { boundaries: [] };
        }

        const boundaries = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            boundary: doc.data().boundary,
        }));

        return { boundaries };
    } catch (error) {
        console.error("Error fetching all boundaries:", error);
        return { boundaries: [] };
    }
}

export async function getCommunitiesWithLiaisonStatus(): Promise<{ communities: { id: string; name: string; hasLiaison: boolean }[] }> {
    try {
        const { firestore } = initializeAdminApp();
        const communitiesSnapshot = await firestore.collection('communities').get();
        const usersSnapshot = await firestore.collection('users').get();

        const liaisonMap = new Map<string, boolean>();
        usersSnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Check primary role
            if (data.role === 'police-liaison-officer' && data.communityId) {
                liaisonMap.set(data.communityId, true);
            }
            // Check secondary roles in communityRoles map
            if (data.communityRoles) {
                Object.keys(data.communityRoles).forEach(communityId => {
                    if (data.communityRoles[communityId]?.role === 'police-liaison-officer') {
                        liaisonMap.set(communityId, true);
                    }
                });
            }
        });

        const communities = communitiesSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            hasLiaison: liaisonMap.has(doc.id),
        }));

        return { communities };
    } catch (error) {
        console.error("Error fetching communities with liaison status:", error);
        return { communities: [] };
    }
}
