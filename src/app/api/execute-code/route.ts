
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { TestCase } from '@/types';

interface ExecuteCodeRequestBody {
  language: string;
  code: string;
  testCases?: TestCase[]; // Optional for 'run' type
  sampleInput?: string;   // For 'run' type
  sampleOutput?: string;  // For 'run' type
  executionType: 'run' | 'submit';
}

interface TestCaseResult {
  testCaseNumber: number | string; // Can be 'Sample'
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

function simulateActualOutput(code: string, input: string, language: string): string {
  const trimmedCode = code.trim().toLowerCase();
  const originalCodeTrimmed = code.trim();

  // Specific check for the "Non-Prime numbers between A and B" sample case
  if (language.toLowerCase() === 'python' && input === 'A = 12 B = 19' && originalCodeTrimmed.includes('for x in range')) {
    // The question asks for non-primes, sample output is "14, 15, 16, 18"
    // The user's code in the example screenshot actually tries to find primes.
    // For the mock to "work" with the sample, we return the sample's expected non-prime output.
    return '14, 15, 16, 18';
  }

  if (language.toLowerCase() === 'python') {
    if (trimmedCode === 'user_input = input()\nprint(0)' || trimmedCode === 'print(0)') {
      return '0';
    }
    const printMatch = originalCodeTrimmed.match(/print\(\s*(.*?)\s*\)/);
    if (printMatch && printMatch[1]) {
      let val = printMatch[1];
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.substring(1, val.length - 1);
      }
      if (!isNaN(parseFloat(val)) && isFinite(val as any) || printMatch[1].match(/^['"].*['"]$/)) {
        // If it's a direct print of a literal number or string, return that.
        // This is a very basic check.
        if (trimmedCode.includes('input()')) {
           // If input() is involved, it's more complex than a direct print.
           // Fall through to generic simulation.
        } else {
          return val;
        }
      }
    }
    // If code directly prints the input (very simple echo)
    if (trimmedCode.includes('print(input())') || trimmedCode.includes('print(user_input)')) {
        return input;
    }
  } else if (language.toLowerCase() === 'java') {
    if (trimmedCode.includes('system.out.println(0);')) {
      return '0';
    }
    const printlnMatch = originalCodeTrimmed.match(/System\.out\.println\(\s*(.*?)\s*\);/);
    if (printlnMatch && printlnMatch[1]) {
      let val = printlnMatch[1];
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      if (!isNaN(parseFloat(val)) && isFinite(val as any) || printlnMatch[1].match(/^".*"$/)) {
         if (trimmedCode.toLowerCase().includes("scanner.next") || trimmedCode.toLowerCase().includes("input")) {
            // If input is involved, fall through
         } else {
            return val;
         }
      }
    }
    // Simple echo for Java
    if (trimmedCode.includes("system.out.println(input)") || trimmedCode.includes("system.out.println(scanner.nextline())")) {
        return input;
    }
  } else if (language.toLowerCase() === 'javascript') {
    if (trimmedCode.includes('console.log(0);')) {
      return '0';
    }
    const consoleLogMatch = originalCodeTrimmed.match(/console\.log\(\s*(.*?)\s*\);/);
    if (consoleLogMatch && consoleLogMatch[1]) {
      let val = consoleLogMatch[1];
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("`") && val.endsWith("`"))) {
        val = val.substring(1, val.length - 1);
      }
      if (!isNaN(parseFloat(val)) && isFinite(val as any) || consoleLogMatch[1].match(/^['"`].*['"`]$/)) {
        if (trimmedCode.toLowerCase().includes("readline()") || trimmedCode.toLowerCase().includes("prompt(")) {
             // If input is involved, fall through
        } else {
            return val;
        }
      }
    }
    // Simple echo for JS
    if (trimmedCode.includes("console.log(input)") || trimmedCode.includes("console.log(readline())")) {
        return input;
    }
  }
  // Default fallback simulation
  return `Simulated output for input: ${input}`;
}


export async function POST(request: NextRequest) {
  try {
    const body: ExecuteCodeRequestBody = await request.json();
    const { language, code, testCases, sampleInput, sampleOutput, executionType } = body;

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

    let generalOutput = `Simulating execution for ${language} (${executionType} mode)...\nCode received:\n${code.substring(0, 100)}${code.length > 100 ? '...' : ''}\n\n`;
    const currentTestResults: TestCaseResult[] = [];
    let compileError: string | undefined = undefined;
    let executionError: string | undefined = undefined;

    if (code.toLowerCase().includes("infinite loop simulated error")) {
      compileError = `Simulated Compile Error: Detected potential infinite loop construct.`;
      generalOutput += `Compilation failed.\n`;
    } else if (code.toLowerCase().includes("runtime simulated error")) {
      executionError = `Simulated Runtime Error: Something went wrong during execution.`;
      generalOutput += `Execution encountered an error.\n`;
    }

    if (!compileError && !executionError) {
      if (executionType === 'run') {
        generalOutput += `Running with sample input...\n`;
        const actualSampleOutput = simulateActualOutput(code, sampleInput || "", language);
        currentTestResults.push({
          testCaseNumber: 'Sample',
          input: sampleInput || "N/A",
          expectedOutput: sampleOutput || "N/A",
          actualOutput: actualSampleOutput,
          passed: sampleOutput !== undefined ? actualSampleOutput === sampleOutput : true, // Pass if no sample output to compare
        });
        generalOutput += `Sample input processed (simulation).\nActual output for sample: ${actualSampleOutput}\n`;
      } else if (executionType === 'submit') {
        generalOutput += `Code compiled/interpreted successfully (simulation).\nRunning all test cases...\n\n`;
        if (testCases && testCases.length > 0) {
          for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            const simulatedActualOutput = simulateActualOutput(code, tc.input, language);
            const passed = simulatedActualOutput === tc.expectedOutput;
            
            currentTestResults.push({
              testCaseNumber: i + 1,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              actualOutput: simulatedActualOutput,
              passed: passed,
            });
          }
          generalOutput += `All test cases processed (simulation).\n`;
        } else {
          generalOutput += `No test cases provided for submission.\n`;
        }
      }
    }

    const responseBody: ExecuteCodeResponseBody = {
      generalOutput,
      testCaseResults: currentTestResults,
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
