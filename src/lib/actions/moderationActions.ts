
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

// This function assumes keywords are stored in a single document for simplicity.
const getModerationDocRef = async () => {
    const { firestore } = initializeAdminApp();
    return firestore.collection('settings').doc('moderation');
}

export async function getModerationKeywords(): Promise<string[]> {
    try {
        const docRef = await getModerationDocRef();
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return docSnap.data()?.keywords || [];
        }
        return [];
    } catch (error) {
        console.error("Error fetching moderation keywords:", error);
        return [];
    }
}

export async function updateModerationKeywords(keywords: string[]): Promise<ActionResponse> {
    try {
        const docRef = await getModerationDocRef();
        await docRef.set({ keywords }, { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating moderation keywords:", error);
        return { success: false, error: error.message };
    }
}

export async function logUserOffense(params: {
    userId: string;
    action: 'warned' | 'suspended';
    moderatorId: string;
    moderatorName: string;
    reason: string;
    contentId: string;
    contentType: string;
}): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('user_offenses').add({
            ...params,
            createdAt: Timestamp.now(),
        });

        if (params.action === 'suspended') {
            await firestore.collection('users').doc(params.userId).update({
                status: 'suspended'
            });
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Error logging user offense:", error);
        return { success: false, error: error.message };
    }
}
