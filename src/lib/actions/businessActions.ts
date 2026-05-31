'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { uploadImageAction } from "./storageActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export type BusinessListing = {
  id: string;
  businessName: string;
  businessCategory: string;
  accountType?: string;
  status:
    | "Pending Approval"
    | "Approved"
    | "Requires Amendment"
    | "Declined"
    | "Subscribed"
    | "Draft"
    | "Hidden";
  createdAt?: { toDate: () => Date };
  submittedAt?: { toDate: () => Date };
  subscriptionExpiresAt?: { toDate: () => Date };
};

/**
 * Internal helper to find base64 images in business data and upload them to storage.
 * This prevents hitting the 1MB Firestore document size limit.
 */
async function processAndUploadBase64Images(data: any, businessId: string) {
    const upload = async (base64: string, prefix: string) => {
        if (!base64 || !base64.startsWith('data:image')) return base64;
        
        // Extract a clean path
        const path = `business_assets/${businessId}/${prefix}_${Date.now()}`;
        const result = await uploadImageAction({ base64Data: base64, path });
        
        if (result.success && result.url) {
            return result.url;
        }
        console.error(`Failed to upload ${prefix} image:`, result.error);
        return base64; 
    };

    // Process top-level images
    if (data.logoImage) {
        data.logoImage = await upload(data.logoImage, 'logo');
    }
    if (data.bannerImage) {
        data.bannerImage = await upload(data.bannerImage, 'banner');
    }

    // Process Page Two content blocks
    if (Array.isArray(data.pageTwoContent)) {
        for (const block of data.pageTwoContent) {
            if (block.image) {
                block.image = await upload(block.image, `block_${block.id}`);
            }
        }
    }
}

export async function deleteBusinessAction(params: {
  businessId: string;
  userId: string;
}): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    await firestore.collection('businesses').doc(params.businessId).delete();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting business:', error);
    return { success: false, error: error.message };
  }
}

export async function updateBusinessStatusAction(params: {
    businessId: string,
    status: BusinessListing['status'],
    amendmentReason?: string;
}): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const updateData: {status: string, amendmentReason?: string | FieldValue, pageThreeTypeLocked?: boolean} = { status: params.status };
        if (params.status === 'Requires Amendment' && params.amendmentReason) {
            updateData.amendmentReason = params.amendmentReason;
        } else {
            updateData.amendmentReason = FieldValue.delete();
        }
        
        if (params.status === 'Approved' || params.status === 'Subscribed') {
            updateData.pageThreeTypeLocked = true;
        }

        await firestore.collection('businesses').doc(params.businessId).update(updateData);
        return { success: true };
    } catch (error: any) {
        console.error('Error updating business status:', error);
        return { success: false, error: error.message };
    }
}

