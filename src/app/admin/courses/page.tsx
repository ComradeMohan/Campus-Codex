
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, where, Timestamp, doc, setDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, BookOpen, AlertTriangle, ArrowLeft, Check, Edit3, Trash2, Palette } from 'lucide-react';
import type { ProgrammingLanguage } from '@/types';
import * as LucideIcons from 'lucide-react';

const PREDEFINED_LANGUAGES: Array<{ name: string; defaultIcon: keyof typeof LucideIcons | ''; descriptionHint?: string }> = [
  { name: 'Python', defaultIcon: 'CodeSquare', descriptionHint: 'General-purpose, high-level programming.' },
  { name: 'JavaScript', defaultIcon: 'Codepen', descriptionHint: 'Web development, scripting, Node.js.' },
  { name: 'Java', defaultIcon: 'Coffee', descriptionHint: 'Enterprise applications, Android development.' },
  { name: 'C++', defaultIcon: 'Braces', descriptionHint: 'Game development, system programming.' },
  { name: 'C#', defaultIcon: 'Binary', descriptionHint: '.NET framework, Windows applications, game dev (Unity).' },
  { name: 'HTML', defaultIcon: 'FileCode2', descriptionHint: 'Structure of web pages.' },
  { name: 'CSS', defaultIcon: 'Paintbrush', descriptionHint: 'Styling of web pages.' },
  { name: 'SQL', defaultIcon: 'Database', descriptionHint: 'Database management and querying.' },
  { name: 'TypeScript', defaultIcon: 'Type', descriptionHint: 'JavaScript with static typing.' },
  { name: 'PHP', defaultIcon: 'FileCode', descriptionHint: 'Server-side web development.' },
  { name: 'Swift', defaultIcon: 'Smartphone', descriptionHint: 'iOS, macOS, watchOS, tvOS app development.' },
  { name: 'Kotlin', defaultIcon: 'Smartphone', descriptionHint: 'Android development, server-side applications.' },
  { name: 'Ruby', defaultIcon: 'Gem', descriptionHint: 'Web development (Ruby on Rails), scripting.' },
  { name: 'Go', defaultIcon: 'Box', descriptionHint: 'Network services, command-line interfaces.' },
  { name: 'R', defaultIcon: 'Sigma', descriptionHint: 'Statistical computing and graphics.' },
  { name: 'Rust', defaultIcon: 'Shield', descriptionHint: 'Systems programming, performance-critical applications.' },
];


const addLanguageDialogSchema = z.object({
  name: z.string(), // This will be pre-filled
  description: z.string().max(200, { message: 'Description must be 200 characters or less.' }).optional(),
  iconName: z.string().optional().refine(value => {
    if (!value) return true;
    return Object.keys(LucideIcons).includes(value as keyof typeof LucideIcons);
  }, { message: 'Invalid Lucide icon name. Check lucide.dev/icons for correct names (case-sensitive).' }),
});

type AddLanguageDialogFormData = z.infer<typeof addLanguageDialogSchema>;

const getIconComponent = (iconName?: string): React.FC<React.SVGProps<SVGSVGElement>> => {
  if (iconName && LucideIcons[iconName as keyof typeof LucideIcons]) {
    return LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;
  }
  return BookOpen; // Default icon
};

