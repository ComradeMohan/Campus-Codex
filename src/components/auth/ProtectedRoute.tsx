
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { OtpVerificationDialog } from './OtpVerificationDialog';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser, userProfile, loading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/login');
      } else if (userProfile && allowedRoles && !allowedRoles.includes(userProfile.role)) {
        // If role mismatch, redirect to a default page or an unauthorized page
        if (userProfile.role === 'admin') router.push('/admin/dashboard');
        else if (userProfile.role === 'student') router.push('/student/labs');
        else if (userProfile.role === 'faculty') router.push('/faculty/dashboard');
        else router.push('/');
      } else if (userProfile && userProfile.role !== 'admin' && !userProfile.isEmailVerified) {
        // For non-admin users, if email is not verified, component renders verification prompt.
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

  const handleRefreshStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      await refreshUserProfile();
      // The userProfile state in AuthContext will be updated.
      // The useEffect in this component will re-evaluate and either show children
      // or keep showing the verification message if still not verified.
      toast({
        title: "Status Refreshed",
        description: "Your email verification status has been re-checked.",
      });
    } catch (error: any) {
      console.error("Refresh status error:", error);
      toast({
        title: "Error",
        description: "Failed to refresh status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!currentUser || (currentUser && !userProfile && allowedRoles)) {
     return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (userProfile && allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (userProfile && userProfile.role !== 'admin' && !userProfile.isEmailVerified) {
     return (
      <>
        <div className="flex flex-col h-screen items-center justify-center bg-background p-4 text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Account Verification Required</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            Your account is not yet verified. Please use one of the options below to gain access.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button onClick={handleResendVerification} disabled={isResending || isRefreshingStatus}>
              {isResending ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : null}
              Resend Verification Email
            </Button>
            {userProfile.phoneNumber && (
                <Button variant="secondary" onClick={() => setIsOtpDialogOpen(true)} disabled={isResending || isRefreshingStatus}>
                    <Phone className="mr-2 h-4 w-4" /> Verify with Phone OTP
                </Button>
            )}
          </div>
          <div className="mt-6">
             <Button 
                onClick={handleRefreshStatus} 
                variant="outline" 
                disabled={isRefreshingStatus || isResending}
            >
                {isRefreshingStatus ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : null}
                I've already verified, Refresh Status
            </Button>
          </div>
          <Button variant="link" className="mt-8" onClick={() => { auth.signOut(); router.push('/login');}}>Go to Login</Button>
        </div>
        {userProfile.phoneNumber && (
            <OtpVerificationDialog 
                isOpen={isOtpDialogOpen}
                onOpenChange={setIsOtpDialogOpen}
                phoneNumber={userProfile.phoneNumber}
            />
        )}
      </>
    );
  }

  return <>{children}</>;
}
