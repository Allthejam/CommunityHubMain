export interface ShowcaseImageItem {
  id: string;
  src: string;
  alt: string;
  title: string;
  caption: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export const SHOWCASE_IMAGES: Record<string, ShowcaseImageItem> = {
  hero: {
    id: 'hero',
    src: '/images/about/hero.jpg',
    alt: 'Highland Scottish community hub connecting local residents, independent high street merchants, and town council leaders',
    title: 'Community Hub — Scottish Hyperlocal Civic Platform',
    caption: 'One unified, algorithm-free digital home for every verified resident, high street business, and civic leader.',
    width: 1200,
    height: 675,
    priority: true,
  },
  emergencyResilience: {
    id: 'emergencyResilience',
    src: '/images/about/emergency.jpg',
    alt: 'Real-time Scottish community emergency resilience dashboard with flood alerts, safe shelter locations, and sandbag dispatch',
    title: 'Statutory Civic Emergency Resilience & Alert Beacon',
    caption: 'Immediate emergency alert dispatch with live shelter locations, sandbag collection points, and volunteer mutual-aid coordination.',
    width: 1000,
    height: 600,
  },
  highStreet: {
    id: 'highStreet',
    src: '/images/about/highstreet.jpg',
    alt: 'Independent Scottish town digital high street showcase featuring local butcher, bakery, artisan crafts, and special offers',
    title: 'Digital High Street & Merchant Discovery Window',
    caption: 'Empowering independent local businesses to connect directly with local residents without paying thousands to global ad networks.',
    width: 1000,
    height: 600,
  },
  regionalCoordination: {
    id: 'regionalCoordination',
    src: '/images/about/regional.jpg',
    alt: 'National Park and regional council geographic boundary mapping interface for multi-community crisis coordination',
    title: 'Regional Authority Geofenced Network Management',
    caption: 'Aggregate multi-town oversight, mutual-aid asset sharing, and mass transport dispatching across regional boundaries.',
    width: 1000,
    height: 600,
  },
  privacySecurity: {
    id: 'privacySecurity',
    src: '/images/about/security.jpg',
    alt: 'GDPR-compliant, private civic communication architecture with zero tracking cookies and algorithm-free chronological town feed',
    title: '100% GDPR Private & Algorithm-Free Civic Network',
    caption: 'Protected local data storage, zero algorithmic manipulation, and strict verification for authentic neighbourhood safety.',
    width: 1000,
    height: 600,
  },
  geofencing: {
    id: 'geofencing',
    src: '/images/about/geofencing.jpg',
    alt: 'Interactive township perimeter boundary geofence with targeted location-based civic broadcasts',
    title: 'Interactive Township Perimeter Geofencing',
    caption: 'Precise perimeter boundaries ensure public notices and emergency broadcasts reach the exact residents and visitors affected.',
    width: 1000,
    height: 600,
  },
};
