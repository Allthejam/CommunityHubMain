import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Enterprise & Group Account | Community Hub',
  description:
    'For local community groups, sports clubs, charities, associations, and multi-location organizations. Create an enterprise directory listing, post events, and engage with community members.',
  keywords: [
    'community enterprise registration',
    'community group listing',
    'local charity directory',
    'sports club community hub',
  ],
  alternates: {
    canonical: 'https://my-community-hub.co.uk/signup/enterprise',
  },
};

export default function EnterpriseSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
