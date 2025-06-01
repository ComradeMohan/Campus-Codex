
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { TestCase } from '@/types';

// Ensure environment variables are loaded
// For Next.js, .env.local is automatically loaded.
// If using a different environment, you might need a library like dotenv.
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

interface TestCaseResult {
  testCaseNumber: number | string;
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
  const originalCode = code;

  if (language.toLowerCase() === 'python') {
    if (lowerCode.includes("if x print(y)")) {
      return { compileError: "Simulated SyntaxError: invalid syntax (expected ':' after 'if' condition)" };
    }
    if (originalCode.match(/for\s+\w+\s+in\s+\w+\s+print/)) {
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
    if (originalCode.match(/function\s+\w+\(\s*\)\s*\{[^{}]*$/)) {
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
      if (originalCode.match(/System\.out\.println\("[^"]*"\Z/m) && !originalCode.match(/System\.out\.println\("[^"]*"\s*;/m)) {
          return { compileError: "Simulated Compilation Error: ';' expected at end of statement" };
      }
      if (lowerCode.includes("string s = null; s.length()")) {
          return { executionError: "Simulated NullPointerException: Cannot invoke \"String.length()\" because \"s\" is null" };
      }
       if (lowerCode.includes("int[] arr = new int[1]; arr[5] = 10;")) {
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
      passed: sampleOutput !== undefined ? actualSampleOutput === sampleOutput : true,
    });
    generalOutput += `Sample input processed (simulation).\nActual output for sample: ${actualSampleOutput}\n`;
  } else if (executionType === 'submit') {
    generalOutput += `Running all test cases...\n\n`;
    if (testCases && testCases.length > 0) {
      let firstExecutionErrorEncountered: string | undefined = undefined;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
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
          break;
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
    compileError: undefined,
    executionError: simulatedExecutionError,
  };
}
// --- End Mock Implementation ---

// Helper function to map your language names to RapidAPI language IDs/strings
// YOU WILL NEED TO CUSTOMIZE THIS BASED ON THE RAPIDAPI ENDPOINT
function getRapidAPILanguageIdentifier(languageName: string): string | number {
  const lang = languageName.toLowerCase();
  if (lang === 'python') return 'python'; // Or a specific ID like 71 for Python 3.8 on Judge0
  if (lang === 'javascript') return 'javascript'; // Or an ID like 63 for Node.js on Judge0
  if (lang === 'java') return 'java'; // Or an ID like 62 for Java on Judge0
  // Add other languages supported by your chosen RapidAPI endpoint
  console.warn(`RapidAPI language identifier not found for: ${languageName}. Defaulting to raw name.`);
  return languageName; // Fallback, but likely incorrect for most APIs
}


export async function POST(request: NextRequest) {
  try {
    const body: ExecuteCodeRequestBody = await request.json();
    const { language, code, testCases, sampleInput, sampleOutput, executionType } = body;

    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const rapidApiHost = 'rapidapi.com'; // e.g., 'judge0-ce.p.rapidapi.com'
    const rapidApiUrl = 'a9eacada21msh01c0d12c84e3501p105fedjsn739db62b3f0b'; // e.g., 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true'

    if (!rapidApiKey || rapidApiHost === 'YOUR_RAPIDAPI_HOST' || rapidApiUrl === 'YOUR_RAPIDAPI_ENDPOINT_URL') {
      console.warn("RapidAPI details not fully configured in /api/execute-code. Falling back to mock API.");
      const mockResponse = await executeWithMockAPI(body);
      return NextResponse.json(mockResponse, { status: 200 });
    }

    // --- Real API Call (Placeholder - customize based on your chosen RapidAPI endpoint) ---
    let responseData: ExecuteCodeResponseBody;

    if (executionType === 'run') {
        const rapidApiPayload = {
            // YOU NEED TO MAP 'language' to what RapidAPI expects (e.g., language_id)
            language_id: getRapidAPILanguageIdentifier(language), // Example for Judge0
            source_code: code,
            stdin: sampleInput || "",
            // Add other necessary fields like expected_output if the API supports direct comparison
        };

        const apiResponse = await fetch(rapidApiUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'X-RapidAPI-Key': rapidApiKey,
                'X-RapidAPI-Host': rapidApiHost,
            },
            body: JSON.stringify(rapidApiPayload),
        });

        if (!apiResponse.ok) {
            const errorDetails = await apiResponse.text();
            console.error('RapidAPI Error:', errorDetails);
            throw new Error(`RapidAPI request failed with status ${apiResponse.status}: ${errorDetails}`);
        }

        const result = await apiResponse.json();

        // --- TRANSFORM RapidAPI RESPONSE to ExecuteCodeResponseBody ---
        // This is highly dependent on the RapidAPI endpoint's response structure.
        // Example transformation (you MUST adapt this):
        const actualOutput = result.stdout || result.output || ""; // Adjust based on actual response field
        const compileError = result.compile_output || result.compileError || null;
        const executionError = result.stderr || result.error || null; // Adjust field names
        const passed = sampleOutput !== undefined ? actualOutput === sampleOutput : true;

        responseData = {
            generalOutput: `Execution via RapidAPI completed.\nStdout: ${actualOutput}\nStderr: ${executionError || 'None'}\nCompile Output: ${compileError || 'None'}`,
            testCaseResults: [{
                testCaseNumber: 'Sample',
                input: sampleInput || "N/A",
                expectedOutput: sampleOutput || "N/A",
                actualOutput: actualOutput,
                passed: passed,
                error: executionError || undefined,
            }],
            compileError: compileError || undefined,
            executionError: executionError || undefined,
        };

    } else { // executionType === 'submit'
        // For 'submit', you might need to send one request per test case, or a batch if supported.
        // This example assumes one request per test case for simplicity.
        // More complex batching/polling might be needed for some APIs (e.g., Judge0 for multiple test cases).

        responseData = { generalOutput: "Batch submission via RapidAPI (placeholder).\n", testCaseResults: [], compileError: undefined, executionError: undefined };
        let overallCompileError: string | undefined = undefined;
        let firstExecutionError: string | undefined = undefined;

        if (testCases && testCases.length > 0) {
            for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                 const rapidApiPayload = {
                    language_id: getRapidAPILanguageIdentifier(language),
                    source_code: code,
                    stdin: tc.input,
                    expected_output: tc.expectedOutput, // Some APIs might take this for direct comparison
                };

                const apiResponse = await fetch(rapidApiUrl, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'X-RapidAPI-Key': rapidApiKey,
                        'X-RapidAPI-Host': rapidApiHost,
                    },
                    body: JSON.stringify(rapidApiPayload),
                });

                if (!apiResponse.ok) {
                    const errorText = await apiResponse.text();
                    console.error(`RapidAPI error for test case ${i + 1}: ${errorText}`);
                    // Store first critical error and stop, or collect all errors
                    if (!overallCompileError && !firstExecutionError) firstExecutionError = `RapidAPI error for TC ${i+1}: ${apiResponse.status}`;
                    responseData.testCaseResults.push({
                        testCaseNumber: i + 1,
                        input: tc.input,
                        expectedOutput: tc.expectedOutput,
                        actualOutput: `Error: ${apiResponse.status}`,
                        passed: false,
                        error: `RapidAPI error: ${apiResponse.status}`,
                    });
                    if (i === 0) break; // Stop on first error for simplicity in this placeholder
                    continue;
                }
                const result = await apiResponse.json();

                // --- TRANSFORM RapidAPI RESPONSE to TestCaseResult ---
                const actualOutput = result.stdout || result.output || "";
                const currentCompileError = result.compile_output || result.compileError;
                const currentExecutionError = result.stderr || result.error;

                if (currentCompileError && !overallCompileError) {
                    overallCompileError = currentCompileError;
                    responseData.compileError = overallCompileError;
                    // If compilation fails, all test cases essentially fail due to this.
                    // You might want to break here or mark all as failed due to compile error.
                }
                if (currentExecutionError && !firstExecutionError && !overallCompileError) {
                    firstExecutionError = currentExecutionError;
                    responseData.executionError = firstExecutionError;
                }

                const passed = !overallCompileError && !currentExecutionError && (actualOutput === tc.expectedOutput);

                responseData.testCaseResults.push({
                    testCaseNumber: i + 1,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: currentCompileError ? `Compile Error: ${currentCompileError}` : currentExecutionError ? `Runtime Error: ${currentExecutionError}` : actualOutput,
                    passed: passed,
                    error: currentExecutionError || undefined,
                });
                 if (overallCompileError || (firstExecutionError && i===0) ) break; // Stop if critical error on first TC or compile error
            }
            if (overallCompileError) responseData.generalOutput += `Compilation failed: ${overallCompileError}\n`;
            else if (firstExecutionError) responseData.generalOutput += `An execution error occurred: ${firstExecutionError}\n`;
            else responseData.generalOutput += "All test cases processed via RapidAPI.\n";

        } else {
             responseData.generalOutput += "No test cases provided for submission.\n";
        }
    }
    // --- End Real API Call ---

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/execute-code] Error:', error);
    // Attempt to run mock API as fallback if real API fails and it's a client-side body parsing issue or RapidAPI not configured
    if (error.name === 'SyntaxError' && error instanceof SyntaxError) { // Likely JSON parsing error of request body
        return NextResponse.json(
          { executionError: 'Invalid request format.', generalOutput: 'Server error: Could not parse request.', testCaseResults: [] },
          { status: 400 }
        );
    }
    // Fallback to mock for other errors if desired, or return a generic server error
    try {
        const body = await request.json().catch(() => null); // Try to get body for mock if possible
        if (body) {
            console.warn("An error occurred with real API, falling back to mock API.");
            const mockResponse = await executeWithMockAPI(body as ExecuteCodeRequestBody);
            // Prepend an error message to generalOutput
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
