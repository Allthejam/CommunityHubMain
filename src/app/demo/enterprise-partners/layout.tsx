import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Enterprise & Strategic Partners (Demo) | Community Hub",
  description: "Explore regional and enterprise partner organisations supporting local hubs in the Oakridge demo.",
  path: "/demo/enterprise-partners",
  image: "/images/about/regional.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
