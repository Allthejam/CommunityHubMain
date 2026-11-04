'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { businesses as mockBusinesses } from "@/lib/mock-data";

export type PublicBusinessSummary = {
  id: string;
  businessName: string;
  businessCategory: string;
  shortDescription: string;
  logoImage?: string | null;
  bannerImage?: string | null;
  primaryCommunityName?: string | null;
  primaryCommunityId?: string | null;
  country?: string | null;
  city?: string | null;
  postcode?: string | null;
  isAccommodation?: boolean;
  phone?: string | null;
  website?: string | null;
  openingHours?: any;
  status: string;
  isPublicDirectoryEnabled: boolean;
};

export type PublicBusinessDetail = PublicBusinessSummary & {
  longDescription?: string;
  pageTwoIntro?: string;
  pageTwoContent?: { id: string; text: string; image: string | null }[];
  pageThreeContent?: string;
  addresses?: { addressLine1: string; addressLine2?: string; city: string; stateCounty?: string; postcode: string }[];
  contactEmail?: string | null;
  socialMedia?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
};

/**
 * Normalizes Firestore business document into a clean, JSON-serializable public object.
 */
function normalizeBusinessDoc(id: string, data: any): PublicBusinessDetail {
  const primaryAddress = Array.isArray(data.addresses) && data.addresses.length > 0 
    ? data.addresses[0] 
    : (data.address ? { addressLine1: data.address, city: data.city || '', postcode: data.postcode || '' } : null);

  return {
    id: String(id),
    businessName: data.businessName || data.name || 'Local Business',
    businessCategory: data.businessCategory || 'general',
    shortDescription: data.shortDescription || data.description || '',
    longDescription: data.longDescription || data.description || '',
    pageTwoIntro: data.pageTwoIntro || '',
    pageTwoContent: Array.isArray(data.pageTwoContent) ? data.pageTwoContent : [],
    pageThreeContent: data.pageThreeContent || '',
    logoImage: data.logoImage || null,
    bannerImage: data.bannerImage || null,
    primaryCommunityName: data.primaryCommunityName || data.communityName || 'Local Community',
    primaryCommunityId: data.primaryCommunityId || data.communityId || null,
    country: data.country || 'United Kingdom',
    city: primaryAddress?.city || data.city || data.primaryCommunityName || '',
    postcode: primaryAddress?.postcode || data.postcode || '',
    isAccommodation: Boolean(data.isAccommodation),
    phone: data.contactNumber || data.phone || null,
    website: data.website || null,
    contactEmail: data.contactEmail || null,
    socialMedia: data.socialMedia || null,
    openingHours: data.openingHours || null,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
    addresses: Array.isArray(data.addresses) ? data.addresses : (primaryAddress ? [primaryAddress] : []),
    status: data.status || 'Approved',
    isPublicDirectoryEnabled: data.isPublicDirectoryEnabled !== false,
  };
}

/**
 * Fetch all public-facing businesses across the default database and comfeed demo database.
 * Falls back to curated mock businesses if Firestore returns empty so the directory is always vibrant.
 */
export async function getPublicBusinessesAction(): Promise<PublicBusinessSummary[]> {
  const results: Map<string, PublicBusinessSummary> = new Map();

  // 1. Try querying default Firestore database
  try {
    const { firestore } = initializeAdminApp();
    const snap = await firestore.collection('businesses')
      .where('status', 'in', ['Approved', 'Subscribed'])
      .limit(100)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.isPublicDirectoryEnabled !== false) {
        const item = normalizeBusinessDoc(doc.id, data);
        results.set(item.id, item);
      }
    }
  } catch (error) {
    console.warn('Error reading businesses from default database:', error);
  }

  // 2. Try querying comfeed sandbox database (for demo & community sandbox listings)
  try {
    const { firestore: comfeedDb } = initializeAdminApp('comfeed');
    const snap = await comfeedDb.collection('businesses')
      .where('status', 'in', ['Approved', 'Subscribed'])
      .limit(50)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.isPublicDirectoryEnabled !== false && !results.has(doc.id)) {
        const item = normalizeBusinessDoc(doc.id, data);
        results.set(item.id, item);
      }
    }
  } catch (error) {
    // Ignore comfeed errors if db not configured
  }

  // 3. If live database has few or no records (e.g. fresh environment or offline), supplement with mock businesses
  if (results.size < 6 && Array.isArray(mockBusinesses)) {
    for (const mb of mockBusinesses) {
      const idStr = String(mb.id);
      if (!results.has(idStr)) {
        results.set(idStr, {
          id: idStr,
          businessName: mb.businessName,
          businessCategory: mb.businessCategory || 'retail',
          shortDescription: mb.shortDescription || 'Your friendly local neighborhood shop.',
          logoImage: mb.logoImage || null,
          bannerImage: null,
          primaryCommunityName: 'St Andrews',
          primaryCommunityId: 'demo-st-andrews',
          country: 'Scotland, UK',
          city: 'St Andrews',
          postcode: 'KY16 9AA',
          isAccommodation: (mb.businessCategory || '').includes('hotel') || (mb.businessCategory || '').includes('stay'),
          phone: (mb as any).phone || '01334 000000',
          website: (mb as any).website || null,
          openingHours: (mb as any).openingHours || null,
          status: 'Approved',
          isPublicDirectoryEnabled: true,
        });
      }
    }
  }

  return Array.from(results.values());
}