export async function runCreateBusiness(businessData: any): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const { businessId, ownerId, additionalCommunities, pageThreeType, pageThreeContent, meetingMinutes, ...data } = businessData;
    const additionalCommunityIds = (additionalCommunities || []).map((c: any) => c.community).filter(Boolean);
    
    const docId = businessId || firestore.collection('businesses').doc().id;

    // PREVENT 1MB LIMIT ERROR: Pre-process and upload any base64 images to Storage
    await processAndUploadBase64Images(data, docId);

    if (businessId) {
      // This is an update
      const businessRef = firestore.collection('businesses').doc(businessId);
      
      await firestore.runTransaction(async (transaction) => {
        const businessDoc = await transaction.get(businessRef);
        if (!businessDoc.exists) {
            throw new Error("Business not found.");
        }
        const existingData = businessDoc.data()!;
        
        let finalStatus = data.status; 
        let shouldNotifyLeader = false;
        let notificationSubject = '';

        if (existingData.status === 'Subscribed' || existingData.status === 'Approved') {
            finalStatus = existingData.status;
            shouldNotifyLeader = true;
            notificationSubject = `A subscribed business has updated their profile: ${data.businessName}`;
        } else if (data.status === 'Pending Approval') {
            finalStatus = 'Pending Approval';
            shouldNotifyLeader = true;
            notificationSubject = `Business requires re-approval: ${data.businessName}`;
        }

        const updatePayload: any = {
            ...data,
            additionalCommunities: additionalCommunities || [],
            additionalCommunityIds: additionalCommunityIds,
            pageThreeType: pageThreeType,
            pageThreeContent: pageThreeType === 'custom' ? pageThreeContent : "",
            meetingMinutes: pageThreeType === 'minutes' ? meetingMinutes : [],
            ownerId,
            updatedAt: Timestamp.now(),
            status: finalStatus, 
        };
        
        if (!existingData.pageThreeTypeLocked && (finalStatus === 'Approved' || finalStatus === 'Subscribed')) {
            updatePayload.pageThreeTypeLocked = true;
        }

        if (finalStatus === 'Pending Approval') {
            updatePayload.submittedAt = Timestamp.now();
        }

        transaction.update(businessRef, updatePayload);

        // Send a notification to the leader if needed
        if (shouldNotifyLeader && data.primaryCommunityId) {
            const usersRef = firestore.collection('users');
            let leaderSnapshot = await usersRef.where(`communityRoles.${data.primaryCommunityId}.role`, 'in', ['leader', 'president']).limit(1).get();

            if (leaderSnapshot.empty) {
                leaderSnapshot = await usersRef.where('homeCommunityId', '==', data.primaryCommunityId).where('role', 'in', ['leader', 'president']).limit(1).get();
            }

            if (!leaderSnapshot.empty) {
                const leaderId = leaderSnapshot.docs[0].id;
                const notificationRef = firestore.collection('notifications').doc();
                
                transaction.set(notificationRef, {
                    recipientId: leaderId,
                    communityId: data.primaryCommunityId,
                    type: 'Business Submission',
                    subject: notificationSubject,
                    from: data.ownerName || 'An enterprise user',
                    date: Timestamp.now(),
                    status: 'new',
                    relatedId: businessId,
                    targetApp: 'main'
                });
            }
        }
      });
    } else {
      // This is a new creation
      const initialStatus = 'Pending Approval';
      const newBusinessRef = firestore.collection('businesses').doc(docId);

      const createPayload: any = {
        ...data,
        additionalCommunities: additionalCommunities || [],
        additionalCommunityIds: additionalCommunityIds,
        pageThreeType: pageThreeType,
        pageThreeContent: pageThreeType === 'custom' ? pageThreeContent : "",
        meetingMinutes: pageThreeType === 'minutes' ? meetingMinutes : [],
        pageThreeTypeLocked: false,
        status: initialStatus,
        ownerId,
        createdAt: Timestamp.now(),
        submittedAt: Timestamp.now(),
      };
      
      const batch = firestore.batch();
      batch.set(newBusinessRef, createPayload);

      if (initialStatus === 'Pending Approval' && data.primaryCommunityId) {
          const usersRef = firestore.collection('users');
          let leaderSnapshot = await usersRef.where(`communityRoles.${data.primaryCommunityId}.role`, 'in', ['leader', 'president']).limit(1).get();

          if (leaderSnapshot.empty) {
              leaderSnapshot = await usersRef.where('homeCommunityId', '==', data.primaryCommunityId).where('role', 'in', ['leader', 'president']).limit(1).get();
          }

          if (!leaderSnapshot.empty) {
              const leaderId = leaderSnapshot.docs[0].id;
              const notificationRef = firestore.collection('notifications').doc();
              batch.set(notificationRef, {
                  recipientId: leaderId,
                  communityId: data.primaryCommunityId,
                  type: 'Business Submission',
                  subject: `New business for approval: ${data.businessName}`,
                  from: data.ownerName || 'An enterprise user', 
                  date: Timestamp.now(),
                  status: 'new',
                  relatedId: newBusinessRef.id,
                  targetApp: 'main'
              });
          }
      }
      
      await batch.commit();
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error creating/updating business:", error);
    return { success: false, error: error.message };
  }
}

