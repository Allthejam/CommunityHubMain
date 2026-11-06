import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  metadataBase: new URL('https://my-community-hub.co.uk'),
  title: 'Join Community Hub | Choose Your Account Type',
  description:
    'Join your local Community Hub. Register as a resident, local business, community leader, enterprise group, or regional network coordinator.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://my-community-hub.co.uk/signup/account-type',
  },
};

export default function SignUpRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
