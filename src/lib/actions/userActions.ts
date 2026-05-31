

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { cancelSubscriptionAction } from './stripeActions';
import { revalidatePath } from 'next/cache';

type ActionResponse = {
  success: boolean;
  error?: string;
  communityName?: string;
  message?: string;
};

export async function deleteUserAccountAction(params: { userId: string }): Promise<ActionResponse> {
    const { userId } = params;
    if (!userId) {
        return { success: false, error: 'User ID is required.' };
    }

    try {
        const { firestore, adminApp } = initializeAdminApp();
        const auth = getAuth(adminApp);
        const userRef = firestore.collection('users').doc(userId);

        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data()!;
            // Log the user's data before deletion
            const deletedUsersLogRef = firestore.collection('deleted_users').doc(userId);
            await deletedUsersLogRef.set({
                userId: userId,
                name: userData.name,
                email: userData.email,
                accountType: userData.accountType || 'personal',
                deletedAt: Timestamp.now(),
            });

            // Delete the main user document
            await userRef.delete();
        }

        // Delete the user from Firebase Authentication
        await auth.deleteUser(userId);

        console.log(`[DELETE] Successfully logged and deleted user ${userId}.`);

        return { success: true, message: 'User account has been deleted.' };

    } catch (error: any) {
        console.error(`[DELETE] Error deleting user account ${userId}:`, error);
        // If the Auth user is already gone, but data cleanup failed before,
        // we can consider it a success for the purpose of this simple delete.
        if (error.code === 'auth/user-not-found') {
             console.log(`[DELETE] Auth user for ${userId} already deleted.`);
            return { success: true, message: 'User authentication record was already deleted.' };
        }
        return { success: false, error: error.message || 'Failed to delete user account.' };
    }
}


