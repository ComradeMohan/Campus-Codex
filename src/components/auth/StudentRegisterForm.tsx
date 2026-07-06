
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDocs, collection } from 'firebase/firestore';
import type { UserProfile, College } from '@/types';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Loader2, Eye, EyeOff, Terminal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';


const studentRegisterSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  registrationNumber: z.string().min(5, { message: 'Registration number must be at least 5 characters.' }),
  phoneNumber: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }).optional().or(z.literal('')),
  collegeId: z.string({ required_error: "Please select your college."}),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

export function StudentRegisterForm() {
  const { toast } = useToast();
  const { colleges } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof studentRegisterSchema>>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: {
      fullName: '',
      email: '',
      registrationNumber: '',
      phoneNumber: '',
      collegeId: undefined,
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof studentRegisterSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (user) {
        await updateProfile(user, { displayName: values.fullName });

        const selectedCollege = colleges.find(c => c.id === values.collegeId);

        const userProfileData: UserProfile = {
          uid: user.uid,
          email: user.email,
          fullName: values.fullName,
          role: 'student',
          registrationNumber: values.registrationNumber,
          collegeId: values.collegeId,
          collegeName: selectedCollege?.name || undefined, // Save college name
          phoneNumber: values.phoneNumber,
          isEmailVerified: user.emailVerified, // Initially set from Firebase Auth user
        };
        await setDoc(doc(db, 'users', user.uid), {
          ...userProfileData,
          createdAt: serverTimestamp(),
        });
        
        await sendEmailVerification(user);

        toast({
          title: 'Registration Successful!',
          description: 'A verification email has been sent to your email address. Please check your inbox and spam/junk folder to verify your account before logging in.',
          duration: 7000, 
        });
        setIsVerificationSent(true);
        form.reset();
      }
    } catch (error: any) {
      console.error('Student registration error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use. Please try logging in or use a different email.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled. Contact support.';
      }
      toast({
        title: 'Registration Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isVerificationSent) {
    return (
      <Card className="w-full max-w-md border border-border/40 bg-card/70 backdrop-blur-md shadow-2xl rounded-2xl p-2 relative overflow-hidden animate-in fade-in duration-500">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-accent"></div>
        <CardHeader className="text-center pt-8">
          <div className="mx-auto p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4">
            <Terminal className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-extrabold font-headline">Verify Your Email</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed font-sans">
            Registration successful! A verification link has been sent to your email address. Please click the link to verify your account before logging in.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 text-center space-y-4">
           <p className="text-xs text-muted-foreground">If you don&apos;t see the email, please check your spam/junk folder.</p>
           <Button variant="outline" asChild className="w-full rounded-xl py-6 font-bold border-primary/20 text-primary hover:bg-primary/5">
             <Link href="/login">Proceed to Login</Link>
           </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md lg:max-w-5xl lg:w-full border border-border/40 bg-card/70 backdrop-blur-md shadow-2xl rounded-2xl lg:rounded-3xl relative overflow-hidden lg:grid lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

          <div className="space-y-4 pt-8">
            <h3 className="text-3xl font-extrabold font-headline leading-tight">Start Your Coding Journey</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              Create your account to access state-of-the-art interactive code labs, direct AI feedback, and assignments.
            </p>
          </div>

          <ul className="space-y-4 pt-4">
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="p-1 rounded-full bg-white/15 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span>Interactive coding in your browser</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="p-1 rounded-full bg-white/15 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span>24/7 AI-powered coding helper</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="p-1 rounded-full bg-white/15 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span>Automated test grading & analytics</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="p-1 rounded-full bg-white/15 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span>AI flashcards & sandbox practice</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/10 text-xs text-white/70">
          <p className="font-mono">Join thousands of students mastering programming today.</p>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
        <div className="mb-6 lg:mb-8">
          <Link href="/" className="lg:hidden p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center">
            <Terminal className="h-6 w-6" />
          </Link>
          <h2 className="text-2xl font-extrabold font-headline tracking-tight text-foreground">Student Registration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Join Campus Codex by creating your student account.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 px-4 text-sm transition-all" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">College Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="student@college.edu" className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 px-4 text-sm transition-all" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registration Number</FormLabel>
                    <FormControl>
                      <Input placeholder="U123456" className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 px-4 text-sm transition-all" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="123-456-7890" className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 px-4 text-sm transition-all" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="collegeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select College</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl bg-background/50 border-border/50 focus:ring-primary focus:border-primary/50 py-5 px-4 text-sm transition-all text-left">
                        <SelectValue placeholder="Select your college" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colleges.length > 0 ? (
                        colleges.map((college) => (
                          <SelectItem key={college.id} value={college.id}>
                            {college.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>Loading colleges...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 pl-4 pr-12 text-sm transition-all" {...field} />
                       <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3.5 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword((prev) => !prev)}
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
            <Button type="submit" className="w-full bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 hover:shadow-primary/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 rounded-xl py-6 text-sm font-bold flex items-center justify-center mt-2" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground pt-4 border-t border-border/40">
          <p>
            Already have an account?{' '}
            <Button variant="link" asChild className="px-0.5 text-xs text-primary hover:text-primary/80 transition-colors h-auto p-0 font-semibold">
              <Link href="/login">Login here</Link>
            </Button>
          </p>
          <p>
            Registering your college?{' '}
            <Button variant="link" asChild className="px-0.5 text-xs text-primary hover:text-primary/80 transition-colors h-auto p-0 font-semibold">
              <Link href="/register/admin">Click here</Link>
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}

