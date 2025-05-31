'use server';

/**
 * @fileOverview Provides AI-powered code completion suggestions.
 *
 * - codeCompletion - A function that suggests code completions based on the given context.
 * - CodeCompletionInput - The input type for the codeCompletion function.
 * - CodeCompletionOutput - The return type for the codeCompletion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CodeCompletionInputSchema = z.object({
  language: z.string().describe('The programming language.'),
  codeSnippet: z.string().describe('The current code snippet the user is writing.'),
  context: z.string().optional().describe('Additional context about the code, such as the function name or purpose.'),
});
export type CodeCompletionInput = z.infer<typeof CodeCompletionInputSchema>;

const CodeCompletionOutputSchema = z.object({
  completion: z.string().describe('The AI-suggested code completion.'),
});
export type CodeCompletionOutput = z.infer<typeof CodeCompletionOutputSchema>;

export async function codeCompletion(input: CodeCompletionInput): Promise<CodeCompletionOutput> {
  return codeCompletionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'codeCompletionPrompt',
  input: {schema: CodeCompletionInputSchema},
  output: {schema: CodeCompletionOutputSchema},
  prompt: `You are an AI code completion assistant. You will suggest the most likely code to complete the user's code snippet, given the language and context.

Language: {{{language}}}
Code Snippet: {{{codeSnippet}}}
Context: {{{context}}}

Completion:`, // IMPORTANT: No function calls, NO Asynchronous Operations
});

const codeCompletionFlow = ai.defineFlow(
  {
    name: 'codeCompletionFlow',
    inputSchema: CodeCompletionInputSchema,
    outputSchema: CodeCompletionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
