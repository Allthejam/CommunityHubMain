import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Interactive Demo Hub Role Selector | Community Hub",
  description: "Choose a persona (Resident, Business, Community Leader, National Advertiser, Regional Authority) to explore the Oakridge demo with no signup required.",
  path: "/demo/login",
  image: "/images/about/hero.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
