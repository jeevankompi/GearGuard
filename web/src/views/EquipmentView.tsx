import './views.css';

import { useEffect, useMemo, useState } from 'react';

import {
  createEquipment,
  listEquipment,
  listOpenMaintenanceRequests,
  listTeams,
  listTechnicians,
} from '../domain/firestore';
import type { Equipment, Team, Technician } from '../domain/types';

type Props = {
  onOpenMaintenance: (equipmentId: string) => void;
};

export function EquipmentView(props: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Equipment[]>([]);
  const [openCountByEquipmentId, setOpenCountByEquipmentId] = useState<Record<string, number>>({});

  const [queryText, setQueryText] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'department' | 'employee'>('all');

  const [teamNameById, setTeamNameById] = useState<Record<string, string>>({});
  const [technicianNameById, setTechnicianNameById] = useState<Record<string, string>>({});

  const [teams, setTeams] = useState<Team[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newOwnerType, setNewOwnerType] = useState<'department' | 'employee'>('department');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPurchaseDate, setNewPurchaseDate] = useState('');
  const [newWarrantyUntil, setNewWarrantyUntil] = useState('');
  const [newDefaultTeamId, setNewDefaultTeamId] = useState('');
  const [newDefaultTechnicianId, setNewDefaultTechnicianId] = useState('');

  const toDateOnly = (value?: string): string => {
    if (!value) return '—';
    return value.length >= 10 ? value.slice(0, 10) : value;
  };

  const visibleItems = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return items.filter(eq => {
      if (ownerFilter !== 'all' && eq.ownerType !== ownerFilter) return false;
      if (!q) return true;

      const teamName = eq.defaultTeamId ? (teamNameById[eq.defaultTeamId] ?? eq.defaultTeamId) : '';
      const techName = eq.defaultTechnicianId
        ? (technicianNameById[eq.defaultTechnicianId] ?? eq.defaultTechnicianId)
        : '';
      const hay = [
        eq.name,
        eq.serialNumber ?? '',
        eq.location ?? '',
        eq.category ?? '',
        eq.ownerType ?? '',
        eq.ownerName ?? '',
        teamName,
        techName,
        eq.purchaseDate ?? '',
        eq.warrantyUntil ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, ownerFilter, queryText, teamNameById, technicianNameById]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [list, open, teams, techs] = await Promise.all([
        listEquipment(),
        listOpenMaintenanceRequests(),
        listTeams(),
        listTechnicians(),
      ]);
      setItems(list);

      setTeams(teams);
      setTechnicians(techs);

      setNewDefaultTeamId(current => {
        if (current && teams.some(t => t.id === current)) return current;
        return teams[0]?.id || '';
      });

      setTeamNameById(Object.fromEntries(teams.map(t => [t.id, t.name])));
      setTechnicianNameById(Object.fromEntries(techs.map(t => [t.id, t.displayName])));

      const counts: Record<string, number> = {};
      for (const r of open) {
        counts[r.equipmentId] = (counts[r.equipmentId] ?? 0) + 1;
      }
      setOpenCountByEquipmentId(counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const onDataChanged = () => {
      void refresh();
    };
    window.addEventListener('gg:data-changed', onDataChanged);
    return () => window.removeEventListener('gg:data-changed', onDataChanged);
  }, []);

  const eligibleTechniciansForNewTeam = useMemo(() => {
    const team = teams.find(t => t.id === newDefaultTeamId);
    if (!team) return [];
    const ids = new Set(team.technicianIds);
    return technicians.filter(t => ids.has(t.id));
  }, [newDefaultTeamId, teams, technicians]);

  useEffect(() => {
    // Keep selected technician valid for current team; auto-pick when needed.
    const hasSelected = Boolean(newDefaultTechnicianId);
    const selectedValid = hasSelected
      ? eligibleTechniciansForNewTeam.some(t => t.id === newDefaultTechnicianId)
      : false;

    if (hasSelected && !selectedValid) {
      setNewDefaultTechnicianId('');
      return;
    }

    if (!hasSelected && eligibleTechniciansForNewTeam.length > 0) {
      setNewDefaultTechnicianId(eligibleTechniciansForNewTeam[0].id);
    }
  }, [eligibleTechniciansForNewTeam, newDefaultTechnicianId]);

  const canCreate =
    !creating &&
    newName.trim().length > 0 &&
    newCategory.trim().length > 0 &&
    newDefaultTeamId.trim().length > 0 &&
    newDefaultTechnicianId.trim().length > 0;

  const createBlocker = useMemo(() => {
    if (teams.length === 0) return 'Create a team first (Teams tab).';
    if (technicians.length === 0) return 'Create a technician first (Teams tab).';
    if (!newDefaultTeamId.trim()) return 'Pick a default team.';
    if (eligibleTechniciansForNewTeam.length === 0)
      return 'Selected team has no technicians. Add technicians to the team (Teams tab).';
    if (!newName.trim()) return 'Equipment name is required.';
    if (!newCategory.trim()) return 'Equipment category is required.';
    if (!newDefaultTechnicianId.trim()) return 'Pick a default technician.';
    return null;
  }, [
    eligibleTechniciansForNewTeam.length,
    newCategory,
    newDefaultTeamId,
    newDefaultTechnicianId,
    newName,
    teams.length,
    technicians.length,
  ]);

  async function onCreateEquipment() {
    try {
      setError(null);
      setCreating(true);
      await createEquipment({
        name: newName,
        serialNumber: newSerial || undefined,
        category: newCategory,
        location: newLocation || undefined,
        ownerType: newOwnerName.trim() ? newOwnerType : undefined,
        ownerName: newOwnerName || undefined,
        purchaseDate: newPurchaseDate || undefined,
        warrantyUntil: newWarrantyUntil || undefined,
        defaultTeamId: newDefaultTeamId,
        defaultTechnicianId: newDefaultTechnicianId,
      });

      setNewName('');
      setNewSerial('');
      setNewCategory('');
      setNewLocation('');
      setNewOwnerName('');
      setNewPurchaseDate('');
      setNewWarrantyUntil('');
      setNewDefaultTechnicianId('');

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="gg-view">
      <div className="gg-row gg-row--space">
        <div>
          <div className="gg-muted">Track equipment ownership and related maintenance.</div>
          <div className="gg-row">
            <input
              className="gg-input"
              value={queryText}
              onChange={e => setQueryText(e.target.value)}
              placeholder="Search equipment…"
            />
            <select
              className="gg-select"
              value={ownerFilter}
              onChange={e => setOwnerFilter(e.target.value as 'all' | 'department' | 'employee')}
            >
              <option value="all">All owners</option>
              <option value="department">Department</option>
              <option value="employee">Employee</option>
            </select>
          </div>
        </div>
        <button className="gg-button gg-button--secondary" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      <div className="gg-group">
        <div className="gg-group__title">Create equipment</div>
        <div className="gg-row">
          <div className="gg-muted">Name</div>
          <input
            className="gg-input"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Generator"
          />

          <div className="gg-muted">Serial</div>
          <input
            className="gg-input"
            value={newSerial}
            onChange={e => setNewSerial(e.target.value)}
            placeholder="Optional"
          />

          <div className="gg-muted">Category</div>
          <input
            className="gg-input"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="Required (e.g. Computers)"
          />

          <div className="gg-muted">Location</div>
          <input
            className="gg-input"
            value={newLocation}
            onChange={e => setNewLocation(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="gg-row">
          <div className="gg-muted">Owner</div>
          <select
            className="gg-select"
            value={newOwnerType}
            onChange={e => setNewOwnerType(e.target.value as 'department' | 'employee')}
          >
            <option value="department">Department</option>
            <option value="employee">Employee</option>
          </select>
          <input
            className="gg-input"
            value={newOwnerName}
            onChange={e => setNewOwnerName(e.target.value)}
            placeholder="Optional owner name"
          />

          <div className="gg-muted">Purchase</div>
          <input
            className="gg-input"
            type="date"
            value={newPurchaseDate}
            onChange={e => setNewPurchaseDate(e.target.value)}
          />
          <div className="gg-muted">Warranty</div>
          <input
            className="gg-input"
            type="date"
            value={newWarrantyUntil}
            onChange={e => setNewWarrantyUntil(e.target.value)}
          />
        </div>

        <div className="gg-row">
          <div className="gg-muted">Default team</div>
          <select
            className="gg-select"
            value={newDefaultTeamId}
            onChange={e => setNewDefaultTeamId(e.target.value)}
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="gg-muted">Default technician</div>
          <select
            className="gg-select"
            value={newDefaultTechnicianId}
            onChange={e => setNewDefaultTechnicianId(e.target.value)}
            disabled={eligibleTechniciansForNewTeam.length === 0}
          >
            {eligibleTechniciansForNewTeam.map(t => (
              <option key={t.id} value={t.id}>
                {t.displayName}
              </option>
            ))}
          </select>

          <button
            className="gg-button"
            onClick={() => void onCreateEquipment()}
            disabled={!canCreate}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>

        <div className="gg-muted">
          Required for strict Odoo spec: Category + Default team + Default technician.
        </div>

        {createBlocker ? <div className="gg-error">Create blocked: {createBlocker}</div> : null}
      </div>

      {error ? <div className="gg-error">{error}</div> : null}
      {loading ? <div className="gg-muted">Loading…</div> : null}

      <div className="gg-table">
        <div className="gg-table__head">
          <div>Name</div>
          <div>Serial</div>
          <div>Owner</div>
          <div>Category</div>
          <div>Team</div>
          <div>Technician</div>
          <div>Purchase</div>
          <div>Warranty</div>
          <div>Location</div>
          <div>Status</div>
          <div></div>
        </div>
        {visibleItems.map(eq => (
          <div key={eq.id} className="gg-table__row">
            <div>{eq.name}</div>
            <div className="gg-muted">{eq.serialNumber ?? '—'}</div>
            <div className="gg-muted">
              {eq.ownerName ? (
                <>
                  {(eq.ownerType ?? 'owner') === 'department'
                    ? 'Dept'
                    : (eq.ownerType ?? 'owner') === 'employee'
                      ? 'Emp'
                      : 'Owner'}
                  : {eq.ownerName}
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="gg-muted">{eq.category ?? '—'}</div>
            <div className="gg-muted">
              {eq.defaultTeamId ? (teamNameById[eq.defaultTeamId] ?? eq.defaultTeamId) : '—'}
            </div>
            <div className="gg-muted">
              {eq.defaultTechnicianId
                ? (technicianNameById[eq.defaultTechnicianId] ?? eq.defaultTechnicianId)
                : '—'}
            </div>
            <div className="gg-muted">{toDateOnly(eq.purchaseDate)}</div>
            <div className="gg-muted">{toDateOnly(eq.warrantyUntil)}</div>
            <div className="gg-muted">{eq.location ?? '—'}</div>
            <div>
              {eq.status === 'scrapped' ? (
                <span className="gg-chip gg-chip--danger">Scrapped</span>
              ) : (
                <span className="gg-chip">Active</span>
              )}
            </div>
            <div>
              <button className="gg-link" onClick={() => props.onOpenMaintenance(eq.id)}>
                Maintenance
                <span className="gg-badge gg-badge--inline">
                  {openCountByEquipmentId[eq.id] ?? 0}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="gg-footnote gg-muted">
        This list is backed by the Firestore emulator when enabled.
      </div>
    </section>
  );
}
