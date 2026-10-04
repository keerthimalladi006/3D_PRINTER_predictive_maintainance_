import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { AnomalyEvent, HealthPoint, MachineStatus, RecentChange } from '../types';
import { getHealthTimeline, getMachineStatus, getRecentChanges } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { downsample } from '../data/demoData';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { TimeSeriesChart } from '../components/TimeSeriesChart';
import { Sparkline } from '../components/Sparkline';
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews';

const changeTypeLabels: Record<RecentChange['type'], string> = {
  STATE_TRANSITION: 'State transition',
  THRESHOLD_CROSS: 'Threshold cross',
  METRIC_SHIFT: 'Metric shift',
  ANOMALY_DETECTED: 'Anomaly detected',
};

function fmtClock(t: number): string {
  return new Date(t).toLocaleTimeString('en-GB', { hour12: false });
}

function RecentChangeRow({ change }: { change: RecentChange }) {
  const icon =
    change.direction === 'UP' ? (
      <ArrowUp size={12} className="text-warn" />
    ) : change.direction === 'DOWN' ? (
      <ArrowDown size={12} className="text-ok" />
    ) : (
      <Minus size={12} className="text-txt-muted" />
    );

  return (
    <div className="flex items-center gap-3 border-b border-edge-soft px-4 py-2.5 last:border-b-0">
      <span className="font-mono text-2xs text-txt-faint w-20 shrink-0">
        {fmtClock(change.t)}
      </span>
      {icon}
      <span className="text-2xs text-txt-muted w-28 shrink-0">
        {changeTypeLabels[change.type]}
      </span>
      <span className="text-sm text-txt-secondary">{change.description}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  accent = 'default',
  precision = 2,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: 'default' | 'ok' | 'warn' | 'alert';
  precision?: number;
}) {
  const formatted = typeof value === 'number' ? value.toFixed(precision) : value;
  const accentText =
    accent === 'ok' ? 'text-ok' : accent === 'warn' ? 'text-warn' : accent === 'alert' ? 'text-alert' : 'text-txt-primary';
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xs font-medium text-txt-muted">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-2xl tnum ${accentText}`}>{formatted}</span>
        {unit && <span className="text-xs text-txt-faint">{unit}</span>}
      </div>
    </div>
  );
}

