export interface OfflinePersonaDemo {
  id: string;
  name: string;
  role: string;
  badge: string;
  avatar: string;
  description: string;
  stats: { label: string; value: string }[];
  highlights: string[];
}

export const OFFLINE_SHOWCASE_PERSONAS: OfflinePersonaDemo[] = [
  {
    id: 'leader',
    name: 'Eleanor Vance',
    role: 'Parish Council Chair & Civic Trustee',
    badge: 'Civic Leadership',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    description: 'Manages statutory ISO 22301 emergency playbooks, local town consultations, and multi-stream high street funding.',
    stats: [
      { label: 'Council Stake', value: '75%' },
      { label: 'Annual Cap Ex', value: '£0' },
      { label: 'Live Residents', value: '2,840' }
    ],
    highlights: [
      'Dispatches instant emergency sirens with geofenced boundaries during severe weather',
      'Oversees community trust fund recurring revenue without local authority software fees',
      'Authentic non-algorithmic civic feed protecting resident privacy'
    ]
  },
  {
    id: 'business',
    name: 'Hamish MacLeod',
    role: 'Highland Bakery & Highstreet Merchant',
    badge: 'Local Commerce',
    avatar: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=150&auto=format&fit=crop&q=80',
    description: 'Runs high street storefront, daily specials, and town deliveries with verified local residents.',
    stats: [
      { label: 'Monthly Listing', value: '£20/mo' },
      { label: 'Footfall Boost', value: '+34%' },
      { label: 'Local Orders', value: '412' }
    ],
    highlights: [
      'Digital storefront with zero commissions to overseas aggregator platforms',
      'Direct doorstep deliveries coordinated via appointed community couriers',
      'Exclusive local resident loyalty vouchers and promotions'
    ]
  },
  {
    id: 'resident',
    name: 'Fiona Stewart',
    role: 'Verified Local Resident & Parent',
    badge: 'Community Member',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    description: 'Engages in town polls, school ceilidh events, lost pet alerts, and buys from local artisans.',
    stats: [
      { label: 'Local Posts', value: '18' },
      { label: 'Petitions Signed', value: '6' },
      { label: 'High Street Saved', value: '£140' }
    ],
    highlights: [
      'Zero ads or algorithmic trackers, 100% chronological local town news',
      'Direct access to local emergency muster points and grit bin locations',
      'One-click participation in planning consultations and community ballots'
    ]
  },
  {
    id: 'courier',
    name: 'Callum Reid',
    role: 'Appointed Community Town Courier',
    badge: 'Local Logistics',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    description: 'Delivers local prescriptions, bakery orders, and grocery drops within the parish boundary.',
    stats: [
      { label: 'Deliveries Today', value: '28' },
      { label: 'Avg Town Drop', value: '12 min' },
      { label: 'Mileage Saved', value: '45 mi' }
    ],
    highlights: [
      'Hyperlocal dispatch avoiding national delivery carrier delays',
      'Emergency medicine drops for isolated rural residents',
      'Fair living wage supporting youth employment in the parish'
    ]
  }
];

export const OFFLINE_CIVIC_PILLARS = [
  {
    title: 'ISO 22301 Civil Resilience & Emergency Siren',
    desc: 'Statutory emergency response playbooks, sandbag depots, warming centers, and real-time offline-ready muster coordinates.',
    tag: 'Emergency & Safety',
    image: '/images/about/emergency.jpg'
  },
  {
    title: 'Digital High Street & Independent Merchant Window',
    desc: 'A thriving digital marketplace connecting independent butchers, craft workshops, and trades directly with town residents.',
    tag: 'Local Economy',
    image: '/images/about/highstreet.jpg'
  },
  {
    title: 'Regional Governance & Geofenced Parish Boundaries',
    desc: 'Precise geographic perimeters ensuring emergency dispatches, polls, and local events reach verified residents.',
    tag: 'Civic Infrastructure',
    image: '/images/about/regional.jpg'
  },
  {
    title: 'Zero Tracking & Algorithm-Free Privacy',
    desc: 'Strict GDPR compliance, zero algorithmic feeds, and protected local data storage built specifically for authentic civic life.',
    tag: 'Data Sovereignty',
    image: '/images/about/security.jpg'
  }
];
