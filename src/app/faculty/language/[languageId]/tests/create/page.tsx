
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, getDocs, updateDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ClipboardEdit, ListChecks, Tag, Star, AlertTriangle, CheckCircle, Send } from 'lucide-react';
import type { ProgrammingLanguage, Question as QuestionType, OnlineTest, QuestionDifficulty, OnlineTestStatus } from '@/types';

const createTestFormSchema = z.object({
  title: z.string().min(5, { message: "Test title must be at least 5 characters." }).max(100, { message: "Test title must be 100 characters or less." }),
  description: z.string().max(500, { message: "Description must be 500 characters or less." }).optional(),
  durationMinutes: z.coerce.number().min(5, { message: "Duration must be at least 5 minutes." }).max(240, { message: "Duration cannot exceed 240 minutes (4 hours)." }),
  status: z.enum(['draft', 'published'], { required_error: "Please select a status." }),
});

type CreateTestFormData = z.infer<typeof createTestFormSchema>;

export default function FacultyCreateOrEditTestPage({ params: routeParams }: { params: { languageId: string, testId?: string } }) {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = routeParams.languageId;
  const testIdToEdit = routeParams.testId;
  const isEditing = !!testIdToEdit;

  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(true);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionType[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [totalScore, setTotalScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const form = useForm<CreateTestFormData>({
    resolver: zodResolver(createTestFormSchema),
    defaultValues: {
      title: '',
      description: '',
      durationMinutes: 60,
      status: 'draft',
    },
  });

  const fetchLanguageAndQuestions = useCallback(async () => {
    if (!userProfile?.collegeId || !languageId) {
      if (!authLoading) router.push('/faculty/dashboard');
      return;
    }
    if (!userProfile.managedLanguageIds || !userProfile.managedLanguageIds.includes(languageId)) {
        toast({ title: "Unauthorized", description: "You are not authorized for this language.", variant: "destructive" });
        router.push('/faculty/dashboard');
        return;
    }
    setIsAuthorized(true);
    setIsLoadingLanguage(true);
    setIsLoadingQuestions(true);

    try {
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (langSnap.exists()) {
        setLanguage({ id: langSnap.id, ...langSnap.data() } as ProgrammingLanguage);
      } else {
        toast({ title: "Error", description: "Language not found.", variant: "destructive" });
        router.push(`/faculty/language/${languageId}/tests`);
        return;
      }

      const questionsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'questions');
      const qQuery = query(questionsRef, orderBy('createdAt', 'desc'));
      const questionsSnap = await getDocs(qQuery);
      const fetchedQuestions = questionsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as QuestionType));
      setAvailableQuestions(fetchedQuestions);

      if (isEditing && testIdToEdit) {
        const testDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'tests', testIdToEdit);
        const testSnap = await getDoc(testDocRef);
        if (testSnap.exists()) {
          const testData = testSnap.data() as OnlineTest;
          if (testData.facultyId !== userProfile.uid) {
             toast({ title: "Unauthorized", description: "You cannot edit this test.", variant: "destructive" });
             router.push(`/faculty/language/${languageId}/tests`);
             return;
          }
          form.reset({
            title: testData.title,
            description: testData.description,
            durationMinutes: testData.durationMinutes,
            status: testData.status as 'draft' | 'published',
          });
          setSelectedQuestionIds(new Set(testData.questionIds));
          setTotalScore(testData.totalScore);
        } else {
          toast({ title: "Error", description: "Test to edit not found.", variant: "destructive" });
          router.push(`/faculty/language/${languageId}/tests`);
        }
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load required data.", variant: "destructive" });
    } finally {
      setIsLoadingLanguage(false);
      setIsLoadingQuestions(false);
    }
  }, [userProfile, languageId, toast, router, authLoading, isEditing, testIdToEdit, form]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchLanguageAndQuestions();
    } else if (!authLoading && !userProfile) {
      router.push('/login');
    }
  }, [authLoading, userProfile, fetchLanguageAndQuestions, router]);

  const handleQuestionSelect = (questionId: string, questionScore: number, isSelected: boolean) => {
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(questionId);
      else newSet.delete(questionId);
      return newSet;
    });
    setTotalScore(prevScore => isSelected ? prevScore + questionScore : prevScore - questionScore);
  };

  const onSubmit = async (data: CreateTestFormData) => {
    if (!userProfile?.collegeId || !languageId || !language || !userProfile.uid) {
      toast({ title: "Error", description: "Missing critical information.", variant: "destructive" });
      return;
    }
    if (selectedQuestionIds.size === 0) {
      toast({ title: "No Questions", description: "Please select at least one question.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const questionsSnapshot = availableQuestions
        .filter(q => selectedQuestionIds.has(q.id))
        .map(q => ({ id: q.id, questionText: q.questionText, difficulty: q.difficulty || 'easy', maxScore: q.maxScore || 100 }));

      const testDataPayload: Omit<OnlineTest, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: any, updatedAt: any } = {
        languageId: languageId,
        languageName: language.name,
        title: data.title,
        description: data.description || '',
        durationMinutes: data.durationMinutes,
        questionIds: Array.from(selectedQuestionIds),
        questionsSnapshot,
        totalScore: totalScore,
        status: data.status,
        createdBy: userProfile.uid,
        facultyId: userProfile.uid,
        isFacultyCreated: true,
        updatedAt: serverTimestamp(),
        enrollmentRequests: isEditing ? tests.find(t=>t.id === testIdToEdit)?.enrollmentRequests || [] : [],
        approvedStudentUids: isEditing ? tests.find(t=>t.id === testIdToEdit)?.approvedStudentUids || [] : [],
      };

      if (isEditing && testIdToEdit) {
        const testDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'tests', testIdToEdit);
        await updateDoc(testDocRef, testDataPayload);
        toast({ title: "Test Updated!", description: `The test "${data.title}" has been updated.` });
      } else {
        testDataPayload.createdAt = serverTimestamp();
        const testsCollectionRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'tests');
        await addDoc(testsCollectionRef, testDataPayload);
        toast({ title: "Test Created!", description: `The test "${data.title}" has been saved as ${data.status}.` });
      }
      
      router.push(`/faculty/language/${languageId}/tests`);

    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} test:`, error);
      toast({ title: `Error ${isEditing ? 'Updating' : 'Creating'} Test`, description: "An unexpected error occurred.", variant: "destructive" });
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


  if (authLoading || isLoadingLanguage || isLoadingQuestions) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Test Configuration...</span>
      </div>
    );
  }
  
  if (!isAuthorized && !authLoading) return null; // Should be redirected

  if (!language) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3"/>
        <p className="text-lg text-muted-foreground">Language details could not be loaded.</p>
         <Button asChild variant="link" className="mt-4">
             <Link href={`/faculty/language/${languageId}/tests`}>Back to Tests</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline flex items-center">
          <ClipboardEdit className="w-8 h-8 mr-3 text-primary" />
          {isEditing ? `Edit Test: ${form.getValues('title') || 'Test'}` : `Create New Test for ${language.name}`}
        </h1>
        <Button asChild variant="outline">
          <Link href={`/faculty/language/${languageId}/tests`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Tests for {language.name}
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-headline">Test Details</CardTitle>
              <CardDescription>Provide basic information for the test.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Test Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Midterm Exam - Basics" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="Briefly describe the test." {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-base">Duration (minutes)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 60" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-base">Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="draft">Draft (Hidden from students)</SelectItem>
                            <SelectItem value="published">Published (Visible to students for enrollment)</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center">
                <ListChecks className="w-6 h-6 mr-2 text-primary" /> Select Questions
              </CardTitle>
              <CardDescription>Choose questions for this test from the {language.name} question bank.</CardDescription>
            </CardHeader>
            <CardContent>
              {availableQuestions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No questions available for {language.name}. Add questions via Admin Panel.</p>
              ) : (
                <div className="space-y-2">
                   <div className="border rounded-md overflow-hidden max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Question Text</TableHead><TableHead className="w-[100px] text-center">Difficulty</TableHead><TableHead className="w-[100px] text-center">Score</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {availableQuestions.map((q) => (
                          <TableRow key={q.id} data-state={selectedQuestionIds.has(q.id) ? "selected" : ""}>
                            <TableCell className="p-2 align-middle">
                              <Checkbox checked={selectedQuestionIds.has(q.id)} onCheckedChange={(checked) => handleQuestionSelect(q.id, q.maxScore || 100, !!checked)} aria-label={`Select question ${q.id}`}/>
                            </TableCell>
                            <TableCell className="font-medium p-2 align-middle line-clamp-2" title={q.questionText}>{q.questionText}</TableCell>
                            <TableCell className="text-center p-2 align-middle"><Badge variant={getDifficultyBadgeVariant(q.difficulty)} className="capitalize text-xs">{q.difficulty || 'easy'}</Badge></TableCell>
                            <TableCell className="text-center p-2 align-middle">{q.maxScore || 100}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                   </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end items-center gap-4">
                <p className="text-lg font-semibold">Total Test Score: <span className="text-primary">{totalScore}</span></p>
            </CardFooter>
          </Card>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting} size="lg" className={data.status === 'published' ? 'bg-green-600 hover:bg-green-700' : ''}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? <><Edit3 className="mr-2 h-4 w-4" /> Update Test</> : <><PlusCircle className="mr-2 h-4 w-4" /> Create Test</>}
              {data.status === 'published' && <Send className="ml-2 h-4 w-4"/>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
