
import { config } from 'dotenv';
config();

import '@/ai/flows/code-completion.ts';
import '@/ai/flows/student-lab-assistant.ts'; // Added import for the new flow
