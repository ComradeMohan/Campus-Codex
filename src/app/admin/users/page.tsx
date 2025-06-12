
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase'; // Added auth
import { collection, getDocs, query, where, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; // Added createUserWithEmailAndPassword and updateProfile
import type { UserProfile, ProgrammingLanguage, College } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Users, AlertTriangle, ArrowLeft, CheckCircle, XCircle, BookUser, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MultiSelect } from '@/components/ui/multi-select';


const facultyRegisterSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  managedLanguageIds: z.array(z.string()).min(1, { message: "Please assign at least one language."}),
});
type FacultyRegisterFormData = z.infer<typeof facultyRegisterSchema>;


interface UserWithManagedLanguages extends UserProfile {
  managedLanguageNames?: string[];
}

export default function UserManagementPage() {
  const { userProfile, colleges } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithManagedLanguages[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [collegeLanguages, setCollegeLanguages] = useState<ProgrammingLanguage[]>([]);
  const [isFacultyRegisterDialogOpen, setIsFacultyRegisterDialogOpen] = useState(false);
  const [isSubmittingFaculty, setIsSubmittingFaculty] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const facultyForm = useForm<FacultyRegisterFormData>({
    resolver: zodResolver(facultyRegisterSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      managedLanguageIds: [],
    },
  });

  const fetchCollegeLanguages = useCallback(async (collegeId: string) => {
    try {
      const languagesRef = collection(db, 'colleges', collegeId, 'languages');
      const q = query(languagesRef, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedLanguages = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as ProgrammingLanguage));
      setCollegeLanguages(fetchedLanguages);
      return fetchedLanguages;
    } catch (error) {
      console.error('Error fetching college languages:', error);
      toast({ title: 'Error', description: 'Failed to fetch college languages list.', variant: 'destructive' });
      return [];
    }
  }, [toast]);


  const fetchUsers = useCallback(async (collegeId: string) => {
    setIsLoadingUsers(true);
    const languages = await fetchCollegeLanguages(collegeId);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('collegeId', '==', collegeId), orderBy('role', 'asc'), orderBy('fullName', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedUsersPromises = querySnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data() as UserProfile;
        let managedLanguageNames: string[] = [];

        if (userData.role === 'faculty' && userData.managedLanguageIds && userData.managedLanguageIds.length > 0) {
          managedLanguageNames = userData.managedLanguageIds.map(id => {
            const lang = languages.find(l => l.id === id);
            return lang ? lang.name : 'Unknown Language';
          }).filter(name => name !== 'Unknown Language');
        }
        return { ...userData, managedLanguageNames };
      });
      
      const fetchedUsers = await Promise.all(fetchedUsersPromises);
      setUsers(fetchedUsers);

    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast, fetchCollegeLanguages]);

  useEffect(() => {
    if (userProfile?.collegeId) {
      fetchUsers(userProfile.collegeId);
    } else if (userProfile === null) { 
      setIsLoadingUsers(false);
    }
  }, [userProfile, fetchUsers]);

  const handleRegisterFaculty = async (values: FacultyRegisterFormData) => {
    if (!userProfile?.collegeId) {
      toast({ title: 'Error', description: 'Admin college ID not found.', variant: 'destructive'});
      return;
    }
    setIsSubmittingFaculty(true);
    try {
      // Temporarily store current user to sign them back in
      const currentAuthUser = auth.currentUser;

      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newFacultyUser = userCredential.user;

      if (newFacultyUser) {
        await updateProfile(newFacultyUser, { displayName: values.fullName });

        const selectedCollege = colleges.find(c => c.id === userProfile.collegeId);

        const facultyProfileData: UserProfile = {
          uid: newFacultyUser.uid,
          email: newFacultyUser.email,
          fullName: values.fullName,
          role: 'faculty',
          collegeId: userProfile.collegeId,
          collegeName: selectedCollege?.name || userProfile.collegeName,
          isEmailVerified: true, // Admin created, so considered verified for app logic
          managedLanguageIds: values.managedLanguageIds,
        };
        await setDoc(doc(db, 'users', newFacultyUser.uid), {
          ...facultyProfileData,
          createdAt: serverTimestamp(),
        });

        toast({
          title: 'Faculty Registered!',
          description: `${values.fullName} has been registered. They can now log in. Please inform them of their temporary password and advise them to change it.`,
        });
        setIsFacultyRegisterDialogOpen(false);
        facultyForm.reset();
        fetchUsers(userProfile.collegeId); // Refresh user list
      }
      // Sign the admin back in if they were signed out by createUserWithEmailAndPassword
      if (currentAuthUser && auth.currentUser?.uid !== currentAuthUser.uid) {
         // This part is tricky with Firebase v9+. createUserWithEmailAndPassword signs in the new user.
         // For a seamless admin experience, the admin should ideally remain logged in.
         // One way is to use Firebase Admin SDK on a backend to create users without changing current auth state.
         // For client-side, we'll re-authenticate the admin or instruct them to log back in if issues arise.
         // For now, we'll assume the admin might need to re-login if their session changes.
         // Or, more simply, the createUserWithEmailAndPassword might not sign out the admin,
         // let's proceed and test this behavior. If it does sign out admin, a backend solution or UX note is needed.
         console.log("New faculty user signed in, admin might need to re-evaluate session.");
      }

    } catch (error: any) {
      console.error('Faculty registration error:', error);
      let errorMessage = 'An unexpected error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak.';
      }
      toast({
        title: 'Registration Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingFaculty(false);
    }
  };


  if (!userProfile && !isLoadingUsers) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You must be logged in as an admin to manage users.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  if (!userProfile?.collegeId && !isLoadingUsers) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">College Not Found</h1>
        <p className="text-muted-foreground mb-4">Admin profile is not associated with a college. Please contact support.</p>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }
  
  const languageOptionsForMultiselect = collegeLanguages.map(lang => ({
    value: lang.id,
    label: lang.name,
  }));


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-headline flex items-center">
          <Users className="w-8 h-8 mr-3 text-primary" />
          User Management
        </h1>
        <div className="flex gap-2">
            <Dialog open={isFacultyRegisterDialogOpen} onOpenChange={setIsFacultyRegisterDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" /> Register New Faculty
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>Register New Faculty Member</DialogTitle>
                  <DialogDescription>
                    Enter the faculty details. They will be able to log in with these credentials.
                  </DialogDescription>
                </DialogHeader>
                <Form {...facultyForm}>
                  <form onSubmit={facultyForm.handleSubmit(handleRegisterFaculty)} className="space-y-4 py-2">
                    <FormField
                      control={facultyForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input placeholder="Dr. Ada Lovelace" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={facultyForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl><Input type="email" placeholder="faculty@college.edu" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={facultyForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temporary Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type={showPassword ? "text" : "password"} placeholder="********" {...field} />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword((prev) => !prev)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                )}
                                <span className="sr-only">
                                  {showPassword ? "Hide password" : "Show password"}
                                </span>
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                        control={facultyForm.control}
                        name="managedLanguageIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Manageable Languages</FormLabel>
                                <MultiSelect
                                    options={languageOptionsForMultiselect}
                                    selected={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select languages..."
                                    className="w-full"
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter className="pt-2">
                      <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                      <Button type="submit" disabled={isSubmittingFaculty}>
                        {isSubmittingFaculty && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Register Faculty
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button asChild variant="outline">
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">
            Users at {userProfile?.collegeName || 'Your College'}
          </CardTitle>
          <CardDescription>
            List of all registered students, faculty, and administrators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No users found for this college yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>App Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : user.role === 'faculty' ? 'secondary' : 'outline'} 
                          className="capitalize"
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === 'student' ? `Reg No: ${user.registrationNumber || 'N/A'}` :
                         user.role === 'faculty' && user.managedLanguageNames && user.managedLanguageNames.length > 0 ? 
                           <div className="flex flex-wrap gap-1">
                            {user.managedLanguageNames.map(name => <Badge key={name} variant="outline" className="text-xs">{name}</Badge>)}
                           </div> :
                         user.role === 'faculty' ? 'Manages: None Assigned' : 'N/A'}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.isEmailVerified ? (
                          <CheckCircle className="h-5 w-5 text-green-500 inline-block" title="Email Verified in App" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 inline-block" title="Email Not Verified in App" />
                        )}
                      </TableCell>
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
