import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Lost & Found Board (Demo) | Community Hub",
  description: "Report or locate missing pets and lost items in the Oakridge community demo.",
  path: "/demo/lost-and-found",
  image: "/images/about/hero.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
