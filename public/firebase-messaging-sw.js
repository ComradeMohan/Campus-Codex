// public/firebase-messaging-sw.js
// This file MUST be in the public folder.

// Scripts for Firebase products are available from the Firebase CDN.
// See: https://firebase.google.com/docs/web/setup#access-firebase
// Using compat libraries for service worker for simpler setup.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');


// Your web app's Firebase configuration.
// This needs to be kept in sync with your main app's config.
const firebaseConfig = {
    apiKey: "AIzaSyCVZJ9HsosLnGNtWofpB0UDYXGzhjJonYI",
    authDomain: "tester-c330a.firebaseapp.com",
    projectId: "tester-c330a",
    storageBucket: "tester-c330a.firebasestorage.app",
    messagingSenderId: "457957223942",
    appId: "1:457957223942:web:26a2d88dde5fb12b839d87"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(app);

// Optional: Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
