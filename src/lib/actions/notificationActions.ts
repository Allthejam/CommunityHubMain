
'use server';

import 'dotenv/config';
import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
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

export async function updateNotificationStatusAction(params: {
  notificationId: string;
  status: string;
  actor?: string;
  assignedTo?: { id: string; name: string };
}): Promise<ActionResponse> {
  const { notificationId, status, actor, assignedTo } = params;
  if (!notificationId || !status) {
    return { success: false, error: 'Notification ID and status are required.' };
  }
  
  try {
    const { firestore } = initializeAdminApp();
    const notificationRef = firestore.collection('notifications').doc(notificationId);
    
    const updateData: { [key: string]: any } = { 
        status: status,
    };

    if(actor) {
        updateData.history = FieldValue.arrayUnion({
            action: status,
            actor: actor,
            timestamp: Timestamp.now()
        })
    }

    if (status === 'Assigned' && assignedTo) {
        updateData.assignedTo = assignedTo;
    }

    await notificationRef.update(updateData);
    
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating notification ${notificationId} to status ${status}:`, error);
    return { success: false, error: error.message || 'Failed to update notification status.' };
  }
}

export async function deleteNotificationAction(params: {
  notificationId: string;
}): Promise<ActionResponse> {
  const { notificationId } = params;
  if (!notificationId) {
    return { success: false, error: 'Notification ID is required.' };
  }
  
  try {
    const { firestore } = initializeAdminApp();
    const notificationRef = firestore.collection('notifications').doc(notificationId);
    await notificationRef.delete();
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting notification ${notificationId}:`, error);
    return { success: false, error: error.message || 'Failed to delete notification.' };
  }
}
