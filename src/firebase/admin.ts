import fs from 'node:fs';

import admin from 'firebase-admin';

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

const parseServiceAccountJson = (raw: string): ServiceAccountJson => {
  try {
    return JSON.parse(raw) as ServiceAccountJson;
  } catch {
    // Common case: env var contains literal \n sequences in private_key
    // Re-try with normalization.
    return JSON.parse(raw.replace(/\\n/g, '\n')) as ServiceAccountJson;
  }
};

const loadServiceAccount = (): ServiceAccountJson => {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (typeof jsonEnv === 'string' && jsonEnv.trim().length > 0) {
    return parseServiceAccountJson(jsonEnv);
  }

  const pathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (typeof pathEnv === 'string' && pathEnv.trim().length > 0) {
    const file = fs.readFileSync(pathEnv, { encoding: 'utf8' });
    return parseServiceAccountJson(file);
  }

  throw new Error('Missing Firebase credentials.');
};

const isEmulatorMode = (): boolean => {
  const flag = process.env.FIREBASE_USE_EMULATORS;
  const flagEnabled =
    typeof flag === 'string' && ['1', 'true', 'yes', 'on'].includes(flag.trim().toLowerCase());

  const hasFirestoreHost =
    typeof process.env.FIRESTORE_EMULATOR_HOST === 'string' &&
    process.env.FIRESTORE_EMULATOR_HOST.trim().length > 0;

  const hasAuthHost =
    typeof process.env.FIREBASE_AUTH_EMULATOR_HOST === 'string' &&
    process.env.FIREBASE_AUTH_EMULATOR_HOST.trim().length > 0;

  return flagEnabled || hasFirestoreHost || hasAuthHost;
};

const ensureEmulatorDefaults = (): void => {
  const useEmulators = process.env.FIREBASE_USE_EMULATORS;
  const hasUseEmulators = typeof useEmulators === 'string' && useEmulators.trim().length > 0;
  if (!hasUseEmulators) process.env.FIREBASE_USE_EMULATORS = 'true';

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const hasProjectId = typeof projectId === 'string' && projectId.trim().length > 0;
  if (!hasProjectId) process.env.FIREBASE_PROJECT_ID = 'gear-guard-demo';

  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const hasFirestoreHost = typeof firestoreHost === 'string' && firestoreHost.trim().length > 0;
  if (!hasFirestoreHost) process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
};

const getProjectId = (serviceAccount?: ServiceAccountJson): string | undefined => {
  const projectIdEnv = process.env.FIREBASE_PROJECT_ID;
  if (typeof projectIdEnv === 'string' && projectIdEnv.trim().length > 0) {
    return projectIdEnv;
  }

  const serviceAccountProjectId = serviceAccount?.project_id;
  if (typeof serviceAccountProjectId === 'string' && serviceAccountProjectId.trim().length > 0) {
    return serviceAccountProjectId;
  }

  const gcloudProject = process.env.GCLOUD_PROJECT;
  if (typeof gcloudProject === 'string' && gcloudProject.trim().length > 0) {
    return gcloudProject;
  }

  return undefined;
};

export const getFirebaseApp = (): admin.app.App => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  let serviceAccount: ServiceAccountJson | undefined;
  try {
    serviceAccount = loadServiceAccount();
  } catch {
    serviceAccount = undefined;
  }

  // Hackathon-friendly behavior:
  // - If emulators are in use OR no credentials were supplied, default to emulator settings.
  // - This prevents local demos/scripts (seed/smoke) from failing on a fresh machine.
  if (isEmulatorMode() || !serviceAccount) {
    ensureEmulatorDefaults();
    const projectId = getProjectId();
    return admin.initializeApp({ projectId });
  }

  const projectId = getProjectId(serviceAccount);
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId,
  });
};

export { admin };
