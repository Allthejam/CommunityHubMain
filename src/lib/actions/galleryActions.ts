
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
    };

    if (businessId) {
      const businessRef = firestore.collection('businesses').doc(businessId);
      await businessRef.update({
          gallery: FieldValue.arrayUnion(newImage)
      });
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
  imageUrl: string;
  description: string;
}): Promise<ActionResponse> {
  const { businessId, imageUrl, description } = params;
  if (!businessId || !imageUrl) {
    return { success: false, error: "Business ID and Image URL are required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    const businessRef = firestore.collection('businesses').doc(businessId);

    const doc = await businessRef.get();
    if (!doc.exists) {
      throw new Error("Business not found");
    }

    const businessData = doc.data();
    const gallery = businessData?.gallery || [];
    const imageIndex = gallery.findIndex((img: GalleryImage) => img.url === imageUrl);

    if (imageIndex === -1) {
      console.warn(`Image with URL ${imageUrl} not found in gallery for business ${businessId}. Could not update description.`);
      return { success: true }; // Return success to not show user an error for a background sync issue.
    }

    const updatedGallery = gallery.map((img: GalleryImage, index: number) => {
        if (index === imageIndex) {
            return { ...img, description: description };
        }
        return img;
    });
    
    await businessRef.update({ gallery: updatedGallery });
    return { success: true };

  } catch (error: any) {
    console.error("Error updating business image description:", error);
    return { success: false, error: "Could not update description." };
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
    const { firestore } = initializeAdminApp();
    
    if (businessId && image) {
      const businessRef = firestore.collection('businesses').doc(businessId);
      await businessRef.update({
          gallery: FieldValue.arrayRemove(image)
      });
    } else if (userId && imageId) {
        const imageRef = firestore.collection(`users/${userId}/gallery`).doc(imageId);
        await imageRef.delete();
    } else {
        return { success: false, error: "Invalid parameters for deletion." };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting gallery image:", error);
    return { success: false, error: "Could not delete the image." };
  }
}
