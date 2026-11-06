import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Regional Network Account | Councils, National Parks & Authorities',
  description:
    'Designed for National Park Authorities, Regional Councils, and Conservation or Emergency Authorities. Map multi-town geofenced boundaries and broadcast cross-community emergency alerts.',
  keywords: [
    'regional network account',
    'national park emergency alerts',
    'regional council communication',
    'multi-community emergency broadcast',
    'civic resilience authority',
  ],
  alternates: {
    canonical: 'https://my-community-hub.co.uk/signup/regional',
  },
  openGraph: {
    title: 'Regional Network Account | Councils, National Parks & Authorities',
    description:
      'Map multi-town geofenced boundaries, publish regional announcements, and dispatch multi-community emergency broadcasts.',
    url: 'https://my-community-hub.co.uk/signup/regional',
    siteName: 'Community Hub',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Regional Network Account | Councils, National Parks & Authorities',
    description:
      'Map multi-town geofenced boundaries, publish regional announcements, and dispatch multi-community emergency broadcasts.',
  },
};

export default function RegionalSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