export async function saveBusinessAsDraft(params: {
  userId: string;
  businessData: any;
}): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const { userId, businessData } = params;
    const { id, additionalCommunities, pageThreeType, pageThreeContent, meetingMinutes, ...dataToSave } = businessData;
    const additionalCommunityIds = (additionalCommunities || []).map((c: any) => c.community).filter(Boolean);
    
    const docId = id || firestore.collection('businesses').doc().id;

    // PREVENT 1MB LIMIT ERROR: Pre-process and upload any base64 images to Storage
    await processAndUploadBase64Images(dataToSave, docId);

    const draftData = {
        ...dataToSave,
        additionalCommunities: additionalCommunities || [],
        additionalCommunityIds: additionalCommunityIds,
        pageThreeType: pageThreeType,
        pageThreeContent: pageThreeType === 'custom' ? pageThreeContent : "",
        meetingMinutes: pageThreeType === 'minutes' ? meetingMinutes : [],
        pageThreeTypeLocked: false,
        status: 'Draft',
        ownerId: userId,
        accountType: businessData.accountType || 'business',
    };

    const businessRef = firestore.collection('businesses').doc(docId);
    
    if (id) {
        await businessRef.set({ ...draftData, updatedAt: Timestamp.now() }, { merge: true });
    } else {
        await businessRef.set({
            ...draftData,
            createdAt: Timestamp.now(),
        });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveAsFreeListingAction(params: {
  businessId: string;
  communityId: string;
}): Promise<ActionResponse> {
  const { businessId, communityId } = params;
  if (!businessId || !communityId) {
    return { success: false, error: "Business ID and Community ID are required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    
    await firestore.runTransaction(async (transaction) => {
      const communityRef = firestore.collection('communities').doc(communityId);
      const businessRef = firestore.collection('businesses').doc(businessId);
      
      const [communityDoc, businessDoc] = await Promise.all([
          transaction.get(communityRef),
          transaction.get(businessRef)
      ]);

      if (!communityDoc.exists) {
        throw new Error("Community not found.");
      }
      if (!businessDoc.exists) {
        throw new Error("Business not found.");
      }

      const communityData = communityDoc.data()!;
      const lastGranted = communityData.freeListingGrantedAt?.toDate();

      if (lastGranted) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (lastGranted > oneYearAgo) {
          throw new Error(`A free listing has already been granted in the last year (on ${lastGranted.toLocaleDateString()}).`);
        }
      }
      
      const businessData = businessDoc.data()!;

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      transaction.update(businessRef, {
        status: 'Subscribed',
        storefrontSubscription: true,
        isFreeListing: true,
        freeListingExpiresAt: Timestamp.fromDate(oneYearFromNow),
      });

      transaction.update(communityRef, {
        freeListingGrantedAt: Timestamp.now(),
      });
      
      if(businessData && businessData.ownerId) {
          const notificationRef = firestore.collection('notifications').doc();
          transaction.set(notificationRef, {
            recipientId: businessData.ownerId,
            type: "Business Submission",
            subject: `Your business "${businessData.businessName}" was granted a free 1-year listing!`,
            from: "Community Leader",
            date: Timestamp.now().toDate().toISOString(),
            status: 'new',
            relatedId: businessId,
            communityId: communityId,
            targetApp: 'main'
          });
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error approving free listing:", error);
    return { success: false, error: error.message };
  }
}

export async function cancelFreeListingAction(params: {
  businessId: string;
}): Promise<ActionResponse> {
  const { businessId } = params;
  if (!businessId) {
    return { success: false, error: 'Business ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const businessRef = firestore.collection('businesses').doc(businessId);
    await businessRef.update({
      status: 'Pending Approval',
      isFreeListing: FieldValue.delete(),
      freeListingExpiresAt: FieldValue.delete(),
      storefrontSubscription: false,
    });
    return { success: true };
  } catch (error: any) {
    console.error(`Error cancelling free listing for business ${businessId}:`, error);
    return { success: false, error: error.message || 'Failed to cancel free listing.' };
  }
}

type NationalAdvertiserProfileData = {
    companyName?: string;
    contactEmail?: string;
    website?: string;
    country?: string;
    shortDescription?: string;
    longDescription?: string;
    socialMediaLinks?: { type: string; url: string }[];
};

export async function saveNationalAdvertiserProfile(params: {
  userId: string;
  profileData: NationalAdvertiserProfileData;
  logoUrl: string | null;
  bannerUrl: string | null;
  status: 'Draft' | 'Pending Approval';
}): Promise<ActionResponse> {
  const { userId, profileData, logoUrl, bannerUrl, status } = params;
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);

    const companyProfilePayload: any = {
      ...profileData,
      logoUrl,
      bannerUrl,
      status,
      updatedAt: Timestamp.now(),
    };
    
    if(status === 'Pending Approval') {
      const userDoc = await userRef.get();
      const existingProfile = userDoc.data()?.companyProfile;
      if (!existingProfile?.submittedAt) {
          companyProfilePayload.submittedAt = Timestamp.now();
      }
    }
    
    await userRef.set({
      companyProfile: companyProfilePayload
    }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error saving advertiser profile:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePageTwoBlock(businessId: string, block: { id: string; text: string; image: string | null }): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    const businessRef = firestore.collection('businesses').doc(businessId);
    
    try {
        await firestore.runTransaction(async (transaction) => {
            const doc = await transaction.get(businessRef);
            if (!doc.exists) {
                throw new Error("Business not found");
            }
            const data = doc.data();
            const pageTwoContent = data?.pageTwoContent || [];
            
            const existingIndex = pageTwoContent.findIndex((b: any) => b.id === block.id);
            
            // PREVENT 1MB LIMIT ERROR: If the block image is base64, upload it first
            if (block.image && block.image.startsWith('data:image')) {
                const path = `business_assets/${businessId}/blocks/${block.id}_${Date.now()}`;
                const res = await uploadImageAction({ base64Data: block.image, path });
                if (res.success && res.url) {
                    block.image = res.url;
                }
            }

            if (existingIndex > -1) {
                pageTwoContent[existingIndex] = block;
            } else {
                pageTwoContent.push(block);
            }
            
            transaction.update(businessRef, { pageTwoContent, updatedAt: Timestamp.now() });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating Page 2 block:", error);
        return { success: false, error: error.message };
    }
}

export async function deletePageTwoBlock(businessId: string, blockId: string): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    const businessRef = firestore.collection('businesses').doc(businessId);
    try {
        await firestore.runTransaction(async (transaction) => {
            const doc = await transaction.get(businessRef);
            if (!doc.exists) {
                throw new Error("Business not found");
            }
            const data = doc.data();
            const pageTwoContent = (data?.pageTwoContent || []).filter((b: any) => b.id !== blockId);
            transaction.update(businessRef, { pageTwoContent, updatedAt: Timestamp.now() });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting Page 2 block:", error);
        return { success: false, error: error.message };
    }
}

export async function addMeetingMinuteAction(params: { businessId: string; minuteData: any }): Promise<ActionResponse & { newMinute?: any }> {
    const { firestore } = initializeAdminApp();
    const businessRef = firestore.collection('businesses').doc(params.businessId);
    try {
        const now = Timestamp.now();
        const minuteToSave = {
            ...params.minuteData,
            id: firestore.collection('whatever').doc().id, 
            createdAt: now,
            date: params.minuteData.date ? Timestamp.fromDate(new Date(params.minuteData.date)) : now,
        };

        await businessRef.update({
            meetingMinutes: FieldValue.arrayUnion(minuteToSave)
        });

        const newMinuteForClient = {
            ...minuteToSave,
            createdAt: now.toDate().toISOString(),
            date: minuteToSave.date.toDate().toISOString(),
        };

        return { success: true, newMinute: newMinuteForClient };
    } catch (error: any) {
        console.error("Error adding meeting minute:", error);
        return { success: false, error: error.message };
    }
}

export async function updateMeetingMinuteAction(params: { businessId: string; minuteData: any }): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    const businessRef = firestore.collection('businesses').doc(params.businessId);
    try {
        await firestore.runTransaction(async (transaction) => {
            const doc = await transaction.get(businessRef);
            if (!doc.exists) throw new Error("Business not found");
            const meetingMinutes = doc.data()?.meetingMinutes || [];
            const index = meetingMinutes.findIndex((m: any) => m.id === params.minuteData.id);
            
            if (index > -1) {
                const existingMinute = meetingMinutes[index];
                meetingMinutes[index] = {
                    ...existingMinute,
                    title: params.minuteData.title,
                    content: params.minuteData.content,
                    pdfUrl: params.minuteData.pdfUrl || null,
                    date: Timestamp.fromDate(new Date(params.minuteData.date))
                };
                transaction.update(businessRef, { meetingMinutes, updatedAt: Timestamp.now() });
            } else {
                throw new Error("Minute not found to update.");
            }
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating meeting minute:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteMeetingMinuteAction(params: { businessId: string; minuteId: string }): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    const businessRef = firestore.collection('businesses').doc(params.businessId);
    try {
        await firestore.runTransaction(async (transaction) => {
            const doc = await transaction.get(businessRef);
            if (!doc.exists) throw new Error("Business not found");
            const meetingMinutes = (doc.data()?.meetingMinutes || []).filter((m: any) => m.id !== params.minuteId);
            transaction.update(businessRef, { meetingMinutes, updatedAt: Timestamp.now() });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
