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
  accountType?: string | null;
  listingType?: 'business' | 'featured_ad' | 'valued_partner';
  ownerId?: string | null;
  createdAt?: string | null;
  isPublicDirectoryEnabled: boolean;
  isLive: boolean; // True if subscription/trial is active; False if expired/unpaid (locked)
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
 * Checks whether a business has an active paid subscription, free active listing, or valid 14-day trial.
 * If expired or unpaid, the business will be listed in a locked non-functional state.
 */

/**
 * Safely parses Firestore Timestamps, ISO strings, and milliseconds into a JavaScript Date.
 */
function parseTimestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp.seconds !== undefined) return new Date(timestamp.seconds * 1000);
  if (timestamp._seconds !== undefined) return new Date(timestamp._seconds * 1000);
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function checkIsBusinessLive(data: any): boolean {
  const now = new Date();
  const toDate = parseTimestampToDate;

  const expiryDate = toDate(data.listingSubscriptionExpiresAt || data.subscriptionExpiresAt);
  const freeExpiry = toDate(data.freeListingExpiresAt);
  const subStatus = data.listingSubscriptionStatus || '';

  // 1. Couriers are official community logistics partners — always free and live
  if (
    data.accountType === 'courier' ||
    data.businessCategory === 'courier' ||
    (typeof data.businessCategory === 'string' && data.businessCategory.toLowerCase().includes('courier'))
  ) {
    return true;
  }

  // 2. Explicit subscription cancellation or payment failure locks the business
  if (subStatus === 'payment_failed' || subStatus === 'cancelled') {
    return false;
  }

  // 3. Explicit subscription expiration date in the past locks the business
  if (expiryDate && now > expiryDate) {
    return false;
  }

  // 4. Free listing with an explicit past expiry date locks the business
  if (data.isFreeListing) {
    if (freeExpiry && now > freeExpiry) {
      return false;
    }
    return true;
  }

  // 5. Enterprise & township initiatives
  if (data.accountType === 'enterprise') {
    return true;
  }

  // 6. Subscribed status
  if (data.status === 'Subscribed') {
    return true;
  }

  // 7. Option A: Approved businesses are Live & Active unless explicitly expired/cancelled
  if (data.status === 'Approved' || data.status === 'active') {
    return true;
  }

  return false;
}

/**
 * Normalizes Firestore business document into a clean, JSON-serializable public object.
 * Resolves the primary registered community ONLY. Never injects placeholder community strings.
 */

/**
 * Normalizes an active Advert (Featured Ad or Valued Partner) from the adverts collection
 * into the standard PublicBusinessDetail shape so it renders seamlessly in the directory cards and table.
 */
function normalizeAdvertDoc(id: string, data: any): PublicBusinessDetail | null {
  const rawType = (data.type || '').toString().toLowerCase();
  const isFeatured = rawType === 'featured';
  const isPartner = rawType === 'partner';
  if (!isFeatured && !isPartner) return null;

  const headline = data.headline || data.title || data.brand || 'Featured Community Partner';
  const categoryLabel = isFeatured ? 'Featured Ad' : 'Valued Partner';
  const rawDesc = data.shortDescription || data.tagline || data.description || '';
  const cleanShortDesc = rawDesc
    ? rawDesc.replace(/<[^>]*>/g, '').trim()
    : (data.fullDescription ? data.fullDescription.replace(/<[^>]*>/g, '').substring(0, 140).trim() + '...' : 'Verified platform partner offering quality services and exclusive community benefits.');

  const targetUrl = data.websiteLink || data.link || data.websiteUrl || data.url || (data.emailAddress ? `mailto:${data.emailAddress}` : null);
  const imageUrl = typeof data.image === 'string' ? data.image : (data.image?.imageUrl || data.logo?.imageUrl || data.logoImage || null);

  return {
    id: String(id),
    businessName: headline,
    businessCategory: categoryLabel,
    shortDescription: cleanShortDesc,
    longDescription: data.fullDescription || data.description || cleanShortDesc,
    pageTwoIntro: 'About Our Partnership',
    pageTwoContent: [],
    pageThreeContent: '',
    logoImage: imageUrl,
    bannerImage: imageUrl,
    primaryCommunityName: 'National Partner',
    primaryCommunityId: 'platform-partner',
    country: data.targetCountries?.[0] || 'United Kingdom',
    city: 'National Partner',
    postcode: '',
    isAccommodation: false,
    phone: null,
    website: targetUrl,
    contactEmail: data.emailAddress || null,
    socialMedia: null,
    openingHours: null,
    metaTitle: `${headline} - ${categoryLabel}`,
    metaDescription: cleanShortDesc,
    addresses: [],
    status: 'Active',
    accountType: isFeatured ? 'featured_ad' : 'valued_partner',
    listingType: isFeatured ? 'featured_ad' : 'valued_partner',
    ownerId: data.ownerId || null,
    createdAt: parseTimestampToDate(data.createdAt || data.submittedAt)?.toISOString() || null,
    isPublicDirectoryEnabled: true,
    isLive: true,
  };
}

