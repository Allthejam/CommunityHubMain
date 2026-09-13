
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
  campaignId?: string;
};

type CampaignData = {
    id?: string;
    audience: string;
    feature: string;
    headline: string;
    body: string;
    socialMediaPost: string;
    coverImageUrl?: string;
    isMainAppVisible?: boolean;
}

export async function saveMarketingCampaignAction(data: CampaignData): Promise<ActionResponse> {
    if (!data.audience || !data.feature || !data.headline || !data.body || !data.socialMediaPost) {
        return { success: false, error: 'All content fields are required.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const campaignsCollection = firestore.collection('marketing_campaigns');
        const { id, ...dataToSave } = data;

        if (id) {
            // Update existing campaign
            const campaignRef = campaignsCollection.doc(id);
            await campaignRef.update({
                ...dataToSave,
                updatedAt: Timestamp.now(),
            });
            return { success: true, campaignId: id };
        } else {
            // Create new campaign
            const newCampaignRef = await campaignsCollection.add({
                ...dataToSave,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return { success: true, campaignId: newCampaignRef.id };
        }
    } catch (error: any) {
        console.error("Error saving marketing campaign:", error);
        return { success: false, error: error.message || 'Failed to save campaign.' };
    }
}

export async function deleteMarketingCampaignAction(campaignId: string): Promise<ActionResponse> {
    if (!campaignId) {
        return { success: false, error: "Campaign ID is required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('marketing_campaigns').doc(campaignId).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting marketing campaign:", error);
        return { success: false, error: error.message || 'Failed to delete campaign.' };
    }
}

export async function getMarketingStorageImagesAction(): Promise<{ success: boolean; error?: string; images?: { id: string; url: string; description: string }[] }> {
    try {
        const { adminApp } = initializeAdminApp();
        const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
        
        // List files under gallery/ prefix
        const [files] = await bucket.getFiles({ prefix: 'gallery/' });
        
        const imagesList = [];
        for (const file of files) {
            // Ignore the directory itself
            if (file.name === 'gallery/') continue;
            
            // Get path relative to gallery/
            const relativePath = file.name.substring('gallery/'.length);
            
            // If it contains a slash, it's inside a business folder (e.g. gallery/bizId/file.jpg)
            if (relativePath.includes('/')) continue;

            // Make the file public to ensure it can be viewed
            try {
                await file.makePublic();
            } catch (err: any) {
                console.warn(`Could not make file ${file.name} public:`, err.message);
            }
            
            const name = file.name.split('/').pop() || 'Marketing Image';
            imagesList.push({
                id: file.name,
                url: file.publicUrl() || `https://storage.googleapis.com/${bucket.name}/${file.name}`,
                description: name.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, "") // Human readable name
            });
        }
            
        return { success: true, images: imagesList };
    } catch (error: any) {
        console.error("Error fetching marketing images from storage:", error);
        return { success: false, error: error.message || 'Failed to fetch images from storage.' };
    }
}

export async function getLeaderMarketingHubDataAction(isDemo = false): Promise<{
    success: boolean;
    campaigns: any[];
    gallery: any[];
    adverts: any[];
    pitchKits: any[];
    error?: string;
}> {
    try {
        const { adminApp } = initializeAdminApp();
        const primaryDb = initializeAdminApp().firestore;
        const comfeedDb = initializeAdminApp('comfeed').firestore;

        // 1. Fetch campaigns from primary, fallback to comfeed
        let campaignsSnap = await primaryDb.collection('marketing_campaigns').orderBy('updatedAt', 'desc').get();
        if (campaignsSnap.empty && isDemo) {
            campaignsSnap = await comfeedDb.collection('marketing_campaigns').get();
        }

        const campaigns = campaignsSnap.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
                };
            })
            .filter((c: any) => c.isMainAppVisible === true);

        // 2. Fetch platform marketing gallery
        let gallerySnap = await primaryDb.collection('platform_marketing_gallery').get();
        if (gallerySnap.empty && isDemo) {
            gallerySnap = await comfeedDb.collection('platform_marketing_gallery').get();
        }

        const gallery = gallerySnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                url: data.url,
                description: data.description || 'Community Hub Promotional Artwork',
                path: data.path || '',
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            };
        });

        // 3. Fetch adverts
        let advertsSnap = await primaryDb.collection('adverts').limit(20).get();
        if (advertsSnap.empty && isDemo) {
            advertsSnap = await comfeedDb.collection('adverts').limit(20).get();
        }

        const adverts = advertsSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || data.headline || 'Community Commercial Sponsor',
                headline: data.headline || data.title || '',
                image: data.image || data.imageUrl || data.coverImage || '',
                type: data.type || 'featured',
                businessName: data.businessName || 'Local High Street Merchant',
                description: data.description || data.body || '',
                websiteLink: data.websiteLink || '',
            };
        });

        // 4. Structured High Street Pitch Kits for Leaders
        const pitchKits = [
            {
                id: 'merchant-letter',
                title: 'Official Council High Street Onboarding Letter',
                target: 'Independent Retailers, Cafes, Trades & Services',
                badge: 'Merchant Recruitment',
                summary: 'Printable letter for Council leaders to hand-deliver or email to town shop owners.',
                points: [
                    'Explains the £20/mo directory & £10/mo storefront model',
                    'Clarifies the 60% Civic Treasury reinvestment dividend',
                    'Details Click & Collect and local doorstep courier delivery',
                    'Zero algorithm suppression or advertising fees'
                ],
                content: `COMMUNITY COUNCIL & DIGITAL HIGH STREET INVITATION

Dear Local Merchant,

Our Community Council has launched the official Town Community Hub mobile app and web platform to revitalize and defend local independent commerce.

Why Join Your Town Digital High Street?
1. Full Interactive Storefront: List your products, menus, and services for only £20/month with zero commission per order.
2. Doorstep Courier Delivery: Optional same-day doorstep deliveries for customers provided by our appointed local town couriers (£10/month storefront option).
3. Civic Reinvestment: Up to 60% of all monthly subscriptions flow directly into our Community Council Treasury to fund town lights, festive events, defibrillators, and floral displays.
4. Direct Verified Local Reach: Connect with parish residents without paying social media advertising monopolies.

Register your business profile today at:
my-community-hub.co.uk/signup/account-type

Yours in community partnership,
Your Community Council & Business Liaison Team`
            },
            {
                id: 'window-poster',
                title: 'Shop Window & Countertop QR Code Sticker Pack',
                target: 'Physical Storefronts & Cafe Tables',
                badge: 'Footfall & Ordering',
                summary: 'Artwork ready to print and stick in shop windows and counters to drive app orders.',
                points: [
                    'Scan to Order Local for Same-Day Delivery',
                    'Click & Collect Pickup Points',
                    'Parish Loyalty & Member Discounts'
                ],
                content: `ORDER LOCAL WITH COMMUNITY HUB!

Scan the QR code to browse our full product catalog, order Click & Collect, or request rapid doorstep home delivery from our appointed town couriers.

Supporting Local Independent Business in our Town.
Available on iOS, Android & Web at my-community-hub.co.uk`
            },
            {
                id: 'courier-recruitment',
                title: 'Town Courier Network Partnership Invite',
                target: 'Local Drivers, Cyclists & Logistics Volunteers',
                badge: 'Local Logistics',
                summary: 'Attract and appoint reliable local couriers for doorstep delivery routes.',
                points: [
                    'Guaranteed £4/mo fuel & vehicle operational pool subsidy from every storefront',
                    'Couriers keep 100% of customer-paid delivery fees on every single order',
                    'Flexible local hours keeping delivery revenue inside the parish'
                ],
                content: `BECOME AN APPOINTED TOWN COURIER!

Help deliver high street bakery, butcher, pharmacy, and retail orders straight to local doorsteps in our community.

Earnings & Equipment Subsidy:
- 40% Storefront Pool Subsidy: £4/month per storefront guaranteed logistics fund.
- 100% Delivery Fees: Earn full courier delivery fees on every order delivered.
- Flexible Hours: Set your own local delivery availability.

Sign up at my-community-hub.co.uk/community-courier`
            }
        ];

        return {
            success: true,
            campaigns,
            gallery,
            adverts,
            pitchKits,
        };
    } catch (err: any) {
        console.error("Error loading leader marketing hub data:", err);
        return {
            success: false,
            campaigns: [],
            gallery: [],
            adverts: [],
            pitchKits: [],
            error: err.message,
        };
    }
}
