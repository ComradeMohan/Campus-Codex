
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { TestCase } from '@/types';

// Ensure environment variables are loaded
// For Next.js, .env.local is automatically loaded.
// import dotenv from 'dotenv';
// dotenv.config();

interface ExecuteCodeRequestBody {
  language: string;
  code: string;
  testCases?: TestCase[];
  sampleInput?: string;
  sampleOutput?: string;
  executionType: 'run' | 'submit';
}

interface Judge0Status {
  id: number;
  description: string;
}
interface Judge0Response {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: Judge0Status;
  time: string | null; // e.g., "0.002"
  memory: number | null; // e.g., 1024 (in KB)
  token?: string; // Submission token
  message?: string; // For errors from Judge0 itself
}


interface TestCaseResult {
  testCaseNumber: number | string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
  time?: string;
  memory?: number;
}

interface ExecuteCodeResponseBody {
  generalOutput: string;
  testCaseResults: TestCaseResult[];
  executionError?: string;
  compileError?: string;
}

// --- Mock Implementation (Fallback) ---
function simulateActualOutput(code: string, input: string, language: string): string {
  const trimmedCode = code.trim().toLowerCase();
  const originalCodeTrimmed = code.trim();

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
         if (printMatch[1]) return val; // It's a quoted string
         if (!isNaN(parseFloat(val)) && isFinite(val as any)) return val; // It's a number
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
  const originalCode = code;

  if (language.toLowerCase() === 'python') {
    if (lowerCode.includes("if x print(y)")) { // Missing colon
      return { compileError: "Simulated SyntaxError: invalid syntax (expected ':' after 'if' condition)" };
    }
    if (originalCode.match(/for\s+\w+\s+in\s+\w+\s+print/)) { // Missing colon
        return { compileError: "Simulated SyntaxError: invalid syntax (expected ':' after 'for' loop)" };
    }
    if (lowerCode.includes("print(undefined_variable_for_error_sim)")) {
      return { executionError: "Simulated NameError: name 'undefined_variable_for_error_sim' is not defined" };
    }
     if (lowerCode.includes("int('abc')")) {
      return { executionError: "Simulated ValueError: invalid literal for int() with base 10: 'abc'" };
    }
  }
  if (language.toLowerCase() === 'javascript') {
    if (originalCode.match(/function\s+\w+\(\s*\)\s*\{[^{}]*$/)) { // Missing closing brace
      return { compileError: "Simulated SyntaxError: Unexpected end of input (missing '}')" };
    }
    if (lowerCode.includes("null.property_access_for_error_sim")) {
      return { executionError: "Simulated TypeError: Cannot read properties of null (reading 'property_access_for_error_sim')" };
    }
     if (lowerCode.includes("console.log(undeclared_var_for_error_sim);")) {
        return { executionError: "Simulated ReferenceError: undeclared_var_for_error_sim is not defined" };
    }
  }
  if (language.toLowerCase() === 'java') {
      if (originalCode.match(/System\.out\.println\("[^"]*"\Z/m) && !originalCode.match(/System\.out\.println\("[^"]*"\s*;/m) ) { // Missing semicolon
          return { compileError: "Simulated Compilation Error: ';' expected at end of statement" };
      }
      if (lowerCode.includes("string s = null; s.length()")) { // Null pointer
          return { executionError: "Simulated NullPointerException: Cannot invoke \"String.length()\" because \"s\" is null" };
      }
      if (lowerCode.includes("int[] arr = new int[1]; arr[5] = 10;")) { // Array out of bounds
          return { executionError: "Simulated ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 1" };
      }
  }
  if (code.toLowerCase().includes("infinite loop simulated error")) {
      return { compileError: `Simulated Compile Error: Detected potential infinite loop construct.` };
  }
  if (code.toLowerCase().includes("runtime simulated error")) {
      return { executionError: `Simulated Runtime Error: Something went wrong during execution.` };
  }
  return {};
}

async function executeWithMockAPI(body: ExecuteCodeRequestBody): Promise<ExecuteCodeResponseBody> {
  const { language, code, testCases, sampleInput, sampleOutput, executionType } = body;
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500));

  let generalOutput = `Simulating execution for ${language} (${executionType} mode)...\n`;
  const currentTestResults: TestCaseResult[] = [];
  const { compileError: simulatedCompileError, executionError: simulatedExecutionError } = simulateErrors(code, language);

  if (simulatedCompileError) {
    generalOutput += `Compilation failed.\n${simulatedCompileError}\n`;
    return {
      generalOutput,
      testCaseResults: [],
      compileError: simulatedCompileError,
    };
  }

  generalOutput += `Code compiled/interpreted successfully (simulation).\n`;

  if (simulatedExecutionError && executionType === 'run') {
      // If a general execution error is simulated, show it for 'run' mode
      generalOutput += `Execution encountered an error during sample run.\n${simulatedExecutionError}\n`;
      currentTestResults.push({
        testCaseNumber: 'Sample',
        input: sampleInput || "N/A",
        expectedOutput: sampleOutput || "N/A",
        actualOutput: `Error: ${simulatedExecutionError}`,
        passed: false,
        error: simulatedExecutionError,
      });
      return {
          generalOutput,
          testCaseResults: currentTestResults,
          executionError: simulatedExecutionError,
      };
  }


  if (executionType === 'run') {
    generalOutput += `Running with sample input...\n`;
    const actualSampleOutput = simulateActualOutput(code, sampleInput || "", language);
    currentTestResults.push({
      testCaseNumber: 'Sample',
      input: sampleInput || "N/A",
      expectedOutput: sampleOutput || "N/A",
      actualOutput: actualSampleOutput,
      passed: sampleOutput !== undefined ? actualSampleOutput === sampleOutput : true, // Assume pass if no expected output
    });
    generalOutput += `Sample input processed (simulation).\nActual output for sample: ${actualSampleOutput}\n`;
  } else if (executionType === 'submit') {
    generalOutput += `Running all test cases...\n\n`;
    if (testCases && testCases.length > 0) {
      let firstExecutionErrorEncountered: string | undefined = undefined;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        // Apply general simulated execution error only to the first test case if it exists
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
          break; // Stop processing further test cases if a general runtime error is hit on the first one
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

  return {
    generalOutput,
    testCaseResults: currentTestResults,
    compileError: undefined, // Already handled above
    executionError: simulatedExecutionError && executionType === 'submit' ? simulatedExecutionError : undefined,
  };
}
// --- End Mock Implementation ---


function getRapidAPILanguageIdentifier(languageName: string): number {
  const lang = languageName.toLowerCase();
  // Judge0 Language IDs (selected common ones)
  if (lang === 'python') return 71; // Python 3.8.1
  if (lang === 'javascript') return 63; // NodeJS 12.14.0
  if (lang === 'java') return 62; // Java OpenJDK 13.0.1
  if (lang === 'c++' || lang === 'cpp') return 54; // C++ (GCC 9.2.0)
  if (lang === 'c#' || lang === 'csharp') return 51; // C# (Mono 6.6.0.161)
  if (lang === 'typescript') return 74; // TypeScript 3.7.4
  if (lang === 'php') return 68; // PHP 7.4.1
  if (lang === 'swift') return 83; // Swift 5.1.3
  if (lang === 'kotlin') return 78; // Kotlin 1.3.70
  if (lang === 'ruby') return 72; // Ruby 2.7.0
  if (lang === 'go') return 60; // Go 1.13.5
  if (lang === 'rust') return 73; // Rust 1.40.0
  
  console.warn(`RapidAPI language identifier not found for: ${languageName}. Defaulting to 0 (will likely fail).`);
  return 0; // Fallback, Judge0 will likely reject this
}


export async function POST(request: NextRequest) {
  try {
    const body: ExecuteCodeRequestBody = await request.json();
    const { language, code, testCases, sampleInput, sampleOutput, executionType } = body;

    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const rapidApiHost = 'judge0-ce.p.rapidapi.com';
    const rapidApiUrl = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true';

    if (!rapidApiKey) {
      console.warn("RAPIDAPI_KEY not configured in .env. Falling back to mock API.");
      const mockResponse = await executeWithMockAPI(body);
      return NextResponse.json(mockResponse, { status: 200 });
    }

    let responseData: ExecuteCodeResponseBody;
    const languageId = getRapidAPILanguageIdentifier(language);
    if (languageId === 0 && language.toLowerCase() !== 'plaintext') { // plaintext might be a valid fallback for some non-executable display
         console.error(`Unsupported language for Judge0: ${language}. Falling back to mock API.`);
         const mockResponse = await executeWithMockAPI(body);
         mockResponse.generalOutput = `Unsupported language for live execution. Using simulation.\n${mockResponse.generalOutput}`;
         return NextResponse.json(mockResponse, { status: 200 });
    }


    if (executionType === 'run') {
        const payload = {
            language_id: languageId,
            source_code: code,
            stdin: sampleInput || "",
            // Judge0 doesn't directly use expected_output for 'run' unless you implement polling and diffing
        };

        const apiResponse = await fetch(rapidApiUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'X-RapidAPI-Key': rapidApiKey,
                'X-RapidAPI-Host': rapidApiHost,
            },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorDetails = await apiResponse.json().catch(() => ({ message: `RapidAPI request failed with status ${apiResponse.status}`}));
            console.error('RapidAPI Error:', errorDetails);
            throw new Error(errorDetails.message || `RapidAPI request failed with status ${apiResponse.status}`);
        }

        const result: Judge0Response = await apiResponse.json();
        
        let currentCompileError: string | undefined = undefined;
        let currentExecutionError: string | undefined = undefined;

        if (result.status.id === 6) { // Compilation Error
            currentCompileError = result.compile_output || result.status.description;
        } else if (result.status.id > 6 && result.status.id <= 12) { // Runtime Errors
            currentExecutionError = result.stderr || result.status.description;
        } else if (result.status.id === 4) { // Wrong Answer
             currentExecutionError = "Output did not match expected output (for run mode, this is a generic WA if expected output was provided).";
        } else if (result.status.id > 3 ) { // Other errors (TLE, Internal, etc.)
             currentExecutionError = result.status.description;
        }


        const actualOutput = result.stdout || "";
        const passed = sampleOutput !== undefined ? (actualOutput.trim() === sampleOutput.trim() && !currentCompileError && !currentExecutionError) : (!currentCompileError && !currentExecutionError);


        responseData = {
            generalOutput: `Execution via Judge0 completed.\nStatus: ${result.status.description}\nTime: ${result.time || 'N/A'}s\nMemory: ${result.memory || 'N/A'} KB\n\nStdout:\n${actualOutput}\n\nStderr:\n${result.stderr || 'None'}\n\nCompile Output:\n${result.compile_output || 'None'}`,
            testCaseResults: [{
                testCaseNumber: 'Sample',
                input: sampleInput || "N/A",
                expectedOutput: sampleOutput || "N/A",
                actualOutput: actualOutput,
                passed: passed,
                error: currentExecutionError || (currentCompileError ? "Compilation Failed" : undefined),
                time: result.time || undefined,
                memory: result.memory || undefined,
            }],
            compileError: currentCompileError,
            executionError: currentExecutionError && !currentCompileError ? currentExecutionError : undefined,
        };

    } else { // executionType === 'submit'
        responseData = { generalOutput: "Processing submission with Judge0...\n", testCaseResults: [], compileError: undefined, executionError: undefined };
        
        if (!testCases || testCases.length === 0) {
            responseData.generalOutput += "No test cases provided for submission.\n";
        } else {
            for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                const payload = {
                    language_id: languageId,
                    source_code: code,
                    stdin: tc.input,
                    expected_output: tc.expectedOutput, // Judge0 uses this for status ID 4 (Wrong Answer)
                };

                const apiResponse = await fetch(rapidApiUrl, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'X-RapidAPI-Key': rapidApiKey,
                        'X-RapidAPI-Host': rapidApiHost,
                    },
                    body: JSON.stringify(payload),
                });

                if (!apiResponse.ok) {
                    const errorText = await apiResponse.text();
                    console.error(`RapidAPI error for test case ${i + 1}: ${errorText}`);
                    responseData.testCaseResults.push({
                        testCaseNumber: i + 1,
                        input: tc.input,
                        expectedOutput: tc.expectedOutput,
                        actualOutput: `Error: ${apiResponse.status}`,
                        passed: false,
                        error: `RapidAPI error: ${apiResponse.status}`,
                    });
                     // If critical error on first test case, set global error and break
                    if (i === 0) {
                        responseData.executionError = `Critical RapidAPI error on first test case: ${apiResponse.status}`;
                        break;
                    }
                    continue;
                }
                const result: Judge0Response = await apiResponse.json();

                let currentCompileErrorThisTc: string | undefined = undefined;
                let currentExecutionErrorThisTc: string | undefined = undefined;
                let actualOutputThisTc = result.stdout || "";

                if (result.status.id === 6) { // Compilation Error
                    currentCompileErrorThisTc = result.compile_output || result.status.description;
                    if (!responseData.compileError) responseData.compileError = currentCompileErrorThisTc; // Set global compile error
                    actualOutputThisTc = currentCompileErrorThisTc; // Display compile error as output
                } else if (result.status.id > 6 && result.status.id <= 12) { // Runtime Errors
                    currentExecutionErrorThisTc = result.stderr || result.status.description;
                     if (i === 0 && !responseData.executionError && !responseData.compileError) responseData.executionError = currentExecutionErrorThisTc; // Set global runtime error if on first TC
                     actualOutputThisTc = currentExecutionErrorThisTc;
                } else if (result.status.id === 4) { // Wrong Answer
                    // stderr might contain useful info for WA
                    currentExecutionErrorThisTc = result.stderr ? `Wrong Answer. Details: ${result.stderr}` : "Wrong Answer";
                } else if (result.status.id > 3 && result.status.id !== 4) { // Other errors (TLE, Internal, etc.)
                     currentExecutionErrorThisTc = result.status.description;
                     if (i === 0 && !responseData.executionError && !responseData.compileError) responseData.executionError = currentExecutionErrorThisTc;
                     actualOutputThisTc = currentExecutionErrorThisTc;
                }
                
                // Judge0 status ID 3 means "Accepted" which implies output matches expected_output
                const passedThisTc = result.status.id === 3;

                responseData.testCaseResults.push({
                    testCaseNumber: i + 1,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: actualOutputThisTc,
                    passed: passedThisTc,
                    error: currentExecutionErrorThisTc || (currentCompileErrorThisTc ? "Compilation Failed" : undefined),
                    time: result.time || undefined,
                    memory: result.memory || undefined,
                });

                if (responseData.compileError) {
                    responseData.generalOutput += `Compilation failed on test case ${i + 1}: ${responseData.compileError}. Halting submission.\n`;
                    break; 
                }
                 if (i === 0 && responseData.executionError) {
                    responseData.generalOutput += `Execution error on first test case: ${responseData.executionError}. Halting submission.\n`;
                    break;
                }
            }
            if (!responseData.compileError && !responseData.executionError) {
                 responseData.generalOutput += "All test cases processed via Judge0.\n";
            }
        }
    }
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/execute-code] Error:', error);
    // Fallback to mock for other errors if desired, or return a generic server error
    try {
        const body = await request.json().catch(() => null); // Try to get body for mock if possible
        if (body) {
            console.warn("An error occurred with real API, falling back to mock API.");
            const mockResponse = await executeWithMockAPI(body as ExecuteCodeRequestBody);
            mockResponse.generalOutput = `Error with live API (${error.message}). Falling back to simulation.\n${mockResponse.generalOutput}`;
            return NextResponse.json(mockResponse, { status: 200 });
        }
    } catch (fallbackError) {
        console.error('[API /api/execute-code] Fallback mock API error:', fallbackError);
    }

    return NextResponse.json(
      {
        executionError: `Server error processing code execution: ${error.message}`,
        generalOutput: `An unexpected error occurred: ${error.message}`,
        testCaseResults: []
      },
      { status: 500 }
    );
  }
}
