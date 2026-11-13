import type {
  AboutSeoData,
  SeoPageMeta,
  SeoSectionData,
} from '@/lib/seo/about-seo-defaults';
import { SHOWCASE_IMAGES } from '@/lib/showcase-images';

export type SeoPageId = 'about' | 'showcase' | 'public-directory';

export type PageSeoData<K extends string = string> = {
  meta: SeoPageMeta;
  sections: Record<K, SeoSectionData>;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type ShowcaseSectionKey =
  | 'hero'
  | 'heroImage'
  | 'personas'
  | 'regionalAuthority'
  | 'everydayModules'
  | 'visualGallery'
  | 'civicDifference'
  | 'faq'
  | 'finalCta';

export type ShowcaseSeoData = PageSeoData<ShowcaseSectionKey>;

export type PublicDirectorySectionKey =
  | 'hero'
  | 'directoryListing'
  | 'conversionBanner';

export type PublicDirectorySeoData = PageSeoData<PublicDirectorySectionKey>;

export const DEFAULT_SHOWCASE_SEO_DATA: ShowcaseSeoData = {
  meta: {
    title: 'Community Hub Showcase | Civic Resilience & Digital High Street Platform',
    description:
      'Explore the interactive Community Hub product showcase: statutory civil resilience, emergency alert beacons, regional network oversight, and an algorithm-free digital high street.',
    keywords: [
      'community hub showcase',
      'civic resilience platform',
      'emergency alert beacon uk',
      'digital high street',
      'community council software',
      'regional network hub',
      'local business showcase',
      'algorithm-free community network',
    ],
    canonicalUrl: 'https://my-community-hub.co.uk/showcase',
    robotsIndex: true,
    robotsFollow: true,
    ogTitle: 'Community Hub Showcase | Civic Resilience & Digital High Street',
    ogDescription:
      'Test-drive the Oakridge Show Home sandbox across 5 roles: Resident, High Street Business, Community Leader, National Advertiser, and Regional Authority.',
    ogImage: '/images/about/hero.jpg',
    ogImageAlt: SHOWCASE_IMAGES.hero.alt,
    twitterTitle: 'Community Hub Showcase | Civic Resilience & Digital High Street',
    twitterDescription:
      'Explore statutory civil resilience, emergency alerts, and local high street commerce in our live interactive showcase.',
    twitterImage: '/images/about/hero.jpg',
    schemaHeadline:
      'Community Hub Showcase | Civic Resilience & Digital High Street Platform',
    schemaDescription:
      'Official showcase demonstrating Community Hub for towns and villages: statutory civil resilience, emergency alert beacons, and an algorithm-free digital high street directory.',
    lastUpdatedLabel: '13/11/2026',
  },
  sections: {
    hero: {
      badge: 'Civil Resilience • Local Economy • Zero Tracking',
      heading: 'The Digital Town Square Reimagined for Resilience & Local Trade',
      headingTag: 'h1',
      description:
        'An all-in-one, algorithm-free civic platform uniting verified residents, independent high street shops, emergency teams, and regional councils.',
    },
    heroImage: {
      heading: 'Interactive Live Model Experience',
      headingTag: 'h3',
      description: SHOWCASE_IMAGES.hero.caption,
      imageUrl: SHOWCASE_IMAGES.hero.src,
      imageAlt: SHOWCASE_IMAGES.hero.alt,
      imageTitle: SHOWCASE_IMAGES.hero.title,
    },
    personas: {
      badge: 'Interactive Role Explorer',
      heading: 'One Platform. Five Purpose-Built Perspectives.',
      headingTag: 'h2',
      description:
        'Select any role below to inspect its dedicated workflows, or launch the Oakridge Show Home sandbox in one click.',
    },
    regionalAuthority: {
      badge: 'Regional Network Oversight',
      heading: 'Regional Council & National Park Command Coordination',
      headingTag: 'h2',
      description:
        'Aggregate multi-community visibility, cross-boundary emergency dispatch, and mutual-aid asset sharing.',
      imageUrl: SHOWCASE_IMAGES.regionalCoordination.src,
      imageAlt: SHOWCASE_IMAGES.regionalCoordination.alt,
      imageTitle: SHOWCASE_IMAGES.regionalCoordination.title,
    },
    everydayModules: {
      badge: 'Complete Civic Suite',
      heading: 'Everyday Community Tools Beyond Emergency Alerts',
      headingTag: 'h2',
      description:
        'Everything a modern town or village needs: local jobs, lost & found, what’s on calendars, courier delivery, charities, and council archives.',
    },
    visualGallery: {
      badge: 'Platform In Action',
      heading: 'Built for Real-World Resilience & High Street Growth',
      headingTag: 'h2',
      description:
        'Visualizing emergency response, independent local commerce, and regional network coordination.',
    },
    civicDifference: {
      badge: 'The Civic Difference',
      heading: 'Why Towns & Municipalities are Moving Off Generic Social Networks',
      headingTag: 'h2',
      description:
        'Zero life-safety delays, 100% high street centric reach, and direct regional authority oversight.',
    },
    faq: {
      badge: 'Frequently Asked Questions',
      heading: 'Frequently Asked Questions About Community Hub',
      headingTag: 'h2',
      description:
        'Clear answers regarding revenue sharing, inter-community networking, resilience standards, and town onboarding.',
    },
    finalCta: {
      badge: 'Interactive Test Drive',
      heading: 'Ready to Experience the Back Office for Yourself?',
      headingTag: 'h2',
      description:
        'Jump into our pre-populated Oakridge Show Home sandbox. Test role switching, emergency dispatch, revenue tracking, courier orders, and town setup in 1 click.',
    },
  },
  updatedAt: null,
  updatedBy: null,
};

export const DEFAULT_PUBLIC_DIRECTORY_SEO_DATA: PublicDirectorySeoData = {
  meta: {
    title: 'Local Business Directory | Community Hub (No Login Required)',
    description:
      'Browse independent shops, services, trades, dining, and stays across local communities. Discover opening hours, contact info, and directions with no login or account required.',
    keywords: [
      'local businesses',
      'community directory',
      'local shops',
      'local services',
      'independent businesses',
      'community hub directory',
      'find local business',
      'uk business directory',
      'local stays and lodging',
    ],
    canonicalUrl: 'https://my-community-hub.co.uk/public-directory',
    robotsIndex: true,
    robotsFollow: true,
    ogTitle: 'Local Business Directory | Community Hub',
    ogDescription:
      'Explore local shops, trades, stays, and independent services in your area. Open to the public, no sign-in needed.',
    ogImage: '/images/about/highstreet.jpg',
    ogImageAlt: 'Independent local businesses and shops in the Community Hub public directory',
    twitterTitle: 'Local Business Directory | Community Hub',
    twitterDescription:
      'Explore local shops, trades, stays, and independent services in your area. Open to the public, no sign-in needed.',
    twitterImage: '/images/about/highstreet.jpg',
    schemaHeadline: 'Local Business Directory | Community Hub',
    schemaDescription:
      'Browse independent shops, services, trades, dining, and stays across UK communities with no login required.',
    lastUpdatedLabel: '13/11/2026',
  },
  sections: {
    hero: {
      badge: 'Public Local Business Directory • Google Indexed',
      heading: 'Discover Great Local Shops, Services & Stays',
      headingTag: 'h1',
      description:
        'Browse independently owned local businesses across our regional communities. No sign-in or account needed — view opening hours, contact details, directions, and services.',
    },
    directoryListing: {
      heading: 'Community Directory Listings',
      headingTag: 'h2',
      description: 'Filter by category, community, or partner status.',
    },
    conversionBanner: {
      badge: 'Community Hub Network',
      heading: 'Living in or visiting one of our communities?',
      headingTag: 'h3',
      description:
        'While our public directory is open to anyone on the web without logging in, members of the Community Hub app unlock resident loyalty discounts, doorstep courier delivery, local event calendars, community resilience notices, and direct contact with local leaders.',
    },
  },
  updatedAt: null,
  updatedBy: null,
};

export function mergePageSeoData<K extends string>(
  defaults: PageSeoData<K>,
  partial?: Partial<PageSeoData<K>> | null
): PageSeoData<K> {
  if (!partial) return defaults;

  const mergedSections = { ...defaults.sections };
  if (partial.sections) {
    (Object.keys(defaults.sections) as K[]).forEach((key) => {
      if (partial.sections?.[key]) {
        mergedSections[key] = {
          ...defaults.sections[key],
          ...partial.sections[key],
        };
      }
    });
  }

  return {
    meta: {
      ...defaults.meta,
      ...(partial.meta || {}),
      keywords: Array.isArray(partial.meta?.keywords)
        ? partial.meta.keywords
        : defaults.meta.keywords,
    },
    sections: mergedSections,
    updatedAt: partial.updatedAt ?? null,
    updatedBy: partial.updatedBy ?? null,
  };
}

export function getDefaultSeoDataForPage(pageId: SeoPageId): PageSeoData<any> {
  if (pageId === 'showcase') return DEFAULT_SHOWCASE_SEO_DATA;
  if (pageId === 'public-directory') return DEFAULT_PUBLIC_DIRECTORY_SEO_DATA;
  // Lazy-imported at call sites if needed; for about use about-seo-defaults directly
  return DEFAULT_SHOWCASE_SEO_DATA as unknown as AboutSeoData;
}
