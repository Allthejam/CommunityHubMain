

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  id?: string;
};

export async function updateAdvertAction(advertData: {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  price: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  image: string | null;
  isFamilyFriendly: boolean;
  status: string;
}): Promise<ActionResponse> {
  const { id, ...dataToUpdate } = advertData;
  if (!id) {
    return { success: false, error: 'Advert ID is required for an update.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const advertRef = firestore.collection('adverts').doc(id);

    const updatePayload: any = {
      ...dataToUpdate,
      status: 'Pending Approval', // Always re-submit on edit
      updatedAt: Timestamp.now(),
      submittedAt: Timestamp.now(), // Re-submitted for approval
    };

    if (dataToUpdate.startDate) {
      updatePayload.startDate = Timestamp.fromDate(new Date(dataToUpdate.startDate));
    }
    if (dataToUpdate.endDate) {
      updatePayload.endDate = Timestamp.fromDate(new Date(dataToUpdate.endDate));
    }

    await advertRef.update(updatePayload);
    
    // Notify leader
    const advertDoc = await advertRef.get();
    const fullAdvertData = advertDoc.data();
    if(fullAdvertData && fullAdvertData.communityId) {
        const usersRef = firestore.collection('users');
        const roleQuery = usersRef
            .where(`communityRoles.${fullAdvertData.communityId}.role`, 'in', ['leader', 'president'])
            .limit(1);
        let leaderSnapshot = await roleQuery.get();

        if (leaderSnapshot.empty) {
            const primaryLeaderQuery = usersRef
                .where('homeCommunityId', '==', fullAdvertData.communityId)
                .where('role', 'in', ['leader', 'president'])
                .limit(1);
            leaderSnapshot = await primaryLeaderQuery.get();
        }

        if (!leaderSnapshot.empty) {
            const leaderId = leaderSnapshot.docs[0].id;
            // Use add() to create a new notification document
            await firestore.collection('notifications').add({
                recipientId: leaderId,
                communityId: fullAdvertData.communityId,
                type: 'Advert Approval Request',
                subject: `Advert updated, needs re-approval: ${updatePayload.title}`,
                from: updatePayload.businessName,
                date: Timestamp.now(),
                status: 'new',
                relatedId: id,
            });
        }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating advert ${id}:`, error);
    return { success: false, error: error.message || 'Failed to update advert.' };
  }
}

export async function updateAdvertStatusAction(params: {
  advertId: string;
  status: string;
  amendmentReason?: string;
}): Promise<ActionResponse> {
  const { advertId, status, amendmentReason } = params;
  if (!advertId || !status) {
    return { success: false, error: 'Advert ID and status are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const advertRef = firestore.collection('adverts').doc(advertId);
    const updateData: { status: string; amendmentReason?: string | FieldValue } = { status };

    if (status === 'Requires Amendment' && amendmentReason) {
      updateData.amendmentReason = amendmentReason;
    } else {
      updateData.amendmentReason = FieldValue.delete();
    }

    await advertRef.update(updateData);
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating advert ${advertId} to status ${status}:`, error);
    return { success: false, error: error.message || 'Failed to update advert status.' };
  }
}

export async function deleteAdvertAction(params: {
  advertId: string;
}): Promise<ActionResponse> {
  const { advertId } = params;
  if (!advertId) {
    return { success: false, error: 'Advert ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    await firestore.collection('adverts').doc(advertId).delete();
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting advert ${advertId}:`, error);
    return { success: false, error: error.message || 'Failed to delete advert.' };
  }
}

export async function saveAdvertAsDraft(params: {
  userId: string;
  advertData: any;
}): Promise<ActionResponse & { id?: string }> {
  const { userId, advertData } = params;
  if (!userId || !advertData) {
    return { success: false, error: "User ID and advert data are required." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userAccountType = userDoc.data()?.accountType;

    const { id, ...dataToSave } = advertData;
    
    // Ensure dates are converted to Timestamps if they exist
    if (dataToSave.startDate && !(dataToSave.startDate instanceof Timestamp)) {
        dataToSave.startDate = Timestamp.fromDate(new Date(dataToSave.startDate));
    }
    if (dataToSave.endDate && !(dataToSave.endDate instanceof Timestamp)) {
        dataToSave.endDate = Timestamp.fromDate(new Date(dataToSave.endDate));
    }

    const advert: any = {
        ...dataToSave,
        ownerId: userId,
        status: "Draft",
        updatedAt: Timestamp.now(),
    };
    
    // Set the scope based on the user's account type
    if (userAccountType === 'national' || userAccountType === 'advertiser' || userAccountType === 'owner') {
      advert.scope = 'national';
    } else {
        advert.scope = 'community';
    }

    let docId: string;
    if (id) {
        docId = id;
        const advertRef = firestore.collection('adverts').doc(docId);
        await advertRef.update(advert);
    } else {
        const newAdvertRef = await firestore.collection("adverts").add({
            ...advert,
            createdAt: Timestamp.now(),
        });
        docId = newAdvertRef.id;
    }

    return { success: true, id: docId };
  } catch (error: any) {
    console.error("Error saving advert draft:", error);
    return { success: false, error: error.message };
  }
}

export async function submitAdvertForApprovalAction(params: {
    userId: string;
    advertData: any;
    targeting: any;
}): Promise<ActionResponse> {
    const { userId, advertData, targeting } = params;
    if (!userId || !advertData) {
        return { success: false, error: "User and advert data are required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        const userDoc = await firestore.collection('users').doc(userId).get();
        const userProfile = userDoc.data();
        
        let businessData: any;
        let communityIdToLink: string | null = null;
        
        const isNationalAdvertiser = userProfile?.accountType === 'national' || userProfile?.accountType === 'advertiser' || userProfile?.role === 'owner';
        const advertScope = isNationalAdvertiser ? 'national' : (advertData.scope || 'community');

        if (advertScope === 'community') {
            if (advertData.businessId) {
                const businessDoc = await firestore.collection('businesses').doc(advertData.businessId).get();
                if (!businessDoc.exists) {
                    return { success: false, error: "Associated business not found." };
                }
                businessData = businessDoc.data();
                communityIdToLink = businessData?.primaryCommunityId;
            } else {
                communityIdToLink = userProfile?.communityId;
                businessData = userProfile;
            }

            if (!communityIdToLink) {
                return { success: false, error: "Could not determine community for this advert." };
            }
        } else {
            // For 'platform' or 'national' scope, no communityId is needed at the top level.
            businessData = userProfile; // The owner/advertiser is the business entity.
        }
        
        let initialStatus: 'Pending Approval' | 'Active' | 'Upcoming' = 'Pending Approval';
        
        const isEnterprise = businessData?.accountType === 'enterprise';
        const isApprovedPartner = isEnterprise && (businessData?.status === 'Approved' || businessData?.status === 'Subscribed');
        const startDate = advertData.startDate ? new Date(advertData.startDate) : new Date();

        if (isApprovedPartner || isNationalAdvertiser) {
            initialStatus = startDate <= new Date() ? 'Active' : 'Upcoming';
        }

        const { id, ...dataToSave } = advertData;

        const advertToSubmit: any = {
            ...dataToSave,
            ownerId: userId,
            scope: advertScope,
            communityId: advertScope === 'community' ? communityIdToLink : null,
            targetCategories: targeting?.categories,
            targetGender: targeting?.gender,
            targetAgeRanges: targeting?.ageRanges,
            status: initialStatus,
            updatedAt: Timestamp.now(),
        };

        // Don't overwrite createdAt if it exists (for updates)
        if (!id) {
            advertToSubmit.createdAt = Timestamp.now();
        }
        if (initialStatus !== 'Draft') {
            advertToSubmit.submittedAt = Timestamp.now();
        }
        
        // Convert dates to Timestamps
        if (advertData.startDate) advertToSubmit.startDate = Timestamp.fromDate(new Date(advertData.startDate));
        if (advertData.endDate) advertToSubmit.endDate = Timestamp.fromDate(new Date(advertData.endDate));

        let advertRef;
        if (id) {
            advertRef = firestore.collection("adverts").doc(id);
            await advertRef.update(advertToSubmit);
        } else {
            advertRef = await firestore.collection("adverts").add(advertToSubmit);
        }

        // Notify leader ONLY if it's a community advert needing approval
        if (initialStatus === 'Pending Approval' && communityIdToLink) {
            const usersRef = firestore.collection('users');
            const roleQuery = usersRef
                .where(`communityRoles.${communityIdToLink}.role`, 'in', ['leader', 'president'])
                .limit(1);
            let leaderSnapshot = await roleQuery.get();

            if (leaderSnapshot.empty) {
                const primaryLeaderQuery = usersRef
                    .where('homeCommunityId', '==', communityIdToLink)
                    .where('role', 'in', ['leader', 'president'])
                    .limit(1);
                leaderSnapshot = await primaryLeaderQuery.get();
            }
            
            if (!leaderSnapshot.empty) {
                const leaderId = leaderSnapshot.docs[0].id;
                await firestore.collection('notifications').add({
                    recipientId: leaderId,
                    communityId: communityIdToLink,
                    type: 'Advert Approval Request',
                    subject: `New advert for approval: ${advertData.title}`,
                    from: advertData.businessName || userProfile?.name,
                    date: Timestamp.now(),
                    status: 'new',
                    relatedId: advertRef.id,
                });
            }
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting advert for approval:", error);
        return { success: false, error: error.message };
    }
}
