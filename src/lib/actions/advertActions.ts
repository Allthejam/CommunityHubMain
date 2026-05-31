

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue, collection, query, where, getDocs } from "firebase-admin/firestore";
import { sendPushNotificationAction } from './notificationActions';
import { sendEmail } from './emailActions';
import { uploadImageAction } from './storageActions';

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
  shortDescription: string;
  fullDescription: string;
  startDate?: Date;
  endDate?: Date;
  image: string | null;
  videoUrl?: string;
  isFamilyFriendly: boolean;
  status: string;
  primaryLinkType: string;
  websiteLink: string;
  emailAddress: string;
  type?: string;
}): Promise<ActionResponse> {
  const { id, ...dataToUpdate } = advertData;
  if (!id) {
    return { success: false, error: 'Advert ID is required for an update.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const advertRef = firestore.collection('adverts').doc(id);

    let imageUrl = dataToUpdate.image;
    let imagePath = (await advertRef.get()).data()?.imagePath || null;
    if (imageUrl && imageUrl.startsWith('data:image')) {
        const path = `advert_images/${dataToUpdate.businessId}/${id}_${Date.now()}`;
        const uploadResult = await uploadImageAction({ base64Data: imageUrl, path });
        if (uploadResult.success && uploadResult.url) {
            imageUrl = uploadResult.url; 
            imagePath = uploadResult.path;
        } else {
            console.error("Image upload failed during advert update:", uploadResult.error);
            imageUrl = null;
            imagePath = null;
        }
    }
    
    const updatePayload: any = {
      ...dataToUpdate,
      image: imageUrl,
      imagePath: imagePath,
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
                targetApp: 'main'
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
    let finalStatus = status;

    // Defensive check: if client sends 'Approved', determine correct status here.
    if (status === 'Approved') {
        const advertDoc = await advertRef.get();
        if (advertDoc.exists) {
            const advertData = advertDoc.data();
            const startDate = advertData?.startDate?.toDate ? advertData.startDate.toDate() : new Date(0);
            finalStatus = startDate > new Date() ? 'Scheduled' : 'Active';
        }
    }
    
    const updateData: { status: string; amendmentReason?: string | FieldValue, publishedAt?: Timestamp } = { status: finalStatus };

    if (finalStatus === 'Requires Amendment' && amendmentReason) {
      updateData.amendmentReason = amendmentReason;
    } else {
      updateData.amendmentReason = FieldValue.delete();
    }
    
    // Set a publishedAt timestamp when an ad becomes active for the first time
    if (finalStatus === 'Active') {
        const currentDoc = await advertRef.get();
        // Only set publishedAt if it doesn't exist, to mark the first time it went live.
        if (!currentDoc.data()?.publishedAt) {
            updateData.publishedAt = Timestamp.now();
        }
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
    const { id, ...dataToSave } = advertData;
    
    let imageUrl = dataToSave.image;
    let imagePath = dataToSave.imagePath || null; 

    if (imageUrl && imageUrl.startsWith('data:image')) {
        const path = `advert_images/${dataToSave.businessId || userId}/${id || Date.now()}`;
        const uploadResult = await uploadImageAction({ base64Data: imageUrl, path });
        if (uploadResult.success && uploadResult.url) {
            imageUrl = uploadResult.url; 
            imagePath = uploadResult.path;
        } else {
            console.error("Image upload failed during draft save:", uploadResult.error);
            imageUrl = null;
            imagePath = null;
        }
    }

    if (dataToSave.startDate && !(dataToSave.startDate instanceof Timestamp)) {
        dataToSave.startDate = Timestamp.fromDate(new Date(dataToSave.startDate));
    }
    if (dataToSave.endDate && !(dataToSave.endDate instanceof Timestamp)) {
        dataToSave.endDate = Timestamp.fromDate(new Date(dataToSave.endDate));
    }

    const advert: any = {
        ...dataToSave,
        image: imageUrl,
        imagePath: imagePath,
        ownerId: userId,
        status: "Draft",
        updatedAt: Timestamp.now(),
        scope: (advertData.type === 'featured' || advertData.type === 'partner') ? 'national' : 'community',
    };

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
    targeting?: {
        categories: string[];
        gender: string;
        ageRanges: string[];
        targetCountryIds?: string[];
        targetStateIds?: string[];
        targetRegionIds?: string[];
    };
    isLocalFree?: boolean;
}): Promise<ActionResponse> {
    const { userId, advertData, targeting, isLocalFree } = params;
    if (!userId || !advertData) {
        return { success: false, error: "User and advert data are required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        const userDoc = await firestore.collection('users').doc(userId).get();
        const userProfile = userDoc.data();
        
        let businessData: any;
        let communityIdToLink: string | null = null;
        
        const advertScope = (advertData.type === 'featured' || advertData.type === 'partner') ? 'national' : 'community';

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
                return { success: false, error: "Could not determine a community for this advert." };
            }
        } else {
            businessData = userProfile;
        }
        
        let initialStatus: 'Pending Approval' | 'Active' | 'Scheduled' = 'Pending Approval';
        
        const isEnterprise = businessData?.accountType === 'enterprise';
        const isApprovedPartner = isEnterprise && (businessData?.status === 'Subscribed');
        const startDate = advertData.startDate ? new Date(advertData.startDate) : new Date();

        if (isApprovedPartner || isLocalFree) {
            initialStatus = startDate <= new Date() ? 'Active' : 'Scheduled';
        }

        const { id, ...dataToSave } = advertData;
        
        let imageUrl = dataToSave.image;
        let imagePath = dataToSave.imagePath || null;
        if (imageUrl && imageUrl.startsWith('data:image')) {
            const path = `advert_images/${dataToSave.businessId || userId}/${id || Date.now()}`;
            const uploadResult = await uploadImageAction({ base64Data: imageUrl, path });
            if (uploadResult.success && uploadResult.url) {
                imageUrl = uploadResult.url;
                imagePath = uploadResult.path;
            } else {
                imageUrl = null;
                imagePath = null;
            }
        }

        const advertToSubmit: any = {
            ...dataToSave,
            image: imageUrl,
            imagePath: imagePath,
            ownerId: userId,
            scope: advertScope,
            communityId: advertScope === 'community' ? communityIdToLink : null,
            status: initialStatus,
            updatedAt: Timestamp.now(),
            targetCategories: targeting?.categories || [],
            targetGender: targeting?.gender || 'all',
            targetAgeRanges: targeting?.ageRanges || [],
            targetCountryIds: targeting?.targetCountryIds || [],
            targetStateIds: targeting?.targetStateIds || [],
            targetRegionIds: targeting?.targetRegionIds || [],
            targetCountries: [], // Deprecated
            targetStates: [], // Deprecated
            targetRegions: [], // Deprecated
        };

        if (!id) {
            advertToSubmit.createdAt = Timestamp.now();
        }
        if (initialStatus !== 'Draft') {
            advertToSubmit.submittedAt = Timestamp.now();
        }
        
        if (advertData.startDate) advertToSubmit.startDate = Timestamp.fromDate(new Date(advertData.startDate));
        if (advertData.endDate) advertToSubmit.endDate = Timestamp.fromDate(new Date(advertData.endDate));

        let advertRef;
        if (id) {
            advertRef = firestore.collection("adverts").doc(id);
            await advertRef.update(advertToSubmit);
        } else {
            advertRef = await firestore.collection("adverts").add(advertToSubmit);
        }

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
                    targetApp: 'main'
                });
            }
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting advert for approval:", error);
        return { success: false, error: error.message };
    }
}
