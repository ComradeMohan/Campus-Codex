
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ListChecks, FileText, Clock, AlertTriangle, PlusCircle, Edit3, Trash2, Users, Eye, Settings, BarChart } from 'lucide-react';
import type { ProgrammingLanguage, OnlineTest, OnlineTestStatus } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';


export default function FacultyManageLanguageTestsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = params.languageId as string;

  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [testToDelete, setTestToDelete] = useState<OnlineTest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLanguageAndTests = useCallback(async () => {
    if (!userProfile?.collegeId || !languageId) {
      if (!authLoading) router.push('/faculty/dashboard');
      return;
    }

    if (!userProfile.managedLanguageIds || !userProfile.managedLanguageIds.includes(languageId)) {
      toast({ title: "Unauthorized", description: "You are not authorized to manage tests for this language.", variant: "destructive" });
      setIsAuthorized(false);
      setIsLoadingPageData(false);
      router.push('/faculty/dashboard');
      return;
    }
    setIsAuthorized(true);
    setIsLoadingPageData(true);

    try {
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (!langSnap.exists()) {
        toast({ title: "Error", description: "Language not found.", variant: "destructive" });
        router.push('/faculty/dashboard');
        return;
      }
      const langData = { id: langSnap.id, ...langSnap.data() } as ProgrammingLanguage;
      setLanguage(langData);

      const testsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'tests');
      const q = query(testsRef, where('facultyId', '==', userProfile.uid), orderBy('createdAt', 'desc'));
      const testsSnap = await getDocs(q);
      const fetchedTests = testsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as OnlineTest));
      setTests(fetchedTests);

    } catch (error) {
      console.error("Error fetching language/tests:", error);
      toast({ title: "Error", description: "Failed to load tests for this language.", variant: "destructive" });
    } finally {
      setIsLoadingPageData(false);
    }
  }, [userProfile, languageId, toast, router, authLoading]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchLanguageAndTests();
    } else if (!authLoading && !userProfile) {
      router.push('/login');
    }
  }, [authLoading, userProfile, fetchLanguageAndTests, router]);

  const handleDeleteTest = async () => {
    if (!testToDelete || !userProfile?.collegeId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'colleges', userProfile.collegeId, 'languages', languageId, 'tests', testToDelete.id));
      setTests(prevTests => prevTests.filter(t => t.id !== testToDelete.id));
      toast({ title: "Test Deleted", description: `Test "${testToDelete.title}" has been deleted.` });
    } catch (error) {
      console.error("Error deleting test:", error);
      toast({ title: "Error", description: "Failed to delete test.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setTestToDelete(null);
    }
  };
  
  const getStatusBadgeVariant = (status: OnlineTestStatus) => {
    switch (status) {
      case 'published': return 'default'; // Green or blue
      case 'draft': return 'secondary'; // Gray
      case 'archived': return 'outline'; // Lighter gray
      default: return 'secondary';
    }
  };

  if (authLoading || isLoadingPageData) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Tests for {language?.name || 'Language'}...</span>
      </div>
    );
  }
  
  if (!isAuthorized && !isLoadingPageData) return null; // Already handled by redirect

  if (!language) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3"/>
        <p className="text-lg text-muted-foreground">Language details could not be loaded.</p>
        <Button asChild variant="link" className="mt-4">
         <Link href="/faculty/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-headline flex items-center">
          <Settings className="w-8 h-8 mr-3 text-primary" />
          Manage Tests for {language.name}
        </h1>
        <div className="flex gap-2">
           <Button asChild>
            <Link href={`/faculty/language/${languageId}/tests/create`} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Create New Test
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/faculty/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Your Created Tests</CardTitle>
          <CardDescription>
            View, edit, manage enrollments, or delete tests you have created for {language.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="text-center py-10">
              <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">You have not created any tests for {language.name} yet.</p>
              <Button asChild className="mt-4">
                 <Link href={`/faculty/language/${languageId}/tests/create`}>Create Your First Test</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Questions</TableHead>
                    <TableHead className="text-center">Total Score</TableHead>
                    <TableHead className="text-center">Enrollment Requests</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">{test.title}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(test.status)} className="capitalize text-xs">
                          {test.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{test.questionsSnapshot.length}</TableCell>
                      <TableCell className="text-center">{test.totalScore}</TableCell>
                      <TableCell className="text-center">
                        {test.enrollmentRequests?.filter(r => r.status === 'pending').length || 0} pending
                      </TableCell>
                       <TableCell>
                        {test.createdAt && typeof (test.createdAt as any).toDate === 'function' 
                            ? format((test.createdAt as any).toDate(), 'PPp') 
                            : 'N/A'}
                       </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" asChild title="Manage Enrollments">
                            <Link href={`/faculty/language/${languageId}/tests/${test.id}/enrollments`}>
                                <Users className="h-4 w-4 text-blue-600" />
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Edit Test">
                            <Link href={`/faculty/language/${languageId}/tests/edit/${test.id}`}>
                                <Edit3 className="h-4 w-4" />
                            </Link>
                        </Button>
                        <AlertDialog onOpenChange={(open) => !open && setTestToDelete(null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete Test" onClick={() => setTestToDelete(test)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                           {testToDelete?.id === test.id && (
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{testToDelete.title}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone and will permanently delete this test and all associated enrollment data.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setTestToDelete(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteTest} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                           )}
                        </AlertDialog>
                      </TableCell>
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
