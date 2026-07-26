'use server';
/**
 * @fileOverview Generates FAQ drafts from raw text/document copy.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFaqDraftInputSchema = z.object({
  rawText: z.string().describe('The raw text, council notices, or newsletter to extract FAQs from.'),
});

export type GenerateFaqDraftInput = z.infer<typeof GenerateFaqDraftInputSchema>;

const FaqDraftItemSchema = z.object({
  question: z.string().describe('A clear, concise, and helpful question representing a common resident query.'),
  answer: z.string().describe('A detailed, friendly, and factual answer based strictly on the raw text provided.'),
});

const GenerateFaqDraftOutputSchema = z.object({
  faqs: z.array(FaqDraftItemSchema).describe('An array of generated Q&As.'),
});

export type GenerateFaqDraftOutput = z.infer<typeof GenerateFaqDraftOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateFaqDraftPrompt',
  input: {schema: GenerateFaqDraftInputSchema},
  output: {schema: GenerateFaqDraftOutputSchema},
  prompt: `You are an expert public relations officer for a local city/town council.
  
  Your job is to read the raw announcements, council newsletters, or guidelines provided below, and extract a structured list of Frequently Asked Questions (FAQs) that local residents would likely ask, along with clear and helpful answers.
  
  Make sure:
  - The questions are clear and phrased from a resident's perspective (e.g. "When is the next garden waste bin collection?").
  - The answers are concise, accurate, and completely factual according to the provided text.
  - If no clear FAQs can be made, or if the text is too sparse, try to synthesize 2-3 logical Q&As based on what's there.
  
  Raw Copy:
  """
  {{{rawText}}}
  """`,
});

const generateFaqDraftFlow = ai.defineFlow(
  {
    name: 'generateFaqDraftFlow',
    inputSchema: GenerateFaqDraftInputSchema,
    outputSchema: GenerateFaqDraftOutputSchema,
  },
  async input => {
    const { output, error } = await prompt(input);
    if (error) {
        throw new Error(`AI model failed to generate FAQs: ${error.message}`);
    }
    if (!output) {
        throw new Error("The AI model did not return any output. Please try again.");
    }
    return output;
  }
);

export async function generateFaqDraft(input: GenerateFaqDraftInput): Promise<GenerateFaqDraftOutput> {
    return generateFaqDraftFlow(input);
}
