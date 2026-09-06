import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  metadataBase: new URL('https://my-community-hub.co.uk'),
  title: 'Community Hub Showcase | Hyperlocal Civic Resilience & Digital High Street Platform',
  description:
    'Explore the official Community Hub showcase for modern towns, cities, and regional authorities. Features statutory civil resilience action plans, real-time emergency alert beacons, and an algorithm-free digital high street directory.',
  keywords: [
    'Community Hub',
    'Town & City Hub',
    'Civic Resilience',
    'Emergency Alert Beacon',
    'Digital High Street',
    'Town Resilience Plan',
    'Local Governance',
    'Civic Emergency Management',
    'Community Council Platform',
    'Local Merchant Directory',
    'Hyperlocal Communication'
  ],
  authors: [{ name: 'Community Hub Platform Team' }],
  creator: 'Community Hub Platform',
  publisher: 'Community Hub',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://my-community-hub.co.uk/showcase',
    siteName: 'Community Hub Platform',
    title: 'Community Hub Showcase — Hyperlocal Civic Resilience & Digital High Street',
    description:
      'Discover how modern towns and municipalities use Community Hub for verified resident communication, emergency resilience dispatch, and independent high street discovery.',
    images: [
      {
        url: 'https://my-community-hub.co.uk/images/about/hero.jpg',
        width: 1200,
        height: 675,
        alt: 'Hyperlocal community hub connecting local residents, independent merchants, and civic leaders',
      },
      {
        url: 'https://i.postimg.cc/ydfsPkvz/Hublogo512x512.png',
        width: 512,
        height: 512,
        alt: 'Community Hub Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Community Hub Showcase | Hyperlocal Civic Resilience & High Street Platform',
    description:
      'One unified platform connecting residents, merchants, community councils, and regional authorities safely.',
    images: [
      'https://my-community-hub.co.uk/images/about/hero.jpg',
      'https://i.postimg.cc/ydfsPkvz/Hublogo512x512.png'
    ],
  },
  alternates: {
    canonical: 'https://my-community-hub.co.uk/showcase',
  },
};

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
