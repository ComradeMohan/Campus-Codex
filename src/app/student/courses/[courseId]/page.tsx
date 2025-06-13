
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, BookOpen, AlertTriangle, FileText, ClipboardList, Tag, Star, Users2, PlayCircle, LinkIcon, ExternalLink, Eye, XCircle, FileText as FileTextIcon } from 'lucide-react';
import type { ProgrammingLanguage, Course, Question as QuestionType, QuestionDifficulty, CourseMaterial } from '@/types';

// Helper function to transform Google Drive links
const transformGoogleDriveLink = (url: string): string | null => {
    if (!url) return null;

    const fileIdMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview#toolbar=0&navpanes=0`;
    }

    const openIdMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openIdMatch && openIdMatch[1]) {
      return `https://drive.google.com/file/d/${openIdMatch[1]}/preview#toolbar=0&navpanes=0`;
    }
    
    if (url.toLowerCase().endsWith('.pdf')) {
        return url; 
    }
    return null; 
};


export default function StudentCourseViewPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const nextSearchParams = useNextSearchParams();
  const { toast } = useToast();

  const courseId = params.courseId as string;
  const languageId = nextSearchParams.get('languageId');

  const [course, setCourse] = useState<Course | null>(null);
  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [assignedQuestions, setAssignedQuestions] = useState<QuestionType[]>([]);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isEnrolledInCourse, setIsEnrolledInCourse] = useState(false);
  
  const [currentViewingMaterial, setCurrentViewingMaterial] = useState<CourseMaterial | null>(null);
  const [embeddableMaterialUrl, setEmbeddableMaterialUrl] = useState<string | null>(null);


  const fetchCourseDetails = useCallback(async () => {
    if (!userProfile?.collegeId || !courseId || !languageId) {
      if (!authLoading) {
         toast({ title: "Error", description: "Missing required information to load course.", variant: "destructive" });
         router.push('/student/labs');
      }
      return;
    }
    setIsLoadingPageData(true);
    try {
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (langSnap.exists()) {
        setLanguage(langSnap.data() as ProgrammingLanguage);
      } else {
        throw new Error("Parent language not found.");
      }

      const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
      const courseSnap = await getDoc(courseDocRef);
      if (!courseSnap.exists()) {
        throw new Error("Course not found.");
      }
      const courseData = courseSnap.data() as Course;
      setCourse(courseData);

      if (courseData.enrolledStudentUids?.includes(userProfile.uid)) {
        setIsEnrolledInCourse(true);
      } else {
        setIsEnrolledInCourse(false);
        toast({ title: "Not Enrolled", description: "You are not enrolled in this course. Redirecting...", variant: "default" });
        router.push('/student/labs');
        return;
      }

      if (courseData.assignedQuestionIds && courseData.assignedQuestionIds.length > 0) {
        const questionsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'questions');
        if (courseData.assignedQuestionIds.length > 0) {
          const questionsQuery = query(questionsRef, where(documentId(), 'in', courseData.assignedQuestionIds));
          const questionsSnapshot = await getDocs(questionsQuery);
          const fetchedQuestions = questionsSnapshot.docs.map(qDoc => ({ id: qDoc.id, ...qDoc.data() } as QuestionType));
          const orderedQuestions = courseData.assignedQuestionIds.map(id => fetchedQuestions.find(q => q.id === id)).filter(Boolean) as QuestionType[];
          setAssignedQuestions(orderedQuestions);
        } else {
          setAssignedQuestions([]);
        }
      } else {
        setAssignedQuestions([]);
      }

    } catch (error: any) {
      console.error("Error fetching course details:", error);
      toast({ title: "Error", description: error.message || "Failed to load course details.", variant: "destructive" });
      router.push('/student/labs');
    } finally {
      setIsLoadingPageData(false);
    }
  }, [userProfile, courseId, languageId, authLoading, router, toast]);

  useEffect(() => {
     if (!languageId) {
      toast({ title: "Missing Information", description: "Language ID is required to view course.", variant: "destructive" });
      router.push('/student/labs');
      return;
    }
    if (!authLoading && userProfile) {
      fetchCourseDetails();
    } else if (!authLoading && !userProfile) {
      router.push('/login');
    }
  }, [authLoading, userProfile, fetchCourseDetails, router, languageId, toast]);

  const handleViewMaterial = (material: CourseMaterial) => {
    const transformedUrl = transformGoogleDriveLink(material.url);
    setEmbeddableMaterialUrl(transformedUrl);
    setCurrentViewingMaterial(material);
  };

  const handleClosePdfViewer = () => {
    setCurrentViewingMaterial(null);
    setEmbeddableMaterialUrl(null);
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

  if (authLoading || isLoadingPageData) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" /><span className="ml-4 text-lg">Loading Course...</span>
      </div>
    );
  }

  if (!course || !language) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3"/>
        <p className="text-lg text-muted-foreground">Course details could not be loaded or you do not have access.</p>
        <Button asChild variant="link" className="mt-4"><Link href="/student/labs">Back to Labs</Link></Button>
      </div>
    );
  }
  
  if (!isEnrolledInCourse) {
      return (
         <div className="container mx-auto py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3"/>
            <p className="text-lg text-muted-foreground">You are not enrolled in this course.</p>
            <Button asChild variant="link" className="mt-4"><Link href="/student/labs">Back to Labs</Link></Button>
        </div>
      );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
            <h1 className="text-3xl font-headline flex items-center">
                <BookOpen className="w-8 h-8 mr-3 text-primary" />
                {course.name}
            </h1>
            <p className="text-sm text-muted-foreground ml-11">Language: {language.name} | Faculty: {course.facultyName}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/student/labs" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to All Labs/Subjects
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Course Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {course.description && <p className="text-muted-foreground">{course.description}</p>}
          <div className="text-sm text-muted-foreground flex items-center">
            <Users2 className="w-4 h-4 mr-2"/> Capacity: {course.enrolledStudentUids?.length || 0} / {course.strength} students
          </div>
          
          {course.courseMaterials && course.courseMaterials.length > 0 && (
            <div className="mt-4">
                <h3 className="text-md font-semibold mb-2 flex items-center">
                    <LinkIcon className="w-5 h-5 mr-2 text-primary"/> Course Materials
                </h3>
                <ul className="space-y-2">
                    {course.courseMaterials.map(material => (
                        <li key={material.id}>
                            <Button 
                                variant="link" 
                                className="p-0 h-auto text-base text-primary hover:underline"
                                onClick={() => handleViewMaterial(material)}
                            >
                                <FileTextIcon className="w-4 h-4 mr-2"/> {material.name}
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
          )}
           {(!course.courseMaterials || course.courseMaterials.length === 0) && (
             <p className="text-sm text-muted-foreground">No course materials provided by faculty.</p>
           )}

            {currentViewingMaterial && (
                <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Viewing: {currentViewingMaterial.name}</h4>
                        <Button onClick={handleClosePdfViewer} variant="outline" size="sm">
                           <XCircle className="mr-2 h-4 w-4"/> Close PDF Viewer
                        </Button>
                    </div>
                    {embeddableMaterialUrl ? (
                        <>
                            <div className="aspect-video md:aspect-[16/10] lg:aspect-[2/1] w-full max-w-4xl mx-auto border-0 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                                <iframe
                                    src={embeddableMaterialUrl}
                                    className="w-full h-full border-0"
                                    title={currentViewingMaterial.name}
                                    allow="fullscreen"
                                ></iframe>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 text-center">If the material doesn&apos;t load correctly, try opening the <a href={currentViewingMaterial.url} target="_blank" rel="noopener noreferrer" className="underline">original link <ExternalLink className="inline h-3 w-3"/></a>.</p>
                        </>
                    ) : (
                        <div className="p-3 bg-muted rounded-md text-center">
                            <p className="text-sm text-muted-foreground">This material could not be embedded directly. Please use the original link:</p>
                            <Button asChild variant="link" className="mt-1">
                                <a href={currentViewingMaterial.url} target="_blank" rel="noopener noreferrer">
                                    Open Material: {currentViewingMaterial.name} <ExternalLink className="ml-1.5 h-4 w-4"/>
                                </a>
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center"><ClipboardList className="w-6 h-6 mr-2 text-primary" />Assigned Questions</CardTitle>
            <CardDescription>Practice questions assigned by your faculty for this course.</CardDescription>
        </CardHeader>
        <CardContent>
          {assignedQuestions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No questions have been assigned to this course yet.</p>
          ) : (
            <div className="space-y-4">
              {assignedQuestions.map((q, index) => (
                <Card key={q.id} className="bg-card border">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start flex-wrap gap-1">
                        <CardTitle className="text-lg font-semibold">Question {index + 1}: {q.questionText.substring(0, 70)}{q.questionText.length > 70 ? "..." : ""}</CardTitle>
                        <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={getDifficultyBadgeVariant(q.difficulty)} className="capitalize text-xs"><Tag className="w-3 h-3 mr-1" />{q.difficulty || 'easy'}</Badge>
                            <Badge variant="outline" className="text-xs"><Star className="w-3 h-3 mr-1" />Score: {q.maxScore || 100}</Badge>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2 mb-2">{q.questionText}</p>
                     <Button asChild size="sm" variant="secondary">
                        <Link href={`/student/labs/${languageId}/practice?questionId=${q.id}&courseId=${courseId}`}>
                           <PlayCircle className="mr-2 h-4 w-4"/> Attempt Question
                        </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

