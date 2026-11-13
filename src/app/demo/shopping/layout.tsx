import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Virtual High Street Shopping (Demo) | Community Hub",
  description: "Shop independent local high street merchants and community offers in the Oakridge interactive demo.",
  path: "/demo/shopping",
  image: "/images/about/highstreet.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
