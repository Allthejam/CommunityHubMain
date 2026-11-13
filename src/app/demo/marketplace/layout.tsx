import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Buy, Swap & Sell Marketplace (Demo) | Community Hub",
  description: "Browse local resident classifieds, swaps, and community marketplace listings in the demo.",
  path: "/demo/marketplace",
  image: "/images/about/highstreet.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
