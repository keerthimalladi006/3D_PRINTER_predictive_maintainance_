import { useMemo, useState } from 'react';
import type { AnomalyEvent, SensorSample, Severity, SubsystemId } from '../types';
import { getAnomalies, getMachineStatus, getVibrationData } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { downsample, SUBSYSTEM_LABELS } from '../data/demoData';
import { AppLayout } from '../components/AppLayout';
import { AnomalyEventItem } from '../components/AnomalyEventItem';
import { TimeSeriesChart } from '../components/TimeSeriesChart';
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews';

const SEVERITIES: (Severity | 'ALL')[] = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SUBSYSTEMS: (SubsystemId | 'ALL')[] = ['ALL', 'X_AXIS', 'Y_AXIS', 'Z_AXIS', 'PRINT_HEAD', 'MOTION_SYSTEM', 'FRAME'];

export function AnomaliesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<Severity | 'ALL'>('ALL');
  const [subFilter, setSubFilter] = useState<SubsystemId | 'ALL'>('ALL');

  const statusRes = useAsync(getMachineStatus);
  const anomaliesRes = useAsync(getAnomalies);
  const anomalies = anomaliesRes.data ?? [];

  const selected = useMemo(
    () => anomalies.find((a) => a.id === selectedId) ?? null,
    [anomalies, selectedId],
  );

  const windowRes = useAsync(
    async () => {
      if (!selected) return [] as SensorSample[];
      const rangeMs = Math.max(5 * 60 * 1000, selected.windowEnd - selected.windowStart + 60000);
      const data = await getVibrationData(rangeMs);
      return data.filter(
        (s) => s.t >= selected.windowStart - 10000 && s.t <= selected.windowEnd + 10000,
      );
    },
    [selected?.id],
  );

  const filtered = useMemo(
    () => anomalies.filter(
      (a) => (sevFilter === 'ALL' || a.severity === sevFilter) && (subFilter === 'ALL' || a.subsystem === subFilter),
    ),
    [anomalies, sevFilter, subFilter],
  );

  const loading = statusRes.loading || anomaliesRes.loading;
  const error = statusRes.error || anomaliesRes.error;

  if (loading) {
    return <AppLayout status={statusRes.data}><LoadingState label="Loading anomaly events…" /></AppLayout>;
  }
  if (error) {
    return <AppLayout status={statusRes.data}><ErrorState message={error} onRetry={() => { statusRes.refetch(); anomaliesRes.refetch(); }} /></AppLayout>;
  }

  const windowData = (windowRes.data ?? []) as SensorSample[];
  const downsampledWindow = downsample(windowData, 300);

  const filterBtn = (active: boolean) =>
    `rounded-md border px-3 py-1 text-2xs transition-colors ${
      active ? 'border-brand-dim bg-brand/10 text-brand' : 'border-edge text-txt-secondary hover:bg-surface-overlay'
    }`;

  return (
    <AppLayout status={statusRes.data}>
      <div className="flex flex-col gap-5">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-edge bg-surface-raised px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xs text-txt-muted">Severity</span>
            <div className="flex gap-1">
              {SEVERITIES.map((s) => (
                <button key={s} onClick={() => setSevFilter(s)} className={filterBtn(sevFilter === s)}>
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-txt-muted">Subsystem</span>
            <select
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value as SubsystemId | 'ALL')}
              className="rounded-md border border-edge bg-surface-raised px-2 py-1 text-2xs text-txt-secondary focus:border-brand-dim focus:outline-none"
            >
              {SUBSYSTEMS.map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'All subsystems' : SUBSYSTEM_LABELS[s as SubsystemId]}</option>
              ))}
            </select>
          </div>
          <span className="ml-auto font-mono text-2xs text-txt-faint">{filtered.length} events</span>
        </div>

        {/* Master-detail split */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* Event list — narrower */}
          <div className="lg:col-span-2">
            <h2 className="mb-2 text-sm font-medium text-txt-secondary">Anomaly events</h2>
            {filtered.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-[600px] overflow-y-auto">
                {filtered.map((event) => (
                  <AnomalyEventItem
                    key={event.id}
                    event={event}
                    selected={selectedId === event.id}
                    onSelect={(e) => setSelectedId(e.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState label="No anomaly events" hint="Adjust filters to see more results" />
            )}
          </div>

          {/* Detail panel — wider */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="font-mono text-2xs text-txt-faint">{selected.id}</span>
                    <span className="text-2xs text-txt-muted">{SUBSYSTEM_LABELS[selected.subsystem]}</span>
                  </div>
                  <h3 className="text-base text-txt-primary">{selected.title}</h3>
                  <p className="mt-2 text-sm text-txt-secondary">{selected.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.evidenceMetrics.map((m, i) => (
                      <span key={i} className="rounded-md border border-edge bg-surface-inset px-2 py-1 font-mono text-2xs text-txt-secondary">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-edge bg-surface-raised p-4">
                  <h3 className="mb-3 text-sm font-medium text-txt-secondary">Sensor time window — Ax / Ay / Az</h3>
                  {windowRes.loading ? (
                    <LoadingState label="Loading sensor window…" />
                  ) : windowData.length > 0 ? (
                    <TimeSeriesChart
                      series={downsampledWindow.map((s: SensorSample) => ({ t: s.t, ax: s.ax, ay: s.ay, az: s.az }))}
                      configs={[
                        { key: 'ax', color: '#2dd4bf', label: 'Ax' },
                        { key: 'ay', color: '#f59e0b', label: 'Ay' },
                        { key: 'az', color: '#ef4444', label: 'Az' },
                      ]}
                      height={260}
                      yLabel="m/s²"
                      highlightStart={selected.windowStart}
                      highlightEnd={selected.windowEnd}
                    />
                  ) : (
                    <EmptyState label="No sensor data in this window" />
                  )}
                </div>
              </div>
            ) : (
              <EmptyState label="Select an anomaly event" hint="Click an event to view its sensor time window" />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
