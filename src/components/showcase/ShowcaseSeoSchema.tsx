import React from 'react';

interface ShowcaseSeoSchemaProps {
  townshipName?: string;
  baseUrl?: string;
}

export function ShowcaseSeoSchema({
  townshipName = 'Oakridge',
  baseUrl = 'https://communityhub.app'
}: ShowcaseSeoSchemaProps) {
  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/showcase`,
        url: `${baseUrl}/showcase`,
        name: 'Community Hub Showcase | Civic Resilience & Digital High Street Platform',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          name: 'Community Hub Platform',
          url: baseUrl,
        },
        description:
          'Official showcase demonstrating Community Hub for towns and villages: statutory civil resilience, emergency alert beacons, and an algorithm-free digital high street directory.',
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: baseUrl,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Showcase',
              item: `${baseUrl}/showcase`,
            },
          ],
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#software`,
        name: 'Community Hub Platform',
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'All (Web, iOS, Android, PWA)',
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'GBP',
        },
        description:
          'Hyperlocal Community Resilience, Digital High Street, and Real-Time Civic Emergency Alert Platform for Towns, Community Councils, and Regional Networks.',
      },
      {
        '@type': 'GovernmentService',
        '@id': `${baseUrl}/#resilience`,
        name: `${townshipName} Community Resilience & Emergency Action Hub`,
        serviceType: 'Emergency Preparedness & Civil Protection',
        provider: {
          '@type': 'Organization',
          name: `${townshipName} Community Resilience Team & Community Council`,
        },
        areaServed: {
          '@type': 'AdministrativeArea',
          name: `${townshipName}, DemoVille, UK`,
        },
      },
      {
        '@type': 'LocalBusiness',
        '@id': `${baseUrl}/#highstreet`,
        name: `${townshipName} Digital High Street & Merchant Showcase`,
        description: 'Verified independent local merchants, high street special offers, and artisan products.',
        address: {
          '@type': 'PostalAddress',
          addressLocality: townshipName,
          addressRegion: 'DemoVille',
          postalCode: 'DE1 4MO',
          addressCountry: 'GB',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${baseUrl}/showcase#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How does Community Hub differ from traditional social networks?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Unlike global social platforms that use engagement algorithms and sell private user data, Community Hub is 100% algorithm-free, private, and chronological. Emergency safety broadcasts and local business promotions are displayed directly to verified residents without life-safety delays or pay-to-reach barriers.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the Emergency Resilience Beacon and how does it work during a crisis?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The Emergency Alert Beacon allows verified community leaders and regional emergency authorities to dispatch non-dismissible, high-priority alerts with live shelter coordinates, sandbag locations, and volunteer mutual-aid mobilization during storms, power outages, floods, or wildfires.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do independent high street shops and traders benefit from Community Hub?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Local merchants receive an integrated Digital High Street storefront where they can post daily special offers, announce new stock, manage opening times, and message local customers directly without competing against multinational online retailers.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can regional councils and district authorities coordinate multiple communities?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Regional Network Accounts enable regional authorities to map multi-town geofenced boundaries, broadcast cross-community emergency alerts, and coordinate disaster transport assets across entire districts.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is Community Hub compliant with UK GDPR and statutory resilience standards?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Community Hub adheres strictly to UK GDPR regulations, collects zero tracking cookies, operates role-based access control, and aligns with standard Civil Resilience emergency management frameworks (ISO 22301 aligned).',
            },
          },
          {
            '@type': 'Question',
            name: 'How can a town council or community group register their own hub?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Any community group or council can claim and set up their town hub in minutes through our guided registration wizard, or explore our live Show Home sandbox demo first.',
            },
          },
        ],
      },
      {
        '@type': 'Event',
        '@id': `${baseUrl}/#communityevent`,
        name: `${townshipName} Community Festival & High Street Market`,
        description: 'Annual town gathering, artisan market, live music, and community food showcase.',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: 'The Town Square & Park Grounds',
          address: {
            '@type': 'PostalAddress',
            addressLocality: townshipName,
            addressRegion: 'DemoVille',
            postalCode: 'DE1 4MO',
            addressCountry: 'GB',
          },
        },
        organizer: {
          '@type': 'Organization',
          name: `${townshipName} Community Council`,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
