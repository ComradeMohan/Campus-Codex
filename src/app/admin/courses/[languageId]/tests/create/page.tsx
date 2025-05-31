
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ClipboardEdit, ListChecks, Tag, Star } from 'lucide-react';
import type { ProgrammingLanguage, Question as QuestionType, OnlineTest, QuestionDifficulty } from '@/types';

const createTestFormSchema = z.object({
  title: z.string().min(5, { message: "Test title must be at least 5 characters." }).max(100, { message: "Test title must be 100 characters or less." }),
  description: z.string().max(500, { message: "Description must be 500 characters or less." }).optional(),
  durationMinutes: z.coerce.number().min(5, { message: "Duration must be at least 5 minutes." }).max(240, { message: "Duration cannot exceed 240 minutes (4 hours)." }),
});

type CreateTestFormData = z.infer<typeof createTestFormSchema>;

export default function CreateTestPage() {
  const { userProfile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = params.languageId as string;

  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(true);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionType[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [totalScore, setTotalScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTestFormData>({
    resolver: zodResolver(createTestFormSchema),
    defaultValues: {
      title: '',
      description: '',
      durationMinutes: 60,
    },
  });

  const fetchLanguageDetails = useCallback(async () => {
    if (userProfile?.collegeId && languageId) {
      setIsLoadingLanguage(true);
      try {
        const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
        const docSnap = await getDoc(langDocRef);
        if (docSnap.exists()) {
          setLanguage({ id: docSnap.id, ...docSnap.data() } as ProgrammingLanguage);
        } else {
          toast({ title: "Error", description: "Language not found.", variant: "destructive" });
          router.push('/admin/courses');
        }
      } catch (error) {
        console.error("Error fetching language details:", error);
        toast({ title: "Error", description: "Failed to fetch language details.", variant: "destructive" });
      } finally {
        setIsLoadingLanguage(false);
      }
    }
  }, [userProfile?.collegeId, languageId, toast, router]);

  const fetchQuestions = useCallback(async () => {
    if (userProfile?.collegeId && languageId) {
      setIsLoadingQuestions(true);
      try {
        const questionsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'questions');
        const q = query(questionsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedQuestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionType));
        setAvailableQuestions(fetchedQuestions);
      } catch (error) {
        console.error("Error fetching questions:", error);
        toast({ title: "Error", description: "Failed to load questions for this language.", variant: "destructive" });
      } finally {
        setIsLoadingQuestions(false);
      }
    }
  }, [userProfile?.collegeId, languageId, toast]);

  useEffect(() => {
    fetchLanguageDetails();
    fetchQuestions();
  }, [fetchLanguageDetails, fetchQuestions]);

  const handleQuestionSelect = (questionId: string, questionScore: number, isSelected: boolean) => {
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(questionId);
      } else {
        newSet.delete(questionId);
      }
      return newSet;
    });

    setTotalScore(prevScore => isSelected ? prevScore + questionScore : prevScore - questionScore);
  };

  const onSubmit = async (data: CreateTestFormData) => {
    if (!userProfile?.collegeId || !languageId || !language) {
      toast({ title: "Error", description: "Cannot create test. Missing critical information.", variant: "destructive" });
      return;
    }
    if (selectedQuestionIds.size === 0) {
      toast({ title: "No Questions Selected", description: "Please select at least one question for the test.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const questionsSnapshot = availableQuestions
        .filter(q => selectedQuestionIds.has(q.id))
        .map(q => ({ id: q.id, questionText: q.questionText, difficulty: q.difficulty || 'easy', maxScore: q.maxScore || 100 }));

      const testData: Omit<OnlineTest, 'id' | 'createdAt' | 'updatedAt'> = {
        languageId: languageId,
        languageName: language.name,
        title: data.title,
        description: data.description || '',
        durationMinutes: data.durationMinutes,
        questionIds: Array.from(selectedQuestionIds),
        questionsSnapshot,
        totalScore: totalScore,
        status: 'draft',
        createdBy: userProfile.uid,
        // These will be set by Firestore serverTimestamp
        createdAt: serverTimestamp() as any, 
        updatedAt: serverTimestamp() as any,
      };

      const testsCollectionRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'tests');
      await addDoc(testsCollectionRef, testData);

      toast({ title: "Test Created!", description: `The test "${data.title}" has been created as a draft.` });
      form.reset();
      setSelectedQuestionIds(new Set());
      setTotalScore(0);
      router.push(`/admin/courses/${languageId}/questions`); 

    } catch (error) {
      console.error("Error creating test:", error);
      toast({ title: "Error Creating Test", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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


  if (isLoadingLanguage || isLoadingQuestions) {
    return <div className="container mx-auto py-8 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <span className="ml-4 text-lg">Loading Test Creation Page...</span></div>;
  }

  if (!language) {
    return <div className="container mx-auto py-8 text-center">Language details could not be loaded. Cannot create test.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline flex items-center">
          <ClipboardEdit className="w-8 h-8 mr-3 text-primary" />
          Create New Test for {language.name}
        </h1>
        <Button asChild variant="outline">
          <Link href={`/admin/courses/${languageId}/questions`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Questions
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-headline">Test Details</CardTitle>
              <CardDescription>Provide the basic information for your new test.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Test Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Midterm Exam - Python Basics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Briefly describe the test content or instructions." {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Duration (in minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center">
                <ListChecks className="w-6 h-6 mr-2 text-primary" />
                Select Questions
              </CardTitle>
              <CardDescription>
                Choose questions from the question bank for {language.name} to include in this test.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableQuestions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No questions available for {language.name}. Add some questions first.</p>
              ) : (
                <div className="space-y-2">
                   <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Question Text</TableHead>
                          <TableHead className="w-[100px] text-center">Difficulty</TableHead>
                          <TableHead className="w-[100px] text-center">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableQuestions.map((q) => (
                          <TableRow key={q.id} data-state={selectedQuestionIds.has(q.id) ? "selected" : ""}>
                            <TableCell className="p-2 align-middle">
                              <Checkbox
                                checked={selectedQuestionIds.has(q.id)}
                                onCheckedChange={(checked) => handleQuestionSelect(q.id, q.maxScore || 100, !!checked)}
                                aria-label={`Select question ${q.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium p-2 align-middle line-clamp-2" title={q.questionText}>
                              {q.questionText}
                            </TableCell>
                            <TableCell className="text-center p-2 align-middle">
                              <Badge variant={getDifficultyBadgeVariant(q.difficulty)} className="capitalize text-xs">
                                {q.difficulty || 'easy'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center p-2 align-middle">
                              {q.maxScore || 100}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                   </div>
                  <p className="text-sm text-destructive text-center" data-testid="selected-questions-error-message">
                    {/* Placeholder for global form error if needed for selected questions */}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end items-center gap-4">
                <p className="text-lg font-semibold">Total Test Score: <span className="text-primary">{totalScore}</span></p>
            </CardFooter>
          </Card>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting} size="lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Test
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

