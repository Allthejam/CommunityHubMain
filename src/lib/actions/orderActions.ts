'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  orderId?: string;
};

export async function updateOrderStatusAction(params: { orderId: string, status: string }): Promise<ActionResponse> {
    const { orderId, status } = params;
    try {
        const { firestore } = initializeAdminApp();
        const orderRef = firestore.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) return { success: false, error: 'Order not found.' };

        const orderData = orderSnap.data()!;
        const batch = firestore.batch();
        batch.update(orderRef, { status, updatedAt: Timestamp.now() });
        
        const historyRef = firestore.doc(`users/${orderData.userId}/recent_orders/${orderId}`);
        batch.update(historyRef, { status });
        
        // Also update individual business orders
        const businessOwnerIds = orderData.businessOwnerIds || [];
        // We don't know the bizId here without querying or fetching them, 
        // but typically business owners manage their own part via their sub-collection.
        
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error updating order status:", error);
        return { success: false, error: error.message };
    }
}

export async function getMyOrdersAction(userId: string): Promise<any[]> {
    try {
        const { firestore } = initializeAdminApp();
        const snap = await firestore.collection('users').doc(userId).collection('recent_orders').orderBy('createdAt', 'desc').limit(50).get();
        return snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(), 
            createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : new Date().toISOString()
        }));
    } catch (error) {
        console.error("Error in getMyOrdersAction:", error);
        return [];
    }
}

export async function getBusinessOrdersAction(ownerId: string): Promise<any[]> {
    try {
        const { firestore } = initializeAdminApp();
        // Query the master orders collection using the array-contains operator
        const snap = await firestore.collection('orders')
            .where('businessOwnerIds', 'array-contains', ownerId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
            
        return snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(), 
            createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : new Date().toISOString()
        }));
    } catch (error) {
        console.error("Error in getBusinessOrdersAction:", error);
        return [];
    }
}

export async function getCourierOrdersAction(courierId: string, communityId: string): Promise<any[]> {
    try {
        const { firestore } = initializeAdminApp();
        const commDoc = await firestore.collection('communities').doc(communityId).get();
        if (!commDoc.exists || commDoc.data()?.courierId !== courierId) {
            return [];
        }

        const snap = await firestore.collection('orders')
            .where('communityId', '==', communityId)
            .where('deliveryType', '==', 'local_courier')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        
        return snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(), 
            createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : new Date().toISOString()
        }));
    } catch (error) {
        console.error("Error in getCourierOrdersAction:", error);
        return [];
    }
}
