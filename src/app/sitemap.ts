import type { MetadataRoute } from 'next';
import { getPublicBusinessesAction } from '@/lib/actions/publicDirectoryActions';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://my-community-hub.co.uk';

  // Base static public routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/public-directory`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/directory/advertise`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/showcase`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  // Dynamic public business listings
  try {
    const businesses = await getPublicBusinessesAction();
    const businessRoutes: MetadataRoute.Sitemap = businesses.map((b) => ({
      url: `${baseUrl}/public-directory/${b.id}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    return [...routes, ...businessRoutes];
  } catch (error) {
    console.error('Error generating dynamic business sitemap:', error);
    return routes;
  }
}
