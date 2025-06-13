
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import type { UserProfile, ProgrammingLanguage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BookUser, ClipboardList, BarChart3, ArrowRight, AlertTriangle, BookOpen, Settings, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';

interface ManagedLanguageDetails extends ProgrammingLanguage {
  iconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
}

const getIconComponent = (iconName?: string): React.FC<React.SVGProps<SVGSVGElement>> => {
  if (iconName && LucideIcons[iconName as keyof typeof LucideIcons]) {
    return LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;
  }
  return ClipboardList; // Default icon for a language/course
};

export default function FacultyDashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [managedLanguagesDetails, setManagedLanguagesDetails] = useState<ManagedLanguageDetails[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

  const fetchManagedLanguageDetails = useCallback(async () => {
    if (!userProfile?.collegeId || !userProfile.managedLanguageIds || userProfile.managedLanguageIds.length === 0) {
      setIsLoadingDetails(false);
      if (!authLoading && userProfile && (!userProfile.managedLanguageIds || userProfile.managedLanguageIds.length === 0)) {
        toast({
          title: "No Languages Assigned",
          description: "You are not currently assigned to manage any programming languages.",
          variant: "default",
        });
      }
      return;
    }

    setIsLoadingDetails(true);
    try {
      const langDetailsPromises = userProfile.managedLanguageIds.map(async (langId) => {
        const langDocRef = doc(db, 'colleges', userProfile.collegeId!, 'languages', langId);
        const langSnap = await getDoc(langDocRef);
        if (langSnap.exists()) {
          const langData = langSnap.data() as Omit<ProgrammingLanguage, 'id'>;
          return { 
            id: langSnap.id, 
            ...langData, 
            iconComponent: getIconComponent(langData.iconName) 
          } as ManagedLanguageDetails;
        }
        return null;
      });

      const resolvedDetails = (await Promise.all(langDetailsPromises)).filter(Boolean) as ManagedLanguageDetails[];
      setManagedLanguagesDetails(resolvedDetails.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching managed language details:", error);
      toast({ title: "Error", description: "Failed to load details for your managed languages.", variant: "destructive" });
    } finally {
      setIsLoadingDetails(false);
    }
  }, [userProfile?.collegeId, userProfile?.managedLanguageIds, toast, authLoading]);

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
            Welcome, {userProfile?.fullName || 'Faculty Member'}! Manage your assigned courses and view student analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>From here, you can create courses, add tests, and view analytics for the programming languages you oversee.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">Your Managed Languages</CardTitle>
          <CardDescription>Select a language to manage its courses, tests and view student progress.</CardDescription>
        </CardHeader>
        <CardContent>
          {managedLanguagesDetails.length === 0 ? (
             userProfile?.managedLanguageIds && userProfile.managedLanguageIds.length > 0 && isLoadingDetails ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Loading language details...</span>
                </div>
             ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <AlertTriangle className="mx-auto h-10 w-10 mb-3 text-amber-500"/>
                    <p className="font-semibold">You are not currently assigned to manage any specific programming languages.</p>
                    <p className="text-sm mt-1">Please contact your college administrator if you believe this is an error.</p>
                </div>
             )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {managedLanguagesDetails.map((lang) => (
                <Card key={lang.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                    <lang.iconComponent className="w-8 h-8 text-primary" />
                    <CardTitle className="text-lg font-semibold">{lang.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground h-12 line-clamp-2">
                      {lang.description || `Manage courses and tests for ${lang.name}.`}
                    </p>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                     <Button asChild className="w-full" variant="default">
                        <Link href={`/faculty/language/${lang.id}/courses/create`} className="flex items-center">
                            <PlusCircle className="w-4 h-4 mr-2" /> Create New Course <ArrowRight className="w-4 h-4 ml-auto"/>
                        </Link>
                    </Button>
                    <div className="w-full grid grid-cols-2 gap-2">
                        <Button asChild className="w-full" variant="outline">
                        <Link href={`/faculty/language/${lang.id}/tests`} className="flex items-center">
                            <Settings className="w-4 h-4 mr-2" /> Manage Tests
                        </Link>
                        </Button>
                        <Button asChild className="w-full" variant="outline">
                        <Link href={`/faculty/analytics/${lang.id}`} className="flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2" /> View Analytics
                        </Link>
                        </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
