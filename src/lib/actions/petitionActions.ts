'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export async function signPetitionAction(params: {
  communityId: string;
  petitionId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { communityId, petitionId, userId } = params;
  if (!communityId || !petitionId || !userId) {
    return { success: false, error: 'Missing required parameters.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const petitionRef = firestore.doc(`communities/${communityId}/petitions/${petitionId}`);
    
    const result = await firestore.runTransaction(async (transaction) => {
      const docSnapshot = await transaction.get(petitionRef);
      if (!docSnapshot.exists) {
        return { success: false, error: 'Petition not found.' };
      }

      const data = docSnapshot.data();
      if (!data) {
        return { success: false, error: 'Petition data is empty.' };
      }

      const signedBy = data.signedBy || [];
      if (signedBy.includes(userId)) {
        return { success: false, error: 'You have already signed this petition.' };
      }

      transaction.update(petitionRef, {
        signedBy: FieldValue.arrayUnion(userId),
        signaturesCount: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    });

    return result;
  } catch (error: any) {
    console.error('Error signing petition:', error);
    return { success: false, error: error.message || 'Failed to sign petition.' };
  }
}
