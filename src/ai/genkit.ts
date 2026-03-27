
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Explicitly pass the API key from the environment variables
// This makes the dependency on the GEMINI_API_KEY clear and can resolve
// issues where the environment variable isn't automatically detected.
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  // This log helps debug setup issues.
  console.log("AI SYSTEM-WIDE WARNING: GEMINI_API_KEY environment variable not found. AI features will fail.");
}

export const ai = genkit({
  plugins: [
    // Pass the API key directly to the plugin configuration.
    googleAI({ apiKey: geminiApiKey }),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
