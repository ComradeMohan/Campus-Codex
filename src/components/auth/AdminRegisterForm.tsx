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
import { Loader2 } from 'lucide-react';

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
      toast({
        title: 'Registration Error',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isLinkSent) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Check Your Email!</CardTitle>
          <CardDescription>
            A magic link has been sent to your email address. Click the link in the email to complete your registration and log in.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-sm text-muted-foreground">If you don&apos;t see the email, please check your spam folder.</p>
           <Button variant="link" asChild className="mt-4 px-0">
             <Link href="/login">Back to Login</Link>
           </Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Register Your College</CardTitle>
        <CardDescription>
          Provide your details to register your college on Campus Codex. A magic link will be sent to your official email for verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Jane Doe" {...field} />
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
                  <FormLabel>Official College Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@college.edu" {...field} />
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
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="123-456-7890" {...field} />
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
                  <FormLabel>College Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Tech University" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Button variant="link" asChild className="px-0.5">
            <Link href="/login">Login here</Link>
          </Button>
        </p>
         <p className="mt-2 text-center text-sm text-muted-foreground">
          Registering as a student?{' '}
          <Button variant="link" asChild className="px-0.5">
            <Link href="/register/student">Click here</Link>
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
