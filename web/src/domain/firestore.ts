import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';

import { getDb } from '../firebase/db';
import type { Equipment, MaintenanceRequest, Team, Technician } from './types';

const COLLECTIONS = {
  equipment: 'equipment',
  teams: 'maintenanceTeams',
  technicians: 'technicians',
  maintenanceRequests: 'maintenanceRequests',
} as const;

const nowIso = (): string => new Date().toISOString();

const DEFAULT_TIMEOUT_MS = 4500;

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function withTimeout<T>(promise: Promise<T>, label: string, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out. Database not reachable.`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function enhanceDbError(label: string, e: unknown): Error {
  const msg = toErrorMessage(e);
  const lower = msg.toLowerCase();

  // Typical when emulators aren't running or Firestore is unreachable.
  const likelyUnreachable =
    lower.includes('unavailable') ||
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('timed out') ||
    lower.includes('offline') ||
    lower.includes('client is offline');

  if (!likelyUnreachable) return new Error(`${label} failed: ${msg}`);

  return new Error(
    `${label} failed: database is unreachable.\n` +
      `- If you're using emulators: install Java (JDK 11/17) and run the root script "emulators" (Auth 9099, Firestore 8080), then run "seed".\n` +
      `- If you're using real Firebase: set all VITE_FIREBASE_* variables (apiKey/authDomain/projectId/storageBucket/messagingSenderId/appId).`
  );
}

function fromDoc<T extends { id: string }>(id: string, data: DocumentData): T {
  return { id, ...(data as Omit<T, 'id'>) } as T;
}

function notifyDataChanged(): void {
  // Cross-view refresh hook. Only runs in the browser.
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('gg:data-changed'));
}

export async function listEquipment(): Promise<Equipment[]> {
  try {
    const snap = await withTimeout(
      getDocs(
        query(collection(getDb(), COLLECTIONS.equipment), orderBy('name', 'asc'), limit(100))
      ),
      'Load equipment'
    );
    return snap.docs.map(d => fromDoc<Equipment>(d.id, d.data()));
  } catch (e) {
    throw enhanceDbError('Load equipment', e);
  }
}

export async function listTeams(): Promise<Team[]> {
  try {
    const snap = await withTimeout(
      getDocs(query(collection(getDb(), COLLECTIONS.teams), orderBy('name', 'asc'), limit(100))),
      'Load teams'
    );
    return snap.docs.map(d => fromDoc<Team>(d.id, d.data()));
  } catch (e) {
    throw enhanceDbError('Load teams', e);
  }
}

export async function createTeam(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Team name is required');
  try {
    const created = await withTimeout(
      addDoc(collection(getDb(), COLLECTIONS.teams), {
        name: trimmed,
        technicianIds: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }),
      'Create team'
    );
    notifyDataChanged();
    return created.id;
  } catch (e) {
    throw enhanceDbError('Create team', e);
  }
}

export async function setTeamTechnicians(teamId: string, technicianIds: string[]): Promise<void> {
  try {
    const teamRef = doc(getDb(), COLLECTIONS.teams, teamId);
    await withTimeout(
      updateDoc(teamRef, {
        technicianIds,
        updatedAt: nowIso(),
      }),
      'Update team members'
    );
    notifyDataChanged();
  } catch (e) {
    throw enhanceDbError('Update team members', e);
  }
}

export async function listTechnicians(): Promise<Technician[]> {
  try {
    const snap = await withTimeout(
      getDocs(
        query(
          collection(getDb(), COLLECTIONS.technicians),
          orderBy('displayName', 'asc'),
          limit(200)
        )
      ),
      'Load technicians'
    );
    return snap.docs.map(d => fromDoc<Technician>(d.id, d.data()));
  } catch (e) {
    throw enhanceDbError('Load technicians', e);
  }
}

export async function createTechnician(displayName: string): Promise<string> {
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error('Technician name is required');
  try {
    const createdAt = nowIso();
    const created = await withTimeout(
      addDoc(collection(getDb(), COLLECTIONS.technicians), {
        displayName: trimmed,
        createdAt,
        updatedAt: createdAt,
      }),
      'Create technician'
    );
    notifyDataChanged();
    return created.id;
  } catch (e) {
    throw enhanceDbError('Create technician', e);
  }
}

