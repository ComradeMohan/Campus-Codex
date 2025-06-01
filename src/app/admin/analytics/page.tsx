
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc } from 'firebase/firestore';
import type { UserProfile, ProgrammingLanguage, EnrolledLanguageProgress } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Users, BarChart3, ArrowLeft, Filter, TrendingUp, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';


interface StudentAnalyticsData extends UserProfile {
  totalOverallScore: number;
  scoresByLanguage: { [languageId: string]: number };
  enrolledLanguagesDetails: EnrolledLanguageProgress[];
}

export default function AdminAnalyticsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [studentsData, setStudentsData] = useState<StudentAnalyticsData[]>([]);
  const [collegeLanguages, setCollegeLanguages] = useState<ProgrammingLanguage[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>('all'); // 'all' or a specific languageId
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalyticsData = useCallback(async () => {
    if (!userProfile?.collegeId) {
      if (!authLoading) toast({ title: "Error", description: "Admin college information not found.", variant: "destructive" });
      setIsLoading(false); // Stop loading if prerequisites aren't met
      return;
    }
    setIsLoading(true);
    try {
      // 1. Fetch college languages
      const languagesRef = collection(db, 'colleges', userProfile.collegeId, 'languages');
      const languagesSnap = await getDocs(languagesRef);
      const fetchedLanguages = languagesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as ProgrammingLanguage));
      setCollegeLanguages(fetchedLanguages);

      // 2. Fetch all student profiles for the college
      const usersRef = collection(db, 'users');
      const studentsQuery = query(usersRef, where('collegeId', '==', userProfile.collegeId), where('role', '==', 'student'));
      const studentsSnap = await getDocs(studentsQuery);
      const studentProfiles = studentsSnap.docs.map(docSnap => docSnap.data() as UserProfile);

      // 3. For each student, fetch their enrolled languages progress
      const analyticsDataPromises = studentProfiles.map(async (student) => {
        const enrolledLangRef = collection(db, 'users', student.uid, 'enrolledLanguages');
        const enrolledLangSnap = await getDocs(enrolledLangRef);
        const enrolledLanguagesDetails = enrolledLangSnap.docs.map(elDoc => elDoc.data() as EnrolledLanguageProgress);

        let totalOverallScore = 0;
        const scoresByLanguage: { [languageId: string]: number } = {};

        enrolledLanguagesDetails.forEach(el => {
          const currentScoreNum = Number(el.currentScore);
          if (!isNaN(currentScoreNum)) {
            totalOverallScore += currentScoreNum;
            scoresByLanguage[el.languageId] = currentScoreNum;
          } else {
            // Default to 0 if currentScore is not a valid number
            scoresByLanguage[el.languageId] = 0;
             console.warn(`Student ${student.uid} has invalid score for language ${el.languageId}: ${el.currentScore}`);
          }
        });
        return { ...student, totalOverallScore, scoresByLanguage, enrolledLanguagesDetails };
      });

      const resolvedAnalyticsData = await Promise.all(analyticsDataPromises);
      setStudentsData(resolvedAnalyticsData);

    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast({ title: "Error", description: "Failed to load analytics data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.collegeId, authLoading, toast]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchAnalyticsData();
    } else if (!authLoading && !userProfile) {
        setIsLoading(false); // Stop loading if no user
    }
  }, [authLoading, userProfile, fetchAnalyticsData]);

  const filteredStudentsData = useMemo(() => {
    if (selectedLanguageId === 'all') {
      return studentsData.map(s => ({
        ...s,
        displayScore: s.totalOverallScore || 0, // Default to 0
        relevantEnrolments: s.enrolledLanguagesDetails.length
      }));
    }
    return studentsData
      .filter(s => s.scoresByLanguage[selectedLanguageId] !== undefined)
      .map(s => ({
        ...s,
        displayScore: s.scoresByLanguage[selectedLanguageId] || 0, // Default to 0
        relevantEnrolments: 1
      }));
  }, [studentsData, selectedLanguageId]);

  const chartData = useMemo(() => {
    if (selectedLanguageId === 'all') {
      return filteredStudentsData.map(s => ({ name: s.fullName.split(' ')[0], score: s.displayScore }));
    }
    const lang = collegeLanguages.find(l => l.id === selectedLanguageId);
    return filteredStudentsData.map(s => ({ name: s.fullName.split(' ')[0], score: s.displayScore, language: lang?.name }));
  }, [filteredStudentsData, selectedLanguageId, collegeLanguages]);
  
  const averageScore = useMemo(() => {
    if (filteredStudentsData.length === 0) return "0.00"; // Return string "0.00" for consistency
    const totalScoreSum = filteredStudentsData.reduce((sum, student) => sum + (student.displayScore || 0), 0); // Ensure displayScore is treated as number
    return (totalScoreSum / filteredStudentsData.length).toFixed(2);
  }, [filteredStudentsData]);


  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Analytics...</span>
      </div>
    );
  }

  const selectedLanguageName = selectedLanguageId === 'all' ? 'All Languages' : collegeLanguages.find(l => l.id === selectedLanguageId)?.name || 'Selected Language';

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-headline flex items-center">
          <BarChart3 className="w-8 h-8 mr-3 text-primary" />
          Platform Analytics
        </h1>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Filter className="w-5 h-5 mr-2" />Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedLanguageId} onValueChange={setSelectedLanguageId}>
            <SelectTrigger className="w-full md:w-[280px]">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages (Overall Score)</SelectItem>
              {collegeLanguages.map(lang => (
                <SelectItem key={lang.id} value={lang.id}>{lang.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{studentsData.length}</div>
                <p className="text-xs text-muted-foreground">students in {userProfile?.collegeName}</p>
            </CardContent>
        </Card>
         <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Score ({selectedLanguageName})</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{averageScore}</div>
                <p className="text-xs text-muted-foreground">based on filtered students</p>
            </CardContent>
        </Card>
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students in Filter</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{filteredStudentsData.length}</div>
                 <p className="text-xs text-muted-foreground">
                    {selectedLanguageId === 'all' ? 'students with any score' : `students enrolled in ${selectedLanguageName}`}
                </p>
            </CardContent>
        </Card>
      </div>


      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Student Scores: {selectedLanguageName}</CardTitle>
          <CardDescription>Detailed scores of students. {selectedLanguageId === 'all' ? 'Overall scores are shown.' : `Scores for ${selectedLanguageName} are shown.`}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStudentsData.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No students found matching the current filter or no scores recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Registration No.</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudentsData.sort((a,b) => (b.displayScore || 0) - (a.displayScore || 0)).map(student => (
                    <TableRow key={student.uid}>
                      <TableCell className="font-medium">{student.fullName}</TableCell>
                      <TableCell>{student.registrationNumber || 'N/A'}</TableCell>
                      <TableCell className="text-right">{student.displayScore || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {filteredStudentsData.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Score Distribution: {selectedLanguageName}</CardTitle>
            <CardDescription>Visual representation of student scores.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[400px]">
            <ChartContainer 
                config={{ score: { label: selectedLanguageName, color: "hsl(var(--primary))" } }} 
                className="h-full w-full"
            >
              <BarChart data={chartData.map(cd => ({...cd, score: cd.score || 0}))} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
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
