
'use server';
/**
 * @fileOverview Generates marketing copy for different audiences and features.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMarketingCopyInputSchema = z.object({
  audience: z.string().describe('The target audience for the marketing copy.'),
  feature: z.string().describe('The specific feature or aspect of the platform to promote.'),
});

export type GenerateMarketingCopyInput = z.infer<typeof GenerateMarketingCopyInputSchema>;

const GenerateMarketingCopyOutputSchema = z.object({
  headline: z.string().describe('A catchy headline for the campaign.'),
  body: z.string().describe('The main body text, formatted as simple HTML (using <p> and <strong> tags).'),
  socialMediaPost: z.string().describe('A short, engaging post suitable for social media platforms.'),
});

export type GenerateMarketingCopyOutput = z.infer<typeof GenerateMarketingCopyOutputSchema>;

// This is the main function that will be called from the server component.
// It's an action state function.
export async function generateMarketingCopy(
  prevState: any,
  formData: FormData
): Promise<GenerateMarketingCopyOutput & { success: boolean; error?: string }> {
  const input = {
    audience: formData.get('audience') as string,
    feature: formData.get('feature') as string,
  };

  try {
    const output = await generateMarketingCopyFlow(input);
    return { ...output, success: true, error: undefined };
  } catch (err: any) {
    return { ...prevState, success: false, error: err.message };
  }
}


const prompt = ai.definePrompt({
  name: 'generateMarketingCopyPrompt',
  input: {schema: GenerateMarketingCopyInputSchema},
  output: {schema: GenerateMarketingCopyOutputSchema},
  prompt: `You are a high-level creative brand and marketing strategist for "Community Hub" (also referred to as Local Pulse), a comprehensive next-generation civic, emergency, and local commerce ecosystem.
  
  Generate compelling, authoritative, and conversion-focused marketing copy tailored specifically to the target audience and platform feature focus.
  
  Context & Platform Architecture:
  - Target Audience: {{{audience}}}
  - Feature Focus: {{{feature}}}
  
  Platform Capability Reference for Copy Inspiration:
  - Community Leader POS, Event Till & QR Code Payments: Mobile & tablet event till for galas, festivals, farmers markets, sports days, and community stalls. Features instant dynamic QR code scanning for phone payments (Apple Pay, Google Pay, card) and offline cash tracking. 100% of donations and event proceeds go directly to the Community Leader's connected Stripe Express account via instant destination charge; the platform takes £0.00 markup (0% platform cut; only covers standard 1.5% + 20p Stripe processing fee; cash sales have 0p fee with 100% kept in the community cash tin).
  - Payment Auditing, Live Till Tracking & Cash Reconciliation: Transparent audit ledger, real-time till tracking, shift reconciliation, operator auditing, and exportable financial logs designed for Parish Clerks, Town Council Treasurers, and independent civic auditors.
  - Transparent Revenue Sharing & 70% Local Council Treasury Funding: A revolutionary commercial model where 70% of business and enterprise listing subscriptions goes directly to the Community Leader / Town Council fund to pay for local flowers, street fairs, youth clubs, and civic projects (unlike corporate tech platforms that take 100% of local ad spend away from the town).
  - Zero-Markup Community Donations & Dedicated Fundraising Pots: Leaders can create dedicated civic fundraising pots (e.g. Village Hall Roof Appeal, Christmas Lights, Park Restoration) with live progress bars, instant QR donations, and 0% platform deductions.
  - Virtual Highstreet, Storefront Subscriptions & Ethical Courier Splits: Storefront subscriptions provide a 10% Community Leader share, 40% Community Courier share, and 50% Platform share, creating sustainable local delivery employment for youth and cyclists while keeping high street trade thriving.
  - Zero-Markup Shopping Cart & Local Merchant Checkout: Local residents order from high street shops with 0% platform markup (2.9% + 30p est. Stripe fee only), supporting independent merchants and local zero-emission delivery couriers.
  - Real-Time Severe Weather Warning System: Live meteorological alerts, severe weather warnings (storm, flooding, high winds, snow/ice, heatwaves), hyper-local community impact badges, school closure alerts, and safety advisories protecting lives and property.
  - Live Traffic, Roadworks & Travel Notifications: Real-time road status, traffic delay tracking, highway incident alerts, planned roadworks & detours, public transport & ferry disruptions, keeping daily commuters and drivers informed before they set off.
  - Emergency Preparedness Plans & Muster Protocols: Local emergency readiness, emergency muster points, vulnerable resident assistance, offline-resilient crisis response, and civil protection coordination.
  - Emergency Broadcast System: Localized and multi-hub real-time dispatches with cryptographic audit trails and verified sender validation.
  - Threat Matrix & Incident Severity: Proactive threat monitoring, matrix scoring, environmental/civil alert tiers, and rapid-response situational awareness.
  - Regional Governance & Multi-Hub Operations: Tier-1 regional command, cross-community alerting, emergency multi-hub coordination, and county/park authority oversight.
  - Neighborhood Safety & Police Liaison Network: Direct communication with dedicated Police Liaison Officers, crime prevention bulletins, neighborhood watch alerts, and community safety updates.
  - Local Courier & Rapid Community Delivery Network: Hyper-local courier delivery matching residents with local couriers for same-day local store deliveries, click & collect, and community drop-offs.
  - Civic Petitions, Citizen Polls & Grassroots Democracy: Active petitions, community polls, participatory budgeting, and transparent consultation channels giving every resident a direct voice in local governance.
  - Lost & Found Pet & Property Network: Real-time broadcast network with photo identification to quickly reunite families with lost pets, keys, and valuable belongings.
  - Community Leadership & Civic Stewardship: Empowering local champions to run hubs, manage moderation, and foster strong neighborhood bonds.
  - Forum, Events, Festivals & Tourism: Authentic local discussions, community calendars, grassroots reporting, verified local journalism, and stay-local tourism.

  Commercial Model & Positioning Guidelines:
  - When targeting Community Leaders, Gala Committees & Treasurers: Emphasize zero-equipment cost (works on any phone/tablet), 0% platform fee on donations/events, immediate Stripe destination payouts, transparent audit ledgers, and the 70% recurring revenue share from business listings that directly funds parish and council projects.
  - When targeting Local Businesses & Merchants: Emphasize local wealth retention — unlike corporate social networks where 100% of ad spend vanishes, £14 of every £20 monthly listing goes directly into their own town's civic fund, improving footfall and funding community improvements.
  - When targeting Couriers & Delivery Partners: Emphasize the 40% share of storefront subscriptions and delivery earnings with 0% platform markup on checkout delivery fees.

  Requirements for Generated Content:
  1. A catchy, high-impact headline.
  2. A detailed body text (around 2-3 paragraphs) formatted in clean HTML using <p>, <strong>, and <ul>/<li> tags. Emphasize real-world benefits for the target audience.
  3. A short, snappy social media post with 2-4 strategic hashtags (e.g., #CommunityHub, #LocalPulse, #CommunitySafety).`,
});


const generateMarketingCopyFlow = ai.defineFlow(
  {
    name: 'generateMarketingCopyFlow',
    inputSchema: GenerateMarketingCopyInputSchema,
    outputSchema: GenerateMarketingCopyOutputSchema,
  },
  async input => {
    const { output, error } = await prompt(input);
    if (error) {
        throw new Error(`AI model failed to generate content: ${error.message}`);
    }
    if (!output) {
        throw new Error("The AI model did not return any output. Please try again.");
    }
    return output;
  }
);