function normalizeBusinessDoc(
  id: string,
  data: any,
  communityMap?: Map<string, string>
): PublicBusinessDetail {
  const primaryAddress = Array.isArray(data.addresses) && data.addresses.length > 0 
    ? data.addresses[0] 
    : (data.address ? { addressLine1: data.address, city: data.city || '', postcode: data.postcode || '' } : null);

  // Resolve main registered community name cleanly
  let commName = data.primaryCommunityName || data.communityName;
  if (communityMap && data.primaryCommunityId && communityMap.has(data.primaryCommunityId)) {
    commName = communityMap.get(data.primaryCommunityId);
  }
  if (commName && typeof commName === 'string') {
    commName = commName.trim();
    const lower = commName.toLowerCase();
    // Filter out placeholders
    if (
      lower === 'local community' ||
      lower === 'your community' ||
      lower === 'our community' ||
      lower === 'all' ||
      lower === 'other'
    ) {
      commName = primaryAddress?.city || data.city || null;
    }
  }

  const isLive = checkIsBusinessLive(data);

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
    primaryCommunityName: commName || primaryAddress?.city || data.city || null,
    primaryCommunityId: data.primaryCommunityId || data.communityId || null,
    country: data.country || 'United Kingdom',
    city: primaryAddress?.city || data.city || commName || '',
    postcode: primaryAddress?.postcode || data.postcode || '',
    isAccommodation: Boolean(data.isAccommodation),
    phone: data.contactNumber || data.phone || data.contactPhone || data.dispatchPhone || null,
    website: data.website || null,
    contactEmail: data.contactEmail || null,
    socialMedia: data.socialMedia || null,
    openingHours: data.openingHours || null,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
    addresses: Array.isArray(data.addresses) ? data.addresses : (primaryAddress ? [primaryAddress] : []),
    status: data.status || 'Approved',
    accountType: data.accountType || (data.businessCategory?.toLowerCase() === 'courier' ? 'courier' : 'business'),
    listingType: 'business',
    ownerId: data.ownerId || null,
    createdAt: parseTimestampToDate(data.createdAt || data.submittedAt)?.toISOString() || null,
    isPublicDirectoryEnabled: data.isPublicDirectoryEnabled !== false,
    isLive,
  };
}

/**
 * Fetch all public-facing businesses across all communities, regardless of community leadership status.
 * Listings are strictly categorized under their main registered community only.
 */
