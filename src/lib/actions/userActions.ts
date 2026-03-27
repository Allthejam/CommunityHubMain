

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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

    // This action now ONLY changes the user's active community, not their membership.
    await userRef.update({
      communityId: communityId,
      communityName: communityData.name,
      memberOf: FieldValue.arrayUnion(communityId)
    });
    
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
    await userRef.update({
      communityId: homeCommunityId,
      communityName: communityData.name,
    });

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
    
    await userRef.update(validSettings);
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
    await userRef.update({ cart });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user cart:', error);
    return { success: false, error: 'Failed to sync your cart with the server.' };
  }
}

export async function changeAccountTypeAction(params: {
  userId: string;
  newType: 'personal' | 'business';
  communityId: string;
}): Promise<ActionResponse> {
  const { userId, newType, communityId } = params;
  if (!userId || !newType || !communityId) {
    return { success: false, error: 'User ID, new account type, and community ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    
    const updateData: { [key: string]: any } = {
        accountType: newType,
    };
    
    // Clear community-specific roles when changing main account type
    updateData[`communityRoles.${communityId}`] = FieldValue.delete();

    // If changing to a business account, ensure the business owner permission is set.
    if (newType === 'business') {
        updateData['permissions.isBusinessOwner'] = true;
    } else {
        updateData['permissions.isBusinessOwner'] = false;
    }

    await userRef.update(updateData);

    return { success: true };
  } catch (error: any) {
    console.error("Error changing account type:", error);
    return { success: false, error: 'Failed to update account type.' };
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

  try {
    await firestore.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const communityDoc = await transaction.get(communityRef);

      if (!userDoc.exists) throw new Error("User not found.");
      if (!communityDoc.exists) throw new Error("Community not found.");

      const userData = userDoc.data()!;
      const communityData = communityDoc.data()!;

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

      const communityUpdateData: { leaderCount: FieldValue; status?: string } = {
        leaderCount: FieldValue.increment(-1)
      };
      
      const currentLeaderCount = communityData.leaderCount || 0;
      if (currentLeaderCount <= 1) {
        communityUpdateData.status = 'pending';
      }

      transaction.update(communityRef, communityUpdateData);
    });

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
    await userRef.update({
      [termsField]: Timestamp.now(),
    });
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
    await userRef.update({
      communityId: communityId,
      communityName: communityName,
      homeCommunityId: communityId, // Set their home to Atlantis as well
      memberOf: FieldValue.arrayUnion(communityId)
    });

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
    await userRef.update({
      hasSeenWelcome: true,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating welcome status:', error);
    return { success: false, error: 'Failed to update status.' };
  }
}
