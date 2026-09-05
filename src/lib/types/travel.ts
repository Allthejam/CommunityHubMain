export type TravelCategory = 
  | 'bus'
  | 'train'
  | 'taxi'
  | 'community'
  | 'ev_parking'
  | 'cycling'
  | 'ferry';

export interface TravelServiceItem {
  id: string;
  category: TravelCategory;
  operator: string;
  title: string;
  routeNumber?: string;
  destinations?: string;
  frequency?: string;
  stationName?: string;
  distanceFromCentre?: string;
  telephone?: string;
  liveTrackerUrl?: string;
  timetableUrl?: string;
  bookingUrl?: string;
  mapLocationUrl?: string;
  description?: string;
  localTips?: string;
  isActive: boolean;
  isPopular?: boolean;
}

export interface CommunityTravelData {
  communityId: string;
  communityName: string;
  headline?: string;
  subheading?: string;
  services: TravelServiceItem[];
  lastUpdated?: any;
}

export const DEFAULT_TRAVEL_SERVICES: TravelServiceItem[] = [
  // BUSES & COACHES
  {
    id: 'bus-stagecoach-37',
    category: 'bus',
    operator: 'DemoVille Transit / Route 37',
    title: 'Service 37: Oakridge & DemoVille Link',
    routeNumber: '37',
    destinations: 'DemoVille Central – Westpark – Oakridge Town Square',
    frequency: 'Hourly (Mon–Sat) | Every 2h Sunday service',
    liveTrackerUrl: 'https://bustimes.org/',
    timetableUrl: 'https://travelinescotland.com/',
    description: 'Main regional bus connecting Oakridge with DemoVille Central railway interchange, shopping districts, and surrounding villages.',
    localTips: 'Connects directly with National Rail at Oakridge Parkway Station. Contactless payments accepted onboard.',
    isActive: true,
    isPopular: true
  },
  {
    id: 'bus-stagecoach-39',
    category: 'bus',
    operator: 'Regional Express / Route 15',
    title: 'Service 15: Regional Airport & City Express',
    routeNumber: '15',
    destinations: 'Oakridge – Northfield – Regional Airport & City Centre',
    frequency: 'Every 90 mins peak | Mon–Sat',
    liveTrackerUrl: 'https://bustimes.org/',
    timetableUrl: 'https://travelinescotland.com/',
    description: 'Direct coach route to City Centre, commercial park, regional hospital, and Regional Airport.',
    localTips: 'Luggage racks available for airport travellers. Ask driver for Through-Tickets to Central Station.',
    isActive: true,
    isPopular: true
  },
  {
    id: 'bus-citylink',
    category: 'bus',
    operator: 'National Express Coaches',
    title: 'National Intercity Express Coach',
    routeNumber: '900',
    destinations: 'Regional Hub – Oakridge – London & Major Cities',
    frequency: 'Multiple daily coach departures',
    liveTrackerUrl: 'https://www.nationalexpress.com/',
    timetableUrl: 'https://www.nationalexpress.com/',
    bookingUrl: 'https://www.nationalexpress.com/',
    description: 'National express coach services departing from Oakridge Parkway Interchange with links across the UK.',
    localTips: 'Advance online seat booking recommended during holiday weekends.',
    isActive: true
  },

  // TRAINS & RAIL
  {
    id: 'rail-carrbridge',
    category: 'train',
    operator: 'National Rail / Mainline',
    title: 'Oakridge Parkway Railway Station',
    stationName: 'Oakridge Parkway (OKP)',
    distanceFromCentre: '1.2 miles from Oakridge Town Square',
    destinations: 'Regional Hub, Capital Mainline, London King\'s Cross, City Airport Express',
    frequency: 'Hourly mainline services',
    liveTrackerUrl: 'https://www.nationalrail.co.uk/',
    timetableUrl: 'https://www.nationalrail.co.uk/',
    bookingUrl: 'https://www.nationalrail.co.uk/',
    description: 'Primary railway station for Oakridge on the Mainline with 24/7 free passenger parking and cycle storage.',
    localTips: 'Staffed station ticket office and heated waiting lounge. Connecting buses (Service 37) stop right outside the station concourse.',
    isActive: true,
    isPopular: true
  },
  {
    id: 'rail-aviemore',
    category: 'train',
    operator: 'High Speed Intercity Rail',
    title: 'DemoVille Central Mainline Interchange',
    stationName: 'DemoVille Central (DVC)',
    distanceFromCentre: '8.5 miles from Oakridge Town Square',
    destinations: 'London King\'s Cross, High Speed Network, Regional Airport Shuttles',
    frequency: 'Frequent mainline & high-speed services',
    liveTrackerUrl: 'https://www.nationalrail.co.uk/',
    timetableUrl: 'https://www.nationalrail.co.uk/',
    bookingUrl: 'https://www.nationalrail.co.uk/',
    description: 'Major regional rail hub featuring high-speed direct trains to London, overnight sleeper connections, and regional links.',
    localTips: 'Large station car park, café, heated waiting rooms, and taxi ranks directly outside.',
    isActive: true,
    isPopular: true
  },

  // TAXIS & PRIVATE HIRE
  {
    id: 'taxi-strathspey',
    category: 'taxi',
    operator: 'Oakridge Cabs & Private Hire',
    title: 'Oakridge Taxis & Regional Transfers',
    telephone: '01632 960200',
    destinations: 'Local town runs, commercial hub shuttles, station and airport transfers',
    frequency: '24/7 (Advance booking recommended for early/late trips)',
    description: 'Reliable local 4-seater and 8-seater minibuses serving Oakridge, DemoVille, and surrounding areas.',
    localTips: 'Pre-booking is strongly advised for weekend nights and early morning flights.',
    isActive: true,
    isPopular: true
  },
  {
    id: 'taxi-cairngorm',
    category: 'taxi',
    operator: 'DemoVille Executive Car Hire',
    title: 'DemoVille Executive Taxi & Chauffeur',
    telephone: '01632 960201',
    destinations: 'Business transfers, airport pickups, country park excursions',
    frequency: 'Daily 07:00 – 23:00 (Late on weekends)',
    description: 'Local taxi service with cycle carriers and ample luggage capacity for sports trips and airport luggage.',
    localTips: 'Offers group bookings for local community events.',
    isActive: true
  },

  // COMMUNITY TRANSPORT
  {
    id: 'comm-dial-a-bus',
    category: 'community',
    operator: 'DemoVille Community Transport Action (CTA)',
    title: 'Oakridge Community Minibus & Dial-a-Ride',
    telephone: '01632 960300',
    destinations: 'Door-to-door community transport for healthcare, shopping & social clubs',
    frequency: 'Mon–Fri 09:00 – 16:30 (Book 24–48h in advance)',
    timetableUrl: 'https://www.ctco.org.uk/',
    description: 'Charity-operated fully accessible wheelchair transport and volunteer car scheme for seniors, disabled residents, and rural neighbours.',
    localTips: 'Concession bus passes accepted on scheduled community runs. Registration required for new riders.',
    isActive: true,
    isPopular: true
  },

  // EV CHARGING & PARKING
  {
    id: 'ev-burnfield',
    category: 'ev_parking',
    operator: 'National EV Network / Council Hub',
    title: 'Oakridge High Street Car Park & Rapid EV Hub',
    stationName: 'Oakridge High Street Public Car Park, DE1 4MO',
    distanceFromCentre: '100m from Town Square',
    destinations: '50kW Rapid DC + 22kW Fast AC Charging Bays',
    liveTrackerUrl: 'https://www.zap-map.com/',
    mapLocationUrl: 'https://maps.google.com/?q=Oakridge+High+Street+DE1+4MO',
    description: 'Central public car park with dedicated EV charging bays, public toilets, and coach parking.',
    localTips: 'Free parking for up to 3 hours. EV charging requires RFID card or mobile web app.',
    isActive: true,
    isPopular: true
  },
  {
    id: 'ev-an-suidhe',
    category: 'ev_parking',
    operator: 'Zap-Map / Universal EV',
    title: 'The Square & High Street On-Street Parking',
    distanceFromCentre: 'Oakridge High Street Town Centre',
    destinations: 'Town centre parking bays with EV charge points',
    liveTrackerUrl: 'https://www.zap-map.com/live/',
    description: 'Short-stay on-street town parking allowing quick access to local bakeries, butchers, pharmacies, and cafés.',
    localTips: 'Free on-street parking with 2-hour max stay during 08:30–18:00.',
    isActive: true
  },

  // ACTIVE TRAVEL & CYCLING
  {
    id: 'cycling-speyside-way',
    category: 'cycling',
    operator: 'Sustrans / National Cycle Network',
    title: 'DemoVille Valley Greenway & Active Trail Network',
    destinations: 'Oakridge to DemoVille Central (8 mi) | Oakridge Riverside Loop (4 mi)',
    timetableUrl: 'https://www.sustrans.org.uk/',
    mapLocationUrl: 'https://www.sustrans.org.uk/',
    description: 'Traffic-free multi-use trails suitable for hybrid, gravel, and e-bikes connecting Oakridge communities.',
    localTips: 'E-bike charging and bike rentals available at local high street outdoor equipment stores.',
    isActive: true
  }
];
