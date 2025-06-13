
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, BookOpen, AlertTriangle, ListChecks, Tag, Star, Save, LinkIcon, Trash2, Info, Globe } from 'lucide-react';
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
  const [materialLink, setMaterialLink] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);


  const fetchCourseAndLanguageData = useCallback(async () => {
    if (!userProfile?.collegeId || !courseId || !languageId) {
      if (!authLoading) router.push('/faculty/dashboard');
      return;
    }
    setIsLoading(true);
    try {
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (!langSnap.exists()) throw new Error("Associated language not found");
      setLanguage({ id: langSnap.id, ...langSnap.data() } as ProgrammingLanguage);

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
      setMaterialLink(courseData.courseMaterialLink || '');
      setIsAuthorized(true);

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

  const handleSaveAssignedQuestions = async () => {
    if (!course || !userProfile?.collegeId || !languageId) return;
    setIsSaving(true);
    try {
      const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
      await updateDoc(courseDocRef, {
        assignedQuestionIds: Array.from(selectedQuestionIds),
        updatedAt: serverTimestamp()
      });
      setCourse(prev => prev ? ({...prev, assignedQuestionIds: Array.from(selectedQuestionIds)}) : null);
      toast({ title: "Content Saved", description: "Assigned questions for the course have been updated." });
    } catch (error) {
      console.error("Error saving content:", error);
      toast({ title: "Error", description: "Failed to save assigned questions.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveMaterialLink = async () => {
    if (!course || !userProfile?.collegeId || !languageId) return;
    
    // Basic URL validation (can be improved)
    if (materialLink.trim() && !materialLink.startsWith('http://') && !materialLink.startsWith('https://')) {
        toast({title: "Invalid URL", description: "Please enter a valid URL starting with http:// or https://", variant: "destructive"});
        return;
    }

    setIsSavingLink(true);
    try {
        const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
        await updateDoc(courseDocRef, {
            courseMaterialLink: materialLink.trim() || null, // Store null if empty
            updatedAt: serverTimestamp()
        });
        setCourse(prev => prev ? ({...prev, courseMaterialLink: materialLink.trim() || undefined }) : null);
        toast({ title: "Material Link Saved", description: `Course material link has been ${materialLink.trim() ? 'updated' : 'cleared'}.` });
    } catch (error) {
        console.error("Error saving material link:", error);
        toast({ title: "Error", description: "Failed to save material link.", variant: "destructive" });
    } finally {
        setIsSavingLink(false);
    }
  };

  const handleRemoveMaterialLink = async () => {
      if (!course || !userProfile?.collegeId || !languageId) return;
      setIsSavingLink(true); // Use same state for busy indicator
      try {
          const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
          await updateDoc(courseDocRef, {
              courseMaterialLink: null,
              updatedAt: serverTimestamp()
          });
          setCourse(prev => prev ? ({...prev, courseMaterialLink: undefined }) : null);
          setMaterialLink('');
          toast({ title: "Material Link Removed", description: "The course material link has been removed." });
      } catch (error) {
          console.error("Error removing material link:", error);
          toast({ title: "Error", description: "Failed to remove material link.", variant: "destructive" });
      } finally {
          setIsSavingLink(false);
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" /><span className="ml-4 text-lg">Loading...</span>
      </div>
    );
  }
  
  if (!isAuthorized && !isLoading) return null; 

  if (!course || !language) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3"/>
        <p className="text-lg text-muted-foreground">Course or language details could not be loaded.</p>
        <Button asChild variant="link" className="mt-4"><Link href={`/faculty/dashboard`}>Back to Dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
            <h1 className="text-3xl font-headline flex items-center">
                <ListChecks className="w-8 h-8 mr-3 text-primary" />Manage Content for "{course.name}"
            </h1>
            <p className="text-sm text-muted-foreground ml-11">Language: {language.name}</p>
        </div>
        <Button asChild variant="outline"><Link href={`/faculty/dashboard`} className="flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link></Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader><CardTitle className="text-xl font-headline flex items-center"><LinkIcon className="w-6 h-6 mr-2 text-primary" />Course Material Link (e.g., PDF on Google Drive)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
            <div>
                <Label htmlFor="material-link">Publicly Accessible PDF Link</Label>
                <div className="flex items-center gap-2 mt-1">
                    <Input 
                        id="material-link" 
                        type="url" 
                        placeholder="https://drive.google.com/... or other public PDF URL" 
                        value={materialLink}
                        onChange={(e) => setMaterialLink(e.target.value)}
                        disabled={isSavingLink}
                        className="flex-grow"
                    />
                    <Button onClick={handleSaveMaterialLink} disabled={isSavingLink}>
                        {isSavingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Link
                    </Button>
                </div>
                 <p className="text-xs text-muted-foreground mt-1">Ensure the link is publicly accessible (e.g., "Anyone with the link can view" on Google Drive).</p>
            </div>
            {course.courseMaterialLink && !isSavingLink && (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary"/>
                        <a href={course.courseMaterialLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate" title={course.courseMaterialLink}>
                            Current Link: {course.courseMaterialLink.length > 50 ? `${course.courseMaterialLink.substring(0,47)}...` : course.courseMaterialLink}
                        </a>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleRemoveMaterialLink} disabled={isSavingLink} title="Remove Link">
                        <Trash2 className="h-4 w-4 text-destructive"/>
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                    <CardTitle className="text-xl font-headline flex items-center"><ListChecks className="w-6 h-6 mr-2 text-primary" />Assign Questions</CardTitle>
                    <CardDescription>Select questions from the {language.name} question bank to include in this course.</CardDescription>
                </div>
                 <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-blue-700 flex items-start gap-2 text-xs">
                    <Info className="h-4 w-4 shrink-0 mt-0.5"/>
                    <span>To add new questions to the language bank for assignment, please coordinate with your college administrator.</span>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {allLanguageQuestions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No questions available in the {language.name} question bank. An administrator needs to add them.</p>
          ) : (
            <div className="space-y-2">
               <div className="border rounded-md overflow-hidden max-h-[500px] overflow-y-auto">
                <Table><TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Question Text</TableHead><TableHead className="w-[100px] text-center">Difficulty</TableHead><TableHead className="w-[100px] text-center">Score</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {allLanguageQuestions.map((q) => (
                      <TableRow key={q.id} data-state={selectedQuestionIds.has(q.id) ? "selected" : ""}>
                        <TableCell className="p-2 align-middle"><Checkbox checked={selectedQuestionIds.has(q.id)} onCheckedChange={(checked) => handleQuestionSelect(q.id, !!checked)} aria-label={`Select question ${q.id}`}/></TableCell>
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
            <Button onClick={handleSaveAssignedQuestions} disabled={isSaving || isSavingLink}><Save className="mr-2 h-4 w-4"/> Save Assigned Questions</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
