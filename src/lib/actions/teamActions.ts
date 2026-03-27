

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { sendEmail } from './emailActions';

type ActionResponse = {
  success: boolean;
  error?: string;
  user?: any;
  signupUrl?: string;
};

export async function acceptLeadershipInvitationAction(params: {
    userId: string;
    communityId: string;
    notificationId: string;
}): Promise<ActionResponse> {
    const { userId, communityId, notificationId } = params;
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        
        // Update user's role to president
        const userRef = firestore.collection('users').doc(userId);
        batch.update(userRef, {
            role: 'president',
            title: 'President'
        });

        // Archive the notification
        const notificationRef = firestore.collection('notifications').doc(notificationId);
        batch.update(notificationRef, {
            status: 'archived',
        });
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function appointCommunityLeaderAction(params: {userId: string, communityId: string, communityName: string}): Promise<ActionResponse> {
    const { userId, communityId, communityName } = params;
    if (!userId || !communityId || !communityName) {
        return { success: false, error: "User, Community, and Community Name are required." };
    }

    try {
        const { firestore } = initializeAdminApp();
        const userRef = firestore.collection('users').doc(userId);
        const communityRef = firestore.collection('communities').doc(communityId);
        const notificationRef = firestore.collection('notifications').doc();
        
        const batch = firestore.batch();
        
        batch.update(userRef, {
            [`communityRoles.${communityId}`]: {
                role: 'leader',
                title: 'Leader',
            },
            memberOf: FieldValue.arrayUnion(communityId)
        });

        batch.set(notificationRef, {
            recipientId: userId,
            type: 'Leadership Invitation',
            subject: `You have been appointed as a Leader for ${communityName}`,
            from: "Platform Administration",
            date: Timestamp.now(),
            status: 'new',
            relatedId: communityId,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error appointing community leader:", error);
        return { success: false, error: error.message };
    }
}

export async function requestLiaisonAssignmentAction(params: {
  officerId: string;
  officerName: string;
  communityId: string;
  communityName: string;
}): Promise<ActionResponse> {
  const { officerId, officerName, communityId, communityName } = params;
  if (!officerId || !communityId) {
    return { success: false, error: "Officer and Community must be specified." };
  }

  try {
    const { firestore } = initializeAdminApp();

    const usersRef = firestore.collection('users');
    let leaderQuery = usersRef.where(`communityRoles.${communityId}.role`, 'in', ['president', 'leader']).limit(1);
    let leaderSnapshot = await leaderQuery.get();
    
    if (leaderSnapshot.empty) {
        let primaryLeaderQuery = usersRef.where('homeCommunityId', '==', communityId).where('role', 'in', ['president', 'leader']).limit(1);
        leaderSnapshot = await primaryLeaderQuery.get();
    }
    
    if (leaderSnapshot.empty) {
        return { success: false, error: "Could not find a leader for the target community to send the request to." };
    }
    
    const leaderId = leaderSnapshot.docs[0].id;

    const notificationRef = firestore.collection('notifications').doc();
    await notificationRef.set({
      recipientId: leaderId,
      communityId: communityId,
      type: 'Police Liaison Request',
      subject: `An officer has requested to be the liaison for ${communityName}`,
      from: officerName,
      date: Timestamp.now(),
      status: 'new',
      relatedId: officerId,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error requesting liaison assignment:", error);
    return { success: false, error: error.message };
  }
}


export async function inviteTeamMemberAction(params: { recipientName: string, workEmail: string, role: string, inviterName: string, communityName: string }): Promise<ActionResponse> {
    const { recipientName, workEmail, role, inviterName, communityName } = params;

    if (!recipientName || !workEmail || !role || !inviterName || !communityName) {
        return { success: false, error: 'All fields are required to send an invitation.' };
    }
    
    try {
        const { firestore } = initializeAdminApp();
        const inviteRef = firestore.collection('staff_profiles').doc(); // Auto-generate ID
        
        const inviteData = {
            name: recipientName,
            workEmail: workEmail,
            role: role,
            status: 'pending',
            invitedBy: inviterName,
            communityName,
            invitedAt: Timestamp.now(),
        };

        await inviteRef.set(inviteData);
        
        const signupUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/signup-staff?token=${inviteRef.id}`;
        
        await sendEmail({
            to: [{ email: workEmail, name: recipientName }],
            subject: `You're invited to join the ${communityName} team!`,
            htmlContent: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>You've Been Invited!</h2>
                    <p>Hello ${recipientName},</p>
                    <p>${inviterName} has invited you to join the <strong>${communityName}</strong> team on Community Hub as a <strong>${role}</strong>.</p>
                    <p>Please click the button below to create your account and accept the invitation.</p>
                    <p style="margin: 20px 0;">
                        <a href="${signupUrl}" style="background-color: #4338ca; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Create Your Account</a>
                    </p>
                    <p>If you have any questions, please contact ${inviterName}.</p>
                    <br>
                    <p><em>This invitation link is for your use only and should not be shared.</em></p>
                </div>
            `,
        });

        return { success: true, signupUrl };
    } catch (error: any) {
        console.error("Error creating team invitation:", error);
        return { success: false, error: "Failed to create invitation." };
    }
}

export async function findUserByNameAndEmail(params: { name: string, email: string }): Promise<ActionResponse> {
    console.log("Finding user", params);
    if(params.email.includes("found")) {
        return { success: true, user: { id: 'found-user-id', name: params.name, email: params.email, communityId: 'some-other-community', memberOf: ['some-other-community'] } };
    }
    return { success: false, error: "No user found with that name and email." };
}

export async function searchCommunityMembersAction(params: {
  communityId: string;
  query: string;
}): Promise<{ users: { id: string; name: string; avatar: string; email: string; }[] }> {
  const { communityId, query } = params;
  if (!communityId) return { users: [] };
  
  try {
    const { firestore } = initializeAdminApp();
    const usersRef = firestore.collection('users');
    
    const snapshot = await usersRef.where('memberOf', 'array-contains', communityId).get();
    
    if (snapshot.empty) return { users: [] };

    const lowercasedQuery = query.toLowerCase();
    
    const filteredUsers = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => 
        (user.settings?.publicProfile !== false) &&
        (user.name?.toLowerCase().includes(lowercasedQuery) || 
         user.email?.toLowerCase().includes(lowercasedQuery))
      )
      .slice(0, 10);
    
    return {
      users: filteredUsers.map(user => ({
        id: user.id,
        name: user.name,
        avatar: user.avatar || '',
        email: user.email,
      })),
    };
  } catch (error) {
    console.error('Error searching members:', error);
    return { users: [] };
  }
}

export async function addExistingMemberToCommunity(params: { userId: string, communityId: string, communityName: string, adderName: string }): Promise<ActionResponse> {
    console.log("Adding existing member to community", params);
    return { success: true };
}

export async function removeMemberFromCommunityAction(params: { memberId: string, communityId: string }): Promise<ActionResponse> {
    const { memberId, communityId } = params;
    if (!memberId || !communityId) {
        return { success: false, error: "User ID and Community ID are required." };
    }
    
    try {
        const { firestore } = initializeAdminApp();
        const userRef = firestore.collection('users').doc(memberId);
        
        await firestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User not found.");
            }
            
            const userData = userDoc.data()!;
            
            const updateData: { [key: string]: any } = {
                memberOf: FieldValue.arrayRemove(communityId)
            };

            if (userData.communityId === communityId) {
                const homeId = userData.homeCommunityId;
                const newMemberOf = (userData.memberOf || []).filter((id: string) => id !== communityId);

                if (homeId && newMemberOf.includes(homeId)) {
                    const homeCommunityDoc = await firestore.collection('communities').doc(homeId).get();
                    if (homeCommunityDoc.exists) {
                        updateData.communityId = homeId;
                        updateData.communityName = homeCommunityDoc.data()!.name;
                    }
                } else if (newMemberOf.length > 0) {
                    const firstCommunityId = newMemberOf[0];
                    const firstCommunityDoc = await firestore.collection('communities').doc(firstCommunityId).get();
                    if (firstCommunityDoc.exists) {
                        updateData.communityId = firstCommunityId;
                        updateData.communityName = firstCommunityDoc.data()!.name;
                    }
                } else {
                    updateData.communityId = null;
                    updateData.communityName = null;
                }
            }
            
            if (userData.communityRoles && userData.communityRoles[communityId]) {
                updateData[`communityRoles.${communityId}`] = FieldValue.delete();
            }

            transaction.update(userRef, updateData);
            
            const communityRef = firestore.collection('communities').doc(communityId);
            transaction.update(communityRef, {
                memberCount: FieldValue.increment(-1)
            });
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error removing member from community:", error);
        return { success: false, error: error.message || "Failed to remove member." };
    }
}

export async function updateMemberRoleAction(params: { 
    memberId: string, 
    communityId: string, 
    newRole: string, 
    newTitle: string 
}): Promise<ActionResponse> {
    const { memberId, communityId, newRole, newTitle } = params;
    if (newRole === 'president') {
        return { success: false, error: "The 'President' role can only be assigned through the leadership handover process in settings." };
    }
    const { firestore } = initializeAdminApp();
    const userRef = firestore.doc(`users/${memberId}`);
    
    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new Error("User not found.");
        }
        const userData = userDoc.data()!;

        const isPrimaryCommunity = userData.communityId === communityId;

        const updateData: { [key: string]: any } = {};

        if (isPrimaryCommunity) {
            updateData.role = newRole;
            updateData.title = newTitle;
        } else {
            const fieldPath = `communityRoles.${communityId}`;
            updateData[`${fieldPath}.role`] = newRole;
            updateData[`${fieldPath}.title`] = newTitle;
        }
        
        // If assigning liaison role, update the main role as well to "promote" them platform-wide
        if (newRole === 'police-liaison-officer') {
            updateData.role = 'police-liaison-officer';
        }

        await userRef.update(updateData);

        return { success: true };
    } catch (error: any) {
        console.error("Error updating member role:", error);
        return { success: false, error: error.message };
    }
}

export async function getStaffProfile(employeeId: string) {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.doc(`users/${employeeId}`);
    const profileRef = firestore.doc(`staff_profiles/${employeeId}`);

    const [userSnap, profileSnap] = await Promise.all([userRef.get(), profileRef.get()]);

    const name = userSnap.exists ? userSnap.data()?.name : "Unknown";
    const profile = profileSnap.exists ? profileSnap.data() : {};
    
    return { name, profile };
}

export async function saveStaffProfileAction(employeeId: string, profile: any): Promise<ActionResponse> {
     try {
        const { firestore } = initializeAdminApp();
        const profileRef = firestore.doc(`staff_profiles/${employeeId}`);
        await profileRef.set(profile, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function runSaveCommunityTeamPermissions(params: {
    memberId: string;
    permissions: any;
    communityId: string;
    updaterId: string;
    profileType: 'primary' | 'secondary';
}): Promise<ActionResponse> {
    const { memberId, permissions, communityId, updaterId, profileType } = params;

    try {
        const { firestore } = initializeAdminApp();
        const memberRef = firestore.collection("users").doc(memberId);
        
        const permissionsToSave = { ...permissions };

        // Convert array of viewable categories to a map for Firestore rules
        if (permissionsToSave.viewableReportCategories && Array.isArray(permissionsToSave.viewableReportCategories)) {
            const categoriesMap = permissionsToSave.viewableReportCategories.reduce((acc: Record<string, boolean>, cat: string) => {
                acc[cat] = true;
                return acc;
            }, {});
            permissionsToSave.viewableReportCategories = categoriesMap;
        }

        if (profileType === 'primary') {
             await memberRef.update({ permissions: permissionsToSave });
        } else {
            const fieldPath = `communityRoles.${communityId}.permissions`;
            await memberRef.update({ [fieldPath]: permissionsToSave });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error saving team permissions:", error);
        return { success: false, error: error.message };
    }
}

export async function runAddCommunityToLeadership(params: { userId: string, communityId: string }): Promise<ActionResponse> {
  const { userId, communityId } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User and Community must be specified.' };
  }

  const { firestore } = initializeAdminApp();
  try {
    await firestore.runTransaction(async (transaction) => {
      const userRef = firestore.collection('users').doc(userId);
      const communityRef = firestore.collection('communities').doc(communityId);
      
      const [userDoc, communityDoc] = await Promise.all([
        transaction.get(userRef),
        transaction.get(communityRef),
      ]);

      if (!userDoc.exists) throw new Error("User does not exist.");
      if (!communityDoc.exists) throw new Error("Community does not exist.");

      const communityData = communityDoc.data();
      if ((communityData?.leaderCount || 0) > 0) {
        throw new Error("This community already has a leader.");
      }

      const userData = userDoc.data()!;
      let finalStatus: 'active' | 'pending' = 'pending';

      if (userData.homeCommunityId) {
          const homeCommunityRef = firestore.collection('communities').doc(userData.homeCommunityId);
          const homeCommunityDoc = await transaction.get(homeCommunityRef);
          if (homeCommunityDoc.exists && homeCommunityDoc.data()?.status === 'active') {
              finalStatus = 'active';
          }
      }

      transaction.update(userRef, {
        [`communityRoles.${communityId}`]: {
            role: 'president',
            title: 'President'
        },
        memberOf: FieldValue.arrayUnion(communityId)
      });

      transaction.update(communityRef, {
        leaderCount: FieldValue.increment(1),
        status: finalStatus,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding community to leadership:", error);
    return { success: false, error: error.message };
  }
}

export async function runHandoverLeadership(params: { currentLeaderId: string; newLeaderId: string; }): Promise<ActionResponse> {
    const { firestore, adminApp } = initializeAdminApp();
    const auth = getAuth(adminApp);
    const { currentLeaderId, newLeaderId } = params;

    try {
        let communityId: string | null = null;
        
        await firestore.runTransaction(async (transaction) => {
            const currentLeaderRef = firestore.doc(`users/${currentLeaderId}`);
            const newLeaderRef = firestore.doc(`users/${newLeaderId}`);

            const [currentLeaderDoc, newLeaderDoc] = await Promise.all([
                transaction.get(currentLeaderRef),
                transaction.get(newLeaderRef)
            ]);

            if (!currentLeaderDoc.exists || !newLeaderDoc.exists) {
                throw new Error("One or both user profiles could not be found.");
            }
            
            const currentLeaderData = currentLeaderDoc.data()!;
            communityId = currentLeaderData.communityId;

            if (!communityId) {
                throw new Error("Current leader is not associated with a community.");
            }

            transaction.update(currentLeaderRef, {
                role: 'personal',
                title: 'Personal',
                permissions: FieldValue.delete()
            });

            transaction.update(newLeaderRef, {
                role: 'president',
                title: 'President',
                communityId: communityId
            });
        });

        if (communityId) {
            await auth.setCustomUserClaims(newLeaderId, { presidentOf: [communityId] });
            await auth.setCustomUserClaims(currentLeaderId, {}); // Clear old claims
        }

        return { success: true };
    } catch (error: any) {
        console.error("Leadership handover failed:", error);
        return { success: false, error: error.message };
    }
}


export async function savePlatformRolesAction(roles: { name: string, description: string }[], communityId?: string): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = communityId 
            ? firestore.collection('communities').doc(communityId)
            : firestore.collection('platform_settings').doc('roles');
        
        const updateData = communityId ? { communityTeamRoles: roles } : { roleList: roles };

        await docRef.set(updateData, { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving platform roles:", error);
        return { success: false, error: error.message };
    }
}

export async function promoteToStaffAction(params: { userId: string; role: string; }): Promise<ActionResponse> {
  const { userId, role } = params;
  if (!userId || !role) {
    return { success: false, error: "User ID and role are required." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    
    const roleKey = role.toLowerCase().replace(/\s+/g, '-');
    
    await userRef.update({
      role: roleKey,
      title: `Platform ${role}`
    });

    const notificationRef = firestore.collection('notifications').doc();
    await notificationRef.set({
      recipientId: userId,
      type: "Account Update",
      subject: "Your platform role has been updated",
      from: "Platform Administration",
      date: Timestamp.now(),
      status: 'new',
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error promoting user to staff:", error);
    return { success: false, error: error.message };
  }
}

export async function demoteStaffAction(params: { userId: string }): Promise<ActionResponse> {
  const { userId } = params;
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  try {
    const { firestore, adminApp } = initializeAdminApp();
    const auth = getAuth(adminApp);
    
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    // Revert to original account type or 'personal'
    const originalAccountType = userData?.accountType || 'personal';

    // Demote to personal user, clear admin-specific fields
    await userRef.update({
      role: originalAccountType,
      title: originalAccountType.charAt(0).toUpperCase() + originalAccountType.slice(1),
      permissions: FieldValue.delete()
    });
    
    // Clear all custom claims related to admin roles
    await auth.setCustomUserClaims(userId, {
        isAdmin: false,
        canManageCommunities: false,
        canImpersonateLeader: false,
        isCommunityCreator: false
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error demoting user:", error);
    return { success: false, error: error.message };
  }
}
