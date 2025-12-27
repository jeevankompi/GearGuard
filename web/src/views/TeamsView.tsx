import './views.css';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createTeam,
  createTechnician,
  listTeams,
  listTechnicians,
  setTeamTechnicians,
} from '../domain/firestore';
import type { Team, Technician } from '../domain/types';

export function TeamsView() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [draftMemberIds, setDraftMemberIds] = useState<Set<string>>(new Set());

  const [newTeamName, setNewTeamName] = useState('');
  const [newTechnicianName, setNewTechnicianName] = useState('');
  const [creatingTechnician, setCreatingTechnician] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, techs] = await Promise.all([listTeams(), listTechnicians()]);
      setTeams(t);
      setTechnicians(techs);
      setSelectedTeamId(current => {
        if (current && t.some(team => team.id === current)) return current;
        return t[0]?.id || '';
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onDataChanged = () => {
      void refresh();
    };
    window.addEventListener('gg:data-changed', onDataChanged);
    return () => window.removeEventListener('gg:data-changed', onDataChanged);
  }, [refresh]);

  const selectedTeam = useMemo(
    () => teams.find(t => t.id === selectedTeamId) ?? null,
    [selectedTeamId, teams]
  );

  useEffect(() => {
    if (!selectedTeam) {
      setDraftMemberIds(new Set());
      return;
    }
    setDraftMemberIds(new Set(selectedTeam.technicianIds));
  }, [selectedTeam]);

  async function onSaveMembers() {
    try {
      if (!selectedTeam) return;
      setSaving(true);
      setError(null);
      await setTeamTechnicians(selectedTeam.id, [...draftMemberIds]);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onCreateTeam() {
    try {
      setError(null);
      const id = await createTeam(newTeamName);
      setNewTeamName('');
      await refresh();
      setSelectedTeamId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onCreateTechnician() {
    try {
      setError(null);
      setCreatingTechnician(true);
      await createTechnician(newTechnicianName);
      setNewTechnicianName('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingTechnician(false);
    }
  }

  const canCreateTeam = newTeamName.trim().length > 0;
  const canCreateTechnician = newTechnicianName.trim().length > 0;

  const technicianNameById = useMemo(() => {
    return Object.fromEntries(technicians.map(t => [t.id, t.displayName] as const));
  }, [technicians]);

  const teamsByTechnicianId = useMemo(() => {
    const map = new Map<string, Team[]>();
    for (const team of teams) {
      for (const techId of team.technicianIds) {
        const arr = map.get(techId) ?? [];
        arr.push(team);
        map.set(techId, arr);
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [teams]);

  return (
    <section className="gg-view">
      <div className="gg-row gg-row--space">
        <div>
          <div className="gg-muted">Maintenance teams and members</div>
          <div className="gg-muted">Only team members can be assigned on requests.</div>
        </div>
        <button className="gg-button gg-button--secondary" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {error ? <div className="gg-error">{error}</div> : null}
      {loading ? <div className="gg-muted">Loading…</div> : null}

      <div className="gg-grid gg-grid--2">
        <div className="gg-group">
          <div className="gg-group__title">Team registration</div>
          <div className="gg-row">
            <input
              className="gg-input"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="Team name"
            />
            <button
              className="gg-button"
              onClick={() => void onCreateTeam()}
              disabled={!canCreateTeam}
            >
              Create team
            </button>
          </div>
          <div className="gg-muted">Create a team first, then add technicians as members.</div>
        </div>

        <div className="gg-group">
          <div className="gg-group__title">Technician registration</div>
          <div className="gg-row">
            <input
              className="gg-input"
              value={newTechnicianName}
              onChange={e => setNewTechnicianName(e.target.value)}
              placeholder="Technician name"
            />
            <button
              className="gg-button"
              onClick={() => void onCreateTechnician()}
              disabled={creatingTechnician || !canCreateTechnician}
            >
              {creatingTechnician ? 'Creating…' : 'Create technician'}
            </button>
          </div>
          <div className="gg-muted">
            Technicians are used for assignment; register them here, then add them to a team.
          </div>
        </div>
      </div>

      <div className="gg-group">
        <div className="gg-group__title">Team members</div>

        <div className="gg-row gg-row--space">
          <div className="gg-row">
            <div className="gg-muted">Team</div>
            <select
              className="gg-select"
              value={selectedTeamId}
              onChange={e => setSelectedTeamId(e.target.value)}
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="gg-button"
            onClick={() => void onSaveMembers()}
            disabled={!selectedTeam || saving}
          >
            {saving ? 'Saving…' : 'Save members'}
          </button>
        </div>

        {!selectedTeam ? <div className="gg-muted">No team selected</div> : null}

        {selectedTeam ? (
          <div className="gg-list">
            {technicians.map(tech => {
              const checked = draftMemberIds.has(tech.id);
              return (
                <label key={tech.id} className="gg-row gg-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => {
                      const next = new Set(draftMemberIds);
                      if (e.target.checked) next.add(tech.id);
                      else next.delete(tech.id);
                      setDraftMemberIds(next);
                    }}
                  />
                  <div>
                    <div className="gg-item__title">{tech.displayName}</div>
                    <div className="gg-muted">{tech.id}</div>
                  </div>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="gg-grid gg-grid--2">
        <div className="gg-group">
          <div className="gg-group__title">All teams</div>
          {teams.length === 0 ? <div className="gg-muted">No teams yet</div> : null}
          <div className="gg-list">
            {teams.map(team => (
              <div key={team.id} className="gg-item">
                <div className="gg-row gg-row--space">
                  <div>
                    <div className="gg-item__title">{team.name}</div>
                    <div className="gg-muted">{team.id}</div>
                  </div>
                  <span className="gg-badge">{team.technicianIds.length}</span>
                </div>
                <div className="gg-row" style={{ marginTop: 6 }}>
                  {team.technicianIds.length === 0 ? (
                    <div className="gg-muted">No technicians assigned</div>
                  ) : (
                    team.technicianIds.map(techId => (
                      <span key={techId} className="gg-chip">
                        {technicianNameById[techId] ?? techId}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gg-group">
          <div className="gg-group__title">All technicians</div>
          {technicians.length === 0 ? <div className="gg-muted">No technicians yet</div> : null}
          <div className="gg-list">
            {technicians.map(tech => {
              const memberTeams = teamsByTechnicianId.get(tech.id) ?? [];
              return (
                <div key={tech.id} className="gg-item">
                  <div className="gg-row gg-row--space">
                    <div>
                      <div className="gg-item__title">{tech.displayName}</div>
                      <div className="gg-muted">{tech.id}</div>
                    </div>
                    <span className="gg-badge">{memberTeams.length}</span>
                  </div>
                  <div className="gg-row" style={{ marginTop: 6 }}>
                    {memberTeams.length === 0 ? (
                      <div className="gg-muted">Not assigned to any team</div>
                    ) : (
                      memberTeams.map(team => (
                        <span key={team.id} className="gg-chip">
                          {team.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
