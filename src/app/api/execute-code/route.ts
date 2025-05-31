
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
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

    let generalOutput = `Simulating execution for ${language}...\nCode received:\n${code.substring(0, 200)}${code.length > 200 ? '...' : ''}\n\n`;
    const testCaseResults: TestCaseResult[] = [];
    let compileError: string | undefined = undefined;
    let executionError: string | undefined = undefined;

    // Simulate a compile error for certain keywords
    if (code.toLowerCase().includes("infinite loop simulated error")) {
      compileError = `Simulated Compile Error: Detected potential infinite loop construct.`;
      generalOutput += `Compilation failed.\n`;
    } else if (code.toLowerCase().includes("runtime simulated error")) {
      executionError = `Simulated Runtime Error: Something went wrong during execution.`;
      generalOutput += `Execution encountered an error.\n`;
    }


    if (!compileError && !executionError) {
      generalOutput += `Code compiled/interpreted successfully (simulation).\nRunning test cases...\n\n`;
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        let simulatedActualOutput = `Simulated output for input: ${tc.input}`; // Default

        // --- Start of more specific simulation logic ---
        const trimmedCode = code.trim().toLowerCase();
        const originalCodeTrimmed = code.trim();

        if (language.toLowerCase() === 'python') {
          if (trimmedCode === 'user_input = input()\nprint(0)' || trimmedCode === 'print(0)') {
            simulatedActualOutput = '0';
          } else {
            const printMatch = originalCodeTrimmed.match(/print\(\s*(.*?)\s*\)/);
            if (printMatch && printMatch[1]) {
              let val = printMatch[1];
              if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
                val = val.substring(1, val.length - 1);
              }
              // Check if val is a number string or a simple quoted string
              if (!isNaN(parseFloat(val)) && isFinite(val as any) || printMatch[1].match(/^['"].*['"]$/) ) {
                 simulatedActualOutput = val;
              }
            } else if (trimmedCode.includes(tc.input.toLowerCase()) && trimmedCode.includes(tc.expectedOutput.toLowerCase())) {
               simulatedActualOutput = tc.expectedOutput;
            }
          }
        } else if (language.toLowerCase() === 'java') {
          if (trimmedCode.includes('system.out.println(0);')) {
            simulatedActualOutput = '0';
          } else {
            const printlnMatch = originalCodeTrimmed.match(/System\.out\.println\(\s*(.*?)\s*\);/);
            if (printlnMatch && printlnMatch[1]) {
                let val = printlnMatch[1];
                if (val.startsWith('"') && val.endsWith('"')) {
                  val = val.substring(1, val.length-1);
                }
                 if (!isNaN(parseFloat(val)) && isFinite(val as any) || printlnMatch[1].match(/^".*"$/) ) {
                    simulatedActualOutput = val;
                }
            }
          }
        } else if (language.toLowerCase() === 'javascript') {
           if (trimmedCode.includes('console.log(0);')) {
            simulatedActualOutput = '0';
          } else {
            const consoleLogMatch = originalCodeTrimmed.match(/console\.log\(\s*(.*?)\s*\);/);
             if (consoleLogMatch && consoleLogMatch[1]) {
                let val = consoleLogMatch[1];
                if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("`") && val.endsWith("`"))) {
                  val = val.substring(1, val.length-1);
                }
                if (!isNaN(parseFloat(val)) && isFinite(val as any) || consoleLogMatch[1].match(/^['"`].*['"`]$/) ) {
                    simulatedActualOutput = val;
                }
            }
          }
        }
        // --- End of more specific simulation logic ---

        const passed = simulatedActualOutput === tc.expectedOutput;
        
        testCaseResults.push({
          testCaseNumber: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: simulatedActualOutput,
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
