import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Local Travel & Transit (Demo) | Community Hub",
  description: "Check local bus schedules, travel alerts, and transport links in the Oakridge demo portal.",
  path: "/demo/travel",
  image: "/images/about/geofencing.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
