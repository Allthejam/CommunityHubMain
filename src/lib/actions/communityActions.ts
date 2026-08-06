
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  message?: string;
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
  courierDeliveryFee?: number;
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
            
            const finalStatus = communityData?.status;

            transaction.set(userRef, {
                role: 'president',
                title: 'President',
                communityId: communityId,
                homeCommunityId: communityId,
                memberOf: FieldValue.arrayUnion(communityId),
                communityRoles: {
                    [communityId]: {
                        role: 'president',
                        title: 'President'
                    }
                },
                permissions: {
                    dashboards: {
                        leader: true
                    }
                }
            }, { merge: true });

            transaction.update(communityRef, {
                leaderCount: FieldValue.increment(1),
                status: finalStatus,
                revenueShare: 40
            });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error claiming community leadership:", error);
        return { success: false, error: error.message };
    }
}


export async function runSaveNewsCategories(params: { communityId: string; categories: string[] }): Promise<ActionResponse> {
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
    const applicationsRef = firestore.collection('liaison_applications');
    const q = applicationsRef
        .where('applicantId', '==', officerId)
        .where('status', '==', 'Approved');
    const approvedAppsSnapshot = await q.get();

    if (approvedAppsSnapshot.empty) {
        throw new Error("This user is not a verified police liaison officer.");
    }
    const applicationData = approvedAppsSnapshot.docs[0].data();
    
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
    
    const defaultLiaisonPermissions = {
        viewReports: true,
        viewNotifications: true,
        canViewAllCommunityReports: false,
        viewableReportCategories: ['Report a crime'],
    };

    batch.update(userRef, {
        [`communityRoles.${communityId}`]: {
            role: 'police-liaison-officer',
            title: 'Police Liaison Officer',
            permissions: defaultLiaisonPermissions,
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

    batch.update(communityProfileRef, {
      policeContact: FieldValue.delete()
    });

    batch.update(userRef, {
      [`communityRoles.${communityId}`]: FieldValue.delete()
    });
    
    const communityDoc = await firestore.collection('communities').doc(communityId).get();
    const communityName = communityDoc.data()?.name || 'a community';

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

export async function runSaveCommunityBoundary(params: { 
    communityId: string; 
    geoJsonString: string | null;
    overlapInfo?: {
        overlappingCommunityId: string;
        overlappingCommunityName: string;
        currentCommunityName: string;
    }
}): Promise<ActionResponse> {
    const { communityId, geoJsonString, overlapInfo } = params;
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();

        const communityRef = firestore.collection('communities').doc(communityId);
        batch.update(communityRef, { boundary: geoJsonString || FieldValue.delete() });

        if (overlapInfo) {
            const usersRef = firestore.collection('users');
            const roleQuery = usersRef
                .where(`communityRoles.${overlapInfo.overlappingCommunityId}.role`, 'in', ['leader', 'president'])
                .limit(1);
            let leaderSnapshot = await roleQuery.get();

            if (leaderSnapshot.empty) {
                const primaryLeaderQuery = usersRef
                    .where('homeCommunityId', '==', overlapInfo.overlappingCommunityId)
                    .where('role', 'in', ['leader', 'president'])
                    .limit(1);
                leaderSnapshot = await primaryLeaderQuery.get();
            }

            if (!leaderSnapshot.empty) {
                const leaderId = leaderSnapshot.docs[0].id;
                const notificationRef = firestore.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientId: leaderId,
                    type: 'Boundary Dispute',
                    subject: `Boundary Overlap with ${overlapInfo.currentCommunityName}`,
                    from: 'Platform System',
                    date: Timestamp.now(),
                    status: 'new',
                    details: {
                        message: `The community "${overlapInfo.currentCommunityName}" has saved a new boundary that overlaps with your community, "${overlapInfo.overlappingCommunityName}".`,
                        reportingCommunityId: communityId,
                        reportingCommunityName: overlapInfo.currentCommunityName,
                        overlappingCommunityId: overlapInfo.overlappingCommunityId,
                        overlappingCommunityName: overlapInfo.overlappingCommunityName,
                    },
                    actionUrl: `/leader/settings` 
                });
            }
        }
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error in runSaveCommunityBoundary:", error);
        return { success: false, error: error.message };
    }
}

export async function runCheckBoundaryOverlap(params: { communityId: string; geoJson: any }): Promise<{ overlaps: boolean; reason: string; conflictingCommunityId?: string; conflictingCommunityName?: string; conflictingCommunityGeoJson?: string; }> {
    const { communityId, geoJson } = params;

    const getBoundingBox = (geom: any): [number, number, number, number] => {
        let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
        const coordinates = geom.coordinates[0]; 
        for (const [lon, lat] of coordinates) {
            minLon = Math.min(minLon, lon);
            minLat = Math.min(minLat, lat);
            maxLon = Math.max(maxLon, lon);
            maxLat = Math.max(maxLat, lat);
        }
        return [minLon, minLat, maxLon, maxLat];
    };

    const doBoundingBoxesOverlap = (boxA: [number, number, number, number], boxB: [number, number, number, number]): boolean => {
        const [minLonA, minLatA, maxLonA, maxLatA] = boxA;
        const [minLonB, minLatB, maxLonB, maxLatB] = boxB;
        if (maxLonA < minLonB || minLonA > maxLonB || maxLatA < minLatB || minLatA > maxLatB) {
            return false;
        }
        return true;
    };

    try {
        const { firestore } = initializeAdminApp();
        const communitiesRef = firestore.collection('communities');
        
        const snapshot = await communitiesRef.where('boundary', '!=', null).get();

        if (!geoJson?.geometry?.coordinates) {
             throw new Error("Invalid GeoJSON provided for checking.");
        }

        const newBoundaryBox = getBoundingBox(geoJson.geometry);

        for (const doc of snapshot.docs) {
            if (doc.id === communityId) {
                continue; 
            }

            const data = doc.data();
            if (data.boundary) {
                try {
                    const existingGeoJson = JSON.parse(data.boundary);
                     if (!existingGeoJson?.geometry?.coordinates) {
                        continue; 
                    }
                    const existingBoundaryBox = getBoundingBox(existingGeoJson.geometry);
                    
                    if (doBoundingBoxesOverlap(newBoundaryBox, existingBoundaryBox)) {
                        return {
                            overlaps: true,
                            reason: `Boundary may overlap with '${data.name}'.`,
                            conflictingCommunityId: doc.id,
                            conflictingCommunityName: data.name,
                            conflictingCommunityGeoJson: data.boundary
                        };
                    }
                } catch (e) {
                    console.warn(`Could not parse boundary for community ${doc.id}`);
                }
            }
        }
        
        return { overlaps: false, reason: "No overlaps detected with neighboring communities." };

    } catch (error: any) {
        console.error("Error during boundary overlap check:", error);
        return {
            overlaps: false,
            reason: `An error occurred during verification: ${error.message}`
        };
    }
}

export async function runCreateDisputeFromOverlap(params: {
  reportingCommunityId: string;
  reportingCommunityName: string;
  overlappingCommunityId: string;
  overlappingCommunityName: string;
  reportedBy: string;
}): Promise<ActionResponse> {
  const { reportingCommunityId, reportingCommunityName, overlappingCommunityId, overlappingCommunityName, reportedBy } = params;
  try {
    const { firestore } = initializeAdminApp();
    const adminUsersQuery = firestore.collection('users').where('role', 'in', ['admin', 'owner']);
    const adminSnapshot = await adminUsersQuery.get();

    if (adminSnapshot.empty) {
        return { success: true, message: "Dispute logged." };
    }

    const batch = firestore.batch();
    const subject = `Boundary Dispute: ${reportingCommunityName} vs ${overlappingCommunityName}`;
    const details = {
      message: `${reportedBy} from ${reportingCommunityName} has raised a boundary dispute.`,
      reportingCommunityId,
      reportingCommunityName,
      overlappingCommunityId,
      overlappingCommunityName,
    };

    adminSnapshot.forEach(adminDoc => {
        const notificationRef = firestore.collection('notifications').doc();
        batch.set(notificationRef, {
            recipientId: adminDoc.id,
            type: 'Boundary Dispute',
            subject: subject,
            from: 'Platform System',
            date: Timestamp.now(),
            status: 'new',
            details: details,
            actionUrl: `/admin/settings`
        });
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error creating boundary dispute:", error);
    return { success: false, error: error.message };
  }
}

export async function runGetAllBoundaries(): Promise<{ boundaries: { id: string; name: string; boundary: string }[] }> {
    try {
        const { firestore } = initializeAdminApp();
        
        const communitiesPromise = firestore.collection('communities').where('boundary', '!=', null).get();
        const locationsPromise = firestore.collection('locations').where('boundary', '!=', null).get();
        
        const [communitiesSnapshot, locationsSnapshot] = await Promise.all([communitiesPromise, locationsPromise]);

        const boundaries: { id: string; name: string; boundary: string }[] = [];
        
        communitiesSnapshot.forEach(doc => {
            boundaries.push({
                id: doc.id,
                name: doc.data().name,
                boundary: doc.data().boundary,
            });
        });
        
        locationsSnapshot.forEach(doc => {
            boundaries.push({
                id: doc.id,
                name: doc.data().name,
                boundary: doc.data().boundary,
            });
        });

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
            if (data.role === 'police-liaison-officer' && data.communityId) {
                liaisonMap.set(data.communityId, true);
            }
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

export async function saveCourierDeliveryFeeAction(params: {
    communityId: string;
    fee: number;
}): Promise<ActionResponse> {
    const { communityId, fee } = params;
    if (!communityId || fee === undefined) {
        return { success: false, error: "Community ID and fee are required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.collection('communities').doc(communityId);
        await communityRef.update({ courierDeliveryFee: fee });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function getShowHomeCommunityIdAction(): Promise<{ id: string | null; error?: string }> {
  try {
    const { firestore } = initializeAdminApp();
    const communitiesRef = firestore.collection('communities');
    const q = communitiesRef.where("name", "==", "Show Home Community, 'Display Only'").limit(1);
    const snapshot = await q.get();
    if (snapshot.empty) {
      return { id: null, error: "Show Home Community not found." };
    }
    const communityId = snapshot.docs[0].id;
    return { id: communityId };
  } catch (error: any) {
    console.error("Error fetching Show Home Community:", error);
    return { id: null, error: error.message };
  }
}

export async function getCourierDeliveryFeeAction(communityId: string): Promise<{ fee: number }> {
    try {
        const { firestore } = initializeAdminApp();
        const docSnap = await firestore.collection('communities').doc(communityId).get();
        if (docSnap.exists) {
            return { fee: docSnap.data()?.courierDeliveryFee || 0 };
        }
        return { fee: 0 };
    } catch (error) {
        console.error("Error fetching courier fee:", error);
        return { fee: 0 };
    }
}
