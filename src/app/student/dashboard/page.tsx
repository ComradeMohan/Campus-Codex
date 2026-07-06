
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
import { Loader2, ExternalLink, LayoutDashboard, AlertTriangle, Tag, TerminalSquare, Sparkles, Code2, MessageSquare, User, BookOpen, KeyRound, MessageSquarePlus, Lightbulb } from 'lucide-react';
import type { CollegeResource } from '@/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';
import { FeedbackFormDialog } from '@/components/feedback/FeedbackFormDialog';
import { FeatureRequestFormDialog } from '@/components/feature-request/FeatureRequestFormDialog';

export default function StudentDashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [collegeResources, setCollegeResources] = useState<CollegeResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isFeatureRequestDialogOpen, setIsFeatureRequestDialogOpen] = useState(false);

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

  const dashboardItems = [
    { title: "Practice Labs", description: "Hone your skills in guided coding labs for your subjects.", icon: TerminalSquare, href: "/student/labs" },
    { title: "AI Flashcards", description: "Generate flashcards from text, PDFs, or videos to study smart.", icon: Sparkles, href: "/student/flashcards" },
    { title: "Code Sandbox", description: "An open playground to experiment with code in various languages.", icon: Code2, href: "/student/sandbox" },
    { title: "Chat", description: "Connect and collaborate with peers and faculty in your college.", icon: MessageSquare, href: "/student/chat" },
    { title: "My Profile", description: "View your progress, achievements, and manage your account.", icon: User, href: "/student/profile" },
  ];

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Dashboard...</span>
      </div>
    );
  }
   if (!userProfile) {
    return <div className="container mx-auto py-8 text-center"><p>Please log in to view your dashboard.</p></div>;
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="border border-border/40 bg-card/60 backdrop-blur-sm rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-accent"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight text-foreground flex items-center gap-2.5">
              <LayoutDashboard className="w-7 h-7 text-primary" />
              Student Dashboard
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1.5 font-sans">
              Welcome back, <span className="font-bold text-foreground/90">{userProfile.fullName}</span>! Here&apos;s your hub for learning.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" className="text-[11px] h-8 px-3 rounded-lg font-bold border-border/60 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => setIsChangePasswordDialogOpen(true)}>
              <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Password
            </Button>
            <Button variant="outline" size="sm" className="text-[11px] h-8 px-3 rounded-lg font-bold border-border/60 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => setIsFeedbackDialogOpen(true)}>
              <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" /> Feedback
            </Button>
            <Button variant="outline" size="sm" className="text-[11px] h-8 px-3 rounded-lg font-bold border-border/60 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => setIsFeatureRequestDialogOpen(true)}>
              <Lightbulb className="mr-1.5 h-3.5 w-3.5" /> Suggestion
            </Button>
          </div>
        </div>
      </div>
      
      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {dashboardItems.map((item) => (
          <Link 
            key={item.title} 
            href={item.href}
            className="group block rounded-2xl border border-border/40 bg-card/40 hover:bg-card/90 hover:border-primary/20 hover-glow transition-all duration-300 relative overflow-hidden"
          >
            {/* Desktop View: Full Card Content */}
            <div className="hidden md:block p-6 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">{item.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">{item.description}</p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-1.5 transition-all">
                  Access Portal <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </div>

            {/* Mobile View: Compact Quick Action Tile */}
            <div className="md:hidden p-4 flex flex-col items-center text-center justify-center min-h-[120px] gap-2">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground tracking-tight leading-tight">{item.title}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* College Resources */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-accent" />
          College Resources
        </h2>
        {isLoadingResources ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="shadow-sm border border-border/40 rounded-2xl">
                <CardHeader className="pb-2"><div className="h-5 bg-muted rounded w-3/4 animate-pulse"></div></CardHeader>
                <CardContent className="space-y-2 pb-4">
                  <div className="h-3.5 bg-muted rounded w-full animate-pulse"></div>
                  <div className="h-3.5 bg-muted rounded w-5/6 animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : collegeResources.length === 0 ? (
          <Card className="shadow-sm border border-border/40 rounded-2xl">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-sans">No external resources have been added by your college admin yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {collegeResources.map((resource) => (
              <div 
                key={resource.id} 
                className="rounded-2xl border border-border/40 bg-card/40 hover:bg-card/85 hover:border-primary/20 transition-all p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm md:text-base font-bold text-foreground line-clamp-1 leading-snug">{resource.title}</h3>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-secondary/30 text-secondary-foreground border-transparent px-2 py-0.5 shrink-0">{resource.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed font-sans">{resource.description}</p>
                </div>
                
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {formatDistanceToNowStrict((resource.createdAt as Timestamp).toDate(), { addSuffix: true })}
                  </p>
                  <Button asChild variant="secondary" size="sm" className="h-8 rounded-lg text-xs font-bold px-3">
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5" /> Visit
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dialogs */}
      {userProfile?.email && <ChangePasswordDialog isOpen={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen} email={userProfile.email} />}
      <FeedbackFormDialog isOpen={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} studentProfile={userProfile} />
      <FeatureRequestFormDialog isOpen={isFeatureRequestDialogOpen} onOpenChange={setIsFeatureRequestDialogOpen} userProfile={userProfile} />

    </div>
  );
}
