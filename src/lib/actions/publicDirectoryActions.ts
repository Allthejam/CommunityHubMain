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
  additionalCommunityNames?: string[];
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
 * Resolves canonical community names regardless of leadership status.
 */
function normalizeBusinessDoc(
  id: string,
  data: any,
  communityMap?: Map<string, string>
): PublicBusinessDetail {
  const primaryAddress = Array.isArray(data.addresses) && data.addresses.length > 0 
    ? data.addresses[0] 
    : (data.address ? { addressLine1: data.address, city: data.city || '', postcode: data.postcode || '' } : null);

  // Resolve primary community name cleanly
  let commName = data.primaryCommunityName || data.communityName;
  if (communityMap && data.primaryCommunityId && communityMap.has(data.primaryCommunityId)) {
    commName = communityMap.get(data.primaryCommunityId);
  }
  if (commName && typeof commName === 'string') {
    commName = commName.trim();
  }

  // Resolve additional community names
  const additionalNames: string[] = [];
  if (Array.isArray(data.additionalCommunities)) {
    for (const ac of data.additionalCommunities) {
      if (ac && typeof ac === 'object') {
        const cId = ac.community || ac.id;
        const name = ac.communityName || ac.name || (cId && communityMap ? communityMap.get(cId) : null);
        if (name && typeof name === 'string' && name.trim()) {
          additionalNames.push(name.trim());
        }
      } else if (typeof ac === 'string' && ac.trim()) {
        const name = communityMap && communityMap.has(ac.trim()) ? communityMap.get(ac.trim()) : ac.trim();
        if (name) additionalNames.push(name);
      }
    }
  }

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
    primaryCommunityName: commName || 'Local Community',
    primaryCommunityId: data.primaryCommunityId || data.communityId || null,
    additionalCommunityNames: additionalNames,
    country: data.country || 'United Kingdom',
    city: primaryAddress?.city || data.city || commName || '',
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
 * Fetch all public-facing businesses across all communities, regardless of community leadership status.
 * Queries default Firestore and comfeed databases, deduplicating canonical community names.
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
      // Exclude explicitly declined, hidden, or drafts
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

  // 4. If live database has 0 records (e.g. offline dev test), supplement with clean mock businesses
  if (results.size === 0 && Array.isArray(mockBusinesses)) {
    const demoTowns = ['St Andrews', 'Crail', 'Anstruther', 'Elie', 'Pittenweem'];
    mockBusinesses.forEach((mb, idx) => {
      const town = demoTowns[idx % demoTowns.length];
      const idStr = String(mb.id);
      results.set(idStr, {
        id: idStr,
        businessName: mb.businessName,
        businessCategory: mb.businessCategory || 'retail',
        shortDescription: mb.shortDescription || 'Your friendly local neighborhood shop.',
        logoImage: mb.logoImage || null,
        bannerImage: null,
        primaryCommunityName: town,
        primaryCommunityId: `demo-${town.toLowerCase().replace(/\s+/g, '-')}`,
        additionalCommunityNames: [],
        country: 'Scotland, UK',
        city: town,
        postcode: 'KY16 9AA',
        isAccommodation: (mb.businessCategory || '').includes('hotel') || (mb.businessCategory || '').includes('stay'),
        phone: (mb as any).phone || '01334 000000',
        website: (mb as any).website || null,
        openingHours: (mb as any).openingHours || null,
        status: 'Approved',
        isPublicDirectoryEnabled: true,
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
      additionalCommunityNames: [],
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
