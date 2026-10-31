'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
};

export type DefibrillatorItem = {
  id: string;
  name: string;
  address: string;
  locationNotes?: string;
  accessType: '24_7' | 'restricted';
  accessHours?: string;
  cabinetType?: 'locked_keypad' | 'unlocked';
  cabinetCodeInstructions?: string;
  what3words?: string;
  lat?: number;
  lng?: number;
  custodianContact?: string;
};

export const defaultDemoDefibrillators: DefibrillatorItem[] = [
  {
    id: 'defib-1',
    name: 'The Square - Preserved Red Telephone Kiosk',
    address: 'The Square, High Street, Grantown-on-Spey PH26 3HG',
    locationNotes: 'Inside the iconic heritage red telephone box on the east corner of the town square.',
    accessType: '24_7',
    cabinetType: 'locked_keypad',
    cabinetCodeInstructions: 'Call 999 for ambulance keypad code',
    what3words: '///reminds.stages.bounty',
    lat: 57.3308,
    lng: -3.6120,
    custodianContact: 'Grantown Community Council',
  },
  {
    id: 'defib-2',
    name: 'Grantown Health Centre & Medical Practice',
    address: 'Castle Road, Grantown-on-Spey PH26 3HR',
    locationNotes: 'Mounted on the exterior brick wall to the left of the main entrance door.',
    accessType: '24_7',
    cabinetType: 'locked_keypad',
    cabinetCodeInstructions: 'Call 999 for ambulance keypad code',
    what3words: '///revolvers.coasters.slopes',
    lat: 57.3325,
    lng: -3.6152,
    custodianContact: 'Highland NHS Trust',
  },
  {
    id: 'defib-3',
    name: 'Craig Maclean Leisure Centre & Community Sports Hall',
    address: 'Cromdale Road, Grantown-on-Spey PH26 3HU',
    locationNotes: 'Immediately inside the main reception foyer beside the front desk.',
    accessType: 'restricted',
    accessHours: 'Mon - Fri 07:00 - 21:00, Sat - Sun 09:00 - 17:00',
    cabinetType: 'unlocked',
    cabinetCodeInstructions: 'Unlocked cabinet / Immediate pull handle',
    what3words: '///glory.wishing.starlight',
    lat: 57.3275,
    lng: -3.6060,
    custodianContact: 'High Life Highland',
  },
  {
    id: 'defib-4',
    name: 'Community Fire Station & Emergency Resilience Post',
    address: 'Woodside Avenue, Grantown-on-Spey PH26 3JR',
    locationNotes: 'Mounted on the yellow exterior wall outside the fire station vehicle bay.',
    accessType: '24_7',
    cabinetType: 'locked_keypad',
    cabinetCodeInstructions: 'Call 999 for ambulance keypad code',
    what3words: '///starlight.freshen.outpost',
    lat: 57.3292,
    lng: -3.6185,
    custodianContact: 'Scottish Fire and Rescue Service First Responders',
  },
];

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
      const data = profileSnap.data() as CommunityProfile;
      if (isDemo && (!data.defibrillators || data.defibrillators.length === 0)) {
        data.defibrillators = defaultDemoDefibrillators;
      }
      return {
        success: true,
        data,
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