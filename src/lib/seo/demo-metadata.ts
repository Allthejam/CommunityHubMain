import type { Metadata } from 'next';

export function buildDemoMetadata(params: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
}): Metadata {
  const baseUrl = 'https://my-community-hub.co.uk';
  const canonicalUrl = `${baseUrl}${params.path}`;
  const ogImage = params.image || '/images/about/hero.jpg';
  const ogAlt = params.imageAlt || `${params.title} | Community Hub Oakridge Demo`;

  return {
    title: params.title,
    description: params.description,
    keywords: params.keywords || [
      'community hub demo',
      'oakridge demo hub',
      'local community platform',
      'digital high street demo',
      'community directory uk',
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: params.title,
      description: params.description,
      url: canonicalUrl,
      siteName: 'Community Hub — Oakridge Demo',
      locale: 'en_GB',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: ogAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: params.title,
      description: params.description,
      images: [ogImage],
    },
  };
}
