
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
  prompt: `You are a creative marketing expert for a community platform called "Community Hub". 
  
  Generate compelling marketing materials tailored to the specified audience and feature.
  
  Target Audience: {{{audience}}}
  Feature Focus: {{{feature}}}
  
  Your response should include:
  1.  A catchy, concise headline.
  2.  A detailed body text (around 2-3 paragraphs) formatted in simple HTML. Use <p> tags for paragraphs and <strong> for emphasis on key benefits.
  3.  A short, snappy social media post (max 280 characters) including 2-3 relevant hashtags (e.g., #CommunityHub, #LocalFirst).`,
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
