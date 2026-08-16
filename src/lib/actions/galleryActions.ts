'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type GalleryImageItem = {
  id?: string;
  url: string;
  path: string;
  description?: string;
  createdAt?: any;
};

export async function addGalleryImageAction(params: {
  businessId?: string;
  userId?: string;
  imageUrl: string;
  storagePath: string;
  description?: string;
}): Promise<ActionResponse> {
  const { businessId, userId, imageUrl, storagePath, description } = params;

  if (!businessId && !userId) {
    return { success: false, error: "Business ID or User ID is required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    
    const newImage = {
      url: imageUrl,
      path: storagePath,
      createdAt: Timestamp.now(),
      description: description || '',
    };

    if (businessId) {
      // 1. Save to gallery array on /businesses/{businessId}
      const bizDocRef = firestore.collection('businesses').doc(businessId);
      await bizDocRef.update({
        gallery: FieldValue.arrayUnion(newImage),
        updatedAt: Timestamp.now(),
      });
    } else if (userId) {
      // Find courier business for this user
      const bizQuery = await firestore.collection('businesses')
        .where('ownerId', '==', userId)
        .where('accountType', '==', 'courier')
        .limit(1)
        .get();

      if (!bizQuery.empty) {
        const bizDocRef = bizQuery.docs[0].ref;
        await bizDocRef.update({
          gallery: FieldValue.arrayUnion(newImage),
          updatedAt: Timestamp.now(),
        });
      }

      // Also set on subcollection for backwards compatibility
      const galleryRef = firestore.collection(`users/${userId}/gallery`).doc();
      await galleryRef.set(newImage);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error adding image to gallery:", error);
    return { success: false, error: error.message || "Could not save the image to the database." };
  }
}

export async function deleteGalleryImageAction(params: {
  businessId?: string;
  userId?: string;
  imageUrl?: string;
  imagePath: string;
  imageId?: string;
}): Promise<ActionResponse> {
  const { businessId, userId, imageUrl, imagePath, imageId } = params;

  try {
    const { firestore, adminApp } = initializeAdminApp();

    let targetBizDocRef: any = null;

    if (businessId) {
      targetBizDocRef = firestore.collection('businesses').doc(businessId);
    } else if (userId) {
      const bizQuery = await firestore.collection('businesses')
        .where('ownerId', '==', userId)
        .where('accountType', '==', 'courier')
        .limit(1)
        .get();
      if (!bizQuery.empty) {
        targetBizDocRef = bizQuery.docs[0].ref;
      }
    }

    if (targetBizDocRef) {
      const bizDoc = await targetBizDocRef.get();
      if (bizDoc.exists) {
        const existingGallery: any[] = bizDoc.data()?.gallery || [];
        const updatedGallery = existingGallery.filter((item: any) => {
          if (imageUrl && item.url === imageUrl) return false;
          if (imagePath && item.path === imagePath) return false;
          if (imageId && item.id === imageId) return false;
          return true;
        });
        await targetBizDocRef.update({
          gallery: updatedGallery,
          updatedAt: Timestamp.now(),
        });
      }
    }

    // Delete from legacy subcollections if applicable
    if (userId && imageId) {
      try {
        await firestore.doc(`users/${userId}/gallery/${imageId}`).delete();
      } catch (_) {}
    }
    if (businessId && imageId) {
      try {
        await firestore.doc(`businesses/${businessId}/gallery/${imageId}`).delete();
      } catch (_) {}
    }

    // Delete file from Firebase Storage
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

export async function updateBusinessGalleryImageDescriptionAction(params: {
  businessId: string;
  imageUrl: string;
  description: string;
}): Promise<ActionResponse> {
  const { businessId, imageUrl, description } = params;

  if (!businessId || !imageUrl) {
    return { success: false, error: "Business ID and image URL are required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    const bizDocRef = firestore.collection('businesses').doc(businessId);
    const bizDoc = await bizDocRef.get();

    if (!bizDoc.exists) {
      return { success: false, error: "Business not found." };
    }

    const existingGallery: any[] = bizDoc.data()?.gallery || [];
    const updatedGallery = existingGallery.map((item: any) => {
      if (item.url === imageUrl) {
        return {
          ...item,
          description: description || '',
          updatedAt: Timestamp.now(),
        };
      }
      return item;
    });

    await bizDocRef.update({
      gallery: updatedGallery,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating image description:", error);
    return { success: false, error: error.message || "Failed to update image description." };
  }
}

