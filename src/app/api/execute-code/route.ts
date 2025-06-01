
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

function simulateActualOutput(code: string, input: string, language: string): string {
  const trimmedCode = code.trim().toLowerCase();
  const originalCodeTrimmed = code.trim();

  // Specific check for the "Non-Prime numbers between A and B" sample case
  if (
    language.toLowerCase() === 'python' &&
    input.trim() === 'A = 12 B = 19' &&
    (originalCodeTrimmed.toLowerCase().includes('is_prime') || originalCodeTrimmed.toLowerCase().includes('isprime')) && 
    originalCodeTrimmed.toLowerCase().includes('range') 
  ) {
    return '14, 15, 16, 18';
  }

  if (language.toLowerCase() === 'python') {
    if (trimmedCode === 'print(0)' || originalCodeTrimmed.match(/^user_input\s*=\s*input\(\)\s*\nprint\(0\)$/m)) {
      return '0';
    }
    if (trimmedCode.includes('print(input())') || 
        (trimmedCode.includes('input()') && originalCodeTrimmed.match(/(\w+)\s*=\s*input\(\)\s*print\(\s*\1\s*\)/m))) {
      return input;
    }
    const printMatch = originalCodeTrimmed.match(/print\(\s*(['"`])?(.*?)\1?\s*\)/);
    if (printMatch && !trimmedCode.includes('input()')) {
      const val = printMatch[2];
      if (!isNaN(parseFloat(val)) && isFinite(val as any) || printMatch[1] || /^[a-zA-Z_]\w*$/.test(val) === false) {
         if (printMatch[1]) return val; 
         if (!isNaN(parseFloat(val)) && isFinite(val as any)) return val; 
      }
    }
  } else if (language.toLowerCase() === 'java') {
    if (trimmedCode.includes('system.out.println(0);') && !trimmedCode.includes("scanner.")) {
      return '0';
    }
    if (trimmedCode.match(/System\.out\.println\(\s*scanner\.next[a-zA-Z]*\(\s*\)\s*\);/)) {
        return input;
    }
    const printlnMatch = originalCodeTrimmed.match(/System\.out\.println\(\s*(")?(.*?)\1?\s*\);/);
    if (printlnMatch && !trimmedCode.toLowerCase().includes("scanner.")) {
        const val = printlnMatch[2];
        if (printlnMatch[1]) return val; 
        if (!isNaN(parseFloat(val)) && isFinite(val as any)) return val;
    }
  } else if (language.toLowerCase() === 'javascript') {
    if (trimmedCode.includes('console.log(0);') && !trimmedCode.match(/(readline|prompt)/)) {
      return '0';
    }
    if (trimmedCode.match(/console\.log\(\s*(readline\(\s*\)|prompt\(\s*\))\s*\);/)) {
        return input;
    }
    const consoleLogMatch = originalCodeTrimmed.match(/console\.log\(\s*(['"`])?(.*?)\1?\s*\);/);
     if (consoleLogMatch && !trimmedCode.match(/(readline|prompt)/)) {
        const val = consoleLogMatch[2];
        if (consoleLogMatch[1]) return val; 
        if (!isNaN(parseFloat(val)) && isFinite(val as any)) return val;
    }
  }
  
  return `Simulated output for input: ${input}`;
}

function simulateErrors(code: string, language: string): { compileError?: string; executionError?: string } {
  const lowerCode = code.toLowerCase();
  const originalCode = code; // Keep original for regex that might need case sensitivity or specific structure

  // Python Error Simulations
  if (language.toLowerCase() === 'python') {
    if (lowerCode.includes("if x print(y)")) { // Example: Missing colon
      return { compileError: "Simulated SyntaxError: invalid syntax (expected ':' after 'if' condition)" };
    }
    if (originalCode.match(/for\s+\w+\s+in\s+\w+\s+print/)) { // Example: Missing colon after for
        return { compileError: "Simulated SyntaxError: invalid syntax (expected ':' after 'for' loop)" };
    }
    if (lowerCode.includes("print(undefined_variable_for_error_sim)")) {
      return { executionError: "Simulated NameError: name 'undefined_variable_for_error_sim' is not defined" };
    }
    if (lowerCode.includes("int('abc')")) {
      return { executionError: "Simulated ValueError: invalid literal for int() with base 10: 'abc'" };
    }
  }

  // JavaScript Error Simulations
  if (language.toLowerCase() === 'javascript') {
    if (originalCode.match(/function\s+\w+\(\s*\)\s*\{[^{}]*$/)) { // Mismatched curly brace
      return { compileError: "Simulated SyntaxError: Unexpected end of input (missing '}')" };
    }
    if (lowerCode.includes("null.property_access_for_error_sim")) {
      return { executionError: "Simulated TypeError: Cannot read properties of null (reading 'property_access_for_error_sim')" };
    }
    if (lowerCode.includes("console.log(undeclared_var_for_error_sim);")) {
        return { executionError: "Simulated ReferenceError: undeclared_var_for_error_sim is not defined" };
    }
  }
  
  // Java Error Simulations (very basic)
  if (language.toLowerCase() === 'java') {
      if (originalCode.match(/System\.out\.println\("[^"]*"\Z/m) && !originalCode.match(/System\.out\.println\("[^"]*"\s*;/m)) { // Missing semicolon
          return { compileError: "Simulated Compilation Error: ';' expected at end of statement" };
      }
      if (lowerCode.includes("string s = null; s.length()")) {
          return { executionError: "Simulated NullPointerException: Cannot invoke \"String.length()\" because \"s\" is null" };
      }
       if (lowerCode.includes("int[] arr = new int[1]; arr[5] = 10;")) { // Array out of bounds
          return { executionError: "Simulated ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 1" };
      }
  }


  // General simulated errors based on keywords
  if (code.toLowerCase().includes("infinite loop simulated error")) {
      return { compileError: `Simulated Compile Error: Detected potential infinite loop construct.` };
  }
  if (code.toLowerCase().includes("runtime simulated error")) {
      return { executionError: `Simulated Runtime Error: Something went wrong during execution.` };
  }

  return {};
}


export async function POST(request: NextRequest) {
  try {
    const body: ExecuteCodeRequestBody = await request.json();
    const { language, code, testCases, sampleInput, sampleOutput, executionType } = body;

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500));

    let generalOutput = `Simulating execution for ${language} (${executionType} mode)...\n`;
    const currentTestResults: TestCaseResult[] = [];
    
    const { compileError: simulatedCompileError, executionError: simulatedExecutionError } = simulateErrors(code, language);

    if (simulatedCompileError) {
      generalOutput += `Compilation failed.\n${simulatedCompileError}\n`;
      return NextResponse.json({
        generalOutput,
        testCaseResults: [],
        compileError: simulatedCompileError,
      }, { status: 200 });
    }
    
    generalOutput += `Code compiled/interpreted successfully (simulation).\n`;

    if (simulatedExecutionError && executionType === 'run') {
        generalOutput += `Execution encountered an error during sample run.\n${simulatedExecutionError}\n`;
        currentTestResults.push({
          testCaseNumber: 'Sample',
          input: sampleInput || "N/A",
          expectedOutput: sampleOutput || "N/A",
          actualOutput: `Error: ${simulatedExecutionError}`,
          passed: false,
          error: simulatedExecutionError,
        });
        return NextResponse.json({
            generalOutput,
            testCaseResults: currentTestResults,
            executionError: simulatedExecutionError,
        }, { status: 200 });
    }


    if (executionType === 'run') {
      generalOutput += `Running with sample input...\n`;
      const actualSampleOutput = simulateActualOutput(code, sampleInput || "", language);
      currentTestResults.push({
        testCaseNumber: 'Sample',
        input: sampleInput || "N/A",
        expectedOutput: sampleOutput || "N/A",
        actualOutput: actualSampleOutput,
        passed: sampleOutput !== undefined ? actualSampleOutput === sampleOutput : true, // Pass if no expected output, or if matches
      });
      generalOutput += `Sample input processed (simulation).\nActual output for sample: ${actualSampleOutput}\n`;
    } else if (executionType === 'submit') {
      generalOutput += `Running all test cases...\n\n`;
      if (testCases && testCases.length > 0) {
        let firstExecutionErrorEncountered: string | undefined = undefined;

        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          
          // If a general execution error was simulated before test cases, apply it to the first test case
          if (i === 0 && simulatedExecutionError && !firstExecutionErrorEncountered) {
            firstExecutionErrorEncountered = simulatedExecutionError;
            currentTestResults.push({
              testCaseNumber: i + 1,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              actualOutput: `Error: ${simulatedExecutionError}`,
              passed: false,
              error: simulatedExecutionError,
            });
            generalOutput += `Test Case ${i+1} failed due to runtime error.\n`;
            break; // Stop processing further test cases if a general runtime error occurs
          }

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
        if (firstExecutionErrorEncountered) {
            generalOutput += `Submission failed due to runtime error: ${firstExecutionErrorEncountered}\n`;
        } else {
            generalOutput += `All test cases processed (simulation).\n`;
        }
      } else {
        generalOutput += `No test cases provided for submission.\n`;
      }
    }

    const responseBody: ExecuteCodeResponseBody = {
      generalOutput,
      testCaseResults: currentTestResults,
      compileError: undefined, // Cleared if we passed initial check
      executionError: simulatedExecutionError, // This might be from pre-test-case general check
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