export async function createEquipment(input: {
  name: string;
  serialNumber?: string;
  category: string;
  location?: string;
  ownerType?: Equipment['ownerType'];
  ownerName?: string;
  purchaseDate?: string;
  warrantyUntil?: string;
  defaultTeamId: string;
  defaultTechnicianId: string;
}): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Equipment name is required');

  const category = input.category.trim();
  if (!category) throw new Error('Equipment category is required');

  const teamId = input.defaultTeamId.trim();
  if (!teamId) throw new Error('Default maintenance team is required');

  const defaultTechnicianId = input.defaultTechnicianId.trim();
  if (!defaultTechnicianId) throw new Error('Default technician is required');

  // Validate tech membership.
  try {
    const teamRef = doc(getDb(), COLLECTIONS.teams, teamId);
    const teamSnap = await withTimeout(getDoc(teamRef), 'Load team', 3500);
    if (!teamSnap.exists()) throw new Error('Team not found');
    const team = fromDoc<Team>(teamSnap.id, teamSnap.data());
    if (!team.technicianIds.includes(defaultTechnicianId)) {
      throw new Error('Default technician must be a member of the selected team');
    }
  } catch (e) {
    throw enhanceDbError('Create equipment', e);
  }

  try {
    const createdAt = nowIso();
    const created = await withTimeout(
      addDoc(collection(getDb(), COLLECTIONS.equipment), {
        name,
        serialNumber: input.serialNumber?.trim() || null,
        category,
        location: input.location?.trim() || null,
        ownerType: input.ownerType ?? null,
        ownerName: input.ownerName?.trim() || null,
        purchaseDate: input.purchaseDate?.trim() || null,
        warrantyUntil: input.warrantyUntil?.trim() || null,
        defaultTeamId: teamId,
        defaultTechnicianId,
        status: 'active',
        createdAt,
        updatedAt: createdAt,
      }),
      'Create equipment'
    );
    notifyDataChanged();
    return created.id;
  } catch (e) {
    throw enhanceDbError('Create equipment', e);
  }
}

export async function listMaintenanceRequestsByStatus(
  status: MaintenanceRequest['status'],
  opts?: { equipmentId?: string }
): Promise<MaintenanceRequest[]> {
  try {
    const base = collection(getDb(), COLLECTIONS.maintenanceRequests);

    const filters: QueryConstraint[] = [where('status', '==', status)];
    if (opts?.equipmentId) {
      filters.push(where('equipmentId', '==', opts.equipmentId));
    }

    const snap = await withTimeout(
      getDocs(query(base, ...filters, orderBy('updatedAt', 'desc'), limit(200))),
      'Load requests'
    );
    return snap.docs.map(d => fromDoc<MaintenanceRequest>(d.id, d.data()));
  } catch (e) {
    throw enhanceDbError('Load requests', e);
  }
}

export async function listPreventiveRequestsByScheduledAt(): Promise<MaintenanceRequest[]> {
  try {
    const base = collection(getDb(), COLLECTIONS.maintenanceRequests);
    const snap = await withTimeout(
      getDocs(
        query(base, where('type', '==', 'preventive'), orderBy('scheduledAt', 'asc'), limit(200))
      ),
      'Load preventive requests'
    );
    return snap.docs.map(d => fromDoc<MaintenanceRequest>(d.id, d.data()));
  } catch (e) {
    throw enhanceDbError('Load preventive requests', e);
  }
}

export async function listOpenMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  try {
    const base = collection(getDb(), COLLECTIONS.maintenanceRequests);
    const snap = await withTimeout(
      getDocs(query(base, where('status', 'in', ['new', 'in_progress']), limit(500))),
      'Load open requests'
    );
    return snap.docs.map(d => fromDoc<MaintenanceRequest>(d.id, d.data()));
  } catch (e) {
    throw enhanceDbError('Load open requests', e);
  }
}

export async function listAllMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  try {
    const base = collection(getDb(), COLLECTIONS.maintenanceRequests);
    const snap = await withTimeout(
      getDocs(query(base, orderBy('updatedAt', 'desc'), limit(500))),
      'Load all requests'
    );
    return snap.docs.map(d => fromDoc<MaintenanceRequest>(d.id, d.data()));
  } catch (e) {
    throw enhanceDbError('Load all requests', e);
  }
}

