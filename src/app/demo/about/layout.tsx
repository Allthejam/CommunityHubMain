import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "About Oakridge Demo Hub | Community Hub",
  description: "Learn about the Oakridge model community hub, local resilience features, and digital high street.",
  path: "/demo/about",
  image: "/images/about/hero.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
