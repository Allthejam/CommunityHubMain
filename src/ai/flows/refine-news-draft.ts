'use server';
/**
 * @fileOverview Refines news drafts for volunteer reporters.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineNewsDraftInputSchema = z.object({
  draftText: z.string().describe('The rough draft text of the article.'),
});

export type RefineNewsDraftInput = z.infer<typeof RefineNewsDraftInputSchema>;

const RefineNewsDraftOutputSchema = z.object({
  refinedBody: z.string().describe('The polished, grammar-corrected, and professional version of the article body.'),
  headlines: z.array(z.string()).describe('An array of 3 catchy and engaging headlines for the article.'),
  summary: z.string().describe('A single-sentence summary of the article suitable for a feed preview.'),
});

export type RefineNewsDraftOutput = z.infer<typeof RefineNewsDraftOutputSchema>;

const prompt = ai.definePrompt({
  name: 'refineNewsDraftPrompt',
  input: {schema: RefineNewsDraftInputSchema},
  output: {schema: RefineNewsDraftOutputSchema},
  prompt: `You are an expert editor for a community newspaper/hub.
  
  Your job is to take a rough draft written by a volunteer community reporter and refine it to make it read professionally and clearly, while preserving all the key details, names, locations, and facts.
  
  Volunteer Draft:
  """
  {{{draftText}}}
  """
  
  Provide the following:
  1. A polished, refined version of the body. Improve the flow, grammar, and professionalism, but keep it authentic to a local community news tone.
  2. Exactly 3 suggested catchy headlines.
  3. A concise, single-sentence summary of the article suitable for a preview.`,
});

const refineNewsDraftFlow = ai.defineFlow(
  {
    name: 'refineNewsDraftFlow',
    inputSchema: RefineNewsDraftInputSchema,
    outputSchema: RefineNewsDraftOutputSchema,
  },
  async input => {
    const { output, error } = await prompt(input);
    if (error) {
        throw new Error(`AI model failed to refine draft: ${error.message}`);
    }
    if (!output) {
        throw new Error("The AI model did not return any output. Please try again.");
    }
    return output;
  }
);

export async function refineNewsDraft(input: RefineNewsDraftInput): Promise<RefineNewsDraftOutput> {
    return refineNewsDraftFlow(input);
}
