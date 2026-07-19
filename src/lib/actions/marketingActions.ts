
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
  campaignId?: string;
};

type CampaignData = {
    id?: string;
    audience: string;
    feature: string;
    headline: string;
    body: string;
    socialMediaPost: string;
    coverImageUrl?: string;
}

export async function saveMarketingCampaignAction(data: CampaignData): Promise<ActionResponse> {
    if (!data.audience || !data.feature || !data.headline || !data.body || !data.socialMediaPost) {
        return { success: false, error: 'All content fields are required.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const campaignsCollection = firestore.collection('marketing_campaigns');
        const { id, ...dataToSave } = data;

        if (id) {
            // Update existing campaign
            const campaignRef = campaignsCollection.doc(id);
            await campaignRef.update({
                ...dataToSave,
                updatedAt: Timestamp.now(),
            });
            return { success: true, campaignId: id };
        } else {
            // Create new campaign
            const newCampaignRef = await campaignsCollection.add({
                ...dataToSave,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return { success: true, campaignId: newCampaignRef.id };
        }
    } catch (error: any) {
        console.error("Error saving marketing campaign:", error);
        return { success: false, error: error.message || 'Failed to save campaign.' };
    }
}

export async function deleteMarketingCampaignAction(campaignId: string): Promise<ActionResponse> {
    if (!campaignId) {
        return { success: false, error: "Campaign ID is required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('marketing_campaigns').doc(campaignId).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting marketing campaign:", error);
        return { success: false, error: error.message || 'Failed to delete campaign.' };
    }
}

export async function getMarketingStorageImagesAction(): Promise<{ success: boolean; error?: string; images?: { id: string; url: string; description: string }[] }> {
    try {
        const { adminApp } = initializeAdminApp();
        const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
        
        // List files under gallery/ prefix
        const [files] = await bucket.getFiles({ prefix: 'gallery/' });
        
        const imagesList = [];
        for (const file of files) {
            // Ignore the directory itself
            if (file.name === 'gallery/') continue;
            
            // Get path relative to gallery/
            const relativePath = file.name.substring('gallery/'.length);
            
            // If it contains a slash, it's inside a business folder (e.g. gallery/bizId/file.jpg)
            if (relativePath.includes('/')) continue;

            // Make the file public to ensure it can be viewed
            try {
                await file.makePublic();
            } catch (err: any) {
                console.warn(`Could not make file ${file.name} public:`, err.message);
            }
            
            const name = file.name.split('/').pop() || 'Marketing Image';
            imagesList.push({
                id: file.name,
                url: file.publicUrl() || `https://storage.googleapis.com/${bucket.name}/${file.name}`,
                description: name.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, "") // Human readable name
            });
        }
            
        return { success: true, images: imagesList };
    } catch (error: any) {
        console.error("Error fetching marketing images from storage:", error);
        return { success: false, error: error.message || 'Failed to fetch images from storage.' };
    }
}
