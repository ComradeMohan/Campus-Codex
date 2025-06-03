
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import type { UserProfile, ProgrammingLanguage, EnrolledLanguageProgress } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Users, BarChart3, ArrowLeft, Filter, TrendingUp, UserCheck, AlertTriangle, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface StudentAnalyticsData extends UserProfile {
  languageScore: number;
}

export default function FacultyLanguageAnalyticsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const languageId = params.languageId as string;

  const [language, setLanguage] = useState<ProgrammingLanguage | null>(null);
  const [studentsData, setStudentsData] = useState<StudentAnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false); // Track if faculty is authorized for this language

  const fetchAnalyticsData = useCallback(async () => {
    if (!userProfile?.collegeId || !languageId) {
      if (!authLoading) toast({ title: "Error", description: "Faculty or language information missing.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // Authorization check
    if (!userProfile.managedLanguageIds || !userProfile.managedLanguageIds.includes(languageId)) {
        toast({ title: "Unauthorized", description: "You are not authorized to view analytics for this language.", variant: "destructive" });
        setIsAuthorized(false);
        setIsLoading(false);
        router.push('/faculty/dashboard'); // Or an unauthorized page
        return;
    }
    setIsAuthorized(true);
    setIsLoading(true);

    try {
      // 1. Fetch this specific language details
      const langDocRef = doc(db, 'colleges', userProfile.collegeId, 'languages', languageId);
      const langSnap = await getDoc(langDocRef);
      if (langSnap.exists()) {
        setLanguage({ id: langSnap.id, ...langSnap.data() } as ProgrammingLanguage);
      } else {
        toast({ title: "Error", description: "Language not found.", variant: "destructive" });
        setIsLoading(false);
        router.push('/faculty/dashboard');
        return;
      }

      // 2. Fetch all student profiles for the college
      const usersRef = collection(db, 'users');
      const studentsQuery = query(usersRef, where('collegeId', '==', userProfile.collegeId), where('role', '==', 'student'));
      const studentsSnap = await getDocs(studentsQuery);
      
      const analyticsDataPromises = studentsSnap.docs.map(async (studentDoc) => {
        const studentProfile = studentDoc.data() as UserProfile;
        // Fetch enrolledLanguages for this specific languageId for the student
        const enrolledLangRef = doc(db, 'users', studentProfile.uid, 'enrolledLanguages', languageId);
        const enrolledLangSnap = await getDoc(enrolledLangRef);

        let languageScore = 0;
        if (enrolledLangSnap.exists()) {
          const enrolledData = enrolledLangSnap.data() as EnrolledLanguageProgress;
          languageScore = Number(enrolledData.currentScore) || 0;
        }
        return { ...studentProfile, languageScore };
      });

      const resolvedAnalyticsData = (await Promise.all(analyticsDataPromises))
                                    .filter(s => s.languageScore > 0 || (s.hasOwnProperty('languageScore') && s.languageScore === 0)); // Keep students who are enrolled (score is 0) or have a score
      setStudentsData(resolvedAnalyticsData);

    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast({ title: "Error", description: "Failed to load analytics data for this language.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, languageId, authLoading, toast, router]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchAnalyticsData();
    } else if (!authLoading && !userProfile) {
        setIsLoading(false);
        router.push('/login');
    }
  }, [authLoading, userProfile, fetchAnalyticsData, router]);
  
  const chartData = useMemo(() => {
    return studentsData.map(s => ({ name: s.fullName.split(' ')[0], score: s.languageScore }));
  }, [studentsData]);
  
  const averageScore = useMemo(() => {
    if (studentsData.length === 0) return "0.00";
    const totalScoreSum = studentsData.reduce((sum, student) => sum + student.languageScore, 0);
    return (totalScoreSum / studentsData.length).toFixed(2);
  }, [studentsData]);


  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Analytics for {language?.name || 'Language'}...</span>
      </div>
    );
  }

  if (!isAuthorized && !isLoading) {
    // This case should be rare due to router push, but as a fallback:
    return (
        <div className="container mx-auto py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3"/>
            <h1 className="text-2xl font-bold">Unauthorized Access</h1>
            <p className="text-muted-foreground">You are not permitted to view analytics for this language.</p>
            <Button asChild variant="outline" className="mt-4">
                <Link href="/faculty/dashboard">Back to Dashboard</Link>
            </Button>
        </div>
    );
  }
  
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
          <BarChart3 className="w-8 h-8 mr-3 text-primary" />
          Analytics for {language.name}
        </h1>
        <Button asChild variant="outline">
          <Link href="/faculty/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Faculty Dashboard
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students Enrolled/Scored</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{studentsData.length}</div>
                <p className="text-xs text-muted-foreground">students in {language.name} at {userProfile?.collegeName}</p>
            </CardContent>
        </Card>
         <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Score ({language.name})</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{averageScore}</div>
                <p className="text-xs text-muted-foreground">based on listed students</p>
            </CardContent>
        </Card>
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Language</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{language.name}</div>
                 <p className="text-xs text-muted-foreground">
                    {language.description || 'Core programming language.'}
                </p>
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Student Scores: {language.name}</CardTitle>
          <CardDescription>Detailed scores of students for {language.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {studentsData.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No students found with scores for {language.name}, or no students enrolled.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Registration No.</TableHead>
                    <TableHead className="text-right">Score in {language.name}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsData.sort((a,b) => b.languageScore - a.languageScore).map(student => (
                    <TableRow key={student.uid}>
                      <TableCell className="font-medium">{student.fullName}</TableCell>
                      <TableCell>{student.registrationNumber || 'N/A'}</TableCell>
                      <TableCell className="text-right">{student.languageScore}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {studentsData.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Score Distribution: {language.name}</CardTitle>
            <CardDescription>Visual representation of student scores for this language.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[400px]">
            <ChartContainer 
                config={{ score: { label: language.name, color: "hsl(var(--primary))" } }} 
                className="h-full w-full"
            >
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="score" fill="var(--color-score)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
