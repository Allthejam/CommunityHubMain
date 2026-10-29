
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
  - Real-Time Severe Weather Warning System: Live meteorological alerts, severe weather warnings (storm, flooding, high winds, snow/ice, heatwaves), hyper-local community impact badges, school closure alerts, and safety advisories protecting lives and property.
  - Live Traffic, Roadworks & Travel Notifications: Real-time road status, traffic delay tracking, highway incident alerts, planned roadworks & detours, public transport & ferry disruptions, keeping daily commuters and drivers informed before they set off.
  - Emergency Preparedness Plans & Muster Protocols: Local emergency readiness, emergency muster points, vulnerable resident assistance, offline-resilient crisis response, and civil protection coordination.
  - Emergency Broadcast System: Localized and multi-hub real-time dispatches with cryptographic audit trails and verified sender validation.
  - Threat Matrix & Incident Severity: Proactive threat monitoring, matrix scoring, environmental/civil alert tiers, and rapid-response situational awareness.
  - Regional Governance & Multi-Hub Operations: Tier-1 regional command, cross-community alerting, emergency multi-hub coordination, and county/park authority oversight.
  - Neighborhood Safety & Police Liaison Network: Direct communication with dedicated Police Liaison Officers, crime prevention bulletins, neighborhood watch alerts, and community safety updates.
  - Local Courier & Rapid Community Delivery Network: Hyper-local courier delivery matching residents with local couriers for same-day local store deliveries, click & collect, and community drop-offs.
  - Virtual Highstreet & Local Commerce: Hyper-local shopping, business showcases, footfall regeneration, and local merchant growth.
  - Civic Petitions, Citizen Polls & Grassroots Democracy: Active petitions, community polls, participatory budgeting, and transparent consultation channels giving every resident a direct voice in local governance.
  - Lost & Found Pet & Property Network: Real-time broadcast network with photo identification to quickly reunite families with lost pets, keys, and valuable belongings.
  - Community Leadership & Civic Stewardship: Empowering local champions to run hubs, manage moderation, and foster strong neighborhood bonds.
  - Forum, Events, Festivals & Tourism: Authentic local discussions, community calendars, grassroots reporting, verified local journalism, and stay-local tourism.

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