export async function checkAndCreateMailingListsAction(userId: string): Promise<ActionResponse> {
    console.log("Checking and creating mailing lists for user", userId);
    try {
        const { firestore } = initializeAdminApp();
        const userRef = firestore.collection('users').doc(userId);
        // By default, users are subscribed to all lists.
        // They can opt-out in settings.
        await userRef.set({
            mailingLists: {
                standard: true,
                emergency: true,
                newsletter: true,
            }
        }, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function findUser(userId: string): Promise<{ id: string, name: string, avatar: string } | null> {
    try {
        const { firestore } = initializeAdminApp();
        const userDoc = await firestore.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return {
                id: userDoc.id,
                name: userData?.name || 'Unknown User',
                avatar: userData?.avatar || ''
            };
        }
        return null;
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}


export async function updateUserCommunityAction(params: {
  userId: string;
  communityId: string;
}): Promise<ActionResponse> {
  const { userId, communityId } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const communityRef = firestore.collection('communities').doc(communityId);

    const communityDoc = await communityRef.get();

    if (!communityDoc.exists) {
      return { success: false, error: 'Community not found.' };
    }

    const communityData = communityDoc.data()!;

    // This action now ONLY changes the user's active community for viewing purposes.
    // It does NOT add them as a permanent member.
    await userRef.set({
      communityId: communityId,
      communityName: communityData.name,
    }, { merge: true });

    revalidatePath('/', 'layout');

    return { success: true, communityName: communityData.name };
  } catch (error: any) {
    console.error("Error updating user's community membership:", error);
    return { success: false, error: error.message || 'Failed to update community membership.' };
  }
}

export async function returnToHomeCommunityAction(params: { userId: string }): Promise<ActionResponse> {
  const { userId } = params;
  if (!userId) {
    return { success: false, error: "User ID is required." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return { success: false, error: "User not found." };
    }

    const userData = userDoc.data();
    const homeCommunityId = userData?.homeCommunityId || userData?.memberOf?.[0];

    if (!homeCommunityId) {
       return { success: false, error: "Home community not set for this user." };
    }

    const communityRef = firestore.collection('communities').doc(homeCommunityId);
    const communityDoc = await communityRef.get();

    if (!communityDoc.exists) {
      return { success: false, error: "Home community data could not be found." };
    }

    const communityData = communityDoc.data()!;

    // Set the active community back to the home community
    await userRef.set({
      communityId: homeCommunityId,
      communityName: communityData.name,
    }, { merge: true });

    revalidatePath('/', 'layout');

    return { success: true, communityName: communityData.name };
  } catch (error: any) {
    console.error("Error returning to home community:", error);
    return { success: false, error: error.message || "Failed to return home." };
  }
}

export async function saveUserSettingsAction(
  userId: string,
  settings: Record<string, any>
): Promise<ActionResponse> {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const validSettings = Object.entries(settings).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    await userRef.set(validSettings, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Error saving user settings:', error);
    return { success: false, error: error.message || 'Failed to save settings.' };
  }
}

export async function updateUserFavouriteCommunitiesAction(params: { userId: string; communityId: string; isFavourited: boolean }): Promise<ActionResponse> {
  const { userId, communityId, isFavourited } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);

    if (isFavourited) {
      await userRef.update({
        favouriteCommunities: FieldValue.arrayRemove(communityId),
      });
    } else {
      await userRef.update({
        favouriteCommunities: FieldValue.arrayUnion(communityId),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating favourite communities:', error);
    return { success: false, error: 'Failed to update favourites.' };
  }
}

export async function updateUserBusinessFavouritesAction(params: { userId: string; businessId: string; isFavourited: boolean }): Promise<ActionResponse> {
  const { userId, businessId, isFavourited } = params;
  if (!userId || !businessId) {
    return { success: false, error: 'User ID and Business ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);

    if (isFavourited) {
      await userRef.update({
        favouriteBusinesses: FieldValue.arrayRemove(businessId),
      });
    } else {
      await userRef.update({
        favouriteBusinesses: FieldValue.arrayUnion(businessId),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating business favourites:', error);
    return { success: false, error: 'Failed to update business favourites.' };
  }
}


export async function updateUserCartAction(params: {
  userId: string;
  cart: { productId: string; quantity: number; businessId: string; }[];
}): Promise<ActionResponse> {
  const { userId, cart } = params;
  if (!userId) {
    return { success: false, error: 'User ID is required to update the cart.' };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    await userRef.set({ cart }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user cart:', error);
    return { success: false, error: 'Failed to sync your cart with the server.' };
  }
}

export async function changeAccountTypeAction(params: {
  userId: string;
  newType: 'personal' | 'business' | 'enterprise';
  communityId?: string;
}): Promise<ActionResponse> {
  const { userId, newType, communityId } = params;
  if (!userId || !newType) {
    return { success: false, error: 'User ID and new account type are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        return { success: false, error: 'User not found.' };
    }
    const userData = userDoc.data()!;

    const updateData: { [key: string]: any } = {
        accountType: newType,
    };

    const isLeader = userData.role === 'president' || userData.role === 'leader';

    if (!isLeader) {
        if (newType === 'business') {
            updateData.role = 'business';
            updateData.title = 'Business Account';
        } else if (newType === 'enterprise') {
            updateData.role = 'enterprise';
            updateData.title = 'Enterprise Account';
        } else if (newType === 'personal') {
            updateData.role = 'personal';
            updateData.title = 'Personal Account';
        }
    }

    if (newType === 'business') {
        updateData['permissions.isBusinessOwner'] = true;
        updateData['permissions.isEnterpriseUser'] = FieldValue.delete();
        updateData['permissions.dashboards.business'] = true;
        updateData['permissions.dashboards.enterprise'] = FieldValue.delete();
    } else if (newType === 'enterprise') {
        updateData['permissions.isBusinessOwner'] = FieldValue.delete();
        updateData['permissions.isEnterpriseUser'] = true;
        updateData['permissions.dashboards.business'] = FieldValue.delete();
        updateData['permissions.dashboards.enterprise'] = true;
    } else {
        updateData['permissions.isBusinessOwner'] = FieldValue.delete();
        updateData['permissions.isEnterpriseUser'] = FieldValue.delete();
        updateData['permissions.dashboards.business'] = FieldValue.delete();
        updateData['permissions.dashboards.enterprise'] = FieldValue.delete();
    }

    await userRef.set(updateData, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error("Error changing account type:", error);
    return { success: false, error: error.message || 'Failed to update account type.' };
  }
}

export async function downgradeAccountAction(params: { userId: string }): Promise<ActionResponse> {
  const { userId } = params;
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const businessesRef = firestore.collection('businesses');
    const ownedBusinessesQuery = businessesRef.where('ownerId', '==', userId);

    const snapshot = await ownedBusinessesQuery.get();
    const batch = firestore.batch();

    // Delete all owned business listings
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // Update user profile to 'personal'
    batch.update(userRef, {
      accountType: 'personal',
      role: 'personal',
      title: 'Personal Account',
      'permissions.isBusinessOwner': FieldValue.delete(),
      'permissions.isEnterpriseUser': FieldValue.delete(),
      'permissions.dashboards.business': FieldValue.delete(),
      'permissions.dashboards.enterprise': FieldValue.delete(),
      ownedBusinessIds: FieldValue.delete(),
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Error downgrading account:', error);
    return { success: false, error: error.message };
  }
}


export async function resignAsPresidentAction(params: {
  userId: string;
  communityId: string;
}): Promise<ActionResponse> {
  const { userId, communityId } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }

  const { firestore } = initializeAdminApp();
  const userRef = firestore.collection('users').doc(userId);
  const communityRef = firestore.collection('communities').doc(communityId);
  let communityNameForNotification: string | null = null;
  let shouldNotifyAdmins = false;

  try {
    await firestore.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const communityDoc = await transaction.get(communityRef);

      if (!userDoc.exists) throw new Error("User not found.");
      if (!communityDoc.exists) throw new Error("Community not found.");

      const userData = userDoc.data()!;
      const communityData = communityDoc.data()!;
      communityNameForNotification = communityData.name; // Capture name for notification

      const isPrimaryLeaderOfThisCommunity = (userData.role === 'president' || userData.role === 'leader') && userData.homeCommunityId === communityId;
      const isSecondaryLeaderOfThisCommunity = userData.communityRoles?.[communityId]?.role === 'president' || userData.communityRoles?.[communityId]?.role === 'leader';
      if (!isPrimaryLeaderOfThisCommunity && !isSecondaryLeaderOfThisCommunity) {
        throw new Error("You are not a leader of this community.");
      }

      const updateData: { [key: string]: any } = {
        [`communityRoles.${communityId}`]: FieldValue.delete(),
      };

      const communityRoles = { ...userData.communityRoles } || {};
      delete communityRoles[communityId];

      const remainingLeadershipRolesCount = Object.values(communityRoles).filter(
          (role: any) => role.role === 'president' || role.role === 'leader'
      ).length;

      const isLeaderOfOtherPrimaryCommunity = (userData.role === 'president' || userData.role === 'leader') && userData.homeCommunityId !== communityId;

      const hasOtherLeadershipRoles = remainingLeadershipRolesCount > 0 || isLeaderOfOtherPrimaryCommunity;

      if (!hasOtherLeadershipRoles) {
        updateData.role = 'personal';
        updateData.title = 'Personal';
        updateData['permissions.isLeader'] = false;
      }

      if (userData.homeCommunityId === communityId && hasOtherLeadershipRoles) {
          const firstRemainingCommunityId = Object.keys(communityRoles)[0];
          if (firstRemainingCommunityId) {
              const newHomeCommunityDoc = await transaction.get(firestore.collection('communities').doc(firstRemainingCommunityId));
               if (newHomeCommunityDoc.exists) {
                  updateData.homeCommunityId = firstRemainingCommunityId;
                  updateData.role = communityRoles[firstRemainingCommunityId].role;
                  updateData.title = communityRoles[firstRemainingCommunityId].title;
               }
          }
      }

      if (userData.communityId === communityId) {
        if (updateData.homeCommunityId) {
            const newHomeCommunityDoc = await transaction.get(firestore.collection('communities').doc(updateData.homeCommunityId));
            if (newHomeCommunityDoc.exists) {
                updateData.communityId = updateData.homeCommunityId;
                updateData.communityName = newHomeCommunityDoc.data()!.name;
            }
        }
        else if (userData.homeCommunityId && userData.homeCommunityId !== communityId) {
            const homeCommunityDoc = await transaction.get(firestore.collection('communities').doc(userData.homeCommunityId));
            if (homeCommunityDoc.exists) {
                updateData.communityId = userData.homeCommunityId;
                updateData.communityName = homeCommunityDoc.data()!.name;
            }
        }
        else {
            updateData.communityId = null;
            updateData.communityName = null;
        }
      }

      transaction.update(userRef, updateData);

      const communityUpdateData: {[key: string]: any} = {
        leaderCount: FieldValue.increment(-1),
        stripeAccountId: FieldValue.delete(),
        stripeAccountOwnerId: FieldValue.delete(),
      };

      const currentLeaderCount = communityData.leaderCount || 0;
      if (currentLeaderCount <= 1) {
        communityUpdateData.status = 'pending';
        shouldNotifyAdmins = true; // Set flag
      }

      transaction.update(communityRef, communityUpdateData);
    });

    if (shouldNotifyAdmins) {
      const adminUsersQuery = firestore.collection('users').where('role', 'in', ['admin', 'owner']);
      const adminSnapshot = await adminUsersQuery.get();

      if (!adminSnapshot.empty) {
        const adminBatch = firestore.batch();
        adminSnapshot.forEach(adminDoc => {
          const notificationRef = firestore.collection('notifications').doc();
          adminBatch.set(notificationRef, {
            recipientId: adminDoc.id,
            type: "Community Milestone",
            subject: `Action Required: ${communityNameForNotification} is now leaderless`,
            from: "Platform System",
            date: Timestamp.now(),
            status: 'new',
            relatedId: communityId,
            actionUrl: `/admin/communities/${communityId}`,
            targetApp: 'admin',
            details: {
              message: `The community '${communityNameForNotification}' has become leaderless after a leader resigned. Please review the community's settings, especially the connected Stripe account, to prevent incorrect payouts.`
            }
          });
        });
        await adminBatch.commit();
        console.log("Admin notification sent for leaderless community:", communityNameForNotification);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error during president resignation:", error);
    return { success: false, error: error.message };
  }
}

export async function acceptTermsAction(params: { userId: string, termsField: string }): Promise<ActionResponse> {
  const { userId, termsField } = params;
  if (!userId || !termsField) {
    return { success: false, error: 'User ID and terms field are required.' };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    await userRef.set({
      [termsField]: Timestamp.now(),
    }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error(`Error accepting terms for field ${termsField}:`, error);
    return { success: false, error: 'Failed to record acceptance.' };
  }
}

export async function setNationalAdvertiserCommunity(userId: string): Promise<ActionResponse> {
  const { firestore } = initializeAdminApp();
  try {
    const communityQuery = firestore.collection('communities').where('name', '==', 'Atlantis').limit(1);
    const communitySnapshot = await communityQuery.get();

    if (communitySnapshot.empty) {
      return { success: false, error: "The 'Atlantis' community hub for advertisers could not be found." };
    }

    const communityDoc = communitySnapshot.docs[0];
    const communityId = communityDoc.id;
    const communityName = communityDoc.data().name;

    const userRef = firestore.collection('users').doc(userId);
    await userRef.set({
      communityId: communityId,
      communityName: communityName,
      homeCommunityId: communityId,
      memberOf: FieldValue.arrayUnion(communityId)
    }, { merge: true });

    return { success: true, communityName: communityName };

  } catch (error: any) {
    console.error("Error setting advertiser community:", error);
    return { success: false, error: "Could not set the advertiser's home community." };
  }
}

export async function updateWelcomeStatusAction(userId: string): Promise<ActionResponse> {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    await userRef.set({
      hasSeenWelcome: true,
    }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating welcome status:', error);
    return { success: false, error: 'Failed to update status.' };
  }
}

export async function changeHomeCommunityAction(params: { userId: string; newCommunityId: string; }): Promise<ActionResponse> {
  const { userId, newCommunityId } = params;
  if (!userId || !newCommunityId) {
    return { success: false, error: 'User ID and new Community ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const communityRef = firestore.collection('communities').doc(newCommunityId);

    const communityDoc = await communityRef.get();
    if (!communityDoc.exists) {
      throw new Error("Target community not found.");
    }

    await userRef.set({
      homeCommunityId: newCommunityId,
      communityId: newCommunityId,
      communityName: communityDoc.data()!.name,
      memberOf: FieldValue.arrayUnion(newCommunityId)
    }, { merge: true });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error("Error changing home community:", error);
    return { success: false, error: error.message };
  }
}

export async function migrateBusinessAndChangeCommunityAction(params: {
  userId: string;
  newCommunityId: string;
  migrationPlan: { businessId: string; action: 'move' | 'keep' | 'vacate' }[];
}): Promise<ActionResponse> {
  const { userId, newCommunityId, migrationPlan } = params;
  if (!userId || !newCommunityId || !migrationPlan) {
    return { success: false, error: 'User ID, new Community ID, and migration plan are required.' };
  }

  const { firestore } = initializeAdminApp();
  try {
    // --- Step 1: Gather subscription data OUTSIDE the transaction ---
    const subscriptionsToCancel: string[] = [];
    for (const plan of migrationPlan) {
        if (plan.action === 'move') {
            const businessDoc = await firestore.doc(`businesses/${plan.businessId}`).get();
            if (businessDoc.exists) {
                const subId = businessDoc.data()?.stripeSubscriptionId;
                if (subId) {
                    subscriptionsToCancel.push(subId);
                }
            }
        }
    }

    // --- Step 2: Run Firestore transaction ---
    await firestore.runTransaction(async (transaction) => {
      // --- ALL READS FIRST ---
      const userRef = firestore.doc(`users/${userId}`);
      const newCommunityRef = firestore.doc(`communities/${newCommunityId}`);

      const [userDoc, newCommunityDoc] = await Promise.all([
          transaction.get(userRef),
          transaction.get(newCommunityRef)
      ]);

      if (!userDoc.exists) throw new Error("User performing the migration not found.");
      if (!newCommunityDoc.exists) throw new Error("Target community not found.");

      const newCommunityName = newCommunityDoc.data()!.name;

      const businessReads = migrationPlan.map(plan =>
          transaction.get(firestore.doc(`businesses/${plan.businessId}`))
      );
      const businessDocs = await Promise.all(businessReads);
      const businessDataMap = new Map(businessDocs.map(doc => [doc.id, doc.data()]));

      const communityRefMap = new Map<string, FirebaseFirestore.DocumentReference>();
      for (const plan of migrationPlan) {
          if (plan.action === 'vacate') {
              const businessData = businessDataMap.get(plan.businessId);
              if (businessData?.primaryCommunityId && !communityRefMap.has(businessData.primaryCommunityId)) {
                  const communityRef = firestore.doc(`communities/${businessData.primaryCommunityId}`);
                  communityRefMap.set(businessData.primaryCommunityId, communityRef);
              }
          }
      }
      const communityReads = Array.from(communityRefMap.values()).map(ref => transaction.get(ref));
      const originalCommunityDocs = await Promise.all(communityReads);
      const originalCommunityDataMap = new Map(originalCommunityDocs.map(doc => [doc.id, doc.data()]));

      // --- LOGIC AND PREPARE WRITES (NO MORE READS) ---
      const userUpdate: { [key: string]: any } = {
        homeCommunityId: newCommunityId,
        communityId: newCommunityId,
        communityName: newCommunityName,
        memberOf: FieldValue.arrayUnion(newCommunityId)
      };

      // Apply writes for each business based on the plan
      for (let i = 0; i < migrationPlan.length; i++) {
        const plan = migrationPlan[i];
        const businessData = businessDataMap.get(plan.businessId);
        const businessRef = firestore.doc(`businesses/${plan.businessId}`);

        if (!businessData) {
            console.warn(`Business with ID ${plan.businessId} not found during migration. Skipping.`);
            continue;
        }

        if (plan.action === 'move') {
            if (businessData.accountType === 'courier') {
                throw new Error(`Cannot move a courier business (${businessData.businessName}).`);
            }
            transaction.update(businessRef, {
                primaryCommunityId: newCommunityId,
                status: 'Approved',
                createdAt: Timestamp.now(), // Reset created date for new trial
                listingSubscriptionExpiresAt: FieldValue.delete(),
                stripeSubscriptionId: FieldValue.delete(),
                listingSubscriptionStatus: FieldValue.delete(),
            });
        } else if (plan.action === 'vacate') {
            if (businessData.accountType !== 'courier') {
                throw new Error(`Cannot vacate a non-courier business (${businessData.businessName}).`);
            }

            const originalCommunityId = businessData.primaryCommunityId;
            if (originalCommunityId) {
                const communityToUpdateData = originalCommunityDataMap.get(originalCommunityId);
                if (communityToUpdateData && communityToUpdateData.courierId === userId) {
                    transaction.update(communityRefMap.get(originalCommunityId)!, { courierId: FieldValue.delete() });
                }
            }

            transaction.update(businessRef, { status: 'Hidden' });

            userUpdate['permissions.isCourier'] = FieldValue.delete();
            const userData = userDoc.data();
            if (userData?.role === 'community-courier') {
                const newRole = userData.accountType || 'personal';
                userUpdate.role = newRole;
                userUpdate.title = newRole.charAt(0).toUpperCase() + newRole.slice(1);
            }
        }
      }

      // --- FINAL WRITE ---
      transaction.set(userRef, userUpdate, { merge: true });
    });

    // --- Step 3: Perform external actions (Stripe cancellation) ---
    for (const subId of subscriptionsToCancel) {
      await cancelSubscriptionAction({ subscriptionId: subId });
    }

    revalidatePath('/', 'layout');

    return { success: true };

  } catch (error: any) {
    console.error("Error migrating businesses:", error);
    return { success: false, error: error.message };
  }
}
