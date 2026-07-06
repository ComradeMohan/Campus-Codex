
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import type { UserProfile, EnrolledLanguageProgress, ProgrammingLanguage, Question, College } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, User, Mail, Building, Award, BarChart2, BookOpen, Star, ArrowLeft, Edit, Phone, KeyRound, MessageSquarePlus, Lightbulb, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';
import { FeedbackFormDialog } from '@/components/feedback/FeedbackFormDialog';
import { FeatureRequestFormDialog } from '@/components/feature-request/FeatureRequestFormDialog';
import { Badge } from '@/components/ui/badge';
import { sendEmailVerification } from 'firebase/auth';


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
  
  const [isResending, setIsResending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
           console.warn(`Invalid currentScore for ${enrolledLang.languageName}: ${enrolledLang.currentScore}. Treating as 0.`);
        }
        possibleOverallScoreAcc += totalPossibleScoreForLang;
        
        return {
          ...enrolledLang,
          currentScore: !isNaN(currentScoreNum) ? currentScoreNum : 0,
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
  
  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast({
        title: "Verification Email Sent",
        description: `A new verification link has been sent to ${userProfile?.email}. Please check your inbox and spam folder.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await refreshUserProfile();
    setIsRefreshing(false);
    toast({ title: "Status Refreshed", description: "Your profile has been updated." });
  };

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

  if (authLoading || (!userProfile && !authLoading && isLoadingProgress)) {
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
          <Link href="/student/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Email Verification Alert */}
      {!userProfile.isEmailVerified && (
        <div className="border border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-300 dark:bg-amber-500/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm leading-snug">Verify your email address</h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl font-sans">
                Your account is unverified. Check your inbox ({userProfile.email}) for a verification link to ensure full account access.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <Button onClick={handleResendVerification} disabled={isResending || isRefreshing} size="sm" className="h-8 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex-1 sm:flex-none">
              {isResending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Resend Email
            </Button>
            <Button onClick={handleRefreshStatus} variant="outline" disabled={isRefreshing || isResending} size="sm" className="h-8 rounded-lg text-xs font-bold border-amber-500/20 hover:bg-amber-500/10 flex-1 sm:flex-none">
              {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />} Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Combined Profile Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 border border-border/40 bg-card/60 backdrop-blur-sm rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-accent"></div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-5">
            <Avatar className="h-20 w-20 md:h-24 md:w-24 text-2xl border-2 border-primary/20 shrink-0">
              <AvatarImage src={undefined} alt={userProfile.fullName} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {getInitials(userProfile.fullName)}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center sm:text-left space-y-1.5 min-w-0 flex-1">
              <h2 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight text-foreground">{userProfile.fullName}</h2>
              <p className="text-xs md:text-sm font-semibold text-muted-foreground line-clamp-1">{displayedCollegeName || 'Student Portal'}</p>
              {userProfile.registrationNumber && (
                <p className="text-[10px] md:text-xs font-mono text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded border border-border/20 w-fit mx-auto sm:mx-0">
                  Reg No: {userProfile.registrationNumber}
                </p>
              )}
              
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground font-sans">
                <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{userProfile.email}</span>
                </div>
                {userProfile.phoneNumber && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{userProfile.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Progress Widget */}
        <div className="border border-border/40 bg-card/60 backdrop-blur-sm rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden flex flex-col justify-center gap-4">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-accent to-primary"></div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-primary" /> Learning Progress
            </h3>
            <p className="text-[10px] text-muted-foreground font-sans">Your total performance metrics across all subjects.</p>
          </div>
          
          <div className="space-y-2">
            {isLoadingProgress ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Calculating progress...</span>
              </div>
            ) : totalPossibleOverallScore > 0 ? (
              <div className="space-y-2.5">
                <Progress value={(totalOverallScore / totalPossibleOverallScore) * 100} className="h-3" />
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-primary font-bold">{Math.round((totalOverallScore / totalPossibleOverallScore) * 100)}% Complete</span>
                  <span className="text-muted-foreground">{totalOverallScore} / {totalPossibleOverallScore} pts</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground leading-relaxed pt-1">
                {enrolledCoursesDetails.length > 0 ? "No scorable questions published in your enrolled subjects yet." : "You are not enrolled in any lab subjects yet."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress per Course Section */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Progress per Course
        </h2>
        
        {isLoadingProgress ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border border-border/40 rounded-2xl shadow-sm">
                <CardHeader className="pb-2"><div className="h-5 bg-muted rounded w-3/4 animate-pulse"></div></CardHeader>
                <CardContent className="space-y-2 pb-4">
                  <div className="h-2.5 bg-muted rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : enrolledCoursesDetails.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {enrolledCoursesDetails.map(course => {
              const LanguageIcon = course.languageIcon;
              const progressPercent = course.totalPossibleScore > 0 ? Math.round((course.currentScore / course.totalPossibleScore) * 100) : 0;
              return (
                <div 
                  key={course.languageId} 
                  className="rounded-2xl border border-border/40 bg-card/40 hover:bg-card/85 hover:border-primary/20 transition-all p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <LanguageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-bold text-foreground leading-tight">{course.languageName}</h3>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Enrolled: {new Date(course.enrolledAt.seconds * 1000).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {course.totalPossibleScore > 0 ? (
                        <>
                          <Progress value={progressPercent} className="h-2" />
                          <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground">
                            <span>Score: {course.currentScore} / {course.totalPossibleScore}</span>
                            <span className="text-primary font-bold">{progressPercent}%</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">No scorable questions published yet.</p>
                      )}
                    </div>
                  </div>
                  
                  <Button asChild variant="secondary" size="sm" className="w-full h-8 rounded-lg text-xs font-bold">
                    <Link href={`/student/labs/${course.languageId}/practice`} className="flex items-center justify-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Continue Practice
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="border border-border/40 rounded-2xl shadow-sm">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-sans">You are not enrolled in any courses yet, or progress data is unavailable.</p>
            </CardContent>
          </Card>
        )}
      </section>
      
      <div className="text-center mt-8">
        <Button asChild variant="outline" className="rounded-lg text-xs font-bold h-9">
            <Link href="/student/dashboard" className="flex items-center gap-1.5"><ArrowLeft className="h-4 w-4"/> Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
