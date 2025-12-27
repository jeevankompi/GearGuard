import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { getFirebaseWebConfig, isFirebaseWebConfigPresent } from './config';

let cachedApp: FirebaseApp | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function shouldUseEmulators(): boolean {
  if (!import.meta.env.DEV) return false;
  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') return true;
  // If no Firebase web config is provided, default to emulators for a smoother dev experience.
  return !isFirebaseWebConfigPresent();
}

export function getFirebaseApp(): FirebaseApp {
  if (!isBrowser()) {
    throw new Error('Firebase web app can only be initialized in a browser environment.');
  }

  if (cachedApp) return cachedApp;

  const app = initializeApp(getFirebaseWebConfig());

  if (shouldUseEmulators()) {
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    const authHost = import.meta.env.VITE_AUTH_EMULATOR_HOST ?? '127.0.0.1';
    const authPort = Number(import.meta.env.VITE_AUTH_EMULATOR_PORT ?? '9099');

    const firestoreHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST ?? '127.0.0.1';
    const firestorePort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT ?? '8080');

    connectAuthEmulator(auth, `http://${authHost}:${authPort}`);
    connectFirestoreEmulator(firestore, firestoreHost, firestorePort);
  }

  cachedApp = app;
  return app;
}
