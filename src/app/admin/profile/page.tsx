
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCog, Mail, Building, Phone, KeyRound } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';

export default function AdminProfilePage() {
  const { userProfile, loading } = useAuth();
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);

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
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </CardContent>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Admin Profile</h1>
         <Button asChild variant="outline">
            <Link href="/admin/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="h-24 w-24 text-3xl">
              <AvatarImage src={undefined} alt={userProfile.fullName} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(userProfile.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl font-headline">{userProfile.fullName}</CardTitle>
              <CardDescription className="text-md">
                Administrator at {userProfile.collegeName || 'Your College'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">Email:</span>
            <span>{userProfile.email}</span>
          </div>
          {userProfile.collegeName && (
            <div className="flex items-center space-x-3">
              <Building className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">College:</span>
              <span>{userProfile.collegeName}</span>
            </div>
          )}
          {userProfile.phoneNumber && (
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">Phone:</span>
              <span>{userProfile.phoneNumber}</span>
            </div>
          )}
           <div className="flex items-center space-x-3">
            <UserCog className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">Role:</span>
            <span className="capitalize">{userProfile.role}</span>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" /> Change Password
            </Button>
        </CardFooter>
      </Card>
      <ChangePasswordDialog 
        email={userProfile.email}
        isOpen={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
      />
    </div>
  );
}
