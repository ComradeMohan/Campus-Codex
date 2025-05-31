import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { siteConfig } from '@/config/site';

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  firebaseApp = initializeApp(siteConfig.firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

auth = getAuth(firebaseApp);
db = getFirestore(firebaseApp);

export { firebaseApp, auth, db };

// Placeholder functions - to be implemented
// export async function sendAdminMagicLink(email: string, collegeName: string) { console.log('Sending magic link to admin', email, collegeName); }
// export async function registerStudentWithEmail(data: any) { console.log('Registering student', data); }
// export async function loginWithEmailPassword(email: string, pass: string) { console.log('Logging in', email); }
// export async function getUserRole(uid: string): Promise<UserRole | null> { console.log('Getting role for', uid); return null; }
// export async function saveUserToFirestore(user: UserProfile) { console.log('Saving user', user); }
