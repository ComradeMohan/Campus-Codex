
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Lightbulb, Terminal, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import type { ProgrammingLanguage, Question as QuestionType } from '@/types';
import { Separator } from '@/components/ui/separator';

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
  
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isRunningCode, setIsRunningCode] = useState(false);

  const fetchLanguageAndQuestions = useCallback(async () => {
    if (!userProfile?.collegeId || !languageId) {
      if(!authLoading) { // only show error if auth is done loading and still no collegeId
         toast({ title: "Error", description: "Missing user or language information.", variant: "destructive" });
         router.push('/student/labs');
      }
      return;
    }
    setIsLoadingPageData(true);
    try {
      // Fetch language details
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (!langSnap.exists()) {
        toast({ title: "Error", description: "Course not found.", variant: "destructive" });
        router.push('/student/labs');
        return;
      }
      setLanguage({ id: langSnap.id, ...langSnap.data() } as ProgrammingLanguage);

      // Fetch questions for the language
      const questionsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'questions');
      const qQuery = query(questionsRef, orderBy('createdAt', 'asc')); // Or some other order
      const questionsSnap = await getDocs(qQuery);
      const fetchedQuestions = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionType));
      
      if (fetchedQuestions.length === 0) {
        toast({ title: "No Questions", description: "This course doesn't have any questions yet. Check back later!", variant: "default" });
        // Optionally, redirect or show a specific message component
      }
      setQuestions(fetchedQuestions);
      setCurrentQuestionIndex(0); // Start with the first question

    } catch (error) {
      console.error("Error fetching course/questions:", error);
      toast({ title: "Error", description: "Failed to load course or questions.", variant: "destructive" });
    } finally {
      setIsLoadingPageData(false);
    }
  }, [userProfile?.collegeId, languageId, toast, router, authLoading]);

  useEffect(() => {
    if (!authLoading) { // Ensure userProfile is resolved before fetching
        fetchLanguageAndQuestions();
    }
  }, [authLoading, fetchLanguageAndQuestions]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleRunCode = async () => {
    setIsRunningCode(true);
    setOutput('Simulating code execution...\n');
    // In a real scenario, you'd send `studentCode` and `currentQuestion.testCases`
    // to a secure code execution environment.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
    setOutput(prev => prev + 'Execution finished. (This is a simulation)');
    // Add mock test case pass/fail messages
    if (currentQuestion?.testCases?.length > 0) {
        setOutput(prev => prev + `\n\nMock Test Results for "${currentQuestion.questionText.substring(0,30)}...":\n`);
        currentQuestion.testCases.forEach((tc, idx) => {
            const pass = Math.random() > 0.3; // Simulate pass/fail
            setOutput(prev => prev + `Test Case ${idx + 1}: ${pass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
        });
    }
    setIsRunningCode(false);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setStudentCode(''); // Reset code for new question
      setOutput('');     // Reset output
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setStudentCode('');
      setOutput('');
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
          <CardHeader>
            <CardTitle>Loading Question...</CardTitle>
          </CardHeader>
          <CardContent>
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
          </CardContent>
        </Card>
      ) : currentQuestion ? (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold">Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                <div className="flex space-x-2">
                  <Button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} variant="outline" size="sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <Button onClick={handleNextQuestion} disabled={currentQuestionIndex === questions.length - 1} variant="outline" size="sm">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              <CardDescription>Read the problem statement carefully and write your solution below.</CardDescription>
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
                <CardTitle className="text-lg flex items-center">
                  <Terminal className="w-5 h-5 mr-2" /> Your Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder={`Write your ${language.name} code here...`}
                  rows={15}
                  className="font-code text-sm bg-background"
                />
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2" /> Output / Console
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={output}
                  readOnly
                  placeholder="Code output will appear here..."
                  rows={10}
                  className="font-code text-sm bg-muted/50"
                />
                 <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleRunCode} disabled={isRunningCode || !studentCode.trim()} className="flex-1">
                    {isRunningCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Run Code (Simulated)
                    </Button>
                    {/* <Button variant="secondary" className="flex-1" disabled>View Solution (Coming Soon)</Button> */}
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

