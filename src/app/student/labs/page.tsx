
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, doc, setDoc, updateDoc, arrayUnion, serverTimestamp, Timestamp, FieldValue, limit, runTransaction } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, AlertTriangle, CheckCircle, TerminalSquare, Zap, PlayCircle, ListChecks, Users, GraduationCap, UserCheck, UserX, Hourglass, Send, Users2, Info, FileText } from 'lucide-react';
import type { ProgrammingLanguage, Course, EnrollmentRequest, EnrollmentRequestStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
      const sortedLanguages = [...fetchedDetailedLanguages].sort((a, b) => {
        const aHasCourses = a.courses && a.courses.length > 0;
        const bHasCourses = b.courses && b.courses.length > 0;
        if (aHasCourses && !bHasCourses) return 1;
        if (!aHasCourses && bHasCourses) return -1;
        return 0;
      });
      setDetailedCollegeLanguages(sortedLanguages);

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
          // Throw an error to be caught and display a specific toast
          throw new Error(`Student already has a pending request for "${course.name}".`);
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
        const timeA = (a.requestedAt instanceof Timestamp ? a.requestedAt.toMillis() : (typeof a.requestedAt === 'object' && a.requestedAt && 'seconds' in a.requestedAt ? (a.requestedAt as Timestamp).toMillis() : 0));
        const timeB = (b.requestedAt instanceof Timestamp ? b.requestedAt.toMillis() : (typeof b.requestedAt === 'object' && b.requestedAt && 'seconds' in b.requestedAt ? (b.requestedAt as Timestamp).toMillis() : 0));
        return timeB - timeA; 
      });
  
    if (studentRequests.length > 0) {
      const latestRequest = studentRequests[0];
      if (latestRequest.status === 'pending') {
        return { status: 'pending' };
      }
      if (latestRequest.status === 'rejected') {
        return { status: 'rejected_can_request_again', message: latestRequest.rejectionReason || "Your previous enrollment request was not approved." };
      }
      if (latestRequest.status === 'approved' && !course.enrolledStudentUids?.includes(userProfile.uid)) {
          console.warn(`Inconsistent state: Student ${userProfile.uid} has an approved request for course ${course.id} but is not in enrolledStudentUids.`);
          return { status: 'not_requested', message: "There was an issue with your previous approval. Please request again." };
      }
    }
  
    if ((course.enrolledStudentUids?.length || 0) >= course.strength) {
      return { status: 'full' };
    }
  
    return { status: 'not_requested' };
  };


  if (authLoading || (isLoadingLanguages && userProfile)) {
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-4 w-4/5 mt-2" />
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 flex flex-col h-full">
                <div className="flex items-start space-x-4 mb-4">
                  <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
                <div className="space-y-3 mt-auto">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-px w-full" />
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </Card>
            ))}
        </div>
      </div>
    );
  }

  if (!userProfile) {
     return (
     <div className="container mx-auto py-8 text-center">
       <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><h1 className="text-2xl font-bold mb-2">Access Denied</h1>
       <p className="text-muted-foreground mb-4">You must be logged in to view and enroll in labs.</p>
       <Button asChild><Link href="/login">Go to Login</Link></Button>
     </div>);
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <TerminalSquare className="w-7 h-7 mr-3 text-primary" />
            Available Subjects & Courses at {userProfile?.collegeName}
          </CardTitle>
          <CardDescription>
            Welcome {userProfile?.fullName}! Enroll in a subject to access its practice labs and view available online tests, or explore specific courses offered by faculty.
          </CardDescription>
        </CardHeader>
      </Card>
        
      {detailedCollegeLanguages.length === 0 && !isLoadingLanguages ? (
        <Card className="shadow-md">
            <CardContent className="py-10 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">No Subjects Available Yet</p>
                <p className="text-sm text-muted-foreground">Your college ({userProfile?.collegeName}) hasn't added any programming languages or courses to the platform.</p>
            </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {detailedCollegeLanguages.map((language) => {
            const LanguageIcon = language.iconComponent;
            const isCurrentlyEnrollingInLanguage = isEnrolling[language.id];
            const isAlreadyEnrolledInLanguage = enrolledLanguageIds.has(language.id);
            const hasPublishedTestsForLanguage = languageHasPublishedTests.get(language.id) === true;

            return (
              <Card key={language.id} className="shadow-md hover:shadow-lg border border-border/40 hover:border-primary/20 hover-glow transition-all duration-300 bg-card/60 backdrop-blur-sm flex flex-col rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-start gap-4 pb-4">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit flex-shrink-0">
                    <LanguageIcon className="w-7 h-7" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <CardTitle className="text-xl font-bold font-headline truncate">{language.name}</CardTitle>
                    <CardDescription className="text-xs mt-1 text-muted-foreground line-clamp-2 leading-relaxed">
                      {language.description || 'Core programming subject for practice and assessments.'}
                    </CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-5 pb-6">
                  {/* General Labs Practice/Enroll Actions */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {isAlreadyEnrolledInLanguage ? (
                        <>
                          <Button asChild variant="secondary" className="w-full sm:flex-1 text-xs font-bold rounded-xl py-5 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            <Link href={`/student/labs/${language.id}/practice`} className="flex items-center justify-center gap-1.5">
                              <PlayCircle className="h-4 w-4" /> Practice Labs
                            </Link>
                          </Button>
                          {hasPublishedTestsForLanguage && (
                            <Button asChild variant="outline" className="w-full sm:flex-1 text-xs font-bold rounded-xl py-5 hover:scale-[1.02] active:scale-[0.98] transition-all border-primary/20 text-primary hover:bg-primary/5">
                              <Link href={`/student/labs/${language.id}/tests`} className="flex items-center justify-center gap-1.5">
                                <ListChecks className="h-4 w-4" /> View Tests
                              </Link>
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button 
                          onClick={() => handleEnrollInLanguage(language)} 
                          disabled={isCurrentlyEnrollingInLanguage || !userProfile?.uid} 
                          className="w-full text-xs font-bold py-5 rounded-xl bg-primary hover:bg-primary/95 text-white hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center" 
                          variant="default"
                        >
                          {isCurrentlyEnrollingInLanguage ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <GraduationCap className="h-4 w-4 mr-1.5" />} 
                          Enroll in {language.name} Labs
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Courses Section */}
                  {language.courses.length > 0 ? (
                    <div className="flex flex-col pt-4 border-t border-border/40 min-h-0">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" /> Faculty-Led Courses
                      </h4>
                      
                      {!isAlreadyEnrolledInLanguage && (
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/5 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/10 text-xs mb-3">
                          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                          <p className="leading-relaxed font-sans">
                            Enroll in the <strong>{language.name} Labs</strong> above to request course enrollment.
                          </p>
                        </div>
                      )}

                      <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
                        {language.courses.map(course => {
                          const enrollmentStatusInfo = getStudentCourseEnrollmentStatus(course);
                          const currentEnrollment = course.enrolledStudentUids?.length || 0;
                          const isCourseFullForNewEnrollment = currentEnrollment >= course.strength && (enrollmentStatusInfo.status === 'not_requested' || enrollmentStatusInfo.status === 'rejected_can_request_again');

                          return (
                            <div key={course.id} className="p-3.5 rounded-xl border border-border/40 bg-background/40 hover:bg-background/80 transition-colors flex flex-col justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className="text-sm font-bold text-foreground line-clamp-1 leading-snug">{course.name}</h5>
                                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground font-mono">
                                    {currentEnrollment}/{course.strength}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">Instructor: <span className="font-semibold text-foreground/80">{course.facultyName}</span></p>
                                {course.description && <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed pt-0.5">{course.description}</p>}
                              </div>

                              <div className="w-full">
                                {enrollmentStatusInfo.status === 'enrolled' ? (
                                  <Button size="sm" variant="default" className="w-full text-xs h-9 bg-primary hover:bg-primary/95 text-white rounded-lg font-bold" asChild>
                                    <Link href={`/student/courses/${course.id}?languageId=${language.id}`} className="flex items-center justify-center gap-1.5">
                                      <FileText className="h-3.5 w-3.5"/> View Course
                                    </Link>
                                  </Button>
                                ) : enrollmentStatusInfo.status === 'pending' ? (
                                  <Button size="sm" variant="secondary" className="w-full text-xs h-9 rounded-lg font-bold" disabled>
                                    <Hourglass className="mr-1.5 h-3.5 w-3.5"/> Request Pending
                                  </Button>
                                ) : enrollmentStatusInfo.status === 'rejected_can_request_again' ? (
                                  <div className="space-y-2">
                                    <div className="p-2 text-center text-[10px] leading-relaxed bg-destructive/10 text-destructive rounded-lg flex items-center justify-center gap-1">
                                      <Info className="h-3 w-3 shrink-0"/> {enrollmentStatusInfo.message}
                                    </div>
                                    <Button size="sm" className="w-full text-xs h-9 rounded-lg font-bold bg-primary text-white" onClick={() => handleCourseEnrollmentRequest(course)} disabled={isProcessingCourseEnrollment[course.id] || !isAlreadyEnrolledInLanguage || isCourseFullForNewEnrollment}>
                                      {isProcessingCourseEnrollment[course.id] ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <Send className="mr-1.5 h-3.5 w-3.5"/>} Request Again
                                    </Button>
                                  </div>
                                ) : enrollmentStatusInfo.status === 'full' || isCourseFullForNewEnrollment ? (
                                  <Button size="sm" variant="outline" className="w-full text-xs h-9 rounded-lg font-bold" disabled>
                                    <UserX className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/> Course Full
                                  </Button>
                                ) : (
                                  <Button size="sm" className="w-full text-xs h-9 rounded-lg font-bold bg-primary hover:bg-primary/95 text-white hover:scale-[1.01] active:scale-[0.99] transition-all" onClick={() => handleCourseEnrollmentRequest(course)} disabled={isProcessingCourseEnrollment[course.id] || !isAlreadyEnrolledInLanguage}>
                                    {isProcessingCourseEnrollment[course.id] ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <Send className="mr-1.5 h-3.5 w-3.5"/>} Request to Enroll
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    isAlreadyEnrolledInLanguage && (
                      <p className="text-[11px] text-muted-foreground text-center pt-3 border-t border-border/40 leading-relaxed font-sans">
                        No faculty courses scheduled. General practice labs are open.
                      </p>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
