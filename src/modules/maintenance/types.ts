export type MaintenanceRequestType = 'corrective' | 'preventive';

export type MaintenanceRequestStatus = 'new' | 'in_progress' | 'repaired' | 'scrap';

export interface Technician {
  id: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface MaintenanceTeam {
  id: string;
  name: string;
  technicianIds: string[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type EquipmentOwnerType = 'department' | 'employee';

export type EquipmentStatus = 'active' | 'scrapped';

export interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  purchaseDate?: string; // ISO date
  warrantyUntil?: string; // ISO date
  location?: string;
  ownerType?: EquipmentOwnerType;
  ownerName?: string;
  defaultTeamId?: string;
  defaultTechnicianId?: string;
  status: EquipmentStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface MaintenanceRequest {
  id: string;
  type: MaintenanceRequestType;
  subject: string;
  description?: string;
  equipmentId: string;
  teamId: string;
  technicianId?: string;
  scheduledAt?: string; // ISO
  durationHours?: number;
  status: MaintenanceRequestStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface CreateMaintenanceRequestInput {
  type: MaintenanceRequestType;
  subject: string;
  description?: string;
  equipmentId: string;
  scheduledAt?: string;
  technicianId?: string;
}

export interface UpdateMaintenanceRequestStatusInput {
  requestId: string;
  nextStatus: MaintenanceRequestStatus;
  technicianId?: string;
  durationHours?: number;
}
