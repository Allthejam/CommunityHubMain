
'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
  url?: string;
  path?: string;
};

type ProductData = {
  name: string;
  slug: string;
  description: string;
  price?: number;
  stock?: number;
  status: 'online' | 'offline';
  outOfStockAction?: 'deny' | 'allow';
  images?: ImageObject[];
  videoUrl?: string;
  audience?: string;
  gender?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  referenceNumber?: string;
  mpn?: string;
  upc?: string;
  ean?: string;
  isbn?: string;
  onSale?: boolean;
  discountType?: 'amount' | 'percentage';
  salePrice?: number;
  discountValue?: number;
  showOriginalPrice?: boolean;
  saleDateRange?: { from?: Date; to?: Date; };
  metaTitle?: string;
  metaDescription?: string;
  hasVariations?: boolean;
  variationsConfig?: any;
  variationsStock?: any;
  tags?: string;
};

type ImageObject = {
    url: string;
    path: string;
    description?: string;
};

type StoreSettings = {
    deliveryAvailable: boolean;
    deliveryType?: 'free' | 'flat_rate' | 'click_and_collect' | 'shop_delivery' | 'local_courier';
    deliveryPrice?: number;
    catalogueMode: boolean;
    showPricesInCatalogue: boolean;
    storeAvailability?: 'instore_online' | 'instore_only' | 'online_only';
    deliveryScope?: 'local' | 'national' | 'click_and_collect';
    nationalPostagePrice?: number;
};

export async function uploadProductImageAction(params: {
  base64Data: string;
  path: string;
}): Promise<ActionResponse> {
  const { base64Data, path } = params;

  if (!base64Data || !path) {
    return { success: false, error: 'Base64 data and path are required.' };
  }

  try {
    const { adminApp } = initializeAdminApp();
    const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);

    const match = base64Data.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.*)$/);
    if (!match) {
        return { success: false, error: 'Invalid data URI format.' };
    }
    const contentType = match[1];
    const data = match[2];

    const buffer = Buffer.from(data, 'base64');
    const file = bucket.file(path);

    await file.save(buffer, {
      metadata: { contentType },
    });

    await file.makePublic();
    const publicUrl = file.publicUrl();

    return { success: true, url: publicUrl, path };
  } catch (error: any) {
    console.error("Error uploading image:", error);
    return { success: false, error: error.message || 'Failed to upload image file.' };
  }
}

export async function deleteProductImageAction(params: { path: string }): Promise<ActionResponse> {
    const { path } = params;
    if (!path) {
        return { success: false, error: "Image path is required for deletion." };
    }

    try {
        const { adminApp } = initializeAdminApp();
        const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
        const file = bucket.file(path);
        await file.delete();
        return { success: true };
    } catch (error: any) {
        if (error.code === 404) {
            console.warn(`Attempted to delete a non-existent file: ${path}`);
            return { success: true }; // Consider it a success if the file is already gone.
        }
        console.error("Error deleting image from storage:", error);
        return { success: false, error: error.message || "Failed to delete image." };
    }
}

const slugify = (text: string) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

