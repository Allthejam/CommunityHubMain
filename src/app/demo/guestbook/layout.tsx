import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Visitor Guest Book (Demo) | Community Hub",
  description: "Read and sign the Oakridge visitor welcome and community guest book in the interactive demo.",
  path: "/demo/guestbook",
  image: "/images/about/hero.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
