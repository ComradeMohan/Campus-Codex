
'use server';
/**
 * @fileOverview An AI flow for moderating chat messages in student groups.
 *
 * - moderateChatMessage - A function that analyzes a message for its relevance and appropriateness.
 * - ChatMessageModerationInput - The input type for the function.
 * - ChatMessageModerationOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the input schema for the flow
const ChatMessageModerationInputSchema = z.object({
  messageText: z.string().describe("The content of the chat message to be analyzed."),
  chatTopic: z.string().describe("The stated topic or name of the chat group, used as context for relevance."),
});
export type ChatMessageModerationInput = z.infer<typeof ChatMessageModerationInputSchema>;

// Define the output schema for the flow
const ChatMessageModerationOutputSchema = z.object({
  isOffTopic: z.boolean().describe("True if the message is off-topic from the chat's purpose."),
  isViolation: z.boolean().describe("True if the message violates student conduct (e.g., spam, harassment, inappropriate content)."),
  reason: z.string().describe("A brief explanation for why the message was flagged as off-topic or a violation."),
});
export type ChatMessageModerationOutput = z.infer<typeof ChatMessageModerationOutputSchema>;

// Main exported function that a backend process would call
export async function moderateChatMessage(input: ChatMessageModerationInput): Promise<ChatMessageModerationOutput> {
  return chatModeratorFlow(input);
}

const moderationPrompt = ai.definePrompt({
  name: 'chatModeratorPrompt',
  input: { schema: ChatMessageModerationInputSchema },
  output: { schema: ChatMessageModerationOutputSchema },
  prompt: `You are an AI chat moderator for a student study platform. Your task is to ensure conversations stay on topic and are appropriate.

The topic of this chat group is: "{{chatTopic}}"

Analyze the following message and determine if it is off-topic OR a violation of student conduct (such as spam, harassment, bullying, or sharing inappropriate content).

Message: "{{messageText}}"

Based on your analysis, provide a structured response.
- If the message is unrelated to "{{chatTopic}}", set isOffTopic to true.
- If the message is a clear violation of conduct, set isViolation to true.
- A message can be both a violation and off-topic.
- Provide a brief, neutral reason for your decision. If it's not off-topic or a violation, the reason can be "Message is on-topic and appropriate."`,
});


const chatModeratorFlow = ai.defineFlow(
  {
    name: 'chatModeratorFlow',
    inputSchema: ChatMessageModerationInputSchema,
    outputSchema: ChatMessageModerationOutputSchema,
  },
  async (input) => {
    const { output } = await moderationPrompt(input);
    return output!;
  }
);
