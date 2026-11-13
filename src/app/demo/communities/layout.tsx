import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Interactive Community Map & Geofencing (Demo) | Community Hub",
  description: "Explore geofenced community boundaries and neighbouring towns on the interactive demo map.",
  path: "/demo/communities",
  image: "/images/about/geofencing.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
