

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function getDropdownOptions(): Promise<Record<string, string[]>> {
  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('platform_settings').doc('dropdowns');
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      if (data && data.updatedAt) {
          delete data.updatedAt;
      }
      return data as Record<string, string[]>;
    } else {
      // Return default values if the document doesn't exist yet
      return {
        eventCategories: ["Music", "Food & Drink", "Arts & Culture", "Charity", "Sports", "Family", "Workshop", "Other"],
        whatsonCategories: ["Attraction", "Venue", "Park", "Museum", "Gallery", "Point of Interest", "Local Sport", "Other"],
        charityCategories: ["Community Support", "Animal Welfare", "Environment", "Youth Development", "Health & Wellness", "Arts & Culture", "Education", "Other"],
        newsCategories: ["Community news", "local sports", "council updates", "Business spotlight", "opinion", "Other"],
      };
    }
  } catch (error: any) {
    console.error("Error fetching dropdown options:", error);
    // On error, return empty arrays to prevent crashes, but log the issue.
    return {
      eventCategories: [],
      whatsonCategories: [],
      charityCategories: [],
      newsCategories: [],
    };
  }
}

export async function updateDropdownOptions(options: Record<string, string[]>): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('platform_settings').doc('dropdowns');
    await docRef.set(options, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating dropdown options:", error);
    return { success: false, error: error.message };
  }
}

export type ShoppingCategory = {
    id: string;
    name: string;
    subcategories: {
        id: string;
        name: string;
    }[];
};

export async function getShoppingCategories(): Promise<ShoppingCategory[]> {
  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('platform_settings').doc('shopping');
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return docSnap.data()?.categories || [];
    }
    return [];
  } catch (error: any) {
    console.error("Error fetching shopping categories:", error);
    return [];
  }
}
