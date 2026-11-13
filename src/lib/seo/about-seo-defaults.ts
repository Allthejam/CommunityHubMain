export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export type SeoSectionData = {
  badge?: string;
  heading: string;
  headingTag: HeadingLevel;
  description?: string;
  secondaryDescription?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageTitle?: string;
};

export type SeoPageMeta = {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  schemaHeadline: string;
  schemaDescription: string;
  lastUpdatedLabel: string;
};

export type AboutSectionKey =
  | 'hero'
  | 'heroBanner'
  | 'mission'
  | 'regionalNetworks'
  | 'geofencing'
  | 'highStreet'
  | 'resilience'
  | 'publicDirectory'
  | 'features'
  | 'security'
  | 'installApp'
  | 'shortcuts';

export type AboutSeoData = {
  meta: SeoPageMeta;
  sections: Record<AboutSectionKey, SeoSectionData>;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export const DEFAULT_ABOUT_SEO_DATA: AboutSeoData = {
  meta: {
    title: 'About Community Hub | Rebuilding Local Communities',
    description:
      "Learn about Community Hub's mission to reconnect and enrich local communities with Regional Networks, Geofenced Maps, Broadcast Systems, Emergency Resilience, and local commerce.",
    keywords: [
      'community hub',
      'local community platform',
      'digital high street',
      'emergency resilience uk',
      'regional networks',
      'geofenced community map',
      'local business directory',
      'support local shops',
    ],
    canonicalUrl: 'https://my-community-hub.co.uk/about',
    robotsIndex: true,
    robotsFollow: true,
    ogTitle: 'About Community Hub | Rebuilding Local Communities',
    ogDescription:
      'Learn how Community Hub is transforming local engagement, supporting small businesses, and empowering regional networks and community leaders.',
    ogImage: '/images/about/hero.jpg',
    ogImageAlt: 'A vibrant community event outdoors',
    twitterTitle: 'About Community Hub | Rebuilding Local Communities',
    twitterDescription:
      'Learn how Community Hub is transforming local engagement, supporting small businesses, and empowering regional networks and community leaders.',
    twitterImage: '/images/about/hero.jpg',
    schemaHeadline: 'About Community Hub — Rebuilding Local Communities, Regional Networks & High Streets',
    schemaDescription:
      'Community Hub is an all-in-one digital platform connecting residents, local businesses, regional councils, and emergency resilience teams.',
    lastUpdatedLabel: '22/08/2026',
  },
  sections: {
    hero: {
      badge: 'Next-Generation Community Platform',
      heading: 'Rebuilding Local Communities, Regional Networks & High Streets',
      headingTag: 'h1',
      description:
        'Community Hub is an all-in-one digital platform designed to reconnect residents, empower local businesses, enable regional council broadcasts, manage emergency resilience, and map out neighborhoods through interactive geofencing.',
    },
    heroBanner: {
      heading: 'Hyper-Local Connection & Regional Reach',
      headingTag: 'h3',
      description:
        'Bringing residents, local councils, emergency teams, and high street traders into one unified digital square.',
      imageUrl: '/images/about/hero.jpg',
      imageAlt: 'Vibrant local community street festival with market stalls',
      imageTitle: 'Community Hub Outdoor Festival & Local Market',
    },
    mission: {
      heading: 'Our Platform Capabilities',
      headingTag: 'h2',
      description:
        'From individual neighborhood noticeboards to regional network broadcasts, emergency resilience planning, and GPS geofence mapping, our platform provides the complete digital infrastructure for local life.',
    },
    regionalNetworks: {
      badge: 'Regional Networks',
      heading: 'Regional Networks & Multi-Hub Broadcast System',
      headingTag: 'h2',
      description:
        'We empower Regional Authorities, Local Councils, and District Organizations to claim oversight over entire geographic regions containing multiple local community hubs.',
      imageUrl: '/images/about/regional.jpg',
      imageAlt: 'Regional Network map dashboard with broadcast alerts',
      imageTitle: 'Regional Networks Multi-Hub Broadcast Dashboard',
    },
    geofencing: {
      badge: 'Spatial Technology',
      heading: 'Interactive Geofencing & Live GPS Detection',
      headingTag: 'h2',
      description:
        'Every mapped community has custom GeoJSON boundary polygon coordinates drawn directly by local leaders. When residents travel across town borders, our geofencing engine works in real-time.',
      imageUrl: '/images/about/geofencing.jpg',
      imageAlt: 'Interactive geofencing map with community boundaries and GPS pin',
      imageTitle: 'Interactive Community Geofencing & GPS Boundary Map',
    },
    highStreet: {
      badge: 'Local Commerce',
      heading: 'The Digital High Street: Local Shopping & Delivery',
      headingTag: 'h2',
      description:
        'Global online marketplaces often leave independent town shops behind. Our Virtual High Street brings local storefronts online, allowing residents to browse local products, order from town traders, and support independent businesses.',
      imageUrl: '/images/about/highstreet.jpg',
      imageAlt: 'Digital High Street with local shops and shopping app interface',
      imageTitle: 'Virtual High Street Local Shopping & Courier Delivery',
    },
    resilience: {
      badge: 'Civil Contingencies & Resilience',
      heading: 'Statutory Emergency Planning & Real-Time Incident Response',
      headingTag: 'h2',
      description:
        'When extreme weather, power cuts, wildfires, or flooding strike, rural and urban communities need clear, coordinated action. Community Hub equips local councils and community leaders with a living Statutory Emergency Action Plan and dynamic crisis command tools.',
      imageUrl: '/images/about/emergency.jpg',
      imageAlt: 'Community Emergency Resilience operations center with failover maps and volunteer coordination',
      imageTitle: 'Community Emergency Resilience Operations & Failover Planning',
    },
    publicDirectory: {
      badge: 'Open Public Access • Google SEO Indexed',
      heading: 'Public Local Business Directory & Search Engine Indexing',
      headingTag: 'h2',
      description:
        'While our community hubs provide secure, resident-only spaces for local news and discussion, our Public Directory sits outside the login gate. It gives independently owned local businesses, trades, and community partners maximum public visibility and automatic Google search indexing.',
      secondaryDescription: 'Public Directory Showcase',
    },
    features: {
      heading: 'Comprehensive Platform Feature Set',
      headingTag: 'h2',
      description:
        'Community Hub packs an unprecedented array of local tools into a single, intuitive application.',
    },
    security: {
      heading: 'Security, Privacy & Private Hubs',
      headingTag: 'h2',
      description:
        "Your safety and data privacy are foundational. Built on Google's enterprise infrastructure, Community Hub uses role-based access control, AI-driven content moderation, and encrypted database rules to protect every user.",
      secondaryDescription:
        'Need an unlisted, confidential space? We offer Exclusive Private Hubs perfect for clubs, sports teams, associations, and professional groups. Private hubs do not appear in public searches.',
      imageUrl: '/images/about/security.jpg',
      imageAlt: 'Security and role-based encryption concept',
      imageTitle: 'Community Hub Security, Privacy & Role-Based Encryption',
    },
    installApp: {
      heading: 'Install The App On Your Device',
      headingTag: 'h2',
      description:
        'No app store downloads required! Community Hub is a Progressive Web App (PWA) that installs directly from your web browser for an instant app experience with push notifications.',
    },
    shortcuts: {
      heading: 'Direct Action Shortcuts',
      headingTag: 'h2',
      description:
        'Touch and hold our App icon on your mobile home screen to instantly open key shortcuts like Community Feed, Virtual High Street, or Community Chat without navigating through menus.',
    },
  },
  updatedAt: null,
  updatedBy: null,
};

export function mergeAboutSeoData(partial?: Partial<AboutSeoData> | null): AboutSeoData {
  if (!partial) return DEFAULT_ABOUT_SEO_DATA;

  const mergedSections = { ...DEFAULT_ABOUT_SEO_DATA.sections };
  if (partial.sections) {
    (Object.keys(DEFAULT_ABOUT_SEO_DATA.sections) as AboutSectionKey[]).forEach((key) => {
      if (partial.sections?.[key]) {
        mergedSections[key] = {
          ...DEFAULT_ABOUT_SEO_DATA.sections[key],
          ...partial.sections[key],
        };
      }
    });
  }

  return {
    meta: {
      ...DEFAULT_ABOUT_SEO_DATA.meta,
      ...(partial.meta || {}),
      keywords: Array.isArray(partial.meta?.keywords)
        ? partial.meta.keywords
        : DEFAULT_ABOUT_SEO_DATA.meta.keywords,
    },
    sections: mergedSections,
    updatedAt: partial.updatedAt ?? null,
    updatedBy: partial.updatedBy ?? null,
  };
}
