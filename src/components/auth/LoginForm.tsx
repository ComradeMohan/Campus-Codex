
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
import { signInWithEmailAndPassword, isSignInWithEmailLink, signInWithEmailLink, sendPasswordResetEmail, type Auth } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth }  from '@/contexts/AuthContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
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
      email: '',
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
            const role = searchParams.get('role');
            const fullName = searchParams.get('fullName');
            const collegeName = searchParams.get('collegeName');
            const phoneNumber = searchParams.get('phoneNumber');

            if (role === 'admin' && fullName && collegeName) {
              const collegeRef = await addDoc(collection(db, 'colleges'), {
                name: collegeName,
                adminEmail: user.email,
                adminUid: user.uid,
                createdAt: serverTimestamp(),
              });

              const adminProfile: UserProfile = {
                uid: user.uid,
                email: user.email,
                fullName: fullName,
                role: 'admin',
                collegeName: collegeName,
                collegeId: collegeRef.id,
                phoneNumber: phoneNumber || undefined,
                isEmailVerified: true, 
              };
              await setDoc(userDocRef, {
                ...adminProfile,
                createdAt: serverTimestamp(),
              });
              await refreshUserProfile();
              router.push('/admin/dashboard');
            } else {
               throw new Error("Missing admin details for magic link sign in.");
            }
          } else {
             const userProfile = userDocSnap.data() as UserProfile;
             await refreshUserProfile();
             if (userProfile.role === 'admin') router.push('/admin/dashboard');
             else if (userProfile.role === 'student') router.push('/student/labs');
             else if (userProfile.role === 'faculty') router.push('/faculty/dashboard');
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
        form.setValue('email', emailFromQuery);
      }
    }
  }, [router, toast, searchParams, form, refreshUserProfile]);


  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        toast({
          title: 'Email Not Verified',
          description: 'Please verify your email address before logging in. Check your inbox for the verification link.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userProfile = userDocSnap.data() as UserProfile;
        await refreshUserProfile(); 
        if (userProfile.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (userProfile.role === 'student') {
          router.push('/student/labs');
        } else if (userProfile.role === 'faculty') {
          router.push('/faculty/dashboard');
        }
         else {
          router.push('/'); 
        }
        toast({ title: 'Login Successful', description: 'Welcome back!' });
      } else {
        throw new Error('User profile not found.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message === 'User profile not found.') {
        errorMessage = 'User profile not found. Please register first or contact support.';
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
    const email = form.getValues('email');
    const emailValidation = z.string().email({ message: "Please enter a valid email address to reset your password." }).safeParse(email);

    if (!emailValidation.success) {
      toast({
        title: 'Invalid Email',
        description: emailValidation.error.errors[0]?.message || "Please enter a valid email address.",
        variant: 'destructive',
      });
      return;
    }

    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, emailValidation.data);
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${emailValidation.data}, a password reset link has been sent. Please check your inbox.`,
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      let description = 'Failed to send password reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        // To prevent user enumeration, we can show a generic message for user-not-found too.
        // However, for better UX during development or specific app needs, you might show different messages.
        // For this implementation, we'll keep the success message generic to avoid confirming email existence.
         description = `If an account exists for ${emailValidation.data}, a password reset link has been sent. Please check your inbox.`;
         toast({
            title: 'Password Reset Email Sent',
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
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

