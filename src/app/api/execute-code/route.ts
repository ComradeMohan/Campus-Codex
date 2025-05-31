
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { TestCase } from '@/types';

interface ExecuteCodeRequestBody {
  language: string;
  code: string;
  testCases: TestCase[];
}

interface TestCaseResult {
  testCaseNumber: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
}

interface ExecuteCodeResponseBody {
  generalOutput: string;
  testCaseResults: TestCaseResult[];
  executionError?: string;
  compileError?: string;
}

// IMPORTANT: This is a MOCK API route. It does NOT actually execute code.
// In a real application, this route would securely send the code and test cases
// to a dedicated backend service with a sandboxed execution environment for each language.

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteCodeRequestBody = await request.json();
    const { language, code, testCases } = body;

    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // --- SIMULATION LOGIC ---
    let generalOutput = `Simulating execution for ${language}...\nCode received:\n${code.substring(0, 100)}${code.length > 100 ? '...' : ''}\n\n`;
    const testCaseResults: TestCaseResult[] = [];
    let compileError: string | undefined = undefined;
    let executionError: string | undefined = undefined;

    // Simulate a compile error for certain keywords
    if (code.toLowerCase().includes("infinite loop error please")) {
      compileError = `Simulated Compile Error: Detected potential infinite loop construct.`;
      generalOutput += `Compilation failed.\n`;
    } else if (code.toLowerCase().includes("runtime error please")) {
      executionError = `Simulated Runtime Error: Something went wrong during execution.`;
      generalOutput += `Execution encountered an error.\n`;
    }


    if (!compileError && !executionError) {
      generalOutput += `Code compiled/interpreted successfully (simulation).\nRunning test cases...\n\n`;
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        // Simulate generating actual output based on code (very basic simulation)
        let simulatedActualOutput = `Simulated output for input: ${tc.input}`;
        if (language.toLowerCase() === 'python' && code.includes('print')) {
            // Try to find a print statement (very naive)
            const printMatch = code.match(/print\((.*)\)/);
            if (printMatch && printMatch[1]) {
                let evalContent = printMatch[1].replace(/['"`]/g, ''); // remove quotes
                if (evalContent.toLowerCase() === tc.input.toLowerCase() || code.includes(tc.input)) {
                     simulatedActualOutput = tc.expectedOutput; // if input is directly printed
                } else if (code.includes("hello")) {
                    simulatedActualOutput = "hello world"; // Generic if "hello" is in code
                }
            }
        } else if (code.toLowerCase().includes(tc.input.toLowerCase())) {
             // If the code explicitly contains the input, assume it might output the expected output
             if (code.toLowerCase().includes(tc.expectedOutput.toLowerCase())) {
                simulatedActualOutput = tc.expectedOutput;
             }
        }


        const passed = simulatedActualOutput === tc.expectedOutput && Math.random() > 0.2; // 80% chance of passing if output matches (simulated)
        
        testCaseResults.push({
          testCaseNumber: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: passed ? tc.expectedOutput : simulatedActualOutput + (Math.random() > 0.7 ? " (slightly different)" : ""),
          passed: passed,
        });
      }
      generalOutput += `All test cases processed (simulation).\n`;
    }
    // --- END SIMULATION LOGIC ---

    const responseBody: ExecuteCodeResponseBody = {
      generalOutput,
      testCaseResults,
      compileError,
      executionError,
    };

    return NextResponse.json(responseBody, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/execute-code] Error:', error);
    return NextResponse.json(
      { 
        executionError: 'Server error while trying to simulate code execution.',
        generalOutput: 'An unexpected error occurred on the server.',
        testCaseResults: []
      }, 
      { status: 500 }
    );
  }
}
