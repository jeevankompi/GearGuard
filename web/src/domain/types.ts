export type MaintenanceStatus = 'new' | 'in_progress' | 'repaired' | 'scrap';
export type MaintenanceType = 'corrective' | 'preventive';

export type Team = {
  id: string;
  name: string;
  technicianIds: string[];
};

export type Technician = {
  id: string;
  displayName: string;
  avatarUrl?: string;
};

export type Equipment = {
  id: string;
  name: string;
  serialNumber?: string;
  defaultTeamId?: string;
  defaultTechnicianId?: string;
  category?: string;
  location?: string;
  ownerType?: 'department' | 'employee';
  ownerName?: string;
  purchaseDate?: string;
  warrantyUntil?: string;
  status: 'active' | 'scrapped';
};

export type MaintenanceRequest = {
  id: string;
  subject: string;
  description?: string;
  type: MaintenanceType;
  status: MaintenanceStatus;

  equipmentId: string;
  equipmentCategory?: string;
  teamId: string;
  technicianId?: string;

  scheduledAt?: string; // ISO date or datetime
  durationHours?: number;

  createdAt?: string;
  updatedAt?: string;
};