export async function getPublicBusinessesAction(): Promise<PublicBusinessSummary[]> {
  const results: Map<string, PublicBusinessSummary> = new Map();
  const communityNameMap = new Map<string, string>();

  // 1. Fetch communities to resolve clean canonical names (no leader restriction)
  try {
    const { firestore } = initializeAdminApp();
    const commSnap = await firestore.collection('communities').get();
    commSnap.docs.forEach((doc) => {
      const cdata = doc.data();
      if (cdata.name && typeof cdata.name === 'string') {
        communityNameMap.set(doc.id, cdata.name.trim());
      }
    });
  } catch (err) {
    console.warn('Error reading communities collection:', err);
  }

  // Also check comfeed communities if available
  try {
    const { firestore: comfeedDb } = initializeAdminApp('comfeed');
    const commSnap2 = await comfeedDb.collection('communities').get();
    commSnap2.docs.forEach((doc) => {
      const cdata = doc.data();
      if (cdata.name && typeof cdata.name === 'string' && !communityNameMap.has(doc.id)) {
        communityNameMap.set(doc.id, cdata.name.trim());
      }
    });
  } catch (err) {
    // Ignore comfeed errors
  }

  // 2. Query default Firestore database for businesses (any community, regardless of leader status)
  try {
    const { firestore } = initializeAdminApp();
    const snap = await firestore.collection('businesses')
      .limit(300)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const status = data.status || 'Approved';
      if (status === 'Declined' || status === 'Hidden' || status === 'Draft') continue;
      if (data.isPublicDirectoryEnabled === false) continue;

      const item = normalizeBusinessDoc(doc.id, data, communityNameMap);
      results.set(item.id, item);
    }
  } catch (error) {
    console.warn('Error reading businesses from default database:', error);
  }

  // 3. Query comfeed sandbox database (for demo & community sandbox listings)
  try {
    const { firestore: comfeedDb } = initializeAdminApp('comfeed');
    const snap = await comfeedDb.collection('businesses')
      .limit(100)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const status = data.status || 'Approved';
      if (status === 'Declined' || status === 'Hidden' || status === 'Draft') continue;
      if (data.isPublicDirectoryEnabled === false) continue;
      if (!results.has(doc.id)) {
        const item = normalizeBusinessDoc(doc.id, data, communityNameMap);
        results.set(item.id, item);
      }
    }
  } catch (error) {
    // Ignore comfeed errors
  }

  // 4. Query active adverts (Featured Ads & Valued Partners)
  try {
    const { firestore } = initializeAdminApp();
    const adSnap = await firestore.collection('adverts')
      .where('status', '==', 'Active')
      .limit(60)
      .get();

    for (const doc of adSnap.docs) {
      const data = doc.data();
      const adItem = normalizeAdvertDoc(doc.id, data);
      if (adItem) {
        results.set(adItem.id, adItem);
      }
    }
  } catch (err) {
    console.warn('Error reading adverts collection:', err);
  }

  // 5. If live database has 0 records (e.g. offline dev test), supplement with clean mock businesses
  if (results.size === 0 && Array.isArray(mockBusinesses)) {
    const demoTowns = ['St Andrews', 'Crail', 'Anstruther', 'Elie', 'Pittenweem'];
    mockBusinesses.forEach((mb, idx) => {
      const town = demoTowns[idx % demoTowns.length];
      const idStr = String(mb.id);
      const isSimulatedLive = idx % 3 !== 0;

      results.set(idStr, {
        id: idStr,
        businessName: mb.businessName,
        businessCategory: mb.businessCategory || 'retail',
        shortDescription: mb.shortDescription || 'Your friendly local neighborhood shop.',
        logoImage: mb.logoImage || null,
        bannerImage: null,
        primaryCommunityName: town,
        primaryCommunityId: `demo-${town.toLowerCase().replace(/\s+/g, '-')}`,
        country: 'Scotland, UK',
        city: town,
        postcode: 'KY16 9AA',
        isAccommodation: (mb.businessCategory || '').includes('hotel') || (mb.businessCategory || '').includes('stay'),
        phone: (mb as any).phone || '01334 000000',
        website: (mb as any).website || null,
        openingHours: (mb as any).openingHours || null,
        status: isSimulatedLive ? 'Subscribed' : 'Approved',
        isPublicDirectoryEnabled: true,
        isLive: isSimulatedLive,
      });
    });
  }

  return Array.from(results.values());
}

/**
 * Fetch a single public business by ID.
 * Looks in default Firestore DB, comfeed demo DB, and mock data.
 */
export async function getPublicBusinessByIdAction(businessId: string): Promise<PublicBusinessDetail | null> {
  if (!businessId) return null;

  // Pre-load community names
  const communityNameMap = new Map<string, string>();
  try {
    const { firestore } = initializeAdminApp();
    const commSnap = await firestore.collection('communities').get();
    commSnap.docs.forEach((doc) => {
      const cdata = doc.data();
      if (cdata.name) communityNameMap.set(doc.id, cdata.name.trim());
    });
  } catch (err) {
    // Ignore
  }

  // 1. Try default Firestore database
  try {
    const { firestore } = initializeAdminApp();
    const doc = await firestore.collection('businesses').doc(businessId).get();
    if (doc.exists) {
      const data = doc.data()!;
      if (data.isPublicDirectoryEnabled !== false) {
        return normalizeBusinessDoc(doc.id, data, communityNameMap);
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
        return normalizeBusinessDoc(doc.id, data, communityNameMap);
      }
    }
  } catch (error) {
    // Ignore comfeed errors
  }

  // 3. Try adverts collection (for Featured Ads & Valued Partners)
  try {
    const { firestore } = initializeAdminApp();
    const adDoc = await firestore.collection('adverts').doc(businessId).get();
    if (adDoc.exists) {
      const data = adDoc.data()!;
      const adItem = normalizeAdvertDoc(adDoc.id, data);
      if (adItem) return adItem;
    }
  } catch (error) {
    // Ignore advert fetch errors
  }

  // 4. Fallback to mock data
  const mockMatch = mockBusinesses.find((b) => String(b.id) === String(businessId));
  if (mockMatch) {
    const mockIdx = mockBusinesses.indexOf(mockMatch);
    const isSimulatedLive = mockIdx % 3 !== 0;

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
      status: isSimulatedLive ? 'Subscribed' : 'Approved',
      isPublicDirectoryEnabled: true,
      isLive: isSimulatedLive,
    };
  }

  return null;
}
