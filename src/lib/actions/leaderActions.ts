
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { addMonths, isAfter, addYears } from 'date-fns';
import { sendEmail } from './emailActions';
import { getCommunityStripeStatusAction } from './stripeActions';

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

    // STRICT GUARDRAIL: Block duplicate leadership applications for approved or occupied communities
    if (status === 'pending') {
      const commRef = firestore.collection('communities').doc(communityId);
      const commDoc = await commRef.get();
      if (!commDoc.exists) {
        return { success: false, error: "Community not found." };
      }
      const commData = commDoc.data()!;
      const communityName = commData.name || 'this community';

      // 1. Check if community already has an approved/active President or Leader
      const activeLeaderQuery = firestore.collection('users')
        .where('homeCommunityId', '==', communityId)
        .where('role', 'in', ['president', 'leader']);
      const activeLeaderSnap = await activeLeaderQuery.get();
      const otherActiveLeaders = activeLeaderSnap.docs.filter(d => d.id !== userId);

      const isOccupiedByAnother = otherActiveLeaders.length > 0 || 
        (commData.status === 'active' && (commData.leaderCount || 0) > 0 && !activeLeaderSnap.docs.some(d => d.id === userId));

      if (isOccupiedByAnother) {
        return {
          success: false,
          error: `"${communityName}" already has an approved and active President. Applications are closed unless the community becomes leaderless.`
        };
      }

      // 2. Check if another application is already pending review for this community
      const pendingAppsQuery = firestore.collection('leadership_applications')
        .where('communityId', '==', communityId)
        .where('status', '==', 'Pending');
      const pendingAppsSnap = await pendingAppsQuery.get();
      const otherPendingApps = pendingAppsSnap.docs.filter(d => d.id !== userId);

      if (otherPendingApps.length > 0) {
        return {
          success: false,
          error: `An application for "${communityName}" has already been submitted and is currently pending administrative review.`
        };
      }
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
    
    
    let adminRecipients: { email?: string; name?: string }[] = [];
    let applicationCommunityName = 'Unknown Community';
    const applicantDisplayName = userData.name || [userData.firstName, userData.lastName].filter(Boolean).join(' ') || 'Applicant';

    if (status === 'pending') {
      const commDoc = await firestore.collection('communities').doc(communityId).get();
      applicationCommunityName = commDoc.data()?.name || 'Unknown Community';

      const leaderApplicationRef = firestore.collection('leadership_applications').doc(userId);
      batch.set(leaderApplicationRef, {
        applicantId: userId,
        applicantName: applicantDisplayName,
        communityId: communityId,
        communityName: applicationCommunityName,
        status: 'Pending',
        createdAt: Timestamp.now()
      }, { merge: true });

      const actionUrl = `/admin/applications/${userId}`;
      const notifSubject = `New Leadership Application: ${applicantDisplayName} (${applicationCommunityName})`;

      // 1. Always create a single deterministic broadcast notification for platform administrators (prevents duplicates)
      const platformNotifRef = firestore.collection('notifications').doc(`leadership_app_${userId}`);
      batch.set(platformNotifRef, {
        recipientId: 'platform_admin',
        type: 'Leadership Application',
        subject: notifSubject,
        from: applicantDisplayName,
        date: Timestamp.now(),
        status: 'new',
        relatedId: userId,
        communityId: communityId,
        communityName: applicationCommunityName,
        actionUrl: actionUrl,
        targetApp: 'admin'
      });

      // 2. Discover unique platform administrators for email alert (deduplicated by UID/email)
      const adminMap = new Map<string, { id: string; email?: string; name?: string }>();
      try {
        const adminRoles = ['administrator', 'admin', 'owner', 'Administrator', 'Admin', 'Owner', 'superadmin'];
        const [roleSnap, permSnap, ownerSnap] = await Promise.all([
          firestore.collection('users').where('role', 'in', adminRoles).get(),
          firestore.collection('users').where('permissions.isAdmin', '==', true).get(),
          firestore.collection('users').where('accountType', '==', 'owner').get(),
        ]);

        [...roleSnap.docs, ...permSnap.docs, ...ownerSnap.docs].forEach(doc => {
          const d = doc.data();
          const isOwnerAccount = d.accountType === 'owner' || d.role === 'owner' || d.email === 'allan_jamieson@outlook.com';
          if (doc.id !== userId || isOwnerAccount) {
            adminMap.set(doc.id, {
              id: doc.id,
              email: d.email,
              name: d.name || d.firstName || 'Administrator'
            });
          }
        });

        // Ensure Primary Platform Owner is registered once for Brevo email
        const ownerUid = 'gx82VTPZkPTCHA4A7QV1WBpJ2802';
        if (!adminMap.has(ownerUid)) {
          adminMap.set(ownerUid, {
            id: ownerUid,
            email: 'allan_jamieson@outlook.com',
            name: 'Allan Jamieson (Owner)'
          });
        }

        const seenEmails = new Set<string>();
        adminRecipients = Array.from(adminMap.values()).filter((a) => {
          const e = (a.email || '').trim().toLowerCase();
          if (!e || seenEmails.has(e)) return false;
          seenEmails.add(e);
          return true;
        });
      } catch (adminErr) {
        console.error('Error fetching admin users for notification:', adminErr);
      }
    }
    
    await batch.commit();

    // 4. Send email alert to administrators
    if (status === 'pending' && adminRecipients.length > 0) {
      const validEmailRecipients = adminRecipients
        .filter(a => a.email && typeof a.email === 'string' && a.email.includes('@'))
        .map(a => ({ email: a.email!, name: a.name }));

      if (validEmailRecipients.length > 0) {
        try {
          await sendEmail({
            to: validEmailRecipients,
            subject: `[Action Required] New Leadership Application: ${applicantDisplayName} (${applicationCommunityName})`,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
                <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 20px;">
                  <h2 style="color: #b45309; margin: 0 0 6px 0;">👑 New Leadership Application Received</h2>
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Platform Admin Alert &bull; Community Hub Governance</p>
                </div>
                <p style="font-size: 15px;">Hello Administrator,</p>
                <p style="font-size: 15px;">A new application for <strong>Community Leadership</strong> has been submitted and is waiting for your review.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 6px; overflow: hidden;">
                  <tbody>
                    <tr>
                      <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e5e7eb; width: 35%; color: #4b5563;">Applicant Name:</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; color: #111827;">${applicantDisplayName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Applicant Email:</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; color: #111827;">${userData.email || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Target Community:</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; color: #111827;">${applicationCommunityName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; font-weight: bold; color: #4b5563;">Status:</td>
                      <td style="padding: 10px 14px; color: #b45309; font-weight: bold;">Pending Review</td>
                    </tr>
                  </tbody>
                </table>
                <div style="margin: 30px 0 20px 0; text-align: center;">
                  <a href="https://admin.my-community-hub.co.uk/admin/applications/${userId}" style="background-color: #f59e0b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
                    Open Application in Admin Console
                  </a>
                </div>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center;">
                  This automated alert was dispatched by the Community Hub Central Platform.
                </p>
              </div>
            `
          });
        } catch (emailErr) {
          console.error('Failed to send admin email alert:', emailErr);
        }
      }
    }

    return { success: true };

  } catch (error: any) {
    console.error("Error saving leader profile:", error);
    return { success: false, error: error.message || "Failed to save profile." };
  }
}

export async function recordLeaderOnboardingSkipAction(params: {
  userId: string;
}): Promise<{ success: boolean; skipCount?: number; error?: string }> {
  const { userId } = params;
  if (!userId) return { success: false, error: 'User ID is required.' };

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const nextCount = await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new Error('User not found.');
      const data = snap.data()!;
      const current = Number(data.onboardingSkipCount || 0);
      const updated = Math.min(3, current + 1);
      tx.update(userRef, {
        onboardingSkipCount: updated,
        lastOnboardingSkipAt: Timestamp.now(),
      });
      return updated;
    });
    return { success: true, skipCount: nextCount };
  } catch (error: any) {
    console.error('Error recording onboarding skip:', error);
    return { success: false, error: error.message || 'Failed to record skip.' };
  }
}

export async function revertExpiredOrCancelledLeaderAction(params: {
  userId: string;
  reason: 'expired' | 'cancelled';
}): Promise<ActionResponse> {
  const { userId, reason } = params;
  if (!userId) return { success: false, error: 'User ID is required.' };

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);

    const reverted = await firestore.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) throw new Error('User not found.');
      const userData = userDoc.data()!;

      // Safety guard: never touch already-verified leaders or legacy accounts without a trial expiry
      if (userData.onboardingCompleted === true || !userData.leaderTrialExpiresAt) {
        return false;
      }

      const communityId = userData.communityId || userData.homeCommunityId;
      const communityRef = communityId ? firestore.collection('communities').doc(communityId) : null;
      const communityDoc = communityRef ? await tx.get(communityRef) : null;

      const userUpdate: Record<string, any> = {
        role: 'personal',
        title: 'Personal',
        accountType: 'personal',
        'permissions.isLeader': false,
        'permissions.hasBackOfficeAccess': false,
        'permissions.dashboards.leader': false,
        onboardingCompleted: false,
        leaderTrialExpiresAt: FieldValue.delete(),
        leaderTrialStartedAt: FieldValue.delete(),
        onboardingSkipCount: FieldValue.delete(),
        onboardingStep: FieldValue.delete(),
        leaderTrialRevertedAt: Timestamp.now(),
        leaderTrialRevertReason: reason,
      };

      if (communityId) {
        userUpdate[`communityRoles.${communityId}`] = FieldValue.delete();
      }

      tx.update(userRef, userUpdate);

      if (communityRef && communityDoc?.exists) {
        const commData = communityDoc.data()!;
        const currentLeaderCount = Number(commData.leaderCount || 0);
        const commUpdate: Record<string, any> = {
          leaderCount: Math.max(0, currentLeaderCount - 1),
        };
        if (commData.stripeAccountOwnerId === userId) {
          commUpdate.stripeAccountId = FieldValue.delete();
          commUpdate.stripeAccountOwnerId = FieldValue.delete();
        }
        if (currentLeaderCount <= 1) {
          commUpdate.status = 'pending';
        }
        tx.update(communityRef, commUpdate);
      }

      const notifRef = firestore.collection('notifications').doc();
      tx.set(notifRef, {
        recipientId: userId,
        type: 'Account Update',
        subject: reason === 'expired'
          ? 'Leader Registration Window Expired'
          : 'Leader Registration Cancelled',
        body: reason === 'expired'
          ? 'Your 14-day leader registration window expired before verification was completed. Your account has been reverted to a Personal account, and the community is now open for another leader.'
          : 'You cancelled your leader registration. Your account has been reverted to a Personal account, and the community is now open for another leader.',
        date: Timestamp.now(),
        status: 'new',
        actionUrl: '/home',
      });

      return true;
    });

    return { success: true, ...(reverted ? {} : { error: 'Account is not an active unverified trial.' }) };
  } catch (error: any) {
    console.error('Error reverting leader trial:', error);
    return { success: false, error: error.message || 'Failed to revert leader account.' };
  }
}

export async function saveLeaderOnboardingStepAction(params: {
  userId: string;
  communityId: string;
  step: number;
  profileData?: Partial<LeaderProfileData>;
}): Promise<ActionResponse> {
  const { userId, communityId, step, profileData } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const batch = firestore.batch();
    const userRef = firestore.collection('users').doc(userId);
    batch.update(userRef, {
      onboardingStep: step,
      lastOnboardingUpdatedAt: Timestamp.now(),
    });

    if (profileData && Object.keys(profileData).length > 0) {
      const leaderProfileRef = firestore
        .collection(`communities/${communityId}/leader_profiles`)
        .doc(userId);
      batch.set(
        leaderProfileRef,
        {
          ...profileData,
          intendedCommunityCount: 1,
          communityId,
          lastUpdated: Timestamp.now(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error('Error saving onboarding step:', error);
    return { success: false, error: error.message || 'Failed to save progress.' };
  }
}

export async function completeLeaderStripeVerificationAction(params: {
  userId: string;
  communityId: string;
}): Promise<{ success: boolean; verified?: boolean; error?: string }> {
  const { userId, communityId } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }

  try {
    const stripeStatus = await getCommunityStripeStatusAction(communityId);
    if (!stripeStatus.hasAccount || !stripeStatus.detailsSubmitted) {
      return {
        success: true,
        verified: false,
        error: 'Stripe verification is not complete yet. Please finish submitting your details on Stripe.',
      };
    }

    const { firestore } = initializeAdminApp();
    const now = Timestamp.now();
    const batch = firestore.batch();

    const userRef = firestore.collection('users').doc(userId);
    batch.update(userRef, {
      onboardingCompleted: true,
      onboardingStep: 3,
      leaderVerifiedAt: now,
      canManageMultipleCommunities: false,
      financialTermsAcceptedAt: now,
      leaderTrialExpiresAt: FieldValue.delete(),
      onboardingSkipCount: FieldValue.delete(),
    });

    const communityRef = firestore.collection('communities').doc(communityId);
    batch.update(communityRef, {
      status: 'active',
      verifiedAt: now,
    });

    const leaderProfileRef = firestore
      .collection(`communities/${communityId}/leader_profiles`)
      .doc(userId);
    batch.set(
      leaderProfileRef,
      {
        profileStatus: 'approved',
        intendedCommunityCount: 1,
        agreedToTerms: true,
        verifiedViaStripe: true,
        verifiedAt: now,
        lastUpdated: now,
      },
      { merge: true }
    );

    await batch.commit();
    return { success: true, verified: true };
  } catch (error: any) {
    console.error('Error completing Stripe verification:', error);
    return { success: false, error: error.message || 'Failed to verify Stripe status.' };
  }
}
