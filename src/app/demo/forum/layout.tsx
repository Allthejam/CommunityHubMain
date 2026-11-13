import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Community Forum (Demo) | Community Hub",
  description: "Join local discussions, neighborhood Q&A, and community conversations in the Oakridge demo.",
  path: "/demo/forum",
  image: "/images/about/hero.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
