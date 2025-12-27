import { z } from 'zod';

const FirebaseWebConfigSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  storageBucket: z.string().min(1),
  messagingSenderId: z.string().min(1),
  appId: z.string().min(1),
});

export type FirebaseWebConfig = z.infer<typeof FirebaseWebConfigSchema>;

function readEnvConfig(): Record<string, unknown> {
  // Vite exposes only variables prefixed with VITE_
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isFirebaseWebConfigPresent(): boolean {
  const cfg = readEnvConfig();
  return (
    hasNonEmptyString(cfg.apiKey) &&
    hasNonEmptyString(cfg.authDomain) &&
    hasNonEmptyString(cfg.projectId) &&
    hasNonEmptyString(cfg.storageBucket) &&
    hasNonEmptyString(cfg.messagingSenderId) &&
    hasNonEmptyString(cfg.appId)
  );
}

export function getFirebaseWebConfig(): FirebaseWebConfig {
  const cfg = readEnvConfig();

  const envValues = Object.values(cfg);
  const anyProvided = envValues.some(v => hasNonEmptyString(v));
  const allProvided = isFirebaseWebConfigPresent();

  if (allProvided) {
    return FirebaseWebConfigSchema.parse(cfg);
  }

  // If you're running `vite dev` without any Firebase config, default to a dummy
  // Firebase app and rely on emulators.
  if (import.meta.env.DEV && !anyProvided) {
    const projectId =
      (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? 'demo-gear-guard';
    return FirebaseWebConfigSchema.parse({
      apiKey: 'demo-api-key',
      authDomain: 'localhost',
      projectId,
      storageBucket: 'demo.appspot.com',
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:0000000000000000000000',
    });
  }

  // Partial config tends to be a mistake (especially when switching between
  // real Firebase and emulators), so fail loudly.
  if (anyProvided && !allProvided) {
    throw new Error(
      'Incomplete Firebase web config. Either set ALL VITE_FIREBASE_* variables (apiKey/authDomain/projectId/storageBucket/messagingSenderId/appId) or remove them and use emulators.'
    );
  }

  return FirebaseWebConfigSchema.parse(cfg);
}
