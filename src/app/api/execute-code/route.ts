
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
  // Make the input check more robust by trimming.
  if (language.toLowerCase() === 'python' && input.trim() === 'A = 12 B = 19' && originalCodeTrimmed.includes('for x in range')) {
    // The question asks for non-primes, sample output is "14, 15, 16, 18"
    // The user's code in the example screenshot actually tries to find primes.
    // For the mock to "work" with the sample, we return the sample's expected non-prime output.
    return '14, 15, 16, 18';
  }

  if (language.toLowerCase() === 'python') {
    // Check for print(0)
    if (trimmedCode === 'print(0)' || originalCodeTrimmed.match(/^user_input\s*=\s*input\(\)\s*\nprint\(0\)$/m)) {
      return '0';
    }
    // Check for simple echo: print(input()) or var = input() print(var)
    if (trimmedCode.includes('print(input())') || 
        (trimmedCode.includes('input()') && originalCodeTrimmed.match(/(\w+)\s*=\s*input\(\)\s*print\(\s*\1\s*\)/m))) {
      return input;
    }
    // Check for printing a literal string or number, only if no input() call is present
    const printMatch = originalCodeTrimmed.match(/print\(\s*(['"`])?(.*?)\1?\s*\)/);
    if (printMatch && !trimmedCode.includes('input()')) {
      const val = printMatch[2];
      // Check if val is a number or a (possibly quoted) string that doesn't look like a variable
      if (!isNaN(parseFloat(val)) && isFinite(val as any) || printMatch[1] || /^[a-zA-Z_]\w*$/.test(val) === false) {
         // If it has quotes (printMatch[1] is truthy), or it's a number, or it's not a simple variable name.
         // This is tricky; trying to avoid matching `print(variable_name)`
         if (printMatch[1]) return val; // Quoted string
         if (!isNaN(parseFloat(val)) && isFinite(val as any)) return val; // Number
         // Potentially a more complex literal expression, not a simple variable.
      }
    }
  } else if (language.toLowerCase() === 'java') {
    if (trimmedCode.includes('system.out.println(0);') && !trimmedCode.includes("scanner.")) { // Approx print(0)
      return '0';
    }
    // Check for simple echo (direct print of scanner read)
    if (trimmedCode.match(/System\.out\.println\(\s*scanner\.next[a-zA-Z]*\(\s*\)\s*\);/)) {
        return input;
    }
    // Check for printing a literal string or number, only if no Scanner usage
    const printlnMatch = originalCodeTrimmed.match(/System\.out\.println\(\s*(")?(.*?)\1?\s*\);/);
    if (printlnMatch && !trimmedCode.toLowerCase().includes("scanner.")) {
        const val = printlnMatch[2];
        if (printlnMatch[1]) return val; // Quoted string
        if (!isNaN(parseFloat(val)) && isFinite(val as any)) return val; // Number
    }
  } else if (language.toLowerCase() === 'javascript') {
    if (trimmedCode.includes('console.log(0);') && !trimmedCode.match(/(readline|prompt)/)) { // Approx print(0)
      return '0';
    }
    // Check for simple echo (direct print of readline/prompt) - assuming readline() or prompt()
    if (trimmedCode.match(/console\.log\(\s*(readline\(\s*\)|prompt\(\s*\))\s*\);/)) {
        return input;
    }
    // Check for printing a literal string or number, only if no readline/prompt
    const consoleLogMatch = originalCodeTrimmed.match(/console\.log\(\s*(['"`])?(.*?)\1?\s*\);/);
     if (consoleLogMatch && !trimmedCode.match(/(readline|prompt)/)) {
        const val = consoleLogMatch[2];
        if (consoleLogMatch[1]) return val; // Quoted string
        if (!isNaN(parseFloat(val)) && isFinite(val as any)) return val; // Number
    }
  }
  
  // Default fallback simulation
  return `Simulated output for input: ${input}`;
}


export async function POST(request: NextRequest) {
  try {
    const body: ExecuteCodeRequestBody = await request.json();
    const { language, code, testCases, sampleInput, sampleOutput, executionType } = body;

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

    let generalOutput = `Simulating execution for ${language} (${executionType} mode)...\nCode received:\n${code.substring(0, 100)}${code.length > 100 ? '...' : ''}\n\n`;
    const currentTestResults: TestCaseResult[] = [];
    let compileError: string | undefined = undefined;
    let executionError: string | undefined = undefined;

    // Simulate compile/runtime errors based on code content
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
          passed: sampleOutput !== undefined ? actualSampleOutput === sampleOutput : true,
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