export async function saveProductAction(params: {
  businessId: string;
  productData: ProductData;
  productId?: string; // Optional: for updates
}): Promise<ActionResponse> {
  const { businessId, productData, productId } = params;

  if (!businessId) {
    return { success: false, error: 'Business ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const productCollection = firestore.collection(`businesses/${businessId}/products`);
    
    const { saleDateRange, variationsConfig, variationsStock, tags, ...restOfData } = productData;
    const finalProductData: any = {
        ...restOfData,
        slug: productData.slug || slugify(productData.name),
        saleStartDate: saleDateRange?.from ? Timestamp.fromDate(new Date(saleDateRange.from)) : null,
        saleEndDate: saleDateRange?.to ? Timestamp.fromDate(new Date(saleDateRange.to)) : null,
    };

    if (typeof tags === 'string') {
        finalProductData.tags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    
    // Ensure images are stored correctly
    if (Array.isArray(productData.images)) {
        finalProductData.images = productData.images.map(img => ({
            url: img.url,
            path: img.path,
            description: img.description || ''
        }));
    }


    if (productId) {
      const productRef = productCollection.doc(productId);
      const variationsRef = productRef.collection('product_data').doc('variations');
      
      const batch = firestore.batch();
      batch.update(productRef, { ...finalProductData, updatedAt: Timestamp.now() });
      
      if (finalProductData.hasVariations) {
          batch.set(variationsRef, { config: variationsConfig, stock: variationsStock }, { merge: true });
      }
      
      await batch.commit();

    } else {
      const newProductRef = productCollection.doc();
      const variationsRef = newProductRef.collection('product_data').doc('variations');

      const batch = firestore.batch();
      batch.set(newProductRef, {
        ...finalProductData,
        businessId, 
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      if (finalProductData.hasVariations) {
        batch.set(variationsRef, { config: variationsConfig, stock: variationsStock });
      }
      await batch.commit();
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error saving product:', error);
    return { success: false, error: 'Failed to save product.' };
  }
}

export async function deleteProductAction(params: {
    businessId: string;
    productId: string;
}): Promise<ActionResponse> {
    const { businessId, productId } = params;
    if (!businessId || !productId) {
        return { success: false, error: 'Business ID and Product ID are required.' };
    }
    try {
        const { firestore, adminApp } = initializeAdminApp();
        const productRef = firestore.doc(`businesses/${businessId}/products/${productId}`);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
            console.warn(`Product ${productId} not found for deletion.`);
            return { success: true }; // Already gone
        }

        const productData = productDoc.data();
        const imagePaths = productData?.images?.map((img: ImageObject) => img.path).filter(Boolean) || [];

        // Delete the Firestore document
        await productRef.delete();

        // Asynchronously delete images from storage
        if (imagePaths.length > 0) {
            const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
            const deletePromises = imagePaths.map((path: string) => 
                bucket.file(path).delete().catch(err => {
                    if (err.code !== 404) { // Don't worry if the file is already gone
                        console.error(`Failed to delete image at path ${path}:`, err);
                    }
                })
            );
            await Promise.all(deletePromises);
        }
        
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting product:', error);
        return { success: false, error: 'Failed to delete product.' };
    }
}

export async function updateProductStockAction(params: {
    businessId: string;
    productId: string;
    newStock: number;
}): Promise<ActionResponse> {
    const { businessId, productId, newStock } = params;
     if (!businessId || !productId) {
        return { success: false, error: 'Business and Product ID are required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const productRef = firestore.doc(`businesses/${businessId}/products/${productId}`);
        await productRef.update({ stock: newStock });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating stock:', error);
        return { success: false, error: 'Failed to update product stock.' };
    }
}

export async function bulkUpdateProductStockAction(params: {
    businessId: string;
    updates: { productId: string; newStock: number }[];
}): Promise<ActionResponse> {
    const { businessId, updates } = params;
    if (!businessId || !updates || updates.length === 0) {
        return { success: false, error: 'Business ID and updates are required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        
        updates.forEach(({ productId, newStock }) => {
            const ref = firestore.doc(`businesses/${businessId}/products/${productId}`);
            batch.update(ref, { stock: newStock, updatedAt: Timestamp.now() });
        });
        
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error('Error in bulk stock update:', error);
        return { success: false, error: error.message || 'Failed to update stock levels.' };
    }
}


export async function saveOpeningHoursAction(params: {
    businessId: string;
    openingHours: any;
}): Promise<ActionResponse> {
    const { businessId, openingHours } = params;
    if (!businessId) {
        return { success: false, error: 'Business ID is required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const businessRef = firestore.collection('businesses').doc(businessId);
        await businessRef.update({ openingHours });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving opening hours:", error);
        return { success: false, error: 'Failed to save opening hours.' };
    }
}

export async function saveStoreSettingsAction(params: {
    businessId: string;
    settings: StoreSettings;
}): Promise<ActionResponse> {
    const { businessId, settings } = params;
    if (!businessId) {
        return { success: false, error: 'Business ID is required.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const businessRef = firestore.collection('businesses').doc(businessId);
        const bizDoc = await businessRef.get();
        
        if (!bizDoc.exists) throw new Error("Business not found.");
        
        const communityId = bizDoc.data()?.primaryCommunityId;
        let isTransactionsAllowed = false;
        
        if (communityId) {
            const commDoc = await firestore.collection('communities').doc(communityId).get();
            if (commDoc.exists && commDoc.data()?.transactionsEnabled === true) {
                isTransactionsAllowed = true;
            }
        }

        const finalSettings = {
            ...settings,
            // SERVER SIDE ENFORCEMENT: Force catalogue mode if transactions are NOT enabled for this community
            catalogueMode: isTransactionsAllowed ? settings.catalogueMode : true,
            deliveryType: isTransactionsAllowed ? settings.deliveryType : 'click_and_collect',
        };

        await businessRef.update({ storeSettings: finalSettings });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving store settings:", error);
        return { success: false, error: 'Failed to save store settings.' };
    }
}
