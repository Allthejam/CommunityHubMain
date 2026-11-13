import { type Metadata } from 'next';
import { AboutContent } from '@/components/about/about-content';
import { getAboutSeoDataAction } from '@/lib/actions/seoActions';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getAboutSeoDataAction();
  const { meta } = seo;

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: meta.canonicalUrl || 'https://my-community-hub.co.uk/about',
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
      url: meta.canonicalUrl || 'https://my-community-hub.co.uk/about',
      siteName: 'Community Hub',
      locale: 'en_GB',
      type: 'website',
      images: [
        {
          url: meta.ogImage || '/images/about/hero.jpg',
          width: 1200,
          height: 630,
          alt: meta.ogImageAlt || 'A vibrant community event outdoors',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.twitterTitle || meta.ogTitle || meta.title,
      description: meta.twitterDescription || meta.ogDescription || meta.description,
      images: [meta.twitterImage || meta.ogImage || '/images/about/hero.jpg'],
    },
  };
}

function toAbsoluteUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://my-community-hub.co.uk${url.startsWith('/') ? url : `/${url}`}`;
}

export default async function AboutPage() {
  const seoData = await getAboutSeoDataAction();
  const { meta, sections } = seoData;

  const pageUrl = meta.canonicalUrl || 'https://my-community-hub.co.uk/about';

  const imageObjects = [
    sections.heroBanner,
    sections.regionalNetworks,
    sections.geofencing,
    sections.highStreet,
    sections.resilience,
    sections.security,
  ]
    .filter((s) => Boolean(s?.imageUrl))
    .map((s) => ({
      '@type': 'ImageObject',
      contentUrl: toAbsoluteUrl(s.imageUrl),
      url: toAbsoluteUrl(s.imageUrl),
      caption: s.imageAlt || s.heading,
      name: s.imageTitle || s.heading,
    }));

  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${pageUrl}#aboutpage`,
        url: pageUrl,
        name: meta.schemaHeadline || meta.title,
        description: meta.schemaDescription || meta.description,
        inLanguage: 'en-GB',
        keywords: meta.keywords.join(', '),
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: toAbsoluteUrl(meta.ogImage || sections.heroBanner.imageUrl),
          caption: meta.ogImageAlt || sections.heroBanner.imageAlt,
        },
        associatedMedia: imageObjects,
        isPartOf: {
          '@type': 'WebSite',
          name: 'Community Hub',
          url: 'https://my-community-hub.co.uk',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumbs`,
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
            name: 'About Community Hub',
            item: pageUrl,
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
      <AboutContent initialSeoData={seoData} />
    </>
  );
}
