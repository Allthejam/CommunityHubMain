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

function getSpecificSchemaType(business: any): string {
  if (business.isAccommodation) return 'LodgingBusiness';
  const cat = (business.businessCategory || '').toLowerCase();
  if (cat.includes('hotel') || cat.includes('b&b') || cat.includes('motel') || cat.includes('stay') || cat.includes('inn') || cat.includes('campsite')) return 'LodgingBusiness';
  if (cat.includes('restaurant')) return 'Restaurant';
  if (cat.includes('cafe') || cat.includes('coffee')) return 'CafeOrCoffeeShop';
  if (cat.includes('bakery') || cat.includes('baker')) return 'Bakery';
  if (cat.includes('bar') || cat.includes('pub')) return 'BarOrPub';
  if (cat.includes('food') || cat.includes('bistro') || cat.includes('dining')) return 'FoodEstablishment';
  if (cat.includes('hair') || cat.includes('beauty') || cat.includes('salon') || cat.includes('spa') || cat.includes('barber')) return 'HealthAndBeautyBusiness';
  if (cat.includes('gym') || cat.includes('fitness')) return 'HealthClub';
  if (cat.includes('medical') || cat.includes('dentist') || cat.includes('health') || cat.includes('therapy') || cat.includes('clinic')) return 'MedicalBusiness';
  if (cat.includes('car') || cat.includes('motor') || cat.includes('garage') || cat.includes('auto')) return 'AutomotiveBusiness';
  if (cat.includes('plumb') || cat.includes('electric') || cat.includes('roof') || cat.includes('build') || cat.includes('joiner') || cat.includes('trade')) return 'HomeAndConstructionBusiness';
  if (cat.includes('legal') || cat.includes('solicitor') || cat.includes('law')) return 'LegalService';
  if (cat.includes('accountant') || cat.includes('finance') || cat.includes('financial')) return 'FinancialService';
  if (cat.includes('pet') || cat.includes('vet')) return 'VeterinaryCare';
  if (cat.includes('shop') || cat.includes('store') || cat.includes('retail') || cat.includes('book') || cat.includes('clothing') || cat.includes('florist')) return 'Store';
  return 'LocalBusiness';
}

function getSchemaOpeningHours(openingHours: any): any[] {
  if (!openingHours || typeof openingHours !== 'object') return [];
  const specs: any[] = [];
  const daysMap: Record<string, string> = {
    monday: 'https://schema.org/Monday',
    tuesday: 'https://schema.org/Tuesday',
    wednesday: 'https://schema.org/Wednesday',
    thursday: 'https://schema.org/Thursday',
    friday: 'https://schema.org/Friday',
    saturday: 'https://schema.org/Saturday',
    sunday: 'https://schema.org/Sunday',
  };

  for (const [dayKey, dayUrl] of Object.entries(daysMap)) {
    const dayData = openingHours[dayKey];
    if (!dayData || dayData.closed) continue;

    const open = dayData.morningOpen || dayData.open;
    const close = dayData.afternoonClose || dayData.afternoonOpen || dayData.close;
    if (open && close) {
      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dayUrl,
        opens: open,
        closes: close,
      });
    }
  }

  return specs;
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
    keywords: [
      business.businessName,
      business.businessCategory,
      business.primaryCommunityName || '',
      business.city || '',
      'local business',
      'community hub directory',
      'verified local partner',
      'uk community',
    ].filter(Boolean),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Community Hub',
      locale: 'en_GB',
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

  // Generate Google Schema.org LocalBusiness & BreadcrumbList JSON-LD
  const primaryAddress = business.addresses?.[0];
  const schemaType = getSpecificSchemaType(business);
  const openingHoursSpecs = business.isLive ? getSchemaOpeningHours(business.openingHours) : [];
  const canonicalUrl = `https://my-community-hub.co.uk/public-directory/${business.id}`;
  const communityName = business.primaryCommunityName || business.city || 'Local Community';

  const socialLinks = [business.website, business.socialMedia].filter(Boolean) as string[];

  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': schemaType,
        '@id': `${canonicalUrl}#business`,
        name: business.businessName,
        description: business.shortDescription || business.metaDescription || `${business.businessCategory} located in ${communityName}`,
        url: canonicalUrl,
        telephone: business.isLive ? (business.phone || undefined) : undefined,
        email: business.isLive ? (business.contactEmail || undefined) : undefined,
        image: business.bannerImage || business.logoImage || undefined,
        priceRange: '££',
        currenciesAccepted: 'GBP',
        areaServed: {
          '@type': 'AdministrativeArea',
          name: communityName,
        },
        sameAs: socialLinks.length > 0 ? socialLinks : undefined,
        address: primaryAddress
          ? {
              '@type': 'PostalAddress',
              streetAddress: primaryAddress.addressLine1,
              addressLocality: primaryAddress.city || business.city || communityName,
              postalCode: primaryAddress.postcode || business.postcode,
              addressCountry: 'GB',
            }
          : undefined,
        openingHoursSpecification: openingHoursSpecs.length > 0 ? openingHoursSpecs : undefined,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumbs`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://my-community-hub.co.uk',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Public Directory',
            item: 'https://my-community-hub.co.uk/public-directory',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: communityName,
            item: 'https://my-community-hub.co.uk/public-directory',
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: business.businessName,
            item: canonicalUrl,
          },
        ],
      },
    ],
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
