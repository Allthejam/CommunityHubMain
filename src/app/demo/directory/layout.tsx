import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Business Directory (Demo) | Community Hub",
  description: "Browse local shops, trades, dining, and accommodation in the Oakridge demo business directory.",
  path: "/demo/directory",
  image: "/images/about/highstreet.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
