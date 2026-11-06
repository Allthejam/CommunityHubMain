import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'National Advertising Account | Community Hub',
  description:
    'Run large-scale advertising campaigns across the entire Community Hub platform without expensive Pay-Per-Click models. Target audience interest and achieve transparent, fixed-rate local visibility.',
  keywords: [
    'national advertising Community Hub',
    'algorithm-free advertising UK',
    'community sponsorship',
    'fixed rate brand advertising',
  ],
  alternates: {
    canonical: 'https://my-community-hub.co.uk/signup/national',
  },
};

export default function NationalSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
