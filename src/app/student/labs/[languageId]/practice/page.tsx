
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, getDocs, orderBy, updateDoc, arrayUnion, increment, serverTimestamp, FieldValue } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea'; // Replaced by Monaco Editor
import { MonacoCodeEditor } from '@/components/editor/MonacoCodeEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Lightbulb, Terminal, ChevronLeft, ChevronRight, BookOpen, CheckCircle, XCircle, AlertTriangle, Tag, Star, Play, CheckSquare } from 'lucide-react';
import type { ProgrammingLanguage, Question as QuestionType, QuestionDifficulty, EnrolledLanguageProgress } from '@/types';

interface TestCaseResult {
  testCaseNumber: number | string; 
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
  const [isExecutingCode, setIsExecutingCode] = useState(false); 
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

      const questionsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'questions');
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
    if (!authLoading && userProfile) { // Check userProfile as well
        fetchLanguageAndQuestions();
    }
  }, [authLoading, userProfile, fetchLanguageAndQuestions]);
  
  useEffect(() => {
    // Reset code and output when the question changes or language loads (and questions are available)
    if (language && questions.length > 0 && questions[currentQuestionIndex]) {
      setStudentCode(`// Start writing your ${language.name} code here for Question ${currentQuestionIndex + 1}\n// ${questions[currentQuestionIndex].questionText.substring(0,50)}...\n\n/*\nSample Input:\n${questions[currentQuestionIndex].sampleInput || 'N/A'}\n\nSample Output:\n${questions[currentQuestionIndex].sampleOutput || 'N/A'}\n*/\n\n`);
      setOutput('');
      setTestResults([]);
      setExecutionError(null);
      setCompileError(null);
    } else if (language && questions.length === 0 && !isLoadingPageData) { // Check isLoadingPageData
      setStudentCode(`// No questions available for ${language.name} yet.\n`);
      setOutput('');
      setTestResults([]);
    }
  }, [currentQuestionIndex, questions, language, isLoadingPageData]); // Added isLoadingPageData


  const currentQuestion = questions[currentQuestionIndex];

  const executeCodeApiCall = async (executionType: 'run' | 'submit') => {
    if (!currentQuestion || !language || !userProfile) {
        toast({title: "Cannot run code", description: "Question, language, or user profile not loaded.", variant: "destructive"});
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
        } else { 
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

        if (executionType === 'submit' && !result.compileError && !result.executionError) {
            const allPassed = result.testCaseResults?.every((tc: TestCaseResult) => tc.passed);
            if (result.testCaseResults?.length > 0) {
                if (allPassed) {
                    const enrollmentRef = doc(db, 'users', userProfile.uid, 'enrolledLanguages', languageId);
                    const enrollmentSnap = await getDoc(enrollmentRef);
                    let scoreEarned = currentQuestion.maxScore || 100;

                    if (enrollmentSnap.exists()) {
                        const progress = enrollmentSnap.data() as EnrolledLanguageProgress;
                        if (progress.completedQuestions && progress.completedQuestions[currentQuestion.id]) {
                             toast({
                                title: "Question Already Completed",
                                description: "You have already successfully completed this question. No additional score awarded.",
                                variant: "default",
                            });
                            scoreEarned = 0; // No score for re-completion
                        } else {
                            // Using FieldValue for atomicity
                            const updates: { [key: string]: any } = {
                                currentScore: increment(scoreEarned),
                                [`completedQuestions.${currentQuestion.id}`]: {
                                    scoreAchieved: scoreEarned,
                                    completedAt: serverTimestamp() as FieldValue,
                                }
                            };
                            await updateDoc(enrollmentRef, updates);
                            toast({
                                title: "All Tests Passed!",
                                description: `Great job! You earned ${scoreEarned} points. Your solution passed all test cases.`,
                                variant: "default", // "default" for success, but "success" variant is not standard in shadcn
                            });
                        }
                    } else {
                        // This case should ideally not happen if enrollment is done correctly
                         toast({
                            title: "Enrollment Error",
                            description: "Could not find your enrollment for this course to update score.",
                            variant: "destructive",
                        });
                    }
                } else {
                     toast({
                        title: "Some Tests Failed",
                        description: "Review the results below and try again.",
                        variant: "destructive",
                    });
                }
            } else {
                 toast({
                    title: "No Test Results",
                    description: "Submission processed, but no test results were returned.",
                    variant: "default",
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
      setCurrentQuestionIndex(prev => prev + 1);
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

  if (authLoading || (isLoadingPageData && !language)) {
    return (
      <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading Practice Lab...</p>
      </div>
    );
  }

  if (!language && !isLoadingPageData) { // Added !isLoadingPageData check
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
          Practice: {language?.name || 'Course'}
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
            <p className="text-muted-foreground">There are currently no questions available for this {language?.name} course. Please check back later, or inform your instructor.</p>
          </CardContent>
        </Card>
      ) : !currentQuestion && !isLoadingPageData ? (
         <Card className="shadow-lg">
          <CardHeader><CardTitle>Loading Question...</CardTitle></CardHeader>
          <CardContent><Loader2 className="h-8 w-8 animate-spin text-primary"/></CardContent>
        </Card>
      ) : currentQuestion && language ? ( // Ensure language is also loaded
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
                <MonacoCodeEditor
                  language={language.name}
                  value={studentCode}
                  onChange={(code) => setStudentCode(code || '')}
                  height="500px" // Adjust height as needed
                  options={{ readOnly: isExecutingCode }}
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
                <pre 
                  className="font-mono text-sm bg-muted/50 p-4 rounded-md min-h-[150px] max-h-[300px] overflow-y-auto whitespace-pre-wrap"
                  aria-live="polite"
                >
                  {output || "Code output and test results will appear here..."}
                </pre>
                
                {testResults.length > 0 && (
                  <div className="mt-4 space-y-3 max-h-[250px] overflow-y-auto">
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
