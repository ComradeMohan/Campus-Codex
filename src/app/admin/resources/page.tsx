
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, ExternalLink, Trash2, ArrowLeft, AlertTriangle, Tag } from 'lucide-react';
import type { CollegeResource } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict } from 'date-fns';

const resourceFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100, { message: "Title cannot exceed 100 characters."}),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }).max(500, { message: "Description cannot exceed 500 characters."}),
  url: z.string().url({ message: "Please enter a valid URL (e.g., https://example.com)" }),
  category: z.string().min(2, {message: "Category must be at least 2 characters."}).max(50, {message: "Category cannot exceed 50 characters."}),
});

type ResourceFormData = z.infer<typeof resourceFormSchema>;

export default function ManageCollegeResourcesPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<CollegeResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<CollegeResource | null>(null);

  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      title: '',
      description: '',
      url: '',
      category: '',
    },
  });

  const fetchResources = useCallback(async () => {
    if (userProfile?.collegeId) {
      setIsLoadingResources(true);
      try {
        const resourcesRef = collection(db, 'colleges', userProfile.collegeId, 'resources');
        const q = query(resourcesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedResources = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CollegeResource));
        setResources(fetchedResources);
      } catch (error) {
        console.error("Error fetching resources:", error);
        toast({ title: "Error", description: "Failed to load existing resources.", variant: "destructive" });
      } finally {
        setIsLoadingResources(false);
      }
    }
  }, [userProfile?.collegeId, toast]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchResources();
    } else if (!authLoading && !userProfile) {
        setIsLoadingResources(false); // Stop loading if no user
    }
  }, [authLoading, userProfile, fetchResources]);

  const onSubmit = async (data: ResourceFormData) => {
    if (!userProfile?.collegeId || !userProfile.uid) {
      toast({ title: "Error", description: "Cannot add resource. Missing admin context.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const resourceData: Omit<CollegeResource, 'id' | 'createdAt'> = {
        ...data,
        collegeId: userProfile.collegeId,
        addedBy: userProfile.uid,
      };
      const resourcesCollectionRef = collection(db, 'colleges', userProfile.collegeId, 'resources');
      await addDoc(resourcesCollectionRef, {
        ...resourceData,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Resource Added!", description: `"${data.title}" has been added.` });
      form.reset();
      fetchResources(); // Refresh the list
    } catch (error) {
      console.error("Error adding resource:", error);
      toast({ title: "Error", description: "Failed to add resource. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResource = async () => {
    if (!resourceToDelete || !userProfile?.collegeId) {
      toast({ title: "Error", description: "Cannot delete resource. Missing information.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true); // Use the same loading state for delete action
    try {
      const resourceDocRef = doc(db, 'colleges', userProfile.collegeId, 'resources', resourceToDelete.id);
      await deleteDoc(resourceDocRef);
      toast({ title: "Resource Deleted", description: `"${resourceToDelete.title}" has been successfully deleted.` });
      setResources(prev => prev.filter(r => r.id !== resourceToDelete.id));
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast({ title: "Error", description: "Failed to delete resource.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setResourceToDelete(null);
    }
  };
  
  if (authLoading) {
    return <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><span className="ml-4 text-lg">Loading...</span></div>;
  }
  if (!userProfile) {
    // This should be handled by AdminLayout's ProtectedRoute, but as a safeguard
    return <div className="container mx-auto py-8 text-center"><p>Please log in as an admin.</p></div>;
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/30">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-headline text-foreground flex items-center gap-2">
            <ExternalLink className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Manage College Resources
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">Share links, coding guides, and internship resources with students.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold w-fit">
          <Link href="/admin/dashboard" className="flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Main split grid layout for laptop viewports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Add New Resource Form */}
        <Card className="lg:col-span-5 shadow-md border-border/40">
          <CardHeader className="py-4 px-5 border-b border-border/30 bg-muted/10">
            <CardTitle className="text-sm md:text-base font-bold font-headline">Add New Resource</CardTitle>
            <CardDescription className="text-[10px] md:text-xs">Publish useful external reference bookmarks.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Awesome Resume Builder" className="rounded-xl" {...field} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</FormLabel>
                    <FormControl><Textarea placeholder="A brief description of the resource..." className="rounded-xl resize-none" {...field} rows={3} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="url" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL Link</FormLabel>
                    <FormControl><Input type="url" placeholder="https://example.com/resource" className="rounded-xl" {...field} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category Tag</FormLabel>
                    <FormControl><Input placeholder="e.g., Resume, Coding, Internships" className="rounded-xl" {...field} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}/>
                <Button type="submit" className="w-full text-xs font-bold rounded-xl h-10 mt-2" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Add Resource
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Right Column: Existing Resources List */}
        <Card className="lg:col-span-7 shadow-md border-border/40">
          <CardHeader className="py-4 px-5 border-b border-border/30 bg-muted/10">
            <CardTitle className="text-sm md:text-base font-bold font-headline">Existing Resources</CardTitle>
            <CardDescription className="text-[10px] md:text-xs">List of resources currently available to students of {userProfile.collegeName}.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {isLoadingResources ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2 select-none">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-mono text-muted-foreground">Loading resources...</span>
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-muted-foreground font-sans">No resources published yet. Fill the form to create one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {resources.map((resource) => (
                  <Card key={resource.id} className="group bg-card/30 border border-border/45 hover:border-primary/20 transition-all duration-300 flex flex-col justify-between p-4 rounded-2xl shadow-sm relative min-h-[140px]">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-wider font-mono">
                          {resource.category}
                        </Badge>
                        
                        <AlertDialog onOpenChange={(open) => !open && setResourceToDelete(null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-lg hover:bg-destructive/10" onClick={() => setResourceToDelete(resource)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          {resourceToDelete?.id === resource.id && (
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete "{resourceToDelete.title}"? This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setResourceToDelete(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteResource} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          )}
                        </AlertDialog>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">{resource.title}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{resource.description}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/30 mt-3 flex items-center justify-between gap-2 min-w-0">
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[10px] text-primary hover:underline font-mono truncate max-w-[120px] flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" /> visit
                      </a>
                      <span className="text-[9px] text-muted-foreground font-mono truncate shrink">
                        {resource.createdAt ? formatDistanceToNowStrict((resource.createdAt as any).toDate(), { addSuffix: true }) : 'just now'}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
