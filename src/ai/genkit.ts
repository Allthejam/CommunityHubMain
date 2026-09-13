import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const DEFAULT_GEMINI_KEY = 'AIzaSyDzbik9uEALmhNwtiY9JKzrP9lcdN1KD1s';

const geminiApiKey = process.env.GOOGLE_GENAI_API_KEY ||
                     process.env.GEMINI_API_KEY ||
                     process.env.GOOGLE_API_KEY ||
                     process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
                     DEFAULT_GEMINI_KEY;

export const ai = genkit({
  plugins: [
    // Pass the API key directly to the plugin configuration.
    googleAI({ apiKey: geminiApiKey }),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
