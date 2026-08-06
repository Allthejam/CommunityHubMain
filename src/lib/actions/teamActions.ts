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
        const notificationRef = firestore.collection('notifications').doc();

        const batch = firestore.batch();

        batch.set(userRef, {
            communityRoles: {
                [communityId]: {
                    role: 'leader',
                    title: 'Leader',
                }
            },
            memberOf: FieldValue.arrayUnion(communityId),
            permissions: {
                dashboards: {
                    leader: true
                }
            }
        }, { merge: true });

        batch.set(notificationRef, {
            recipientId: userId,
            type: 'Leadership Invitation',
            subject: `You have been appointed as a Leader for ${communityName}`,
            from: "Platform Administration",
            date: Timestamp.now(),
            status: 'new',
            relatedId: communityId,
            targetApp: 'main'
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
  const { officerId, communityId, communityName } = params;
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
      from: params.officerName,
      date: Timestamp.now(),
      status: 'new',
      relatedId: officerId,
      targetApp: 'main'
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
        const inviteRef = firestore.collection('staff_profiles').doc(); 

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

export async function searchUserByEmailAction(params: { email: string }): Promise<ActionResponse> {
  const { email } = params;
  if (!email) {
    return { success: false, error: 'Email is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const usersRef = firestore.collection('users');
    const q = usersRef.where('email', '==', email).limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) {
      return { success: false, error: 'No user found with that email address.' };
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    const userResult = {
        id: userDoc.id,
        name: userData.name,
        avatar: userData.avatar || '',
        email: userData.email,
    };

    return { success: true, user: userResult };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addTeamMemberAction(params: { businessId: string; user: { id: string; name: string; avatar: string; email: string; }; role: string; }): Promise<ActionResponse> {
  const { businessId, user, role } = params;
   if (!businessId || !user || !role) {
    return { success: false, error: 'Business, user, and role are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const businessRef = firestore.collection('businesses').doc(businessId);

    const businessDoc = await businessRef.get();
    if (!businessDoc.exists) {
        return { success: false, error: 'Business not found.' };
    }

    const businessData = businessDoc.data()!;
    const team = businessData.team || [];
    if (team.some((member: any) => member.userId === user.id)) {
        return { success: false, error: 'This user is already a member of the team.' };
    }

    let permissions = {};
    switch (role) {
      case "Manager":
        permissions = {
          canEditProfile: true, canManageAdverts: true, canManageEvents: true,
          canUploadMinutes: true, canManageStorefront: true, canManageTeam: true,
          canManageBilling: false,
        };
        break;
      case "Advert Manager":
        permissions = { canManageAdverts: true, canManageEvents: true, canUploadMinutes: true };
        break;
      case "Content Editor":
        permissions = { canEditProfile: true, canManageGallery: true, canUploadMinutes: true };
        break;
      default:
        permissions = {};
    }

    // SCALABILITY FIX: Ensure avatar is not a huge base64 string
    const safeAvatar = (user.avatar && user.avatar.startsWith('data:image')) ? '' : user.avatar;

    const newMember = {
        userId: user.id,
        name: user.name,
        avatar: safeAvatar,
        email: user.email,
        role: role,
        permissions: permissions
    };

    const userRef = firestore.collection('users').doc(user.id);
    const communityId = businessData.primaryCommunityId;

    const batch = firestore.batch();

    batch.update(businessRef, {
        team: FieldValue.arrayUnion(newMember),
        teamMemberIds: FieldValue.arrayUnion(user.id)
    });

    batch.set(userRef, {
        permissions: {
            isBusinessTeamMember: true,
        },
        memberOf: FieldValue.arrayUnion(communityId)
    }, { merge: true });

    const notificationRef = firestore.collection('notifications').doc();
    batch.set(notificationRef, {
        recipientId: user.id,
        type: 'Team Invitation',
        subject: `You've been added to the team for ${businessData.businessName}`,
        from: "Business Owner",
        date: Timestamp.now(),
        status: 'new',
        relatedId: businessId,
        actionUrl: `/business/dashboard`,
        targetApp: 'main'
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error adding team member:", error);
    return { success: false, error: error.message };
  }
}

export async function removeTeamMemberAction(params: { businessId: string; memberId: string; }): Promise<ActionResponse> {
  const { businessId, memberId } = params;
  if (!businessId || !memberId) {
    return { success: false, error: 'Business ID and Member ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const businessRef = firestore.collection('businesses').doc(businessId);

    await firestore.runTransaction(async (transaction) => {
        const businessDoc = await transaction.get(businessRef);
        if (!businessDoc.exists) {
            throw new Error('Business not found.');
        }

        const team = businessDoc.data()!.team || [];
        const newTeam = team.filter((m: any) => m.userId !== memberId);

        transaction.update(businessRef, {
            team: newTeam,
            teamMemberIds: FieldValue.arrayRemove(memberId)
        });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error removing team member:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTeamMemberAction(params: {
  businessId: string;
  memberId: string;
  role: string;
}): Promise<ActionResponse> {
  const { businessId, memberId, role } = params;

  if (!businessId || !memberId || !role) {
    return { success: false, error: 'Business ID, Member ID, and Role are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const businessRef = firestore.collection('businesses').doc(businessId);

    let permissions = {};
    switch (role) {
      case "Manager":
        permissions = {
          canEditProfile: true, canManageAdverts: true, canManageEvents: true,
          canUploadMinutes: true, canManageStorefront: true, canManageTeam: true,
          canManageBilling: false,
        };
        break;
      case "Advert Manager":
        permissions = { canManageAdverts: true, canManageEvents: true, canUploadMinutes: true };
        break;
      case "Content Editor":
        permissions = { canEditProfile: true, canManageGallery: true, canUploadMinutes: true };
        break;
      default:
        permissions = {};
    }

    await firestore.runTransaction(async (transaction) => {
      const businessDoc = await transaction.get(businessRef);
      if (!businessDoc.exists) {
        throw new Error('Business not found.');
      }

      const team = businessDoc.data()!.team || [];
      const memberIndex = team.findIndex((m: any) => m.userId === memberId);

      if (memberIndex === -1) {
        throw new Error('Team member not found in this business.');
      }

      team[memberIndex].role = role;
      team[memberIndex].permissions = permissions;

      transaction.update(businessRef, { team });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating team member:", error);
    return { success: false, error: error.message };
  }
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
        await firestore.runTransaction(async (transaction) => {
            const userRef = firestore.collection('users').doc(memberId);
            const communityRef = firestore.collection('communities').doc(communityId);

            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("User not found.");

            const userData = userDoc.data()!;

            const updateData: { [key: string]: any } = {
                memberOf: FieldValue.arrayRemove(communityId),
                [`communityRoles.${communityId}`]: FieldValue.delete(),
            };

            const wasLeader = userData.communityRoles?.[communityId]?.role === 'president' || userData.communityRoles?.[communityId]?.role === 'leader';

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

            transaction.update(userRef, updateData);

            const communityUpdates: {[key: string]: any} = {
                memberCount: FieldValue.increment(-1)
            };
            if(wasLeader) {
                communityUpdates.leaderCount = FieldValue.increment(-1);
            }
            transaction.update(communityRef, communityUpdates);
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

    const protectedRoles = ['owner', 'admin'];
    if (protectedRoles.includes(newRole)) {
        return { success: false, error: `The role '${newRole}' is a platform-level role and cannot be assigned.` };
    }

    if (newRole === 'president') {
        return { success: false, error: "The 'President' role can only be assigned through the leadership handover process in settings." };
    }
    const { firestore } = initializeAdminApp();
    const userRef = firestore.doc(`users/${memberId}`);
    const communityRef = firestore.doc(`communities/${communityId}`);

    try {
        await firestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("User not found.");

            const userData = userDoc.data()!;
            const isPrimaryCommunity = userData.homeCommunityId === communityId;
            const updateData: { [key: string]: any } = {};

            const oldRoleIsLeader = isPrimaryCommunity
                ? ['president', 'leader'].includes(userData.role)
                : ['president', 'leader'].includes(userData.communityRoles?.[communityId]?.role);

            const newRoleIsLeader = ['president', 'leader'].includes(newRole);

            if (isPrimaryCommunity) {
                updateData.role = newRole;
                updateData.title = newTitle;
            } else {
                updateData[`communityRoles.${communityId}.role`] = newRole;
                updateData[`communityRoles.${communityId}.title`] = newTitle;
            }

            let leaderCountChange = 0;
            if (oldRoleIsLeader && !newRoleIsLeader) {
                leaderCountChange = -1;
            } else if (!oldRoleIsLeader && newRoleIsLeader) {
                leaderCountChange = 1;
            }

            if (leaderCountChange !== 0) {
                transaction.update(communityRef, { leaderCount: FieldValue.increment(leaderCountChange) });
            }

            transaction.update(userRef, updateData);
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating member role:", error);
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

    if (!memberId || !permissions || !communityId || !updaterId) {
        return { success: false, error: "Missing required parameters." };
    }

    try {
        const { firestore } = initializeAdminApp();
        const userRef = firestore.collection('users').doc(memberId);

        const updateData: { [key: string]: any } = {};

        if (profileType === 'primary') {
            updateData['permissions'] = permissions;
        } else {
            const fieldPath = `communityRoles.${communityId}.permissions`;
            updateData[fieldPath] = permissions;
        }

        await userRef.update(updateData);

        return { success: true };

    } catch (error: any) {
        console.error("Error saving team permissions:", error);
        return { success: false, error: error.message || "Failed to update permissions." };
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


export async function promoteToStaffAction(params: { userId: string; role: string; }): Promise<ActionResponse> {
  const { userId, role } = params;
  if (!userId || !role) {
    return { success: false, error: "User ID and role are required." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);

    const roleKey = role.toLowerCase().replace(/\s+/g, '-');

    await userRef.set({
      role: roleKey,
      title: `Platform ${role}`,
      permissions: {
        isAdmin: true,
        dashboards: {
            admin: true
        }
      }
    }, { merge: true });

    const notificationRef = firestore.collection('notifications').doc();
    await notificationRef.set({
      recipientId: userId,
      type: "Account Update",
      subject: "Your platform role has been updated",
      from: "Platform Administration",
      date: Timestamp.now(),
      status: 'new',
      targetApp: 'main'
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
    if (!userDoc.exists) {
        throw new Error("User to demote not found.");
    }
    const userData = userDoc.data()!;

    const originalAccountType = userData.accountType || 'personal';

    await userRef.update({
      role: originalAccountType,
      title: originalAccountType.charAt(0).toUpperCase() + originalAccountType.slice(1),
      'permissions.isAdmin': FieldValue.delete(),
      'permissions.dashboards.admin': FieldValue.delete(),
    });

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

export async function runHandoverLeadership(params: {
  currentLeaderId: string;
  newLeaderId: string;
}): Promise<ActionResponse> {
    const { currentLeaderId, newLeaderId } = params;
    if (!currentLeaderId || !newLeaderId) {
        return { success: false, error: 'Both current and new leader IDs are required.' };
    }
    const { firestore } = initializeAdminApp();
    try {
        let communityId: string;
        let communityName: string;
        
        await firestore.runTransaction(async (transaction) => {
            const currentLeaderRef = firestore.collection('users').doc(currentLeaderId);
            const newLeaderRef = firestore.collection('users').doc(newLeaderId);

            const [currentLeaderDoc, newLeaderDoc] = await Promise.all([
                transaction.get(currentLeaderRef),
                transaction.get(newLeaderRef)
            ]);

            if (!currentLeaderDoc.exists) throw new Error("Current leader profile not found.");
            if (!newLeaderDoc.exists) throw new Error("Successor profile not found.");

            const communityIdForHandover = currentLeaderDoc.data()?.communityId;
            if (!communityIdForHandover) throw new Error("Could not determine community for handover.");
            communityId = communityIdForHandover;

            const communityRef = firestore.collection('communities').doc(communityId);
            const communityDoc = await transaction.get(communityRef);
            if (!communityDoc.exists) throw new Error("Community not found.");
            communityName = communityDoc.data()!.name;

            // Demote current leader
            transaction.update(currentLeaderRef, {
                role: 'personal',
                title: 'Personal Account',
            });

            // Promote new leader
            transaction.update(newLeaderRef, {
                role: 'president',
                title: 'President'
            });

            // Clear Stripe details from community and set status to pending for review
            transaction.update(communityRef, {
                stripeAccountId: FieldValue.delete(),
                stripeAccountOwnerId: FieldValue.delete(),
                status: 'pending'
            });
        });
        
        // After transaction, send notifications
        const adminUsersQuery = firestore.collection('users').where('role', 'in', ['admin', 'owner']);
        const adminSnapshot = await adminUsersQuery.get();

        if (!adminSnapshot.empty) {
            const batch = firestore.batch();
            adminSnapshot.forEach(adminDoc => {
                const notificationRef = firestore.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientId: adminDoc.id,
                    type: 'Community Milestone',
                    subject: `Leadership Handover for ${communityName}`,
                    from: 'Platform System',
                    date: Timestamp.now(),
                    status: 'new',
                    relatedId: communityId,
                    actionUrl: `/admin/communities/${communityId}`,
                    targetApp: 'admin',
                    details: {
                        message: `Leadership of '${communityName}' has been transferred from ${currentLeaderId} to ${newLeaderId}. The community status has been set to 'Pending' for review.`
                    }
                });
            });
            await batch.commit();
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error during leadership handover:", error);
        return { success: false, error: error.message };
    }
}

export async function savePlatformRolesAction(roles: { name: string, description: string }[], communityId: string): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.collection('communities').doc(communityId);
        await communityRef.update({ communityTeamRoles: roles });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runAddCommunityToLeadership(params: {
  userId: string;
  communityId: string;
}): Promise<ActionResponse> {
  const { userId, communityId } = params;
  if (!userId || !communityId) {
    return { success: false, error: "User ID and Community ID are required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const communityRef = firestore.collection('communities').doc(communityId);

    await firestore.runTransaction(async (transaction) => {
        const communityDoc = await transaction.get(communityRef);
        if (!communityDoc.exists) throw new Error("Community not found.");

        transaction.set(userRef, {
            'role': 'president',
            'title': 'President',
            'homeCommunityId': communityId,
            'communityId': communityId,
            'communityName': communityDoc.data()?.name,
            'memberOf': FieldValue.arrayUnion(communityId),
            permissions: {
                dashboards: {
                    leader: true
                }
            }
        }, { merge: true });

        transaction.update(communityRef, {
            'leaderCount': FieldValue.increment(1)
        });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error claiming community leadership:", error);
    return { success: false, error: error.message };
  }
}