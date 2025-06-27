
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

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
        if (userProfile.role === 'admin') router.push('/admin/dashboard');
        else if (userProfile.role === 'student') router.push('/student/dashboard');
        else if (userProfile.role === 'faculty') router.push('/faculty/dashboard');
        else router.push('/');
      }
    }
  }, [currentUser, userProfile, loading, router, allowedRoles]);

  if (loading || !currentUser || (allowedRoles && !userProfile)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (userProfile && allowedRoles && !allowedRoles.includes(userProfile.role)) {
    // While useEffect redirects, this prevents flashing incorrect content
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return <>{children}</>;
}
