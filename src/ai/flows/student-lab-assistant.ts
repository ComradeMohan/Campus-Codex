
'use server';
/**
 * @fileOverview Provides AI-powered assistance for students in coding labs.
 *
 * - studentLabAssistantFlow - A function that helps students with their coding doubts.
 * - StudentLabAssistantInput - The input type for the flow.
 * - StudentLabAssistantOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StudentLabAssistantInputSchema = z.object({
  currentLanguage: z.string().describe('The programming language the student is working with (e.g., Python, JavaScript).'),
  currentQuestionText: z.string().optional().describe('The text of the programming question or problem statement the student is trying to solve.'),
  currentCodeSnippet: z.string().optional().describe('The current code snippet the student has written so far.'),
  studentDoubt: z.string().describe('The specific question or doubt the student has.'),
});
export type StudentLabAssistantInput = z.infer<typeof StudentLabAssistantInputSchema>;

const StudentLabAssistantOutputSchema = z.object({
  aiResponse: z.string().describe('The AI-generated answer or guidance for the student. If providing pseudocode, it should be formatted as a code block using triple backticks (```pseudocode ... ```).'),
});
export type StudentLabAssistantOutput = z.infer<typeof StudentLabAssistantOutputSchema>;

export async function studentLabAssistant(input: StudentLabAssistantInput): Promise<StudentLabAssistantOutput> {
  return studentLabAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'studentLabAssistantPrompt',
  input: {schema: StudentLabAssistantInputSchema},
  output: {schema: StudentLabAssistantOutputSchema},
  prompt: `You are a friendly and encouraging AI Programming Tutor. Your role is to help a student overcome their coding challenges.
The student is working in {{currentLanguage}}.

{{#if currentQuestionText}}
They are working on the following problem:
Problem:
\`\`\`
{{{currentQuestionText}}}
\`\`\`
{{/if}}

{{#if currentCodeSnippet}}
Here is the code they have written so far:
Code:
\`\`\`{{currentLanguage}}
{{{currentCodeSnippet}}}
\`\`\`
{{/if}}

The student's specific doubt or question is: "{{{studentDoubt}}}"

Your tasks:
1. Understand the student's doubt in the context of the problem and their current code (if provided).
2. Provide a clear, concise, and helpful explanation or guidance.
3. If the student asks for how to do something, guide them towards the solution rather than giving the full code directly, unless they are asking for a specific syntax example or a small correction.
4. If their code has an obvious error related to their doubt, gently point it out and explain why it's an error and how to think about fixing it.
5. If you provide pseudocode, ensure it is formatted as a code block using triple backticks. For example:
\`\`\`pseudocode
function example(param):
  if param is true:
    print "Hello"
  else:
    print "World"
\`\`\`
6. Be encouraging and supportive.
7. Keep your response focused on the student's specific doubt.

AI Response:`,
});

const studentLabAssistantFlow = ai.defineFlow(
  {
    name: 'studentLabAssistantFlow',
    inputSchema: StudentLabAssistantInputSchema,
    outputSchema: StudentLabAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

