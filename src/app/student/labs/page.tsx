
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AICodeAssistant } from '@/components/AICodeAssistant';
import { Loader2, BookOpen, AlertTriangle, CheckCircle, TerminalSquare, Zap } from 'lucide-react';
import type { ProgrammingLanguage } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';

const getIconComponent = (iconName?: string): React.FC<React.SVGProps<SVGSVGElement>> => {
  if (iconName && LucideIcons[iconName as keyof typeof LucideIcons]) {
    return LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;
  }
  return BookOpen; // Default icon
};

export default function StudentCodingLabsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [collegeLanguages, setCollegeLanguages] = useState<ProgrammingLanguage[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [enrolledLanguageIds, setEnrolledLanguageIds] = useState<Set<string>>(new Set());
  const [isEnrolling, setIsEnrolling] = useState<Record<string, boolean>>({}); // Tracks enrollment loading state per language

  const fetchCollegeLanguages = useCallback(async (collegeId: string) => {
    setIsLoadingLanguages(true);
    try {
      const languagesRef = collection(db, 'colleges', collegeId, 'languages');
      const q = query(languagesRef, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedLanguages = querySnapshot.docs.map(langDoc => ({
        id: langDoc.id, ...langDoc.data(),
        createdAt: langDoc.data().createdAt as Timestamp, // Ensure createdAt is a Timestamp
      })) as ProgrammingLanguage[];
      setCollegeLanguages(fetchedLanguages);
    } catch (error) {
      console.error('Error fetching college languages:', error);
      toast({ title: 'Error', description: 'Failed to fetch available courses.', variant: 'destructive' });
    } finally {
      setIsLoadingLanguages(false);
    }
  }, [toast]);

  const fetchEnrolledLanguages = useCallback(async (studentUid: string) => {
    try {
      const enrolledLanguagesRef = collection(db, 'users', studentUid, 'enrolledLanguages');
      const querySnapshot = await getDocs(enrolledLanguagesRef);
      const ids = new Set<string>();
      querySnapshot.forEach(langDoc => ids.add(langDoc.id));
      setEnrolledLanguageIds(ids);
    } catch (error) {
      console.error('Error fetching enrolled languages:', error);
      toast({ title: 'Error', description: 'Failed to fetch your enrolled courses.', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    if (userProfile?.collegeId) {
      fetchCollegeLanguages(userProfile.collegeId);
    }
    if (userProfile?.uid) {
      fetchEnrolledLanguages(userProfile.uid);
    }
    if (!authLoading && !userProfile) {
       setIsLoadingLanguages(false); // Stop loading if user is not logged in
    }
  }, [userProfile, authLoading, fetchCollegeLanguages, fetchEnrolledLanguages]);

  const handleEnroll = async (language: ProgrammingLanguage) => {
    if (!userProfile?.uid) {
      toast({ title: 'Error', description: 'You must be logged in to enroll.', variant: 'destructive' });
      return;
    }
    if (enrolledLanguageIds.has(language.id)) {
      toast({ title: 'Already Enrolled', description: `You are already enrolled in ${language.name}.`, variant: 'default' });
      return;
    }

    setIsEnrolling(prev => ({ ...prev, [language.id]: true }));
    try {
      const enrollmentRef = doc(db, 'users', userProfile.uid, 'enrolledLanguages', language.id);
      await setDoc(enrollmentRef, {
        languageId: language.id,
        languageName: language.name,
        enrolledAt: serverTimestamp(),
        iconName: language.iconName || 'BookOpen', // Store icon for potential future use
      });
      setEnrolledLanguageIds(prev => new Set(prev).add(language.id));
      toast({ title: 'Enrollment Successful!', description: `You have enrolled in ${language.name}.` });
    } catch (error) {
      console.error('Error enrolling in language:', error);
      toast({ title: 'Enrollment Failed', description: `Could not enroll in ${language.name}. Please try again.`, variant: 'destructive' });
    } finally {
      setIsEnrolling(prev => ({ ...prev, [language.id]: false }));
    }
  };

  if (authLoading || (isLoadingLanguages && userProfile)) {
    return (
      <div className="space-y-8">
        <Card className="shadow-lg overflow-hidden">
            {/* Skeleton for hero section */}
             <div className="md:flex">
                <div className="md:w-1/2 bg-muted h-64 md:h-auto animate-pulse"></div>
                <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center space-y-4">
                    <div className="h-8 bg-muted rounded w-3/4 animate-pulse"></div>
                    <div className="h-6 bg-muted rounded w-full animate-pulse"></div>
                    <div className="h-5 bg-muted rounded w-5/6 animate-pulse"></div>
                </div>
            </div>
        </Card>
        <Card>
            <CardHeader><CardTitle className="h-7 bg-muted rounded w-1/2 animate-pulse"></CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
                        <div className="h-6 bg-muted rounded w-1/2 animate-pulse"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                    <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
                </Card>
            ))}
            </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!userProfile) {
     return (
     <div className="container mx-auto py-8 text-center">
       <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
       <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
       <p className="text-muted-foreground mb-4">You must be logged in to view and enroll in labs.</p>
       <Button asChild><Link href="/login">Go to Login</Link></Button>
     </div>);
  }


  return (
    <div className="space-y-8">
      <Card className="shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2">
             <Image 
              src="https://placehold.co/800x600.png" 
              alt="Student coding in a lab" 
              width={800} 
              height={600} 
              className="object-cover h-64 w-full md:h-full"
              data-ai-hint="coding learning student"
            />
          </div>
          <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-3xl font-headline text-primary flex items-center">
                <TerminalSquare className="w-8 h-8 mr-3" />
                Your Coding Labs
              </CardTitle>
              <CardDescription className="text-lg mt-1">
                Welcome {userProfile?.fullName}! Explore courses and start your coding journey.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-muted-foreground mb-6">
                Below are the programming languages and courses offered by {userProfile?.collegeName || 'your college'}.
                Enroll to get started!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-secondary rounded-lg">
                  <BookOpen className="w-6 h-6 text-primary" />
                  <span className="font-medium">Interactive Learning</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-secondary rounded-lg">
                  <Zap className="w-6 h-6 text-accent" />
                  <span className="font-medium">AI-Powered Assistance</span>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Available Courses at {userProfile?.collegeName}</CardTitle>
          <CardDescription>Enroll in a course to start learning and practicing.</CardDescription>
        </CardHeader>
        <CardContent>
          {collegeLanguages.length === 0 && !isLoadingLanguages ? (
            <div className="text-center py-10">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">No Courses Available Yet</p>
              <p className="text-sm text-muted-foreground">
                Your college ({userProfile?.collegeName}) hasn't added any programming languages to the platform.
                Please check back later or contact your college administrator.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                In the meantime, feel free to use the AI Code Assistant below for general practice.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collegeLanguages.map((language) => {
                const LanguageIcon = getIconComponent(language.iconName);
                const isCurrentlyEnrolling = isEnrolling[language.id];
                const isAlreadyEnrolled = enrolledLanguageIds.has(language.id);

                return (
                  <Card key={language.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                    <CardHeader className="flex flex-row items-start space-x-4 pb-3">
                      <LanguageIcon className="w-10 h-10 text-primary mt-1" />
                      <div>
                        <CardTitle className="text-xl font-semibold">{language.name}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          Added on: {language.createdAt ? new Date(language.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground min-h-[60px] line-clamp-3">
                        {language.description || 'No detailed description available for this course.'}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => handleEnroll(language)}
                        disabled={isCurrentlyEnrolling || isAlreadyEnrolled || !userProfile?.uid}
                        className="w-full"
                        variant={isAlreadyEnrolled ? "secondary" : "default"}
                      >
                        {isCurrentlyEnrolling ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : isAlreadyEnrolled ? (
                          <> <CheckCircle className="mr-2 h-4 w-4" /> Enrolled </>
                        ) : (
                          'Enroll Now'
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <AICodeAssistant />
    </div>
  );
}

