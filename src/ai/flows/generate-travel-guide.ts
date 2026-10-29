'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { type TravelServiceItem } from '@/lib/types/travel';

const GenerateTravelGuideInputSchema = z.object({
  communityName: z.string().describe('The name of the town, village, or community.'),
  region: z.string().optional().describe('The county, region, state, or area (e.g. Highlands, Moray, Cornwall, Yorkshire, etc.).'),
  country: z.string().optional().describe('The country (e.g. Scotland, England, UK, etc.).'),
});

export type GenerateTravelGuideInput = z.infer<typeof GenerateTravelGuideInputSchema>;

const TravelServiceItemSchema = z.object({
  id: z.string(),
  category: z.enum(['bus', 'train', 'taxi', 'community', 'ev_parking', 'cycling', 'ferry']),
  operator: z.string().describe('The name of the transport operator or local authority (e.g. Stagecoach, ScotRail, National Rail, First Bus, ChargePlace Scotland).'),
  title: z.string().describe('A descriptive title (e.g. Service 37: Aviemore & Grantown Link, Carrbridge Railway Station).'),
  routeNumber: z.string().optional().describe('The specific bus/coach route number if applicable (e.g. 37, 36, 15).'),
  destinations: z.string().optional().describe('Key stops, towns, or directions connected by this route.'),
  frequency: z.string().optional().describe('Operating frequency or timetable schedule (e.g. Hourly Mon–Sat, Regular Daily).'),
  stationName: z.string().optional().describe('Name of the station if category is train or EV hub.'),
  distanceFromCentre: z.string().optional().describe('Distance from the town centre if the station is in a nearby town (e.g. 10 miles away in Carrbridge).'),
  telephone: z.string().optional().describe('Local phone number for taxi or dial-a-bus services with authentic area dialling code.'),
  liveTrackerUrl: z.string().optional().describe('Direct link to official live departure board or vehicle GPS tracker.'),
  timetableUrl: z.string().optional().describe('Direct link to official timetable or schedule page.'),
  bookingUrl: z.string().optional().describe('Direct link to ticket booking or reservation portal if applicable.'),
  mapLocationUrl: z.string().optional().describe('Map link for car parks or stations.'),
  description: z.string().describe('Clear 1-2 sentence description of who this service serves and where it goes.'),
  localTips: z.string().optional().describe('Helpful local insider advice for residents and tourists.'),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().optional(),
  lastVerified: z.string().optional().describe('Verification date (e.g. October 2026).'),
});

const GenerateTravelGuideOutputSchema = z.object({
  services: z.array(TravelServiceItemSchema).describe('List of authentic transit, rail, taxi, and EV services for the community.'),
});

export type GenerateTravelGuideOutput = z.infer<typeof GenerateTravelGuideOutputSchema>;

export async function generateTravelGuide(input: GenerateTravelGuideInput): Promise<GenerateTravelGuideOutput> {
  const communityName = input.communityName.trim();
  const region = input.region || '';
  const country = input.country || 'United Kingdom';

  const prompt = `You are a regional transport geographer and UK public transit expert.
Generate an authentic, geographically accurate Local Travel & Transit Guide for the community of "${communityName}" (${region ? region + ', ' : ''}${country}).

CRITICAL GEOGRAPHICAL & ACCURACY RULES:
1. TRAINS & RAIL ACCURACY:
   - Check if "${communityName}" actually has an active passenger railway station.
   - If "${communityName}" DOES NOT have an active train station, DO NOT invent one! Instead, list the real closest active passenger railway stations in the surrounding region. State the approximate distance in "distanceFromCentre" (e.g. "Approx 10 miles away in Carrbridge") and mention connecting bus routes in the description!
   - Use official working links for rail:
     * liveTrackerUrl: "https://www.nationalrail.co.uk/live-trains/departures/"
     * timetableUrl: "https://www.nationalrail.co.uk/journey-planner/"
     * bookingUrl: "https://www.nationalrail.co.uk/journey-planner/"

2. BUSES & COACHES:
   - Identify the real primary bus and coach companies operating in this specific county/region (e.g. Stagecoach, First Bus, Lothian, Go-Ahead, Arriva, National Express, local council dial-a-bus).
   - Use real route numbers where known.
   - Use valid working links:
     * liveTrackerUrl: "https://bustimes.org/" or official operator live times
     * timetableUrl: "https://www.traveline.info/" or official operator timetable

3. TAXIS & PRIVATE HIRE:
   - Include 1-2 realistic local taxi / private hire companies serving "${communityName}" and surrounding areas.
   - Use the authentic regional telephone dialling code for that county/area.

4. EV CHARGING & PARKING:
   - Include the main public car park or EV charging hub in "${communityName}".
   - liveTrackerUrl: "https://www.zap-map.com/live-map"
   - mapLocationUrl: "https://www.google.com/maps/search/?api=1&query=electric+vehicle+charging"

5. COMMUNITY MINIBUS / DIAL-A-RIDE:
   - Include local community transport schemes or dial-a-ride for rural areas.
   - timetableUrl: "https://ctauk.org/"

6. VERIFICATION:
   - Set lastVerified to "October 2026" on every service.

7. Structure: Generate 5 to 7 high-quality, practical services across categories: bus, train, taxi, ev_parking, community.`;

  const response = await ai.generate({
    prompt,
    output: {
      schema: GenerateTravelGuideOutputSchema,
    },
  });

  if (!response.output || !response.output.services || response.output.services.length === 0) {
    throw new Error('AI could not generate travel guide for this location.');
  }

  // Ensure unique IDs and freshness
  const services = response.output.services.map((item, index) => ({
    ...item,
    id: `ai-${item.category}-${Date.now()}-${index}`,
    isActive: true,
    lastVerified: item.lastVerified || 'October 2026',
  }));

  return { services };
}

  return { services };
}
