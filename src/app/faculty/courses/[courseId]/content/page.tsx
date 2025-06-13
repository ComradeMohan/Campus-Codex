
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, BookOpen, AlertTriangle, ListChecks, Tag, Star, Save } from 'lucide-react';
import type { ProgrammingLanguage, Course, Question as QuestionType, QuestionDifficulty } from '@/types';

export default function FacultyManageCourseContentPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const nextSearchParams = useNextSearchParams();
  const { toast } = useToast();

  const courseId = params.courseId as string;
  const languageId = nextSearchParams.get('languageId');

  const [course, setCourse] = useState<Course | null>(null);
  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [allLanguageQuestions, setAllLanguageQuestions] = useState<QuestionType[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCourseAndLanguageData = useCallback(async () => {
    if (!userProfile?.collegeId || !courseId || !languageId) {
      if (!authLoading) router.push('/faculty/dashboard');
      return;
    }
    setIsLoading(true);
    try {
      // Fetch Language
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (!langSnap.exists()) throw new Error("Associated language not found");
      setLanguage(langSnap.data() as ProgrammingLanguage);

      // Fetch Course
      const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
      const courseSnap = await getDoc(courseDocRef);
      if (!courseSnap.exists()) throw new Error("Course not found");
      
      const courseData = courseSnap.data() as Course;
      if (courseData.facultyId !== userProfile.uid) {
        toast({ title: "Unauthorized", description: "You can only manage content for your own courses.", variant: "destructive" });
        setIsAuthorized(false);
        router.push(`/faculty/dashboard`);
        return;
      }
      setCourse(courseData);
      setSelectedQuestionIds(new Set(courseData.assignedQuestionIds || []));
      setIsAuthorized(true);

      // Fetch all questions for this language
      const questionsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'questions');
      const qQuery = query(questionsRef, orderBy('createdAt', 'desc'));
      const questionsSnap = await getDocs(qQuery);
      const fetchedQuestions = questionsSnap.docs.map(qDoc => ({ id: qDoc.id, ...qDoc.data() } as QuestionType));
      setAllLanguageQuestions(fetchedQuestions);

    } catch (error: any) {
      console.error("Error fetching details:", error);
      toast({ title: "Error", description: error.message || "Failed to load course content details.", variant: "destructive" });
      router.push(`/faculty/dashboard`);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, courseId, languageId, authLoading, router, toast]);

  useEffect(() => {
    if (!languageId) {
      toast({ title: "Missing Information", description: "Language ID is required.", variant: "destructive" });
      router.push('/faculty/dashboard');
      return;
    }
    if (!authLoading && userProfile) {
      fetchCourseAndLanguageData();
    } else if (!authLoading && !userProfile) {
      router.push('/login');
    }
  }, [authLoading, userProfile, fetchCourseAndLanguageData, router, languageId, toast]);

  const handleQuestionSelect = (questionId: string, isSelected: boolean) => {
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(questionId);
      else newSet.delete(questionId);
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    if (!course || !userProfile?.collegeId || !languageId) return;
    setIsSaving(true);
    try {
      const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
      await updateDoc(courseDocRef, {
        assignedQuestionIds: Array.from(selectedQuestionIds)
      });
      setCourse(prev => prev ? ({...prev, assignedQuestionIds: Array.from(selectedQuestionIds)}) : null);
      toast({ title: "Content Saved", description: "Assigned questions for the course have been updated." });
    } catch (error) {
      console.error("Error saving content:", error);
      toast({ title: "Error", description: "Failed to save course content.", variant: "destructive" });
    } finally {
      setIsSaving(false);
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

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Course Content Management...</span>
      </div>
    );
  }
  
  if (!isAuthorized && !isLoading) return null; 

  if (!course || !language) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3"/>
        <p className="text-lg text-muted-foreground">Course or language details could not be loaded.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href={`/faculty/dashboard`}>Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
            <h1 className="text-3xl font-headline flex items-center">
                <ListChecks className="w-8 h-8 mr-3 text-primary" />
                Manage Content for "{course.name}"
            </h1>
            <p className="text-sm text-muted-foreground ml-11">
                Language: {language.name}
            </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/faculty/dashboard`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl font-headline">Assign Questions</CardTitle>
            <CardDescription>Select questions from the {language.name} question bank to include in this course.</CardDescription>
        </CardHeader>
        <CardContent>
          {allLanguageQuestions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No questions available in the {language.name} question bank. Please add questions via the Admin Panel.
            </p>
          ) : (
            <div className="space-y-2">
               <div className="border rounded-md overflow-hidden max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Question Text</TableHead><TableHead className="w-[100px] text-center">Difficulty</TableHead><TableHead className="w-[100px] text-center">Score</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {allLanguageQuestions.map((q) => (
                      <TableRow key={q.id} data-state={selectedQuestionIds.has(q.id) ? "selected" : ""}>
                        <TableCell className="p-2 align-middle">
                          <Checkbox checked={selectedQuestionIds.has(q.id)} onCheckedChange={(checked) => handleQuestionSelect(q.id, !!checked)} aria-label={`Select question ${q.id}`}/>
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
        <CardFooter className="flex justify-end">
            <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                <Save className="mr-2 h-4 w-4"/> Save Assigned Questions
            </Button>
        </CardFooter>
      </Card>

      {/* Placeholder for adding other materials like text or links - Future Enhancement */}
      {/*
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Add Other Materials (Coming Soon)</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Functionality to add text-based materials or external links will be available here.</p></CardContent>
      </Card>
      */}
    </div>
  );
}
