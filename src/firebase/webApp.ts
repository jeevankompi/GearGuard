import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';

import { getFirebaseWebConfig } from './webConfig';

/**
 * Initializes Firebase *Web* SDK.
 *
 * This is intended for browser environments. If you call this from Node/CLI,
 * it will throw (Firebase Analytics also requires the browser).
 */
export const getFirebaseWebApp = (): FirebaseApp => {
  // Avoid referencing DOM globals directly (this repo is Node-first).
  const hasBrowserWindow = typeof globalThis !== 'undefined' && 'window' in globalThis;
  if (!hasBrowserWindow) {
    throw new Error('Firebase Web SDK can only be initialized in a browser environment.');
  }

  const existing = getApps();
  if (existing.length > 0) {
    const app = existing[0];
    if (!app) {
      throw new Error('Firebase Web SDK: unexpected empty app list.');
    }
    return app;
  }

  return initializeApp(getFirebaseWebConfig());
};
