
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, setDoc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import type { College, UserProfile, CollegeRegistrationRequest } from '@/types';
import { createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, sendSignInLinkToEmail } from 'firebase/auth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Building, Users, BookOpen, ClipboardList, ShieldCheck, BarChartHorizontalBig, Database, UserCheck, UserX, MailWarning, KeyRound, LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle as DialogPrimitiveTitle, DialogDescription as DialogPrimitiveDescription, DialogFooter as DialogPrimitiveFooter, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

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
  adminName?: string;
}

export default function MainAdminDashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [collegesWithStats, setCollegesWithStats] = useState<CollegeWithStats[]>([]);
  const [pendingCollegeRequests, setPendingCollegeRequests] = useState<CollegeRegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const newStatusRef = useRef<'approved' | 'rejected' | null>(null);

  const [showTempPasswordDialog, setShowTempPasswordDialog] = useState(false);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ email: string; tempPass: string } | null>(null);
  const [isSendingReset, setIsSendingReset] = useState<Record<string, boolean>>({});
  const [isSendingAccessLink, setIsSendingAccessLink] = useState<Record<string, boolean>>({});


  const generateTemporaryPassword = (length = 12): string => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      password += charset.charAt(Math.floor(Math.random() * n));
    }
    // Ensure password complexity
    if (!/[a-z]/.test(password)) password += 'a';
    if (!/[A-Z]/.test(password)) password += 'Z';
    if (!/[0-9]/.test(password)) password += '1';
    if (!/[!@#$%^&*()_+~`|}{[\]:;?><,./-=]/.test(password)) password += '!';
    return password.slice(0, length);
  };


  const fetchPlatformData = useCallback(async () => {
    if (userProfile?.role !== 'super-admin') {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      let totalStudents = 0;
      let totalFaculty = 0;
      let totalLanguagesAgg = 0;
      let totalCoursesAgg = 0;
      let totalTestsAgg = 0;

      const collegesRef = collection(db, 'colleges');
      const collegesSnap = await getDocs(collegesRef);
      const fetchedColleges = collegesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as College));

      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      const usersData = usersSnap.docs.map(docSnap => docSnap.data() as UserProfile);

      usersData.forEach(user => {
        if (user.role === 'student') totalStudents++;
        if (user.role === 'faculty') totalFaculty++;
      });

      const detailedCollegesData: CollegeWithStats[] = [];

      for (const college of fetchedColleges) {
        let studentCount = 0;
        let facultyCount = 0;
        let languageCount = 0;
        let courseCount = 0;
        let adminName: string | undefined = undefined;

        usersData.forEach(user => {
          if (user.collegeId === college.id) {
            if (user.role === 'student') studentCount++;
            if (user.role === 'faculty') facultyCount++;
            if (user.uid === college.adminUid) adminName = user.fullName;
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
        detailedCollegesData.push({ ...college, studentCount, facultyCount, languageCount, courseCount, adminName });
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

      const requestsRef = collection(db, 'collegeRegistrationRequests');
      const pendingRequestsQuery = query(requestsRef, where("status", "==", "pending"), orderBy("requestedAt", "asc"));
      const pendingRequestsSnap = await getDocs(pendingRequestsQuery);
      setPendingCollegeRequests(pendingRequestsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CollegeRegistrationRequest)));

    } catch (error) {
      console.error("Error fetching platform data:", error);
      toast({ title: "Error", description: "Failed to load platform analytics data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, userProfile?.role]);

 useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
    } else {
      if (userProfile?.role === 'super-admin') {
        fetchPlatformData();
      } else {
        setIsLoading(false);
        if (userProfile) { 
          toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
        }
      }
    }
  }, [authLoading, userProfile, fetchPlatformData, toast]);

  const handleProcessCollegeRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessingRequestId(requestId);
    newStatusRef.current = status;
    const request = pendingCollegeRequests.find(r => r.id === requestId);
    if (!request) {
      toast({ title: "Error", description: "Request not found.", variant: "destructive" });
      setProcessingRequestId(null);
      return;
    }

    try {
      if (status === 'approved') {
        const collegesRef = collection(db, 'colleges');
        const q = query(collegesRef, where("name", "==", request.collegeName));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          toast({ title: 'Approval Failed', description: `A college named "${request.collegeName}" already exists.`, variant: 'destructive' });
          setProcessingRequestId(null);
          return;
        }

        const tempPassword = generateTemporaryPassword();
        const currentAuthUser = auth.currentUser;

        const userCredential = await createUserWithEmailAndPassword(auth, request.email, tempPassword);
        const newAdminUser = userCredential.user;

        await updateProfile(newAdminUser, { displayName: request.fullName });

        const newCollegeRef = doc(collection(db, 'colleges'));
        await setDoc(newCollegeRef, {
          name: request.collegeName,
          adminEmail: request.email,
          adminUid: newAdminUser.uid,
          createdAt: serverTimestamp(),
          status: 'active'
        });

        const adminProfile: UserProfile = {
          uid: newAdminUser.uid,
          email: request.email,
          fullName: request.fullName,
          role: 'admin',
          collegeName: request.collegeName,
          collegeId: newCollegeRef.id,
          phoneNumber: request.phoneNumber || undefined,
          isEmailVerified: true, 
        };
        await setDoc(doc(db, 'users', newAdminUser.uid), {
          ...adminProfile,
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'collegeRegistrationRequests', requestId), {
          status: 'approved',
          processedAt: serverTimestamp(),
          createdCollegeId: newCollegeRef.id,
          adminUid: newAdminUser.uid,
        });
        
        if (currentAuthUser && auth.currentUser?.uid !== currentAuthUser.uid) {
             console.warn("Super-admin session might have been affected by new user creation. Re-login if issues occur.");
        }

        setTempPasswordInfo({ email: request.email, tempPass: tempPassword });
        setShowTempPasswordDialog(true);

        toast({ title: "College Approved!", description: `"${request.collegeName}" approved. Admin account created.` });

      } else {
        await updateDoc(doc(db, 'collegeRegistrationRequests', requestId), {
          status: 'rejected',
          processedAt: serverTimestamp(),
        });
        toast({ title: "College Rejected", description: `Registration request for "${request.collegeName}" has been rejected.` });
      }
      fetchPlatformData();
    } catch (error: any) {
      console.error("Error processing request:", error);
      let desc = "Failed to process request.";
      if (error.code === 'auth/email-already-in-use') {
        desc = `The email ${request.email} is already in use. Cannot create new admin account.`;
      }
      toast({ title: "Processing Error", description: desc, variant: "destructive" });
    } finally {
      setProcessingRequestId(null);
      newStatusRef.current = null;
    }
  };

  const handleSendPasswordReset = async (collegeAdminEmail: string | null | undefined, collegeName: string) => {
    if (!collegeAdminEmail) {
      toast({ title: "Error", description: `Admin email not found for ${collegeName}.`, variant: "destructive" });
      return;
    }

    setIsSendingReset(prev => ({ ...prev, [collegeAdminEmail]: true }));
    try {
      await sendPasswordResetEmail(auth, collegeAdminEmail);
      toast({
        title: "Password Reset Email Sent",
        description: `A password reset link has been sent to ${collegeAdminEmail} for ${collegeName}'s admin. Please advise them to check their inbox and spam folder.`,
      });
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to send password reset email to ${collegeAdminEmail}. Please advise them to check their inbox and spam folder.`,
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(prev => ({ ...prev, [collegeAdminEmail]: false }));
    }
  };

  const handleSendAccessLink = async (collegeAdminEmail: string | null | undefined, collegeName: string) => {
    if (!collegeAdminEmail) {
      toast({ title: "Error", description: `Admin email not found for ${collegeName}.`, variant: "destructive" });
      return;
    }
    setIsSendingAccessLink(prev => ({ ...prev, [collegeAdminEmail]: true }));
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login?email=${encodeURIComponent(collegeAdminEmail)}`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, collegeAdminEmail, actionCodeSettings);
      toast({
        title: "Access Link Sent",
        description: `A magic sign-in link has been sent to ${collegeAdminEmail} for ${collegeName}'s admin. Please advise them to check their inbox and spam folder.`,
      });
    } catch (error: any) {
      console.error("Error sending access link:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to send access link to ${collegeAdminEmail}. Please advise them to check their inbox and spam folder.`,
        variant: "destructive",
      });
    } finally {
      setIsSendingAccessLink(prev => ({ ...prev, [collegeAdminEmail]: false }));
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="space-y-2 pb-2 border-b border-border/30">
          <Skeleton className="h-9 w-1/3 rounded-lg bg-muted/40" />
          <Skeleton className="h-4 w-2/3 rounded-md bg-muted/40" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border border-border/40 bg-card/45 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1.5 min-w-0 flex-1 mr-3">
                <Skeleton className="h-3 w-1/2 rounded bg-muted/40" />
                <Skeleton className="h-6 w-2/3 rounded-md bg-muted/40" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg shrink-0 bg-muted/40" />
            </Card>
          ))}
        </div>

        {/* Pending Registrations Skeleton */}
        <Card className="shadow-md border-border/40">
          <CardHeader className="py-4 px-5 border-b border-border/30 bg-muted/10 space-y-2">
            <Skeleton className="h-5 w-1/4 rounded bg-muted/40" />
            <Skeleton className="h-3.5 w-1/2 rounded bg-muted/40" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex justify-between items-center gap-4 py-2 border-b border-border/10 pb-4">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-1/3 rounded bg-muted/40" />
                  <Skeleton className="h-3 w-1/2 rounded bg-muted/40" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20 rounded-lg bg-muted/40" />
                  <Skeleton className="h-8 w-20 rounded-lg bg-muted/40" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Registered Colleges Skeleton */}
        <Card className="shadow-md border-border/40">
          <CardHeader className="py-4 px-5 border-b border-border/30 bg-muted/10 space-y-2">
            <Skeleton className="h-5 w-1/4 rounded bg-muted/40" />
            <Skeleton className="h-3.5 w-1/2 rounded bg-muted/40" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center gap-4 py-2 border-b border-border/10 pb-4">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-1/4 rounded bg-muted/40" />
                  <Skeleton className="h-3 w-1/3 rounded bg-muted/40" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24 rounded-lg bg-muted/40" />
                  <Skeleton className="h-8 w-24 rounded-lg bg-muted/40" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userProfile?.role !== 'super-admin') {
    return (
      <div className="container mx-auto py-8 text-center">
        <MailWarning className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/30">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-headline text-foreground flex items-center gap-2">
            <BarChartHorizontalBig className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Main Admin Console
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">Global platform overview, diagnostics, and college registrations for Campus Codex.</p>
        </div>
      </div>

      {/* KPI Stats Grid - 6 metrics in a single line on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(stat => (
          <Card key={stat.title} className="border border-border/40 bg-card/45 backdrop-blur-sm p-3.5 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden transition-all duration-300 hover:border-primary/20">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-mono block truncate">
                {stat.title.replace('Total ', '')}
              </span>
              <h3 className="text-xl md:text-2xl font-extrabold text-foreground leading-none">{stat.value}</h3>
            </div>
            <div className={`p-2 bg-primary/10 rounded-lg shrink-0 ${stat.color || 'text-primary'}`}>
              <stat.icon className="w-4 h-4" />
            </div>
          </Card>
        ))}
      </div>

      {/* Pending Registrations Section */}
      <Card className="shadow-md border-border/40">
        <CardHeader className="py-4 px-5 border-b border-border/30 bg-muted/10">
          <CardTitle className="text-sm md:text-base font-bold font-headline flex items-center gap-1.5">
            Pending Registrations 
            <span className="text-xs font-mono px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
              {pendingCollegeRequests.length}
            </span>
          </CardTitle>
          <CardDescription className="text-[10px] md:text-xs">Review and approve or reject new college sign-ups.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {pendingCollegeRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 font-sans">No pending college registration requests.</p>
          ) : (
            <>
              {/* Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono">College Name</TableHead>
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono">Admin Name</TableHead>
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono">Admin Email</TableHead>
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono">Requested At</TableHead>
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCollegeRequests.map((req) => (
                      <TableRow key={req.id} className="hover:bg-muted/10">
                        <TableCell className="font-semibold text-xs md:text-sm py-3">{req.collegeName}</TableCell>
                        <TableCell className="text-xs py-3">{req.fullName}</TableCell>
                        <TableCell className="text-xs py-3">{req.email}</TableCell>
                        <TableCell className="text-xs font-mono py-3">
                          {req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right py-3 space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessCollegeRequest(req.id, 'approved')}
                            disabled={processingRequestId === req.id}
                            className="text-xs text-green-600 border-green-600/30 bg-green-500/5 hover:bg-green-500/10 h-8 rounded-lg px-2.5 font-bold"
                          >
                            {processingRequestId === req.id && newStatusRef.current === 'approved' ? (
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                            ) : (
                              <UserCheck className="mr-1 h-3.5 w-3.5" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessCollegeRequest(req.id, 'rejected')}
                            disabled={processingRequestId === req.id}
                            className="text-xs text-red-600 border-red-600/30 bg-red-500/5 hover:bg-red-500/10 h-8 rounded-lg px-2.5 font-bold"
                          >
                            {processingRequestId === req.id && newStatusRef.current === 'rejected' ? (
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                            ) : (
                              <UserX className="mr-1 h-3.5 w-3.5" />
                            )}
                            Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View: Cards */}
              <div className="space-y-3 sm:hidden">
                {pendingCollegeRequests.map((req) => (
                  <div key={req.id} className="p-3 border border-border/45 rounded-2xl space-y-3 bg-muted/5">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-foreground leading-snug">{req.collegeName}</h4>
                      <p className="text-xs text-muted-foreground">{req.fullName} • {req.email}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Requested: {req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2.5 border-t border-border/30">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProcessCollegeRequest(req.id, 'approved')}
                        disabled={processingRequestId === req.id}
                        className="flex-1 text-xs text-green-600 border-green-600/30 bg-green-500/5 hover:bg-green-500/10 h-8 rounded-lg font-bold"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProcessCollegeRequest(req.id, 'rejected')}
                        disabled={processingRequestId === req.id}
                        className="flex-1 text-xs text-red-600 border-red-600/30 bg-red-500/5 hover:bg-red-500/10 h-8 rounded-lg font-bold"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Registered Colleges Section */}
      <Card className="shadow-md border-border/40">
        <CardHeader className="py-4 px-5 border-b border-border/30 bg-muted/10">
          <CardTitle className="text-sm md:text-base font-bold font-headline flex items-center gap-1.5">
            Registered Colleges
            <span className="text-xs font-mono px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
              {collegesWithStats.length}
            </span>
          </CardTitle>
          <CardDescription className="text-[10px] md:text-xs">Overview of active colleges on the platform. Manage admin access.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {collegesWithStats.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 font-sans">No colleges registered yet.</p>
          ) : (
            <>
              {/* Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono">College Name</TableHead>
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono text-center">Students</TableHead>
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono text-center">Faculty</TableHead>
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono">Admin Name</TableHead>
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono">Admin Email</TableHead>
                      <TableHead className="h-9 text-[11px] font-bold uppercase font-mono text-right">Admin Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collegesWithStats.map((college) => (
                      <TableRow key={college.id} className="hover:bg-muted/10">
                        <TableCell className="font-semibold text-xs md:text-sm py-3">{college.name}</TableCell>
                        <TableCell className="text-center text-xs py-3">{college.studentCount}</TableCell>
                        <TableCell className="text-center text-xs py-3">{college.facultyCount}</TableCell>
                        <TableCell className="text-xs py-3">{college.adminName || 'N/A'}</TableCell>
                        <TableCell className="text-xs py-3">{college.adminEmail || 'N/A'}</TableCell>
                        <TableCell className="text-right py-3 space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendPasswordReset(college.adminEmail, college.name)}
                            disabled={isSendingReset[college.adminEmail || ''] || !college.adminEmail || isSendingAccessLink[college.adminEmail || '']}
                            title={!college.adminEmail ? "No admin email available" : "Send password reset email"}
                            className="h-8 text-xs rounded-lg border-border/50 hover:bg-primary/5 hover:text-primary transition-all font-bold px-2.5"
                          >
                            {isSendingReset[college.adminEmail || ''] ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                            <span className="ml-1.5 hidden md:inline">Reset Pass</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendAccessLink(college.adminEmail, college.name)}
                            disabled={isSendingAccessLink[college.adminEmail || ''] || !college.adminEmail || isSendingReset[college.adminEmail || '']}
                            title={!college.adminEmail ? "No admin email available" : "Send magic sign-in link"}
                            className="h-8 text-xs rounded-lg border-border/50 hover:bg-primary/5 hover:text-primary transition-all font-bold px-2.5"
                          >
                            {isSendingAccessLink[college.adminEmail || ''] ? <Loader2 className="h-3 w-3 animate-spin" /> : <LinkIcon className="h-3.5 w-3.5" />}
                            <span className="ml-1.5 hidden md:inline">Access Link</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View: Cards */}
              <div className="space-y-3 sm:hidden">
                {collegesWithStats.map((college) => (
                  <div key={college.id} className="p-3 border border-border/45 rounded-2xl space-y-3 bg-muted/5">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-foreground leading-snug">{college.name}</h4>
                      <p className="text-xs text-muted-foreground">Admin: {college.adminName || 'N/A'} ({college.adminEmail || 'N/A'})</p>
                      <div className="flex gap-4 text-[10px] text-muted-foreground font-mono">
                        <span>Students: <strong className="text-foreground">{college.studentCount}</strong></span>
                        <span>Faculty: <strong className="text-foreground">{college.facultyCount}</strong></span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2.5 border-t border-border/30">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendPasswordReset(college.adminEmail, college.name)}
                        disabled={isSendingReset[college.adminEmail || ''] || !college.adminEmail || isSendingAccessLink[college.adminEmail || '']}
                        className="flex-1 text-[10px] h-8 rounded-lg font-bold"
                      >
                        {isSendingReset[college.adminEmail || ''] ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <KeyRound className="h-3.5 w-3.5 mr-1" />}
                        Reset Pass
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendAccessLink(college.adminEmail, college.name)}
                        disabled={isSendingAccessLink[college.adminEmail || ''] || !college.adminEmail || isSendingReset[college.adminEmail || '']}
                        className="flex-1 text-[10px] h-8 rounded-lg font-bold"
                      >
                        {isSendingAccessLink[college.adminEmail || ''] ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LinkIcon className="h-3.5 w-3.5 mr-1" />}
                        Access Link
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showTempPasswordDialog} onOpenChange={(open) => { if (!open) { setShowTempPasswordDialog(false); setTempPasswordInfo(null); }}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogPrimitiveTitle className="text-lg font-semibold">College Admin Credentials</DialogPrimitiveTitle>
            <DialogPrimitiveDescription>
              The admin account for <strong>{tempPasswordInfo?.email}</strong> has been created. Please securely share these credentials with them.
              They <strong className="text-destructive">MUST</strong> change this password immediately after their first login using the 'Change Password' option in their profile.
            </DialogPrimitiveDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <p className="text-sm font-medium">Email:</p>
              <Input readOnly value={tempPasswordInfo?.email || ''} className="bg-muted" />
            </div>
            <div>
              <p className="text-sm font-medium">Temporary Password:</p>
              <Input readOnly value={tempPasswordInfo?.tempPass || ''} className="bg-muted font-mono" />
            </div>
            <p className="text-xs text-muted-foreground">
              The college admin can change their password from their profile page after logging in.
            </p>
          </div>
          <DialogPrimitiveFooter>
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogPrimitiveFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
