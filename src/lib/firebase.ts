
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';
import { siteConfig } from '@/config/site';

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let messaging: Messaging | null = null; // Initialize as null

if (getApps().length === 0) {
  firebaseApp = initializeApp(siteConfig.firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

auth = getAuth(firebaseApp);
db = getFirestore(firebaseApp);
storage = getStorage(firebaseApp);

// Initialize messaging only on the client and if supported
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(firebaseApp);
      console.log("Firebase Messaging is supported and initialized.");
    } else {
      console.log("Firebase Messaging is not supported in this browser.");
    }
  });
}

export { firebaseApp, auth, db, storage, messaging };
