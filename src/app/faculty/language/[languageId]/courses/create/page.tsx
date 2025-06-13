
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, BookOpen, PlusCircle, AlertTriangle } from 'lucide-react';
import type { ProgrammingLanguage, Course } from '@/types';

const createCourseFormSchema = z.object({
  name: z.string().min(5, { message: "Course name must be at least 5 characters." }).max(100, { message: "Course name must be 100 characters or less." }),
  description: z.string().max(500, { message: "Description must be 500 characters or less." }).optional(),
  strength: z.coerce.number().min(1, { message: "Strength must be at least 1 student." }).max(500, { message: "Strength cannot exceed 500 students." }),
});

type CreateCourseFormData = z.infer<typeof createCourseFormSchema>;

export default function FacultyCreateCoursePage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = params.languageId as string;

  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const form = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseFormSchema),
    defaultValues: {
      name: '',
      description: '',
      strength: 50,
    },
  });

  const fetchLanguageDetails = useCallback(async () => {
    if (!userProfile?.collegeId || !languageId) {
      if (!authLoading) router.push('/faculty/dashboard');
      return;
    }

    if (!userProfile.managedLanguageIds || !userProfile.managedLanguageIds.includes(languageId)) {
        toast({ title: "Unauthorized", description: "You are not authorized to create courses for this language.", variant: "destructive" });
        router.push('/faculty/dashboard');
        return;
    }
    setIsAuthorized(true);
    setIsLoadingPageData(true);

    try {
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (langSnap.exists()) {
        setLanguage({ id: langSnap.id, ...langSnap.data() } as ProgrammingLanguage);
      } else {
        toast({ title: "Error", description: "Base programming language not found.", variant: "destructive" });
        router.push(`/faculty/dashboard`);
      }
    } catch (error) {
      console.error("Error fetching language details:", error);
      toast({ title: "Error", description: "Failed to load language details.", variant: "destructive" });
    } finally {
      setIsLoadingPageData(false);
    }
  }, [userProfile, languageId, toast, router, authLoading]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchLanguageDetails();
    } else if (!authLoading && !userProfile) {
      router.push('/login');
    }
  }, [authLoading, userProfile, fetchLanguageDetails, router]);

  const onSubmit = async (data: CreateCourseFormData) => {
    if (!userProfile?.collegeId || !languageId || !language || !userProfile.uid) {
      toast({ title: "Error", description: "Missing critical information to create course.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'> = {
        name: data.name,
        languageId: languageId,
        languageName: language.name,
        facultyId: userProfile.uid,
        collegeId: userProfile.collegeId,
        strength: data.strength,
        description: data.description || '',
        enrolledStudentUids: [],
        // Timestamps will be set by Firestore
        createdAt: serverTimestamp() as any, 
        updatedAt: serverTimestamp() as any,
      };

      // Store under colleges -> collegeId -> languages -> languageId -> courses
      const coursesCollectionRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses');
      await addDoc(coursesCollectionRef, courseData);

      toast({ title: "Course Created!", description: `The course "${data.name}" for ${language.name} has been successfully created.` });
      form.reset();
      // Potentially redirect to a page listing courses for this language, or back to faculty dashboard
      router.push(`/faculty/dashboard`); 

    } catch (error) {
      console.error("Error creating course:", error);
      toast({ title: "Error Creating Course", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading || isLoadingPageData) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Course Creation Page...</span>
      </div>
    );
  }
  
  if (!isAuthorized && !authLoading) return null; 

  if (!language) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3"/>
        <p className="text-lg text-muted-foreground">Base language details could not be loaded. Cannot create course.</p>
         <Button asChild variant="link" className="mt-4">
             <Link href={`/faculty/dashboard`}>Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline flex items-center">
          <BookOpen className="w-8 h-8 mr-3 text-primary" />
          Create New Course for {language.name}
        </h1>
        <Button asChild variant="outline">
          <Link href={`/faculty/dashboard`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Course Details</CardTitle>
          <CardDescription>Provide the information for your new course in {language.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Course Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Advanced Python Programming - Fall 2024" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Course Description (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Briefly describe the course content, objectives, or prerequisites." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="strength"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Maximum Student Strength</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 50" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting} size="lg">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <PlusCircle className="mr-2 h-5 w-5" /> Create Course
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