export function OverviewPage() {
  const statusRes = useAsync(getMachineStatus);
  const healthRes = useAsync(getHealthTimeline);
  const changesRes = useAsync(getRecentChanges);

  const loading = statusRes.loading || healthRes.loading || changesRes.loading;
  const error = statusRes.error || healthRes.error || changesRes.error;

  const healthData = healthRes.data ?? [];
  const downsampledHealth = useMemo(() => downsample(healthData, 200), [healthData]);
  const healthSparkData = healthData.slice(-60).map((p) => p.healthScore);
  const vibrationSparkData = healthData.slice(-60).map((p) => p.anomalyScore * 100);

  if (loading) {
    return <AppLayout status={statusRes.data}><LoadingState label="Loading machine status…" /></AppLayout>;
  }
  if (error) {
    return <AppLayout status={statusRes.data}><ErrorState message={error} onRetry={() => { statusRes.refetch(); healthRes.refetch(); changesRes.refetch(); }} /></AppLayout>;
  }

  const status = statusRes.data as MachineStatus;

  return (
    <AppLayout status={status}>
      <div className="flex flex-col gap-5">
        {/* Condition summary strip */}
        <div className="flex items-center gap-8 rounded-lg border border-edge bg-surface-raised px-6 py-5">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-txt-muted">Current condition</span>
            <StatusBadge state={status.condition} size="lg" pulse={status.condition !== 'NORMAL'} />
          </div>
          <div className="h-12 w-px bg-edge" />
          <StatCard label="Health score" value={status.healthScore} precision={0} accent={status.healthScore > 70 ? 'ok' : status.healthScore > 40 ? 'warn' : 'alert'} />
          <div className="h-12 w-px bg-edge" />
          <StatCard label="Vibration RMS" value={status.vibrationRms} unit="mm/s" accent={status.vibrationRms > 1.0 ? 'alert' : status.vibrationRms > 0.5 ? 'warn' : 'ok'} />
          <div className="h-12 w-px bg-edge" />
          <StatCard label="Anomaly state" value={status.anomalyState} precision={0} accent={status.anomalyState === 'NORMAL' ? 'ok' : status.anomalyState === 'WARNING' ? 'warn' : 'alert'} />
          <div className="ml-auto flex flex-col items-end gap-1">
            <span className="text-2xs text-txt-muted">Last update</span>
            <span className="font-mono text-sm text-txt-secondary">
              {new Date(status.lastUpdate).toLocaleString('en-GB', { hour12: false })}
            </span>
          </div>
        </div>

        {/* Asymmetric: large health gauge area + trends beside it */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Left: health summary panel */}
          <div className="rounded-lg border border-edge bg-surface-raised p-5">
            <h2 className="mb-4 text-sm font-medium text-txt-primary">Machine summary</h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-edge">
                  <span className={`font-mono text-2xl tnum ${status.healthScore > 70 ? 'text-ok' : status.healthScore > 40 ? 'text-warn' : 'text-alert'}`}>
                    {status.healthScore.toFixed(0)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-txt-muted">Print head</span>
                  <span className="text-sm text-txt-primary">{status.printHeadState}</span>
                  <span className="text-xs text-txt-muted">Motion</span>
                  <span className="text-sm text-txt-primary">{status.motionState}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px rounded-lg overflow-hidden bg-edge-soft">
                <div className="bg-surface-raised px-3 py-2 text-center">
                  <span className="text-2xs text-txt-muted">X</span>
                  <p className="font-mono text-sm tnum text-txt-primary">{status.axisPosition.x.toFixed(1)}</p>
                </div>
                <div className="bg-surface-raised px-3 py-2 text-center">
                  <span className="text-2xs text-txt-muted">Y</span>
                  <p className="font-mono text-sm tnum text-txt-primary">{status.axisPosition.y.toFixed(1)}</p>
                </div>
                <div className="bg-surface-raised px-3 py-2 text-center">
                  <span className="text-2xs text-txt-muted">Z</span>
                  <p className="font-mono text-sm tnum text-txt-primary">{status.axisPosition.z.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: trend charts (wider) */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="rounded-lg border border-edge bg-surface-raised p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-txt-secondary">Health score trend</h2>
                <Sparkline data={healthSparkData} color="#2dd4bf" />
              </div>
              <TimeSeriesChart
                series={downsampledHealth.map((p: HealthPoint) => ({ t: p.t, score: p.healthScore }))}
                configs={[{ key: 'score', color: '#2dd4bf', label: 'Health score' }]}
                height={160}
                yLabel="Score"
              />
            </div>
            <div className="rounded-lg border border-edge bg-surface-raised p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-txt-secondary">Vibration trend (anomaly score)</h2>
                <Sparkline data={vibrationSparkData} color="#f59e0b" />
              </div>
              <TimeSeriesChart
                series={downsampledHealth.map((p: HealthPoint) => ({ t: p.t, anomaly: p.anomalyScore * 100 }))}
                configs={[{ key: 'anomaly', color: '#f59e0b', label: 'Anomaly score %' }]}
                height={160}
                yLabel="Score"
              />
            </div>
          </div>
        </div>

        {/* Recent changes full-width strip */}
        <div className="rounded-lg border border-edge bg-surface-raised">
          <div className="border-b border-edge-soft px-4 py-3">
            <h2 className="text-sm font-medium text-txt-secondary">Recent changes</h2>
          </div>
          {(changesRes.data as RecentChange[] | undefined)?.length ? (
            <div className="flex flex-col">
              {(changesRes.data as RecentChange[]).map((c) => (
                <RecentChangeRow key={c.id} change={c} />
              ))}
            </div>
          ) : (
            <EmptyState label="No recent changes" />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
