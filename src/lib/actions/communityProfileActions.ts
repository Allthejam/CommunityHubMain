'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { getStorage } from 'firebase-admin/storage';
import { type DefibrillatorItem, DEFAULT_DEMO_DEFIBRILLATORS } from '@/lib/types/defibrillators';

export type { DefibrillatorItem };

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
  defibrillators?: DefibrillatorItem[];
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

function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned as any;
  }
  return data;
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

    let profileSnap = await firestore.collection('community_profiles').doc(profileId).get();
    if (!profileSnap.exists && profileId !== communityId) {
      profileSnap = await firestore.collection('community_profiles').doc(communityId).get();
    }

    // If not found in comfeed and isDemo, fallback to default database
    if (!profileSnap.exists && isDemo) {
      try {
        const defaultDb = initializeAdminApp().firestore;
        profileSnap = await defaultDb.collection('community_profiles').doc(profileId).get();
        if (!profileSnap.exists && profileId !== communityId) {
          profileSnap = await defaultDb.collection('community_profiles').doc(communityId).get();
        }
      } catch (e) {}
    }

    if (profileSnap.exists) {
      const data = profileSnap.data() as CommunityProfile;
      if (isDemo && (!data.defibrillators || data.defibrillators.length === 0)) {
        data.defibrillators = DEFAULT_DEMO_DEFIBRILLATORS;
      }
      return {
        success: true,
        data,
        communityName: commData?.name || (isDemo ? "Oakridge & DemoVille" : undefined),
      };
    }

    return {
      success: true,
      data: isDemo ? { defibrillators: DEFAULT_DEMO_DEFIBRILLATORS } : undefined,
      communityName: commData?.name || (isDemo ? "Oakridge & DemoVille" : undefined),
    };
  } catch (error: any) {
    console.error('Error getting community profile:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCommunityProfileAction(params: {
  communityId: string;
  data: Partial<CommunityProfile>;
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
    
    // Process images safely without injecting undefined
    const profileDataWithUrls: Record<string, any> = { ...data };

    if (data.bannerImage !== undefined) {
      const bannerImageUrl = await uploadIfBase64(data.bannerImage, communityId, 'banner');
      if (bannerImageUrl !== null) profileDataWithUrls.bannerImage = bannerImageUrl;
    }
    if (data.imageOne !== undefined) {
      const imageOneUrl = await uploadIfBase64(data.imageOne, communityId, 'imageOne');
      if (imageOneUrl !== null) profileDataWithUrls.imageOne = imageOneUrl;
    }
    if (data.imageTwo !== undefined) {
      const imageTwoUrl = await uploadIfBase64(data.imageTwo, communityId, 'imageTwo');
      if (imageTwoUrl !== null) profileDataWithUrls.imageTwo = imageTwoUrl;
    }

    const cleanedProfile = cleanForFirestore(profileDataWithUrls);

    const communityData = communitySnap.exists ? communitySnap.data() : null;
    const profileId = communityData?.profileId || communityId;

    // 1. Save to primary profile document
    const profileRef = firestore.collection('community_profiles').doc(profileId);
    await profileRef.set(cleanedProfile, { merge: true });

    if (communitySnap.exists && !communityData?.profileId) {
      await communityRef.update({ profileId });
    }

    // 2. Also save to community_profiles/{communityId} so lookups by communityId always succeed
    if (profileId !== communityId) {
      await firestore.collection('community_profiles').doc(communityId).set(cleanedProfile, { merge: true });
    }

    // 3. Mirror to default Firestore when in demo mode so both databases stay in sync
    if (isDemo) {
      try {
        const defaultDb = initializeAdminApp().firestore;
        await defaultDb.collection('community_profiles').doc(profileId).set(cleanedProfile, { merge: true });
        if (profileId !== communityId) {
          await defaultDb.collection('community_profiles').doc(communityId).set(cleanedProfile, { merge: true });
        }
      } catch (mirrorErr) {
        console.warn("Could not mirror to default Firestore:", mirrorErr);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating community profile:', error);
    return { success: false, error: error.message || 'Failed to update profile.' };
  }
}