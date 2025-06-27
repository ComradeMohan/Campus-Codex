
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, UserCog, Mail, Building, Phone, KeyRound, BookUser, Lightbulb, AlertTriangle, BookOpen, BarChart3, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';
import { FeatureRequestFormDialog } from '@/components/feature-request/FeatureRequestFormDialog';
import { Badge } from '@/components/ui/badge';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { ProgrammingLanguage } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendEmailVerification } from 'firebase/auth';


export default function FacultyProfilePage() {
  const { userProfile, loading: authLoading, colleges, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [isFeatureRequestDialogOpen, setIsFeatureRequestDialogOpen] = useState(false);
  const [managedLanguages, setManagedLanguages] = useState<ProgrammingLanguage[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchManagedLanguages = async () => {
      if (userProfile?.collegeId && userProfile.managedLanguageIds && userProfile.managedLanguageIds.length > 0) {
        setIsLoadingLanguages(true);
        try {
          const languagesRef = collection(db, 'colleges', userProfile.collegeId, 'languages');
          const q = query(languagesRef, where('__name__', 'in', userProfile.managedLanguageIds));
          const querySnapshot = await getDocs(q);
          const fetchedLanguages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProgrammingLanguage));
          setManagedLanguages(fetchedLanguages);
        } catch (error) {
          console.error("Error fetching managed languages:", error);
        } finally {
          setIsLoadingLanguages(false);
        }
      }
    };

    if (!authLoading && userProfile) {
      fetchManagedLanguages();
    }
  }, [userProfile, authLoading]);

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


  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </CardContent>
           <CardFooter className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground text-lg">User profile not found.</p>
         <Button asChild className="mt-4">
          <Link href="/faculty/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Faculty Profile</h1>
         <Button asChild variant="outline">
            <Link href="/faculty/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

       {!userProfile.isEmailVerified && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-800 dark:text-amber-400">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Verify Your Email Address
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-500">
              Your account is not yet verified. Please check your inbox for a verification link to ensure full account functionality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-600 dark:text-amber-600 mb-4">If you didn't receive the email or it has expired, you can request a new one.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleResendVerification} disabled={isResending || isRefreshing} size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700 text-white">
                {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Resend Verification Email
              </Button>
              <Button onClick={handleRefreshStatus} variant="secondary" disabled={isRefreshing || isResending} size="sm">
                {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                I've Verified, Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
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
                Faculty at {displayedCollegeName || 'N/A'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">Email:</span>
            <span>{userProfile.email}</span>
             {!userProfile.isEmailVerified && <Badge variant="destructive" className="ml-2">Unverified</Badge>}
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
           <div className="flex items-center space-x-3">
            <BookUser className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">Role:</span>
            <span className="capitalize">{userProfile.role}</span>
          </div>
           <div className="space-y-2">
            <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">Managing Languages/Subjects:</span>
            </div>
            {isLoadingLanguages ? (
                 <div className="flex items-center space-x-2 pl-8">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading languages...</span>
                </div>
            ) : managedLanguages.length > 0 ? (
                <div className="flex flex-wrap gap-2 pl-8">
                    {managedLanguages.map(lang => (
                    <Badge key={lang.id} variant="secondary">{lang.name}</Badge>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground pl-8">Not assigned to any specific languages yet.</p>
            )}
           </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" /> Change Password
            </Button>
             <Button variant="outline" onClick={() => setIsFeatureRequestDialogOpen(true)}>
                <Lightbulb className="mr-2 h-4 w-4" /> Suggest a Feature
            </Button>
            <Button asChild variant="outline">
                <Link href="/faculty/dashboard" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> View Dashboard
                </Link>
            </Button>
        </CardFooter>
      </Card>
      <ChangePasswordDialog 
        email={userProfile.email}
        isOpen={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
      />
      <FeatureRequestFormDialog
        isOpen={isFeatureRequestDialogOpen}
        onOpenChange={setIsFeatureRequestDialogOpen}
        userProfile={userProfile}
      />
    </div>
  );
}
