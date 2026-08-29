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
    operator: 'Stagecoach North Scotland',
    title: 'Service 37: Aviemore & Strathspey Link',
    routeNumber: '37',
    destinations: 'Aviemore – Carrbridge – Grantown-on-Spey',
    frequency: 'Hourly (Mon–Sat) | Reduced Sunday service',
    liveTrackerUrl: 'https://www.stagecoachbus.com/live-bus-times',
    timetableUrl: 'https://www.stagecoachbus.com/timetables',
    description: 'Main regional bus connecting Grantown with Aviemore railway hub, Cairngorm mountain links, and Carrbridge.',
    localTips: 'Connects directly with ScotRail and LNER trains at Aviemore Rail Station. Contactless payments accepted onboard.',
    isActive: true,
    isPopular: true
  },
  {
    id: 'bus-stagecoach-39',
    category: 'bus',
    operator: 'Stagecoach North Scotland',
    title: 'Service 39 / 39A: Inverness & Coast Express',
    routeNumber: '39',
    destinations: 'Grantown – Forres – Nairn – Inverness Airport & City Centre',
    frequency: 'Every 90 mins peak | Mon–Sat',
    liveTrackerUrl: 'https://www.stagecoachbus.com/live-bus-times',
    timetableUrl: 'https://www.stagecoachbus.com/timetables',
    description: 'Direct coach route to Inverness city centre, shopping, regional hospital (Raigmore), and Inverness Airport.',
    localTips: 'Luggage racks available for airport travellers. Ask driver for Through-Tickets to Inverness.',
    isActive: true,
    isPopular: true
  },
  {
    id: 'bus-citylink',
    category: 'bus',
    operator: 'Scottish Citylink',
    title: 'Citylink Scottish Highlands Express',
    routeNumber: '961',
    destinations: 'Inverness – Aviemore – Perth – Glasgow & Edinburgh',
    frequency: 'Multiple daily coach departures',
    liveTrackerUrl: 'https://www.citylink.co.uk/',
    timetableUrl: 'https://www.citylink.co.uk/timetables/',
    bookingUrl: 'https://www.citylink.co.uk/',
    description: 'National express coach services departing from Aviemore Interchange with links across Scotland.',
    localTips: 'Advance online seat booking recommended during summer and ski seasons.',
    isActive: true
  },

  // TRAINS & RAIL
  {
    id: 'rail-carrbridge',
    category: 'train',
    operator: 'ScotRail / Highland Main Line',
    title: 'Carrbridge Railway Station',
    stationName: 'Carrbridge Station (CAG)',
    distanceFromCentre: '8.4 miles from Grantown town square',
    destinations: 'Inverness, Perth, Stirling, Glasgow Queen St, Edinburgh Waverley',
    frequency: 'Approx every 2 hours',
    liveTrackerUrl: 'https://www.journeycheck.com/scotrail/',
    timetableUrl: 'https://www.scotrail.co.uk/plan-your-journey/timetables',
    bookingUrl: 'https://www.scotrail.co.uk/',
    description: 'Closest railway station to Grantown-on-Spey on the Highland Main Line with free station parking.',
    localTips: 'Unstaffed station with ticket machine. Connecting buses (Service 37) stop right outside the station approach.',
    isActive: true,
    isPopular: true
  },
  {
    id: 'rail-aviemore',
    category: 'train',
    operator: 'ScotRail & LNER / Caledonian Sleeper',
    title: 'Aviemore Mainline Interchange',
    stationName: 'Aviemore Station (AVM)',
    distanceFromCentre: '14.2 miles from Grantown town square',
    destinations: 'London King\'s Cross (LNER Azuma), London Euston (Sleeper), Edinburgh, Glasgow, Inverness',
    frequency: 'Frequent mainline & high-speed services',
    liveTrackerUrl: 'https://www.nationalrail.co.uk/live-trains/departures/AVM/',
    timetableUrl: 'https://www.scotrail.co.uk/',
    bookingUrl: 'https://www.lner.co.uk/',
    description: 'Major regional rail hub featuring direct high-speed trains to London, overnight Caledonian Sleeper, and Strathspey Steam Railway.',
    localTips: 'Large station car park, café, heated waiting rooms, and taxi ranks directly outside.',
    isActive: true,
    isPopular: true
  },

  // TAXIS & PRIVATE HIRE
  {
    id: 'taxi-strathspey',
    category: 'taxi',
    operator: 'Strathspey Cabs & Private Hire',
    title: 'Strathspey Taxis & Highland Transfers',
    telephone: '01479 872222',
    destinations: 'Local runs, distillery tours, train station & Inverness airport transfers',
    frequency: '24/7 (Advance booking recommended for early/late trips)',
    description: 'Reliable local 4-seater and 8-seater minibuses serving Grantown, Nethy Bridge, Dulnain Bridge, and Aviemore.',
    localTips: 'Pre-booking is strongly advised for weekend nights and early morning flights.',
    isActive: true,
    isPopular: true
  },
  {
    id: 'taxi-cairngorm',
    category: 'taxi',
    operator: 'Cairngorm Executive & Taxi',
    title: 'Cairngorm Taxi & Minibus Service',
    telephone: '01479 811111',
    destinations: 'Speyside Way luggage transfers, outdoor sports, ski shuttle',
    frequency: 'Daily 07:00 – 23:00 (Late on weekends)',
    description: 'Local taxi service with cycle carriers and ample luggage capacity for hillwalkers and luggage drop-offs.',
    localTips: 'Offers group bookings along the Speyside Way whisky trail.',
    isActive: true
  },

  // COMMUNITY TRANSPORT & DIAL-A-RIDE
  {
    id: 'comm-dial-a-bus',
    category: 'community',
    operator: 'Badenoch & Strathspey Community Transport (CTCO)',
    title: 'Strathspey Community Minibus & Dial-a-Ride',
    telephone: '01479 810004',
    destinations: 'Door-to-door community transport for healthcare, shopping & social clubs',
    frequency: 'Mon–Fri 09:00 – 16:30 (Book 24–48h in advance)',
    timetableUrl: 'https://www.ctco.org.uk/',
    description: 'Charity-operated fully accessible wheelchair transport and volunteer car scheme for seniors, disabled residents, and rural villagers.',
    localTips: 'Concession bus passes accepted on scheduled community runs. Registration required for new riders.',
    isActive: true,
    isPopular: true
  },

  // EV CHARGING & PARKING
  {
    id: 'ev-burnfield',
    category: 'ev_parking',
    operator: 'ChargePlace Scotland / Highland Council',
    title: 'Burnfield Avenue Car Park & Rapid EV Hub',
    stationName: 'Burnfield Public Car Park, Grantown-on-Spey',
    distanceFromCentre: '100m from High Street Square',
    destinations: '50kW Rapid DC + 22kW Fast AC Charging Bays',
    liveTrackerUrl: 'https://chargeplacescotland.org/',
    mapLocationUrl: 'https://maps.google.com/?q=Burnfield+Car+Park+Grantown-on-Spey',
    description: 'Central public car park with dedicated EV charging bays, public toilets, and coach parking.',
    localTips: 'Free parking for up to 3 hours. EV charging requires ChargePlace Scotland RFID card or mobile web app.',
    isActive: true,
    isPopular: true
  },
  {
    id: 'ev-an-suidhe',
    category: 'ev_parking',
    operator: 'Zap-Map / Tesla & Universal',
    title: 'The Square & High Street On-Street Parking',
    distanceFromCentre: 'Grantown High Street Town Centre',
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
    operator: 'Sustrans / Cairngorms National Park',
    title: 'Speyside Way & Dava Way Active Trail Network',
    destinations: 'Grantown to Aviemore (16 mi) | Grantown to Forres Dava Way (24 mi)',
    timetableUrl: 'https://www.speysideway.org/',
    mapLocationUrl: 'https://www.sustrans.org.uk/find-a-route-on-the-national-cycle-network/route-7/',
    description: 'Traffic-free multi-use trails suitable for hybrid, gravel, and e-bikes connecting Speyside communities.',
    localTips: 'E-bike charging and bike rentals available at local high street outdoor equipment stores.',
    isActive: true
  }
];
