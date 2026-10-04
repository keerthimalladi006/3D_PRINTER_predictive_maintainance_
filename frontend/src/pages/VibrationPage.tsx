import { useMemo, useState } from 'react';
import type { ConditionState, SensorSample, VibrationFeature } from '../types';
import { getMachineStatus, getVibrationData, getVibrationFeatures } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { downsample } from '../data/demoData';
import { AppLayout } from '../components/AppLayout';
import { TimeSeriesChart } from '../components/TimeSeriesChart';
import { LoadingState, ErrorState } from '../components/StateViews';

const RANGES = [
  { label: '1 min', ms: 60 * 1000 },
  { label: '5 min', ms: 5 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
];

const CONDITIONS: { label: string; value: ConditionState | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Abnormal', value: 'ABNORMAL' },
];

const AXIS_COLORS: Record<string, string> = {
  ax: '#2dd4bf',
  ay: '#f59e0b',
  az: '#ef4444',
  gx: '#6b7280',
  gy: '#4a7db8',
  gz: '#3b82f6',
};

const AXIS_LABELS: Record<string, string> = {
  ax: 'Ax',
  ay: 'Ay',
  az: 'Az',
  gx: 'Gx',
  gy: 'Gy',
  gz: 'Gz',
};

function FeatureStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs text-txt-muted">{label}</span>
      <span className={`font-mono text-base tnum ${accent ? 'text-warn' : 'text-txt-primary'}`}>
        {value.toFixed(3)}
      </span>
    </div>
  );
}

export function VibrationPage() {
  const [rangeMs, setRangeMs] = useState(5 * 60 * 1000);
  const [condition, setCondition] = useState<ConditionState | 'ALL'>('ALL');

  const statusRes = useAsync(getMachineStatus);
  const vibRes = useAsync(
    () => getVibrationData(rangeMs, condition === 'ALL' ? undefined : condition),
    [rangeMs, condition],
  );
  const featuresRes = useAsync(() => getVibrationFeatures(vibRes.data ?? []), [vibRes.data]);

  const loading = statusRes.loading || vibRes.loading;
  const error = statusRes.error || vibRes.error;

  const primaryData = useMemo(() => downsample(vibRes.data ?? [], 400), [vibRes.data]);

  if (loading) {
    return <AppLayout status={statusRes.data}><LoadingState label="Loading vibration data…" /></AppLayout>;
  }
  if (error) {
    return <AppLayout status={statusRes.data}><ErrorState message={error} onRetry={() => { statusRes.refetch(); vibRes.refetch(); }} /></AppLayout>;
  }

  const features = featuresRes.data as VibrationFeature[] | undefined;

  const chartDataForKeys = (keys: string[]): { t: number; [key: string]: number }[] =>
    primaryData.map((s: SensorSample) => {
      const row: { t: number; [key: string]: number } = { t: s.t };
      for (const k of keys) row[k] = s[k as keyof SensorSample] as number;
      return row;
    });

  const filterBtn = (active: boolean) =>
    `rounded-md border px-3 py-1 text-2xs transition-colors ${
      active
        ? 'border-brand-dim bg-brand/10 text-brand'
        : 'border-edge text-txt-secondary hover:bg-surface-overlay'
    }`;

  return (
    <AppLayout status={statusRes.data}>
      <div className="flex flex-col gap-5">
        {/* Compact toolbar */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-edge bg-surface-raised px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xs text-txt-muted">Range</span>
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button key={r.ms} onClick={() => setRangeMs(r.ms)} className={filterBtn(rangeMs === r.ms)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-txt-muted">Condition</span>
            <div className="flex gap-1">
              {CONDITIONS.map((c) => (
                <button key={c.value} onClick={() => setCondition(c.value)} className={filterBtn(condition === c.value)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <span className="ml-auto font-mono text-2xs text-txt-faint">{primaryData.length} samples</span>
        </div>

        {/* Feature stat bar — horizontal, not a table box */}
        {features && features.length > 0 && (
          <div className="rounded-lg border border-edge bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-medium text-txt-secondary">Vibration features (visible window)</h2>
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              {features.map((f) => (
                <div key={f.axis} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: AXIS_COLORS[f.axis] }} />
                    <span className="font-mono text-xs text-txt-primary">{AXIS_LABELS[f.axis]}</span>
                  </div>
                  <div className="flex gap-5">
                    <FeatureStat label="RMS" value={f.rms} />
                    <FeatureStat label="Peak" value={f.peak} />
                    <FeatureStat label="Std dev" value={f.stdDev} />
                    <FeatureStat label="Kurtosis" value={f.kurtosis} accent={f.kurtosis > 5} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary acceleration — combined + individual */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-txt-secondary">Primary acceleration — Ax / Ay / Az</h2>
          <div className="rounded-lg border border-edge bg-surface-raised p-3">
            <TimeSeriesChart
              series={chartDataForKeys(['ax', 'ay', 'az'])}
              configs={[
                { key: 'ax', color: AXIS_COLORS.ax, label: 'Ax (m/s²)' },
                { key: 'ay', color: AXIS_COLORS.ay, label: 'Ay (m/s²)' },
                { key: 'az', color: AXIS_COLORS.az, label: 'Az (m/s²)' },
              ]}
              height={200}
              yLabel="m/s²"
            />
          </div>
          {(['ax', 'ay', 'az'] as const).map((axis) => (
            <div key={axis} className="rounded-lg border border-edge-soft bg-surface-raised p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: AXIS_COLORS[axis] }} />
                <span className="text-xs font-medium text-txt-secondary">{AXIS_LABELS[axis]}</span>
                <span className="text-2xs text-txt-faint">(m/s²)</span>
              </div>
              <TimeSeriesChart
                series={chartDataForKeys([axis])}
                configs={[{ key: axis, color: AXIS_COLORS[axis], label: AXIS_LABELS[axis] }]}
                height={110}
                compact
                showLegend={false}
              />
            </div>
          ))}
        </div>

        {/* Secondary gyroscope */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-txt-secondary">Secondary gyroscope — Gx / Gy / Gz</h2>
          {(['gx', 'gy', 'gz'] as const).map((axis) => (
            <div key={axis} className="rounded-lg border border-edge-soft bg-surface-raised p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: AXIS_COLORS[axis] }} />
                <span className="text-xs font-medium text-txt-secondary">{AXIS_LABELS[axis]}</span>
                <span className="text-2xs text-txt-faint">(°/s)</span>
              </div>
              <TimeSeriesChart
                series={chartDataForKeys([axis])}
                configs={[{ key: axis, color: AXIS_COLORS[axis], label: AXIS_LABELS[axis] }]}
                height={90}
                compact
                showLegend={false}
              />
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
