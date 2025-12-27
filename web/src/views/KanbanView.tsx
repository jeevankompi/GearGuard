import './views.css';

import { useEffect, useMemo, useState } from 'react';

import {
  createMaintenanceRequest,
  listEquipment,
  listMaintenanceRequestsByStatus,
  listTeams,
  listTechnicians,
  moveRequestStatus,
  setRequestTechnician,
} from '../domain/firestore';
import type {
  Equipment,
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenanceType,
  Team,
  Technician,
} from '../domain/types';

type Props = {
  selectedEquipmentId?: string;
  onClearEquipmentFilter: () => void;
};

const STATUSES: MaintenanceStatus[] = ['new', 'in_progress', 'repaired', 'scrap'];

function statusTitle(status: MaintenanceStatus): string {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'scrap') return 'Scrap';
  return status[0].toUpperCase() + status.slice(1);
}

function toDateOnlyIso(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function isOverdue(request: MaintenanceRequest): boolean {
  if (request.status !== 'new' && request.status !== 'in_progress') return false;
  if (!request.scheduledAt) return false;
  const scheduled = new Date(toDateOnlyIso(request.scheduledAt));
  if (Number.isNaN(scheduled.getTime())) return false;
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return scheduled.getTime() < todayDate.getTime();
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/g).filter(Boolean);
  if (parts.length === 0) return '—';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

type DragPayload = { requestId: string; from: MaintenanceStatus };

export function KanbanView(props: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dragOver, setDragOver] = useState<MaintenanceStatus | null>(null);
  const [durationByRequestId, setDurationByRequestId] = useState<Record<string, string>>({});

  const [equipmentById, setEquipmentById] = useState<Record<string, Equipment>>({});
  const [teamById, setTeamById] = useState<Record<string, Team>>({});
  const [technicianById, setTechnicianById] = useState<Record<string, Technician>>({});

  const [createEquipmentId, setCreateEquipmentId] = useState<string>('');
  const [createType, setCreateType] = useState<MaintenanceType>('corrective');
  const [createSubject, setCreateSubject] = useState<string>('New request');
  const [createScheduledAt, setCreateScheduledAt] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');

  const [byStatus, setByStatus] = useState<Record<MaintenanceStatus, MaintenanceRequest[]>>({
    new: [],
    in_progress: [],
    repaired: [],
    scrap: [],
  });

  const equipmentFilterLabel = useMemo(() => {
    if (!props.selectedEquipmentId) return null;
    const eq = equipmentById[props.selectedEquipmentId];
    return `Equipment: ${eq ? eq.name : props.selectedEquipmentId}`;
  }, [equipmentById, props.selectedEquipmentId]);

  const equipmentList = useMemo(() => {
    return Object.values(equipmentById).sort((a, b) => a.name.localeCompare(b.name));
  }, [equipmentById]);

  async function loadLookups() {
    try {
      const [equipment, teams, techs] = await Promise.all([
        listEquipment(),
        listTeams(),
        listTechnicians(),
      ]);
      setEquipmentById(Object.fromEntries(equipment.map(e => [e.id, e])));
      setTeamById(Object.fromEntries(teams.map(t => [t.id, t])));
      setTechnicianById(Object.fromEntries(techs.map(t => [t.id, t])));

      setCreateEquipmentId(
        current => current || props.selectedEquipmentId || equipment[0]?.id || ''
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        STATUSES.map(async status => ({
          status,
          items: await listMaintenanceRequestsByStatus(status, {
            equipmentId: props.selectedEquipmentId,
          }),
        }))
      );

      const next = { new: [], in_progress: [], repaired: [], scrap: [] } as Record<
        MaintenanceStatus,
        MaintenanceRequest[]
      >;
      for (const r of results) next[r.status] = r.items;
      setByStatus(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLookups();
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedEquipmentId]);

  useEffect(() => {
    const onDataChanged = () => {
      void refresh();
    };
    window.addEventListener('gg:data-changed', onDataChanged);
    return () => window.removeEventListener('gg:data-changed', onDataChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedEquipmentId]);

  useEffect(() => {
    if (props.selectedEquipmentId) {
      setCreateEquipmentId(props.selectedEquipmentId);
    }
  }, [props.selectedEquipmentId]);

  async function onCreate() {
    try {
      setError(null);
      const equipmentId = createEquipmentId;
      if (!equipmentId) throw new Error('Pick equipment');
      const subject = createSubject.trim();
      if (!subject) throw new Error('Enter a subject');
      if (createType === 'preventive' && !createScheduledAt.trim()) {
        throw new Error('Scheduled date is required for preventive requests');
      }

      await createMaintenanceRequest({
        subject,
        type: createType,
        equipmentId,
        scheduledAt: createScheduledAt.trim() ? createScheduledAt.trim() : undefined,
        description: createDescription.trim() ? createDescription.trim() : undefined,
      });

      setCreateDescription('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onMove(request: MaintenanceRequest, next: MaintenanceStatus) {
    try {
      setError(null);
      if (next === 'repaired') {
        const raw = durationByRequestId[request.id];
        const value = raw ? Number(raw) : Number.NaN;
        await moveRequestStatus(request.id, next, { durationHours: value });
      } else if (next === 'in_progress') {
        await moveRequestStatus(request.id, next, { technicianId: request.technicianId });
      } else {
        await moveRequestStatus(request.id, next);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function onCardDragStart(
    ev: React.DragEvent<HTMLDivElement>,
    from: MaintenanceStatus,
    requestId: string
  ) {
    const payload: DragPayload = { requestId, from };
    ev.dataTransfer.setData('text/plain', JSON.stringify(payload));
    ev.dataTransfer.effectAllowed = 'move';
  }

  async function onColumnDrop(ev: React.DragEvent<HTMLDivElement>, target: MaintenanceStatus) {
    ev.preventDefault();
    setDragOver(null);
    try {
      const raw = ev.dataTransfer.getData('text/plain');
      const payload = JSON.parse(raw) as DragPayload;
      const from = payload.from;
      const requestId = payload.requestId;

      if (from === target) return;

      const found = byStatus[from].find(r => r.id === requestId);
      if (!found) return;

      await onMove(found, target);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onAssignTechnician(request: MaintenanceRequest, technicianId: string) {
    try {
      setError(null);
      await setRequestTechnician(request.id, technicianId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className="gg-view">
      <div className="gg-row gg-row--space">
        <div className="gg-muted">{equipmentFilterLabel ?? 'All equipment'}</div>
        <div className="gg-row">
          {props.selectedEquipmentId ? (
            <button
              className="gg-button gg-button--secondary"
              onClick={props.onClearEquipmentFilter}
            >
              Clear filter
            </button>
          ) : null}
          <button className="gg-button gg-button--secondary" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="gg-group">
        <div className="gg-group__title">Create request</div>
        <div className="gg-row">
          <div className="gg-muted">Equipment</div>
          <select
            className="gg-select"
            value={createEquipmentId}
            onChange={e => setCreateEquipmentId(e.target.value)}
            disabled={Boolean(props.selectedEquipmentId)}
          >
            {equipmentList.map(eq => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>

          <div className="gg-muted">Type</div>
          <select
            className="gg-select"
            value={createType}
            onChange={e => setCreateType(e.target.value as MaintenanceType)}
          >
            <option value="corrective">Corrective</option>
            <option value="preventive">Preventive</option>
          </select>

          <div className="gg-muted">Subject</div>
          <input
            className="gg-input"
            value={createSubject}
            onChange={e => setCreateSubject(e.target.value)}
          />

          <div className="gg-muted">Scheduled</div>
          <input
            className="gg-input"
            type="date"
            value={createScheduledAt}
            onChange={e => setCreateScheduledAt(e.target.value)}
            placeholder="YYYY-MM-DD"
          />

          <button className="gg-button" onClick={() => void onCreate()}>
            Create
          </button>
        </div>

        <div className="gg-row">
          <div className="gg-muted">Description</div>
          <textarea
            className="gg-textarea"
            value={createDescription}
            onChange={e => setCreateDescription(e.target.value)}
            placeholder="Optional details (e.g., leaking oil, unusual noise…)"
          />
        </div>
        {props.selectedEquipmentId ? (
          <div className="gg-muted">Equipment is locked by the current filter.</div>
        ) : null}
      </div>

      {error ? <div className="gg-error">{error}</div> : null}
      {loading ? <div className="gg-muted">Loading…</div> : null}

      <div className="gg-kanban">
        {STATUSES.map(status => (
          <div
            key={status}
            className={dragOver === status ? 'gg-column gg-column--dragover' : 'gg-column'}
          >
            <div className="gg-column__header">{statusTitle(status)}</div>
            <div
              className="gg-column__body"
              onDragOver={ev => {
                ev.preventDefault();
                ev.dataTransfer.dropEffect = 'move';
              }}
              onDragEnter={() => setDragOver(status)}
              onDragLeave={() => setDragOver(current => (current === status ? null : current))}
              onDrop={ev => void onColumnDrop(ev, status)}
            >
              {byStatus[status].length === 0 ? <div className="gg-muted">No items</div> : null}
              {byStatus[status].map(r => (
                <div
                  key={r.id}
                  className={isOverdue(r) ? 'gg-card gg-card--overdue' : 'gg-card'}
                  draggable={status !== 'repaired' && status !== 'scrap'}
                  onDragStart={ev => onCardDragStart(ev, status, r.id)}
                >
                  <div className="gg-card__top">
                    <div className="gg-card__title">{r.subject}</div>
                    <div
                      className="gg-card__avatar"
                      title={
                        r.technicianId ? technicianById[r.technicianId]?.displayName : 'Unassigned'
                      }
                    >
                      {r.technicianId && technicianById[r.technicianId] ? (
                        <div className="gg-avatar">
                          {initialsFromName(technicianById[r.technicianId].displayName)}
                        </div>
                      ) : (
                        <div className="gg-avatar gg-avatar--empty">—</div>
                      )}
                    </div>
                  </div>

                  <div className="gg-card__meta">
                    <span className="gg-chip">{r.type}</span>
                    {equipmentById[r.equipmentId] ? (
                      <span className="gg-chip">{equipmentById[r.equipmentId].name}</span>
                    ) : null}
                    {r.scheduledAt ? (
                      <span className="gg-chip">{toDateOnlyIso(r.scheduledAt)}</span>
                    ) : null}
                    {isOverdue(r) ? <span className="gg-chip gg-chip--danger">Overdue</span> : null}
                  </div>

                  {status !== 'repaired' && status !== 'scrap' && teamById[r.teamId] ? (
                    <div className="gg-row">
                      <div className="gg-muted">Technician</div>
                      <select
                        className="gg-select"
                        value={r.technicianId ?? ''}
                        onChange={ev => {
                          const v = ev.target.value;
                          if (v) void onAssignTechnician(r, v);
                        }}
                      >
                        <option value="">Unassigned</option>
                        {teamById[r.teamId].technicianIds.map(id => (
                          <option key={id} value={id}>
                            {technicianById[id]?.displayName ?? id}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {status === 'in_progress' ? (
                    <div className="gg-row">
                      <div className="gg-muted">Hours</div>
                      <input
                        className="gg-input"
                        inputMode="decimal"
                        type="number"
                        min={0}
                        step={0.25}
                        value={durationByRequestId[r.id] ?? ''}
                        onChange={ev =>
                          setDurationByRequestId(curr => ({ ...curr, [r.id]: ev.target.value }))
                        }
                        placeholder="e.g. 1.5"
                      />
                    </div>
                  ) : null}

                  <div className="gg-card__actions">
                    {status === 'new' ? (
                      <button className="gg-link" onClick={() => void onMove(r, 'in_progress')}>
                        Start
                      </button>
                    ) : null}
                    {status === 'in_progress' ? (
                      <button className="gg-link" onClick={() => void onMove(r, 'repaired')}>
                        Mark repaired
                      </button>
                    ) : null}
                    {status === 'new' || status === 'in_progress' ? (
                      <button
                        className="gg-link gg-link--danger"
                        onClick={() => void onMove(r, 'scrap')}
                      >
                        Scrap
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="gg-footnote gg-muted">
        Status changes are validated (New → In Progress → Repaired; Scrap from New/In Progress).
      </div>
    </section>
  );
}
