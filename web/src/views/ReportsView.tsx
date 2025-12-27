import './views.css';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { listAllMaintenanceRequests, listEquipment, listTeams } from '../domain/firestore';
import type { Equipment, MaintenanceRequest, Team } from '../domain/types';

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function barWidth(count: number, max: number): string {
  if (max <= 0) return '0%';
  return `${Math.round(clamp01(count / max) * 100)}%`;
}

export function ReportsView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [req, t, eq] = await Promise.all([
        listAllMaintenanceRequests(),
        listTeams(),
        listEquipment(),
      ]);
      setRequests(req);
      setTeams(t);
      setEquipment(eq);
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

  const teamNameById = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t.name])), [teams]);
  const equipmentById = useMemo(
    () => Object.fromEntries(equipment.map(eq => [eq.id, eq])),
    [equipment]
  );

  const openRequests = useMemo(
    () => requests.filter(r => r.status === 'new' || r.status === 'in_progress'),
    [requests]
  );

  const countsByTeam = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of requests) {
      const key = r.teamId || 'unassigned';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([teamId, count]) => ({
        teamId,
        teamName: teamNameById[teamId] ?? (teamId === 'unassigned' ? 'Unassigned' : teamId),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [requests, teamNameById]);

  const countsByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of requests) {
      const eq = equipmentById[r.equipmentId];
      const category = r.equipmentCategory ?? eq?.category ?? 'Uncategorized';
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [requests, equipmentById]);

  const maxTeam = useMemo(() => Math.max(0, ...countsByTeam.map(x => x.count)), [countsByTeam]);
  const maxCategory = useMemo(
    () => Math.max(0, ...countsByCategory.map(x => x.count)),
    [countsByCategory]
  );

  return (
    <section className="gg-view">
      <div className="gg-row gg-row--space">
        <div>
          <div className="gg-muted">Pivot-style report (requests by team & category)</div>
          <div className="gg-muted">
            Total: {requests.length} • Open: {openRequests.length}
          </div>
        </div>
        <button className="gg-button gg-button--secondary" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {error ? <div className="gg-error">{error}</div> : null}
      {loading ? <div className="gg-muted">Loading…</div> : null}

      <div className="gg-group">
        <div className="gg-group__title">Requests by team</div>
        <div className="gg-bars">
          {countsByTeam.length === 0 ? <div className="gg-muted">No data</div> : null}
          {countsByTeam.map(row => (
            <div key={row.teamId} className="gg-barRow">
              <div className="gg-barLabel">{row.teamName}</div>
              <div className="gg-barTrack">
                <div className="gg-barFill" style={{ width: barWidth(row.count, maxTeam) }} />
              </div>
              <div className="gg-barValue">{row.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="gg-group">
        <div className="gg-group__title">Requests by equipment category</div>
        <div className="gg-bars">
          {countsByCategory.length === 0 ? <div className="gg-muted">No data</div> : null}
          {countsByCategory.map(row => (
            <div key={row.category} className="gg-barRow">
              <div className="gg-barLabel">{row.category}</div>
              <div className="gg-barTrack">
                <div className="gg-barFill" style={{ width: barWidth(row.count, maxCategory) }} />
              </div>
              <div className="gg-barValue">{row.count}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
