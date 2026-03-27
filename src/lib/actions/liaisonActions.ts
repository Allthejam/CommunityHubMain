

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { sendEmail } from './emailActions';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type LiaisonApplicationData = {
    applicantId: string;
    applicantName: string;
    applicantTitle: string;
    communityId: string;
    communityName: string;
    justification: string;
    stationName: string;
    stationAddress: string;
    stationPhoneNumber: string;
    referenceName?: string;
    referenceTitle?: string;
}

export async function createLiaisonApplicationAction(data: LiaisonApplicationData): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();

        // Fetch community to get full location data
        const communityRef = firestore.collection('communities').doc(data.communityId);
        const communityDoc = await communityRef.get();
        if (!communityDoc.exists) {
            return { success: false, error: "Selected community not found." };
        }
        const communityData = communityDoc.data()!;
        
        const applicationRef = firestore.collection('liaison_applications').doc();
        batch.set(applicationRef, {
            ...data,
            country: communityData.country || null,
            state: communityData.state || null,
            region: communityData.region || null,
            status: 'Pending Leader Review',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        // Find community leader(s)
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
                    type: 'Leadership Application',
                    subject: `New Liaison Application from ${data.applicantName}`,
                    from: "Platform System",
                    date: Timestamp.now(),
                    status: 'new',
                    relatedId: applicationRef.id,
                    communityId: data.communityId,
                    actionUrl: '/leader/applications',
                });
            });
        }
        
        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error creating liaison application:", error);
        return { success: false, error: error.message };
    }
}

export async function updateLiaisonApplicationStatusAction(params: {
  applicationId: string;
  status: 'Pending Admin Verification' | 'Declined' | 'Approved';
  communityName?: string;
  applicantName?: string;
  processingNotes?: string;
  processorId?: string;
  processorName?: string;
}): Promise<ActionResponse> {
  const { applicationId, status, communityName, applicantName, processingNotes, processorId, processorName } = params;
  
  try {
    const { firestore } = initializeAdminApp();
    const appRef = firestore.collection('liaison_applications').doc(applicationId);
    
    // Base update payload
    const updateData: any = { 
      status, 
      updatedAt: Timestamp.now() 
    };

    // Add endorsement details if being endorsed by a leader
    if (status === 'Pending Admin Verification') {
      updateData.processingNotes = processingNotes || "";
      updateData.processedBy = processorName || null;
      updateData.processorId = processorId || null;
      updateData.processedAt = Timestamp.now();
    }
    
    await appRef.update(updateData);

    const appDoc = await appRef.get();
    if (!appDoc.exists) {
      throw new Error("Application not found after update.");
    }
    const appData = appDoc.data()!;
    const applicantId = appData.applicantId;

    // --- Handle Side Effects Based on New Status ---

    // 1. If APPROVED by an Admin
    if (status === 'Approved') {
        const userRef = firestore.collection('users').doc(applicantId);
        const batch = firestore.batch();

        const defaultLiaisonPermissions = {
            hasBackOfficeAccess: true,
            viewReports: true,
            viewNotifications: true,
            viewDashboard: false, viewAnalytics: false, viewUsers: false, viewCommunities: false, viewTeam: false,
            viewFinancials: false, viewEmergency: false, viewAnnouncements: false, viewAdverts: false,
            viewModeration: false, viewAuditLog: false, viewChat: false, viewPricing: false, viewAccess: false,
            viewSettings: false, viewLawEnforcement: false, actionBroadcast: false, actionManageContent: false,
            actionManageUsers: false, actionManageAccess: false, actionManageCommunities: false,
            isCommunityCreator: false, actionSetTeamPermissions: false, actionManageHierarchy: false,
            actionChangeGeneralSettings: false, actionChangePricing: false, actionManageModeration: false,
            accessStripe: false, actionImpersonateUser: false, actionImpersonateLeader: false,
            actionViewUserProfile: false, viewApplications: false, actionApproveApplications: false,
            actionCreateNews: false, actionEditNews: false, actionApproveNews: false, actionDeleteContent: false,
            actionInviteMembers: false, actionSuspendUsers: false, actionRemoveFromCommunity: false,
            actionChangeRoles: false, actionContactPlatformAdmin: false, viewForumManagement: false,
            viewLostAndFound: false, viewAbout: false, actionSetPoliceLiaison: false, actionSetCommunityBoundary: false,
            canSendStandardBroadcast: false, canSendEmergencyBroadcast: false, viewNewsManagement: false,
            viewMarketing: false, viewFaq: false, viewEvents: false, viewBusinesses: false, viewWhatson: false,
            viewCharities: false, canViewAllCommunityReports: false, viewableReportCategories: []
        };
        
        const communityId = appData.communityId;
        
        // Assign the police liaison role specifically for the approved community
        batch.update(userRef, { 
            [`communityRoles.${communityId}`]: {
                role: 'police-liaison-officer',
                title: 'Police Liaison Officer',
                permissions: defaultLiaisonPermissions
            },
            memberOf: FieldValue.arrayUnion(communityId)
        });

        // Notify the newly approved officer
        const officerNotificationRef = firestore.collection('notifications').doc();
        batch.set(officerNotificationRef, {
            recipientId: applicantId,
            type: 'Leadership Application',
            subject: `Congratulations! Your liaison application for ${appData.communityName} has been approved.`,
            from: 'Platform Administration',
            date: Timestamp.now(),
            status: 'new',
            relatedId: appData.communityId,
        });
        
        // Notify the leader who endorsed it
        const leaderQuery = firestore.collection('users').where(`communityRoles.${appData.communityId}.role`, 'in', ['leader', 'president']).limit(1);
        const leaderSnapshot = await leaderQuery.get();
        if (!leaderSnapshot.empty) {
            const leaderId = leaderSnapshot.docs[0].id;
            const leaderNotificationRef = firestore.collection('notifications').doc();
            batch.set(leaderNotificationRef, {
                recipientId: leaderId,
                type: 'Leadership Application',
                subject: `Liaison application for ${appData.applicantName} was approved.`,
                from: 'Platform Administration',
                date: Timestamp.now(),
                status: 'new',
                relatedId: applicationId,
            });
        }
        await batch.commit();
    }
    // 2. If ENDORSED by a Leader
    else if (status === 'Pending Admin Verification') {
        const adminUsersQuery = firestore.collection('users').where('role', 'in', ['admin', 'owner']);
        const adminSnapshot = await adminUsersQuery.get();

        if (!adminSnapshot.empty) {
            const batch = firestore.batch();
            adminSnapshot.forEach(adminDoc => {
                const notificationRef = firestore.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientId: adminDoc.id,
                    type: 'Leadership Application',
                    subject: `Liaison Application Endorsed for ${communityName}`,
                    from: applicantName,
                    date: Timestamp.now(),
                    status: 'new',
                    relatedId: applicationId,
                    actionUrl: '/admin/liaison-applications'
                });
            });
            await batch.commit();
        }
    }
    // 3. If DECLINED
    else if (status === 'Declined') {
        // Optionally, send a notification to the applicant that their application was declined.
        const applicantNotificationRef = firestore.collection('notifications').doc();
        await applicantNotificationRef.set({
            recipientId: applicantId,
            type: 'Leadership Application',
            subject: `Update on your liaison application for ${appData.communityName}`,
            from: 'Platform Administration',
            date: Timestamp.now(),
            status: 'new',
            relatedId: applicationId,
        });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating liaison application status:", error);
    return { success: false, error: error.message };
  }
}

