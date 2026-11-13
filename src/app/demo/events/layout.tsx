import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Community Events Calendar (Demo) | Community Hub",
  description: "Discover upcoming town markets, village hall workshops, and community events in the Oakridge demo.",
  path: "/demo/events",
  image: "/images/about/hero.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
