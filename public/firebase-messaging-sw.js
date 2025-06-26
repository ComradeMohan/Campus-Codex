
// Scripts for firebase and firebase messaging.
// Note: We use the compat libraries here to simplify the service worker logic.
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration.
// This is HARDCODED because service workers cannot access environment variables.
const firebaseConfig = {
  apiKey: "AIzaSyCVZJ9HsosLnGNtWofpB0UDYXGzhjJonYI",
  authDomain: "tester-c330a.firebaseapp.com",
  projectId: "tester-c330a",
  storageBucket: "tester-c330a.appspot.com",
  messagingSenderId: "457957223942",
  appId: "1:457957223942:web:26a2d88dde5fb12b839d87"
};

// Initialize Firebase
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}


// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new message.",
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
