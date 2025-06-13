
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, FieldValue, Timestamp, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Users, AlertTriangle, CheckCircle, XCircle, Mail, UserCheck, UserX, Hourglass, BookOpen } from 'lucide-react';
import type { ProgrammingLanguage, Course, EnrollmentRequest, EnrollmentRequestStatus } from '@/types';
import { formatDistanceToNowStrict } from 'date-fns';

export default function FacultyManageCourseEnrollmentsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const nextSearchParams = useNextSearchParams();
  const { toast } = useToast();

  const courseId = params.courseId as string;
  const languageId = nextSearchParams.get('languageId'); // Get languageId from query params

  const [course, setCourse] = useState<Course | null>(null);
  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({}); // studentUid: true/false

  const fetchCourseAndLanguageDetails = useCallback(async () => {
    if (!userProfile?.collegeId || !courseId || !languageId) {
      if (!authLoading) router.push('/faculty/dashboard');
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch Language (for context and breadcrumbs)
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (langSnap.exists()) setLanguage(langSnap.data() as ProgrammingLanguage);
      else throw new Error("Associated language not found");

      // Fetch Course
      const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
      const courseSnap = await getDoc(courseDocRef);

      if (courseSnap.exists()) {
        const courseData = courseSnap.data() as Course;
        if (courseData.facultyId !== userProfile.uid) {
          toast({ title: "Unauthorized", description: "You can only manage enrollments for your own courses.", variant: "destructive" });
          setIsAuthorized(false);
          router.push(`/faculty/dashboard`);
          return;
        }
        setCourse(courseData);
        setIsAuthorized(true);
      } else {
        toast({ title: "Error", description: "Course not found.", variant: "destructive" });
        router.push(`/faculty/dashboard`);
      }
    } catch (error: any) {
      console.error("Error fetching details:", error);
      toast({ title: "Error", description: error.message || "Failed to load course enrollment details.", variant: "destructive" });
      router.push(`/faculty/dashboard`);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, courseId, languageId, authLoading, router, toast]);

  useEffect(() => {
    if (!languageId) {
      toast({ title: "Missing Information", description: "Language ID is required to manage course enrollments.", variant: "destructive" });
      router.push('/faculty/dashboard');
      return;
    }
    if (!authLoading && userProfile) {
      fetchCourseAndLanguageDetails();
    } else if (!authLoading && !userProfile) {
      router.push('/login');
    }
  }, [authLoading, userProfile, fetchCourseAndLanguageDetails, router, languageId, toast]);

  const handleProcessRequest = async (studentUid: string, newStatus: EnrollmentRequestStatus) => {
    if (!course || !userProfile?.collegeId || !languageId) return;
    setIsProcessing(prev => ({ ...prev, [studentUid]: true }));

    const courseDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'courses', courseId);
    
    const updatedEnrollmentRequests = (course.enrollmentRequests || []).map(req => 
      req.studentUid === studentUid 
        ? { ...req, status: newStatus, processedBy: userProfile.uid, processedAt: serverTimestamp() as FieldValue }
        : req
    );

    let updatedApprovedStudentUids = [...(course.enrolledStudentUids || [])];
    if (newStatus === 'approved') {
      if ((updatedApprovedStudentUids.length || 0) >= course.strength) {
        toast({ title: "Course Full", description: "Cannot approve, course has reached its maximum capacity.", variant: "destructive" });
        setIsProcessing(prev => ({ ...prev, [studentUid]: false }));
        return;
      }
      if (!updatedApprovedStudentUids.includes(studentUid)) {
        updatedApprovedStudentUids.push(studentUid);
      }
    } else if (newStatus === 'rejected') { 
      updatedApprovedStudentUids = updatedApprovedStudentUids.filter(uid => uid !== studentUid);
    }

    try {
      await updateDoc(courseDocRef, {
        enrollmentRequests: updatedEnrollmentRequests,
        enrolledStudentUids: updatedApprovedStudentUids,
        updatedAt: serverTimestamp()
      });
      
      setCourse(prevCourse => prevCourse ? ({ 
        ...prevCourse, 
        enrollmentRequests: updatedEnrollmentRequests.map(req => 
            req.studentUid === studentUid && req.processedAt ? { ...req, processedAt: Timestamp.now() } : req
        ),
        enrolledStudentUids: updatedApprovedStudentUids,
      }) : null);

      toast({ title: "Request Processed", description: `Student enrollment request for "${course.name}" has been ${newStatus}.`});
    } catch (error) {
      console.error("Error processing request:", error);
      toast({ title: "Error", description: "Failed to process request.", variant: "destructive" });
    } finally {
      setIsProcessing(prev => ({ ...prev, [studentUid]: false }));
    }
  };
  
  const getStatusBadgeVariant = (status: EnrollmentRequestStatus) => {
    if (status === 'approved') return 'default'; 
    if (status === 'rejected') return 'destructive';
    if (status === 'pending') return 'secondary'; 
    return 'outline';
  };

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" /><span className="ml-4 text-lg">Loading Course Enrollments...</span>
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
  
  const pendingRequests = course.enrollmentRequests?.filter(req => req.status === 'pending').sort((a,b) => {
     const timeA = a.requestedAt instanceof Timestamp ? a.requestedAt.toMillis() : Date.now();
     const timeB = b.requestedAt instanceof Timestamp ? b.requestedAt.toMillis() : Date.now();
     return timeA - timeB; // Oldest first
  }) || [];

  const processedRequests = course.enrollmentRequests?.filter(req => req.status !== 'pending').sort((a,b) => {
    const timeA = a.processedAt instanceof Timestamp ? a.processedAt.toMillis() : Date.now();
    const timeB = b.processedAt instanceof Timestamp ? b.processedAt.toMillis() : Date.now();
    return timeB - timeA; // Newest first
  }) || [];

  const currentEnrollmentCount = course.enrolledStudentUids?.length || 0;


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
            <h1 className="text-3xl font-headline flex items-center">
            <Users className="w-8 h-8 mr-3 text-primary" />
            Enrollments for "{course.name}"
            </h1>
            <p className="text-sm text-muted-foreground ml-11">
                Language: {language.name} | Capacity: {currentEnrollmentCount} / {course.strength}
            </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/faculty/dashboard`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Pending Enrollment Requests ({pendingRequests.length})</CardTitle></CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground">No pending enrollment requests for this course.</p>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader><TableRow><TableHead>Student Name</TableHead><TableHead>Email</TableHead><TableHead>Requested At</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {pendingRequests.map(req => (
                    <TableRow key={req.studentUid}>
                        <TableCell className="font-medium">{req.studentName}</TableCell>
                        <TableCell>{req.studentEmail || 'N/A'}</TableCell>
                        <TableCell>{req.requestedAt ? formatDistanceToNowStrict((req.requestedAt as Timestamp).toDate(), { addSuffix: true }) : 'N/A'}</TableCell>
                        <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleProcessRequest(req.studentUid, 'approved')} disabled={isProcessing[req.studentUid] || currentEnrollmentCount >= course.strength}>
                            {isProcessing[req.studentUid] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} <UserCheck className="mr-1 h-4 w-4 text-green-600"/> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleProcessRequest(req.studentUid, 'rejected')} disabled={isProcessing[req.studentUid]}>
                            {isProcessing[req.studentUid] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} <UserX className="mr-1 h-4 w-4 text-red-600"/> Reject
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Processed Enrollment Requests ({processedRequests.length})</CardTitle></CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-muted-foreground">No enrollment requests have been processed yet for this course.</p>
          ) : (
             <div className="overflow-x-auto">
                <Table>
                <TableHeader><TableRow><TableHead>Student Name</TableHead><TableHead>Status</TableHead><TableHead>Processed At</TableHead></TableRow></TableHeader>
                <TableBody>
                    {processedRequests.map(req => (
                    <TableRow key={req.studentUid}>
                        <TableCell className="font-medium">{req.studentName}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(req.status)} className="capitalize">{req.status}</Badge></TableCell>
                        <TableCell>{req.processedAt ? formatDistanceToNowStrict((req.processedAt as Timestamp).toDate(), { addSuffix: true }) : 'N/A'}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
