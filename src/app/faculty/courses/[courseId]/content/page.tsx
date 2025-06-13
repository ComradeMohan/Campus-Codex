
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase'; // Added storage
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'; // Firebase storage imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; // For file input styling
import { Label } from '@/components/ui/label'; // For file input styling
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, BookOpen, AlertTriangle, ListChecks, Tag, Star, Save, UploadCloud, FileText, Trash2, PlusCircle } from 'lucide-react';
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
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


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

  const handleSaveChanges = async () => {
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
      toast({ title: "Error", description: "Failed to save course content.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!course || !userProfile?.collegeId || !languageId) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
        toast({title: "Invalid File Type", description: "Please upload a PDF file.", variant: "destructive"});
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({title: "File Too Large", description: "PDF file size should not exceed 5MB.", variant: "destructive"});
        return;
    }

    setIsUploadingPdf(true);
    try {
        // Delete existing PDF if one exists
        if (course.courseMaterialPdfUrl) {
            try {
                const oldFileRef = storageRef(storage, course.courseMaterialPdfUrl);
                await deleteObject(oldFileRef);
            } catch (deleteError: any) {
                // If old file doesn't exist or other error, log it but proceed with upload
                if (deleteError.code !== 'storage/object-not-found') {
                    console.warn("Could not delete old PDF, it might have been already removed:", deleteError);
                }
            }
        }

        const pdfFileName = `${Date.now()}-${file.name}`;
        const pdfPath = `colleges/${userProfile.collegeId}/languages/${languageId}/courses/${courseId}/materials/${pdfFileName}`;
        const pdfStorageRef = storageRef(storage, pdfPath);
        
        const uploadTask = uploadBytesResumable(pdfStorageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => { /* Can be used for progress indication */ },
            (error) => {
                console.error("PDF Upload error:", error);
                toast({ title: "Upload Failed", description: "Could not upload PDF. " + error.message, variant: "destructive" });
                setIsUploadingPdf(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const courseDocRef = doc(db, 'colleges', userProfile.collegeId!, 'languages', languageId, 'courses', courseId);
                await updateDoc(courseDocRef, {
                    courseMaterialPdfUrl: downloadURL,
                    courseMaterialPdfName: file.name,
                    updatedAt: serverTimestamp()
                });
                setCourse(prev => prev ? ({...prev, courseMaterialPdfUrl: downloadURL, courseMaterialPdfName: file.name}) : null);
                toast({ title: "PDF Uploaded", description: `${file.name} has been successfully uploaded.` });
                setIsUploadingPdf(false);
                if(fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
            }
        );
    } catch (error) {
        console.error("Error preparing PDF upload:", error);
        toast({ title: "Upload Error", description: "Failed to initiate PDF upload.", variant: "destructive" });
        setIsUploadingPdf(false);
    }
  };

  const handleRemovePdf = async () => {
    if (!course || !userProfile?.collegeId || !languageId || !course.courseMaterialPdfUrl) return;
    setIsUploadingPdf(true); // Use same state for busy indicator
    try {
        const fileRef = storageRef(storage, course.courseMaterialPdfUrl);
        await deleteObject(fileRef);
        
        const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
        await updateDoc(courseDocRef, {
            courseMaterialPdfUrl: null,
            courseMaterialPdfName: null,
            updatedAt: serverTimestamp()
        });
        setCourse(prev => prev ? ({...prev, courseMaterialPdfUrl: undefined, courseMaterialPdfName: undefined}) : null);
        toast({ title: "PDF Removed", description: "The course material PDF has been removed." });
    } catch (error: any) {
        console.error("Error removing PDF:", error);
        if (error.code === 'storage/object-not-found') {
             // If file not found in storage, just clear DB fields
            const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
            await updateDoc(courseDocRef, {
                courseMaterialPdfUrl: null,
                courseMaterialPdfName: null,
                updatedAt: serverTimestamp()
            });
            setCourse(prev => prev ? ({...prev, courseMaterialPdfUrl: undefined, courseMaterialPdfName: undefined}) : null);
            toast({ title: "PDF Cleared", description: "PDF reference cleared, file was not found in storage." });
        } else {
            toast({ title: "Error", description: "Failed to remove PDF material.", variant: "destructive" });
        }
    } finally {
        setIsUploadingPdf(false);
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
        <CardHeader><CardTitle className="text-xl font-headline flex items-center"><UploadCloud className="w-6 h-6 mr-2 text-primary" />Course Materials (PDF)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="pdf-upload">Upload PDF Material (Max 5MB)</Label>
                <Input id="pdf-upload" type="file" accept=".pdf" onChange={handlePdfUpload} disabled={isUploadingPdf} ref={fileInputRef} className="mt-1"/>
            </div>
            {isUploadingPdf && <div className="flex items-center text-sm text-primary"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</div>}
            {course.courseMaterialPdfUrl && course.courseMaterialPdfName && !isUploadingPdf && (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary"/>
                        <a href={course.courseMaterialPdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline" title={course.courseMaterialPdfName}>
                            {course.courseMaterialPdfName.length > 40 ? `${course.courseMaterialPdfName.substring(0,37)}...` : course.courseMaterialPdfName}
                        </a>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleRemovePdf} disabled={isUploadingPdf} title="Remove PDF">
                        <Trash2 className="h-4 w-4 text-destructive"/>
                    </Button>
                </div>
            )}
            {!course.courseMaterialPdfUrl && !isUploadingPdf && <p className="text-xs text-muted-foreground">No PDF material uploaded yet.</p>}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-xl font-headline flex items-center"><ListChecks className="w-6 h-6 mr-2 text-primary" />Assign Questions</CardTitle>
                    <CardDescription>Select questions from the {language.name} question bank to include in this course.</CardDescription>
                </div>
                <Button asChild variant="outline">
                    <Link href={`/admin/courses/${languageId}/questions`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" /> Add New Questions to Bank
                    </Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          {allLanguageQuestions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No questions available in the {language.name} question bank. Use the button above to add some.</p>
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
            <Button onClick={handleSaveChanges} disabled={isSaving || isUploadingPdf}><Save className="mr-2 h-4 w-4"/> Save Assigned Questions</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
