import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {config} from 'dotenv';

// Ensure dotenv config is called to load environment variables
config();

// Default to Gemini 2.0 Flash if no specific model is provided in environment
const geminiModelName = process.env.GEMINI_MODEL || 'googleai/gemini-2.0-flash';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY, // Use the API key from .env
      // You can specify other Google AI plugin options here if needed
      // For example, default generation config:
      // generationConfig: { temperature: 0.7 }
    }),
  ],
  model: geminiModelName, // Default model for ai.generate unless overridden
  // Other Genkit global configurations can go here
  // Example: default flow state store, trace store, etc.
  // flowStateStore: ...,
  // traceStore: ...,
});
