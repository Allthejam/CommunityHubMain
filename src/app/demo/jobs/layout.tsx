import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Oakridge Local Jobs & Careers (Demo) | Community Hub",
  description: "Browse hyperlocal job vacancies and candidate profiles in the Oakridge community demo.",
  path: "/demo/jobs",
  image: "/images/about/highstreet.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
