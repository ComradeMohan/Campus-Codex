
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import type { UserProfile, EnrolledLanguageProgress, ProgrammingLanguage, Question, College } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, User, Mail, Building, Award, BarChart2, BookOpen, Star, ArrowLeft, Edit, Phone, KeyRound, MessageSquarePlus, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';
import { FeedbackFormDialog } from '@/components/feedback/FeedbackFormDialog';
import { FeatureRequestFormDialog } from '@/components/feature-request/FeatureRequestFormDialog';


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
  const { userProfile, loading: authLoading, refreshUserProfile, colleges } = useAuth();
  const { toast } = useToast();

  const [enrolledCoursesDetails, setEnrolledCoursesDetails] = useState<EnrolledLanguageWithDetails[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [totalOverallScore, setTotalOverallScore] = useState(0);
  const [totalPossibleOverallScore, setTotalPossibleOverallScore] = useState(0);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isFeatureRequestDialogOpen, setIsFeatureRequestDialogOpen] = useState(false);

  const fetchStudentProgress = useCallback(async () => {
    if (!userProfile?.uid || !userProfile?.collegeId) {
      if (!authLoading) toast({ title: "Error", description: "User or college information not found.", variant: "destructive" });
      setIsLoadingProgress(false); // Ensure loading stops if prerequisites aren't met
      return;
    }
    setIsLoadingProgress(true);
    try {
      const enrolledLangRef = collection(db, 'users', userProfile.uid, 'enrolledLanguages');
      const enrolledLangSnap = await getDocs(enrolledLangRef);
      const enrolledProgressItems = enrolledLangSnap.docs.map(elDoc => elDoc.data() as EnrolledLanguageProgress);

      let overallScoreAcc = 0;
      let possibleOverallScoreAcc = 0;

      const detailedProgressPromises = enrolledProgressItems.map(async (enrolledLang) => {
        let totalPossibleScoreForLang = 0;
        try {
          const questionsRef = collection(db, 'colleges', userProfile.collegeId!, 'languages', enrolledLang.languageId, 'questions');
          const questionsSnap = await getDocs(questionsRef);
          questionsSnap.forEach(qDoc => {
            const question = qDoc.data() as Question;
            totalPossibleScoreForLang += (question.maxScore || 100); // Default to 100 if maxScore is missing
          });
        } catch (qError) {
          console.error(`Error fetching questions for ${enrolledLang.languageName}:`, qError);
        }
        
        const currentScoreNum = Number(enrolledLang.currentScore);
        if (!isNaN(currentScoreNum)) {
          overallScoreAcc += currentScoreNum;
        } else {
           // If currentScore is NaN or invalid, treat as 0 for this language's contribution to overall score
           console.warn(`Invalid currentScore for ${enrolledLang.languageName}: ${enrolledLang.currentScore}. Treating as 0.`);
        }
        possibleOverallScoreAcc += totalPossibleScoreForLang;
        
        return {
          ...enrolledLang,
          currentScore: !isNaN(currentScoreNum) ? currentScoreNum : 0, // Ensure currentScore is a number
          totalPossibleScore: totalPossibleScoreForLang,
          languageIcon: getIconComponent(enrolledLang.iconName),
        };
      });

      const resolvedDetailedProgress = await Promise.all(detailedProgressPromises);
      setEnrolledCoursesDetails(resolvedDetailedProgress.sort((a,b) => a.languageName.localeCompare(b.languageName)));
      setTotalOverallScore(overallScoreAcc);
      setTotalPossibleOverallScore(possibleOverallScoreAcc);

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
    } else if (!authLoading && !userProfile) {
      setIsLoadingProgress(false); // Stop loading if no user
    }
  }, [authLoading, userProfile, fetchStudentProgress]);
  
  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const displayedCollegeName = React.useMemo(() => {
    if (userProfile?.collegeName) {
      return userProfile.collegeName;
    }
    if (userProfile?.collegeId && colleges.length > 0) {
      const foundCollege = colleges.find(c => c.id === userProfile.collegeId);
      return foundCollege?.name;
    }
    return undefined;
  }, [userProfile?.collegeName, userProfile?.collegeId, colleges]);

  if (authLoading || (!userProfile && !authLoading && isLoadingProgress)) { // Adjusted loading condition
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
        <CardHeader className="bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-primary/10 dark:via-background dark:to-accent/10">
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
                Student at {displayedCollegeName || 'N/A'}
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
          {displayedCollegeName && (
            <div className="flex items-center space-x-3">
              <Building className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">College:</span>
              <span>{displayedCollegeName}</span>
            </div>
          )}
          {userProfile.phoneNumber && (
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">Phone:</span>
              <span>{userProfile.phoneNumber}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 flex flex-wrap gap-3 items-center">
            <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" /> Change Password
            </Button>
            <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(true)}>
                <MessageSquarePlus className="mr-2 h-4 w-4" /> Give Feedback
            </Button>
            <Button variant="outline" onClick={() => setIsFeatureRequestDialogOpen(true)}>
                <Lightbulb className="mr-2 h-4 w-4" /> Suggest a Feature
            </Button>
        </CardFooter>
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
                Total Score: <span className="font-semibold text-primary">{totalOverallScore}</span>
                {' / '}{totalPossibleOverallScore}
                &nbsp;({Math.round((totalOverallScore / totalPossibleOverallScore) * 100)}%)
              </p>
            </>
          ) : (
             <p className="text-muted-foreground">
                Total Score: <span className="font-semibold text-primary">{totalOverallScore}</span>.
                {enrolledCoursesDetails.length > 0 ? " (No scorable items in enrolled courses yet to calculate a percentage.)" : " (Not enrolled in any scorable courses yet.)"}
             </p>
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
                        <p className="text-xs text-muted-foreground">No scorable questions yet for this course. Current score: {course.currentScore}</p>
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
            <Link href="/student/labs"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Labs</Link>
        </Button>
      </div>
      <ChangePasswordDialog 
        email={userProfile.email}
        isOpen={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
      />
      <FeedbackFormDialog
        isOpen={isFeedbackDialogOpen}
        onOpenChange={setIsFeedbackDialogOpen}
        studentProfile={userProfile}
      />
      <FeatureRequestFormDialog
        isOpen={isFeatureRequestDialogOpen}
        onOpenChange={setIsFeatureRequestDialogOpen}
        userProfile={userProfile}
      />
    </div>
  );
}
