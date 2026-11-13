import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Local Charities & Causes (Demo) | Community Hub",
  description: "Support local charities, hospices, and community fundraising initiatives in the Oakridge demo.",
  path: "/demo/charities",
  image: "/images/about/hero.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
