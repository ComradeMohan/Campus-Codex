
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import type { UserProfile, EnrolledLanguageProgress, ProgrammingLanguage, Question } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, User, Mail, Building, Award, BarChart2, BookOpen, Star, ArrowLeft, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';

interface EnrolledLanguageWithDetails extends EnrolledLanguageProgress {
  totalPossibleScore: number;
  languageIcon: React.FC<React.SVGProps<SVGSVGElement>>;
}

const getIconComponent = (iconName?: string): React.FC<React.SVGProps<SVGSVGElement>> => {
  if (iconName && LucideIcons[iconName as keyof typeof LucideIcons]) {
    return LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;
  }
  return BookOpen; // Default icon
};


export default function StudentProfilePage() {
  const { userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const { toast } = useToast();

  const [enrolledCoursesDetails, setEnrolledCoursesDetails] = useState<EnrolledLanguageWithDetails[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [totalOverallScore, setTotalOverallScore] = useState(0);
  const [totalPossibleOverallScore, setTotalPossibleOverallScore] = useState(0);

  const fetchStudentProgress = useCallback(async () => {
    if (!userProfile?.uid || !userProfile?.collegeId) {
      if (!authLoading) toast({ title: "Error", description: "User or college information not found.", variant: "destructive" });
      return;
    }
    setIsLoadingProgress(true);
    try {
      const enrolledLangRef = collection(db, 'users', userProfile.uid, 'enrolledLanguages');
      const enrolledLangSnap = await getDocs(enrolledLangRef);
      const enrolledProgressItems = enrolledLangSnap.docs.map(elDoc => elDoc.data() as EnrolledLanguageProgress);

      let overallScore = 0;
      let possibleOverallScore = 0;

      const detailedProgressPromises = enrolledProgressItems.map(async (enrolledLang) => {
        let totalPossibleScoreForLang = 0;
        try {
          const questionsRef = collection(db, 'colleges', userProfile.collegeId!, 'languages', enrolledLang.languageId, 'questions');
          const questionsSnap = await getDocs(questionsRef);
          questionsSnap.forEach(qDoc => {
            const question = qDoc.data() as Question;
            totalPossibleScoreForLang += question.maxScore || 100;
          });
        } catch (qError) {
          console.error(`Error fetching questions for ${enrolledLang.languageName}:`, qError);
          // Keep totalPossibleScoreForLang as 0 or handle as appropriate
        }
        
        overallScore += enrolledLang.currentScore;
        possibleOverallScore += totalPossibleScoreForLang;
        
        return {
          ...enrolledLang,
          totalPossibleScore: totalPossibleScoreForLang,
          languageIcon: getIconComponent(enrolledLang.iconName),
        };
      });

      const resolvedDetailedProgress = await Promise.all(detailedProgressPromises);
      setEnrolledCoursesDetails(resolvedDetailedProgress.sort((a,b) => a.languageName.localeCompare(b.languageName)));
      setTotalOverallScore(overallScore);
      setTotalPossibleOverallScore(possibleOverallScore);

    } catch (error) {
      console.error("Error fetching student progress:", error);
      toast({ title: "Error", description: "Failed to load your progress details.", variant: "destructive" });
    } finally {
      setIsLoadingProgress(false);
    }
  }, [userProfile?.uid, userProfile?.collegeId, authLoading, toast]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchStudentProgress();
    }
  }, [authLoading, userProfile, fetchStudentProgress]);
  
  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  if (authLoading || (!userProfile && !authLoading)) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Profile...</span>
      </div>
    );
  }

  if (!userProfile) {
     return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-lg text-muted-foreground">User profile not found.</p>
         <Button asChild className="mt-4">
          <Link href="/student/labs">Back to Labs</Link>
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader className="bg-muted/30">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="h-24 w-24 text-3xl">
              <AvatarImage src={undefined} alt={userProfile.fullName} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(userProfile.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl font-headline">{userProfile.fullName}</CardTitle>
              <CardDescription className="text-md">
                Student at {userProfile.collegeName || 'Your College'}
              </CardDescription>
              <p className="text-sm text-muted-foreground">Reg. No: {userProfile.registrationNumber || 'N/A'}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">Email:</span>
            <span>{userProfile.email}</span>
          </div>
          {userProfile.collegeName && (
            <div className="flex items-center space-x-3">
              <Building className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">College:</span>
              <span>{userProfile.collegeName}</span>
            </div>
          )}
          {userProfile.phoneNumber && (
            <div className="flex items-center space-x-3">
              <Building className="w-5 h-5 text-primary" /> {/* Consider Phone icon */}
              <span className="text-muted-foreground">Phone:</span>
              <span>{userProfile.phoneNumber}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <BarChart2 className="w-6 h-6 mr-2 text-primary" />
            Overall Learning Progress
          </CardTitle>
          <CardDescription>Your total score accumulated across all enrolled courses.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProgress ? (
            <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Loading overall progress...</span>
            </div>
          ) : totalPossibleOverallScore > 0 ? (
            <>
              <Progress value={(totalOverallScore / totalPossibleOverallScore) * 100} className="w-full h-3 mb-1" />
              <p className="text-sm text-muted-foreground text-right">
                Total Score: <span className="font-semibold text-primary">{totalOverallScore}</span> / {totalPossibleOverallScore}
                ({Math.round((totalOverallScore / totalPossibleOverallScore) * 100 || 0)}%)
              </p>
            </>
          ) : (
             <p className="text-muted-foreground">No scores recorded yet or courses may not have questions.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <Award className="w-6 h-6 mr-2 text-primary" />
            Progress per Course
          </CardTitle>
          <CardDescription>Detailed progress for each programming language you are enrolled in.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProgress ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2].map(i => (
                    <Card key={i} className="p-4 space-y-2">
                        <div className="flex items-center space-x-3 mb-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <div className="h-6 bg-muted rounded w-1/2"></div>
                        </div>
                        <div className="h-3 bg-muted rounded w-full mb-1"></div>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                    </Card>
                ))}
            </div>
          ) : enrolledCoursesDetails.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCoursesDetails.map(course => {
                const LanguageIcon = course.languageIcon;
                const progressPercent = course.totalPossibleScore > 0 ? Math.round((course.currentScore / course.totalPossibleScore) * 100) : 0;
                return (
                  <Card key={course.languageId} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                        <LanguageIcon className="w-8 h-8 text-primary" />
                        <CardTitle className="text-lg font-semibold">{course.languageName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {course.totalPossibleScore > 0 ? (
                        <>
                            <Progress value={progressPercent} className="h-2.5" />
                            <p className="text-xs text-muted-foreground text-right">
                                Score: {course.currentScore} / {course.totalPossibleScore} ({progressPercent}%)
                            </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No scorable questions yet for this course.</p>
                      )}
                       <p className="text-xs text-muted-foreground pt-1">Enrolled: {new Date(course.enrolledAt.seconds * 1000).toLocaleDateString()}</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`/student/labs/${course.languageId}/practice`}>
                                <BookOpen className="mr-2 h-4 w-4" /> Continue Practice
                            </Link>
                        </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">You are not enrolled in any courses yet, or progress data is unavailable.</p>
          )}
        </CardContent>
      </Card>
      
      <div className="text-center mt-8">
        <Button asChild variant="outline">
            <Link href="/student/labs"><ArrowLeft className="mr-2"/> Back to Labs</Link>
        </Button>
      </div>
    </div>
  );
}

