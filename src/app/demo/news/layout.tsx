import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Local News & Updates (Demo) | Community Hub",
  description: "Read verified local community news, council bulletins, and neighborhood stories in the Oakridge demo.",
  path: "/demo/news",
  image: "/images/about/regional.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
