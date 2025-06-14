
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
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-headline flex items-center">
          <ExternalLink className="w-8 h-8 mr-3 text-primary" />
          Manage College Resources
        </h1>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Add New Resource</CardTitle>
          <CardDescription>Share helpful external links with your students.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Awesome Resume Builder" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A brief description of the resource..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="url" render={({ field }) => (
                <FormItem><FormLabel>URL</FormLabel><FormControl><Input type="url" placeholder="https://example.com/resource" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Resume, Coding, Internships, Free Courses" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Add Resource
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Existing Resources</CardTitle>
          <CardDescription>List of resources currently available to students of {userProfile.collegeName}.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingResources ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Loading resources...</span></div>
          ) : resources.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No resources added yet.</p>
          ) : (
            <div className="space-y-4">
              {resources.map((resource) => (
                <Card key={resource.id} className="bg-card border">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                        <CardTitle className="text-lg">{resource.title}</CardTitle>
                        <div className="flex items-center gap-2">
                             <Badge variant="secondary" className="text-xs"><Tag className="w-3 h-3 mr-1"/>{resource.category}</Badge>
                            <AlertDialog onOpenChange={(open) => !open && setResourceToDelete(null)}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setResourceToDelete(resource)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                {resourceToDelete?.id === resource.id && (
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete "{resourceToDelete.title}"?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setResourceToDelete(null)}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteResource} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                )}
                            </AlertDialog>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{resource.description}</p>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block truncate">{resource.url}</a>
                     <p className="text-xs text-muted-foreground mt-1">Added {formatDistanceToNowStrict((resource.createdAt as any).toDate(), { addSuffix: true })}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
