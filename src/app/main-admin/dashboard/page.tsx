
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
    if (!authLoading) {
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
        description: `A password reset link has been sent to ${collegeAdminEmail} for the admin of ${collegeName}.`,
      });
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to send password reset email to ${collegeAdminEmail}.`,
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
        url: `${window.location.origin}/login?email=${encodeURIComponent(collegeAdminEmail)}`, // Simpler URL, login page handles the rest
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, collegeAdminEmail, actionCodeSettings);
      toast({
        title: "Access Link Sent",
        description: `A magic sign-in link has been sent to ${collegeAdminEmail} for the admin of ${collegeName}.`,
      });
    } catch (error: any) {
      console.error("Error sending access link:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to send access link to ${collegeAdminEmail}.`,
        variant: "destructive",
      });
    } finally {
      setIsSendingAccessLink(prev => ({ ...prev, [collegeAdminEmail]: false }));
    }
  };


  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Platform Analytics...</span>
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
    <div className="space-y-8">
      <Card className="shadow-xl bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-primary/10 dark:via-background dark:to-accent/10">
        <CardHeader className="p-6 md:p-8">
          <div className="flex items-center space-x-4">
            <BarChartHorizontalBig className="w-12 h-12 text-primary" />
            <div>
              <CardTitle className="text-3xl md:text-4xl font-headline text-primary">Main Admin Dashboard</CardTitle>
              <CardDescription className="text-lg md:text-xl text-muted-foreground mt-1">
                Global platform overview and key metrics for Campus Codex.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map(stat => (
            <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                    <CardTitle className="text-md font-semibold text-muted-foreground">{stat.title}</CardTitle>
                    <stat.icon className={`h-6 w-6 ${stat.color || 'text-primary'}`} />
                </CardHeader>
                <CardContent className="pb-4 px-4">
                    <div className="text-4xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
            </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Pending College Registrations ({pendingCollegeRequests.length})</CardTitle>
          <CardDescription>Review and approve or reject new college sign-ups.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingCollegeRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending college registration requests.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>College Name</TableHead>
                    <TableHead>Admin Name</TableHead>
                    <TableHead>Admin Email</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingCollegeRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.collegeName}</TableCell>
                      <TableCell>{req.fullName}</TableCell>
                      <TableCell>{req.email}</TableCell>
                      <TableCell>{req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessCollegeRequest(req.id, 'approved')}
                          disabled={processingRequestId === req.id}
                          className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                        >
                          {processingRequestId === req.id && newStatusRef.current === 'approved' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-1 h-4 w-4" />} Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessCollegeRequest(req.id, 'rejected')}
                          disabled={processingRequestId === req.id}
                          className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          {processingRequestId === req.id && newStatusRef.current === 'rejected' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-1 h-4 w-4" />} Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Registered Colleges ({collegesWithStats.length})</CardTitle>
          <CardDescription>Overview of each college on the platform. Manage admin access.</CardDescription>
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
                    <TableHead>Admin Email</TableHead>
                    <TableHead>Admin Name</TableHead>
                    <TableHead className="text-right">Admin Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collegesWithStats.map((college) => (
                    <TableRow key={college.id}>
                      <TableCell className="font-medium">{college.name}</TableCell>
                      <TableCell className="text-center">{college.studentCount}</TableCell>
                      <TableCell className="text-center">{college.facultyCount}</TableCell>
                      <TableCell>{college.adminEmail || 'N/A'}</TableCell>
                      <TableCell>{college.adminName || 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendPasswordReset(college.adminEmail, college.name)}
                          disabled={isSendingReset[college.adminEmail || ''] || !college.adminEmail || isSendingAccessLink[college.adminEmail || '']}
                          title={!college.adminEmail ? "No admin email available" : "Send password reset email"}
                        >
                          {isSendingReset[college.adminEmail || ''] ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                          <span className="ml-1.5 hidden sm:inline">Password Reset</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendAccessLink(college.adminEmail, college.name)}
                          disabled={isSendingAccessLink[college.adminEmail || ''] || !college.adminEmail || isSendingReset[college.adminEmail || '']}
                          title={!college.adminEmail ? "No admin email available" : "Send magic sign-in link"}
                        >
                          {isSendingAccessLink[college.adminEmail || ''] ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                          <span className="ml-1.5 hidden sm:inline">Access Link</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showTempPasswordDialog} onOpenChange={(open) => { if (!open) { setShowTempPasswordDialog(false); setTempPasswordInfo(null); }}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogPrimitiveTitle className="text-lg font-semibold">College Admin Credentials</DialogPrimitiveTitle>
            <DialogPrimitiveDescription>
              The admin account for <strong>{tempPasswordInfo?.email}</strong> has been created. Please securely share these credentials with them.
              They <strong className="text-destructive">MUST</strong> change this password immediately after their first login.
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
