
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type MarketplaceItemData = {
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  communityId: string;
  title: string;
  description: string;
  listingType: 'For Sale' | 'To Swap' | 'Free' | 'Looking For';
  price?: number;
  image?: string | null;
};

export async function getMarketplaceListingsAction(communityId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  if (!communityId) return { success: false, error: 'Community ID required' };
  try {
    const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const snapshot = await firestore.collection(`communities/${communityId}/marketplace`).get();
    const items = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
        expiresAt: d.expiresAt?.toDate ? d.expiresAt.toDate().toISOString() : d.expiresAt,
      };
    });
    return { success: true, data: items };
  } catch (error: any) {
    console.error('Error fetching marketplace listings:', error);
    return { success: false, error: error.message };
  }
}

export async function createMarketplaceListingAction(data: MarketplaceItemData): Promise<ActionResponse> {
  const isDemo = data.communityId === '9ayHMyZf4SRw2gof1AM9' || data.communityId === 'c_showhome';
  const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
  try {
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + 21);

    await firestore.collection(`communities/${data.communityId}/marketplace`).add({
      ...data,
      ownerId: data.ownerId || (isDemo ? 'demo-personal' : ''),
      ownerName: data.ownerName || (isDemo ? 'Demo Resident' : 'Community Member'),
      price: data.price ? Number(data.price) : 0,
      status: 'active',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error creating marketplace listing:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteMarketplaceListingAction(params: { communityId: string, itemId: string, userId: string }): Promise<ActionResponse> {
  const { communityId, itemId, userId } = params;
  try {
    const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const itemRef = firestore.doc(`communities/${communityId}/marketplace/${itemId}`);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists && !isDemo) {
      throw new Error("Item not found.");
    }
    if (itemDoc.exists && itemDoc.data()?.ownerId !== userId && !isDemo) {
      throw new Error("You do not have permission to delete this item.");
    }

    if (itemDoc.exists) {
      await itemRef.delete();
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting marketplace item:", error);
    return { success: false, error: error.message };
  }
}
