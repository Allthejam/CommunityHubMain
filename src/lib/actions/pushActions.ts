'use server';

import 'dotenv/config';
import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue } from "firebase-admin/firestore";
import * as webpush from 'web-push';

type ActionResponse = {
  success: boolean;
  error?: string;
};

if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    'mailto:tech@my-community-hub.co.uk',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
    console.warn("VAPID keys not configured. Push notifications will not work.");
}


type PushNotificationPayload = {
    audience: {
        type: 'users' | 'topic';
        value: string[];
    };
    notification: {
        title: string;
        body: string;
        tag?: string;
        url?: string;
    };
}

export async function sendPushNotificationAction(params: PushNotificationPayload): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    const { audience, notification } = params;

    if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        return { success: false, error: "VAPID keys are not configured on the server." };
    }
  
    if (audience.type !== 'users' || audience.value.length === 0) {
        return { success: true }; // No one to send to.
    }

    const payload = JSON.stringify(notification);

    try {
        const subscriptionsToDelete: { userId: string, docId: string }[] = [];

        for (const userId of audience.value) {
            const subsSnapshot = await firestore.collection(`users/${userId}/pushSubscriptions`).get();
            if (subsSnapshot.empty) continue;
            
            const pushPromises = subsSnapshot.docs.map(doc => {
                const sub = doc.data() as webpush.PushSubscription;
                return webpush.sendNotification(sub, payload)
                    .catch(error => {
                        if (error.statusCode === 410) { // Gone: subscription is no longer valid
                            subscriptionsToDelete.push({ userId, docId: doc.id });
                        } else {
                            console.error(`Error sending push to user ${userId}, endpoint ${sub.endpoint}:`, error.body);
                        }
                    });
            });
            await Promise.all(pushPromises);
        }

        if (subscriptionsToDelete.length > 0) {
            const batch = firestore.batch();
            subscriptionsToDelete.forEach(({ userId, docId }) => {
                const subRef = firestore.collection(`users/${userId}/pushSubscriptions`).doc(docId);
                batch.delete(subRef);
            });
            await batch.commit();
            console.log(`Deleted ${subscriptionsToDelete.length} stale push subscriptions.`);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error sending push notifications:", error);
        return { success: false, error: error.message };
    }
}

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
