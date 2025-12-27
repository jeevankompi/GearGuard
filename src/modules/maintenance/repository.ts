import type { Firestore } from 'firebase-admin/firestore';

import { collections } from './collections';
import type { Equipment, MaintenanceRequest, MaintenanceTeam, Technician } from './types';

const nowIso = (): string => new Date().toISOString();

export class MaintenanceRepository {
  constructor(private readonly db: Firestore) {}

  async getEquipment(id: string): Promise<Equipment | undefined> {
    const snap = await this.db.collection(collections.equipment).doc(id).get();
    if (!snap.exists) return undefined;
    return { id: snap.id, ...(snap.data() as Omit<Equipment, 'id'>) };
  }

  async getTeam(id: string): Promise<MaintenanceTeam | undefined> {
    const snap = await this.db.collection(collections.teams).doc(id).get();
    if (!snap.exists) return undefined;
    return { id: snap.id, ...(snap.data() as Omit<MaintenanceTeam, 'id'>) };
  }

  async getTechnician(id: string): Promise<Technician | undefined> {
    const snap = await this.db.collection(collections.technicians).doc(id).get();
    if (!snap.exists) return undefined;
    return { id: snap.id, ...(snap.data() as Omit<Technician, 'id'>) };
  }

  async createRequest(data: Omit<MaintenanceRequest, 'id'>): Promise<MaintenanceRequest> {
    const ref = this.db.collection(collections.requests).doc();
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  async getRequest(id: string): Promise<MaintenanceRequest | undefined> {
    const snap = await this.db.collection(collections.requests).doc(id).get();
    if (!snap.exists) return undefined;
    return { id: snap.id, ...(snap.data() as Omit<MaintenanceRequest, 'id'>) };
  }

  async updateRequest(id: string, patch: Partial<Omit<MaintenanceRequest, 'id'>>): Promise<void> {
    await this.db
      .collection(collections.requests)
      .doc(id)
      .set({ ...patch, updatedAt: nowIso() }, { merge: true });
  }

  async markEquipmentScrapped(equipmentId: string): Promise<void> {
    await this.db.collection(collections.equipment).doc(equipmentId).set(
      {
        status: 'scrapped',
        updatedAt: nowIso(),
      },
      { merge: true }
    );
  }
}
