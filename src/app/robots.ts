import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/login',
          '/signup',
          '/showcase',
          '/showcase/',
          '/demo',
          '/demo/',
          '/businesses/',
          '/pricing',
          '/about',
          '/contact',
          '/terms',
          '/privacy',
        ],
        disallow: [
          '/admin/',
          '/leader/',
          '/business/',
          '/enterprise/',
          '/chat/',
          '/api/',
          '/settings/',
          '/feed',
          '/feed/',
        ],
      },
    ],
    sitemap: 'https://my-community-hub.co.uk/sitemap.xml',
  };
}

