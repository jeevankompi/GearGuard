import type { Firestore } from 'firebase-admin/firestore';

import { getFirebaseApp } from './admin';

let firestoreInstance: Firestore | undefined;

export const getFirestore = (): Firestore => {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const app = getFirebaseApp();
  firestoreInstance = app.firestore();
  firestoreInstance.settings({ ignoreUndefinedProperties: true });
  return firestoreInstance;
};
