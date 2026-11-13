import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Nearest Defibrillators (AED) Map (Demo) | Community Hub",
  description: "Locate community defibrillators (AEDs) and emergency life-safety points in the Oakridge demo.",
  path: "/demo/defibrillators",
  image: "/images/about/emergency.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
