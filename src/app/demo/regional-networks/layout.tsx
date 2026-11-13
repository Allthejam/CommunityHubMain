import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Regional Networks & Broadcasts (Demo) | Community Hub",
  description: "See how Regional Councils and National Parks coordinate multiple local hubs in the demo.",
  path: "/demo/regional-networks",
  image: "/images/about/regional.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
