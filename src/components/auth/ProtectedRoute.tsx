
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Added import

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/login');
      } else if (userProfile && allowedRoles && !allowedRoles.includes(userProfile.role)) {
        // If role mismatch, redirect to a default page or an unauthorized page
        // For now, redirecting to home, or specific dashboard if already known.
        if (userProfile.role === 'admin') router.push('/admin/dashboard');
        else if (userProfile.role === 'student') router.push('/student/labs');
        else router.push('/');
      } else if (userProfile && !userProfile.isEmailVerified && userProfile.role !== 'admin') { 
        // Admins are verified by magic link implicitly
        // For students, check email verification
        toast({
          title: "Email Not Verified",
          description: "Please verify your email to access this page.",
          variant: "destructive",
        });
        router.push('/login'); // Or a dedicated "please verify email" page
      }
    }
  }, [currentUser, userProfile, loading, router, allowedRoles]);

  if (loading || !currentUser || (allowedRoles && (!userProfile || !allowedRoles.includes(userProfile.role)))) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Additional check for email verification for students specifically
  if (userProfile && userProfile.role === 'student' && !userProfile.isEmailVerified) {
     return (
      <div className="flex flex-col h-screen items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold text-primary mb-4">Email Verification Required</h1>
        <p className="text-muted-foreground mb-6">Please check your inbox and verify your email address to continue.</p>
        <Button onClick={() => router.push('/login')}>Go to Login</Button>
      </div>
    );
  }


  return <>{children}</>;
}

// Helper for Toaster, ideally this would be in a shared util or hook
import { toast } from '@/hooks/use-toast';
