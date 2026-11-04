import type { Metadata } from 'next';
import { getPublicBusinessesAction } from '@/lib/actions/publicDirectoryActions';
import { PublicDirectoryView } from '@/components/public-directory/public-directory-view';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every minute

export const metadata: Metadata = {
  title: 'Local Business Directory | Community Hub (No Login Required)',
  description:
    'Browse independent shops, services, trades, dining, and stays across local communities. Discover opening hours, contact info, and directions with no login or account required.',
  keywords: [
    'local businesses',
    'community directory',
    'local shops',
    'local services',
    'independent businesses',
    'community hub directory',
    'find local business',
    'uk business directory',
  ],
  openGraph: {
    title: 'Local Business Directory | Community Hub',
    description:
      'Explore local shops, trades, and independent services in your area. Open to the public, no sign-in needed.',
    type: 'website',
    url: 'https://my-community-hub.co.uk/public-directory',
  },
};

export default async function PublicDirectoryPage() {
  const businesses = await getPublicBusinessesAction();

  return <PublicDirectoryView businesses={businesses} />;
}
