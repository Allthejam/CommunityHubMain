
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { sendEmail } from './emailActions';
import { getStorage } from 'firebase-admin/storage';


type ActionResponse = {
  success: boolean;
  error?: string;
};

type CourierApplicationData = {
    applicantId: string;
    applicantName: string;
    communityId: string;
    communityName: string;
    statement: string;
    vehicleDetails: string;
    agreedToTerms: boolean;
    licenseImage: string;
    selfieImage: string;
    contactEmail: string;
    contactPhone: string;
    refName?: string;
    refRelationship?: string;
    refEmail?: string;
    refPhone?: string;
}

async function uploadImage(imageData: string, path: string): Promise<string> {
    const { adminApp } = initializeAdminApp();
    const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
    
    const match = imageData.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.*)$/);
    if (!match) {
        throw new Error('Invalid image data format.');
    }
    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const file = bucket.file(path);

    await file.save(buffer, { metadata: { contentType } });
    await file.makePublic();
    return file.publicUrl();
}


export async function createCourierApplicationAction(data: CourierApplicationData): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const { licenseImage, selfieImage, ...restOfData } = data;
        const batch = firestore.batch();
        
        const applicationRef = firestore.collection(`communities/${data.communityId}/courier_applications`).doc();
        
        const licensePath = `courier_applications/${data.communityId}/${applicationRef.id}/license_${Date.now()}`;
        const selfiePath = `courier_applications/${data.communityId}/${applicationRef.id}/selfie_${Date.now()}`;
        
        const [licenseImageUrl, selfieImageUrl] = await Promise.all([
            uploadImage(licenseImage, licensePath),
            uploadImage(selfieImage, selfiePath)
        ]);

        batch.set(applicationRef, {
            ...restOfData,
            licenseImageUrl,
            selfieImageUrl,
            status: 'Pending Review',
            createdAt: Timestamp.now(),
        });

        // Find community leader(s) to notify
        const usersRef = firestore.collection('users');
        const roleQuery = usersRef
            .where(`communityRoles.${data.communityId}.role`, 'in', ['leader', 'president'])
            .limit(5);
        let leaderSnapshot = await roleQuery.get();

        if (leaderSnapshot.empty) {
            const primaryLeaderQuery = usersRef
                .where('homeCommunityId', '==', data.communityId)
                .where('role', 'in', ['leader', 'president'])
                .limit(5);
            leaderSnapshot = await primaryLeaderQuery.get();
        }

        if (!leaderSnapshot.empty) {
            leaderSnapshot.forEach(leaderDoc => {
                const notificationRef = firestore.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientId: leaderDoc.id,
                    type: 'Courier Application',
                    subject: `New Courier Application from ${data.applicantName}`,
                    from: "Platform System",
                    date: Timestamp.now(),
                    status: 'new',
                    relatedId: applicationRef.id,
                    communityId: data.communityId,
                    actionUrl: '/leader/applications',
                    targetApp: 'main'
                });
            });
        }
        
        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error creating courier application:", error);
        return { success: false, error: error.message };
    }
}

