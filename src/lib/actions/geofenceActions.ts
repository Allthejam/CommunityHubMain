'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function muteCommunityGeofenceAction(params: {
  userId: string;
  communityId: string;
}): Promise<ActionResponse> {
  const { userId, communityId } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    
    // Add to mutedGeofences array field
    await userRef.update({
      mutedGeofences: FieldValue.arrayUnion(communityId),
      updatedAt: Timestamp.now(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in muteCommunityGeofenceAction:', error);
    return { success: false, error: error.message };
  }
}
