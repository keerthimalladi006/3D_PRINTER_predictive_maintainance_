import { useMemo } from 'react';
import type { ConditionState, HealthPoint } from '../types';
import { getHealthTimeline, getMachineStatus } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { downsample } from '../data/demoData';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { TimeSeriesChart } from '../components/TimeSeriesChart';
import { LoadingState, ErrorState } from '../components/StateViews';

const stateColor: Record<ConditionState, string> = {
  NORMAL: '#2dd4bf',
  WARNING: '#f59e0b',
  ABNORMAL: '#ef4444',
};

function HealthGauge({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = circumference * pct;
  const color = score > 70 ? '#2dd4bf' : score > 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-edge-soft" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-3xl tnum" style={{ color }}>{score.toFixed(0)}</span>
        <span className="text-2xs text-txt-faint">/ 100</span>
      </div>
    </div>
  );
}

function SteppedTimeline({ points }: { points: HealthPoint[] }) {
  const transitions: { t: number; from: ConditionState; to: ConditionState }[] = [];
  for (let i = 1; i < points.length; i++) {
    if (points[i].state !== points[i - 1].state) {
      transitions.push({ t: points[i].t, from: points[i - 1].state, to: points[i].state });
    }
  }

  if (points.length === 0) return null;
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const span = tMax - tMin || 1;

  const segments: { start: number; end: number; state: ConditionState }[] = [];
  let segStart = points[0].t;
  let segState = points[0].state;
  for (let i = 1; i < points.length; i++) {
    if (points[i].state !== segState) {
      segments.push({ start: segStart, end: points[i].t, state: segState });
      segStart = points[i].t;
      segState = points[i].state;
    }
  }
  segments.push({ start: segStart, end: tMax, state: segState });

  return (
    <div className="flex flex-col gap-4">
      {/* Horizontal state bar */}
      <div className="relative flex h-7 w-full overflow-hidden rounded-md border border-edge-soft">
        {segments.map((seg, i) => {
          const left = ((seg.start - tMin) / span) * 100;
          const width = ((seg.end - seg.start) / span) * 100;
          return (
            <div
              key={i}
              className="absolute h-full flex items-center justify-center text-2xs font-medium"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: `${stateColor[seg.state]}15`,
                borderBottom: `2px solid ${stateColor[seg.state]}`,
                color: stateColor[seg.state],
              }}
            >
              {width > 10 ? seg.state.charAt(0) + seg.state.slice(1).toLowerCase() : ''}
            </div>
          );
        })}
      </div>

      {/* Transition steps */}
      <div className="flex flex-wrap gap-3">
        {transitions.map((t, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border border-edge-soft bg-surface-raised px-3 py-1.5">
            <span className="font-mono text-2xs text-txt-faint">
              {new Date(t.t).toLocaleTimeString('en-GB', { hour12: false })}
            </span>
            <StatusBadge state={t.from} />
            <span className="text-txt-faint">→</span>
            <StatusBadge state={t.to} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HealthPage() {
  const statusRes = useAsync(getMachineStatus);
  const healthRes = useAsync(getHealthTimeline);

  const loading = statusRes.loading || healthRes.loading;
  const error = statusRes.error || healthRes.error;

  const healthData = healthRes.data ?? [];
  const downsampled = useMemo(() => downsample(healthData, 200), [healthData]);

  if (loading) {
    return <AppLayout status={statusRes.data}><LoadingState label="Loading health data…" /></AppLayout>;
  }
  if (error) {
    return <AppLayout status={statusRes.data}><ErrorState message={error} onRetry={() => { statusRes.refetch(); healthRes.refetch(); }} /></AppLayout>;
  }

  const status = statusRes.data;
  const latest = healthData[healthData.length - 1];
  const avgHealth = healthData.reduce((a, p) => a + p.healthScore, 0) / (healthData.length || 1);

  return (
    <AppLayout status={status}>
      <div className="flex flex-col gap-5">
        {/* Hero gauge area */}
        <div className="flex items-center gap-8 rounded-lg border border-edge bg-surface-raised px-6 py-6">
          <HealthGauge score={latest?.healthScore ?? 0} />
          <div className="h-20 w-px bg-edge" />
          <div className="flex flex-col gap-2">
            <span className="text-xs text-txt-muted">Current state</span>
            <StatusBadge state={latest?.state ?? 'NORMAL'} size="md" pulse={latest?.state !== 'NORMAL'} />
            <span className="mt-2 text-xs text-txt-muted">Anomaly score</span>
            <span className="font-mono text-xl tnum text-warn">
              {((latest?.anomalyScore ?? 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-20 w-px bg-edge" />
          <div className="flex flex-col gap-2">
            <span className="text-xs text-txt-muted">Average health</span>
            <span className="font-mono text-xl tnum text-txt-primary">{avgHealth.toFixed(1)}</span>
            <span className="mt-2 text-xs text-txt-muted">Min / Max</span>
            <span className="font-mono text-sm tnum text-txt-secondary">
              {Math.min(...healthData.map((p) => p.healthScore)).toFixed(0)} / {Math.max(...healthData.map((p) => p.healthScore)).toFixed(0)}
            </span>
          </div>
        </div>

        {/* Trend charts — wider single column for readability */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-edge bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-medium text-txt-secondary">Health score trend</h2>
            <TimeSeriesChart
              series={downsampled.map((p: HealthPoint) => ({ t: p.t, score: p.healthScore }))}
              configs={[{ key: 'score', color: '#2dd4bf', label: 'Health score' }]}
              height={220}
              yLabel="Score"
            />
          </div>
          <div className="rounded-lg border border-edge bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-medium text-txt-secondary">Anomaly score trend</h2>
            <TimeSeriesChart
              series={downsampled.map((p: HealthPoint) => ({ t: p.t, anomaly: p.anomalyScore * 100 }))}
              configs={[{ key: 'anomaly', color: '#f59e0b', label: 'Anomaly score %' }]}
              height={220}
              yLabel="%"
            />
          </div>
        </div>

        {/* State transitions — horizontal stepped timeline */}
        <div className="rounded-lg border border-edge bg-surface-raised p-5">
          <h2 className="mb-4 text-sm font-medium text-txt-secondary">State transitions</h2>
          <SteppedTimeline points={healthData} />
        </div>
      </div>
    </AppLayout>
  );
}
