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
import { sendSignInLinkToEmail, type Auth } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, Terminal } from 'lucide-react';

const adminRegisterSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' })
    .refine(email => /\.(edu|ac\.in)$/i.test(email) || /@.+\..+/.test(email), { // Basic check for official domains, can be more robust
      message: 'Please use an official college email (.edu, .ac.in, or recognized domain).',
    }),
  phoneNumber: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }).optional().or(z.literal('')),
  collegeName: z.string().min(3, { message: 'College name must be at least 3 characters.' }),
});

export function AdminRegisterForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLinkSent, setIsLinkSent] = useState(false);

  const form = useForm<z.infer<typeof adminRegisterSchema>>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      collegeName: '',
    },
  });

  async function onSubmit(values: z.infer<typeof adminRegisterSchema>) {
    setIsLoading(true);
    try {
      // Check if college already exists
      const collegesRef = collection(db, 'colleges');
      const q = query(collegesRef, where("name", "==", values.collegeName));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
         toast({
          title: 'Registration Error',
          description: 'A college with this name is already registered. Please contact support if this is an error.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const actionCodeSettings = {
        url: `${window.location.origin}/login?email=${encodeURIComponent(values.email)}&role=admin&fullName=${encodeURIComponent(values.fullName)}&collegeName=${encodeURIComponent(values.collegeName)}&phoneNumber=${encodeURIComponent(values.phoneNumber || '')}`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth as Auth, values.email, actionCodeSettings);
      
      // Store email locally so a user can complete signin on the same device
      window.localStorage.setItem('emailForSignIn', values.email);
      
      toast({
        title: 'Magic Link Sent!',
        description: `A verification link has been sent to ${values.email}. Please check your inbox to complete registration.`,
      });
      setIsLinkSent(true);
      form.reset();
    } catch (error: any) {
      console.error('Admin registration error:', error);
      let description = 'An unexpected error occurred. Please try again.';
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'auth/operation-not-allowed') {
          description = 'Email link sign-in (passwordless) is not enabled for this Firebase project. Please enable it in your Firebase console (Authentication > Sign-in method > Email/Password provider).';
        } else if (error.code === 'auth/api-key-not-valid') {
          description = 'The Firebase API key is not valid. Please check your Firebase project configuration in your .env file.';
        } else {
          description = error.message || description;
        }
      } else if (error instanceof Error) {
        description = error.message;
      }
      
      toast({
        title: 'Registration Error',
        description: description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isLinkSent) {
    return (
      <Card className="w-full max-w-md border border-border/40 bg-card/70 backdrop-blur-md shadow-2xl rounded-2xl p-2 relative overflow-hidden animate-in fade-in duration-500">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-accent"></div>
        <CardHeader className="text-center pt-8">
          <div className="mx-auto p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4">
            <Terminal className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-extrabold font-headline">Check Your Email!</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed font-sans">
            A verification link has been sent to your email address. Click the link in the email to complete your registration and log in.
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

          <div className="space-y-4 pt-12">
            <h3 className="text-3xl font-extrabold font-headline leading-tight">Empower Your Campus</h3>
            <p className="text-sm text-white/80 leading-relaxed font-sans">
              Register your college to create coding curriculums, invite faculty, and deploy isolated code sandboxes.
            </p>
          </div>

          <ul className="space-y-4 pt-4">
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="p-1 rounded-full bg-white/15 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span>Create custom subjects & coding labs</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="p-1 rounded-full bg-white/15 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span>Track college-wide analytics & stats</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="p-1 rounded-full bg-white/15 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span>Manage student & faculty registries</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/10 text-xs text-white/70">
          <p className="font-mono">Empowering modern programming classrooms.</p>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
        <div className="mb-6 lg:mb-8 text-center lg:text-left">
          <Link href="/" className="lg:hidden mx-auto lg:mx-0 p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center">
            <Terminal className="h-6 w-6" />
          </Link>
          <h2 className="text-2xl font-extrabold font-headline tracking-tight text-foreground">Register College</h2>
          <p className="text-sm text-muted-foreground mt-1.5 font-sans">
            Provide details to register your college workspace.
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
                      <Input id="fullName" name="fullName" autoComplete="name" placeholder="Dr. Jane Doe" className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 px-4 text-sm transition-all" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="collegeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">College Name</FormLabel>
                    <FormControl>
                      <Input id="collegeName" name="collegeName" autoComplete="organization" placeholder="Tech University" className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 px-4 text-sm transition-all" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Official College Email</FormLabel>
                  <FormControl>
                    <Input id="email" name="email" autoComplete="email" type="email" placeholder="admin@college.edu" className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 px-4 text-sm transition-all" {...field} />
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
                    <Input id="phoneNumber" name="phoneNumber" autoComplete="tel" type="tel" placeholder="123-456-7890" className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 px-4 text-sm transition-all" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 hover:shadow-primary/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 rounded-xl py-6 text-sm font-bold flex items-center justify-center" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Workspace
            </Button>
          </form>
        </Form>
        
        <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed pt-4 border-t border-border/40">
          Already have an account?{' '}
          <Button variant="link" asChild className="px-0.5 text-xs text-primary hover:text-primary/80 transition-colors h-auto p-0 font-semibold">
            <Link href="/login">Login here</Link>
          </Button>
          {' or '}
          <Button variant="link" asChild className="px-0.5 text-xs text-primary hover:text-primary/80 transition-colors h-auto p-0 font-semibold">
            <Link href="/register/student">Register as Student</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}