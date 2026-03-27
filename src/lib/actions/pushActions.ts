'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function saveSubscriptionAction(params: {
  userId: string;
  subscription: PushSubscriptionJSON;
}): Promise<ActionResponse> {
  const { userId, subscription } = params;
  if (!userId || !subscription) {
    return { success: false, error: 'User ID and subscription object are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const subscriptionCollection = firestore.collection(`users/${userId}/pushSubscriptions`);
    
    // Check if the subscription endpoint already exists to avoid duplicates
    const existingSubQuery = await subscriptionCollection.where('endpoint', '==', subscription.endpoint).limit(1).get();

    if (existingSubQuery.empty) {
        await subscriptionCollection.add(subscription);
    } else {
        // It exists, maybe update it if keys changed, but for now we do nothing.
        console.log("Subscription already exists for this endpoint.");
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error saving push subscription:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSubscriptionAction(params: {
    userId: string;
    endpoint: string;
}): Promise<ActionResponse> {
    const { userId, endpoint } = params;
    if (!userId || !endpoint) {
        return { success: false, error: 'User ID and endpoint are required.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const subscriptionCollection = firestore.collection(`users/${userId}/pushSubscriptions`);
        const snapshot = await subscriptionCollection.where('endpoint', '==', endpoint).get();

        if (snapshot.empty) {
            return { success: true }; // Nothing to delete
        }
        
        const batch = firestore.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting push subscription:", error);
        return { success: false, error: error.message };
    }
}
