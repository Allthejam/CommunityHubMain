import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Register Your Local Business | Community Hub Digital High Street',
  description:
    'Put your business on your local digital high street. Post events, list products, promote special offers, open an online storefront, and connect directly with local residents.',
  keywords: [
    'register local business',
    'digital high street registration',
    'local merchant directory',
    'promote local business UK',
    'community business listing',
    'local shop eCommerce',
  ],
  alternates: {
    canonical: 'https://my-community-hub.co.uk/signup/business',
  },
  openGraph: {
    title: 'Register Your Local Business | Community Hub Digital High Street',
    description:
      'Put your business on your local digital high street. Connect directly with verified residents and shoppers.',
    url: 'https://my-community-hub.co.uk/signup/business',
    siteName: 'Community Hub',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Register Your Local Business | Community Hub Digital High Street',
    description:
      'Put your business on your local digital high street. Connect directly with verified residents and shoppers.',
  },
};

export default function BusinessSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
