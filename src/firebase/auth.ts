import type { Auth } from 'firebase-admin/auth';

import { getFirebaseApp } from './admin';

let authInstance: Auth | undefined;

export const getAuth = (): Auth => {
  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseApp();
  authInstance = app.auth();
  return authInstance;
};
