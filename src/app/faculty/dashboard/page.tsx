
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, orderBy } from 'firebase/firestore';
import type { UserProfile, ProgrammingLanguage, Course } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BookUser, ClipboardList, BarChart3, Users, AlertTriangle, BookOpen, Settings, PlusCircle, Edit3, Users2, ExternalLink, MessageSquarePlus, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ManagedLanguageDetails extends ProgrammingLanguage {
  iconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  courses: Course[];
}

const getIconComponent = (iconName?: string): React.FC<React.SVGProps<SVGSVGElement>> => {
  if (iconName && LucideIcons[iconName as keyof typeof LucideIcons]) {
    return LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;
  }
  return BookOpen; // Default icon for a language/course
};

export default function FacultyDashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [managedLanguagesDetails, setManagedLanguagesDetails] = useState<ManagedLanguageDetails[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

  const fetchManagedLanguageDetails = useCallback(async () => {
    if (!userProfile?.collegeId || !userProfile.managedLanguageIds || userProfile.managedLanguageIds.length === 0) {
      setIsLoadingDetails(false);
      return;
    }

    setIsLoadingDetails(true);
    try {
      const langDetailsPromises = userProfile.managedLanguageIds.map(async (langId) => {
        const langDocRef = doc(db, 'colleges', userProfile.collegeId!, 'languages', langId);
        const langSnap = await getDoc(langDocRef);
        if (langSnap.exists()) {
          const langData = langSnap.data() as Omit<ProgrammingLanguage, 'id'>;

          const coursesRef = collection(db, 'colleges', userProfile.collegeId!, 'languages', langId, 'courses');
          const coursesQuery = query(coursesRef, where('facultyId', '==', userProfile.uid), orderBy('name', 'asc'));
          const coursesSnap = await getDocs(coursesQuery);
          const facultyCourses = coursesSnap.docs.map(cDoc => ({ id: cDoc.id, ...cDoc.data() } as Course));

          return {
            id: langSnap.id,
            ...langData,
            iconComponent: getIconComponent(langData.iconName),
            courses: facultyCourses,
          } as ManagedLanguageDetails;
        }
        return null;
      });

      const resolvedDetails = (await Promise.all(langDetailsPromises)).filter(Boolean) as ManagedLanguageDetails[];
      setManagedLanguagesDetails(resolvedDetails.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching managed language details:", error);
      toast({ title: "Error", description: "Failed to load details for your managed languages/courses.", variant: "destructive" });
    } finally {
      setIsLoadingDetails(false);
    }
  }, [userProfile, toast]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchManagedLanguageDetails();
    } else if (!authLoading && !userProfile) {
        setIsLoadingDetails(false);
    }
  }, [authLoading, userProfile, fetchManagedLanguageDetails]);

  if (authLoading || isLoadingDetails) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <BookUser className="w-8 h-8 mr-3 text-primary" />
            Faculty Dashboard
          </CardTitle>
          <CardDescription>
            Welcome, {userProfile?.fullName || 'Faculty Member'}! Manage your assigned languages, create courses, and oversee tests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>From here, you can manage content for the programming languages you oversee.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">Your Managed Content Areas</CardTitle>
          <CardDescription>Select a language to manage its courses, tests, and view student analytics.</CardDescription>
        </CardHeader>
        <CardContent>
          {managedLanguagesDetails.length === 0 ? (
             (!userProfile?.managedLanguageIds || userProfile.managedLanguageIds.length === 0) && !isLoadingDetails ? (
                <div className="text-center py-10 text-muted-foreground">
                    <AlertTriangle className="mx-auto h-10 w-10 mb-3 text-amber-500"/>
                    <p className="font-semibold">You are not currently assigned to manage any specific programming languages.</p>
                    <p className="text-sm mt-1">Please contact your college administrator if you believe this is an error.</p>
                </div>
             ) : (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Loading language details...</span>
                </div>
             )
          ) : (
            <div className="space-y-6">
              {managedLanguagesDetails.map((lang) => (
                <Card key={lang.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between space-x-3 pb-3">
                    <div className="flex items-center space-x-3">
                      <lang.iconComponent className="w-8 h-8 text-primary" />
                      <CardTitle className="text-xl font-semibold">{lang.name}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                       <Button asChild size="sm" variant="outline">
                          <Link href={`/faculty/language/${lang.id}/tests`} className="flex items-center">
                              <Settings className="w-4 h-4 mr-2" /> Manage Tests
                          </Link>
                       </Button>
                       <Button asChild size="sm" variant="outline">
                          <Link href={`/faculty/analytics/${lang.id}`} className="flex items-center">
                              <BarChart3 className="w-4 h-4 mr-2" /> View Analytics
                          </Link>
                       </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground h-12 line-clamp-2">
                      {lang.description || `Manage courses and tests for ${lang.name}.`}
                    </p>
                    <Separator />
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-foreground">Your Courses in {lang.name}</h4>
                        <Button asChild size="sm">
                            <Link href={`/faculty/language/${lang.id}/courses/create`} className="flex items-center">
                                <PlusCircle className="w-4 h-4 mr-2" /> Create New Course
                            </Link>
                        </Button>
                    </div>
                    {lang.courses.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">You haven't created any courses for {lang.name} yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {lang.courses.map(course => (
                                <Card key={course.id} className="p-3 bg-muted/30">
                                    <CardTitle className="text-md font-medium line-clamp-1">{course.name}</CardTitle>
                                    <CardDescription className="text-xs line-clamp-2">{course.description || 'No description provided.'}</CardDescription>
                                    <div className="text-xs text-muted-foreground mt-1.5 flex items-center">
                                        <Users2 className="w-3.5 h-3.5 mr-1.5"/>
                                        Enrollments: {course.enrolledStudentUids?.length || 0} / {course.strength}
                                        ({(course.enrollmentRequests?.filter(r => r.status === 'pending').length || 0)} pending)
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5 justify-end">
                                        <Button size="xs" variant="ghost" asChild className="text-xs">
                                            <Link href={`/faculty/courses/${course.id}/content?languageId=${lang.id}`}>
                                                <ListChecks className="w-3 h-3 mr-1"/> Manage Content
                                            </Link>
                                        </Button>
                                        <Button size="xs" variant="ghost" asChild className="text-xs">
                                            <Link href={`/faculty/courses/${course.id}/enrollments?languageId=${lang.id}`}>
                                                <Users className="w-3 h-3 mr-1"/> Manage Enrollments
                                            </Link>
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
