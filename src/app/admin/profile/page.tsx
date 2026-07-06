
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCog, Mail, Building, Phone, KeyRound, Mailbox, Users, Lightbulb } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FeatureRequestFormDialog } from '@/components/feature-request/FeatureRequestFormDialog';


export default function AdminProfilePage() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [isFeatureRequestDialogOpen, setIsFeatureRequestDialogOpen] = useState(false);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);

  useEffect(() => {
    if (userProfile?.role === 'admin' && userProfile.collegeId) {
      const feedbackRef = collection(db, 'colleges', userProfile.collegeId, 'feedback');
      const q = query(feedbackRef, where('isRead', '==', false));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setUnreadFeedbackCount(querySnapshot.size);
      }, (error) => {
        console.error("Error fetching unread feedback count: ", error);
        toast({
          title: "Error",
          description: "Could not fetch unread feedback notifications.",
          variant: "destructive",
        });
      });

      return () => unsubscribe(); // Cleanup listener on component unmount
    }
  }, [userProfile, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => ( 
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </CardContent>
           <CardFooter className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" /> 
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground text-lg">User profile not found.</p>
        <Button asChild className="mt-4">
          <Link href="/admin/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/30">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-headline text-foreground">Admin Profile</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Manage your credentials and access admin quick actions.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold w-fit">
          <Link href="/admin/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Card Info */}
        <Card className="lg:col-span-7 shadow-md border-border/40 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-5 border-b border-border/30 flex items-center gap-4">
            <Avatar className="h-14 w-14 text-lg border-2 border-primary/20 shrink-0">
              <AvatarImage src={undefined} alt={userProfile.fullName} />
              <AvatarFallback className="bg-primary text-primary-foreground font-extrabold">
                {getInitials(userProfile.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-extrabold text-lg md:text-xl text-foreground truncate">{userProfile.fullName}</h3>
              <p className="text-xs text-muted-foreground truncate capitalize">{userProfile.role} • {userProfile.collegeName || 'Campus Codex Admin'}</p>
            </div>
          </div>
          
          <CardContent className="p-4 md:p-6 space-y-3.5">
            <div className="flex items-center gap-3 text-xs md:text-sm">
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Email Address</p>
                <p className="font-medium text-foreground truncate">{userProfile.email}</p>
              </div>
            </div>

            {userProfile.collegeName && (
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">College Affiliation</p>
                  <p className="font-medium text-foreground truncate">{userProfile.collegeName}</p>
                </div>
              </div>
            )}

            {userProfile.phoneNumber && (
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Contact Phone</p>
                  <p className="font-medium text-foreground truncate">{userProfile.phoneNumber}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions Panel */}
        <Card className="lg:col-span-5 shadow-md border-border/40">
          <CardHeader className="py-4 px-5 border-b border-border/30">
            <CardTitle className="text-sm font-bold font-headline flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" /> Quick Actions
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 space-y-2.5">
            <Button 
              variant="outline" 
              onClick={() => setIsChangePasswordDialogOpen(true)}
              className="w-full justify-start text-left border-border/50 hover:bg-primary/5 hover:text-primary transition-all text-xs font-bold h-10 rounded-xl"
            >
              <KeyRound className="mr-2 h-4 w-4 shrink-0 text-primary" /> Change Password
            </Button>

            {userProfile.role === 'admin' && (
              <Button asChild variant="outline" className="w-full justify-start text-left border-border/50 hover:bg-primary/5 hover:text-primary transition-all text-xs font-bold h-10 rounded-xl">
                <Link href="/admin/feedback" className="flex items-center w-full">
                  <Mailbox className="mr-2 h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1">View Student Feedback</span>
                  {unreadFeedbackCount > 0 && (
                    <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-[9px]">
                      {unreadFeedbackCount}
                    </Badge>
                  )}
                </Link>
              </Button>
            )}

            {userProfile.role === 'admin' && (
              <Button asChild variant="outline" className="w-full justify-start text-left border-border/50 hover:bg-primary/5 hover:text-primary transition-all text-xs font-bold h-10 rounded-xl">
                <Link href="/admin/users">
                  <Users className="mr-2 h-4 w-4 shrink-0 text-primary" /> Manage Accounts
                </Link>
              </Button>
            )}

            <Button 
              variant="outline" 
              onClick={() => setIsFeatureRequestDialogOpen(true)}
              className="w-full justify-start text-left border-border/50 hover:bg-primary/5 hover:text-primary transition-all text-xs font-bold h-10 rounded-xl"
            >
              <Lightbulb className="mr-2 h-4 w-4 shrink-0 text-primary" /> Suggest a Feature
            </Button>
          </CardContent>
        </Card>
      </div>

      <ChangePasswordDialog 
        email={userProfile.email}
        isOpen={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
      />
      <FeatureRequestFormDialog
        isOpen={isFeatureRequestDialogOpen}
        onOpenChange={setIsFeatureRequestDialogOpen}
        userProfile={userProfile}
      />
    </div>
  );
}
