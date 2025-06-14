
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, LayoutDashboard, AlertTriangle, Tag } from 'lucide-react';
import type { CollegeResource } from '@/types';
import { formatDistanceToNowStrict } from 'date-fns';

export default function StudentDashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [collegeResources, setCollegeResources] = useState<CollegeResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(true);

  const fetchCollegeResources = useCallback(async () => {
    if (userProfile?.collegeId) {
      setIsLoadingResources(true);
      try {
        const resourcesRef = collection(db, 'colleges', userProfile.collegeId, 'resources');
        const q = query(resourcesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedResources = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CollegeResource));
        setCollegeResources(fetchedResources);
      } catch (error) {
        console.error("Error fetching college resources:", error);
        toast({ title: "Error", description: "Failed to load college resources.", variant: "destructive" });
      } finally {
        setIsLoadingResources(false);
      }
    } else if (!authLoading) {
        setIsLoadingResources(false);
         if (userProfile && !userProfile.collegeId) {
             toast({ title: "Information Missing", description: "Your profile is not associated with a college. Resources cannot be loaded.", variant: "destructive" });
        }
    }
  }, [userProfile, authLoading, toast]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchCollegeResources();
    } else if (!authLoading && !userProfile) {
       setIsLoadingResources(false);
    }
  }, [authLoading, userProfile, fetchCollegeResources]);

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Dashboard...</span>
      </div>
    );
  }
   if (!userProfile) {
    // This should be handled by ProtectedRoute, but as a safeguard
    return <div className="container mx-auto py-8 text-center"><p>Please log in to view your dashboard.</p></div>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <LayoutDashboard className="w-8 h-8 mr-3 text-primary" />
            Student Dashboard
          </CardTitle>
          <CardDescription>Welcome, {userProfile.fullName}! Here are some resources from {userProfile.collegeName || "your college"}.</CardDescription>
        </CardHeader>
      </Card>

      <section>
        <h2 className="text-2xl font-semibold mb-4 font-headline flex items-center">
          <ExternalLink className="w-7 h-7 mr-2 text-accent" />
          College Resources
        </h2>
        {isLoadingResources ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-md">
                    <CardHeader><div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div></CardHeader>
                    <CardContent className="space-y-2">
                        <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-1/2 animate-pulse mt-1"></div>
                    </CardContent>
                    <CardFooter><div className="h-9 bg-muted rounded w-1/3 animate-pulse"></div></CardFooter>
                </Card>
            ))}
          </div>
        ) : collegeResources.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No external resources have been added by your college admin yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collegeResources.map((resource) => (
              <Card key={resource.id} className="shadow-md hover:shadow-xl transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-semibold line-clamp-2">{resource.title}</CardTitle>
                    <Badge variant="outline" className="text-xs shrink-0 mt-1">{resource.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-3">{resource.description}</p>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 pt-3 border-t">
                   <Button asChild variant="secondary" size="sm" className="w-full">
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> Visit Resource
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground self-end">
                    Added {formatDistanceToNowStrict((resource.createdAt as Timestamp).toDate(), { addSuffix: true })}
                  </p>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
      {/* Future sections can be added here, e.g., My Courses Overview, Recent Activity, etc. */}
    </div>
  );
}
