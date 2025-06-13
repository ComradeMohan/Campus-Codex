
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs, serverTimestamp, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, BookOpen, AlertTriangle, ListChecks, Tag, Star, Save, LinkIcon, Trash2, Info, Globe, PlusCircle, FileText as FileTextIcon } from 'lucide-react';
import type { ProgrammingLanguage, Course, Question as QuestionType, QuestionDifficulty, CourseMaterial } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const addMaterialFormSchema = z.object({
  materialName: z.string().min(3, { message: "Material name must be at least 3 characters." }).max(100, { message: "Material name cannot exceed 100 characters." }),
  materialUrl: z.string().url({ message: "Please enter a valid URL." }).refine(url => url.startsWith('http://') || url.startsWith('https://'), {
    message: "URL must start with http:// or https://",
  }),
});
type AddMaterialFormData = z.infer<typeof addMaterialFormSchema>;


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
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [isProcessingMaterial, setIsProcessingMaterial] = useState(false);
  const [isAddMaterialDialogOpen, setIsAddMaterialDialogOpen] = useState(false);

  const materialForm = useForm<AddMaterialFormData>({
    resolver: zodResolver(addMaterialFormSchema),
    defaultValues: { materialName: '', materialUrl: '' },
  });


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
    setIsSavingQuestions(true);
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
      setIsSavingQuestions(false);
    }
  };

  const handleAddMaterial = async (data: AddMaterialFormData) => {
    if (!course || !userProfile?.collegeId || !languageId) return;
    setIsProcessingMaterial(true);
    const newMaterial: CourseMaterial = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // Simple unique ID
      name: data.materialName,
      url: data.materialUrl,
      addedAt: Timestamp.now(),
    };
    try {
      const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
      await updateDoc(courseDocRef, {
        courseMaterials: arrayUnion(newMaterial),
        updatedAt: serverTimestamp(),
      });
      setCourse(prev => prev ? ({...prev, courseMaterials: [...(prev.courseMaterials || []), newMaterial]}) : null);
      toast({ title: "Material Added", description: `"${data.materialName}" has been added.` });
      materialForm.reset();
      setIsAddMaterialDialogOpen(false);
    } catch (error) {
      console.error("Error adding material:", error);
      toast({ title: "Error", description: "Failed to add material.", variant: "destructive" });
    } finally {
      setIsProcessingMaterial(false);
    }
  };
  
  const handleRemoveMaterial = async (materialIdToRemove: string) => {
    if (!course || !userProfile?.collegeId || !languageId || !course.courseMaterials) return;
    setIsProcessingMaterial(true);
    try {
      const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
      const materialToRemove = course.courseMaterials.find(m => m.id === materialIdToRemove);
      if (materialToRemove) {
        await updateDoc(courseDocRef, {
          courseMaterials: arrayRemove(materialToRemove), // arrayRemove requires the exact object
          updatedAt: serverTimestamp(),
        });
        setCourse(prev => prev ? ({
          ...prev, 
          courseMaterials: prev.courseMaterials?.filter(m => m.id !== materialIdToRemove) || []
        }) : null);
        toast({ title: "Material Removed", description: "The course material has been removed." });
      } else {
        toast({ title: "Error", description: "Material not found for removal.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error removing material:", error);
      toast({ title: "Error", description: "Failed to remove material.", variant: "destructive" });
    } finally {
      setIsProcessingMaterial(false);
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
        <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-xl font-headline flex items-center"><LinkIcon className="w-6 h-6 mr-2 text-primary" />Course Materials (PDF Links)</CardTitle>
            <Dialog open={isAddMaterialDialogOpen} onOpenChange={setIsAddMaterialDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add New Material</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Course Material</DialogTitle>
                        <DialogDescription>Enter a name and a public URL for the PDF material.</DialogDescription>
                    </DialogHeader>
                    <Form {...materialForm}>
                        <form onSubmit={materialForm.handleSubmit(handleAddMaterial)} className="space-y-4 py-2">
                            <FormField control={materialForm.control} name="materialName" render={({ field }) => (
                                <FormItem><FormLabel>Material Name</FormLabel><FormControl><Input placeholder="e.g., Chapter 1 Slides" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={materialForm.control} name="materialUrl" render={({ field }) => (
                                <FormItem><FormLabel>Material URL</FormLabel><FormControl><Input type="url" placeholder="https://example.com/document.pdf" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isProcessingMaterial}>{isProcessingMaterial && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Material</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
            {(!course.courseMaterials || course.courseMaterials.length === 0) && (
                 <p className="text-sm text-muted-foreground">No course materials added yet.</p>
            )}
            {course.courseMaterials && course.courseMaterials.length > 0 && (
                <ul className="space-y-2">
                    {course.courseMaterials.map(material => (
                        <li key={material.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                                <FileTextIcon className="h-5 w-5 text-primary"/>
                                <div>
                                    <p className="text-sm font-medium">{material.name}</p>
                                    <a href={material.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline truncate" title={material.url}>
                                       {material.url.length > 50 ? `${material.url.substring(0,47)}...` : material.url}
                                    </a>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMaterial(material.id)} disabled={isProcessingMaterial} title="Remove Material">
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </li>
                    ))}
                </ul>
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
            <Button onClick={handleSaveAssignedQuestions} disabled={isSavingQuestions || isProcessingMaterial}><Save className="mr-2 h-4 w-4"/> Save Assigned Questions</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

