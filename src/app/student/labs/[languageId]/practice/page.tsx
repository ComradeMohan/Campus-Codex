
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Lightbulb, Terminal, ChevronLeft, ChevronRight, BookOpen, CheckCircle, XCircle, AlertTriangle, Tag, Star, Play, CheckSquare, Briefcase, PackageSearch } from 'lucide-react';
import type { ProgrammingLanguage, Question as QuestionType, QuestionDifficulty, EnrolledLanguageProgress } from '@/types';

interface TestCaseResult {
  testCaseNumber: number | string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
}

const PLACEMENTS_COURSE_NAME = "Placements"; // Define a constant for "Placements"

export default function StudentPracticePage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = params.languageId as string;

  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null); // The current lab/course (could be "Placements")
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentCode, setStudentCode] = useState('');
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [enrollmentProgress, setEnrollmentProgress] = useState<EnrolledLanguageProgress | null>(null);
  const [totalPossibleLanguageScore, setTotalPossibleLanguageScore] = useState(0);

  const [allStudentEnrolledLanguages, setAllStudentEnrolledLanguages] = useState<ProgrammingLanguage[]>([]); // All languages student is enrolled in
  const [selectedSolveLanguage, setSelectedSolveLanguage] = useState<ProgrammingLanguage | null>(null); // Language selected by student for solving placement Qs

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

      // If this is the Placements course, fetch all other enrolled languages for the dropdown
      if (langData.name === PLACEMENTS_COURSE_NAME) {
        const enrolledLangsRef = collection(db, 'users', userProfile.uid, 'enrolledLanguages');
        const enrolledLangsSnap = await getDocs(enrolledLangsRef);
        const studentLangs: ProgrammingLanguage[] = [];
        
        for (const elDoc of enrolledLangsSnap.docs) {
          if (elDoc.id === languageId) continue; // Skip "Placements" itself

          const actualLangDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', elDoc.id);
          const actualLangSnap = await getDoc(actualLangDocRef);
          if (actualLangSnap.exists()) {
            studentLangs.push({ id: actualLangSnap.id, ...actualLangSnap.data() } as ProgrammingLanguage);
          }
        }
        setAllStudentEnrolledLanguages(studentLangs.sort((a,b) => a.name.localeCompare(b.name)));
        if (studentLangs.length > 0) {
          setSelectedSolveLanguage(studentLangs[0]); // Default to first enrolled language
        } else {
          setSelectedSolveLanguage(null);
        }
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

  // Determine the language to use for the editor and execution
  const languageForEditorAndExecution = language?.name === PLACEMENTS_COURSE_NAME 
                                        ? selectedSolveLanguage 
                                        : language;

  useEffect(() => {
    if (languageForEditorAndExecution && questions.length > 0 && questions[currentQuestionIndex]) {
      const currentQ = questions[currentQuestionIndex];
      let initialCode = `// Start writing your ${languageForEditorAndExecution.name} code here for Question ${currentQuestionIndex + 1}\n// ${currentQ.questionText.substring(0,50)}...\n\n`;
      initialCode += `/*\nSample Input:\n${currentQ.sampleInput || 'N/A'}\n\nSample Output:\n${currentQ.sampleOutput || 'N/A'}\n*/\n\n`;

      const isPlacementCourse = language?.name === PLACEMENTS_COURSE_NAME;
      const completedQuestionData = enrollmentProgress?.completedQuestions?.[currentQ.id];
      
      let savedCode = completedQuestionData?.submittedCode;
      // For placements, if the saved code was for a different language, don't use it.
      if (isPlacementCourse && completedQuestionData && completedQuestionData.solvedWithLanguage !== selectedSolveLanguage?.name) {
          savedCode = undefined; // Reset if different language selected now
      }


      if (savedCode) {
        initialCode = savedCode;
      } else {
        if (languageForEditorAndExecution.name.toLowerCase() === 'python') {
          initialCode += `# Your Python code here\ndef main():\n    # Read input if necessary, for example:\n    # line = input()\n    # print(f"Processing: {line}")\n    pass\n\nif __name__ == "__main__":\n    main()\n`;
        } else if (languageForEditorAndExecution.name.toLowerCase() === 'javascript') {
          initialCode += `// Your JavaScript code here\nfunction main() {\n    // In a Node.js environment for competitive programming, you might read from process.stdin\n    // For example, using 'readline' module if available in the execution sandbox.\n    // console.log("Hello from JavaScript!");\n}\n\nmain();\n`;
        } else if (languageForEditorAndExecution.name.toLowerCase() === 'java') {
          initialCode += `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Scanner scanner = new Scanner(System.in);\n        // String input = scanner.nextLine();\n        // System.out.println("Processing: " + input);\n        // scanner.close();\n    }\n}\n`;
        } else {
             initialCode += `// Code for ${languageForEditorAndExecution.name}\n`;
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
  }, [currentQuestionIndex, questions, language, languageForEditorAndExecution, isLoadingPageData, enrollmentProgress, selectedSolveLanguage]);


  const currentQuestion = questions[currentQuestionIndex];

  const executeCodeApiCall = async (executionType: 'run' | 'submit') => {
    if (!currentQuestion || !languageForEditorAndExecution || !userProfile) {
        toast({title: "Cannot run code", description: "Question, language, or user profile not loaded.", variant: "destructive"});
        return;
    }
    setIsExecutingCode(true);
    setOutput(`Executing your code (${executionType} mode) using ${languageForEditorAndExecution.name}...\n`);
    setTestResults([]);
    setExecutionError(null);
    setCompileError(null);

    try {
        const payload: any = {
            language: languageForEditorAndExecution.name, // Use the selected/current language
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
                const enrollmentRef = doc(db, 'users', userProfile.uid, 'enrolledLanguages', languageId); // Score is for the "Placements" course itself
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
                        if (language?.name === PLACEMENTS_COURSE_NAME && selectedSolveLanguage) {
                            updates[`completedQuestions.${currentQuestion.id}.solvedWithLanguage`] = selectedSolveLanguage.name;
                        }

                        if (isNewCompletion) {
                            updates.currentScore = increment(scoreEarned);
                            updates[`completedQuestions.${currentQuestion.id}.scoreAchieved`] = scoreEarned;
                        } else {
                            updates[`completedQuestions.${currentQuestion.id}.scoreAchieved`] = currentProgressData.completedQuestions[currentQuestion.id]?.scoreAchieved || 0;
                        }

                        await updateDoc(enrollmentRef, updates);
                        
                        setEnrollmentProgress(prev => {
                            const newCompletedQuestionsData: any = {
                                scoreAchieved: updates[`completedQuestions.${currentQuestion.id}.scoreAchieved`],
                                completedAt: serverTimestamp() as FieldValue, 
                                submittedCode: studentCode,
                            };
                            if (language?.name === PLACEMENTS_COURSE_NAME && selectedSolveLanguage) {
                                newCompletedQuestionsData.solvedWithLanguage = selectedSolveLanguage.name;
                            }

                            const newCompletedQuestions = {
                                ...(prev?.completedQuestions || {}),
                                [currentQuestion.id]: newCompletedQuestionsData,
                            };

                            const newProgress = {
                                ...(prev || { languageId, languageName: language!.name, enrolledAt: serverTimestamp(), currentScore:0, completedQuestions: {} } as EnrolledLanguageProgress),
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
  
  const handlePlacementLanguageChange = (langId: string) => {
    const lang = allStudentEnrolledLanguages.find(l => l.id === langId);
    if (lang) {
        setSelectedSolveLanguage(lang);
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
  
  const isPlacementCourse = language?.name === PLACEMENTS_COURSE_NAME;

  return (
    <div className="container mx-auto py-4 md:py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-headline flex items-center">
          {isPlacementCourse ? <Briefcase className="w-7 h-7 md:w-8 md:h-8 mr-2 md:mr-3 text-primary" /> : <BookOpen className="w-7 h-7 md:w-8 md:h-8 mr-2 md:mr-3 text-primary" />}
          Practice: {language?.name || 'Course'}
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/student/labs" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Labs
          </Link>
        </Button>
      </div>

      {language && enrollmentProgress && totalPossibleLanguageScore > 0 && (
        <Card className="shadow-md">
          <CardHeader className="py-3 px-4 md:p-6">
            <CardTitle className="text-md md:text-lg font-semibold">Overall {language.name} Progress</CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4 md:p-6">
            <Progress value={currentProgressPercent} className="w-full h-2.5 md:h-3 mb-1" />
            <p className="text-xs md:text-sm text-muted-foreground text-right">
              {enrollmentProgress.currentScore} / {totalPossibleLanguageScore} points ({currentProgressPercent}%)
            </p>
          </CardContent>
        </Card>
      )}

      {isPlacementCourse && !isLoadingPageData && (
        <Card className="shadow-md">
            <CardHeader className="py-3 px-4 md:p-6">
                <CardTitle className="text-md md:text-lg">Select Language to Solve</CardTitle>
                <CardDescription className="text-xs md:text-sm">Choose one of your enrolled languages to attempt placement questions.</CardDescription>
            </CardHeader>
            <CardContent className="py-3 px-4 md:p-6">
                {allStudentEnrolledLanguages.length > 0 ? (
                    <div className="max-w-xs">
                        <Label htmlFor="placement-language-select" className="text-xs md:text-sm">Solving Language</Label>
                        <Select 
                            value={selectedSolveLanguage?.id || ''} 
                            onValueChange={handlePlacementLanguageChange}
                            disabled={isExecutingCode}
                        >
                            <SelectTrigger id="placement-language-select" className="h-9 text-xs md:text-sm">
                                <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                            <SelectContent>
                                {allStudentEnrolledLanguages.map(lang => (
                                    <SelectItem key={lang.id} value={lang.id} className="text-xs md:text-sm">{lang.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <div className="p-3 md:p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-700 flex items-center gap-2 text-xs md:text-sm">
                        <AlertTriangle className="h-4 w-4 md:h-5 md:w-5"/>
                        <p>You are not enrolled in any programming languages yet. Please enroll in a language course to solve placement questions.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      )}


      {questions.length === 0 && !isLoadingPageData ? (
        <Card className="shadow-lg">
          <CardHeader className="py-3 px-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-md md:text-lg">
                <PackageSearch className="h-5 w-5 md:h-6 md:w-6"/>
                No Questions Yet
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4 md:p-6 text-xs md:text-sm">
            <p className="text-muted-foreground">There are currently no questions available for this {language?.name} course. Please check back later, or inform your instructor.</p>
          </CardContent>
        </Card>
      ) : !currentQuestion && !isLoadingPageData ? (
         <Card className="shadow-lg">
          <CardHeader className="py-3 px-4 md:p-6"><CardTitle className="text-md md:text-lg">Loading Question...</CardTitle></CardHeader>
          <CardContent className="py-3 px-4 md:p-6"><Loader2 className="h-6 w-6 md:h-8 md:h-8 animate-spin text-primary"/></CardContent>
        </Card>
      ) : currentQuestion && languageForEditorAndExecution ? (
        <>
          <Card className="shadow-lg">
            <CardHeader className="py-3 px-4 md:p-6">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                    <CardTitle className="text-lg md:text-xl font-semibold mb-1">Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant={getDifficultyBadgeVariant(currentQuestion.difficulty)} className="capitalize text-xs px-1.5 py-0.5 md:px-2 md:py-0.5">
                           <Tag className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" /> {currentQuestion.difficulty || 'easy'}
                        </Badge>
                        {enrollmentProgress?.completedQuestions?.[currentQuestion.id] ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white capitalize text-xs px-1.5 py-0.5 md:px-2 md:py-0.5">
                                <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" />
                                Score Achieved: {enrollmentProgress.completedQuestions[currentQuestion.id].scoreAchieved}
                                {isPlacementCourse && enrollmentProgress.completedQuestions[currentQuestion.id].solvedWithLanguage && (
                                    ` (using ${enrollmentProgress.completedQuestions[currentQuestion.id].solvedWithLanguage})`
                                )}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 md:px-2 md:py-0.5">
                                <Star className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" /> Max Score: {currentQuestion.maxScore || 100}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <Button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0 || isExecutingCode} variant="outline" size="sm" className="text-xs h-8">
                    <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" /> Prev
                  </Button>
                  <Button onClick={handleNextQuestion} disabled={currentQuestionIndex === questions.length - 1 || isExecutingCode} variant="outline" size="sm" className="text-xs h-8">
                    Next <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4 ml-1" />
                  </Button>
                </div>
              </div>
              <CardDescription className="mt-3 text-xs md:text-sm">Read the problem statement carefully and write your solution below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 py-3 px-4 md:p-6">
              <p className="text-sm md:text-base whitespace-pre-wrap">{currentQuestion.questionText}</p>
              {currentQuestion.sampleInput && (
                <div>
                  <h4 className="font-semibold text-xs md:text-sm mb-1">Sample Input:</h4>
                  <pre className="bg-muted p-2 md:p-3 rounded-md text-xs md:text-sm overflow-x-auto">{currentQuestion.sampleInput}</pre>
                </div>
              )}
              {currentQuestion.sampleOutput && (
                <div>
                  <h4 className="font-semibold text-xs md:text-sm mb-1">Sample Output:</h4>
                  <pre className="bg-muted p-2 md:p-3 rounded-md text-xs md:text-sm overflow-x-auto">{currentQuestion.sampleOutput}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card className="shadow-md">
              <CardHeader className="py-3 px-4 md:p-6">
                <CardTitle className="text-md md:text-lg flex items-center"><Terminal className="w-4 h-4 md:w-5 md:w-5 mr-2" /> Your Code ({languageForEditorAndExecution.name})</CardTitle>
              </CardHeader>
              <CardContent className="py-0 px-0 md:p-0 h-[40vh] md:h-[50vh] lg:h-[500px]">
                <MonacoCodeEditor
                  language={languageForEditorAndExecution.name}
                  value={studentCode}
                  onChange={(code) => setStudentCode(code || '')}
                  height="100%"
                  options={{ readOnly: isExecutingCode || (isPlacementCourse && allStudentEnrolledLanguages.length === 0), minimap: { enabled: false } }}
                />
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="py-3 px-4 md:p-6">
                <CardTitle className="text-md md:text-lg flex items-center"><Lightbulb className="w-4 h-4 md:w-5 md:w-5 mr-2" /> Output / Console</CardTitle>
              </CardHeader>
              <CardContent className="py-3 px-4 md:p-6">
                {compileError && (
                    <div className="mb-3 p-2 md:p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-xs md:text-sm">
                        <div className="flex items-center font-semibold mb-1"><AlertTriangle className="w-3.5 h-3.5 md:w-4 md:w-4 mr-2" />Compilation Error:</div>
                        <pre className="whitespace-pre-wrap font-mono text-xs">{compileError}</pre>
                    </div>
                )}
                {executionError && !compileError && (
                     <div className="mb-3 p-2 md:p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-xs md:text-sm">
                        <div className="flex items-center font-semibold mb-1"><AlertTriangle className="w-3.5 h-3.5 md:w-4 md:w-4 mr-2" />Execution Error:</div>
                        <pre className="whitespace-pre-wrap font-mono text-xs">{executionError}</pre>
                    </div>
                )}
                <pre
                  className="font-mono text-xs md:text-sm bg-muted/50 p-3 md:p-4 rounded-md min-h-[100px] max-h-[200px] md:min-h-[150px] md:max-h-[300px] overflow-y-auto whitespace-pre-wrap"
                  aria-live="polite"
                >
                  {output || "Code output and test results will appear here..."}
                </pre>

                {testResults.length > 0 && !compileError && (
                  <div className="mt-3 space-y-2 md:space-y-3 max-h-[200px] md:max-h-[250px] overflow-y-auto">
                    <h4 className="text-sm md:text-md font-semibold">Test Case Results:</h4>
                    {testResults.map((result) => (
                      <Card key={result.testCaseNumber.toString()} className={`p-2 md:p-3 ${result.passed ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-xs md:text-sm">Test Case {result.testCaseNumber}</span>
                          {result.passed ? (
                            <span className="text-xs font-semibold text-green-700 bg-green-200 px-1.5 py-0.5 rounded-full flex items-center"><CheckCircle className="w-2.5 h-2.5 md:w-3 md:w-3 mr-1"/> PASSED</span>
                          ) : (
                            <span className="text-xs font-semibold text-red-700 bg-red-200 px-1.5 py-0.5 rounded-full flex items-center"><XCircle className="w-2.5 h-2.5 md:w-3 md:w-3 mr-1"/> FAILED</span>
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <div><strong className="text-muted-foreground">Input:</strong> <pre className="inline whitespace-pre-wrap font-mono bg-muted/30 p-0.5 md:p-1 rounded text-xs">{result.input}</pre></div>
                          <div><strong className="text-muted-foreground">Expected:</strong> <pre className="inline whitespace-pre-wrap font-mono bg-muted/30 p-0.5 md:p-1 rounded text-xs">{result.expectedOutput}</pre></div>
                           {!result.passed && <div><strong className="text-muted-foreground">Actual:</strong> <pre className="inline whitespace-pre-wrap font-mono bg-muted/30 p-0.5 md:p-1 rounded text-xs">{result.actualOutput}</pre></div>}
                           {result.error && <div className="text-red-600"><strong className="text-muted-foreground">Error Detail:</strong> <pre className="inline whitespace-pre-wrap font-mono bg-muted/30 p-0.5 md:p-1 rounded text-xs">{result.error}</pre></div>}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                 <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleRunSample} disabled={isExecutingCode || !studentCode.trim() || (isPlacementCourse && allStudentEnrolledLanguages.length === 0)} className="flex-1 text-xs md:text-sm h-9 md:h-10" variant="outline">
                    {isExecutingCode && <Loader2 className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />}
                    <Play className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                    Run with Sample
                    </Button>
                    <Button onClick={handleSubmitTestCases} disabled={isExecutingCode || !studentCode.trim() || (isPlacementCourse && allStudentEnrolledLanguages.length === 0)} className="flex-1 text-xs md:text-sm h-9 md:h-10">
                    {isExecutingCode && <Loader2 className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />}
                    <CheckSquare className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                    Submit & Test All
                    </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-10">
            <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading question content...</p>
        </div>
      )}
    </div>
  );
}

    
