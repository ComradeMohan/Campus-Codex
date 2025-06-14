
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { College, UserProfile } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Building, Users, BookOpen, ClipboardList, ShieldCheck, BarChartHorizontalBig, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlatformStats {
  totalColleges: number;
  totalStudents: number;
  totalFaculty: number;
  totalLanguages: number;
  totalCourses: number;
  totalTests: number;
}

interface CollegeWithStats extends College {
  studentCount: number;
  facultyCount: number;
  languageCount: number;
  courseCount: number;
}

export default function MainAdminDashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [collegesWithStats, setCollegesWithStats] = useState<CollegeWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlatformData = useCallback(async () => {
    setIsLoading(true);
    try {
      let totalStudents = 0;
      let totalFaculty = 0;
      let totalLanguagesAgg = 0;
      let totalCoursesAgg = 0;
      let totalTestsAgg = 0;

      // Fetch all colleges
      const collegesRef = collection(db, 'colleges');
      const collegesSnap = await getDocs(collegesRef);
      const fetchedColleges = collegesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as College));

      // Fetch all users
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      usersSnap.forEach(docSnap => {
        const user = docSnap.data() as UserProfile;
        if (user.role === 'student') totalStudents++;
        if (user.role === 'faculty') totalFaculty++;
      });

      const detailedCollegesData: CollegeWithStats[] = [];

      for (const college of fetchedColleges) {
        let studentCount = 0;
        let facultyCount = 0;
        let languageCount = 0;
        let courseCount = 0;

        // Count students and faculty for this college
        usersSnap.forEach(docSnap => {
          const user = docSnap.data() as UserProfile;
          if (user.collegeId === college.id) {
            if (user.role === 'student') studentCount++;
            if (user.role === 'faculty') facultyCount++;
          }
        });

        const languagesRef = collection(db, 'colleges', college.id, 'languages');
        const languagesSnap = await getDocs(languagesRef);
        languageCount = languagesSnap.size;
        totalLanguagesAgg += languageCount;

        for (const langDoc of languagesSnap.docs) {
          const coursesRef = collection(db, 'colleges', college.id, 'languages', langDoc.id, 'courses');
          const coursesSnap = await getDocs(coursesRef);
          courseCount += coursesSnap.size;
          totalCoursesAgg += coursesSnap.size;

          const testsRef = collection(db, 'colleges', college.id, 'languages', langDoc.id, 'tests');
          const testsSnap = await getDocs(testsRef);
          totalTestsAgg += testsSnap.size;
        }
        detailedCollegesData.push({ ...college, studentCount, facultyCount, languageCount, courseCount });
      }
      
      setPlatformStats({
        totalColleges: fetchedColleges.length,
        totalStudents,
        totalFaculty,
        totalLanguages: totalLanguagesAgg,
        totalCourses: totalCoursesAgg,
        totalTests: totalTestsAgg,
      });
      setCollegesWithStats(detailedCollegesData.sort((a, b) => a.name.localeCompare(b.name)));

    } catch (error) {
      console.error("Error fetching platform data:", error);
      toast({ title: "Error", description: "Failed to load platform analytics data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && userProfile?.role === 'super-admin') {
      fetchPlatformData();
    } else if (!authLoading && userProfile?.role !== 'super-admin') {
      // Should be handled by ProtectedRoute, but as a safeguard
      setIsLoading(false);
      toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
    }
  }, [authLoading, userProfile, fetchPlatformData, toast]);

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Platform Analytics...</span>
      </div>
    );
  }

  if (!platformStats) {
    return (
        <div className="container mx-auto py-8 text-center">
            <p className="text-muted-foreground">Could not load platform statistics. Please try refreshing.</p>
        </div>
    );
  }
  
  const statCards = [
    { title: "Total Colleges", value: platformStats.totalColleges, icon: Building, color: "text-blue-500" },
    { title: "Total Students", value: platformStats.totalStudents, icon: Users, color: "text-green-500" },
    { title: "Total Faculty", value: platformStats.totalFaculty, icon: ShieldCheck, color: "text-purple-500" },
    { title: "Total Languages", value: platformStats.totalLanguages, icon: BookOpen, color: "text-orange-500" },
    { title: "Total Courses", value: platformStats.totalCourses, icon: Database, color: "text-red-500" },
    { title: "Total Tests", value: platformStats.totalTests, icon: ClipboardList, color: "text-yellow-500" },
  ];


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <BarChartHorizontalBig className="w-8 h-8 mr-3 text-primary" />
            Main Admin Dashboard
          </CardTitle>
          <CardDescription>Global overview of the Campus Codex platform.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map(stat => (
            <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className={`h-5 w-5 ${stat.color || 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
            </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Registered Colleges ({collegesWithStats.length})</CardTitle>
          <CardDescription>Overview of each college on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {collegesWithStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No colleges registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>College Name</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                    <TableHead className="text-center">Faculty</TableHead>
                    <TableHead className="text-center">Languages</TableHead>
                    <TableHead className="text-center">Courses</TableHead>
                    <TableHead>Admin Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collegesWithStats.map((college) => (
                    <TableRow key={college.id}>
                      <TableCell className="font-medium">{college.name}</TableCell>
                      <TableCell className="text-center">{college.studentCount}</TableCell>
                      <TableCell className="text-center">{college.facultyCount}</TableCell>
                      <TableCell className="text-center">{college.languageCount}</TableCell>
                      <TableCell className="text-center">{college.courseCount}</TableCell>
                      <TableCell>{college.adminEmail}</TableCell>
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
