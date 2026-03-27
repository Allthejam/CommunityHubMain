
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type MemberStatus = 'active' | 'suspended' | 'pending approval' | 'under investigation' | 'hidden';

export async function updateMemberStatusAction(params: {
  memberId: string;
  newStatus: MemberStatus;
}): Promise<ActionResponse> {
  console.log('Updating member status with params:', params);
  
  try {
    const { firestore } = initializeAdminApp();
    await firestore.collection('users').doc(params.memberId).update({
      status: params.newStatus,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating member status:', error);
    return { success: false, error: error.message };
  }
}
