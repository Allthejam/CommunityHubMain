'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type GalleryImage = {
  url: string;
  path: string;
  description?: string;
  title?: string;
  metaTitle?: string;
};

export async function addGalleryImageAction(params: {
  businessId?: string;
  userId?: string;
  imageUrl: string;
  storagePath: string;
  title?: string;
  description?: string;
}): Promise<ActionResponse> {
  const { businessId, userId, imageUrl, storagePath, title, description } = params;

  if (!businessId && !userId) {
    return { success: false, error: "Business ID or User ID is required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    
    const newImage = {
        url: imageUrl,
        path: storagePath,
        title: title || '',
        description: description || '',
        createdAt: Timestamp.now(),
    };

    if (businessId) {
      const businessRef = firestore.collection('businesses').doc(businessId);
      await businessRef.update({
          gallery: FieldValue.arrayUnion(newImage)
      });
    } else if (userId) {
      const galleryRef = firestore.collection('users').doc(userId).collection('gallery').doc();
      await galleryRef.set(newImage);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error adding image to gallery:", error);
    return { success: false, error: "Could not save the image to the database." };
  }
}

export async function updateGalleryImageMetadataAction(params: {
  userId: string;
  imageId: string;
  data: {
      title?: string;
      metaTitle?: string;
      description?: string;
  }
}): Promise<ActionResponse> {
  const { userId, imageId, data } = params;
   if (!userId || !imageId) {
    return { success: false, error: "Missing required parameters." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const imageDocRef = firestore.collection('users').doc(userId).collection('gallery').doc(imageId);
    await imageDocRef.update({ 
        ...data,
        updatedAt: Timestamp.now() 
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating image metadata:", error);
    return { success: false, error: "Could not update metadata." };
  }
}

export async function deleteGalleryImageAction(params: {
  businessId?: string;
  userId?: string;
  image?: GalleryImage;
  imageId?: string;
}): Promise<ActionResponse> {
  const { businessId, userId, image, imageId } = params;

  if (!businessId && !userId) {
    return { success: false, error: "Business ID or User ID is required." };
  }

  try {
    const { firestore, storage } = initializeAdminApp();
    const bucket = storage.bucket();

    // 1. Delete from storage if path exists
    const pathToDelete = image?.path;
    if (pathToDelete) {
        try {
            await bucket.file(pathToDelete).delete();
        } catch (storageError) {
            console.warn(`File not found in storage bucket (${pathToDelete}), continuing with DB deletion.`);
        }
    }

    // 2. Delete from Database
    if (businessId && image) {
      const businessRef = firestore.collection('businesses').doc(businessId);
      await businessRef.update({
        gallery: FieldValue.arrayRemove(image)
      });
    } else if (userId && imageId) {
      const imageDocRef = firestore.collection('users').doc(userId).collection('gallery').doc(imageId);
      await imageDocRef.delete();
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting image from gallery:", error);
    return { success: false, error: "Failed to remove the image." };
  }
}
