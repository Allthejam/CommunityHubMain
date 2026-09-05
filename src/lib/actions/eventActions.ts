

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  id?: string;
};

type EventData = {
    ownerId?: string;
    communityId?: string;
    businessId?: string;
    businessName?: string;
    title: string;
    category: string;
    description: string;
    startDate: Date;
    endDate?: Date;
    repeatUntil?: Date;
    startTime?: string;
    image: string | null;
    metaTitle?: string;
    metaDescription?: string;
    repeat?: string;
}

export async function createEventAction(data: EventData): Promise<ActionResponse> {
    try {
        let communityId: string | null = data.communityId || null;
        let businessData: any;
        let businessName: string | null = data.businessName || null;

        const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);

        // If a businessId is provided, fetch its data
        if (data.businessId && data.businessId !== 'community_event') {
            const businessDoc = await firestore.collection('businesses').doc(data.businessId).get();
            if (businessDoc.exists) {
                businessData = businessDoc.data();
                businessName = businessData?.businessName || businessName;
                communityId = businessData?.primaryCommunityId || communityId;
            }
        } else if (!communityId && data.ownerId) {
            // If no communityId, get community from leader's profile.
            const userDoc = await firestore.collection('users').doc(data.ownerId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                communityId = userData?.communityId;
            }
            if (!businessName) businessName = "Community";
        }

        if (!communityId) {
             return { success: false, error: "Could not determine a community for this event." };
        }

        if (!businessName) {
            businessName = "Community";
        }

        let initialStatus: 'Pending Approval' | 'Live' | 'Upcoming' = 'Pending Approval';
        const isEnterprise = businessData?.accountType === 'enterprise';
        const isApprovedPartner = isEnterprise && (businessData?.status === 'Approved' || businessData?.status === 'Subscribed');
        const startDate = data.startDate ? new Date(data.startDate) : new Date();

        // Enterprise partners or leaders creating community events can bypass approval
        if (isApprovedPartner || !data.businessId) {
            initialStatus = startDate <= new Date() ? 'Live' : 'Upcoming';
        }

        const eventToCreate = {
            ...data,
            businessName: businessName,
            communityId: communityId,
            status: initialStatus,
            createdAt: Timestamp.now(),
            submittedAt: Timestamp.now(),
            startDate: Timestamp.fromDate(startDate),
            endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : null,
            repeatUntil: data.repeatUntil ? Timestamp.fromDate(new Date(data.repeatUntil)) : null,
        };

        const newEventRef = await firestore.collection('events').add(eventToCreate);
        
        // Notify leader if pending approval
        if (initialStatus === 'Pending Approval') {
            const usersRef = firestore.collection('users');
            const roleQuery = usersRef
                .where(`communityRoles.${communityId}.role`, 'in', ['leader', 'president'])
                .limit(1);
            let leaderSnapshot = await roleQuery.get();

            if (leaderSnapshot.empty) {
                const primaryLeaderQuery = usersRef
                    .where('homeCommunityId', '==', communityId)
                    .where('role', 'in', ['leader', 'president'])
                    .limit(1);
                leaderSnapshot = await primaryLeaderQuery.get();
            }

            if (!leaderSnapshot.empty) {
                const leaderId = leaderSnapshot.docs[0].id;
                const notificationRef = firestore.collection('notifications').doc();
                await notificationRef.set({
                    recipientId: leaderId,
                    communityId: communityId,
                    type: 'Event Request',
                    subject: `New event for approval: ${data.title}`,
                    from: businessName,
                    date: Timestamp.now(),
                    status: 'new',
                    relatedId: newEventRef.id,
                    targetApp: 'main'
                });
            }
        }

        return { success: true, id: newEventRef.id };

    } catch (error: any) {
        console.error("Error creating event:", error);
        return { success: false, error: error.message || "Failed to create event." };
    }
}


export async function updateEventAction(eventId: string, data: Partial<EventData>, communityId?: string): Promise<ActionResponse> {
  if (!eventId) {
    return { success: false, error: "Event ID is required." };
  }
  try {
    const targetCommunityId = communityId || data.communityId;
    const isDemo = targetCommunityId === '9ayHMyZf4SRw2gof1AM9' || targetCommunityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const eventRef = firestore.collection('events').doc(eventId);
    
    const updateData: any = { 
        ...data,
        updatedAt: Timestamp.now(),
    };

    if (data.startDate) {
      updateData.startDate = Timestamp.fromDate(new Date(data.startDate));
    }
    if ('endDate' in data) {
      updateData.endDate = data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : null;
    }
    if ('repeatUntil' in data) {
      updateData.repeatUntil = data.repeatUntil ? Timestamp.fromDate(new Date(data.repeatUntil)) : null;
    }

    await eventRef.update(updateData);
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating event ${eventId}:`, error);
    return { success: false, error: error.message || "Failed to update event." };
  }
}

export async function updateEventStatusAction(params: {
    eventId: string;
    status: string;
    communityId?: string;
}): Promise<ActionResponse> {
    try {
        const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const eventRef = firestore.collection('events').doc(params.eventId);
        await eventRef.update({ status: params.status });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating event status:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteEventAction(params: {
    eventId: string;
    communityId?: string;
}): Promise<ActionResponse> {
    try {
        const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        await firestore.collection('events').doc(params.eventId).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting event:", error);
        return { success: false, error: error.message };
    }
}

    

    