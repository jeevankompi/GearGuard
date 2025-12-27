import 'dotenv/config';

import { getFirestore } from '../firebase/firestore';
import { collections } from '../modules/maintenance/collections';
import { MaintenanceService } from '../modules/maintenance/service';

const run = async (): Promise<void> => {
  const db = getFirestore();
  const service = new MaintenanceService(db);

  const created = await service.createRequest({
    type: 'corrective',
    subject: 'Laptop is overheating',
    equipmentId: 'eq_laptop_001',
  });

  console.log('Created request:', created.id, created.status, created.teamId, created.technicianId);

  // Move to in progress
  await service.updateRequestStatus({
    requestId: created.id,
    nextStatus: 'in_progress',
  });

  // Move to repaired
  await service.updateRequestStatus({
    requestId: created.id,
    nextStatus: 'repaired',
    durationHours: 1.5,
  });

  const snap = await db.collection(collections.requests).doc(created.id).get();
  console.log('Final:', snap.data());
};

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
