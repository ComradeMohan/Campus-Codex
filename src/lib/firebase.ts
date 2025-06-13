
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Added
import { siteConfig } from '@/config/site';

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage; // Added

if (getApps().length === 0) {
  firebaseApp = initializeApp(siteConfig.firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

auth = getAuth(firebaseApp);
db = getFirestore(firebaseApp);
storage = getStorage(firebaseApp); // Added

export { firebaseApp, auth, db, storage }; // Added storage to exports
    
