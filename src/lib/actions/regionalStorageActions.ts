'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function deleteStorageFileAction(params: {
  storagePath: string;
}): Promise<ActionResponse> {
  const { storagePath } = params;

  if (!storagePath) {
    return { success: false, error: 'Storage path is required.' };
  }

  try {
    const { adminApp } = initializeAdminApp();
    const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
    const file = bucket.file(storagePath);
    await file.delete();
    return { success: true };
  } catch (error: any) {
    if (error.code === 404) {
      return { success: true }; // Already deleted
    }
    console.error("Error deleting storage file:", error);
    return { success: false, error: error.message || 'Failed to delete file.' };
  }
}
