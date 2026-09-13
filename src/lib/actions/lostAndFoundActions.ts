
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type ReportItemParams = {
    type: 'lost' | 'found';
    description: string;
    location: string;
    date: Date;
    image: string | null;
    ownerId: string;
    communityId: string;
    reporterName: string;
}

export async function getLostAndFoundAction(communityId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!communityId) return { success: false, error: 'Community ID required' };
    try {
        const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const snapshot = await firestore.collection('lostAndFound')
            .where('communityId', '==', communityId)
            .get();
        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        return { success: true, data: items };
    } catch (error: any) {
        console.error('Error fetching lost and found:', error);
        return { success: false, error: error.message };
    }
}

export async function reportLostOrFoundItemAction(params: ReportItemParams): Promise<ActionResponse> {
    const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
    const effectiveOwnerId = params.ownerId || (isDemo ? 'demo-personal' : '');
    if (!params.communityId || !effectiveOwnerId) {
        return { success: false, error: 'User or community information is missing.' };
    }
    
    try {
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const batch = firestore.batch();
        
        const itemRef = firestore.collection('lostAndFound').doc();
        batch.set(itemRef, {
            ...params,
            ownerId: effectiveOwnerId,
            reporterName: params.reporterName || (isDemo ? 'Demo Resident' : 'Community Member'),
            date: Timestamp.fromDate(new Date(params.date)),
            status: 'active', // Lost & Found items go live immediately
            createdAt: Timestamp.now(), 
        });
        
        // Notify leaders for moderation
        const usersRef = firestore.collection('users');
        const roleQuery = usersRef
            .where(`communityRoles.${params.communityId}.role`, 'in', ['leader', 'president'])
            .limit(5);
        let leaderSnapshot = await roleQuery.get();

        if (leaderSnapshot.empty) {
            const primaryLeaderQuery = usersRef
                .where('homeCommunityId', '==', params.communityId)
                .where('role', 'in', ['leader', 'president'])
                .limit(5);
            leaderSnapshot = await primaryLeaderQuery.get();
        }

        if (!leaderSnapshot.empty) {
            leaderSnapshot.forEach(leaderDoc => {
                const notificationRef = firestore.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientId: leaderDoc.id,
                    type: 'Lost & Found Report',
                    subject: `New live ${params.type} item reported (#${itemRef.id.substring(0, 6)})`,
                    from: params.reporterName || 'Resident',
                    date: Timestamp.now(),
                    status: 'new',
                    relatedId: itemRef.id,
                    communityId: params.communityId,
                });
            });
        }
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error reporting lost or found item:", error);
        return { success: false, error: error.message };
    }
}

export async function updateLostAndFoundStatusAction(params: {
  itemId: string;
  status: 'active' | 'resolved' | 'rejected' | 'deleted';
  communityId: string;
}): Promise<ActionResponse> {
  const { itemId, status, communityId } = params;
  if (!itemId || !status || !communityId) {
    return { success: false, error: 'Item ID, status, and community ID are required.' };
  }

  try {
    const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const itemRef = firestore.collection('lostAndFound').doc(itemId);
    await itemRef.update({ status: status });
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating item ${itemId} to status ${status}:`, error);
    return { success: false, error: error.message || 'Failed to update status.' };
  }
}

export async function deleteLostAndFoundItemAction(params: {
  itemId: string;
  communityId?: string;
}): Promise<ActionResponse> {
  const { itemId, communityId } = params;
  if (!itemId) {
    return { success: false, error: 'Item ID is required.' };
  }

  try {
    const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    await firestore.collection('lostAndFound').doc(itemId).delete();
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting item ${itemId}:`, error);
    return { success: false, error: error.message || 'Failed to delete item.' };
  }
}
