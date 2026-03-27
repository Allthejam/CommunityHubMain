

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

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

export async function deleteBusinessAction(params: {
  businessId: string;
  userId: string;
}): Promise<ActionResponse> {
  console.log('Deleting business with params:', params);

  // In a real app, you would add more security checks here to ensure
  // the user (userId) has permission to delete this business (businessId).

  try {
    const { firestore } = initializeAdminApp();
    await firestore.collection('businesses').doc(params.businessId).delete();
    
    // You might also want to delete associated adverts, events, etc. in a transaction.

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
    console.log('Updating business status:', params);
    try {
        const { firestore } = initializeAdminApp();
        const updateData: {status: string, amendmentReason?: string | FieldValue, pageThreeTypeLocked?: boolean} = { status: params.status };
        if (params.status === 'Requires Amendment' && params.amendmentReason) {
            updateData.amendmentReason = params.amendmentReason;
        } else {
            // Remove the reason if status is not 'Requires Amendment'
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
  console.log('Creating or updating business/group with data...');
  try {
    const { firestore } = initializeAdminApp();
    const { businessId, ownerId, additionalCommunities, pageThreeType, pageThreeContent, meetingMinutes, ...data } = businessData;
    const additionalCommunityIds = (additionalCommunities || []).map((c: any) => c.community).filter(Boolean);
    
    const docId = businessId || firestore.collection('businesses').doc().id;

    if (businessId) {
      // This is an update
      const businessRef = firestore.collection('businesses').doc(businessId);
      
      await firestore.runTransaction(async (transaction) => {
        const businessDoc = await transaction.get(businessRef);
        if (!businessDoc.exists) {
            throw new Error("Business not found.");
        }
        const existingData = businessDoc.data()!;
        
        let finalStatus = data.status; // Default to status from client ('Pending Approval' or 'Draft')
        let shouldNotifyLeader = false;
        let notificationSubject = '';

        if (existingData.status === 'Subscribed' || existingData.status === 'Approved') {
            // If the business is already live, keep its status but notify leader of the edit.
            finalStatus = existingData.status;
            shouldNotifyLeader = true;
            notificationSubject = `A subscribed business has updated their profile: ${data.businessName}`;
        } else if (data.status === 'Pending Approval') {
            // If it's a draft, declined, etc. being submitted, it should go to pending and notify.
            finalStatus = 'Pending Approval';
            shouldNotifyLeader = true;
            notificationSubject = `Business requires re-approval: ${data.businessName}`;
        }
        // If just saving as draft, shouldNotifyLeader will remain false.

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
                    subject: notificationSubject, // Use the dynamic subject
                    from: data.ownerName || 'An enterprise user',
                    date: Timestamp.now(),
                    status: 'new',
                    relatedId: businessId,
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
                  from: data.ownerName || 'An enterprise user', // Fallback for ownerName
                  date: Timestamp.now(),
                  status: 'new',
                  relatedId: newBusinessRef.id,
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
  console.log('Saving business/group as draft...');
  try {
    const { firestore } = initializeAdminApp();
    const { userId, businessData } = params;
    const { id, additionalCommunities, pageThreeType, pageThreeContent, meetingMinutes, ...dataToSave } = businessData;
    const additionalCommunityIds = (additionalCommunities || []).map((c: any) => c.community).filter(Boolean);
    
    const docId = id || firestore.collection('businesses').doc().id;

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
      
      // --- ALL READS FIRST ---
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

      // --- CHECKS ---
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

      // --- ALL WRITES LAST ---
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
      
      // Also send a notification to the business owner
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
            
            if (existingIndex > -1) {
                // Update existing block
                pageTwoContent[existingIndex] = block;
            } else {
                // Add new block
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
        // The date from client is a JS Date object, convert to Timestamp for Firestore
        const minuteToSave = {
            ...params.minuteData,
            id: firestore.collection('whatever').doc().id, // generate a unique ID
            createdAt: now,
            date: params.minuteData.date ? Timestamp.fromDate(new Date(params.minuteData.date)) : now,
        };

        await businessRef.update({
            meetingMinutes: FieldValue.arrayUnion(minuteToSave)
        });

        // Prepare a serializable version to return to the client
        const newMinuteForClient = {
            ...minuteToSave,
            // Convert Timestamps to ISO strings
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


