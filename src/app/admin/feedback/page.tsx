
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, writeBatch, updateDoc, Timestamp } from 'firebase/firestore';
import type { Feedback, UserProfile } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mailbox, ArrowLeft, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';

export default function AdminFeedbackPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAndProcessFeedback = useCallback(async () => {
    if (!userProfile?.collegeId) {
      if (!authLoading) {
        toast({ title: "Error", description: "Admin college information not found.", variant: "destructive" });
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const feedbackRef = collection(db, 'colleges', userProfile.collegeId, 'feedback');
      const q = query(feedbackRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const fetchedFeedback = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Feedback));
      
      setFeedbackList(fetchedFeedback);

      // Mark unread feedback as read
      const unreadFeedbackIds = fetchedFeedback.filter(f => !f.isRead).map(f => f.id);
      if (unreadFeedbackIds.length > 0) {
        const batch = writeBatch(db);
        unreadFeedbackIds.forEach(feedbackId => {
          const itemRef = doc(db, 'colleges', userProfile.collegeId!, 'feedback', feedbackId);
          batch.update(itemRef, { isRead: true });
        });
        await batch.commit();

        // Update the college document to turn off notification flag
        const collegeDocRef = doc(db, 'colleges', userProfile.collegeId);
        await updateDoc(collegeDocRef, { hasUnreadFeedback: false });
        
        // Optimistically update local state to reflect read status immediately
        setFeedbackList(prevList => 
            prevList.map(item => 
                unreadFeedbackIds.includes(item.id) ? { ...item, isRead: true } : item
            )
        );
        toast({ title: "Feedback Read", description: `${unreadFeedbackIds.length} new feedback item(s) marked as read.` });
      }

    } catch (error) {
      console.error("Error fetching or processing feedback:", error);
      toast({ title: "Error", description: "Failed to load or process feedback.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.collegeId, authLoading, toast]);

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchAndProcessFeedback();
    } else if (!authLoading && !userProfile) {
      setIsLoading(false); // Stop loading if no user
    }
  }, [authLoading, userProfile, fetchAndProcessFeedback]);

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Feedback...</span>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You must be logged in as an admin to view feedback.</p>
        <Button asChild><Link href="/login">Go to Login</Link></Button>
      </div>
    );
  }
  
  if (!userProfile.collegeId) {
     return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">College Not Configured</h1>
        <p className="text-muted-foreground mb-4">Your admin profile is not associated with a college. Please contact support.</p>
        <Button asChild variant="outline"><Link href="/admin/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline flex items-center">
          <Mailbox className="w-8 h-8 mr-3 text-primary" />
          Student Feedback for {userProfile.collegeName || 'Your College'}
        </h1>
        <Button asChild variant="outline">
          <Link href="/admin/profile" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Admin Profile
          </Link>
        </Button>
      </div>

      {feedbackList.length === 0 ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><MessageSquare className="w-6 h-6 mr-2"/>No Feedback Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">There is currently no feedback submitted by students from {userProfile.collegeName}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {feedbackList.map((item) => (
            <Card 
              key={item.id} 
              className={`shadow-md transition-all duration-300 ${!item.isRead && feedbackList.some(f => f.id === item.id && !f.isRead) ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                        <CardTitle className="text-lg font-semibold">{item.studentName}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            {item.studentEmail}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        {!item.isRead && feedbackList.some(f => f.id === item.id && !f.isRead) && (
                            <Badge variant="destructive" className="text-xs">New</Badge>
                        )}
                         <span className="text-xs text-muted-foreground">
                            {item.createdAt ? formatDistanceToNowStrict( (item.createdAt as Timestamp).toDate(), { addSuffix: true } ) : 'Date N/A'}
                         </span>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{item.feedbackText}</p>
              </CardContent>
              <CardFooter className="pt-3 border-t">
                <div className="flex items-center text-xs text-muted-foreground">
                    {item.isRead ? (
                        <> <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500"/> Read</>
                    ) : (
                        <> <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-blue-500"/> Unread (Marked as read on page load)</>
                    )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

    
