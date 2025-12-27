import './App.css';

import { useEffect, useMemo, useState } from 'react';

import { CalendarView } from './views/CalendarView';
import { EquipmentView } from './views/EquipmentView';
import { KanbanView } from './views/KanbanView';
import { ReportsView } from './views/ReportsView';
import { TeamsView } from './views/TeamsView';

type Tab = 'equipment' | 'teams' | 'kanban' | 'calendar' | 'reports';

function App() {
  const [tab, setTab] = useState<Tab>('kanban');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | undefined>(undefined);
  const [logoOk, setLogoOk] = useState(true);

  const logoSrc = '/gearguard-logo.png?v=20251227';

  const title = useMemo(() => {
    if (tab === 'equipment') return 'Equipment';
    if (tab === 'teams') return 'Teams';
    if (tab === 'calendar') return 'Preventive Calendar';
    if (tab === 'reports') return 'Reports';
    return 'Maintenance Requests';
  }, [tab]);

  useEffect(() => {
    document.title = `GearGuard — ${title}`;
  }, [title]);

  return (
    <div className="gg-app">
      <header className="gg-header">
        <div className="gg-brand">
          {logoOk ? (
            <img
              className="gg-logo"
              src={logoSrc}
              alt="GearGuard"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <div className="gg-logo gg-logo--placeholder" aria-hidden="true">
              GG
            </div>
          )}
          <div className="gg-brand__text">
            <div className="gg-brand__name">GearGuard</div>
            <div className="gg-brand__subtitle">Maintenance Management</div>
          </div>
        </div>
        <nav className="gg-tabs">
          {logoOk ? (
            <img
              className="gg-tabs__logo"
              src={logoSrc}
              alt=""
              aria-hidden="true"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <div className="gg-tabs__logo gg-tabs__logo--placeholder" aria-hidden="true">
              GG
            </div>
          )}
          <button
            type="button"
            className={tab === 'equipment' ? 'active' : ''}
            onClick={() => setTab('equipment')}
          >
            Equipment
          </button>
          <button
            type="button"
            className={tab === 'teams' ? 'active' : ''}
            onClick={() => setTab('teams')}
          >
            Teams
          </button>
          <button
            type="button"
            className={tab === 'kanban' ? 'active' : ''}
            onClick={() => setTab('kanban')}
          >
            Kanban
          </button>
          <button
            type="button"
            className={tab === 'calendar' ? 'active' : ''}
            onClick={() => setTab('calendar')}
          >
            Calendar
          </button>
          <button
            type="button"
            className={tab === 'reports' ? 'active' : ''}
            onClick={() => setTab('reports')}
          >
            Reports
          </button>
        </nav>
      </header>

      <main className="gg-main">
        <h1 className="gg-title">{title}</h1>

        <div key={tab} className="gg-page">
          {tab === 'equipment' ? (
            <EquipmentView
              onOpenMaintenance={equipmentId => {
                setSelectedEquipmentId(equipmentId);
                setTab('kanban');
              }}
            />
          ) : null}

          {tab === 'teams' ? <TeamsView /> : null}

          {tab === 'kanban' ? (
            <KanbanView
              selectedEquipmentId={selectedEquipmentId}
              onClearEquipmentFilter={() => setSelectedEquipmentId(undefined)}
            />
          ) : null}

          {tab === 'calendar' ? <CalendarView /> : null}

          {tab === 'reports' ? <ReportsView /> : null}
        </div>
      </main>
    </div>
  );
}

export default App;
