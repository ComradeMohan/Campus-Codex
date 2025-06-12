
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, arrayUnion, serverTimestamp, FieldValue } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ListChecks, FileText, Clock, AlertTriangle, BarChart, Percent, Send, Hourglass, CheckCircle, XCircle } from 'lucide-react';
import type { ProgrammingLanguage, OnlineTest, EnrollmentRequest } from '@/types';

export default function StudentLanguageTestsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = params.languageId as string;

  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [allTests, setAllTests] = useState<OnlineTest[]>([]); // Combined admin and faculty tests
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isRequestingEnrollment, setIsRequestingEnrollment] = useState<Record<string, boolean>>({});


  const fetchLanguageAndTests = useCallback(async () => {
    if (!userProfile?.collegeId || !languageId) {
      if (!authLoading) router.push('/student/labs');
      return;
    }
    setIsLoadingPageData(true);
    try {
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (!langSnap.exists()) {
        toast({ title: "Error", description: "Course not found.", variant: "destructive" });
        router.push('/student/labs');
        return;
      }
      const langData = { id: langSnap.id, ...langSnap.data() } as ProgrammingLanguage;
      setLanguage(langData);

      // Fetch all published tests (admin and faculty) for this language
      const testsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'tests');
      const q = query(testsRef, where('status', '==', 'published'), orderBy('createdAt', 'desc'));
      const testsSnap = await getDocs(q);
      const fetchedTests = testsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as OnlineTest));
      setAllTests(fetchedTests);

      if (fetchedTests.length === 0) {
        toast({ title: "No Tests Available", description: `There are currently no published tests for ${langData.name}.`, variant: "default", duration: 5000 });
      }

    } catch (error) {
      console.error("Error fetching language/tests:", error);
      toast({ title: "Error", description: "Failed to load course tests.", variant: "destructive" });
    } finally {
      setIsLoadingPageData(false);
    }
  }, [userProfile?.collegeId, languageId, toast, router, authLoading]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchLanguageAndTests();
    } else if (!authLoading && !userProfile) {
      router.push('/login');
    }
  }, [authLoading, userProfile, fetchLanguageAndTests, router]);
  
  const handleRequestEnrollment = async (test: OnlineTest) => {
    if (!userProfile || !test.isFacultyCreated || !test.facultyId || !test.id) { 
        toast({title: "Error", description: "Cannot request enrollment for this test.", variant: "destructive"});
        return;
    }
    setIsRequestingEnrollment(prev => ({ ...prev, [test.id]: true }));

    const testDocRef = doc(db, 'colleges', userProfile.collegeId!, 'languages', languageId, 'tests', test.id);
    const newRequest: EnrollmentRequest = {
        studentUid: userProfile.uid,
        studentName: userProfile.fullName,
        studentEmail: userProfile.email || undefined,
        requestedAt: serverTimestamp() as FieldValue,
        status: 'pending',
    };

    try {
        // Ensure enrollmentRequests array exists before trying to update it
        const testSnap = await getDoc(testDocRef);
        const currentTestData = testSnap.data() as OnlineTest;
        const existingRequests = currentTestData.enrollmentRequests || [];

        await updateDoc(testDocRef, {
            enrollmentRequests: arrayUnion(newRequest), // arrayUnion handles non-existence gracefully
            updatedAt: serverTimestamp()
        });
        
        setAllTests(prevTests => prevTests.map(t => 
            t.id === test.id 
            ? { ...t, enrollmentRequests: [...existingRequests, newRequest] } 
            : t
        ));
        toast({ title: "Enrollment Requested", description: `Your request to enroll in "${test.title}" has been sent.` });
    } catch (error) {
        console.error("Error requesting enrollment:", error);
        toast({ title: "Error", description: "Failed to request enrollment.", variant: "destructive" });
    } finally {
        setIsRequestingEnrollment(prev => ({ ...prev, [test.id]: false }));
    }
  };

  const getStudentEnrollmentStatus = (test: OnlineTest): { status: 'not_enrolled' | 'pending' | 'approved' | 'rejected', message?: string } => {
    if (!userProfile) return { status: 'not_enrolled' };
    if (test.approvedStudentUids?.includes(userProfile.uid)) return { status: 'approved' };
    
    const request = test.enrollmentRequests?.find(req => req.studentUid === userProfile.uid);
    if (request) {
        if (request.status === 'pending') return { status: 'pending' };
        if (request.status === 'rejected') return { status: 'rejected', message: request.rejectionReason || "Your enrollment request was not approved." };
    }
    return { status: 'not_enrolled' };
  };


  if (authLoading || isLoadingPageData) {
    return (
      <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading Available Tests...</p>
      </div>
    );
  }

  if (!language) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3"/>
        <p className="text-lg text-muted-foreground">Could not load course details.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/student/labs">Back to Labs</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline flex items-center">
          <ListChecks className="w-8 h-8 mr-3 text-primary" />
          Available Tests for {language.name}
        </h1>
        <Button asChild variant="outline">
          <Link href="/student/labs" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to All Labs
          </Link>
        </Button>
      </div>

      {allTests.length === 0 ? (
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><AlertTriangle className="w-6 h-6 mr-2 text-amber-500"/>No Published Tests</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">There are currently no published tests available for {language.name}.</p></CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allTests.map((test) => {
            const enrollmentInfo = getStudentEnrollmentStatus(test);
            return (
              <Card key={test.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold flex items-center">
                    <FileText className="w-6 h-6 mr-2 text-primary" />{test.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {test.isFacultyCreated ? `Created by Faculty` : `Created by Admin`}
                  </CardDescription>
                  {test.description && (<CardDescription className="text-sm mt-1 line-clamp-2">{test.description}</CardDescription>)}
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground"><Clock className="w-4 h-4 mr-2" />Duration: {test.durationMinutes} minutes</div>
                  <div className="flex items-center text-sm text-muted-foreground"><BarChart className="w-4 h-4 mr-2" />Questions: {test.questionsSnapshot.length}</div>
                  <div className="flex items-center text-sm text-muted-foreground"><Percent className="w-4 h-4 mr-2" />Total Score: {test.totalScore}</div>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-2">
                   {test.isFacultyCreated && (
                    <>
                        {enrollmentInfo.status === 'not_enrolled' && (
                            <Button className="w-full" onClick={() => handleRequestEnrollment(test)} disabled={isRequestingEnrollment[test.id]}>
                                {isRequestingEnrollment[test.id] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} <Send className="mr-2 h-4 w-4"/> Request Enrollment
                            </Button>
                        )}
                        {enrollmentInfo.status === 'pending' && (
                            <Button className="w-full" variant="secondary" disabled><Hourglass className="mr-2 h-4 w-4"/> Enrollment Pending</Button>
                        )}
                        {enrollmentInfo.status === 'approved' && (
                             <Button className="w-full" disabled> <CheckCircle className="mr-2 h-4 w-4"/> Start Test (Coming Soon)</Button>
                            // <Button asChild className="w-full"><Link href={`/student/tests/${test.id}/attempt`}>Start Test</Link></Button>
                        )}
                        {enrollmentInfo.status === 'rejected' && (
                            <div className="w-full p-2 text-center text-sm bg-destructive/10 text-destructive rounded-md">
                                <XCircle className="inline h-4 w-4 mr-1 mb-0.5"/> Enrollment Rejected.
                                {enrollmentInfo.message && <p className="text-xs mt-0.5">{enrollmentInfo.message}</p>}
                            </div>
                        )}
                    </>
                   )}
                   {!test.isFacultyCreated && ( 
                       <Button className="w-full" disabled>Start Test (Coming Soon)</Button>
                   )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
