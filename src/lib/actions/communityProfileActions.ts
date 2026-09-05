'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
};

export type CommunityProfile = {
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
  policeContact?: {
    stationName: string;
    officerName: string;
    contactEmail: string;
    contactPhone: string;
  };
  showLeadershipOnAboutPage?: boolean;
};

async function uploadIfBase64(imageData: string | null | undefined, communityId: string, fieldName: string): Promise<string | null> {
    if (!imageData || !imageData.startsWith('data:image')) {
        return imageData || null;
    }

    try {
        const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
        const { adminApp } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
        
        const match = imageData.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.*)$/);
        if (!match) {
            return imageData;
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
    } catch (e) {
        console.warn("Could not upload to GCS, saving base64 directly:", e);
        return imageData;
    }
}

export async function getCommunityProfileAction(communityId: string): Promise<{
  success: boolean;
  data?: CommunityProfile;
  communityName?: string;
  error?: string;
}> {
  if (!communityId) {
    return { success: false, error: 'Community ID is required.' };
  }
  try {
    const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);

    const commSnap = await firestore.collection('communities').doc(communityId).get();
    const commData = commSnap.data();
    const profileId = commData?.profileId || communityId;

    const profileSnap = await firestore.collection('community_profiles').doc(profileId).get();
    if (profileSnap.exists) {
      return {
        success: true,
        data: profileSnap.data() as CommunityProfile,
        communityName: commData?.name || (isDemo ? "Oakridge & DemoVille" : undefined),
      };
    }

    return {
      success: true,
      data: undefined,
      communityName: commData?.name || (isDemo ? "Oakridge & DemoVille" : undefined),
    };
  } catch (error: any) {
    console.error('Error getting community profile:', error);
    return { success: false, error: error.message };
  }
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
    const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
    const communityRef = firestore.collection('communities').doc(communityId);
    
    const communitySnap = await communityRef.get();
    
    // Process images
    const bannerImageUrl = await uploadIfBase64(data.bannerImage, communityId, 'banner');
    const imageOneUrl = await uploadIfBase64(data.imageOne, communityId, 'imageOne');
    const imageTwoUrl = await uploadIfBase64(data.imageTwo, communityId, 'imageTwo');

    const profileDataWithUrls = {
        ...data,
        bannerImage: bannerImageUrl,
        imageOne: imageOneUrl,
        imageTwo: imageTwoUrl,
    };

    const communityData = communitySnap.exists ? communitySnap.data() : null;
    const profileId = communityData?.profileId || communityId;

    const profileRef = firestore.collection('community_profiles').doc(profileId);
    await profileRef.set(profileDataWithUrls, { merge: true });

    if (communitySnap.exists && !communityData?.profileId) {
      await communityRef.update({ profileId });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating community profile:', error);
    return { success: false, error: error.message || 'Failed to update profile.' };
  }
}