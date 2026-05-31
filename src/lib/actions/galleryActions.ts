
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type GalleryImage = {
  id?: string;
  url: string;
  path: string;
  description?: string;
};

export async function addGalleryImageAction(params: {
  businessId?: string;
  userId?: string;
  imageUrl: string;
  storagePath: string;
}): Promise<ActionResponse> {
  const { businessId, userId, imageUrl, storagePath } = params;

  if (!businessId && !userId) {
    return { success: false, error: "Business ID or User ID is required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    
    const newImage = {
        url: imageUrl,
        path: storagePath,
        createdAt: Timestamp.now(),
        description: '', // Add a default empty description
    };

    if (businessId) {
      const galleryRef = firestore.collection(`businesses/${businessId}/gallery`).doc();
      await galleryRef.set(newImage);
    } else if (userId) {
      const galleryRef = firestore.collection(`users/${userId}/gallery`).doc();
      await galleryRef.set(newImage);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error adding image to gallery:", error);
    return { success: false, error: "Could not save the image to the database." };
  }
}

export async function updateGalleryImageDescriptionAction(params: {
  userId: string;
  imageId: string;
  description: string;
}): Promise<ActionResponse> {
  const { userId, imageId, description } = params;
   if (!userId || !imageId) {
    return { success: false, error: "Missing required parameters." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const imageDocRef = firestore.collection(`users/${userId}/gallery`).doc(imageId);
    await imageDocRef.update({ description: description });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating image description:", error);
    return { success: false, error: "Could not update description." };
  }
}

export async function updateBusinessGalleryImageDescriptionAction(params: {
  businessId: string;
  imageId: string;
  description: string;
}): Promise<ActionResponse> {
  const { businessId, imageId, description } = params;
  if (!businessId || !imageId) {
    return { success: false, error: "Business ID and Image ID are required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    const imageRef = firestore.doc(`businesses/${businessId}/gallery/${imageId}`);
    await imageRef.update({ description });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating business image description:", error);
    return { success: false, error: "Could not update description." };
  }
}


export async function deleteGalleryImageAction(params: {
  businessId?: string;
  userId?: string;
  imagePath: string;
  imageId: string;
}): Promise<ActionResponse> {
  const { businessId, userId, imagePath, imageId } = params;

  if ((!businessId && !userId) || !imageId) {
    return { success: false, error: "Business/User ID and Image ID are required." };
  }
  
  try {
    const { firestore, adminApp } = initializeAdminApp();
    
    if (businessId) {
        await firestore.doc(`businesses/${businessId}/gallery/${imageId}`).delete();
    } else if (userId) {
        await firestore.doc(`users/${userId}/gallery/${imageId}`).delete();
    }

    if (imagePath) {
        try {
            const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
            const file = bucket.file(imagePath);
            await file.delete();
        } catch (storageError: any) {
             if (storageError.code !== 404) {
                console.warn(`Could not delete storage object '${imagePath}': ${storageError.message}`);
            }
        }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting gallery image:", error);
    return { success: false, error: "Could not delete the image." };
  }
}
