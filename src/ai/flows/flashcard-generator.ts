
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

// Define the output schema for the flow
const FlashcardGeneratorOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema),
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
  async (input) => {
    let sourceContent: string | z.Part = '';
    let contentType = 'text';

    if (input.inputType === 'text') {
      sourceContent = input.content;
      contentType = 'text';
    } else if (input.inputType === 'pdf') {
        sourceContent = { media: { url: input.content } };
        contentType = 'PDF document';
    } else if (input.inputType === 'youtube') {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(input.content);
        sourceContent = transcript.map(t => t.text).join(' ');
        contentType = 'YouTube video transcript';
      } catch (error) {
         console.error("YouTube Transcript Error:", error);
         throw new Error("Could not fetch transcript for the provided YouTube video. It might not have captions available.");
      }
    }
    
    const { output } = await ai.generate({
        prompt: `You are an expert educator, skilled at creating concise and effective learning materials. Your task is to generate ${input.numFlashcards} flashcards based on the provided content.

        The content is from a ${contentType}.
        ${input.topic ? `The specific topic to focus on is: ${input.topic}.` : ''}

        For each flashcard, create a "front" with a clear question or key term, and a "back" with a concise answer or definition.

        Here is the source content:
        ${input.inputType === 'pdf' ? '{{media url=sourceContent}}' : '{{{sourceContent}}}'}
        `,
        input: { sourceContent },
        output: { schema: FlashcardGeneratorOutputSchema },
        model: 'googleai/gemini-2.0-flash'
    });
    
    return output!;
  }
);
