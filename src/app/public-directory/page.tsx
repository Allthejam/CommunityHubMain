import type { Metadata } from 'next';
import { getPublicBusinessesAction, getDirectoryCommunitiesAction } from '@/lib/actions/publicDirectoryActions';
import { getPageSeoDataAction } from '@/lib/actions/seoActions';
import type { PublicDirectorySeoData } from '@/lib/seo/page-seo-defaults';
import { PublicDirectoryView } from '@/components/public-directory/public-directory-view';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeoDataAction<PublicDirectorySeoData>('public-directory');
  const { meta } = seo;

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: meta.canonicalUrl || 'https://my-community-hub.co.uk/public-directory',
    },
    robots: {
      index: meta.robotsIndex,
      follow: meta.robotsFollow,
      googleBot: {
        index: meta.robotsIndex,
        follow: meta.robotsFollow,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      type: 'website',
      url: meta.canonicalUrl || 'https://my-community-hub.co.uk/public-directory',
      siteName: 'Community Hub',
      locale: 'en_GB',
      images: [
        {
          url: meta.ogImage || '/images/about/highstreet.jpg',
          width: 1200,
          height: 630,
          alt: meta.ogImageAlt || 'Community Hub Public Local Business Directory',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.twitterTitle || meta.ogTitle || meta.title,
      description: meta.twitterDescription || meta.ogDescription || meta.description,
      images: [meta.twitterImage || meta.ogImage || '/images/about/highstreet.jpg'],
    },
  };
}

export default async function PublicDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; category?: string }>;
}) {
  const [businesses, communitiesList, seoData, resolvedParams] = await Promise.all([
    getPublicBusinessesAction(),
    getDirectoryCommunitiesAction(),
    getPageSeoDataAction<PublicDirectorySeoData>('public-directory'),
    searchParams ? searchParams : Promise.resolve({} as { page?: string; category?: string }),
  ]);

  const parsedPage = Number.parseInt(resolvedParams?.page || '1', 10);
  const initialPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const initialCategory = resolvedParams?.category || null;
  const { meta } = seoData;

  const directorySchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': 'https://my-community-hub.co.uk/public-directory#collection',
        url: meta.canonicalUrl || 'https://my-community-hub.co.uk/public-directory',
        name: meta.schemaHeadline || meta.title,
        description: meta.schemaDescription || meta.description,
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
            item: meta.canonicalUrl || 'https://my-community-hub.co.uk/public-directory',
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
          description:
            b.shortDescription ||
            `${b.businessCategory} in ${b.primaryCommunityName || 'Local Community'}${b.postcode ? ', ' + b.postcode : ''}`,
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
      <PublicDirectoryView
        businesses={businesses}
        communitiesList={communitiesList}
        initialSeoData={seoData}
        initialPage={initialPage}
        initialCategory={initialCategory}
      />
    </>
  );
}
