export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const getFirebaseWebConfig = (): FirebaseWebConfig => {
  return {
    apiKey: requiredEnv('FIREBASE_WEB_API_KEY'),
    authDomain: requiredEnv('FIREBASE_WEB_AUTH_DOMAIN'),
    projectId: requiredEnv('FIREBASE_WEB_PROJECT_ID'),
    storageBucket: requiredEnv('FIREBASE_WEB_STORAGE_BUCKET'),
    messagingSenderId: requiredEnv('FIREBASE_WEB_MESSAGING_SENDER_ID'),
    appId: requiredEnv('FIREBASE_WEB_APP_ID'),
    measurementId: process.env.FIREBASE_WEB_MEASUREMENT_ID,
  };
};
