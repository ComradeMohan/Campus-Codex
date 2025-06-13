
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, doc, setDoc, updateDoc, arrayUnion, serverTimestamp, Timestamp, FieldValue, limit, runTransaction } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, AlertTriangle, CheckCircle, TerminalSquare, Zap, PlayCircle, ListChecks, Users, GraduationCap, UserCheck, UserX, Hourglass, Send, Users2, Info } from 'lucide-react';
import type { ProgrammingLanguage, Course, EnrollmentRequest, EnrollmentRequestStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AICodeAssistant } from '@/components/AICodeAssistant';

interface LanguageWithCourses extends ProgrammingLanguage {
  courses: Course[];
  iconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
}

const getIconComponent = (iconName?: string): React.FC<React.SVGProps<SVGSVGElement>> => {
  if (iconName && LucideIcons[iconName as keyof typeof LucideIcons]) {
    return LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;
  }
  return BookOpen; // Default icon
};

export default function StudentCodingLabsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [detailedCollegeLanguages, setDetailedCollegeLanguages] = useState<LanguageWithCourses[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [enrolledLanguageIds, setEnrolledLanguageIds] = useState<Set<string>>(new Set());
  const [isEnrolling, setIsEnrolling] = useState<Record<string, boolean>>({}); // languageId: boolean
  const [isProcessingCourseEnrollment, setIsProcessingCourseEnrollment] = useState<Record<string, boolean>>({}); // courseId: boolean
  const [languageHasPublishedTests, setLanguageHasPublishedTests] = useState<Map<string, boolean>>(new Map());

  const fetchCollegeLanguagesAndCourses = useCallback(async (collegeId: string) => {
    setIsLoadingLanguages(true);
    try {
      const languagesRef = collection(db, 'colleges', collegeId, 'languages');
      const langQuery = query(languagesRef, orderBy('name', 'asc'));
      const languagesSnapshot = await getDocs(langQuery);

      const languagesWithCoursesPromises = languagesSnapshot.docs.map(async (langDoc) => {
        const langData = {
          id: langDoc.id, ...langDoc.data(),
          createdAt: langDoc.data().createdAt as Timestamp,
        } as ProgrammingLanguage;

        const coursesRef = collection(db, 'colleges', collegeId, 'languages', langDoc.id, 'courses');
        const courseQuery = query(coursesRef, orderBy('name', 'asc'));
        const coursesSnapshot = await getDocs(courseQuery);
        const courses = coursesSnapshot.docs.map(cDoc => ({ id: cDoc.id, ...cDoc.data() } as Course));

        const testsRef = collection(db, 'colleges', collegeId, 'languages', langDoc.id, 'tests');
        const publishedTestsQuery = query(testsRef, where('status', '==', 'published'), limit(1));
        const testsSnap = await getDocs(publishedTestsQuery);
        setLanguageHasPublishedTests(prevMap => new Map(prevMap).set(langDoc.id, !testsSnap.empty));

        return {
          ...langData,
          iconComponent: getIconComponent(langData.iconName),
          courses: courses,
        } as LanguageWithCourses;
      });

      const fetchedDetailedLanguages = await Promise.all(languagesWithCoursesPromises);
      setDetailedCollegeLanguages(fetchedDetailedLanguages);

    } catch (error) {
      console.error('Error fetching college languages and courses:', error);
      toast({ title: 'Error', description: 'Failed to fetch available courses.', variant: 'destructive' });
    } finally {
      setIsLoadingLanguages(false);
    }
  }, [toast]);

  const fetchEnrolledLanguages = useCallback(async (studentUid: string) => {
    try {
      const enrolledLanguagesRef = collection(db, 'users', studentUid, 'enrolledLanguages');
      const querySnapshot = await getDocs(enrolledLanguagesRef);
      const ids = new Set<string>();
      querySnapshot.forEach(langDoc => ids.add(langDoc.id));
      setEnrolledLanguageIds(ids);
    } catch (error) {
      console.error('Error fetching enrolled languages:', error);
      toast({ title: 'Error', description: 'Failed to fetch your enrolled main subjects.', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    if (userProfile?.collegeId) {
      fetchCollegeLanguagesAndCourses(userProfile.collegeId);
    }
    if (userProfile?.uid) {
      fetchEnrolledLanguages(userProfile.uid);
    }
    if (!authLoading && !userProfile) {
       setIsLoadingLanguages(false);
    }
  }, [userProfile, authLoading, fetchCollegeLanguagesAndCourses, fetchEnrolledLanguages]);


  const handleEnrollInLanguage = async (language: ProgrammingLanguage) => {
    if (!userProfile?.uid) {
      toast({ title: 'Error', description: 'You must be logged in to enroll.', variant: 'destructive' });
      return;
    }
    if (enrolledLanguageIds.has(language.id)) {
      toast({ title: 'Already Enrolled', description: `You are already enrolled in ${language.name}.`, variant: 'default' });
      return;
    }

    setIsEnrolling(prev => ({ ...prev, [language.id]: true }));
    try {
      const enrollmentRef = doc(db, 'users', userProfile.uid, 'enrolledLanguages', language.id);
      await setDoc(enrollmentRef, {
        languageId: language.id,
        languageName: language.name,
        iconName: language.iconName || 'BookOpen',
        enrolledAt: serverTimestamp(),
        currentScore: 0,
        completedQuestions: {},
      });
      setEnrolledLanguageIds(prev => new Set(prev).add(language.id));
      toast({ title: 'Enrollment Successful!', description: `You have enrolled in ${language.name}. You can now access its practice labs.` });
    } catch (error) {
      console.error('Error enrolling in language:', error);
      toast({ title: 'Enrollment Failed', description: `Could not enroll in ${language.name}. Please try again.`, variant: 'destructive' });
    } finally {
      setIsEnrolling(prev => ({ ...prev, [language.id]: false }));
    }
  };
  
  const handleCourseEnrollmentRequest = async (course: Course) => {
    if (!userProfile?.uid || !userProfile.collegeId) {
      toast({ title: "Error", description: "User or college information missing.", variant: "destructive" });
      return;
    }
    if ((course.enrolledStudentUids?.length || 0) >= course.strength) {
        toast({ title: "Course Full", description: `Sorry, "${course.name}" has reached its maximum capacity.`, variant: "default" });
        return;
    }
    setIsProcessingCourseEnrollment(prev => ({ ...prev, [course.id]: true }));
    try {
      const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', course.languageId, 'courses', course.id);
      
      await runTransaction(db, async (transaction) => {
        const courseDocSnap = await transaction.get(courseDocRef);
        if (!courseDocSnap.exists()) {
          throw new Error("Course document does not exist!");
        }
        const currentCourseData = courseDocSnap.data() as Course;
        let existingRequests = currentCourseData.enrollmentRequests || [];

        const hasExistingPendingRequest = existingRequests.some(
          req => req.studentUid === userProfile.uid && req.status === 'pending'
        );
        if (hasExistingPendingRequest) {
          console.log("Student already has a pending request for this course.");
          // Do not throw error, just return, as toast will be shown by UI logic
          return; 
        }
        
        const newRequestObject: EnrollmentRequest = {
          studentUid: userProfile.uid,
          studentName: userProfile.fullName,
          studentEmail: userProfile.email || undefined,
          requestedAt: Timestamp.now(), 
          status: 'pending',
        };
        
        const updatedRequests = [...existingRequests, newRequestObject];
        
        transaction.update(courseDocRef, {
          enrollmentRequests: updatedRequests,
          updatedAt: serverTimestamp()
        });
      });
      
      const newRequestForUI: EnrollmentRequest = {
        studentUid: userProfile.uid,
        studentName: userProfile.fullName,
        studentEmail: userProfile.email || undefined,
        requestedAt: Timestamp.now(), 
        status: 'pending',
      };

      setDetailedCollegeLanguages(prevLangs => prevLangs.map(lang => {
        if (lang.id === course.languageId) {
          return {
            ...lang,
            courses: lang.courses.map(c => {
              if (c.id === course.id) {
                const existingRequests = c.enrollmentRequests || [];
                 // Avoid adding duplicate if already handled by optimistic check before transaction
                if (!existingRequests.some(req => req.studentUid === newRequestForUI.studentUid && req.status === 'pending')) {
                    return { ...c, enrollmentRequests: [...existingRequests, newRequestForUI] };
                }
                return c;
              }
              return c;
            })
          };
        }
        return lang;
      }));

      toast({ title: "Enrollment Requested", description: `Your request to enroll in "${course.name}" has been sent to the faculty.` });
    } catch (error: any) {
      console.error("Error requesting course enrollment:", error);
      if (error.message === "Course document does not exist!") {
        toast({ title: "Error", description: "Could not find the course to enroll. It might have been removed.", variant: "destructive" });
      } else if (error.message?.includes("Student already has a pending request")) {
        // This specific error message isn't thrown, but it's a good place for this kind of check
        toast({ title: "Request Pending", description: `You already have a pending request for "${course.name}".`, variant: "default" });
      }
      else {
        toast({ title: "Error", description: `Failed to request enrollment in "${course.name}". Please try again.`, variant: "destructive" });
      }
    } finally {
      setIsProcessingCourseEnrollment(prev => ({ ...prev, [course.id]: false }));
    }
  };

  const getStudentCourseEnrollmentStatus = (course: Course): { 
    status: 'enrolled' | 'pending' | 'rejected_can_request_again' | 'full' | 'not_requested'; 
    message?: string 
  } => {
    if (!userProfile) return { status: 'not_requested' };
    if (course.enrolledStudentUids?.includes(userProfile.uid)) return { status: 'enrolled' };
  
    const studentRequests = (course.enrollmentRequests || [])
      .filter(req => req.studentUid === userProfile.uid)
      .sort((a, b) => {
        // Ensure robust timestamp comparison
        const timeA = (a.requestedAt as Timestamp)?.toMillis?.() || 0;
        const timeB = (b.requestedAt as Timestamp)?.toMillis?.() || 0;
        return timeB - timeA; // Sort descending to get latest first
      });
  
    if (studentRequests.length > 0) {
      const latestRequest = studentRequests[0];
      if (latestRequest.status === 'pending') {
        return { status: 'pending' };
      }
      if (latestRequest.status === 'rejected') {
        return { status: 'rejected_can_request_again', message: latestRequest.rejectionReason || "Your previous enrollment request was not approved." };
      }
      // If latest status is 'approved' but not in enrolledStudentUids, it's an inconsistent state.
      // This shouldn't happen if faculty approval logic is correct.
      if (latestRequest.status === 'approved' && !course.enrolledStudentUids?.includes(userProfile.uid)) {
          console.warn(`Inconsistent state: Student ${userProfile.uid} has an approved request for course ${course.id} but is not in enrolledStudentUids.`);
          // Could treat as 'pending' or display an error to the student. For now, let them re-request.
          return { status: 'not_requested', message: "There was an issue with your previous approval. Please request again." };
      }
    }
  
    // If no relevant request, check if course is full
    if ((course.enrolledStudentUids?.length || 0) >= course.strength) {
      return { status: 'full' };
    }
  
    return { status: 'not_requested' };
  };


  if (authLoading || (isLoadingLanguages && userProfile)) {
    return (
      <div className="space-y-8">
        <Card>
            <CardHeader><CardTitle className="h-7 bg-muted rounded w-1/2 animate-pulse"></CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
                        <div className="h-6 bg-muted rounded w-1/2 animate-pulse"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                    <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
                </Card>
            ))}
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
     return (
     <div className="container mx-auto py-8 text-center">
       <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
       <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
       <p className="text-muted-foreground mb-4">You must be logged in to view and enroll in labs.</p>
       <Button asChild><Link href="/login">Go to Login</Link></Button>
     </div>);
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <TerminalSquare className="w-7 h-7 mr-3 text-primary" />
            Available Subjects & Courses at {userProfile?.collegeName}
          </CardTitle>
          <CardDescription>
            Welcome {userProfile?.fullName}! Enroll in a subject to access practice labs, or explore specific courses offered by faculty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detailedCollegeLanguages.length === 0 && !isLoadingLanguages ? (
            <div className="text-center py-10">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">No Subjects Available Yet</p>
              <p className="text-sm text-muted-foreground">
                Your college ({userProfile?.collegeName}) hasn't added any programming languages or courses to the platform.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {detailedCollegeLanguages.map((language) => {
                const LanguageIcon = language.iconComponent;
                const isCurrentlyEnrollingInLanguage = isEnrolling[language.id];
                const isAlreadyEnrolledInLanguage = enrolledLanguageIds.has(language.id);
                const hasPublishedTestsForLanguage = languageHasPublishedTests.get(language.id) === true;

                return (
                  <Card key={language.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                    <CardHeader className="flex flex-row items-start space-x-4 pb-3">
                      <LanguageIcon className="w-10 h-10 text-primary mt-1" />
                      <div>
                        <CardTitle className="text-xl font-semibold">{language.name}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          {language.description || 'Core programming subject.'}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          {isAlreadyEnrolledInLanguage ? (
                            <>
                              <Button asChild variant="secondary" className="w-full sm:flex-1">
                                <Link href={`/student/labs/${language.id}/practice`}>
                                  <PlayCircle className="mr-2 h-4 w-4" /> Practice Labs
                                </Link>
                              </Button>
                              {hasPublishedTestsForLanguage && (
                                <Button asChild variant="outline" className="w-full sm:flex-1">
                                  <Link href={`/student/labs/${language.id}/tests`}>
                                    <ListChecks className="mr-2 h-4 w-4" /> View Tests
                                  </Link>
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button
                              onClick={() => handleEnrollInLanguage(language)}
                              disabled={isCurrentlyEnrollingInLanguage || !userProfile?.uid}
                              className="w-full"
                              variant={"default"}
                            >
                              {isCurrentlyEnrollingInLanguage ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                `Enroll in ${language.name} Labs`
                              )}
                            </Button>
                          )}
                        </div>
                        {language.courses.length > 0 && <Separator className="my-3"/>}
                        {language.courses.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Specific Courses in {language.name}:</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {language.courses.map(course => {
                                        const enrollmentStatusInfo = getStudentCourseEnrollmentStatus(course);
                                        const currentEnrollment = course.enrolledStudentUids?.length || 0;
                                        const isCourseFullForNewEnrollment = currentEnrollment >= course.strength && (enrollmentStatusInfo.status === 'not_requested' || enrollmentStatusInfo.status === 'rejected_can_request_again');

                                        return (
                                            <Card key={course.id} className="p-3 bg-background hover:bg-muted/50 transition-colors flex flex-col">
                                                <CardTitle className="text-md font-medium line-clamp-1">{course.name}</CardTitle>
                                                <CardDescription className="text-xs mt-0.5">
                                                    By: {course.facultyName}
                                                </CardDescription>
                                                {course.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-grow">{course.description}</p>}
                                                <div className="text-xs text-muted-foreground mt-1.5 flex items-center">
                                                  <Users2 className="w-3.5 h-3.5 mr-1.5"/> Capacity: {currentEnrollment} / {course.strength}
                                                </div>
                                                <div className="mt-2.5">
                                                    {enrollmentStatusInfo.status === 'enrolled' ? (
                                                        <Button size="sm" variant="secondary" className="w-full text-xs h-8" disabled>
                                                            <UserCheck className="mr-2 h-4 w-4"/> Enrolled
                                                        </Button>
                                                    ) : enrollmentStatusInfo.status === 'pending' ? (
                                                        <Button size="sm" variant="secondary" className="w-full text-xs h-8" disabled>
                                                            <Hourglass className="mr-2 h-4 w-4"/> Enrollment Pending
                                                        </Button>
                                                    ) : enrollmentStatusInfo.status === 'rejected_can_request_again' ? (
                                                        <>
                                                            <div className="w-full p-1.5 mb-1.5 text-center text-xs bg-destructive/10 text-destructive rounded-md flex items-center justify-center gap-1">
                                                                <Info className="h-3.5 w-3.5 shrink-0"/> {enrollmentStatusInfo.message}
                                                            </div>
                                                            <Button 
                                                                size="sm" 
                                                                className="w-full text-xs h-8"
                                                                onClick={() => handleCourseEnrollmentRequest(course)}
                                                                disabled={isProcessingCourseEnrollment[course.id] || !isAlreadyEnrolledInLanguage || isCourseFullForNewEnrollment}
                                                                title={!isAlreadyEnrolledInLanguage ? `Enroll in ${language.name} labs first` : isCourseFullForNewEnrollment ? "Course is full" : `Request enrollment for ${course.name}`}
                                                            >
                                                                {isProcessingCourseEnrollment[course.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>} 
                                                                Request to Enroll Again
                                                            </Button>
                                                        </>
                                                    ) : enrollmentStatusInfo.status === 'full' || isCourseFullForNewEnrollment ? (
                                                        <Button size="sm" variant="outline" className="w-full text-xs h-8" disabled>
                                                            <UserX className="mr-2 h-4 w-4 text-muted-foreground"/> Course Full
                                                        </Button>
                                                    ) : ( // status is 'not_requested'
                                                        <Button 
                                                            size="sm" 
                                                            className="w-full text-xs h-8"
                                                            onClick={() => handleCourseEnrollmentRequest(course)}
                                                            disabled={isProcessingCourseEnrollment[course.id] || !isAlreadyEnrolledInLanguage}
                                                            title={!isAlreadyEnrolledInLanguage ? `Enroll in ${language.name} labs first` : `Request enrollment for ${course.name}`}
                                                        >
                                                            {isProcessingCourseEnrollment[course.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>} 
                                                            Request to Enroll
                                                        </Button>
                                                    )}
                                                     {!isAlreadyEnrolledInLanguage && (enrollmentStatusInfo.status === 'not_requested' || enrollmentStatusInfo.status === 'rejected_can_request_again') && !isCourseFullForNewEnrollment && (
                                                        <p className="text-xs text-muted-foreground mt-1 text-center">Enroll in "{language.name}" labs first to request course enrollment.</p>
                                                    )}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                         {language.courses.length === 0 && isAlreadyEnrolledInLanguage && (
                            <p className="text-xs text-muted-foreground text-center pt-2">No specific faculty-led courses listed for {language.name} yet. You can still access general practice labs.</p>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AICodeAssistant />
    </div>
  );
}
