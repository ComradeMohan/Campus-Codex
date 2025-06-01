
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, getDocs, orderBy, updateDoc, increment, serverTimestamp, FieldValue } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { MonacoCodeEditor } from '@/components/editor/MonacoCodeEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
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
  const [enrollmentProgress, setEnrollmentProgress] = useState<EnrolledLanguageProgress | null>(null);
  const [totalPossibleLanguageScore, setTotalPossibleLanguageScore] = useState(0);

  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);


  const fetchLanguageAndQuestions = useCallback(async () => {
    if (!userProfile?.collegeId || !languageId || !userProfile?.uid) {
      if(!authLoading && !userProfile) {
         toast({ title: "Error", description: "User not authenticated. Redirecting to login.", variant: "destructive" });
         router.push('/login');
      } else if (!authLoading && userProfile && (!userProfile.collegeId || !languageId)) {
         toast({ title: "Error", description: "Missing user college or language information.", variant: "destructive" });
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
        setTotalPossibleLanguageScore(0);
      } else {
        let totalScoreCalc = 0;
        for (const q of fetchedQuestions) {
          totalScoreCalc += q.maxScore || 100;
        }
        setTotalPossibleLanguageScore(totalScoreCalc);
      }
      setQuestions(fetchedQuestions);
      setCurrentQuestionIndex(0);

      const enrollmentRef = doc(db, 'users', userProfile.uid, 'enrolledLanguages', languageId);
      const enrollmentSnap = await getDoc(enrollmentRef);
      if (enrollmentSnap.exists()) {
        setEnrollmentProgress(enrollmentSnap.data() as EnrolledLanguageProgress);
      } else {
        console.warn("Enrollment progress not found for this language.");
        setEnrollmentProgress(null);
      }

    } catch (error) {
      console.error("Error fetching course/questions/progress:", error);
      toast({ title: "Error", description: "Failed to load course data or your progress.", variant: "destructive" });
    } finally {
      setIsLoadingPageData(false);
    }
  }, [userProfile?.collegeId, userProfile?.uid, languageId, toast, router, authLoading]);

  useEffect(() => {
    if (!authLoading && userProfile) {
        fetchLanguageAndQuestions();
    }
  }, [authLoading, userProfile, fetchLanguageAndQuestions]);

  useEffect(() => {
    if (language && questions.length > 0 && questions[currentQuestionIndex]) {
      const currentQ = questions[currentQuestionIndex];
      let initialCode = `// Start writing your ${language.name} code here for Question ${currentQuestionIndex + 1}\n// ${currentQ.questionText.substring(0,50)}...\n\n`;
      initialCode += `/*\nSample Input:\n${currentQ.sampleInput || 'N/A'}\n\nSample Output:\n${currentQ.sampleOutput || 'N/A'}\n*/\n\n`;

      const savedCode = enrollmentProgress?.completedQuestions?.[currentQ.id]?.submittedCode;

      if (savedCode) {
        initialCode = savedCode;
      } else {
        if (language.name.toLowerCase() === 'python') {
          initialCode += `# Your Python code here\ndef main():\n    # Read input if necessary, for example:\n    # line = input()\n    # print(f"Processing: {line}")\n    pass\n\nif __name__ == "__main__":\n    main()\n`;
        } else if (language.name.toLowerCase() === 'javascript') {
          initialCode += `// Your JavaScript code here\nfunction main() {\n    // In a Node.js environment for competitive programming, you might read from process.stdin\n    // For example, using 'readline' module if available in the execution sandbox.\n    // console.log("Hello from JavaScript!");\n}\n\nmain();\n`;
        } else if (language.name.toLowerCase() === 'java') {
          initialCode += `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Scanner scanner = new Scanner(System.in);\n        // String input = scanner.nextLine();\n        // System.out.println("Processing: " + input);\n        // scanner.close();\n    }\n}\n`;
        }
      }
      setStudentCode(initialCode);
      setOutput('');
      setTestResults([]);
      setExecutionError(null);
      setCompileError(null);
    } else if (language && questions.length === 0 && !isLoadingPageData) {
      setStudentCode(`// No questions available for ${language.name} yet.\n`);
      setOutput('');
      setTestResults([]);
      setExecutionError(null);
      setCompileError(null);
    }
  }, [currentQuestionIndex, questions, language, isLoadingPageData, enrollmentProgress]);


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
            const errorData = await response.json().catch(() => ({ message: "Failed to process the request. Server returned an error." }));
            const serverErrorMessage = errorData.executionError || errorData.message || `Server error: ${response.status}`;
            throw new Error(serverErrorMessage);
        }

        const result = await response.json();

        setOutput(result.generalOutput || '');
        setTestResults(result.testCaseResults || []);
        if (result.compileError) {
          setCompileError(result.compileError);
          if (executionType === 'run') {
            toast({ title: "Compilation Error", description: "Please fix the errors in your code.", variant: "destructive"});
          }
        }
        if (result.executionError) {
          setExecutionError(result.executionError);
           if (executionType === 'run' && !result.compileError) {
            toast({ title: "Runtime Error", description: "Your code encountered an error during sample execution.", variant: "destructive"});
          }
        }


        if (executionType === 'submit' && !result.compileError && !result.executionError) {
            const allPassed = result.testCaseResults?.every((tc: TestCaseResult) => tc.passed);
            if (result.testCaseResults?.length > 0) {
                const enrollmentRef = doc(db, 'users', userProfile.uid, 'enrolledLanguages', languageId);
                const enrollmentSnap = await getDoc(enrollmentRef);

                if (enrollmentSnap.exists()) {
                    const currentProgressData = enrollmentSnap.data() as EnrolledLanguageProgress;
                    let scoreEarned = currentQuestion.maxScore || 100;
                    let isNewCompletion = true;

                    if (currentProgressData.completedQuestions && currentProgressData.completedQuestions[currentQuestion.id]) {
                        scoreEarned = 0; 
                        isNewCompletion = false;
                    }

                    if (allPassed) {
                        const updates: { [key: string]: any } = {
                             [`completedQuestions.${currentQuestion.id}.submittedCode`]: studentCode,
                             [`completedQuestions.${currentQuestion.id}.completedAt`]: serverTimestamp(),
                        };
                        if (isNewCompletion) {
                            updates.currentScore = increment(scoreEarned);
                            updates[`completedQuestions.${currentQuestion.id}.scoreAchieved`] = scoreEarned;
                        } else {
                            updates[`completedQuestions.${currentQuestion.id}.scoreAchieved`] = currentProgressData.completedQuestions[currentQuestion.id]?.scoreAchieved || 0;
                        }

                        await updateDoc(enrollmentRef, updates);
                        
                        setEnrollmentProgress(prev => {
                            const newCompletedQuestions = {
                                ...(prev?.completedQuestions || {}),
                                [currentQuestion.id]: {
                                    scoreAchieved: updates[`completedQuestions.${currentQuestion.id}.scoreAchieved`],
                                    completedAt: serverTimestamp() as FieldValue,
                                    submittedCode: studentCode,
                                },
                            };
                            const newProgress = {
                                ...(prev || { languageId, languageName: language.name, enrolledAt: serverTimestamp(), currentScore:0, completedQuestions: {} } as EnrolledLanguageProgress),
                                currentScore: isNewCompletion ? (prev?.currentScore || 0) + scoreEarned : (prev?.currentScore || 0),
                                completedQuestions: newCompletedQuestions,
                            };
                            return newProgress;
                        });


                        if (isNewCompletion) {
                            toast({
                                title: "All Tests Passed!",
                                description: `Great job! You earned ${currentQuestion.maxScore || 100} points. Your solution passed all test cases and has been saved.`,
                                variant: "default",
                            });
                        } else {
                             toast({
                                title: "Question Re-submitted Successfully!",
                                description: "Your new solution passed all test cases and has been saved. No additional score awarded as this question was already completed.",
                                variant: "default",
                            });
                        }
                    } else {
                         toast({
                            title: "Some Tests Failed",
                            description: "Review the results below and try again. Your code was not saved.",
                            variant: "destructive",
                        });
                    }
                } else {
                     toast({
                        title: "Enrollment Error",
                        description: "Could not find your enrollment for this course to update score and save code.",
                        variant: "destructive",
                    });
                }
            } else if (!result.compileError && !result.executionError) {
                 toast({
                    title: "Submission Processed",
                    description: "Your code was submitted, but no test results were returned or no test cases defined for this scenario.",
                    variant: "default",
                });
            }
        }

    } catch (error: any) {
        console.error(`Error ${executionType}ing code:`, error);
        const errorMessage = error.message || `Failed to ${executionType} code.`;
        setOutput(prev => prev + `\nClient-side error during execution: ${errorMessage}`);
        setExecutionError(`Client-side error: ${errorMessage}`);
        toast({ title: `${executionType === 'run' ? 'Run' : 'Submission'} Error`, description: errorMessage, variant: "destructive" });
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

  if (!language && !isLoadingPageData) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-lg text-muted-foreground">Could not load course details.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/student/labs">Back to Labs</Link>
        </Button>
      </div>
    );
  }

  const currentProgressPercent = enrollmentProgress && totalPossibleLanguageScore > 0
    ? Math.round((enrollmentProgress.currentScore / totalPossibleLanguageScore) * 100)
    : 0;

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

      {language && enrollmentProgress && totalPossibleLanguageScore > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Overall {language.name} Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={currentProgressPercent} className="w-full h-3 mb-1" />
            <p className="text-sm text-muted-foreground text-right">
              {enrollmentProgress.currentScore} / {totalPossibleLanguageScore} points ({currentProgressPercent}%)
            </p>
          </CardContent>
        </Card>
      )}


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
      ) : currentQuestion && language ? (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                    <CardTitle className="text-xl font-semibold mb-1">Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant={getDifficultyBadgeVariant(currentQuestion.difficulty)} className="capitalize text-xs px-2 py-0.5">
                           <Tag className="w-3 h-3 mr-1" /> {currentQuestion.difficulty || 'easy'}
                        </Badge>
                        {enrollmentProgress?.completedQuestions?.[currentQuestion.id] ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white capitalize text-xs px-2 py-0.5">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Score Achieved: {enrollmentProgress.completedQuestions[currentQuestion.id].scoreAchieved}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                                <Star className="w-3 h-3 mr-1" /> Max Score: {currentQuestion.maxScore || 100}
                            </Badge>
                        )}
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
                  height="500px"
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
                        <pre className="whitespace-pre-wrap font-mono text-xs">{compileError}</pre>
                    </div>
                )}
                {executionError && !compileError && (
                     <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
                        <div className="flex items-center font-semibold mb-1"><AlertTriangle className="w-4 h-4 mr-2" />Execution Error:</div>
                        <pre className="whitespace-pre-wrap font-mono text-xs">{executionError}</pre>
                    </div>
                )}
                <pre
                  className="font-mono text-sm bg-muted/50 p-4 rounded-md min-h-[150px] max-h-[300px] overflow-y-auto whitespace-pre-wrap"
                  aria-live="polite"
                >
                  {output || "Code output and test results will appear here..."}
                </pre>

                {testResults.length > 0 && !compileError && (
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
                           {result.error && <div className="text-red-600"><strong className="text-muted-foreground">Error Detail:</strong> <pre className="inline whitespace-pre-wrap font-mono bg-muted/30 p-1 rounded text-xs">{result.error}</pre></div>}
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

