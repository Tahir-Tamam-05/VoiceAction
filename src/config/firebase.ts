import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';

// ─── Required environment variables ──────────────────────────
const REQUIRED_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const env = (import.meta as any).env ?? {};

const missingVars = REQUIRED_VARS.filter((key) => !env[key]);

export const isFirebaseConfigured = missingVars.length === 0;

if (!isFirebaseConfigured) {
  console.error(
    '[VoiceAction] CRITICAL: Firebase is not configured.\n' +
    'Missing environment variables:\n' +
    missingVars.map((v) => `  - ${v}`).join('\n') + '\n' +
    'Authentication and cloud sync will not work until these are added to .env.\n' +
    'See .env.example for the required format.'
  );
}

// ─── Firebase initialisation ─────────────────────────────────
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
  };

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);

  // Initialise Firestore with offline-first persistence.
  // persistentLocalCache uses IndexedDB for offline reads/queued writes.
  // persistentMultipleTabManager coordinates writes across browser tabs.
  // Wrapped in try/catch: during HMR the app may already be initialised,
  // in which case getFirestore() returns the existing instance.
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    db = getFirestore(app);
  }
}

export { app, auth, db, googleProvider };
