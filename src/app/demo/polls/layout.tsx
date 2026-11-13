import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Town Polls & Consultations (Demo) | Community Hub",
  description: "Vote in local civic polls and community consultations in the Oakridge demo hub.",
  path: "/demo/polls",
  image: "/images/about/security.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
