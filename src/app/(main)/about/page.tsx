import { type Metadata } from 'next';
import { AboutContent } from '@/components/about/about-content';

export const metadata: Metadata = {
  title: "About Community Hub | Rebuilding Local Communities",
  description: "Learn about Community Hub's mission to reconnect and enrich local communities with Regional Networks, Geofenced Maps, Broadcast Systems, Emergency Resilience, and local commerce.",
  openGraph: {
    title: "About Community Hub | Rebuilding Local Communities",
    description: "Learn how Community Hub is transforming local engagement, supporting small businesses, and empowering regional networks and community leaders.",
    images: [
        {
            url: '/images/about/hero.jpg',
            width: 1200,
            height: 630,
            alt: 'A vibrant community event outdoors',
        }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Community Hub | Rebuilding Local Communities',
    description: "Learn how Community Hub is transforming local engagement, supporting small businesses, and empowering regional networks and community leaders.",
    images: ['/images/about/hero.jpg'],
  }
};

export default function AboutPage() {
    return <AboutContent />;
}
