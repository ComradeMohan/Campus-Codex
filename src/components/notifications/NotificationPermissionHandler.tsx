
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { messaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function NotificationPermissionHandler() {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Ensure this runs only on the client, when messaging is supported, and user is logged in.
    if (typeof window === 'undefined' || !messaging || !userProfile) return;

    const requestPermissionAndToken = async () => {
      try {
        // 1. Request Permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          
          // 2. Get FCM Token
          // Ensure you have your VAPID key in .env.local as NEXT_PUBLIC_FIREBASE_VAPID_KEY
          const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          });

          if (currentToken) {
            console.log('FCM Token:', currentToken);

            // 3. Check if token already exists for the user to avoid duplicates
            if (userProfile.fcmTokens?.includes(currentToken)) {
              console.log('FCM token already stored for this user.');
              return;
            }

            // 4. Save the new token to Firestore
            const userDocRef = doc(db, 'users', userProfile.uid);
            await updateDoc(userDocRef, {
              fcmTokens: arrayUnion(currentToken),
            });
            console.log('FCM token saved to user profile.');
            
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          console.log('Unable to get permission to notify.');
        }
      } catch (err) {
        console.error('An error occurred while requesting permission or getting token. ', err);
         toast({
            title: 'Notification Setup Error',
            description: 'Could not set up notifications. This can happen if your browser blocks them or if you are in private browsing mode.',
            variant: 'destructive',
            duration: 7000,
          });
      }
    };

    requestPermissionAndToken();

    // 5. Handle foreground messages (when the app is open and active)
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received in foreground. ', payload);
      toast({
        title: payload.notification?.title || 'New Notification',
        description: payload.notification?.body,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [userProfile, toast]);

  return null; // This component does not render anything
}
