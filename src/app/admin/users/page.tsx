
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc } from 'firebase/firestore';
import type { UserProfile, ProgrammingLanguage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, AlertTriangle, ArrowLeft, CheckCircle, XCircle, BookUser, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserWithManagedLanguages extends UserProfile {
  managedLanguageNames?: string[];
}

export default function UserManagementPage() {
  const { userProfile, colleges } = useAuth(); // Assuming colleges list is available in AuthContext or fetch it
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithManagedLanguages[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [collegeLanguages, setCollegeLanguages] = useState<ProgrammingLanguage[]>([]);

  const fetchCollegeLanguages = useCallback(async (collegeId: string) => {
    try {
      const languagesRef = collection(db, 'colleges', collegeId, 'languages');
      const q = query(languagesRef, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedLanguages = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as ProgrammingLanguage));
      setCollegeLanguages(fetchedLanguages);
      return fetchedLanguages;
    } catch (error) {
      console.error('Error fetching college languages:', error);
      toast({ title: 'Error', description: 'Failed to fetch college languages list.', variant: 'destructive' });
      return [];
    }
  }, [toast]);


  const fetchUsers = useCallback(async (collegeId: string) => {
    setIsLoadingUsers(true);
    const languages = await fetchCollegeLanguages(collegeId);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('collegeId', '==', collegeId), orderBy('role', 'asc'), orderBy('fullName', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedUsersPromises = querySnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data() as UserProfile;
        let managedLanguageNames: string[] = [];

        if (userData.role === 'faculty' && userData.managedLanguageIds && userData.managedLanguageIds.length > 0) {
          managedLanguageNames = userData.managedLanguageIds.map(id => {
            const lang = languages.find(l => l.id === id);
            return lang ? lang.name : 'Unknown Language';
          }).filter(name => name !== 'Unknown Language');
        }
        return { ...userData, managedLanguageNames };
      });
      
      const fetchedUsers = await Promise.all(fetchedUsersPromises);
      setUsers(fetchedUsers);

    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast, fetchCollegeLanguages]);

  useEffect(() => {
    if (userProfile?.collegeId) {
      fetchUsers(userProfile.collegeId);
    } else if (userProfile === null) { // User is explicitly logged out
      setIsLoadingUsers(false);
    }
    // If userProfile is defined but no collegeId, this case is handled by the checks below
  }, [userProfile, fetchUsers]);

  if (!userProfile && !isLoadingUsers) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You must be logged in as an admin to manage users.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  if (!userProfile?.collegeId && !isLoadingUsers) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">College Not Found</h1>
        <p className="text-muted-foreground mb-4">Admin profile is not associated with a college. Please contact support.</p>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-headline flex items-center">
          <Users className="w-8 h-8 mr-3 text-primary" />
          User Management
        </h1>
        <div className="flex gap-2">
           <Button variant="outline" disabled> {/* Placeholder for future feature */}
              <BookUser className="mr-2 h-4 w-4" /> Manage Faculty Role/Assignments (Soon)
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">
            Users at {userProfile?.collegeName || 'Your College'}
          </CardTitle>
          <CardDescription>
            List of all registered students, faculty, and administrators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No users found for this college yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Details</TableHead> {/* Reg No for Student, Managed Langs for Faculty */}
                    <TableHead>Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : user.role === 'faculty' ? 'secondary' : 'outline'} 
                          className="capitalize"
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === 'student' ? `Reg No: ${user.registrationNumber || 'N/A'}` :
                         user.role === 'faculty' && user.managedLanguageNames && user.managedLanguageNames.length > 0 ? 
                           `Manages: ${user.managedLanguageNames.join(', ')}` :
                         user.role === 'faculty' ? 'Manages: None Assigned' : 'N/A'}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.isEmailVerified ? (
                          <CheckCircle className="h-5 w-5 text-green-500 inline-block" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 inline-block" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

