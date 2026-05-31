import type { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Manifest['robots'] {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/leader/',
        '/business/',
        '/enterprise/',
        '/chat/',
        '/api/',
        '/settings/'
      ],
    },
    sitemap: 'https://my-community-hub.co.uk/sitemap.xml',
  }
}
