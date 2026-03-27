
'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp } from 'firebase-admin/firestore';
import { businesses } from '../mock-data';

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function seedDatabase(): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const batch = firestore.batch();

    // Pricing Plans
    const businessPlanRef = firestore.collection('pricing_plans').doc('business');
    batch.set(businessPlanRef, {
      monthlyPrice: 20,
      annualPrice: 200,
      adverts: 5,
      events: 2,
      galleryImages: 10,
      additionalAdvertPrice: 5,
      additionalEventPrice: 10,
      updatedAt: Timestamp.now(),
    });

    const storefrontPlanRef = firestore.collection('pricing_plans').doc('storefront');
    batch.set(storefrontPlanRef, {
        monthlyPrice: 10,
        annualPrice: 100,
        updatedAt: Timestamp.now(),
    });

    const enterprisePlanRef = firestore.collection('pricing_plans').doc('enterprise');
    batch.set(enterprisePlanRef, {
      monthlyPrice: 50,
      annualPrice: 500,
      adverts: 20,
      events: 12,
      galleryImages: 50,
      featuredPartner: true,
      additionalAdvertPrice: 3,
      additionalEventPrice: 8,
      updatedAt: Timestamp.now(),
    });

    const advertiserPlanRef = firestore.collection('pricing_plans').doc('advertiser');
    batch.set(advertiserPlanRef, {
      featuredAdPrice: 1000,
      partnerAdPrice: 500,
      galleryImages: 20,
      updatedAt: Timestamp.now(),
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Error seeding database:', error);
    return { success: false, error: error.message || 'Failed to seed database.' };
  }
}

export async function seedBusinesses(params: { communityId: string }): Promise<ActionResponse> {
    const { communityId } = params;
    if (!communityId) {
        return { success: false, error: 'Community ID is required.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();

        for (const business of businesses) {
            const docRef = firestore.collection('businesses').doc(); // Auto-generate ID
            batch.set(docRef, {
                businessName: business.businessName,
                businessCategory: business.businessCategory,
                shortDescription: business.shortDescription,
                logoImage: business.logoImage,
                primaryCommunityId: communityId,
                status: 'Subscribed', // Set status to make them appear live
                createdAt: Timestamp.now(),
                // Add any other necessary default fields
            });
        }

        await batch.commit();
        return { success: true };

    } catch (error: any) {
        console.error('Error seeding businesses:', error);
        return { success: false, error: error.message || 'Failed to seed businesses.' };
    }
}
