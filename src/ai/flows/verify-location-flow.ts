'use server';
/**
 * @fileOverview Verifies if a given location is plausible and not nonsensical.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyLocationInputSchema = z.object({
  country: z.string().describe('The country.'),
  state: z.string().describe('The state, province, or equivalent top-level division.'),
  region: z.string().describe('The region, county, or equivalent second-level division.'),
  community: z.string().describe('The local community, town, or city name.'),
});

const VerifyLocationOutputSchema = z.object({
    isPlausible: z.boolean().describe("Whether the described community name is plausible and not gibberish."),
    reason: z.string().describe("A brief explanation for the decision. If not plausible, explain why (e.g., 'The name appears to be random characters.')."),
});

export async function verifyLocation(input: z.infer<typeof VerifyLocationInputSchema>): Promise<z.infer<typeof VerifyLocationOutputSchema>> {
    const prompt = ai.definePrompt({
      name: 'verifyLocationPrompt',
      input: {schema: VerifyLocationInputSchema},
      output: {schema: VerifyLocationOutputSchema},
      prompt: `You are a data validation expert. Your task is to determine if a user-provided community name is plausible or if it is simply gibberish.

The name does not need to be a real, existing place, but it must sound like a plausible name for a town or neighborhood. If the country, state, and region make sense (e.g. USA > California > Los Angeles County), then you should consider the community name plausible unless it is clearly random characters or an impossible place on Earth. Do not reject a name just because it is also used in fiction (e.g., Sunnydale is a real place and also fictional).

Reject names that are:
- Random strings of characters (e.g., "xghxdfghbnxfg")
- Conceptually impossible places (e.g., "The Moon", "Atlantis", "Hogwarts")
- Offensive or profane words.

User-provided community name: "{{{community}}}"

Your response MUST be a boolean for 'isPlausible' and a brief 'reason'.

Example 1 (Plausible):
Input: { country: "USA", state: "California", region: "Los Angeles County", community: "Sunnydale" }
Output: { isPlausible: true, reason: "The name is plausible for a community within the specified region." }

Example 2 (Gibberish):
Input: { country: "any", state: "any", region: "any", community: "asdfasdfasdf" }
Output: { isPlausible: false, reason: "The name appears to be random characters." }

Example 3 (Impossible):
Input: { country: "any", state: "any", region: "any", community: "The Planet Mars" }
Output: { isPlausible: false, reason: "This is a planet, not a plausible community name on Earth." }

Now, analyze the following community name: "{{{community}}}" within the context of {{{region}}}, {{{state}}}, {{{country}}}.
`,
    });

    const verifyLocationFlow = ai.defineFlow(
      {
        name: 'verifyLocationFlow',
        inputSchema: VerifyLocationInputSchema,
        outputSchema: VerifyLocationOutputSchema,
      },
      async (flowInput) => {
        const { output, error } = await prompt(flowInput);
        if (error) {
            throw new Error(`AI model failed to generate content: ${error.message}`);
        }
        if (!output) {
            throw new Error("The AI model did not return any output. Please try again.");
        }
        return output;
      }
    );
    
    return verifyLocationFlow(input);
}
