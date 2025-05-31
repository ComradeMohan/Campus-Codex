
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/login');
      } else if (userProfile && allowedRoles && !allowedRoles.includes(userProfile.role)) {
        // If role mismatch, redirect to a default page or an unauthorized page
        if (userProfile.role === 'admin') router.push('/admin/dashboard');
        else if (userProfile.role === 'student') router.push('/student/labs');
        else router.push('/');
      } else if (userProfile && userProfile.role !== 'admin' && !userProfile.isEmailVerified) {
        // For non-admin users, if email is not verified, don't immediately redirect.
        // The component will render the verification prompt below.
      }
    }
  }, [currentUser, userProfile, loading, router, allowedRoles]);

  const handleResendVerification = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "No user is currently logged in.",
        variant: "destructive",
      });
      return;
    }
    setIsResending(true);
    try {
      await sendEmailVerification(currentUser);
      toast({
        title: "Verification Email Sent",
        description: "A new verification link has been sent to your email address. Please check your inbox (and spam folder).",
      });
    } catch (error: any) {
      console.error("Resend verification email error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If not loading, and no current user, means redirect is in progress or will happen.
  // Or, if user exists but profile is loading (initial load after login), show loader.
  if (!currentUser || (currentUser && !userProfile && allowedRoles)) {
     return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is logged in, profile is loaded, but role doesn't match
  if (userProfile && allowedRoles && !allowedRoles.includes(userProfile.role)) {
    // Redirect is handled by useEffect, show loader while redirecting
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Check for email verification for non-admin roles
  if (userProfile && userProfile.role !== 'admin' && !userProfile.isEmailVerified) {
     return (
      <div className="flex flex-col h-screen items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold text-primary mb-4">Email Verification Required</h1>
        <p className="text-muted-foreground mb-6">
          Your email address <span className="font-semibold">{currentUser.email}</span> is not verified.
          Please check your inbox (and spam folder) for the verification link, or request a new one.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleResendVerification} disabled={isResending}>
            {isResending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Resend Verification Email
          </Button>
          <Button variant="outline" onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  // If all checks pass (user exists, profile loaded, role matches, email verified or admin)
  return <>{children}</>;
}
