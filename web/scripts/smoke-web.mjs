import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  updateDoc,
} from 'firebase/firestore';

// cspell:ignore firebaseapp

const nowIso = () => new Date().toISOString();

function parseHostPort(value, fallbackHost, fallbackPort) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { host: fallbackHost, port: fallbackPort };
  }
  const [hostRaw, portRaw] = value.trim().split(':');
  const host = hostRaw && hostRaw.trim().length > 0 ? hostRaw.trim() : fallbackHost;
  const port = Number(portRaw ?? fallbackPort);
  return { host, port: Number.isFinite(port) ? port : fallbackPort };
}

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || 'gear-guard-demo';

  // For emulator usage, these can be dummy values.
  const app = initializeApp({
    apiKey: 'demo',
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
  });

  const auth = getAuth(app);
  const db = getFirestore(app);

  const authAddr = parseHostPort(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1', 9099);
  const fsAddr = parseHostPort(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1', 8080);

  connectAuthEmulator(auth, `http://${authAddr.host}:${authAddr.port}`);
  connectFirestoreEmulator(db, fsAddr.host, fsAddr.port);

  // Some emulator setups allow unauthenticated access, but signing in makes this robust
  // if rules were tightened.
  try {
    await signInAnonymously(auth);
  } catch {
    // Ignore if auth emulator isn't configured for anonymous.
  }

  const createdAt = nowIso();

  // Collections must match what the web UI uses.
  const COL = {
    technicians: 'technicians',
    teams: 'maintenanceTeams',
    equipment: 'equipment',
    requests: 'maintenanceRequests',
  };

  const tag = `smoke_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const techId = (
    await addDoc(collection(db, COL.technicians), {
      displayName: `Smoke Tech (${tag})`,
      createdAt,
      updatedAt: createdAt,
    })
  ).id;

  const teamId = (
    await addDoc(collection(db, COL.teams), {
      name: `Smoke Team (${tag})`,
      technicianIds: [techId],
      createdAt,
      updatedAt: createdAt,
    })
  ).id;

  // Validate team membership (mirrors UI logic)
  const teamSnap = await getDoc(doc(db, COL.teams, teamId));
  ensure(teamSnap.exists(), 'Team was not created');
  ensure((teamSnap.data()?.technicianIds ?? []).includes(techId), 'Technician not in team');

  const equipmentCategory = 'Hackathon Demo';

  const equipmentId = (
    await addDoc(collection(db, COL.equipment), {
      name: `Smoke Equipment (${tag})`,
      serialNumber: null,
      category: equipmentCategory,
      location: null,
      ownerType: null,
      ownerName: null,
      purchaseDate: null,
      warrantyUntil: null,
      defaultTeamId: teamId,
      defaultTechnicianId: techId,
      status: 'active',
      createdAt,
      updatedAt: createdAt,
    })
  ).id;

  // Request A: new -> in_progress -> repaired
  const requestAId = (
    await addDoc(collection(db, COL.requests), {
      type: 'corrective',
      subject: `Smoke Request A (${tag})`,
      description: null,
      equipmentId,
      equipmentCategory,
      teamId,
      technicianId: techId,
      scheduledAt: null,
      durationHours: null,
      status: 'new',
      createdAt,
      updatedAt: createdAt,
    })
  ).id;

  await updateDoc(doc(db, COL.requests, requestAId), {
    status: 'in_progress',
    updatedAt: nowIso(),
  });

  await updateDoc(doc(db, COL.requests, requestAId), {
    status: 'repaired',
    durationHours: 1.25,
    updatedAt: nowIso(),
  });

  const requestASnap = await getDoc(doc(db, COL.requests, requestAId));
  ensure(requestASnap.exists(), 'Request A missing after updates');
  ensure(requestASnap.data()?.status === 'repaired', 'Request A did not reach repaired');

  // Request B: new -> scrap (and scrap equipment)
  const requestBId = (
    await addDoc(collection(db, COL.requests), {
      type: 'corrective',
      subject: `Smoke Request B (${tag})`,
      description: null,
      equipmentId,
      equipmentCategory,
      teamId,
      technicianId: techId,
      scheduledAt: null,
      durationHours: null,
      status: 'new',
      createdAt,
      updatedAt: createdAt,
    })
  ).id;

  await updateDoc(doc(db, COL.requests, requestBId), {
    status: 'scrap',
    updatedAt: nowIso(),
  });

  await updateDoc(doc(db, COL.equipment, equipmentId), {
    status: 'scrapped',
    updatedAt: nowIso(),
  });

  const equipmentSnap = await getDoc(doc(db, COL.equipment, equipmentId));
  ensure(equipmentSnap.exists(), 'Equipment missing after scrap');
  ensure(equipmentSnap.data()?.status === 'scrapped', 'Equipment did not get scrapped');

  console.log('[smoke:web] OK');
  console.log('  techId:', techId);
  console.log('  teamId:', teamId);
  console.log('  equipmentId:', equipmentId);
  console.log('  requestAId:', requestAId, '(repaired)');
  console.log('  requestBId:', requestBId, '(scrap)');
}

run().catch(err => {
  console.error('[smoke:web] FAILED');
  console.error(err);
  process.exitCode = 1;
});