export async function inviteExistingMemberToApplyAction(params: {
  nomineeId: string;
  communityId: string;
  communityName: string;
  inviterName: string;
}): Promise<ActionResponse> {
  const { nomineeId, communityId, communityName, inviterName } = params;
  try {
    const { firestore } = initializeAdminApp();
    const notificationRef = firestore.collection('notifications').doc();
    await notificationRef.set({
      recipientId: nomineeId,
      type: 'Leadership Application',
      subject: `${inviterName} has nominated you to become a Police Liaison for ${communityName}`,
      from: inviterName,
      date: Timestamp.now(),
      status: 'new',
      relatedId: communityId,
      actionUrl: '/police-liaison/apply'
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function inviteExternalPersonToApplyAction(params: {
  nomineeName: string;
  nomineeEmail: string;
  inviterName: string;
  communityName: string;
}): Promise<ActionResponse> {
    const { nomineeName, nomineeEmail, inviterName, communityName } = params;

    const signupUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/signup/personal`;

    try {
        await sendEmail({
            to: [{ email: nomineeEmail, name: nomineeName }],
            subject: `An invitation to join the ${communityName} Hub as a Police Liaison`,
            htmlContent: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>You've Been Recommended!</h2>
                    <p>Hello ${nomineeName},</p>
                    <p>${inviterName} has recommended you for the role of Police Liaison for the <strong>${communityName}</strong> community on the Community Hub platform.</p>
                    <p>This is a vital role that helps facilitate communication between the community and local law enforcement.</p>
                    <p>To proceed, please first create a personal account on Community Hub by clicking the button below. Once registered, you can complete the Police Liaison application from the link in the website footer.</p>
                    <p style="margin: 20px 0;">
                        <a href="${signupUrl}" style="background-color: #4338ca; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Create Your Account</a>
                    </p>
                    <p>If you have any questions, please feel free to reply to this email to get in touch with the platform administrators.</p>
                </div>
            `,
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error sending email invitation:", error);
        return { success: false, error: "Failed to send email invitation." };
    }
}

    
