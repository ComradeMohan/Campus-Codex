
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, isSignInWithEmailLink, signInWithEmailLink, sendPasswordResetEmail, type Auth, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, addDoc, updateDoc, query, where, limit } from 'firebase/firestore'; 
import type { UserProfile } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth }  from '@/contexts/AuthContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(3, { message: 'Please enter your email or phone number.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkFlow, setIsMagicLinkFlow] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  useEffect(() => {
    const emailFromStorage = window.localStorage.getItem('emailForSignIn');
    if (isSignInWithEmailLink(auth as Auth, window.location.href) && emailFromStorage) {
      setIsMagicLinkFlow(true);
      setIsLoading(true);
      signInWithEmailLink(auth as Auth, emailFromStorage, window.location.href)
        .then(async (result) => {
          window.localStorage.removeItem('emailForSignIn');
          const user = result.user;
          
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            // This branch is for the super-admin approved admin flow
            const role = searchParams.get('role');
            const fullName = searchParams.get('fullName');
            const collegeNameQuery = searchParams.get('collegeName');
            const phoneNumber = searchParams.get('phoneNumber');
            const approvedCollegeId = searchParams.get('collegeId'); // Sent by super-admin approval logic

            if (role === 'admin' && fullName && collegeNameQuery && approvedCollegeId) {
              const adminProfile: UserProfile = {
                uid: user.uid,
                email: user.email,
                fullName: fullName,
                role: 'admin',
                collegeName: collegeNameQuery,
                collegeId: approvedCollegeId,
                phoneNumber: phoneNumber || undefined,
                isEmailVerified: true, 
              };
              await setDoc(userDocRef, {
                ...adminProfile,
                createdAt: serverTimestamp(),
              });
              
              // Also update the adminUid in the college document
              const collegeDocRef = doc(db, 'colleges', approvedCollegeId);
              await updateDoc(collegeDocRef, { adminUid: user.uid });

              await refreshUserProfile();
              router.push('/admin/dashboard');
            } else {
               console.error("Missing admin details or collegeId for magic link sign in after approval.", {role, fullName, collegeNameQuery, approvedCollegeId});
               throw new Error("Missing admin details or collegeId for magic link sign in after approval.");
            }
          } else {
             // Existing user logging in via magic link (e.g., passwordless)
             const userProfile = userDocSnap.data() as UserProfile;
             await refreshUserProfile();
             if (userProfile.role === 'admin') router.push('/admin/dashboard');
             else if (userProfile.role === 'student') router.push('/student/labs');
             else if (userProfile.role === 'faculty') router.push('/faculty/dashboard');
             else if (userProfile.role === 'super-admin') router.push('/main-admin/dashboard');
             else router.push('/'); 
          }
          toast({ title: 'Login Successful', description: 'Welcome back!' });
        })
        .catch((error) => {
          console.error('Magic link sign-in error:', error);
          toast({
            title: 'Login Error',
            description: error.message || 'Failed to sign in with magic link.',
            variant: 'destructive',
          });
          router.push('/login'); 
        })
        .finally(() => setIsLoading(false));
    } else {
      const emailFromQuery = searchParams.get('email');
      if (emailFromQuery) {
        form.setValue('username', emailFromQuery);
      }
    }
  }, [router, toast, searchParams, form, refreshUserProfile]);


  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    let email = values.username;
    
    // Check if the username is an email or a phone number
    const isLikelyEmail = email.includes('@');

    if (!isLikelyEmail) {
        // Assume it's a phone number, try to find the user's email
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('phoneNumber', '==', values.username), limit(1));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                toast({ title: 'Login Error', description: 'No account found with this phone number.', variant: 'destructive' });
                setIsLoading(false);
                return;
            }
            const userDoc = querySnapshot.docs[0].data();
            if (!userDoc.email) {
                 toast({ title: 'Login Error', description: 'Account associated with this phone number does not have a valid email.', variant: 'destructive' });
                 setIsLoading(false);
                 return;
            }
            email = userDoc.email;
        } catch (e) {
            console.error("Phone number lookup error:", e);
            toast({ title: 'Login Error', description: 'Could not verify phone number. Please try again.', variant: 'destructive' });
            setIsLoading(false);
            return;
        }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userProfileData = userDocSnap.data() as UserProfile;
        
        // For faculty, allow login even if Firebase Auth emailVerified is false,
        // as their isEmailVerified is set to true in Firestore by admin.
        if (userProfileData.role === 'faculty') {
          await refreshUserProfile();
          router.push('/faculty/dashboard');
          toast({ title: 'Login Successful', description: 'Welcome to your faculty dashboard!' });
          setIsLoading(false);
          return;
        }
        
        // For other roles (student, admin, super-admin), Firebase Auth emailVerified must be true.
        if (!user.emailVerified) {
            try {
                await sendEmailVerification(user);
                toast({
                    title: 'Email Not Verified',
                    description: 'Your email address is not yet verified. A new verification link has been sent. Please check your inbox and spam/junk folder to verify.',
                    variant: 'destructive',
                    duration: 8000,
                });
            } catch (verificationError: any) {
                console.error('Error resending verification email:', verificationError);
                let verificationErrorMessage = 'Please verify your email to log in. Could not resend verification email at this time. Check your spam/junk folder for the original link.';
                if (verificationError.code === 'auth/too-many-requests') {
                    verificationErrorMessage = 'Too many verification email requests have been sent to this address recently. Please check your existing emails (including spam/junk) or try again later.';
                }
                toast({
                    title: 'Email Not Verified',
                    description: verificationErrorMessage,
                    variant: 'destructive',
                    duration: 8000,
                });
            }
            setIsLoading(false);
            return; 
        }
        
        // If email is verified by Firebase Auth (and not faculty), proceed.
        await refreshUserProfile(); 
        if (userProfileData.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (userProfileData.role === 'student') {
          router.push('/student/labs');
        } else if (userProfileData.role === 'super-admin'){
            router.push('/main-admin/dashboard');
        }
         else {
          router.push('/'); 
        }
        toast({ title: 'Login Successful', description: 'Welcome back!' });

      } else {
        // Email might be verified by Firebase Auth, but no Firestore profile exists.
        // This could happen if registration was interrupted OR if it's an admin logging in for the first time
        // after super-admin approval but before magic link has fully processed.
        // The magic link flow handles new admin profile creation.
        // If a user reaches here with a verified email but no profile, it's an anomaly.
        if(user.emailVerified){
             toast({
                title: 'Profile Incomplete',
                description: 'Your account exists but your profile is not fully set up. If you are a new college admin, please use the link sent to your email after approval. Otherwise, contact support.',
                variant: 'destructive',
                duration: 8000,
            });
        } else {
            // This path should ideally not be hit if the above email verification check for non-faculty is working.
             toast({
                title: 'Login Error',
                description: 'User profile not found. Please complete registration or verify your email. Check spam/junk for verification email.',
                variant: 'destructive',
            });
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
      }
      toast({
        title: 'Login Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    const username = form.getValues('username');
    if (!username) {
        toast({ title: 'Email required', description: 'Please enter your email address to reset your password.', variant: 'destructive' });
        return;
    }

    const isEmail = z.string().email().safeParse(username).success;
    if (!isEmail) {
        toast({ title: 'Email required', description: 'Password reset is only available via email. Please enter your email address.', variant: 'destructive' });
        return;
    }

    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, username);
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${username}, a password reset link has been sent. Please check your inbox and spam folder.`,
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      let description = 'Failed to send password reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
         description = `If an account exists for ${username}, a password reset link has been sent. Please check your inbox and spam folder.`;
         toast({
            title: 'Password Reset Email Sent', // Still show success-like message for user-not-found to prevent enumeration
            description: description,
        });
      } else {
         toast({
            title: 'Error',
            description: description,
            variant: 'destructive',
        });
      }
    } finally {
      setIsSendingResetEmail(false);
    }
  }
  
  if (isMagicLinkFlow || isLoading && isMagicLinkFlow) { 
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Logging In...</CardTitle>
          <CardDescription>
            Please wait while we securely log you in. This might take a moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Welcome Back!</CardTitle>
        <CardDescription>
          Login to your Campus Codex account to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com or 1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Password</FormLabel>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 h-auto text-sm text-primary hover:underline"
                      onClick={handleForgotPassword}
                      disabled={isLoading || isSendingResetEmail}
                    >
                       {isSendingResetEmail ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       ) : null}
                      Forgot Password?
                    </Button>
                  </div>
                  <FormControl>
                   <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="********" {...field} />
                       <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword((prev) => !prev)}
                        disabled={isLoading}
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
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || isSendingResetEmail}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Button variant="link" asChild className="px-0.5">
            <Link href="/register/student">Register as Student</Link>
          </Button>
           {' or '}
          <Button variant="link" asChild className="px-0.5">
            <Link href="/register/admin">Register College</Link>
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
