import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const geminiApiKey = process.env.GOOGLE_GENAI_API_KEY ||
                     process.env.GEMINI_API_KEY ||
                     process.env.GOOGLE_API_KEY ||
                     process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
                     '';

export const ai = genkit({
  plugins: [
    // Pass the API key directly to the plugin configuration.
    googleAI({ apiKey: geminiApiKey || undefined }),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
