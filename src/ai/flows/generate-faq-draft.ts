'use server';
/**
 * @fileOverview Generates FAQ drafts from raw text/document copy.
 */

import { z } from 'genkit';

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

export async function generateFaqDraft(input: GenerateFaqDraftInput): Promise<GenerateFaqDraftOutput> {
  const { genkit } = await import('genkit');
  const { googleAI } = await import('@genkit-ai/google-genai');
  
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const ai = genkit({
    plugins: [
      googleAI({ apiKey: geminiApiKey }),
    ],
    model: 'googleai/gemini-1.5-flash-latest',
  });

  const response = await ai.generate({
    prompt: `You are an expert public relations officer for a local city/town council.
    
    Your job is to read the raw announcements, council newsletters, or guidelines provided below, and extract a structured list of Frequently Asked Questions (FAQs) that local residents would likely ask, along with clear and helpful answers.
    
    Make sure:
    - The questions are clear and phrased from a resident's perspective (e.g. "When is the next garden waste bin collection?").
    - The answers are concise, accurate, and completely factual according to the provided text.
    - If no clear FAQs can be made, or if the text is too sparse, try to synthesize 2-3 logical Q&As based on what's there.
    
    Raw Copy:
    """
    ${input.rawText}
    """`,
    output: {
      schema: GenerateFaqDraftOutputSchema,
    },
  });

  if (!response.output) {
    throw new Error("The AI model did not return any output. Please try again.");
  }
  return response.output;
}
