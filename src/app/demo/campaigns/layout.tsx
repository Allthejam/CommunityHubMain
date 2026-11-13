import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Local Petitions & Campaigns (Demo) | Community Hub",
  description: "Explore local civic petitions and community improvement campaigns in the Oakridge demo.",
  path: "/demo/campaigns",
  image: "/images/about/hero.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
