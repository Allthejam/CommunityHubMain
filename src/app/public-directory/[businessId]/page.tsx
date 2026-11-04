import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPublicBusinessByIdAction } from '@/lib/actions/publicDirectoryActions';
import { PublicBusinessProfileView } from '@/components/public-directory/public-business-profile-view';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface PageProps {
  params: Promise<{ businessId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { businessId } = await params;
  const business = await getPublicBusinessByIdAction(businessId);

  if (!business) {
    return {
      title: 'Business Not Found | Community Hub Public Directory',
      description: 'The requested local business listing could not be found.',
    };
  }

  const title =
    business.metaTitle ||
    `${business.businessName} - ${business.primaryCommunityName || business.city || 'Local Community'} | Public Directory`;

  const description =
    business.metaDescription ||
    business.shortDescription ||
    `Find contact details, opening hours, and information for ${business.businessName} in ${business.primaryCommunityName || 'Community Hub'}.`;

  const canonicalUrl = `https://my-community-hub.co.uk/public-directory/${business.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Community Hub',
      type: 'profile',
      images: business.bannerImage || business.logoImage ? [{ url: (business.bannerImage || business.logoImage)! }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: business.bannerImage || business.logoImage ? [(business.bannerImage || business.logoImage)!] : undefined,
    },
  };
}

export default async function PublicBusinessDetailPage({ params }: PageProps) {
  const { businessId } = await params;
  const business = await getPublicBusinessByIdAction(businessId);

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Store className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Business Listing Not Found</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          This business listing may have expired, changed its privacy settings, or the link may be incorrect.
        </p>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/public-directory">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Browse Public Directory
          </Link>
        </Button>
      </div>
    );
  }

  // Generate Google Schema.org LocalBusiness JSON-LD
  const primaryAddress = business.addresses?.[0];
  const schemaType = business.isAccommodation ? 'LodgingBusiness' : 'LocalBusiness';

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: business.businessName,
    description: business.shortDescription || business.metaDescription,
    url: `https://my-community-hub.co.uk/public-directory/${business.id}`,
    telephone: business.phone || undefined,
    email: business.contactEmail || undefined,
    image: business.bannerImage || business.logoImage || undefined,
    address: primaryAddress
      ? {
          '@type': 'PostalAddress',
          streetAddress: primaryAddress.addressLine1,
          addressLocality: primaryAddress.city || business.city || business.primaryCommunityName,
          postalCode: primaryAddress.postcode || business.postcode,
          addressCountry: 'GB',
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <PublicBusinessProfileView business={business} />
    </>
  );
}
