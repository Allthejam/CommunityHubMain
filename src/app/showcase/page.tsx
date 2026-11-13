import type { Metadata } from 'next';
import { ShowcaseContent } from '@/components/showcase/showcase-content';
import { ShowcaseSeoSchema } from '@/components/showcase/ShowcaseSeoSchema';
import { getPageSeoDataAction } from '@/lib/actions/seoActions';
import type { ShowcaseSeoData } from '@/lib/seo/page-seo-defaults';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeoDataAction<ShowcaseSeoData>('showcase');
  const { meta } = seo;

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: meta.canonicalUrl || 'https://my-community-hub.co.uk/showcase',
    },
    robots: {
      index: meta.robotsIndex,
      follow: meta.robotsFollow,
      googleBot: {
        index: meta.robotsIndex,
        follow: meta.robotsFollow,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      url: meta.canonicalUrl || 'https://my-community-hub.co.uk/showcase',
      siteName: 'Community Hub',
      locale: 'en_GB',
      type: 'website',
      images: [
        {
          url: meta.ogImage || '/images/about/hero.jpg',
          width: 1200,
          height: 630,
          alt: meta.ogImageAlt || 'Community Hub Showcase',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.twitterTitle || meta.ogTitle || meta.title,
      description: meta.twitterDescription || meta.ogDescription || meta.description,
      images: [meta.twitterImage || meta.ogImage || '/images/about/hero.jpg'],
    },
  };
}

export default async function ShowcaseBrochurePage({
  searchParams,
}: {
  searchParams?: Promise<{ persona?: string; role?: string }>;
}) {
  const [seoData, resolvedParams] = await Promise.all([
    getPageSeoDataAction<ShowcaseSeoData>('showcase'),
    searchParams ? searchParams : Promise.resolve({} as { persona?: string; role?: string }),
  ]);

  const initialPersona = resolvedParams?.persona || resolvedParams?.role || null;

  return (
    <>
      <ShowcaseSeoSchema townshipName="Oakridge" baseUrl="https://my-community-hub.co.uk" />
      <ShowcaseContent initialSeoData={seoData} initialPersona={initialPersona} />
    </>
  );
}
