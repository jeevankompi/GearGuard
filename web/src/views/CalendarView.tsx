import './views.css';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createMaintenanceRequest,
  listEquipment,
  listPreventiveRequestsByScheduledAt,
} from '../domain/firestore';
import type { Equipment, MaintenanceRequest } from '../domain/types';

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDateOnly(value?: string): string | null {
  if (!value) return null;
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export function CalendarView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEquipmentId, setNewEquipmentId] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('Routine checkup');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, eq] = await Promise.all([
        listPreventiveRequestsByScheduledAt(),
        listEquipment(),
      ]);
      setItems(list);
      setEquipment(eq);
      setNewEquipmentId(current => current || eq[0]?.id || '');
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

  const itemsByDay = useMemo(() => {
    const m = new Map<string, MaintenanceRequest[]>();
    for (const r of items) {
      const key = toDateOnly(r.scheduledAt) ?? 'Unscheduled';
      const arr = m.get(key) ?? [];
      arr.push(r);
      m.set(key, arr);
    }
    return m;
  }, [items]);

  const equipmentNameById = useMemo(
    () => Object.fromEntries(equipment.map(eq => [eq.id, eq.name])),
    [equipment]
  );

  const days = useMemo(() => {
    const first = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
    const last = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0);
    const start = new Date(first);
    // Sunday-start grid
    start.setDate(first.getDate() - first.getDay());

    const end = new Date(last);
    end.setDate(last.getDate() + (6 - last.getDay()));

    const out: Date[] = [];
    for (
      let d = new Date(start);
      d <= end;
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    ) {
      out.push(d);
    }
    return out;
  }, [activeMonth]);

  const selectedItems = useMemo(() => {
    if (!selectedDate) return [];
    return itemsByDay.get(selectedDate) ?? [];
  }, [itemsByDay, selectedDate]);

  async function onSchedule() {
    try {
      setError(null);
      if (!selectedDate) throw new Error('Pick a date first');
      if (!newEquipmentId) throw new Error('Pick equipment');
      if (!newSubject.trim()) throw new Error('Enter a subject');

      await createMaintenanceRequest({
        type: 'preventive',
        equipmentId: newEquipmentId,
        subject: newSubject.trim(),
        scheduledAt: selectedDate,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className="gg-view">
      <div className="gg-row gg-row--space">
        <div>
          <div className="gg-muted">Calendar view (preventive maintenance)</div>
          <div className="gg-muted">Click a date to schedule a new preventive request.</div>
        </div>
        <div className="gg-row">
          <button
            className="gg-button gg-button--secondary"
            onClick={() => setActiveMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          >
            Prev
          </button>
          <button
            className="gg-button gg-button--secondary"
            onClick={() => setActiveMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          >
            Next
          </button>
          <button className="gg-button gg-button--secondary" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="gg-error">{error}</div> : null}
      {loading ? <div className="gg-muted">Loading…</div> : null}

      <div className="gg-calendar">
        <div className="gg-calendar__head">
          <div className="gg-muted">Sun</div>
          <div className="gg-muted">Mon</div>
          <div className="gg-muted">Tue</div>
          <div className="gg-muted">Wed</div>
          <div className="gg-muted">Thu</div>
          <div className="gg-muted">Fri</div>
          <div className="gg-muted">Sat</div>
        </div>
        <div className="gg-calendar__grid">
          {days.map(d => {
            const key = dateKey(d);
            const count = itemsByDay.get(key)?.length ?? 0;
            const isOtherMonth = d.getMonth() !== activeMonth.getMonth();
            const isSelected = selectedDate === key;
            return (
              <button
                key={key}
                type="button"
                className={
                  isSelected
                    ? 'gg-calendar__day gg-calendar__day--selected'
                    : isOtherMonth
                      ? 'gg-calendar__day gg-calendar__day--muted'
                      : 'gg-calendar__day'
                }
                onClick={() => setSelectedDate(key)}
              >
                <div className="gg-calendar__dayTop">
                  <div>{d.getDate()}</div>
                  {count > 0 ? <div className="gg-badge">{count}</div> : null}
                </div>
                {count > 0 ? <div className="gg-muted">Preventive</div> : null}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate ? (
        <div className="gg-group">
          <div className="gg-group__title">{selectedDate}</div>

          <div className="gg-row">
            <div className="gg-muted">Equipment</div>
            <select
              className="gg-select"
              value={newEquipmentId}
              onChange={e => setNewEquipmentId(e.target.value)}
            >
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
            <div className="gg-muted">Subject</div>
            <input
              className="gg-input"
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
            />
            <button className="gg-button" onClick={() => void onSchedule()}>
              Schedule
            </button>
          </div>

          <div className="gg-list">
            {selectedItems.length === 0 ? (
              <div className="gg-muted">No preventive requests</div>
            ) : null}
            {selectedItems.map(r => (
              <div key={r.id} className="gg-row gg-row--space gg-item">
                <div>
                  <div className="gg-item__title">{r.subject}</div>
                  <div className="gg-muted">
                    Equipment: {equipmentNameById[r.equipmentId] ?? r.equipmentId}
                  </div>
                </div>
                <div className="gg-chip">{r.status}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="gg-muted">Select a date to schedule a preventive request.</div>
      )}
    </section>
  );
}
