import type { Firestore } from 'firebase-admin/firestore';

import { MaintenanceRepository } from './repository';
import type {
  CreateMaintenanceRequestInput,
  MaintenanceRequest,
  MaintenanceRequestStatus,
  UpdateMaintenanceRequestStatusInput,
} from './types';

const nowIso = (): string => new Date().toISOString();

function ensure(condition: boolean, message: string): asserts condition {
  if (condition !== true) throw new Error(message);
}

function ensureDefined<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) throw new Error(message);
}

const isTeamMember = (teamTechnicianIds: string[], technicianId: string): boolean => {
  return teamTechnicianIds.includes(technicianId);
};

export class MaintenanceService {
  private readonly repo: MaintenanceRepository;

  constructor(db: Firestore) {
    this.repo = new MaintenanceRepository(db);
  }

  async createRequest(input: CreateMaintenanceRequestInput): Promise<MaintenanceRequest> {
    const equipment = await this.repo.getEquipment(input.equipmentId);
    ensureDefined(equipment, 'Equipment not found');

    const teamId = equipment.defaultTeamId;
    ensureDefined(teamId, 'Equipment has no default maintenance team');
    ensure(teamId.trim().length > 0, 'Equipment has no default maintenance team');

    const team = await this.repo.getTeam(teamId);
    ensureDefined(team, 'Default maintenance team not found');

    const technicianId = input.technicianId ?? equipment.defaultTechnicianId;
    if (technicianId !== undefined) {
      ensure(
        isTeamMember(team.technicianIds, technicianId),
        'Technician is not a member of the assigned team'
      );
    }

    const createdAt = nowIso();

    return this.repo.createRequest({
      type: input.type,
      subject: input.subject,
      description: input.description,
      equipmentId: equipment.id,
      teamId: team.id,
      technicianId,
      scheduledAt: input.scheduledAt,
      durationHours: undefined,
      status: 'new',
      createdAt,
      updatedAt: createdAt,
    });
  }

  async updateRequestStatus(input: UpdateMaintenanceRequestStatusInput): Promise<void> {
    const request = await this.repo.getRequest(input.requestId);
    ensureDefined(request, 'Request not found');

    const team = await this.repo.getTeam(request.teamId);
    ensureDefined(team, 'Team not found');

    const next = input.nextStatus;
    const current = request.status;

    const allowed: Record<MaintenanceRequestStatus, MaintenanceRequestStatus[]> = {
      new: ['in_progress', 'scrap'],
      in_progress: ['repaired', 'scrap'],
      repaired: [],
      scrap: [],
    };

    ensure(allowed[current].includes(next), `Invalid status transition: ${current} -> ${next}`);

    if (next === 'in_progress') {
      const technicianId = input.technicianId ?? request.technicianId;
      ensureDefined(technicianId, 'Technician must be assigned to move to In Progress');
      ensure(
        isTeamMember(team.technicianIds, technicianId),
        'Technician is not a member of the assigned team'
      );

      await this.repo.updateRequest(request.id, {
        status: 'in_progress',
        technicianId,
      });
      return;
    }

    if (next === 'repaired') {
      ensure(
        typeof input.durationHours === 'number' && input.durationHours >= 0,
        'Duration hours is required'
      );

      await this.repo.updateRequest(request.id, {
        status: 'repaired',
        durationHours: input.durationHours,
      });
      return;
    }

    if (next === 'scrap') {
      await this.repo.updateRequest(request.id, { status: 'scrap' });
      await this.repo.markEquipmentScrapped(request.equipmentId);
      return;
    }
  }
}
