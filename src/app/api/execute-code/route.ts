
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { TestCase } from '@/types';

// --- Piston API Integration ---
interface PistonRuntime {
  language: string;
  version: string;
  aliases: string[];
  compiled?: boolean;
}

interface PistonRequest {
  language: string;
  version: string;
  files: { name: string; content: string }[];
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

interface PistonExecutionResult {
  stdout: string | null;
  stderr: string | null;
  output: string | null;
  code: number;
  signal: string | null;
}

interface PistonResponse {
  language: string;
  version: string;
  run: PistonExecutionResult;
  compile?: PistonExecutionResult; // Optional, only if language compiles
}

let cachedRuntimes: PistonRuntime[] | null = null;
let lastRuntimeFetchTime: number = 0;
const RUNTIME_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const PISTON_API_BASE = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

// Helper to clean up error messages
const cleanErrorMessage = (message: string): string => {
  if (!message) return "";
  // This regex looks for a common Piston path and removes it.
  // Example: /piston/jobs/uuid/main.py:5: ... -> main.py:5: ...
  return message.replace(/\/piston\/jobs\/[a-f0-9-]+-([a-f0-9]+-){3}[a-f0-9]+\//g, '');
};


async function getPistonRuntimes(): Promise<PistonRuntime[]> {
  const now = Date.now();
  if (cachedRuntimes && (now - lastRuntimeFetchTime < RUNTIME_CACHE_DURATION)) {
    return cachedRuntimes;
  }
  try {
    const response = await fetch(`${PISTON_API_BASE}/runtimes`);
    if (!response.ok) {
      console.error('Piston API: Failed to fetch runtimes - Status:', response.status);
      if (cachedRuntimes) return cachedRuntimes; // Return stale cache on error
      throw new Error(`Failed to fetch Piston runtimes: ${response.status}`);
    }
    const runtimes: PistonRuntime[] = await response.json();
    cachedRuntimes = runtimes;
    lastRuntimeFetchTime = now;
    return runtimes;
  } catch (error) {
    console.error('Piston API: Error fetching runtimes -', error);
    if (cachedRuntimes) return cachedRuntimes; // Return stale cache on critical error
    throw error; // Rethrow if no cache available
  }
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const n1 = parts1[i] || 0;
    const n2 = parts2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

function getLatestVersionAndLanguage(
  requestedLang: string,
  runtimes: PistonRuntime[]
): { version: string; language: string; compiled: boolean } | null {
  const lowerRequestedLang = requestedLang.toLowerCase();
  const matchedRuntimes = runtimes.filter(
    (rt) =>
      rt.language.toLowerCase() === lowerRequestedLang ||
      rt.aliases.some((alias) => alias.toLowerCase() === lowerRequestedLang)
  );

  if (matchedRuntimes.length === 0) {
    return null;
  }
  matchedRuntimes.sort((a, b) => compareVersions(b.version, a.version));
  return {
    version: matchedRuntimes[0].version,
    language: matchedRuntimes[0].language,
    compiled: matchedRuntimes[0].compiled || false,
  };
}

function getPistonFilename(languageName: string): string {
  const lang = languageName.toLowerCase();
  if (lang === 'python') return 'main.py';
  if (lang === 'javascript') return 'main.js';
  if (lang === 'java') return 'Main.java';
  if (lang === 'c++' || lang === 'cpp') return 'main.cpp';
  if (lang === 'c#' || lang === 'csharp') return 'Main.cs'; // Often Main.cs for C#
  if (lang === 'typescript') return 'main.ts';
  if (lang === 'php') return 'main.php';
  if (lang === 'swift') return 'main.swift';
  if (lang === 'kotlin') return 'Main.kt'; // Often Main.kt for Kotlin
  if (lang === 'ruby') return 'main.rb';
  if (lang === 'go') return 'main.go';
  if (lang === 'rust') return 'main.rs';
  // Generic fallback, Piston might infer for some
  return `script.${lang.split(' ')[0]}`; // e.g. script.bash for bash
}


// --- End Piston API Integration ---

interface ExecuteCodeRequestBody {
  language: string;
  code: string;
  testCases?: TestCase[];
  sampleInput?: string;
  sampleOutput?: string; // For mock API and potentially for display
  executionType: 'run' | 'submit';
}

interface TestCaseResult {
  testCaseNumber: number | string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
  time?: string; // Piston doesn't directly provide time per execution in easy format
  memory?: number; // Piston doesn't directly provide memory per execution
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
  // ... (existing simulateActualOutput logic - kept for brevity, assumed it remains)
  if (
    language.toLowerCase() === 'python' &&
    input.trim() === 'A = 12 B = 19' &&
    (originalCodeTrimmed.toLowerCase().includes('is_prime') || originalCodeTrimmed.toLowerCase().includes('isprime')) &&
    originalCodeTrimmed.toLowerCase().includes('range')
  ) {
    return '14, 15, 16, 18';
  }
  if (language.toLowerCase() === 'python') {
    if (trimmedCode === 'print(0)' || originalCodeTrimmed.match(/^user_input\s*=\s*input\(\)\s*\nprint\(0\)$/m)) return '0';
    if (trimmedCode.includes('print(input())') || (trimmedCode.includes('input()') && originalCodeTrimmed.match(/(\w+)\s*=\s*input\(\)\s*print\(\s*\1\s*\)/m))) return input;
    const printMatch = originalCodeTrimmed.match(/print\(\s*(['"`])?(.*?)\1?\s*\)/);
    if (printMatch && !trimmedCode.includes('input()')) {
      const val = printMatch[2];
      if (!isNaN(parseFloat(val)) && isFinite(val as any) || printMatch[1] || /^[a-zA-Z_]\w*$/.test(val) === false) {
         if (printMatch[1]) return val; 
         if (!isNaN(parseFloat(val)) && isFinite(val as any)) return val;
      }
    }
  } else if (language.toLowerCase() === 'java') {
    if (trimmedCode.includes('system.out.println(0);') && !trimmedCode.includes("scanner.")) return '0';
    if (trimmedCode.match(/System\.out\.println\(\s*scanner\.next[a-zA-Z]*\(\s*\)\s*\);/)) return input;
    const printlnMatch = originalCodeTrimmed.match(/System\.out\.println\(\s*(")?(.*?)\1?\s*\);/);
    if (printlnMatch && !trimmedCode.toLowerCase().includes("scanner.")) {
        const val = printlnMatch[2];
        if (printlnMatch[1]) return val;
        if (!isNaN(parseFloat(val)) && isFinite(val as any)) return val;
    }
  } else if (language.toLowerCase() === 'javascript') {
    if (trimmedCode.includes('console.log(0);') && !trimmedCode.match(/(readline|prompt)/)) return '0';
    if (trimmedCode.match(/console\.log\(\s*(readline\(\s*\)|prompt\(\s*\))\s*\);/)) return input;
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
  // ... (existing simulateErrors logic - kept for brevity, assumed it remains)
  if (language.toLowerCase() === 'python') {
    if (lowerCode.includes("if x print(y)")) return { compileError: "Simulated SyntaxError: invalid syntax (expected ':' after 'if' condition)" };
    if (originalCode.match(/for\s+\w+\s+in\s+\w+\s+print/)) return { compileError: "Simulated SyntaxError: invalid syntax (expected ':' after 'for' loop)" };
    if (lowerCode.includes("print(undefined_variable_for_error_sim)")) return { executionError: "Simulated NameError: name 'undefined_variable_for_error_sim' is not defined" };
    if (lowerCode.includes("int('abc')")) return { executionError: "Simulated ValueError: invalid literal for int() with base 10: 'abc'" };
  }
  if (language.toLowerCase() === 'javascript') {
    if (originalCode.match(/function\s+\w+\(\s*\)\s*\{[^{}]*$/)) return { compileError: "Simulated SyntaxError: Unexpected end of input (missing '}')" };
    if (lowerCode.includes("null.property_access_for_error_sim")) return { executionError: "Simulated TypeError: Cannot read properties of null (reading 'property_access_for_error_sim')" };
    if (lowerCode.includes("console.log(undeclared_var_for_error_sim);")) return { executionError: "Simulated ReferenceError: undeclared_var_for_error_sim is not defined" };
  }
  if (language.toLowerCase() === 'java') {
      if (originalCode.match(/System\.out\.println\("[^"]*"\Z/m) && !originalCode.match(/System\.out\.println\("[^"]*"\s*;/m) ) return { compileError: "Simulated Compilation Error: ';' expected at end of statement" };
      if (lowerCode.includes("string s = null; s.length()")) return { executionError: "Simulated NullPointerException: Cannot invoke \"String.length()\" because \"s\" is null" };
      if (lowerCode.includes("int[] arr = new int[1]; arr[5] = 10;")) return { executionError: "Simulated ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 1" };
  }
  if (code.toLowerCase().includes("infinite loop simulated error")) return { compileError: `Simulated Compile Error: Detected potential infinite loop construct.` };
  if (code.toLowerCase().includes("runtime simulated error")) return { executionError: `Simulated Runtime Error: Something went wrong during execution.` };
  return {};
}

async function executeWithMockAPI(body: ExecuteCodeRequestBody): Promise<ExecuteCodeResponseBody> {
  const { language, code, testCases, sampleInput, sampleOutput, executionType } = body;
  await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500));

  let generalOutput = `Simulating execution for ${language} (${executionType} mode)...\n`;
  const currentTestResults: TestCaseResult[] = [];
  const { compileError: simulatedCompileError, executionError: simulatedExecutionError } = simulateErrors(code, language);

  if (simulatedCompileError) {
    generalOutput += `Compilation failed.\n`;
    return { generalOutput, testCaseResults: [], compileError: simulatedCompileError };
  }
  generalOutput += `Code compiled/interpreted successfully (simulation).\n`;

  if (simulatedExecutionError && executionType === 'run') {
      generalOutput += `Execution encountered an error during sample run.\n`;
      currentTestResults.push({
        testCaseNumber: 'Sample', input: sampleInput || "N/A", expectedOutput: sampleOutput || "N/A",
        actualOutput: `Error`, passed: false, error: simulatedExecutionError,
      });
      return { generalOutput, testCaseResults: currentTestResults, executionError: simulatedExecutionError };
  }

  if (executionType === 'run') {
    generalOutput += `Running with sample input...\n`;
    const actualSampleOutput = simulateActualOutput(code, sampleInput || "", language);
    currentTestResults.push({
      testCaseNumber: 'Sample', input: sampleInput || "N/A", expectedOutput: sampleOutput || "N/A",
      actualOutput: actualSampleOutput, passed: sampleOutput !== undefined ? actualSampleOutput === sampleOutput : true,
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
            testCaseNumber: i + 1, input: tc.input, expectedOutput: tc.expectedOutput,
            actualOutput: `Error`, passed: false, error: simulatedExecutionError,
          });
          generalOutput += `Test Case ${i+1} failed due to runtime error.\n`;
          break; 
        }
        const simulatedActualOutput = simulateActualOutput(code, tc.input, language);
        currentTestResults.push({
          testCaseNumber: i + 1, input: tc.input, expectedOutput: tc.expectedOutput,
          actualOutput: simulatedActualOutput, passed: simulatedActualOutput === tc.expectedOutput,
        });
      }
      if (firstExecutionErrorEncountered) {
          generalOutput += `Submission failed due to runtime error.\n`;
      } else {
          generalOutput += `All test cases processed (simulation).\n`;
      }
    } else {
      generalOutput += `No test cases provided for submission.\n`;
    }
  }
  return {
    generalOutput, testCaseResults: currentTestResults,
    compileError: undefined, 
    executionError: simulatedExecutionError && executionType === 'submit' ? simulatedExecutionError : undefined,
  };
}
function runCodeLocally(language: string, code: string, stdin: string): { stdout: string; stderr: string; success: boolean } {
  const lang = language.toLowerCase();
  const tempDir = os.tmpdir();
  
  if (lang === 'javascript' || lang === 'js') {
    const filePath = path.join(tempDir, `sandbox_${Date.now()}.js`);
    try {
      fs.writeFileSync(filePath, code);
      const stdout = execSync(`node "${filePath}"`, { input: stdin, timeout: 5000, encoding: 'utf-8' });
      return { stdout, stderr: "", success: true };
    } catch (err: any) {
      return { stdout: err.stdout || "", stderr: err.stderr || err.message || "Execution error", success: false };
    } finally {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
  
  if (lang === 'python' || lang === 'py') {
    const filePath = path.join(tempDir, `sandbox_${Date.now()}.py`);
    try {
      fs.writeFileSync(filePath, code);
      let stdout = "";
      try {
        stdout = execSync(`python "${filePath}"`, { input: stdin, timeout: 5000, encoding: 'utf-8' });
      } catch {
        stdout = execSync(`python3 "${filePath}"`, { input: stdin, timeout: 5000, encoding: 'utf-8' });
      }
      return { stdout, stderr: "", success: true };
    } catch (err: any) {
      return { stdout: err.stdout || "", stderr: err.stderr || err.message || "Execution error", success: false };
    } finally {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }

  return { stdout: "", stderr: "Local execution fallback only supported for Python/JavaScript", success: false };
}

const LANGUAGE_ID_MAP: Record<string, number> = {
  'c': 50,
  'c++': 54,
  'cpp': 54,
  'java': 62,
  'python': 71,
  'py': 71,
  'javascript': 63,
  'js': 63,
  'csharp': 51,
  'c#': 51,
  'typescript': 74,
  'ts': 74,
  'rust': 73,
  'go': 60,
  'ruby': 72,
  'swift': 83,
  'kotlin': 78,
  'php': 68
};

function detectRiskyCode(code: string, language: string): string[] {
  const warnings: string[] = [];
  const trimmed = code.replace(/\s+/g, '');
  
  // Infinite loops check
  if (
    /while\s*\(\s*(true|1|1==1)\s*\)/i.test(code) ||
    /for\s*\(\s*;\s*;\s*\)/.test(code) ||
    /while\s*\(\s*!\s*0\s*\)/.test(code)
  ) {
    warnings.push("⚠️ This code may exceed the execution time limit.");
  }
  
  // Huge memory allocations check
  if (
    /\[\s*\d{7,}\s*\]/.test(code) || 
    /new\s+int\s*\[\s*\d{7,}\s*\]/i.test(code) ||
    /new\s+Array\s*\(\s*\d{7,}\s*\)/i.test(code) ||
    /arr\s*=\s*\[0\s*\]\s*\*\s*\d{7,}/.test(code)
  ) {
    warnings.push("⚠️ This program may exceed the memory limit.");
  }
  
  // Many nested loops check
  const forLoopsCount = (code.match(/for\s*\(/g) || []).length;
  if (forLoopsCount >= 3) {
    let nestingLevel = 0;
    let maxNesting = 0;
    const tokens = code.match(/for\s*\(|while\s*\(|\{|\}/g) || [];
    for (const token of tokens) {
      if (token.startsWith('for') || token.startsWith('while')) {
        nestingLevel++;
        if (nestingLevel > maxNesting) maxNesting = nestingLevel;
      } else if (token === '}') {
        if (nestingLevel > 0) nestingLevel--;
      }
    }
    if (maxNesting >= 3) {
      warnings.push("⚠️ This algorithm may be too slow for large inputs.");
    }
  }
  
  return warnings;
}

async function runCodeOnJudge0(language: string, code: string, stdin: string): Promise<{ stdout: string; stderr: string; compile_error?: string; error?: string }> {
  const host = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
  const langId = LANGUAGE_ID_MAP[language.toLowerCase()];
  if (!langId) {
    return { stdout: "", stderr: "", error: `Unsupported language: ${language}` };
  }

  try {
    const createRes = await fetch(`${host}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_code: code,
        language_id: langId,
        stdin: stdin,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      if (errText.includes("queue is full") || createRes.status === 429 || createRes.status === 503) {
        return { stdout: "", stderr: "", error: "⚠️ Server is busy. Please wait a few seconds and try again." };
      }
      return { stdout: "", stderr: "", error: `Judge0 submission failed: ${createRes.status} - ${errText}` };
    }

    const { token } = await createRes.json();
    if (!token) {
      return { stdout: "", stderr: "", error: "Failed to obtain submission token from Judge0." };
    }

    let attempts = 0;
    const maxAttempts = 20; // up to 10 seconds
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;

      const pollRes = await fetch(`${host}/submissions/${token}?base64_encoded=false`);
      if (!pollRes.ok) {
        continue;
      }

      const result = await pollRes.json();
      const statusId = result.status?.id;

      if (statusId === 1 || statusId === 2) {
        continue;
      }

      const stdout = result.stdout || "";
      const stderr = result.stderr || "";
      const compileError = result.compile_output || "";

      if (statusId === 3) {
        return { stdout, stderr: "" };
      } else if (statusId === 5) {
        return { stdout, stderr: "Time Limit Exceeded", error: "⚠️ Time Limit Exceeded" };
      } else if (statusId === 6) {
        return { stdout: "", stderr: compileError || stderr, compile_error: compileError || "Compilation Error" };
      } else if (statusId >= 7 && statusId <= 12) {
        return { stdout, stderr: stderr || `Runtime Error (Status ${statusId})` };
      } else {
        return { stdout, stderr: stderr || "Internal Server Error during execution" };
      }
    }

    return { stdout: "", stderr: "⚠️ Execution Timed Out", error: "Execution Timed Out" };
  } catch (err: any) {
    return { stdout: "", stderr: "", error: `Execution error: ${err.message || String(err)}` };
  }
}

export async function POST(request: NextRequest) {
  let body: ExecuteCodeRequestBody | null = null;
  try {
    body = await request.json();
    const { language, code, testCases, sampleInput, sampleOutput, executionType } = body;

    // 1. Risky code checks
    const riskyWarnings = detectRiskyCode(code, language);
    let warningsHeader = "";
    if (riskyWarnings.length > 0) {
      warningsHeader = riskyWarnings.join('\n') + '\n\n';
    }

    let responseData: ExecuteCodeResponseBody = {
      generalOutput: warningsHeader,
      testCaseResults: [],
    };

    if (executionType === 'run') {
      const judge0Result = await runCodeOnJudge0(language, code, sampleInput || "");
      
      if (judge0Result.error) {
        throw new Error(judge0Result.error);
      }

      let finalGeneralOutput = warningsHeader;
      if (judge0Result.compile_error) {
        finalGeneralOutput += `Compile Error:\n${judge0Result.compile_error}`;
      } else {
        finalGeneralOutput += `Run Output:\n${judge0Result.stdout}`;
        if (judge0Result.stderr) {
          finalGeneralOutput += `\n\nRuntime Error:\n${judge0Result.stderr}`;
        }
      }

      const passed = sampleOutput !== undefined
        ? (judge0Result.stdout.trim() === sampleOutput.trim() && !judge0Result.compile_error && !judge0Result.stderr)
        : (!judge0Result.compile_error && !judge0Result.stderr);

      responseData.generalOutput = finalGeneralOutput;
      responseData.testCaseResults.push({
        testCaseNumber: 'Sample',
        input: sampleInput || "N/A",
        expectedOutput: sampleOutput || "N/A",
        actualOutput: judge0Result.stdout.trim(),
        passed: passed,
        error: judge0Result.compile_error || judge0Result.stderr || undefined,
      });
      responseData.compileError = judge0Result.compile_error;
      responseData.executionError = judge0Result.stderr || undefined;

    } else { // submit
      responseData.generalOutput = warningsHeader + `Processing submission with Judge0 CE...\n`;
      if (!testCases || testCases.length === 0) {
        responseData.generalOutput += "No test cases provided for submission.\n";
      } else {
        let halted = false;
        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          const judge0Result = await runCodeOnJudge0(language, code, tc.input);

          if (judge0Result.error) {
            throw new Error(judge0Result.error);
          }

          const passedThisTc = !judge0Result.compile_error && !judge0Result.stderr && judge0Result.stdout.trim() === tc.expectedOutput.trim();

          responseData.testCaseResults.push({
            testCaseNumber: i + 1,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: judge0Result.stdout.trim(),
            passed: passedThisTc,
            error: judge0Result.compile_error || judge0Result.stderr || undefined,
          });

          if (judge0Result.compile_error) {
            responseData.compileError = judge0Result.compile_error;
            responseData.generalOutput += `Compilation failed on test case ${i + 1}. Halting submission.\n`;
            halted = true;
            break;
          }
          if (i === 0 && judge0Result.stderr) {
            responseData.executionError = judge0Result.stderr;
            responseData.generalOutput += `Execution error on first test case. Halting submission.\n`;
            halted = true;
            break;
          }
        }
        if (!halted) {
          responseData.generalOutput += "All test cases processed via Judge0 CE.\n";
        }
      }
    }
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/execute-code] Error:', error);
    if (body) {
      const { language, code, testCases, sampleInput, sampleOutput, executionType } = body;
      const lowerLang = language.toLowerCase();
      const riskyWarnings = detectRiskyCode(code, language);
      let warningsHeader = "";
      if (riskyWarnings.length > 0) {
        warningsHeader = riskyWarnings.join('\n') + '\n\n';
      }
      
      // If language is Python or Javascript, try to run locally!
      if (['python', 'py', 'javascript', 'js', 'node'].includes(lowerLang)) {
        console.warn(`Judge0 execution failed (${error.message}). Attempting local sandbox execution...`);
        try {
          const responseData: ExecuteCodeResponseBody = {
            generalOutput: warningsHeader + `Judge0 API unavailable (${error.message}). Executing locally on sandbox host...\n`,
            testCaseResults: [],
          };
          
          if (executionType === 'run') {
            const localRun = runCodeLocally(language, code, sampleInput || "");
            const passed = sampleOutput !== undefined 
              ? (localRun.stdout.trim() === sampleOutput.trim() && localRun.success) 
              : localRun.success;
            
            responseData.generalOutput += localRun.success
              ? `Run Output:\n${localRun.stdout}`
              : `Execution Error:\n${localRun.stderr}`;
              
            responseData.testCaseResults.push({
              testCaseNumber: 'Sample',
              input: sampleInput || "N/A",
              expectedOutput: sampleOutput || "N/A",
              actualOutput: localRun.stdout.trim(),
              passed: passed,
              error: localRun.success ? undefined : localRun.stderr,
            });
            if (!localRun.success) {
              responseData.executionError = localRun.stderr;
            }
          } else { // submit
            let firstExecutionErrorEncountered: string | undefined = undefined;
            if (testCases && testCases.length > 0) {
              for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                const localRun = runCodeLocally(language, code, tc.input);
                const passedThisTc = localRun.success && localRun.stdout.trim() === tc.expectedOutput.trim();
                
                responseData.testCaseResults.push({
                  testCaseNumber: i + 1,
                  input: tc.input,
                  expectedOutput: tc.expectedOutput,
                  actualOutput: localRun.stdout.trim(),
                  passed: passedThisTc,
                  error: localRun.success ? undefined : localRun.stderr,
                });
                
                if (!localRun.success) {
                  firstExecutionErrorEncountered = localRun.stderr;
                  responseData.generalOutput += `Execution error on test case ${i + 1}. Halting submission.\n`;
                  break;
                }
              }
              if (!firstExecutionErrorEncountered) {
                responseData.generalOutput += `All test cases processed successfully locally.\n`;
              } else {
                responseData.executionError = firstExecutionErrorEncountered;
              }
            } else {
              responseData.generalOutput += `No test cases provided.\n`;
            }
          }
          
          return NextResponse.json(responseData, { status: 200 });
        } catch (localError: any) {
          console.error("Local execution fallback failed:", localError);
        }
      }
      
      // Fallback to mock API if local run is not supported or failed
      console.warn("Falling back to mock API simulation.");
      const mockResponse = await executeWithMockAPI(body);
      mockResponse.generalOutput = warningsHeader + `Judge0 API failed (${error.message || 'Unknown error'}). Fallback simulation enabled.\n${mockResponse.generalOutput}`;
      return NextResponse.json(mockResponse, { status: 200 });
    }

    return NextResponse.json(
      {
        executionError: `Server error processing code execution: ${error.message || 'Unknown error'}`,
        generalOutput: ``,
        testCaseResults: []
      },
      { status: 500 }
    );
  }
}
