
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, UserRole, College } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { isFirebasePlaceholdersUsed } from '@/config/site';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';


interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  colleges: College[];
  refreshUserProfile: () => Promise<void>;
  firebaseConfigWarning?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [colleges, setColleges] = useState<College[]>([]);
  const [firebaseConfigWarning, setFirebaseConfigWarning] = useState<string | null>(null);

  const fetchUserProfile = async (user: User | null) => {
    if (user) { // user here is the potentially reloaded Firebase Auth user object
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userProfileDataFromDb = userDocSnap.data() as UserProfile;
        let finalProfile = userProfileDataFromDb;

        // Sync Firestore with the latest from Firebase Auth if needed
        if (user.emailVerified && !userProfileDataFromDb.isEmailVerified) {
          try {
            await updateDoc(userDocRef, { isEmailVerified: true });
            finalProfile = { ...userProfileDataFromDb, isEmailVerified: true };
          } catch (dbError) {
            console.error("AuthContext: Failed to update isEmailVerified in Firestore:", dbError);
            // Proceed with potentially stale DB data for now
          }
        }
        setUserProfile(finalProfile);
      } else {
        console.warn(`AuthContext: User profile not found in Firestore for UID ${user.uid}. This might be an issue if user just registered.`);
        setUserProfile(null);
      }
    } else {
      setUserProfile(null);
    }
  };
  
  const refreshUserProfile = async () => {
    if (currentUser) {
      try {
        await currentUser.reload(); // Reload the Firebase user object
        // After reload, currentUser object is updated in-place, including emailVerified
        await fetchUserProfile(auth.currentUser); // Pass the potentially updated auth.currentUser
      } catch (error) {
        console.error("AuthContext: Error reloading user:", error);
        // If reload fails, still try to fetch profile with the current currentUser state
        await fetchUserProfile(currentUser);
      }
    }
  };


  useEffect(() => {
    if (isFirebasePlaceholdersUsed && process.env.NODE_ENV === 'development') {
      setFirebaseConfigWarning(
        "Firebase configuration is using placeholder values. " +
        "Please update your .env file with your actual Firebase project credentials. " +
        "The app may not function correctly until this is resolved."
      );
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await fetchUserProfile(user); // Initial fetch on auth state change
      setLoading(false);
    });

    const fetchColleges = async () => {
      try {
        const collegesCollection = collection(db, 'colleges');
        const collegeSnapshot = await getDocs(collegesCollection);
        const collegeList = collegeSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as College));
        setColleges(collegeList);
      } catch (error) {
        console.error("Error fetching colleges: ", error);
      }
    };

    fetchColleges();
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, colleges, refreshUserProfile, firebaseConfigWarning }}>
      {firebaseConfigWarning && process.env.NODE_ENV === 'development' && (
        <Alert variant="destructive" className="m-4 rounded-lg border-2 border-red-500 dark:border-red-700">
          <Terminal className="h-5 w-5" />
          <AlertTitle className="font-bold text-lg">Development Warning: Firebase Configuration Issue</AlertTitle>
          <AlertDescription className="text-base">
            {firebaseConfigWarning} Ensure your <code>.env</code> file contains the correct
            <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>, <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code>, and other
            Firebase project settings.
          </AlertDescription>
        </Alert>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
