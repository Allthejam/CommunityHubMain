import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Community Hub Showcase | Hyperlocal Civic Resilience & Digital High Street Platform',
  description:
    'Explore the official Community Hub showcase for Scottish towns and regional authorities. Features statutory civil resilience action plans, real-time emergency alert beacons, and an algorithm-free digital high street directory.',
  keywords: [
    'Community Hub',
    'Scottish Town Hub',
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
    url: 'https://communityhub.app/showcase',
    siteName: 'Community Hub Platform',
    title: 'Community Hub Showcase — Hyperlocal Civic Resilience & Digital High Street',
    description:
      'Discover how Scottish towns use Community Hub for verified resident communication, emergency resilience dispatch, and independent high street discovery.',
    images: [
      {
        url: 'https://communityhub.app/images/about/hero.jpg',
        width: 1200,
        height: 675,
        alt: 'Highland Scottish community hub connecting local residents, independent merchants, and council leaders',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Community Hub Showcase | Scottish Civic Resilience & High Street Platform',
    description:
      'One unified platform connecting residents, merchants, community councils, and regional authorities safely.',
    images: ['https://communityhub.app/images/about/hero.jpg'],
  },
  alternates: {
    canonical: 'https://communityhub.app/showcase',
  },
};

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
