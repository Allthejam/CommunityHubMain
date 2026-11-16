import type { Metadata } from 'next';
import { buildDemoMetadata } from '@/lib/seo/demo-metadata';

export const metadata: Metadata = buildDemoMetadata({
  title: "Defibrillators (AED) & EV Charge Points Map (Demo) | Community Hub",
  description: "Locate community defibrillators (AEDs) and local electric vehicle (EV) charging points in the Oakridge demo.",
  path: "/demo/defibrillators-and-ev",
  image: "/images/about/emergency.jpg",
});

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
