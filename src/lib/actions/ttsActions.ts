
'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { getStorage } from 'firebase-admin/storage';
import { ttsFlow } from '@/ai/flows/tts-flow';

type ActionResponse = {
  success: boolean;
  error?: string;
  url?: string;
};

export async function generateAndSaveAudioAction(params: {
  tourId: string;
  text: string;
  voice: string;
}): Promise<ActionResponse> {
  const { tourId, text, voice } = params;

  if (!tourId || !text || !voice) {
    return { success: false, error: 'Missing required parameters.' };
  }

  try {
    // 1. Generate Audio
    const ttsResult = await ttsFlow({ text, voice });
    if (!ttsResult.media) {
      throw new Error("Text-to-speech conversion failed to produce audio.");
    }

    // 2. Upload to Storage
    const { adminApp } = initializeAdminApp();
    const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
    const storagePath = `audioTours/${tourId}.wav`;

    const match = ttsResult.media.match(/^data:(audio\/[a-zA-Z0-9-+.]+);base64,(.*)$/);
    if (!match) {
        throw new Error('Invalid data URI format from TTS flow.');
    }
    const contentType = match[1];
    const data = match[2];
    
    const buffer = Buffer.from(data, 'base64');
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      metadata: { contentType },
    });

    await file.makePublic();
    const publicUrl = file.publicUrl();
    
    // 3. Update Firestore
    const { firestore } = initializeAdminApp();
    const tourRef = firestore.collection('audioTours').doc(tourId);
    await tourRef.update({ audioUrl: publicUrl });

    return { success: true, url: publicUrl };

  } catch (error: any) {
    console.error("Error in generateAndSaveAudioAction:", error);
    return { success: false, error: error.message };
  }
}
