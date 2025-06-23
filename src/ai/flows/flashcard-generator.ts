
'use server';
/**
 * @fileOverview An AI flow for generating flashcards from various sources.
 *
 * - generateFlashcards - A function that handles the flashcard generation process.
 * - FlashcardGeneratorInput - The input type for the generateFlashcards function.
 * - Flashcard - The type for a single flashcard object.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { YoutubeTranscript } from 'youtube-transcript';

// Define the schema for a single flashcard
const FlashcardSchema = z.object({
  front: z.string().describe('The front of the flashcard, which should be a question or a key term.'),
  back: z.string().describe('The back of the flashcard, which should be the answer or the definition.'),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

// Define the input schema for the flow
const FlashcardGeneratorInputSchema = z.object({
  inputType: z.enum(['text', 'pdf', 'youtube']),
  content: z.string().describe("The source content. This can be raw text, a Data URI for a PDF (e.g., 'data:application/pdf;base64,...'), or a YouTube video URL."),
  topic: z.string().optional().describe('An optional topic to provide context for the flashcard generation.'),
  numFlashcards: z.number().optional().default(10).describe('The desired number of flashcards to generate.'),
});
export type FlashcardGeneratorInput = z.infer<typeof FlashcardGeneratorInputSchema>;

// Define the output schema for the flow, now with an optional error field
const FlashcardGeneratorOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema),
  error: z.string().optional(),
});
export type FlashcardGeneratorOutput = z.infer<typeof FlashcardGeneratorOutputSchema>;


// Main exported function that students will call from the frontend
export async function generateFlashcards(input: FlashcardGeneratorInput): Promise<FlashcardGeneratorOutput> {
  return generateFlashcardsFlow(input);
}


const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: FlashcardGeneratorInputSchema,
    outputSchema: FlashcardGeneratorOutputSchema,
  },
  async (input): Promise<FlashcardGeneratorOutput> => {
    let sourceContentForPrompt: z.Part;
    let contentType = 'text';

    if (input.inputType === 'text') {
      sourceContentForPrompt = { text: input.content };
      contentType = 'text';
    } else if (input.inputType === 'pdf') {
        sourceContentForPrompt = { media: { url: input.content } };
        contentType = 'PDF document';
    } else if (input.inputType === 'youtube') {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(input.content);
        const transcriptText = transcript.map(t => t.text).join(' ');
        if (!transcriptText.trim()) {
            return { flashcards: [], error: "The YouTube video transcript is empty or could not be processed." };
        }
        sourceContentForPrompt = { text: transcriptText };
        contentType = 'YouTube video transcript';
      } catch (error: any) {
         console.error("YouTube Transcript Error:", error);
         if (error.message?.includes("disabled transcript")) {
             return { flashcards: [], error: "Could not fetch transcript. The owner has disabled it for this video." };
         }
         return { flashcards: [], error: "Could not fetch transcript for the provided YouTube video. It might not have captions available." };
      }
    } else {
        // This case should be caught by Zod, but as a safeguard:
        return { flashcards: [], error: "Invalid input type provided." };
    }
    
    const promptInstructions = [
        `You are an expert educator, skilled at creating concise and effective learning materials. Your task is to generate up to ${input.numFlashcards} flashcards based on the provided content.`,
        `The content is from a ${contentType}.`,
        input.topic ? `The specific topic to focus on is: ${input.topic}.` : '',
        'For each flashcard, create a "front" with a clear question or key term, and a "back" with a concise answer or definition.',
        'Here is the source content:'
    ].filter(Boolean).join('\n\n');

    const { output } = await ai.generate({
        prompt: [
            { text: promptInstructions },
            sourceContentForPrompt
        ],
        output: { schema: z.object({ flashcards: z.array(FlashcardSchema) }) },
        model: 'googleai/gemini-2.0-flash'
    });
    
    if (!output?.flashcards || output.flashcards.length === 0) {
        return { flashcards: [], error: "The AI failed to generate flashcards from the provided content. Please try again with different content or be more specific with your topic." };
    }

    return { flashcards: output.flashcards };
  }
);