/**
 * Fetch a single public business by ID.
 * Looks in default Firestore DB, comfeed demo DB, and mock data.
 */
export async function getPublicBusinessByIdAction(businessId: string): Promise<PublicBusinessDetail | null> {
  if (!businessId) return null;

  // 1. Try default Firestore database
  try {
    const { firestore } = initializeAdminApp();
    const doc = await firestore.collection('businesses').doc(businessId).get();
    if (doc.exists) {
      const data = doc.data()!;
      // Only return if it's publicly viewable
      if (data.isPublicDirectoryEnabled !== false) {
        return normalizeBusinessDoc(doc.id, data);
      }
    }
  } catch (error) {
    console.warn(`Error fetching business ${businessId} from default DB:`, error);
  }

  // 2. Try comfeed sandbox database
  try {
    const { firestore: comfeedDb } = initializeAdminApp('comfeed');
    const doc = await comfeedDb.collection('businesses').doc(businessId).get();
    if (doc.exists) {
      const data = doc.data()!;
      if (data.isPublicDirectoryEnabled !== false) {
        return normalizeBusinessDoc(doc.id, data);
      }
    }
  } catch (error) {
    // Ignore comfeed errors
  }

  // 3. Fallback to mock data
  const mockMatch = mockBusinesses.find((b) => String(b.id) === String(businessId));
  if (mockMatch) {
    return {
      id: String(mockMatch.id),
      businessName: mockMatch.businessName,
      businessCategory: mockMatch.businessCategory || 'retail',
      shortDescription: mockMatch.shortDescription || 'Friendly local neighborhood shop.',
      longDescription: `${mockMatch.businessName} has been serving the local community with dedicated, personalized service. Discover our wide selection, friendly staff, and commitment to supporting local vitality.`,
      pageTwoIntro: 'Our Story & Local Craftsmanship',
      pageTwoContent: [
        {
          id: 'story-1',
          text: 'Founded locally with a passion for quality and community. We take pride in sourcing sustainable goods and partnering with neighboring producers to bring the very best to our high street.',
          image: null,
        },
      ],
      pageThreeContent: `Contact ${mockMatch.businessName} directly or visit our local storefront. Community members can reach out anytime.`,
      logoImage: mockMatch.logoImage || null,
      bannerImage: null,
      primaryCommunityName: 'St Andrews',
      primaryCommunityId: 'demo-st-andrews',
      country: 'Scotland, UK',
      city: 'St Andrews',
      postcode: 'KY16 9AA',
      addresses: [
        {
          addressLine1: '14 Market Street',
          city: 'St Andrews',
          postcode: 'KY16 9AA',
        },
      ],
      isAccommodation: (mockMatch.businessCategory || '').includes('hotel') || (mockMatch.businessCategory || '').includes('stay'),
      phone: (mockMatch as any).phone || '01334 000000',
      website: (mockMatch as any).website || null,
      contactEmail: 'contact@localcommunity.org',
      socialMedia: 'https://facebook.com',
      openingHours: (mockMatch as any).openingHours || {
        monday: { morningOpen: '09:00', morningClose: '', afternoonOpen: '', afternoonClose: '17:30', closed: false },
        tuesday: { morningOpen: '09:00', morningClose: '', afternoonOpen: '', afternoonClose: '17:30', closed: false },
        wednesday: { morningOpen: '09:00', morningClose: '', afternoonOpen: '', afternoonClose: '17:30', closed: false },
        thursday: { morningOpen: '09:00', morningClose: '', afternoonOpen: '', afternoonClose: '17:30', closed: false },
        friday: { morningOpen: '09:00', morningClose: '', afternoonOpen: '', afternoonClose: '17:30', closed: false },
        saturday: { morningOpen: '09:30', morningClose: '', afternoonOpen: '', afternoonClose: '17:00', closed: false },
        sunday: { morningOpen: '', morningClose: '', afternoonOpen: '', afternoonClose: '', closed: true },
      },
      metaTitle: `${mockMatch.businessName} - St Andrews Local Business`,
      metaDescription: mockMatch.shortDescription,
      status: 'Approved',
      isPublicDirectoryEnabled: true,
    };
  }

  return null;
}
