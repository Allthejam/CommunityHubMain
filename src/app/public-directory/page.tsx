import type { Metadata } from 'next';
import { getPublicBusinessesAction, getDirectoryCommunitiesAction } from '@/lib/actions/publicDirectoryActions';
import { Suspense } from 'react';
import { PublicDirectoryView } from '@/components/public-directory/public-directory-view';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every minute

export const metadata: Metadata = {
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
  ],
  alternates: {
    canonical: 'https://my-community-hub.co.uk/public-directory',
  },
  openGraph: {
    title: 'Local Business Directory | Community Hub',
    description:
      'Explore local shops, trades, and independent services in your area. Open to the public, no sign-in needed.',
    type: 'website',
    url: 'https://my-community-hub.co.uk/public-directory',
    siteName: 'Community Hub',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Local Business Directory | Community Hub',
    description:
      'Explore local shops, trades, and independent services in your area. Open to the public, no sign-in needed.',
  },
};

export default async function PublicDirectoryPage() {
  const [businesses, communitiesList] = await Promise.all([
    getPublicBusinessesAction(),
    getDirectoryCommunitiesAction(),
  ]);

  const directorySchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': 'https://my-community-hub.co.uk/public-directory#collection',
        url: 'https://my-community-hub.co.uk/public-directory',
        name: 'Local Business Directory | Community Hub',
        description:
          'Browse independent shops, services, trades, dining, and stays across UK communities with no login required.',
        inLanguage: 'en-GB',
        isPartOf: {
          '@type': 'WebSite',
          name: 'Community Hub',
          url: 'https://my-community-hub.co.uk',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://my-community-hub.co.uk/public-directory?search={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://my-community-hub.co.uk/public-directory#breadcrumbs',
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
            name: 'Public Local Business Directory',
            item: 'https://my-community-hub.co.uk/public-directory',
          },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': 'https://my-community-hub.co.uk/public-directory#items',
        name: 'Verified Local Community Businesses',
        numberOfItems: businesses.length,
        itemListElement: businesses.slice(0, 50).map((b, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: b.businessName,
          url: `https://my-community-hub.co.uk/public-directory/${b.id}`,
          description: b.shortDescription || `${b.businessCategory} in ${b.primaryCommunityName || 'Local Community'}${b.postcode ? ', ' + b.postcode : ''}`,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(directorySchema) }}
      />
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>}>
        <PublicDirectoryView businesses={businesses} communitiesList={communitiesList} />
      </Suspense>
    </>
  );
}
