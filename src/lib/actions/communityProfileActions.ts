

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type CommunityProfile = {
  headline?: string;
  introduction?: string;
  mainContent?: string;
  bannerImage?: string;
  bannerImageDescription?: string;
  imageOne?: string;
  imageOneDescription?: string;
  imageTwo?: string;
  imageTwoDescription?: string;
  area?: string;
  mapEmbedCode?: string;
  population?: string;
  yearEstablished?: string;
  metaTitle?: string;
  metaDescription?: string;
  usefulInformation?: { name: string; number: string; address: string }[];
  communityInformation?: {
    name: string;
    title: string;
    email: string;
    phone: string;
  }[];
};

async function uploadIfBase64(imageData: string | null | undefined, communityId: string, fieldName: string): Promise<string | null> {
    if (!imageData || !imageData.startsWith('data:image')) {
        return imageData || null; // It's already a URL or null
    }

    const { adminApp } = initializeAdminApp();
    const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
    
    const match = imageData.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.*)$/);
    if (!match) {
        throw new Error(`Invalid image data format for ${fieldName}.`);
    }

    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const path = `community_assets/${communityId}/${fieldName}_${Date.now()}`;
    const file = bucket.file(path);

    await file.save(buffer, {
        metadata: { contentType },
    });
    
    await file.makePublic();
    return file.publicUrl();
}


export async function updateCommunityProfileAction(params: {
  communityId: string;
  data: CommunityProfile;
}): Promise<ActionResponse> {
  const { communityId, data } = params;
  if (!communityId) {
    return { success: false, error: 'Community ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const communityRef = firestore.collection('communities').doc(communityId);
    
    const communitySnap = await communityRef.get();
    
    if (!communitySnap.exists) {
        return { success: false, error: 'Community not found.' };
    }
    
    // Process images: upload if they are base64, otherwise keep the URL
    const bannerImageUrl = await uploadIfBase64(data.bannerImage, communityId, 'banner');
    const imageOneUrl = await uploadIfBase64(data.imageOne, communityId, 'imageOne');
    const imageTwoUrl = await uploadIfBase64(data.imageTwo, communityId, 'imageTwo');

    const profileDataWithUrls = {
        ...data,
        bannerImage: bannerImageUrl,
        imageOne: imageOneUrl,
        imageTwo: imageTwoUrl,
    };


    const communityData = communitySnap.data();
    let profileId = communityData?.profileId;

    // If no profileId exists, create one.
    if (!profileId) {
        // We can use the communityId as the profileId for consistency.
        profileId = communityId;
        
        // Atomically update the community doc with the new profileId
        // and create the new profile document.
        const profileRef = firestore.collection('community_profiles').doc(profileId);
        
        const batch = firestore.batch();
        batch.update(communityRef, { profileId: profileId });
        batch.set(profileRef, profileDataWithUrls);
        
        await batch.commit();

    } else {
        // If profileId exists, just update the profile document.
        const profileRef = firestore.collection('community_profiles').doc(profileId);
        await profileRef.set(profileDataWithUrls, { merge: true });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating community profile:', error);
    return { success: false, error: error.message || 'Failed to update profile.' };
  }
}

    