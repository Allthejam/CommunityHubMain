import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Become a Community Leader | Lead Your Town Hub & Earn 40% Revenue',
  description:
    'Apply to run or establish a Community Hub for your town or village. Manage content, approve local businesses and events, coordinate civil resilience plans, and earn a 40% revenue share.',
  keywords: [
    'community leader signup',
    'community council digital platform',
    'run town community hub',
    'parish council software UK',
    'village resilience management',
    'community revenue share',
  ],
  alternates: {
    canonical: 'https://my-community-hub.co.uk/signup/leader',
  },
  openGraph: {
    title: 'Become a Community Leader | Lead Your Town Hub & Earn 40% Revenue',
    description:
      'Manage local content, approve business listings, coordinate civil resilience plans, and earn a 40% revenue share.',
    url: 'https://my-community-hub.co.uk/signup/leader',
    siteName: 'Community Hub',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Become a Community Leader | Lead Your Town Hub & Earn 40% Revenue',
    description:
      'Manage local content, approve business listings, coordinate civil resilience plans, and earn a 40% revenue share.',
  },
};

export default function LeaderSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