export default function CourseManagementPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [collegeLanguages, setCollegeLanguages] = useState<ProgrammingLanguage[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isSubmittingDialog, setIsSubmittingDialog] = useState(false);
  const [selectedPredefinedLang, setSelectedPredefinedLang] = useState<{ name: string; defaultIcon: keyof typeof LucideIcons | ''; descriptionHint?: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const dialogForm = useForm<AddLanguageDialogFormData>({
    resolver: zodResolver(addLanguageDialogSchema),
    defaultValues: { name: '', description: '', iconName: '' },
  });

  const fetchCollegeLanguages = useCallback(async (collegeId: string) => {
    setIsLoadingLanguages(true);
    try {
      const languagesRef = collection(db, 'colleges', collegeId, 'languages');
      const q = query(languagesRef, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedLanguages = querySnapshot.docs.map(doc => ({
        id: doc.id, ...doc.data(), createdAt: doc.data().createdAt as Timestamp,
      })) as ProgrammingLanguage[];
      setCollegeLanguages(fetchedLanguages);
    } catch (error) {
      console.error('Error fetching college languages:', error);
      toast({ title: 'Error', description: 'Failed to fetch your college\'s languages.', variant: 'destructive' });
    } finally {
      setIsLoadingLanguages(false);
    }
  }, [toast]);

  useEffect(() => {
    if (userProfile?.collegeId) {
      fetchCollegeLanguages(userProfile.collegeId);
    } else if (userProfile === null) {
      setIsLoadingLanguages(false);
    }
  }, [userProfile, fetchCollegeLanguages]);

  const handleOpenDialog = (lang: { name: string; defaultIcon: keyof typeof LucideIcons | ''; descriptionHint?: string }) => {
    setSelectedPredefinedLang(lang);
    dialogForm.reset({
      name: lang.name,
      description: lang.descriptionHint || '',
      iconName: lang.defaultIcon || 'BookOpen',
    });
    setIsDialogOpen(true);
  };

  const onDialogSubmit = async (data: AddLanguageDialogFormData) => {
    if (!userProfile?.collegeId || !selectedPredefinedLang) {
      toast({ title: 'Error', description: 'Cannot add language. Missing information.', variant: 'destructive' });
      return;
    }
    setIsSubmittingDialog(true);
    try {
      const languagesRef = collection(db, 'colleges', userProfile.collegeId, 'languages');
      const duplicateQuery = query(languagesRef, where('name', '==', selectedPredefinedLang.name));
      const duplicateSnapshot = await getDocs(duplicateQuery);
      if (!duplicateSnapshot.empty) {
        toast({ title: 'Already Added', description: `${selectedPredefinedLang.name} is already in your college's list.`, variant: 'default' });
        setIsDialogOpen(false);
        setIsSubmittingDialog(false);
        return;
      }

      const newLanguageData: Omit<ProgrammingLanguage, 'id' | 'createdAt'> & { createdAt: any } = {
        name: selectedPredefinedLang.name,
        description: data.description || selectedPredefinedLang.descriptionHint || '',
        iconName: data.iconName || selectedPredefinedLang.defaultIcon || 'BookOpen',
        createdAt: serverTimestamp(),
      };
      // Use language name as document ID for easier querying if desired, or let Firestore generate ID
      // For this example, let Firestore generate ID
      const docRef = await addDoc(languagesRef, newLanguageData);
      
      setCollegeLanguages(prev => [...prev, { ...newLanguageData, id: docRef.id, createdAt: Timestamp.now() } as ProgrammingLanguage].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: 'Language Added', description: `${selectedPredefinedLang.name} added to ${userProfile.collegeName}.` });
      setIsDialogOpen(false);
      dialogForm.reset();
    } catch (error) {
      console.error('Error adding language via dialog:', error);
      toast({ title: 'Error', description: 'Failed to add language.', variant: 'destructive' });
    } finally {
      setIsSubmittingDialog(false);
    }
  };

  const isLanguageAdded = (langName: string) => {
    return collegeLanguages.some(l => l.name === langName);
  };

  if (!userProfile && !isLoadingLanguages) {
    return (
     <div className="container mx-auto py-8 text-center">
       <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
       <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
       <p className="text-muted-foreground mb-4">You must be logged in as an admin to manage courses.</p>
       <Button asChild><Link href="/login">Go to Login</Link></Button>
     </div>);
  }
  
  if (!userProfile?.collegeId && !isLoadingLanguages) {
    return (
      <div className="container mx-auto py-8 text-center">
       <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
       <h1 className="text-2xl font-bold mb-2">College Not Found</h1>
       <p className="text-muted-foreground mb-4">Admin profile is not associated with a college. Please contact support.</p>
        <Button asChild variant="outline">
           <Link href="/admin/dashboard" className="flex items-center gap-2">
             <ArrowLeft className="h-4 w-4" /> Back to Dashboard
           </Link>
         </Button>
     </div>);
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Course & Language Management</h1>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Section to add predefined languages */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <Palette className="w-6 h-6 mr-2 text-primary" />
            Add Languages to {userProfile?.collegeName || 'Your College'}
          </CardTitle>
          <CardDescription>
            Select from common programming languages to add them to your college's curriculum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {PREDEFINED_LANGUAGES.map((lang) => {
              const PredefinedIcon = getIconComponent(lang.defaultIcon || 'BookOpen');
              const added = isLanguageAdded(lang.name);
              return (
                <Card key={lang.name} className={`shadow-md ${added ? 'bg-muted/50' : 'hover:shadow-lg transition-shadow'}`}>
                  <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                    <PredefinedIcon className="w-7 h-7 text-muted-foreground" />
                    <CardTitle className="text-lg font-semibold">{lang.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground min-h-[40px] line-clamp-2 pb-3">
                    {lang.descriptionHint || 'A popular programming language.'}
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleOpenDialog(lang)}
                      disabled={added || !userProfile?.collegeId}
                      className="w-full"
                      variant={added ? "secondary" : "default"}
                    >
                      {added ? (
                        <> <Check className="mr-2 h-4 w-4" /> Added </>
                      ) : (
                        <> <PlusCircle className="mr-2 h-4 w-4" /> Add to College </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog for confirming and customizing language addition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...dialogForm}>
            <form onSubmit={dialogForm.handleSubmit(onDialogSubmit)}>
              <DialogHeader>
                <DialogTitle>Add {selectedPredefinedLang?.name} to Your College</DialogTitle>
                <DialogDescription>
                  Confirm details for {selectedPredefinedLang?.name}. You can customize the description and icon.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <FormField
                  control={dialogForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language Name</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-muted/30 cursor-not-allowed" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={dialogForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief description or course focus." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={dialogForm.control}
                  name="iconName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lucide Icon Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Code, Terminal (case sensitive)" {...field} />
                      </FormControl>
                      <FormMessage />
                       <p className="text-xs text-muted-foreground pt-1">
                        From <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">lucide.dev/icons</a>. Default: <BookOpen className="inline h-3 w-3" />
                       </p>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmittingDialog}>
                  {isSubmittingDialog && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm & Add Language
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


      {/* Section for languages already added to the college */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-primary" />
            Languages in {userProfile?.collegeName || 'Your College'}
          </CardTitle>
          <CardDescription>
            List of programming languages currently configured for your students.
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
          ) : collegeLanguages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No programming languages have been added to your college curriculum yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collegeLanguages.map((lang) => {
                const IconComponent = getIconComponent(lang.iconName);
                return (
                  <Card key={lang.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-x-3 pb-2">
                        <div className="flex items-center space-x-3">
                            <IconComponent className="w-7 h-7 text-primary" />
                            <CardTitle className="text-lg font-semibold">{lang.name}</CardTitle>
                        </div>
                        {/* Future: Edit/Delete buttons
                        <div className="flex space-x-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Edit3 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        */}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground min-h-[40px] line-clamp-2">
                        {lang.description || 'No description available.'}
                      </p>
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

