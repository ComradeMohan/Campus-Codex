
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, serverTimestamp, FieldValue } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Users, AlertTriangle, CheckCircle, XCircle, Mail, UserCheck, UserX, ClockIcon } from 'lucide-react';
import type { ProgrammingLanguage, OnlineTest, EnrollmentRequest, EnrollmentRequestStatus, UserProfile } from '@/types';
import { formatDistanceToNowStrict } from 'date-fns';

export default function FacultyManageEnrollmentsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = params.languageId as string;
  const testId = params.testId as string;

  const [test, setTest] = useState<OnlineTest | null>(null);
  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({}); // studentUid: true/false

  const fetchTestAndLanguageDetails = useCallback(async () => {
    if (!userProfile?.collegeId || !languageId || !testId) {
      if (!authLoading) router.push('/faculty/dashboard');
      return;
    }
    
    setIsLoading(true);
    try {
      // Check faculty authorization for the language
      if (!userProfile.managedLanguageIds || !userProfile.managedLanguageIds.includes(languageId)) {
        toast({ title: "Unauthorized", description: "You are not authorized for this language.", variant: "destructive" });
        setIsAuthorized(false);
        router.push('/faculty/dashboard');
        return;
      }

      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (langSnap.exists()) setLanguage(langSnap.data() as ProgrammingLanguage);
      else throw new Error("Language not found");

      const testDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'tests', testId);
      const testSnap = await getDoc(testDocRef);

      if (testSnap.exists()) {
        const testData = testSnap.data() as OnlineTest;
        if (testData.facultyId !== userProfile.uid) {
          toast({ title: "Unauthorized", description: "You can only manage enrollments for your own tests.", variant: "destructive" });
          setIsAuthorized(false);
          router.push(`/faculty/language/${languageId}/tests`);
          return;
        }
        setTest(testData);
        setIsAuthorized(true);
      } else {
        toast({ title: "Error", description: "Test not found.", variant: "destructive" });
        router.push(`/faculty/language/${languageId}/tests`);
      }
    } catch (error: any) {
      console.error("Error fetching details:", error);
      toast({ title: "Error", description: error.message || "Failed to load test details.", variant: "destructive" });
      router.push(`/faculty/language/${languageId}/tests`);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, languageId, testId, authLoading, router, toast]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchTestAndLanguageDetails();
    } else if (!authLoading && !userProfile) {
      router.push('/login');
    }
  }, [authLoading, userProfile, fetchTestAndLanguageDetails, router]);

  const handleProcessRequest = async (studentUid: string, newStatus: EnrollmentRequestStatus) => {
    if (!test || !userProfile?.collegeId) return;
    setIsProcessing(prev => ({ ...prev, [studentUid]: true }));

    const testDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'tests', testId);
    
    const updatedEnrollmentRequests = (test.enrollmentRequests || []).map(req => 
      req.studentUid === studentUid 
        ? { ...req, status: newStatus, processedBy: userProfile.uid, processedAt: serverTimestamp() as FieldValue }
        : req
    );

    let updatedApprovedStudentUids = [...(test.approvedStudentUids || [])];
    if (newStatus === 'approved') {
      if (!updatedApprovedStudentUids.includes(studentUid)) {
        updatedApprovedStudentUids.push(studentUid);
      }
    } else if (newStatus === 'rejected') { // Or any other status that means not approved
      updatedApprovedStudentUids = updatedApprovedStudentUids.filter(uid => uid !== studentUid);
    }

    try {
      await updateDoc(testDocRef, {
        enrollmentRequests: updatedEnrollmentRequests,
        approvedStudentUids: updatedApprovedStudentUids,
        updatedAt: serverTimestamp()
      });
      
      setTest(prevTest => prevTest ? ({ 
        ...prevTest, 
        enrollmentRequests: updatedEnrollmentRequests,
        approvedStudentUids: updatedApprovedStudentUids,
      }) : null);

      toast({ title: "Request Processed", description: `Student enrollment request has been ${newStatus}.`});
    } catch (error) {
      console.error("Error processing request:", error);
      toast({ title: "Error", description: "Failed to process request.", variant: "destructive" });
    } finally {
      setIsProcessing(prev => ({ ...prev, [studentUid]: false }));
    }
  };
  
  const getStatusBadgeVariant = (status: EnrollmentRequestStatus) => {
    if (status === 'approved') return 'default'; // Typically green or primary
    if (status === 'rejected') return 'destructive';
    if (status === 'pending') return 'secondary'; // Yellow or gray
    return 'outline';
  };

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" /><span className="ml-4 text-lg">Loading Enrollments...</span>
      </div>
    );
  }
  
  if (!isAuthorized && !isLoading) return null; // Handled by redirect

  if (!test || !language) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3"/>
        <p className="text-lg text-muted-foreground">Test or language details could not be loaded.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href={`/faculty/language/${languageId}/tests`}>Back to Tests</Link>
        </Button>
      </div>
    );
  }
  
  const pendingRequests = test.enrollmentRequests?.filter(req => req.status === 'pending') || [];
  const processedRequests = test.enrollmentRequests?.filter(req => req.status !== 'pending').sort((a,b) => (b.processedAt as Timestamp)?.seconds - (a.processedAt as Timestamp)?.seconds) || [];


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline flex items-center">
          <Users className="w-8 h-8 mr-3 text-primary" />
          Manage Enrollments for "{test.title}"
        </h1>
        <Button asChild variant="outline">
          <Link href={`/faculty/language/${languageId}/tests`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Tests for {language.name}
          </Link>
        </Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Pending Enrollment Requests ({pendingRequests.length})</CardTitle></CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground">No pending enrollment requests for this test.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Student Name</TableHead><TableHead>Email</TableHead><TableHead>Requested At</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {pendingRequests.map(req => (
                  <TableRow key={req.studentUid}>
                    <TableCell className="font-medium">{req.studentName}</TableCell>
                    <TableCell>{req.studentEmail || 'N/A'}</TableCell>
                    <TableCell>{req.requestedAt ? formatDistanceToNowStrict((req.requestedAt as Timestamp).toDate(), { addSuffix: true }) : 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleProcessRequest(req.studentUid, 'approved')} disabled={isProcessing[req.studentUid]}>
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
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Processed Enrollment Requests ({processedRequests.length})</CardTitle></CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-muted-foreground">No enrollment requests have been processed yet for this test.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>

    </div>
  );
}
