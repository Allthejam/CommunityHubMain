'use server';

import { z } from 'genkit';
import { type TravelServiceItem } from '@/lib/types/travel';

const GenerateTravelGuideInputSchema = z.object({
  communityName: z.string().describe('The name of the town, village, or community.'),
  region: z.string().optional().describe('The county, region, state, or area (e.g. Moray, Highlands, Aberdeenshire, Colorado, etc.).'),
  country: z.string().optional().describe('The country (e.g. Scotland, UK, USA, etc.).'),
});

export type GenerateTravelGuideInput = z.infer<typeof GenerateTravelGuideInputSchema>;

const TravelServiceItemSchema = z.object({
  id: z.string(),
  category: z.enum(['bus', 'train', 'taxi', 'community', 'ev_parking', 'cycling', 'ferry']),
  operator: z.string().describe('The name of the transport operator or local authority (e.g. Stagecoach North Scotland, ScotRail, ChargePlace Scotland).'),
  title: z.string().describe('A descriptive title (e.g. Service 36: Elgin & Speyside Link, Keith Railway Station).'),
  routeNumber: z.string().optional().describe('The specific bus/coach route number if applicable (e.g. 36, 37, 365).'),
  destinations: z.string().optional().describe('Key stops, towns, or directions connected by this route.'),
  frequency: z.string().optional().describe('Operating frequency or timetable schedule (e.g. Hourly Mon–Sat, Regular Daily).'),
  stationName: z.string().optional().describe('Name of the station if category is train or EV hub.'),
  distanceFromCentre: z.string().optional().describe('Distance from the town centre if the station is in a nearby town (e.g. 14 miles away in Keith).'),
  telephone: z.string().optional().describe('Local phone number for taxi or dial-a-bus services with real area code.'),
  liveTrackerUrl: z.string().optional().describe('Direct link to official live departure board or vehicle GPS tracker.'),
  timetableUrl: z.string().optional().describe('Direct link to official timetable or schedule page.'),
  bookingUrl: z.string().optional().describe('Direct link to ticket booking or reservation portal if applicable.'),
  mapLocationUrl: z.string().optional().describe('Map link for car parks or stations.'),
  description: z.string().describe('Clear 1-2 sentence description of who this service serves and where it goes.'),
  localTips: z.string().optional().describe('Helpful local insider advice for residents and tourists.'),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().optional(),
});

const GenerateTravelGuideOutputSchema = z.object({
  services: z.array(TravelServiceItemSchema).describe('List of authentic transit, rail, taxi, and EV services for the community.'),
});

export type GenerateTravelGuideOutput = z.infer<typeof GenerateTravelGuideOutputSchema>;

export async function generateTravelGuide(input: GenerateTravelGuideInput): Promise<GenerateTravelGuideOutput> {
  const { genkit } = await import('genkit');
  const { googleAI } = await import('@genkit-ai/google-genai');

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const ai = genkit({
    plugins: [
      googleAI({ apiKey: geminiApiKey }),
    ],
    model: 'googleai/gemini-1.5-flash-latest',
  });

  const communityName = input.communityName.trim();
  const region = input.region || '';
  const country = input.country || 'United Kingdom';

  const prompt = `You are a regional transport geographer and local transit expert.
Your job is to generate an authentic, geographically accurate Local Travel & Transit Guide for the community of "${communityName}" (${region ? region + ', ' : ''}${country}).

CRITICAL GEOGRAPHICAL RULES:
1. TRAINS & RAIL ACCURACY:
   - Check if "${communityName}" actually has an active passenger railway station.
   - If "${communityName}" DOES NOT have an active train station (e.g. Aberlour, Dufftown, Grantown, Ullapool, St Andrews, etc.), DO NOT invent a station with "${communityName}" in the name!
   - Instead, list the real CLOSEST active railway stations (e.g. for Aberlour: Keith Station approx 14 miles away, Elgin Station approx 18 miles away, Aviemore approx 24 miles away). Clearly state the distance in "distanceFromCentre" (e.g. "14 miles away in Keith") and mention connecting bus routes in the description!
   - Provide links to real rail operators (e.g. ScotRail / National Rail: https://www.nationalrail.co.uk/ or https://www.scotrail.co.uk/).

2. BUSES & COACHES:
   - Identify the real primary bus and coach companies operating in this specific county/region (e.g. Stagecoach, First Bus, Lothian, Citylink, National Express, local council dial-a-bus / m.connect).
   - Use real route numbers where known (e.g. Stagecoach 36 for Aberlour/Elgin, Stagecoach 37 for Aviemore/Grantown, etc.).
   - Provide official tracker links (e.g. https://www.stagecoachbus.com/live-bus-times).

3. TAXIS & PRIVATE HIRE:
   - Include 1-2 realistic local taxi / private hire companies serving "${communityName}" and surrounding areas.
   - Use the authentic regional telephone dialling code (e.g. 01340 for Speyside/Aberlour, 01343 for Elgin/Moray, 01479 for Strathspey, etc.).

4. EV CHARGING & PARKING:
   - Include the main public car park or EV charging hub in the town (e.g. ChargePlace Scotland, Zap-Map, council car parks).

5. COMMUNITY MINIBUS / DIAL-A-RIDE:
   - Include local community transport schemes (e.g. Moray m.connect, Badenoch & Strathspey CTCO, dial-a-ride).

6. Structure: Generate 4 to 7 high-quality, practical services across categories: bus, train, taxi, ev_parking, community.`;

  const response = await ai.generate({
    prompt,
    output: {
      schema: GenerateTravelGuideOutputSchema,
    },
  });

  if (!response.output || !response.output.services) {
    throw new Error('AI could not generate travel guide for this location.');
  }

  // Ensure unique IDs
  const services = response.output.services.map((item, index) => ({
    ...item,
    id: `ai-${item.category}-${Date.now()}-${index}`,
    isActive: true,
  }));

  return { services };
}