export async function updateCourierApplicationStatusAction(params: {
  applicationId: string;
  communityId: string;
  status: 'Approved' | 'Declined' | 'Pending Review';
  actorName: string;
}): Promise<ActionResponse> {
  const { applicationId, communityId, status, actorName } = params;

  try {
    const { firestore } = initializeAdminApp();
    const appRef = firestore.collection(`communities/${communityId}/courier_applications`).doc(applicationId);
    
    await firestore.runTransaction(async (transaction) => {
      // --- ALL READS FIRST ---
      const appDoc = await transaction.get(appRef);
      if (!appDoc.exists) throw new Error("Application not found.");
      
      const appData = appDoc.data()!;
      const userId = appData.applicantId;
      const userRef = firestore.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("Applicant user not found.");
      const userData = userDoc.data()!;

      const communityRef = firestore.collection('communities').doc(communityId);
      const communityDoc = await transaction.get(communityRef);
      if (!communityDoc.exists) throw new Error("Community not found.");

      const businessesRef = firestore.collection('businesses');
      const existingBusinessQuery = businessesRef
          .where('ownerId', '==', userId)
          .where('accountType', '==', 'courier')
          .where('primaryCommunityId', '==', communityId)
          .limit(1);
      const existingBusinessSnapshot = await transaction.get(existingBusinessQuery);

      // --- ALL WRITES LAST ---
      const updatePayload: any = { 
        status,
        processedAt: Timestamp.now(),
        processedBy: actorName
      };

      if (status === 'Pending Review') {
          updatePayload.processedAt = FieldValue.delete();
          updatePayload.processedBy = FieldValue.delete();
      }

      transaction.update(appRef, updatePayload);

      if (status === 'Approved') {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        const businessPayload = {
          status: 'Subscribed',
          isFreeListing: true,
          storefrontSubscription: true,
          freeListingExpiresAt: Timestamp.fromDate(oneYearFromNow),
        };

        if (!existingBusinessSnapshot.empty) {
            const businessRef = existingBusinessSnapshot.docs[0].ref;
            transaction.update(businessRef, {
                ...businessPayload,
                updatedAt: Timestamp.now(),
            });
        } else {
            const businessRef = businessesRef.doc();
            transaction.set(businessRef, {
              ownerId: userId,
              businessName: `${userData.name}'s Courier Service`,
              businessCategory: 'courier',
              accountType: 'courier',
              shortDescription: 'Your friendly and reliable community courier service.',
              longDescription: '<p>As your official community courier, I am dedicated to providing fast, safe, and friendly delivery services for all your local purchases from the Virtual Highstreet.</p>',
              primaryCommunityId: communityId,
              pageThreeType: 'custom',
              pageThreeTypeLocked: false,
              showPageTwo: true,
              showPageThree: true,
              createdAt: Timestamp.now(),
              ...businessPayload,
            });
        }
        
        transaction.update(communityRef, { courierId: userId });
        transaction.update(userRef, {
          'permissions.isCourier': true,
        });
      } else if (status === 'Pending Review' || status === 'Declined') {
          if (communityDoc.data()?.courierId === userId) {
            transaction.update(communityRef, { courierId: FieldValue.delete() });
            transaction.update(userRef, { 'permissions.isCourier': FieldValue.delete() });

            if (!existingBusinessSnapshot.empty) {
                transaction.update(existingBusinessSnapshot.docs[0].ref, { status: 'Hidden' });
            }
          }
      }
      
      const notificationRef = firestore.collection('notifications').doc();
      transaction.set(notificationRef, {
        recipientId: userId,
        type: 'Courier Application',
        subject: `Your courier application has been ${status.toLowerCase()}`,
        from: 'Community Leader',
        date: Timestamp.now(),
        status: 'new',
        relatedId: communityId,
        actionUrl: `https://www.courier.my-community-hub.co.uk/?email=${encodeURIComponent(userData.email)}`,
        targetApp: 'main'
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating courier application:", error);
    return { success: false, error: error.message };
  }
}

export async function appointCommunityCourierAction(params: {
  userId: string;
  communityId: string;
}): Promise<ActionResponse> {
  const { userId, communityId } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }
  const { firestore } = initializeAdminApp();
  try {
    const communityRef = firestore.collection('communities').doc(communityId);
    const userRef = firestore.collection('users').doc(userId);

    await firestore.runTransaction(async (transaction) => {
      const communityDoc = await transaction.get(communityRef);
      if (!communityDoc.exists) throw new Error('Community not found.');

      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('User not found.');

      // Check if user has an approved courier application or business
      const businessesRef = firestore.collection('businesses');
      const courierBizQuery = businessesRef
        .where('ownerId', '==', userId)
        .where('accountType', '==', 'courier')
        .where('primaryCommunityId', '==', communityId)
        .limit(1);
      
      const courierBizSnapshot = await transaction.get(courierBizQuery);
      if (courierBizSnapshot.empty) {
        throw new Error('This user does not have a courier business profile in this community. They must apply first.');
      }

      transaction.update(communityRef, { courierId: userId });
      transaction.update(userRef, { 'permissions.isCourier': true });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error appointing courier:', error);
    return { success: false, error: error.message };
  }
}

export async function unappointCommunityCourierAction(params: { userId: string, communityId: string }): Promise<ActionResponse> {
    const { userId, communityId } = params;
    if (!userId || !communityId) {
        return { success: false, error: 'User ID and Community ID are required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.collection('communities').doc(communityId);
        const userRef = firestore.collection('users').doc(userId);
        
        const communityDoc = await communityRef.get();
        if (!communityDoc.exists || communityDoc.data()?.courierId !== userId) {
            throw new Error("This user is not the currently appointed courier for this community.");
        }

        const userDoc = await userRef.get();
        if (!userDoc.exists) throw new Error("User to unappoint not found.");
        const userData = userDoc.data()!;

        const businessesRef = firestore.collection('businesses');
        const courierBusinessQuery = businessesRef
            .where('ownerId', '==', userId)
            .where('accountType', '==', 'courier')
            .where('primaryCommunityId', '==', communityId)
            .limit(1);
        
        const courierBusinessSnapshot = await courierBusinessQuery.get();
        
        const batch = firestore.batch();

        if (!courierBusinessSnapshot.empty) {
            const courierBusinessDoc = courierBusinessSnapshot.docs[0];
            batch.update(courierBusinessDoc.ref, { 
                status: 'Hidden',
                isFreeListing: FieldValue.delete(),
                freeListingExpiresAt: FieldValue.delete(),
                storefrontSubscription: FieldValue.delete(),
                listingSubscriptionExpiresAt: FieldValue.delete(),
                stripeSubscriptionId: FieldValue.delete(),
                listingSubscriptionStatus: FieldValue.delete(),
                storefrontSubscriptionStatus: FieldValue.delete(),
                storefrontSubscriptionExpiresAt: FieldValue.delete(),
            });
        }

        batch.update(communityRef, { courierId: FieldValue.delete() });

        const updatePayload: { [key: string]: any } = {
            'permissions.isCourier': FieldValue.delete(),
        };
        
        if (userData.role === 'community-courier') {
            const newRole = userData.accountType || 'personal';
            updatePayload.role = newRole;
            updatePayload.title = newRole.charAt(0).toUpperCase() + newRole.slice(1);
        } else if (userData.title === 'Community Courier') {
            updatePayload.title = FieldValue.delete();
        }

        batch.update(userRef, updatePayload);

        const notificationRef = firestore.collection('notifications').doc();
        batch.set(notificationRef, {
            recipientId: userId,
            type: 'Account Update',
            subject: `You have been unappointed as the Community Courier.`,
            from: "Community Leader",
            date: Timestamp.now(),
            status: 'new',
            relatedId: communityId,
            targetApp: 'main'
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error unappointing courier:", error);
        return { success: false, error: error.message };
    }
}
