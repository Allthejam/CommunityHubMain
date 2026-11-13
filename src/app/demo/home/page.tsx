import type { Metadata } from 'next';
import Link from 'next/link';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';
import { DemoHomeClient } from '@/components/demo/demo-home-client';

export const metadata: Metadata = buildDemoMetadata({
  title: 'Oakridge Demo Community Hub | Live Interactive Sandbox',
  description:
    'Explore the live Oakridge Community Hub demo with no login required: local news, events, digital high street shopping, business directory, emergency resilience, jobs, and travel.',
  path: '/demo/home',
  keywords: [
    'oakridge community hub',
    'community hub demo',
    'digital high street demo',
    'local community news and events',
    'emergency resilience hub',
    'uk community portal demo',
  ],
  image: '/images/about/hero.jpg',
  imageAlt: 'Oakridge Demo Community Hub Interactive Portal',
});

const DEMO_MODULE_LINKS = [
  { href: '/demo/directory', label: 'Business Directory' },
  { href: '/demo/shopping', label: 'Virtual High Street' },
  { href: '/demo/events', label: 'Local Events' },
  { href: '/demo/news', label: 'Community News' },
  { href: '/demo/whatson', label: "What's On" },
  { href: '/demo/jobs', label: 'Local Jobs' },
  { href: '/demo/travel', label: 'Travel & Transit' },
  { href: '/demo/charities', label: 'Local Charities' },
  { href: '/demo/forum', label: 'Community Forum' },
  { href: '/demo/guestbook', label: 'Visitor Guest Book' },
  { href: '/demo/communities', label: 'Community Map' },
  { href: '/demo/regional-networks', label: 'Regional Networks' },
  { href: '/demo/defibrillators', label: 'Nearest Defibrillators' },
  { href: '/demo/lost-and-found', label: 'Lost & Found' },
  { href: '/demo/marketplace', label: 'Buy, Swap & Sell' },
  { href: '/demo/polls', label: 'Town Polls' },
  { href: '/demo/campaigns', label: 'Local Petitions' },
  { href: '/demo/about', label: 'About Oakridge' },
];

export default function DemoHomePage() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': 'https://my-community-hub.co.uk/demo/home',
        url: 'https://my-community-hub.co.uk/demo/home',
        name: 'Oakridge Demo Community Hub | Live Interactive Sandbox',
        description:
          'Explore the live Oakridge Community Hub demo with no login required: local news, events, digital high street shopping, business directory, and emergency resilience.',
        inLanguage: 'en-GB',
        isPartOf: {
          '@type': 'WebSite',
          name: 'Community Hub',
          url: 'https://my-community-hub.co.uk',
        },
      },
      {
        '@type': 'BreadcrumbList',
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
            name: 'Oakridge Demo Hub',
            item: 'https://my-community-hub.co.uk/demo/home',
          },
        ],
      },
    ],
  };

  return (
    <div className="container max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      {/* Server-rendered SEO & Crawler Navigation Overview */}
      <section className="rounded-2xl border bg-card/60 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">
              Oakridge Model Community Hub (Live Demo)
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Browse every public module of Community Hub with no login required — local businesses, high street shopping, events, news, travel, jobs, and civic resilience.
            </p>
          </div>
          <Link
            href="/demo/login"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
          >
            Switch Demo Role &rarr;
          </Link>
        </div>

        <nav aria-label="Demo Hub Modules" className="flex flex-wrap gap-1.5 pt-1">
          {DEMO_MODULE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full border bg-background hover:bg-muted transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </section>

      <DemoHomeClient />
    </div>
  );
}
