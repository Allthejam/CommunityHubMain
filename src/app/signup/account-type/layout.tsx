import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Choose Account Type | Join Community Hub',
  description:
    'Discover the 6 ways to participate in Community Hub: Resident personal accounts, local business digital high street listings, community leadership, enterprise groups, and regional emergency networks.',
  keywords: [
    'Community Hub account types',
    'join Community Hub',
    'local business registration',
    'community council platform',
    'resident signup',
    'town hub registration',
    'digital high street account',
    'regional network account',
  ],
  alternates: {
    canonical: 'https://my-community-hub.co.uk/signup/account-type',
  },
  openGraph: {
    title: 'Choose Account Type | Join Community Hub',
    description:
      'Discover the 6 ways to participate in Community Hub: Personal residents, local businesses, community leaders, and regional networks.',
    url: 'https://my-community-hub.co.uk/signup/account-type',
    siteName: 'Community Hub',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Choose Account Type | Join Community Hub',
    description:
      'Discover the 6 ways to participate in Community Hub: Personal residents, local businesses, community leaders, and regional networks.',
  },
};

export default function AccountTypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': 'https://my-community-hub.co.uk/signup/account-type#webpage',
        url: 'https://my-community-hub.co.uk/signup/account-type',
        name: 'Choose Account Type | Join Community Hub',
        description:
          'Overview of Community Hub account tiers: Personal Resident, Local Business, Community Leader, Enterprise, National Advertiser, and Regional Network.',
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://my-community-hub.co.uk',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Join Community Hub',
              item: 'https://my-community-hub.co.uk/signup/account-type',
            },
          ],
        },
      },
      {
        '@type': 'ItemList',
        '@id': 'https://my-community-hub.co.uk/signup/account-type#roles',
        name: 'Community Hub Membership & Account Options',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Personal Resident Account',
            description:
              'Connect with neighbours, discover local events, follow community news, support local high street merchants, and receive emergency alerts.',
            url: 'https://my-community-hub.co.uk/signup/personal',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Local Business Account',
            description:
              'Promote your business on the digital high street, post events, showcase products, and connect directly with local residents with zero algorithm barriers.',
            url: 'https://my-community-hub.co.uk/signup/business',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Community Leader & Council Account',
            description:
              'Manage your town hub, coordinate civic resilience playbooks, approve business listings, and earn a 40% revenue share.',
            url: 'https://my-community-hub.co.uk/signup/leader',
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: 'Enterprise & Community Group Account',
            description:
              'For community associations, sports clubs, charities, and local multi-location organizations.',
            url: 'https://my-community-hub.co.uk/signup/enterprise',
          },
          {
            '@type': 'ListItem',
            position: 5,
            name: 'National Advertiser Account',
            description:
              'Fixed-rate, algorithm-free brand awareness across multiple UK communities without expensive Pay-Per-Click models.',
            url: 'https://my-community-hub.co.uk/signup/national',
          },
          {
            '@type': 'ListItem',
            position: 6,
            name: 'Regional Network Account',
            description:
              'For National Parks, Regional Councils, and Conservation Authorities to map multi-town geofenced boundaries and broadcast cross-community emergency alerts.',
            url: 'https://my-community-hub.co.uk/signup/regional',
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      {children}
    </>
  );
}
