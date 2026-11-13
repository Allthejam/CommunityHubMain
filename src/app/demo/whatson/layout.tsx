import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "What's On in Oakridge (Demo) | Community Hub",
  description: "Explore local attractions, activities, and community highlights in the Oakridge demo guide.",
  path: "/demo/whatson",
  image: "/images/about/hero.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
