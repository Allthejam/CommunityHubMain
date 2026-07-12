
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { addMonths, isAfter, addYears } from 'date-fns';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type LeaderProfileData = {
    communityId: string;
    leaderName?: string;
    contactPhone?: string;
    preferredContactMethod?: 'email' | 'phone' | 'chat';
    intendedCommunityCount?: number;
    communityIntent?: 'project' | 'revenue';
    communityIntentDescription?: string;
    refName?: string;
    refEmail?: string;
    refPhone?: string;
    refRelationship?: string;
    agreedToTerms?: boolean;
    avatar?: string | null;
    banner?: string | null;
    gender?: string;
    ageRange?: string;
    homeCommunityId?: string;
    firstName?: string;
    lastName?: string;
    onboardingCompleted?: boolean;
};

export async function saveLeaderProfile(params: {
  userId: string;
  profileData: Partial<LeaderProfileData>;
  status?: 'draft' | 'pending';
}): Promise<ActionResponse> {
  const { userId, profileData, status } = params;
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
    const userData = userDoc.data()!;
    
    // The communityId for the leader profile should come from the user's primary community
    const communityId = userData?.communityId;

    if (!communityId && (status === 'draft' || status === 'pending')) {
        return { success: false, error: "User is not associated with a community." };
    }

    const { leaderName, firstName, lastName, gender, ageRange, onboardingCompleted, ...restOfProfileData } = profileData;
    const isUpdatingPersonalInfo = leaderName || firstName || lastName || gender || ageRange;

    if (isUpdatingPersonalInfo) {
        const lastUpdated = userData?.personalInfoLastUpdated?.toDate();
        const updateCount = userData?.personalInfoUpdateCount || 0;
        const now = new Date();

        if (lastUpdated) {
            let nextAllowedDate: Date;
            if (updateCount === 1) {
                nextAllowedDate = addMonths(lastUpdated, 4);
                 if (isAfter(nextAllowedDate, now)) {
                    throw new Error(`You can change your personal information again after ${nextAllowedDate.toLocaleDateString()}.`);
                }
            } else if (updateCount >= 2) {
                nextAllowedDate = addYears(lastUpdated, 1);
                if (isAfter(nextAllowedDate, now)) {
                    throw new Error(`You can change your personal information again after ${nextAllowedDate.toLocaleDateString()}.`);
                }
            }
        }
    }


    // Update user document if there are user-level fields
    const userUpdateData: Record<string, any> = {};
    if (leaderName) userUpdateData.name = leaderName;
    if (firstName) userUpdateData.firstName = firstName;
    if (lastName) userUpdateData.lastName = lastName;
    if (profileData.avatar !== undefined) userUpdateData.avatar = profileData.avatar;
    if (profileData.banner !== undefined) userUpdateData.banner = profileData.banner;
    if (profileData.gender !== undefined) userUpdateData.gender = profileData.gender;
    if (profileData.ageRange !== undefined) userUpdateData.ageRange = profileData.ageRange;
    if (profileData.homeCommunityId) userUpdateData.homeCommunityId = profileData.homeCommunityId;
    if (onboardingCompleted !== undefined) userUpdateData.onboardingCompleted = onboardingCompleted;

    if (isUpdatingPersonalInfo) {
        userUpdateData.personalInfoLastUpdated = Timestamp.now();
        userUpdateData.personalInfoUpdateCount = FieldValue.increment(1);
    }

    const batch = firestore.batch();

    if (Object.keys(userUpdateData).length > 0) {
      batch.update(userRef, userUpdateData);
    }
    
    // Only update leader_profiles if there is a communityId and it's a leader action
    if (communityId) {
      const communityProfileRef = firestore.collection(`communities/${communityId}/leader_profiles`).doc(userId);
      const leaderProfileData: any = {
          ...restOfProfileData,
          lastUpdated: Timestamp.now(),
      };
      if (status) {
        leaderProfileData.profileStatus = status;
      }
      batch.set(communityProfileRef, leaderProfileData, { merge: true });
    }
    
    
    if (status === 'pending') {
      const leaderApplicationRef = firestore.collection('leadership_applications').doc(userId);
      batch.set(leaderApplicationRef, {
        applicantId: userId,
        applicantName: userData.name,
        communityId: communityId,
        communityName: (await firestore.collection('communities').doc(communityId).get()).data()?.name || 'Unknown Community',
        status: 'Pending',
        createdAt: Timestamp.now()
      }, { merge: true });

      // Notify platform administrators
      const adminUsersQuery = firestore.collection('users').where('role', 'in', ['admin', 'owner']);
      const adminSnapshot = await adminUsersQuery.get();

      if (!adminSnapshot.empty) {
          adminSnapshot.forEach(adminDoc => {
              const notificationRef = firestore.collection('notifications').doc();
              batch.set(notificationRef, {
                  recipientId: adminDoc.id,
                  type: 'Leadership Application',
                  subject: `New Leader Profile for Review: ${userData.name}`,
                  from: "Platform System",
                  date: Timestamp.now(),
                  status: 'new',
                  relatedId: userId, // Link to the user who applied
                  actionUrl: `/admin/team/${userId}` // Direct admin to the user's profile
              });
          });
      }
    }
    
    await batch.commit();
    return { success: true };

  } catch (error: any) {
    console.error("Error saving leader profile:", error);
    return { success: false, error: error.message || "Failed to save profile." };
  }
}
