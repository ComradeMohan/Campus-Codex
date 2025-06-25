// This file must be in the public directory
// It's required for Firebase Cloud Messaging to work in the background.

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// IMPORTANT: These should match your client-side Firebase config.
// It's often best to manage this through environment variables or a build process,
// but for simplicity in this file, they are hardcoded. Ensure they are correct.
const firebaseConfig = {
  apiKey: "AIzaSyCVZJ9HsosLnGNtWofpB0UDYXGzhjJonYI",
  authDomain: "tester-c330a.firebaseapp.com",
  projectId: "tester-c330a",
  storageBucket: "tester-c330a.appspot.com",
  messagingSenderId: "457957223942",
  appId: "1:457957223942:web:26a2d88dde5fb12b839d87",
  measurementId: "G-CVD1KGT6GM"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new message.",
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
