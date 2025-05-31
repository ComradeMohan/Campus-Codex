
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, where, Timestamp, doc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, BookOpen, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { ProgrammingLanguage } from '@/types';
import * as LucideIcons from 'lucide-react'; // Import all icons

const languageFormSchema = z.object({
  name: z.string().min(1, { message: 'Language name is required.' }).max(50, { message: 'Name must be 50 characters or less.' }),
  description: z.string().max(200, { message: 'Description must be 200 characters or less.' }).optional(),
  iconName: z.string().optional().refine(value => {
    if (!value) return true; // Optional field
    return Object.keys(LucideIcons).includes(value as keyof typeof LucideIcons);
  }, { message: 'Invalid Lucide icon name.' }),
});

type LanguageFormData = z.infer<typeof languageFormSchema>;

// Helper to get Lucide icon component by name
const getIconComponent = (iconName?: string): React.FC<React.SVGProps<SVGSVGElement>> => {
  if (iconName && LucideIcons[iconName as keyof typeof LucideIcons]) {
    return LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;
  }
  return BookOpen; // Default icon
};


export default function CourseManagementPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [languages, setLanguages] = useState<ProgrammingLanguage[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LanguageFormData>({
    resolver: zodResolver(languageFormSchema),
    defaultValues: {
      name: '',
      description: '',
      iconName: '',
    },
  });

  const fetchLanguages = useCallback(async (collegeId: string) => {
    setIsLoadingLanguages(true);
    try {
      const languagesRef = collection(db, 'colleges', collegeId, 'languages');
      const q = query(languagesRef, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedLanguages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt as Timestamp, // Cast to Timestamp
      })) as ProgrammingLanguage[];
      setLanguages(fetchedLanguages);
    } catch (error) {
      console.error('Error fetching languages:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch programming languages.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLanguages(false);
    }
  }, [toast]);

  useEffect(() => {
    if (userProfile?.collegeId) {
      fetchLanguages(userProfile.collegeId);
    } else if (userProfile === null) { // Explicitly check for null after initial loading
      setIsLoadingLanguages(false); // Stop loading if no user/collegeId
    }
  }, [userProfile, fetchLanguages]);

  const onSubmit = async (data: LanguageFormData) => {
    if (!userProfile?.collegeId) {
      toast({
        title: 'Error',
        description: 'College information not found. Cannot add language.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      // Check for duplicate language name
      const languagesRef = collection(db, 'colleges', userProfile.collegeId, 'languages');
      const duplicateQuery = query(languagesRef, where('name', '==', data.name));
      const duplicateSnapshot = await getDocs(duplicateQuery);
      if (!duplicateSnapshot.empty) {
        toast({
          title: 'Duplicate Language',
          description: `A language with the name "${data.name}" already exists.`,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const newLanguage: Omit<ProgrammingLanguage, 'id' | 'createdAt'> & { createdAt: any } = {
        name: data.name,
        description: data.description || '',
        iconName: data.iconName || '',
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(languagesRef, newLanguage);
      
      // Optimistically add to UI or refetch
      setLanguages(prev => [...prev, { ...newLanguage, id: docRef.id, createdAt: Timestamp.now() } as ProgrammingLanguage].sort((a, b) => a.name.localeCompare(b.name)));

      toast({
        title: 'Language Added',
        description: `${data.name} has been successfully added.`,
      });
      form.reset();
    } catch (error) {
      console.error('Error adding language:', error);
      toast({
        title: 'Error',
        description: 'Failed to add programming language.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userProfile && !isLoadingLanguages) {
     return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You must be logged in as an admin to manage courses.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }
  
  if (!userProfile?.collegeId && !isLoadingLanguages) {
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
    )
  }


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Course & Language Management</h1>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <PlusCircle className="w-6 h-6 mr-2 text-primary" />
            Add New Programming Language
          </CardTitle>
          <CardDescription>
            Expand the curriculum by adding new languages available to students of {userProfile?.collegeName || 'your college'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Python, JavaScript" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A brief description of the language or course content." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iconName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lucide Icon Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Code, Terminal, FileJson (case sensitive)" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground pt-1">
                      Enter a valid icon name from <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">lucide.dev/icons</a>. If left blank or invalid, a default icon will be used.
                    </p>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting || !userProfile?.collegeId} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                Add Language
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-primary" />
            Available Languages
          </CardTitle>
          <CardDescription>
            List of programming languages currently configured for {userProfile?.collegeName || 'your college'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLanguages ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                     <Loader2 className="h-5 w-5 animate-spin text-primary" />
                     <div className="h-5 bg-muted rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-muted rounded w-3/4" />
                </Card>
              ))}
            </div>
          ) : languages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No programming languages have been added yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {languages.map((lang) => {
                const IconComponent = getIconComponent(lang.iconName);
                return (
                  <Card key={lang.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                      <IconComponent className="w-7 h-7 text-primary" />
                      <CardTitle className="text-lg font-semibold">{lang.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground min-h-[40px] line-clamp-2">
                        {lang.description || 'No description available.'}
                      </p>
                      {/* Add Edit/Delete buttons in future here */}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
