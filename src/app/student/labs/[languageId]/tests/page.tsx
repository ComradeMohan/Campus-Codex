
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ListChecks, FileText, Clock, AlertTriangle, BarChart, Percent } from 'lucide-react';
import type { ProgrammingLanguage, OnlineTest } from '@/types';

export default function StudentLanguageTestsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = params.languageId as string;

  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);

  const fetchLanguageAndTests = useCallback(async () => {
    if (!userProfile?.collegeId || !languageId) {
      if (!authLoading) {
        toast({ title: "Error", description: "Missing user or language information.", variant: "destructive" });
        router.push('/student/labs');
      }
      return;
    }
    setIsLoadingPageData(true);
    try {
      // Fetch language details
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (!langSnap.exists()) {
        toast({ title: "Error", description: "Course not found.", variant: "destructive" });
        router.push('/student/labs');
        return;
      }
      const langData = { id: langSnap.id, ...langSnap.data() } as ProgrammingLanguage;
      setLanguage(langData);

      // Fetch published tests for this language
      const testsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'tests');
      const q = query(testsRef, where('status', '==', 'published'), orderBy('createdAt', 'desc'));
      const testsSnap = await getDocs(q);
      const fetchedTests = testsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as OnlineTest));
      setTests(fetchedTests);

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
    if (!authLoading && userProfile) { // Ensure userProfile is loaded before fetching
        fetchLanguageAndTests();
    } else if (!authLoading && !userProfile) {
        // Handle case where user is not logged in but tries to access page
        router.push('/login');
    }
  }, [authLoading, userProfile, fetchLanguageAndTests, router]);


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
  
  // Check if student is enrolled in this language
  // This is a basic check. For more robust security, you might check enrollment status from Firestore `users/{uid}/enrolledLanguages`.
  // However, since navigation to this page comes from an enrolled language card, this might be sufficient for UX.
  // For now, we assume if they reached this page, they are likely enrolled.

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

      {tests.length === 0 ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><AlertTriangle className="w-6 h-6 mr-2 text-amber-500"/>No Published Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              There are currently no published tests available for {language.name}. 
              Please check back later or contact your instructor.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <Card key={test.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-primary" />
                  {test.title}
                </CardTitle>
                {test.description && (
                  <CardDescription className="text-sm mt-1 line-clamp-2">{test.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3 flex-grow">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-2" />
                  Duration: {test.durationMinutes} minutes
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <BarChart className="w-4 h-4 mr-2" />
                   Questions: {test.questionsSnapshot.length}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Percent className="w-4 h-4 mr-2" />
                  Total Score: {test.totalScore}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled> {/* Placeholder for now */}
                  Start Test (Coming Soon)
                </Button>
                {/* <Button asChild className="w-full"> 
                  <Link href={`/student/tests/${test.id}/attempt`}>Start Test</Link>
                </Button> */}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
