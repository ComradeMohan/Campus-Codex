
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
import { Loader2, Eye, EyeOff, Terminal } from 'lucide-react';

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
        await refreshUserProfile();
        
        toast({ title: 'Login Successful!', description: 'Redirecting to your dashboard...' });

        if (userProfileData.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (userProfileData.role === 'student') {
          router.push('/student/dashboard');
        } else if (userProfileData.role === 'faculty') {
          router.push('/faculty/dashboard');
        } else if (userProfileData.role === 'super-admin') {
          router.push('/main-admin/dashboard');
        } else {
          router.push('/');
        }
        // No need to set isLoading to false here, the redirect will unmount the component
      } else {
        toast({
          title: 'Profile Incomplete',
          description: 'Your account exists but your profile is not fully set up. Please contact support.',
          variant: 'destructive',
          duration: 8000,
        });
        setIsLoading(false);
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
      <Card className="w-full max-w-md border border-border/40 bg-card/60 backdrop-blur-md shadow-2xl rounded-2xl p-2 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-accent"></div>
        <CardHeader className="text-center pt-8">
          <div className="mx-auto p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4 animate-pulse">
            <Terminal className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-extrabold font-headline">Logging In...</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1.5 font-sans">
            Please wait while we securely log you in. This might take a moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="w-full max-w-md lg:max-w-4xl lg:w-full border border-border/40 bg-card/70 backdrop-blur-md shadow-2xl rounded-2xl lg:rounded-3xl relative overflow-hidden lg:grid lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Decorative top line */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-accent z-20"></div>

      {/* Left Column: Visual Panel (Visible only on lg screens) */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-primary via-indigo-600 to-accent text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Visual elements */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="absolute top-[-20%] left-[-20%] h-[300px] w-[300px] rounded-full bg-white/10 blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 space-y-8">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="p-2 rounded-xl bg-white/15 text-white group-hover:bg-white/25 transition-all duration-300">
              <Terminal className="h-6 w-6" />
            </div>
            <span className="font-extrabold text-xl font-headline tracking-tight text-white">Campus Codex</span>
          </Link>

          <div className="space-y-4 pt-12">
            <h3 className="text-3xl font-extrabold font-headline leading-tight">Welcome Back!</h3>
            <p className="text-sm text-white/80 leading-relaxed font-sans">
              Log in to access your dashboard, resume your interactive coding sessions, and review your progress.
            </p>
          </div>

          <ul className="space-y-4 pt-4">
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="p-1 rounded-full bg-white/15 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span>Access your personalized dashboard</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="p-1 rounded-full bg-white/15 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span>Write and execute code in sandboxes</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="p-1 rounded-full bg-white/15 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span>Master concepts with AI flashcards</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/10 text-xs text-white/70">
          <p className="font-mono">Empowering modern programming classrooms.</p>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
        <div className="mb-6 lg:mb-8 text-center lg:text-left">
          <Link href="/" className="lg:hidden mx-auto lg:mx-0 p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center">
            <Terminal className="h-6 w-6" />
          </Link>
          <h2 className="text-2xl font-extrabold font-headline tracking-tight text-foreground">Welcome Back!</h2>
          <p className="text-sm text-muted-foreground mt-1.5 font-sans">
            Login to your Campus Codex account to continue.
          </p>
        </div>

        <Form {...form}>
          <div 
            className="space-y-6"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                form.handleSubmit(onSubmit)();
              }
            }}
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email or Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      id="username"
                      name="username"
                      autoComplete="username"
                      placeholder="user@example.com or 1234567890" 
                      className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 px-4 text-sm transition-all" 
                      {...field} 
                    />
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
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</FormLabel>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 h-auto text-xs text-primary hover:text-primary/80 transition-colors h-auto p-0 font-semibold"
                      onClick={handleForgotPassword}
                      disabled={isLoading || isSendingResetEmail}
                    >
                       {isSendingResetEmail ? (
                         <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                       ) : null}
                      Forgot Password?
                    </Button>
                  </div>
                  <FormControl>
                   <div className="relative">
                      <Input 
                        id="password"
                        name="password"
                        autoComplete="current-password"
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 pl-4 pr-12 text-sm transition-all" 
                        {...field} 
                      />
                       <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3.5 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword((prev) => !prev)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4.5 w-4.5" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" aria-hidden="true" />
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
            <Button type="button" onClick={form.handleSubmit(onSubmit)} className="w-full bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 hover:shadow-primary/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 rounded-xl py-6 text-sm font-bold flex items-center justify-center" disabled={isLoading || isSendingResetEmail}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </div>
        </Form>
        <p className="mt-8 text-center text-xs text-muted-foreground leading-relaxed pt-4 border-t border-border/40">
          Don&apos;t have an account?{' '}
          <Button variant="link" asChild className="px-0.5 text-xs text-primary hover:text-primary/80 transition-colors h-auto p-0 font-semibold">
            <Link href="/register/student">Register as Student</Link>
          </Button>
           {' or '}
          <Button variant="link" asChild className="px-0.5 text-xs text-primary hover:text-primary/80 transition-colors h-auto p-0 font-semibold">
            <Link href="/register/admin">Register College</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
