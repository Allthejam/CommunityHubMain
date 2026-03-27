

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type OrderItem = {
    productId: string;
    name: string;
    quantity: number;
    price: number;
}

type OrderParams = {
    userId: string;
    businessId: string;
    items: OrderItem[];
    totalAmount: number;
    shippingAddress: string;
}

export async function createOrderAction(params: OrderParams): Promise<ActionResponse> {
    const { userId, businessId, items, totalAmount, shippingAddress } = params;
    
    console.log(`[createOrderAction] Starting for business: ${businessId}, user: ${userId}`);

    if (!userId || !businessId || !items || items.length === 0) {
        console.error("[createOrderAction] Validation failed: Missing required order information.", params);
        return { success: false, error: 'Missing required order information.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        
        await firestore.runTransaction(async (transaction) => {
            console.log(`[createOrderAction] Transaction started for business: ${businessId}`);
            const businessRef = firestore.collection('businesses').doc(businessId);
            const businessDoc = await transaction.get(businessRef);

            if (!businessDoc.exists) {
                throw new Error(`Business ${businessId} not found during transaction.`);
            }
            const businessData = businessDoc.data()!;
            const ownerId = businessData.ownerId;

            if (!ownerId) {
                throw new Error(`Business owner for ${businessId} could not be determined.`);
            }

            // 1. Create the main order document
            const orderRef = firestore.collection('orders').doc();
            const orderPayload = {
                userId,
                businessId,
                businessOwnerId: ownerId,
                businessName: businessData.businessName,
                items,
                totalAmount,
                shippingAddress,
                status: 'Received',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                customerName: shippingAddress.split(',')[0] || 'Customer',
            };
            transaction.set(orderRef, orderPayload);
            console.log(`[createOrderAction] Step 1: Order document created in transaction for order ${orderRef.id}`);
            
            // 2. Create a notification for the business owner
            const notificationRef = firestore.collection('notifications').doc();
            transaction.set(notificationRef, {
                recipientId: ownerId,
                type: 'New Order',
                subject: `You have a new order! (ID: ${orderRef.id.substring(0, 6)})`,
                from: 'Community Marketplace',
                date: Timestamp.now().toDate().toISOString(),
                status: 'new',
                relatedId: orderRef.id,
            });
             console.log(`[createOrderAction] Step 2: Notification queued for business owner ${ownerId}`);

            // 3. Add a summary to the user's recent_orders subcollection
            const recentOrderRef = firestore.collection(`users/${userId}/recent_orders`).doc(orderRef.id);
            transaction.set(recentOrderRef, {
                businessName: businessData.businessName,
                totalAmount: totalAmount,
                createdAt: Timestamp.now(),
                status: 'Received',
                items: items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    name: item.name,
                })),
            });
             console.log(`[createOrderAction] Step 3: Recent order summary created for user ${userId}`);

            // 4. Decrement stock for each product
            console.log(`[createOrderAction] Step 4: Starting stock decrement for ${items.length} items...`);
            for (const item of items) {
                const idParts = item.productId.split('-');
                const isVariation = idParts.length > 1;
                const baseProductId = idParts[0];

                if (isVariation) {
                    const [, category, size, colour] = idParts;
                    const variationRef = firestore.collection(`businesses/${businessId}/products/${baseProductId}/product_data`).doc('variations');
                    const variationDoc = await transaction.get(variationRef);
                    
                    if (!variationDoc.exists) throw new Error(`Variation data for product ${baseProductId} not found.`);
                    
                    const stockData = variationDoc.data()?.stock || {};
                    const currentStock = stockData?.[category]?.[size]?.[colour] || 0;
                    const newStock = currentStock - item.quantity;
                    
                    if (newStock < 0) {
                        const productName = (await transaction.get(firestore.collection('businesses').doc(businessId).collection('products').doc(baseProductId))).data()?.name || `Product ${baseProductId}`;
                        throw new Error(`Not enough stock for ${productName} (${category}/${size}/${colour}).`);
                    }
                    
                    const fieldPath = `stock.${category}.${size}.${colour}`;
                    transaction.update(variationRef, { [fieldPath]: newStock });
                    console.log(`[createOrderAction] Decremented stock for variation ${item.productId} to ${newStock}`);

                } else { // Simple product
                    const productRef = firestore.collection(`businesses/${businessId}/products`).doc(item.productId);
                    const productDoc = await transaction.get(productRef);
                    if (!productDoc.exists) throw new Error(`Product ${item.productId} not found.`);
                    
                    const currentStock = productDoc.data()!.stock;
                    const newStock = currentStock - item.quantity;

                    if (newStock < 0) {
                        throw new Error(`Not enough stock for product ${productDoc.data()!.name}.`);
                    }
                    transaction.update(productRef, { stock: newStock });
                    console.log(`[createOrderAction] Decremented stock for simple product ${item.productId} to ${newStock}`);
                }
            }
             console.log(`[createOrderAction] Transaction completed successfully for business ${businessId}`);
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error creating order and notification:", error);
        return { success: false, error: 'Failed to process your order.' };
    }
}

export async function updateOrderStatusAction(params: {
    orderId: string,
    status: string,
}): Promise<ActionResponse> {
    const { orderId, status } = params;
    if (!orderId || !status) {
        return { success: false, error: 'Order ID and new status are required.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const orderRef = firestore.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found.' };
        }

        const orderData = orderDoc.data()!;
        const batch = firestore.batch();

        const updatePayload = {
            status: status,
            updatedAt: Timestamp.now(),
        };

        // Update the main order document
        batch.update(orderRef, updatePayload);

        // Send notification to customer on key status changes
        if (['Packed', 'Shipped', 'Ready for Collection', 'Delivered/Collected'].includes(status)) {
            const notificationRef = firestore.collection('notifications').doc();
            batch.set(notificationRef, {
                recipientId: orderData.userId,
                type: 'Order Update',
                subject: `Your order #${orderId.substring(0,6)} is now ${status.toLowerCase()}!`,
                from: orderData.businessName || 'Your Local Store',
                date: Timestamp.now().toDate().toISOString(),
                status: 'new',
                relatedId: orderId,
            });
        }
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error updating order status:", error);
        return { success: false, error: error.message || 'Failed to update order status.' };
    }
}
