import 'dotenv/config';

import { getFirestore } from '../firebase/firestore';
import { collections } from '../modules/maintenance/collections';
import { logger } from '../utils/logger';

const nowIso = (): string => new Date().toISOString();

const ensureEmulatorDefaultsForSeed = (): void => {
  const hasJson =
    typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === 'string' &&
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim().length > 0;
  const hasPath =
    typeof process.env.FIREBASE_SERVICE_ACCOUNT_PATH === 'string' &&
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH.trim().length > 0;

  // If no credentials were provided, default to emulator mode so `npm run seed`
  // works for local/hackathon demos.
  if (!hasJson && !hasPath) {
    const hasEmulatorFlag =
      typeof process.env.FIREBASE_USE_EMULATORS === 'string' &&
      process.env.FIREBASE_USE_EMULATORS.trim().length > 0;
    const hasProjectId =
      typeof process.env.FIREBASE_PROJECT_ID === 'string' &&
      process.env.FIREBASE_PROJECT_ID.trim().length > 0;
    const hasFirestoreHost =
      typeof process.env.FIRESTORE_EMULATOR_HOST === 'string' &&
      process.env.FIRESTORE_EMULATOR_HOST.trim().length > 0;

    if (!hasEmulatorFlag) process.env.FIREBASE_USE_EMULATORS = 'true';
    if (!hasProjectId) process.env.FIREBASE_PROJECT_ID = 'gear-guard-demo';
    if (!hasFirestoreHost) process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  }
};

const run = async (): Promise<void> => {
  ensureEmulatorDefaultsForSeed();
  const db = getFirestore();

  const createdAt = nowIso();

  // Technicians
  const techAliceRef = db.collection(collections.technicians).doc('tech_alice');
  const techBobRef = db.collection(collections.technicians).doc('tech_bob');

  await techAliceRef.set(
    {
      displayName: 'Alice',
      createdAt,
      updatedAt: createdAt,
    },
    { merge: true }
  );

  await techBobRef.set(
    {
      displayName: 'Bob',
      createdAt,
      updatedAt: createdAt,
    },
    { merge: true }
  );

  // Teams
  const teamItRef = db.collection(collections.teams).doc('team_it');
  const teamMechRef = db.collection(collections.teams).doc('team_mechanical');

  await teamItRef.set(
    {
      name: 'IT',
      technicianIds: ['tech_alice'],
      createdAt,
      updatedAt: createdAt,
    },
    { merge: true }
  );

  await teamMechRef.set(
    {
      name: 'Mechanical',
      technicianIds: ['tech_bob'],
      createdAt,
      updatedAt: createdAt,
    },
    { merge: true }
  );

  // Equipment
  const laptopRef = db.collection(collections.equipment).doc('eq_laptop_001');
  const forkliftRef = db.collection(collections.equipment).doc('eq_forklift_001');

  await laptopRef.set(
    {
      name: 'Laptop - Dell XPS',
      serialNumber: 'XPS-001',
      category: 'Computers',
      purchaseDate: '2024-01-15',
      warrantyUntil: '2027-01-15',
      location: 'HQ - Floor 3',
      ownerType: 'employee',
      ownerName: 'John Smith',
      defaultTeamId: 'team_it',
      defaultTechnicianId: 'tech_alice',
      status: 'active',
      createdAt,
      updatedAt: createdAt,
    },
    { merge: true }
  );

  await forkliftRef.set(
    {
      name: 'Forklift - Toyota',
      serialNumber: 'FLT-001',
      category: 'Vehicles',
      purchaseDate: '2022-06-01',
      warrantyUntil: '2025-06-01',
      location: 'Warehouse',
      ownerType: 'department',
      ownerName: 'Logistics',
      defaultTeamId: 'team_mechanical',
      defaultTechnicianId: 'tech_bob',
      status: 'active',
      createdAt,
      updatedAt: createdAt,
    },
    { merge: true }
  );

  logger.info('Seed complete');
};

run().catch(err => {
  logger.error('Seed failed', err);
  process.exitCode = 1;
});
