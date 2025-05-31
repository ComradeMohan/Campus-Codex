
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ArrowLeft, HelpCircle, ListChecks, FileText, CheckSquare } from 'lucide-react';
import type { ProgrammingLanguage, Question as QuestionType, TestCase } from '@/types';

const testCaseSchema = z.object({
  input: z.string().min(1, { message: "Test case input cannot be empty." }),
  expectedOutput: z.string().min(1, { message: "Test case expected output cannot be empty." }),
});

const questionFormSchema = z.object({
  questionText: z.string().min(20, { message: "Question text must be at least 20 characters." }),
  sampleInput: z.string().optional(),
  sampleOutput: z.string().optional(),
  solution: z.string().optional(),
  testCases: z.array(testCaseSchema).min(1, "At least one test case is required."),
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

export default function ManageQuestionsPage() {
  const { userProfile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = params.languageId as string;

  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);


  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      questionText: '',
      sampleInput: '',
      sampleOutput: '',
      solution: '',
      testCases: [{ input: '', expectedOutput: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "testCases",
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
        setQuestions(fetchedQuestions);
      } catch (error) {
        console.error("Error fetching questions:", error);
        toast({ title: "Error", description: "Failed to load existing questions.", variant: "destructive" });
      } finally {
        setIsLoadingQuestions(false);
      }
    }
  }, [userProfile?.collegeId, languageId, toast]);


  useEffect(() => {
    fetchLanguageDetails();
    fetchQuestions();
  }, [fetchLanguageDetails, fetchQuestions]);


  const onSubmit = async (data: QuestionFormData) => {
    if (!userProfile?.collegeId || !languageId || !language) {
      toast({ title: "Error", description: "Cannot submit question. Missing context.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const questionCollectionRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'questions');
      const newQuestionData = {
        ...data,
        languageId: languageId,
        languageName: language.name, // Denormalize language name for easier display
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(questionCollectionRef, newQuestionData);
      toast({ title: "Question Added!", description: `New question for ${language.name} has been saved.` });
      form.reset({
        questionText: '',
        sampleInput: '',
        sampleOutput: '',
        solution: '',
        testCases: [{ input: '', expectedOutput: '' }],
      });
      fetchQuestions(); // Refresh the list of questions
    } catch (error) {
      console.error("Error adding question:", error);
      toast({ title: "Error", description: "Failed to add question. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoadingLanguage) {
    return <div className="container mx-auto py-8 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <span className="ml-4 text-lg">Loading Language Details...</span></div>;
  }

  if (!language) {
    return <div className="container mx-auto py-8 text-center">Language details could not be loaded.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline flex items-center">
          <HelpCircle className="w-8 h-8 mr-3 text-primary" />
          Manage Questions for {language.name}
        </h1>
        <Button asChild variant="outline">
          <Link href="/admin/courses" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Course Management
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Add New Question</CardTitle>
          <CardDescription>
            Create a new programming question with test cases for {language.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="questionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Question Statement</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the problem to be solved..." {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sampleInput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Input (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Example: 5 or hello world" {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sampleOutput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Output (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Example: 10 or HELLO WORLD" {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="solution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solution / Explanation (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Provide a model solution or detailed explanation..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="text-base block mb-2">Test Cases</FormLabel>
                {fields.map((item, index) => (
                  <Card key={item.id} className="mb-4 p-4 border rounded-md shadow-sm bg-muted/30">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">Test Case {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                        control={form.control}
                        name={`testCases.${index}.input`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Input</FormLabel>
                            <FormControl>
                              <Textarea placeholder={`Input for test case ${index + 1}`} {...field} rows={2}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`testCases.${index}.expectedOutput`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expected Output</FormLabel>
                            <FormControl>
                              <Textarea placeholder={`Expected output for test case ${index + 1}`} {...field} rows={2}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ input: '', expectedOutput: '' })}
                  className="mt-2"
                >
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Test Case
                </Button>
                 {form.formState.errors.testCases && !form.formState.errors.testCases.root && typeof form.formState.errors.testCases !== 'string' && (
                    <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.testCases.message}</p>
                 )}
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Question
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <ListChecks className="w-6 h-6 mr-2 text-primary" />
            Existing Questions for {language.name}
          </CardTitle>
           <CardDescription>
            Currently added questions for this language.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingQuestions ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Loading questions...</span>
            </div>
          ) : questions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No questions have been added for {language.name} yet.</p>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <Card key={q.id} className="bg-card border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Question {questions.length - index}</span>
                       {/* TODO: Edit/Delete buttons for questions */}
                        {/* <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><FileText className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div> */}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3">{q.questionText}</p>
                    <p className="text-xs text-muted-foreground mt-2">Test Cases: {q.testCases.length}</p>
                  </CardContent>
                  {/* <CardFooter>
                     <Button variant="outline" size="sm" disabled>View Details</Button> 
                  </CardFooter> */}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

