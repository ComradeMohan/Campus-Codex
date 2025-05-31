
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Lightbulb, Terminal, ChevronLeft, ChevronRight, BookOpen, CheckCircle, XCircle, AlertTriangle, Tag, Star, Play, CheckSquare } from 'lucide-react';
import type { ProgrammingLanguage, Question as QuestionType, TestCase, QuestionDifficulty } from '@/types';
import { Separator } from '@/components/ui/separator';

interface TestCaseResult {
  testCaseNumber: number | string; // Can be 'Sample'
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
}

export default function StudentPracticePage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = params.languageId as string;

  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentCode, setStudentCode] = useState('');
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);

  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isExecutingCode, setIsExecutingCode] = useState(false); // Generic for any execution
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);


  const fetchLanguageAndQuestions = useCallback(async () => {
    if (!userProfile?.collegeId || !languageId) {
      if(!authLoading) {
         toast({ title: "Error", description: "Missing user or language information.", variant: "destructive" });
         router.push('/student/labs');
      }
      return;
    }
    setIsLoadingPageData(true);
    setOutput('');
    setTestResults([]);
    setExecutionError(null);
    setCompileError(null);
    try {
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (!langSnap.exists()) {
        toast({ title: "Error", description: "Course not found.", variant: "destructive" });
        router.push('/student/labs');
        return;
      }
      const langData = { id: langSnap.id, ...langSnap.data() } as ProgrammingLanguage;
      setLanguage(langData);
      // Initial code snippet will be set in the useEffect for question change


      const questionsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'questions');
      // Consider difficulty or other sort order later. For now, using createdAt to maintain some consistency.
      const qQuery = query(questionsRef, orderBy('createdAt', 'asc')); 
      const questionsSnap = await getDocs(qQuery);
      const fetchedQuestions = questionsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as QuestionType));

      if (fetchedQuestions.length === 0) {
        toast({ title: "No Questions", description: `This ${langData.name} course doesn't have any questions yet. Check back later!`, variant: "default" });
      }
      setQuestions(fetchedQuestions);
      setCurrentQuestionIndex(0);

    } catch (error) {
      console.error("Error fetching course/questions:", error);
      toast({ title: "Error", description: "Failed to load course or questions.", variant: "destructive" });
    } finally {
      setIsLoadingPageData(false);
    }
  }, [userProfile?.collegeId, languageId, toast, router, authLoading]);

  useEffect(() => {
    if (!authLoading) {
        fetchLanguageAndQuestions();
    }
  }, [authLoading, fetchLanguageAndQuestions]);
  
  useEffect(() => {
    if (language && questions.length > 0 && questions[currentQuestionIndex]) {
      setStudentCode(`// Start writing your ${language.name} code here for Question ${currentQuestionIndex + 1}\n// ${questions[currentQuestionIndex].questionText.substring(0,50)}...\n\n`);
      setOutput('');
      setTestResults([]);
      setExecutionError(null);
      setCompileError(null);
    } else if (language && questions.length === 0) {
      // Handle case where language is loaded but no questions
      setStudentCode(`// No questions available for ${language.name} yet.\n`);
      setOutput('');
      setTestResults([]);
    }
  }, [currentQuestionIndex, questions, language]);


  const currentQuestion = questions[currentQuestionIndex];

  const executeCodeApiCall = async (executionType: 'run' | 'submit') => {
    if (!currentQuestion || !language) {
        toast({title: "Cannot run code", description: "Question or language not loaded.", variant: "destructive"});
        return;
    }
    setIsExecutingCode(true);
    setOutput(`Executing your code (${executionType} mode)...\n`);
    setTestResults([]);
    setExecutionError(null);
    setCompileError(null);

    try {
        const payload: any = {
            language: language.name,
            code: studentCode,
            executionType: executionType,
        };

        if (executionType === 'run') {
            payload.sampleInput = currentQuestion.sampleInput || "";
            payload.sampleOutput = currentQuestion.sampleOutput || "";
        } else { // submit
            payload.testCases = currentQuestion.testCases;
        }

        const response = await fetch('/api/execute-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ executionError: "Failed to process the request. Server returned an error." }));
            throw new Error(errorData.executionError || `Server error: ${response.status}`);
        }

        const result = await response.json();
        setOutput(result.generalOutput || '');
        setTestResults(result.testCaseResults || []);
        if (result.compileError) setCompileError(result.compileError);
        if (result.executionError) setExecutionError(result.executionError);

        if (executionType === 'submit') {
            const allPassed = result.testCaseResults?.every((tc: TestCaseResult) => tc.passed);
            if (result.testCaseResults?.length > 0) {
                toast({
                    title: allPassed ? "All Tests Passed!" : "Some Tests Failed",
                    description: allPassed ? "Great job! Your solution passed all test cases." : "Review the results below and try again.",
                    variant: allPassed ? "default" : "destructive",
                });
            }
        }

    } catch (error: any) {
        console.error(`Error ${executionType}ing code:`, error);
        setOutput(prev => prev + `\nClient-side error during execution: ${error.message}`);
        setExecutionError(`Client-side error: ${error.message}`);
        toast({ title: `${executionType === 'run' ? 'Run' : 'Submission'} Error`, description: error.message || `Failed to ${executionType} code.`, variant: "destructive" });
    } finally {
        setIsExecutingCode(false);
    }
  };

  const handleRunSample = () => executeCodeApiCall('run');
  const handleSubmitTestCases = () => executeCodeApiCall('submit');


  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleCodeEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd } = textarea;
    const tabSpaces = '    '; // 4 spaces for a tab
    const currentValue = studentCode;

    // This basic tab handler helps with manual indentation.
    // For a full IDE experience (syntax highlighting, language-specific auto-indent),
    // consider integrating a library like Monaco Editor or CodeMirror.
    if (event.key === 'Tab') {
      event.preventDefault();

      const textBeforeSelectionStart = currentValue.substring(0, selectionStart);
      // const selectedText = currentValue.substring(selectionStart, selectionEnd); // Not directly used in this simplified logic

      const startLineIndex = textBeforeSelectionStart.split('\n').length - 1;
      let effectiveSelectionEnd = selectionEnd;
      // If selection ends with a newline, consider the line before it for multi-line operations
      if (selectionStart !== selectionEnd && currentValue[selectionEnd - 1] === '\n') {
        effectiveSelectionEnd = selectionEnd - 1;
      }
      const endLineIndex = currentValue.substring(0, effectiveSelectionEnd).split('\n').length - 1;

      const lines = currentValue.split('\n');
      let newStudentCode = currentValue;
      let newSelectionStart = selectionStart;
      let newSelectionEnd = selectionEnd;

      if (selectionStart !== selectionEnd && startLineIndex !== endLineIndex) { // Multi-line selection
        let accumulatedChange = 0;
        const modifiedLines = lines.map((line, index) => {
          if (index >= startLineIndex && index <= endLineIndex) {
            if (event.shiftKey) { // Un-indent
              if (line.startsWith(tabSpaces)) {
                const change = -tabSpaces.length;
                if (index === startLineIndex) newSelectionStart = Math.max(textBeforeSelectionStart.lastIndexOf('\n') + 1, selectionStart + change);
                accumulatedChange += change;
                return line.substring(tabSpaces.length);
              } else if (line.startsWith('\t')) { // Also handle actual tab characters if present
                const change = -1;
                if (index === startLineIndex) newSelectionStart = Math.max(textBeforeSelectionStart.lastIndexOf('\n') + 1, selectionStart + change);
                accumulatedChange += change;
                return line.substring(1);
              }
            } else { // Indent
              const change = tabSpaces.length;
              if (index === startLineIndex) newSelectionStart = selectionStart + change;
              accumulatedChange += change;
              return tabSpaces + line;
            }
          }
          return line;
        });
        newStudentCode = modifiedLines.join('\n');
        newSelectionEnd = selectionEnd + accumulatedChange;
        // Ensure selection start doesn't go before the line start on un-indent
        if (event.shiftKey && startLineIndex === endLineIndex) {
             const currentLineStartAbs = textBeforeSelectionStart.lastIndexOf('\n') +1;
             if(newSelectionStart < currentLineStartAbs) newSelectionStart = currentLineStartAbs;
        }
      } else { // Single line or selection within a single line
        const currentLineStartAbs = textBeforeSelectionStart.lastIndexOf('\n') + 1;
        if (event.shiftKey) { // Un-indent current line
          if (lines[startLineIndex].startsWith(tabSpaces)) {
            lines[startLineIndex] = lines[startLineIndex].substring(tabSpaces.length);
            newStudentCode = lines.join('\n');
            const change = -tabSpaces.length;
            newSelectionStart = Math.max(currentLineStartAbs, selectionStart + change);
            newSelectionEnd = Math.max(currentLineStartAbs, selectionEnd + change);
          } else if (lines[startLineIndex].startsWith('\t')) {
            lines[startLineIndex] = lines[startLineIndex].substring(1);
            newStudentCode = lines.join('\n');
            const change = -1;
            newSelectionStart = Math.max(currentLineStartAbs, selectionStart + change);
            newSelectionEnd = Math.max(currentLineStartAbs, selectionEnd + change);
          }
        } else { // Indent at cursor or selected text
          const textToInsert = tabSpaces;
          newStudentCode = currentValue.substring(0, selectionStart) + textToInsert + currentValue.substring(selectionEnd);
          newSelectionStart = selectionStart + textToInsert.length;
          newSelectionEnd = newSelectionStart;
        }
      }

      setStudentCode(newStudentCode);
      // Use setTimeout to ensure the state update has propagated before setting selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newSelectionStart, Math.max(newSelectionStart, newSelectionEnd));
      }, 0);
    }
  };

  const getDifficultyBadgeVariant = (difficulty?: QuestionDifficulty) => {
    const effDifficulty = difficulty || 'easy';
    switch (effDifficulty) {
      case 'easy': return 'default'; 
      case 'medium': return 'secondary';
      case 'hard': return 'destructive';
      default: return 'outline';
    }
  };

  if (authLoading || isLoadingPageData && !language) {
    return (
      <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading Practice Lab...</p>
      </div>
    );
  }

  if (!language) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-lg text-muted-foreground">Could not load course details.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/student/labs">Back to Labs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline flex items-center">
          <BookOpen className="w-8 h-8 mr-3 text-primary" />
          Practice: {language.name}
        </h1>
        <Button asChild variant="outline">
          <Link href="/student/labs" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Labs
          </Link>
        </Button>
      </div>

      {questions.length === 0 && !isLoadingPageData ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>No Questions Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">There are currently no questions available for this {language.name} course. Please check back later, or inform your instructor.</p>
          </CardContent>
        </Card>
      ) : !currentQuestion && !isLoadingPageData ? (
         <Card className="shadow-lg">
          <CardHeader><CardTitle>Loading Question...</CardTitle></CardHeader>
          <CardContent><Loader2 className="h-8 w-8 animate-spin text-primary"/></CardContent>
        </Card>
      ) : currentQuestion ? (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                    <CardTitle className="text-xl font-semibold mb-1">Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getDifficultyBadgeVariant(currentQuestion.difficulty)} className="capitalize text-xs px-2 py-0.5">
                           <Tag className="w-3 h-3 mr-1" /> {currentQuestion.difficulty || 'easy'}
                        </Badge>
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                            <Star className="w-3 h-3 mr-1" /> Max Score: {currentQuestion.maxScore || 100}
                        </Badge>
                    </div>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <Button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0 || isExecutingCode} variant="outline" size="sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <Button onClick={handleNextQuestion} disabled={currentQuestionIndex === questions.length - 1 || isExecutingCode} variant="outline" size="sm">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              <CardDescription className="mt-3">Read the problem statement carefully and write your solution below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base whitespace-pre-wrap">{currentQuestion.questionText}</p>
              {currentQuestion.sampleInput && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Sample Input:</h4>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">{currentQuestion.sampleInput}</pre>
                </div>
              )}
              {currentQuestion.sampleOutput && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Sample Output:</h4>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">{currentQuestion.sampleOutput}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><Terminal className="w-5 h-5 mr-2" /> Your Code</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  onKeyDown={handleCodeEditorKeyDown}
                  placeholder={`Write your ${language.name} code here...`}
                  rows={15}
                  className="font-mono text-sm bg-background"
                  disabled={isExecutingCode}
                  spellCheck="false"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><Lightbulb className="w-5 h-5 mr-2" /> Output / Console</CardTitle>
              </CardHeader>
              <CardContent>
                {compileError && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
                        <div className="flex items-center font-semibold mb-1"><AlertTriangle className="w-4 h-4 mr-2" />Compilation Error:</div>
                        <pre className="whitespace-pre-wrap font-mono">{compileError}</pre>
                    </div>
                )}
                {executionError && (
                     <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
                        <div className="flex items-center font-semibold mb-1"><AlertTriangle className="w-4 h-4 mr-2" />Execution Error:</div>
                        <pre className="whitespace-pre-wrap font-mono">{executionError}</pre>
                    </div>
                )}
                <Textarea
                  value={output}
                  readOnly
                  placeholder="Code output and test results will appear here..."
                  rows={10}
                  className="font-mono text-sm bg-muted/50"
                />
                {testResults.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-md font-semibold">Test Case Results:</h4>
                    {testResults.map((result) => (
                      <Card key={result.testCaseNumber.toString()} className={`p-3 ${result.passed ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">Test Case {result.testCaseNumber}</span>
                          {result.passed ? (
                            <span className="text-xs font-semibold text-green-700 bg-green-200 px-2 py-0.5 rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> PASSED</span>
                          ) : (
                            <span className="text-xs font-semibold text-red-700 bg-red-200 px-2 py-0.5 rounded-full flex items-center"><XCircle className="w-3 h-3 mr-1"/> FAILED</span>
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <div><strong className="text-muted-foreground">Input:</strong> <pre className="inline whitespace-pre-wrap font-mono bg-muted/30 p-1 rounded text-xs">{result.input}</pre></div>
                          <div><strong className="text-muted-foreground">Expected:</strong> <pre className="inline whitespace-pre-wrap font-mono bg-muted/30 p-1 rounded text-xs">{result.expectedOutput}</pre></div>
                           {!result.passed && <div><strong className="text-muted-foreground">Actual:</strong> <pre className="inline whitespace-pre-wrap font-mono bg-muted/30 p-1 rounded text-xs">{result.actualOutput}</pre></div>}
                           {result.error && <div className="text-red-600"><strong className="text-muted-foreground">Error:</strong> {result.error}</div>}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                 <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleRunSample} disabled={isExecutingCode || !studentCode.trim()} className="flex-1" variant="outline">
                    {isExecutingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Play className="mr-2 h-4 w-4" />
                    Run with Sample
                    </Button>
                    <Button onClick={handleSubmitTestCases} disabled={isExecutingCode || !studentCode.trim()} className="flex-1">
                    {isExecutingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Submit & Test All
                    </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading question content...</p>
        </div>
      )}
    </div>
  );
}
