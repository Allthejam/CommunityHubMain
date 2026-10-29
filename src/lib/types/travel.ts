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
  lastVerified?: string;
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
    operator: 'Regional Transit / Route 37',
    title: 'Service 37: Community Corridor Express',
    routeNumber: '37',
    destinations: 'Town Centre – Westpark Hub – Regional Rail Station',
    frequency: 'Hourly (Mon–Sat) | Every 2h Sundays',
    liveTrackerUrl: 'https://bustimes.org/',
    timetableUrl: 'https://www.traveline.info/',
    description: 'Main regional bus linking the community with the central railway interchange, local high street, health centres, and retail parks.',
    localTips: 'Direct connection outside the railway station. Accepts contactless card payments, Apple Pay, and national concession passes.',
    isActive: true,
    isPopular: true,
    lastVerified: 'October 2026'
  },
  {
    id: 'bus-stagecoach-39',
    category: 'bus',
    operator: 'Inter-City Coach Link',
    title: 'Service 15: Regional Airport & City Shuttle',
    routeNumber: '15',
    destinations: 'Town Centre – Business Park – Regional Airport & City Hub',
    frequency: 'Every 60–90 mins peak | Mon–Sat',
    liveTrackerUrl: 'https://bustimes.org/',
    timetableUrl: 'https://www.traveline.info/',
    description: 'Direct coach route to the regional airport, commercial business park, general hospital, and city centre.',
    localTips: 'Dedicated luggage racks on board for airport travellers. Single and day return tickets available from driver or mobile app.',
    isActive: true,
    isPopular: true,
    lastVerified: 'October 2026'
  },
  {
    id: 'bus-citylink',
    category: 'bus',
    operator: 'National Express & Intercity Coaches',
    title: 'National Intercity Long-Distance Coach',
    routeNumber: '900',
    destinations: 'Regional Interchange – London, Edinburgh & Major Cities',
    frequency: 'Multiple daily coach departures',
    liveTrackerUrl: 'https://www.nationalexpress.com/en',
    timetableUrl: 'https://www.nationalexpress.com/en/destinations',
    bookingUrl: 'https://www.nationalexpress.com/en',
    description: 'Intercity coach services departing from the regional interchange with direct express links across the United Kingdom.',
    localTips: 'Advance online seat booking recommended during holiday periods and weekend evenings for best fares.',
    isActive: true,
    lastVerified: 'October 2026'
  },

  // TRAINS & RAIL
  {
    id: 'rail-carrbridge',
    category: 'train',
    operator: 'National Rail / Mainline Network',
    title: 'Local Mainline Railway Station',
    stationName: 'Mainline Rail Station',
    distanceFromCentre: '1.2 miles from Town Centre',
    destinations: 'Capital Mainline, Regional City Hub, London King\'s Cross & Airport Links',
    frequency: 'Regular hourly mainline passenger services',
    liveTrackerUrl: 'https://www.nationalrail.co.uk/live-trains/departures/',
    timetableUrl: 'https://www.nationalrail.co.uk/journey-planner/',
    bookingUrl: 'https://www.nationalrail.co.uk/journey-planner/',
    description: 'Primary mainline rail connection with passenger waiting lounge, real-time departure boards, free station parking, and sheltered bike stands.',
    localTips: 'Local connecting bus (Route 37) stops directly outside the station concourse. Step-free platform access available.',
    isActive: true,
    isPopular: true,
    lastVerified: 'October 2026'
  },
  {
    id: 'rail-aviemore',
    category: 'train',
    operator: 'High Speed & Intercity Rail Hub',
    title: 'Regional Central Railway Interchange',
    stationName: 'Central Rail Interchange',
    distanceFromCentre: '8.5 miles from Town Centre',
    destinations: 'Cross-Country Express, Sleeper Services, Major UK City Interchanges',
    frequency: 'Frequent express & high-speed intercity services',
    liveTrackerUrl: 'https://www.nationalrail.co.uk/live-trains/departures/',
    timetableUrl: 'https://www.nationalrail.co.uk/journey-planner/',
    bookingUrl: 'https://www.nationalrail.co.uk/journey-planner/',
    description: 'Major regional junction featuring cross-country rail routes, overnight sleeper trains, and direct high-speed lines.',
    localTips: 'Features electric vehicle charging bays, café, luggage lockers, and dedicated taxi ranks active until last train arrival.',
    isActive: true,
    isPopular: true,
    lastVerified: 'October 2026'
  },

  // TAXIS & PRIVATE HIRE
  {
    id: 'taxi-strathspey',
    category: 'taxi',
    operator: 'Community Cabs & Private Hire',
    title: 'Local Community Taxis & Station Transfers',
    telephone: '01632 960200',
    destinations: 'Local town runs, train station transfers, hospital trips & airport runs',
    frequency: '24/7 Service (Advance booking advised for early/late trips)',
    description: 'Reliable licensed local 4-seater and 8-seater private hire vehicles serving the community and surrounding villages.',
    localTips: 'Pre-booking is strongly advised for Friday and Saturday evenings, as well as early morning airport transfers.',
    isActive: true,
    isPopular: true,
    lastVerified: 'October 2026'
  },
  {
    id: 'taxi-cairngorm',
    category: 'taxi',
    operator: 'Executive Private Hire & Minibus',
    title: 'Executive Car Hire & Chauffeur Service',
    telephone: '01632 960201',
    destinations: 'Corporate travel, airport meet-and-greet, tourist trail excursions',
    frequency: 'Daily 07:00 – 23:00 (Extended on weekends)',
    description: 'Local executive car hire offering clean, modern estates and minibuses with large luggage capacity and child seats on request.',
    localTips: 'Offers group rates for weddings, community celebrations, and local events.',
    isActive: true,
    lastVerified: 'October 2026'
  },

  // COMMUNITY TRANSPORT
  {
    id: 'comm-dial-a-bus',
    category: 'community',
    operator: 'Community Transport Association (CTA)',
    title: 'Community Dial-a-Ride & Volunteer Minibus',
    telephone: '01632 960300',
    destinations: 'Door-to-door community transport for healthcare, grocery shopping & social clubs',
    frequency: 'Mon–Fri 09:00 – 16:30 (Book 24–48 hours in advance)',
    timetableUrl: 'https://ctauk.org/',
    bookingUrl: 'https://ctauk.org/',
    description: 'Not-for-profit accessible wheelchair transport and volunteer car scheme supporting seniors, residents with mobility challenges, and rural neighbours.',
    localTips: 'National concession bus passes accepted on registered community routes. Free registration for local residents.',
    isActive: true,
    isPopular: true,
    lastVerified: 'October 2026'
  },

  // EV CHARGING & PARKING
  {
    id: 'ev-burnfield',
    category: 'ev_parking',
    operator: 'Public EV Charging Network / Council Hub',
    title: 'High Street Public Car Park & Rapid EV Hub',
    stationName: 'High Street Public Car Park',
    distanceFromCentre: '150m from Town Centre',
    destinations: 'Rapid 50kW DC + Fast 22kW AC Charging Bays',
    liveTrackerUrl: 'https://www.zap-map.com/live-map',
    mapLocationUrl: 'https://www.google.com/maps/search/?api=1&query=electric+vehicle+charging',
    description: 'Central municipal car park with 4 dedicated EV charging bays, illuminated bays, public facilities, and coach parking.',
    localTips: 'Free public parking for up to 3 hours. Rapid charging activated via contactless payment or Zap-Pay app.',
    isActive: true,
    isPopular: true,
    lastVerified: 'October 2026'
  },
  {
    id: 'ev-an-suidhe',
    category: 'ev_parking',
    operator: 'Zap-Map / National EV Grid',
    title: 'Town Square On-Street Fast EV Chargers',
    distanceFromCentre: 'Central Town Square',
    destinations: 'Convenient on-street 22kW Fast AC Charging Points',
    liveTrackerUrl: 'https://www.zap-map.com/live-map',
    mapLocationUrl: 'https://www.google.com/maps/search/?api=1&query=electric+vehicle+charging',
    description: 'Convenient short-stay charging bays right outside local shops, pharmacies, post office, and local cafes.',
    localTips: 'Max stay 2 hours during daytime shopping hours (08:30–18:00) to keep turnaround fair for all motorists.',
    isActive: true,
    lastVerified: 'October 2026'
  },

  // ACTIVE TRAVEL & CYCLING
  {
    id: 'cycling-speyside-way',
    category: 'cycling',
    operator: 'Sustrans / National Cycle Network',
    title: 'Community Greenway & Active Travel Path',
    destinations: 'Traffic-free greenway connecting town centre, nature reserves & neighbouring villages',
    timetableUrl: 'https://www.sustrans.org.uk/national-cycle-network',
    mapLocationUrl: 'https://osmaps.com/',
    description: 'Smooth, traffic-free paved trail ideal for commuter cycling, mobility scooters, jogging, and walking.',
    localTips: 'Public bike repair stand with pump and multi-tools available at the start of the trail next to the town hall.',
    isActive: true,
    lastVerified: 'October 2026'
  }
];
