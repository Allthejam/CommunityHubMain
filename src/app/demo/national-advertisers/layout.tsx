import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "National Advertisers & Sponsors (Demo) | Community Hub",
  description: "View national sponsors and community dividend partners in the Oakridge demo hub.",
  path: "/demo/national-advertisers",
  image: "/images/about/highstreet.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
