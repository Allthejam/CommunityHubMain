import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Join Your Local Community Hub | Free Resident Account',
  description:
    'Create a free personal resident account. Connect with neighbours, follow local news, discover community events, support independent high street shops, and receive emergency alerts.',
  keywords: [
    'join local community',
    'resident account Community Hub',
    'local community app UK',
    'town community network',
    'local events and news',
  ],
  alternates: {
    canonical: 'https://my-community-hub.co.uk/signup/personal',
  },
  openGraph: {
    title: 'Join Your Local Community Hub | Free Resident Account',
    description:
      'Connect with neighbours, follow local news, discover events, and support local high street merchants.',
    url: 'https://my-community-hub.co.uk/signup/personal',
    siteName: 'Community Hub',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join Your Local Community Hub | Free Resident Account',
    description:
      'Connect with neighbours, follow local news, discover events, and support local high street merchants.',
  },
};

export default function PersonalSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
