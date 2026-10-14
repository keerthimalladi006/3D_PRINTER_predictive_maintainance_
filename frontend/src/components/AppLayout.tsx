import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Moon,
  Sun,
  Waves,
} from 'lucide-react';
import type { MachineStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { useTheme } from '../hooks/useTheme';

const NAV = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/vibration', label: 'Vibration', icon: Waves },
  { to: '/health', label: 'Health', icon: Gauge },
  { to: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { to: '/digital-twin', label: 'Digital twin', icon: Activity },
  { to: '/maintenance', label: 'Maintenance', icon: ClipboardList },
];

interface Props {
  status: MachineStatus | null;
}

export function AppLayout({ status, children }: Props & { children: React.ReactNode }) {
  const location = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen bg-surface text-txt-primary">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-edge bg-surface-inset">
        <div className="flex items-center gap-2.5 border-b border-edge px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-edge bg-surface-raised">
            <Activity size={16} className="text-brand" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-txt-primary">
              FDM Monitor
            </span>
            <span className="text-2xs text-txt-muted">Condition monitoring</span>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 py-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 border-l-2 px-5 py-2.5 text-sm transition-colors ${
                  active
                    ? 'border-brand bg-brand/5 text-txt-primary'
                    : 'border-transparent text-txt-secondary hover:bg-surface-raised hover:text-txt-primary'
                }`}
              >
                <Icon size={16} className={active ? 'text-brand' : 'text-txt-muted'} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-edge px-5 py-4">
          <span className="text-2xs text-txt-faint">Machine</span>
          <p className="mt-1 text-xs text-txt-secondary">
            {status?.machineName ?? '—'}
          </p>
          <p className="font-mono text-2xs text-txt-faint">
            {status?.machineId ?? '—'}
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-edge bg-surface px-6 py-3">
          <h1 className="text-sm font-medium text-txt-primary">
            {NAV.find((n) => n.to === location.pathname)?.label ?? 'Unknown'}
          </h1>
          <div className="flex items-center gap-4">
            {status && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xs text-txt-muted">
                    Condition
                  </span>
                  <StatusBadge state={status.condition} pulse={status.condition !== 'NORMAL'} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xs text-txt-muted">
                    Last update
                  </span>
                  <span className="font-mono text-2xs text-txt-secondary">
                    {new Date(status.lastUpdate).toLocaleTimeString('en-GB', { hour12: false })}
                  </span>
                </div>
              </>
            )}
            <button
              onClick={toggle}
              className="ml-2 flex h-8 w-8 items-center justify-center rounded-md border border-edge text-txt-secondary hover:bg-surface-raised hover:text-txt-primary transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