export async function createMaintenanceRequest(input: {
  subject: string;
  type: MaintenanceRequest['type'];
  equipmentId: string;
  technicianId?: string;
  scheduledAt?: string;
  description?: string;
}): Promise<string> {
  let eq: Equipment;
  try {
    const eqRef = doc(getDb(), COLLECTIONS.equipment, input.equipmentId);
    const eqSnap = await withTimeout(getDoc(eqRef), 'Load equipment', 3500);
    if (!eqSnap.exists()) throw new Error('Equipment not found');
    eq = fromDoc<Equipment>(eqSnap.id, eqSnap.data());
  } catch (e) {
    throw enhanceDbError('Create request', e);
  }

  const teamId = eq.defaultTeamId;
  if (!teamId || teamId.trim().length === 0) {
    throw new Error('Equipment has no default maintenance team');
  }

  const technicianId = input.technicianId ?? eq.defaultTechnicianId;
  if (!technicianId || technicianId.trim().length === 0) {
    throw new Error('Equipment has no default technician');
  }

  let team: Team;
  try {
    const teamRef = doc(getDb(), COLLECTIONS.teams, teamId);
    const teamSnap = await withTimeout(getDoc(teamRef), 'Load team', 3500);
    if (!teamSnap.exists()) throw new Error('Team not found');
    team = fromDoc<Team>(teamSnap.id, teamSnap.data());
  } catch (e) {
    throw enhanceDbError('Create request', e);
  }

  if (!team.technicianIds.includes(technicianId)) {
    throw new Error('Technician is not a member of the assigned team');
  }

  try {
    const createdAt = nowIso();
    const created = await withTimeout(
      addDoc(collection(getDb(), COLLECTIONS.maintenanceRequests), {
        type: input.type,
        subject: input.subject,
        description: input.description ?? null,
        equipmentId: input.equipmentId,
        equipmentCategory: eq.category ?? 'Uncategorized',
        teamId,
        technicianId,
        scheduledAt: input.scheduledAt ?? null,
        durationHours: null,
        status: 'new',
        createdAt,
        updatedAt: createdAt,
      }),
      'Create request'
    );

    notifyDataChanged();

    return created.id;
  } catch (e) {
    throw enhanceDbError('Create request', e);
  }
}

export async function moveRequestStatus(
  requestId: string,
  next: MaintenanceRequest['status'],
  opts?: { technicianId?: string; durationHours?: number }
): Promise<void> {
  let req: MaintenanceRequest;
  const reqRef = doc(getDb(), COLLECTIONS.maintenanceRequests, requestId);
  try {
    const reqSnap = await withTimeout(getDoc(reqRef), 'Load request', 3500);
    if (!reqSnap.exists()) throw new Error('Request not found');
    req = fromDoc<MaintenanceRequest>(reqSnap.id, reqSnap.data());
  } catch (e) {
    throw enhanceDbError('Update request', e);
  }
  const prev = req.status;

  // Same workflow rules as backend service layer.
  const allowed: Record<MaintenanceRequest['status'], Set<MaintenanceRequest['status']>> = {
    new: new Set(['in_progress', 'scrap']),
    in_progress: new Set(['repaired', 'scrap']),
    repaired: new Set([]),
    scrap: new Set([]),
  };

  if (!allowed[prev].has(next)) {
    throw new Error(`Invalid status transition: ${prev} -> ${next}`);
  }

  const patch: Record<string, unknown> = {
    status: next,
    updatedAt: nowIso(),
  };

  if (next === 'in_progress') {
    const technicianId = opts?.technicianId ?? req.technicianId;
    if (!technicianId) {
      throw new Error('Assign a technician before moving to In Progress');
    }
    patch.technicianId = technicianId;
  }

  if (next === 'repaired') {
    const durationHours = opts?.durationHours;
    if (typeof durationHours !== 'number' || durationHours < 0) {
      throw new Error('Duration hours is required to mark as Repaired');
    }
    patch.durationHours = durationHours;
  }

  try {
    await withTimeout(updateDoc(reqRef, patch), 'Update request');
  } catch (e) {
    throw enhanceDbError('Update request', e);
  }

  notifyDataChanged();

  if (next === 'scrap') {
    try {
      const eqRef = doc(getDb(), COLLECTIONS.equipment, req.equipmentId);
      await withTimeout(
        updateDoc(eqRef, { status: 'scrapped', updatedAt: nowIso() }),
        'Scrap equipment'
      );
      notifyDataChanged();
    } catch (e) {
      throw enhanceDbError('Scrap equipment', e);
    }
  }
}

export async function setRequestTechnician(requestId: string, technicianId: string): Promise<void> {
  let req: MaintenanceRequest;
  const reqRef = doc(getDb(), COLLECTIONS.maintenanceRequests, requestId);
  try {
    const reqSnap = await withTimeout(getDoc(reqRef), 'Load request', 3500);
    if (!reqSnap.exists()) throw new Error('Request not found');
    req = fromDoc<MaintenanceRequest>(reqSnap.id, reqSnap.data());
  } catch (e) {
    throw enhanceDbError('Assign technician', e);
  }

  let team: Team;
  try {
    const teamRef = doc(getDb(), COLLECTIONS.teams, req.teamId);
    const teamSnap = await withTimeout(getDoc(teamRef), 'Load team', 3500);
    if (!teamSnap.exists()) throw new Error('Team not found');
    team = fromDoc<Team>(teamSnap.id, teamSnap.data());
  } catch (e) {
    throw enhanceDbError('Assign technician', e);
  }

  if (!team.technicianIds.includes(technicianId)) {
    throw new Error('Technician is not a member of the assigned team');
  }

  try {
    await withTimeout(
      updateDoc(reqRef, {
        technicianId,
        updatedAt: nowIso(),
      }),
      'Assign technician'
    );
    notifyDataChanged();
  } catch (e) {
    throw enhanceDbError('Assign technician', e);
  }
}
