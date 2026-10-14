import { useMemo } from 'react';
import type { MaintenanceRecommendation, MaintenanceStage, Priority } from '../types';
import { getMaintenanceRecommendations, getMachineStatus } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { SUBSYSTEM_LABELS } from '../data/demoData';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews';

const PRIORITY_ORDER: Record<Priority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

const STAGES = [
  { key: 'detection', label: 'Detection' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'recommendation', label: 'Recommendation' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'verification', label: 'Verification' },
] as const;

const stageStatusColor: Record<MaintenanceStage['status'], string> = {
  COMPLETE: 'text-ok',
  IN_PROGRESS: 'text-warn',
  PENDING: 'text-txt-faint',
};

const priorityConfig: Record<string, string> = {
  P1: 'text-alert border-alert-dim/40 bg-alert-soft/5',
  P2: 'text-warn border-warn-dim/40 bg-warn-soft/5',
  P3: 'text-txt-secondary border-edge bg-surface-overlay',
  P4: 'text-txt-muted border-edge-soft bg-surface-inset',
};

function PipelineProgress({ rec }: { rec: MaintenanceRecommendation }) {
  const stageArr = STAGES.map((s) => rec.stages[s.key]);
  const completedCount = stageArr.filter((s) => s.status === 'COMPLETE').length;

  return (
    <div className="flex items-center gap-1">
      {stageArr.map((s, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div
            className={`h-1.5 w-full rounded-full ${
              s.status === 'COMPLETE' ? 'bg-ok' : s.status === 'IN_PROGRESS' ? 'bg-warn' : 'bg-edge-soft'
            }`}
            style={{ minWidth: '20px' }}
          />
          {i < stageArr.length - 1 && <div className="w-1" />}
        </div>
      ))}
      <span className="ml-2 font-mono text-2xs text-txt-faint">{completedCount}/5</span>
    </div>
  );
}

export function MaintenancePage() {
  const statusRes = useAsync(getMachineStatus);
  const recsRes = useAsync(getMaintenanceRecommendations);

  const loading = statusRes.loading || recsRes.loading;
  const error = statusRes.error || recsRes.error;

  const sorted = useMemo(() => {
    const recs = recsRes.data ?? [];
    return [...recs].sort((a, b) => {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pDiff !== 0) return pDiff;
      const aT = a.stages.detection.timestamp ?? '';
      const bT = b.stages.detection.timestamp ?? '';
      return bT.localeCompare(aT);
    });
  }, [recsRes.data]);

  if (loading) {
    return <AppLayout status={statusRes.data}><LoadingState label="Loading maintenance recommendations…" /></AppLayout>;
  }
  if (error) {
    return <AppLayout status={statusRes.data}><ErrorState message={error} onRetry={() => { statusRes.refetch(); recsRes.refetch(); }} /></AppLayout>;
  }

  return (
    <AppLayout status={statusRes.data}>
      <div className="flex flex-col gap-5">
        {/* Pipeline header */}
        <div className="rounded-lg border border-edge bg-surface-raised px-5 py-4">
          <h2 className="mb-3 text-sm font-medium text-txt-secondary">Maintenance pipeline</h2>
          <div className="flex items-center gap-2 text-2xs text-txt-muted">
            {STAGES.map((s, i) => (
              <span key={s.key} className="flex items-center gap-2">
                <span className="rounded-md border border-edge px-2.5 py-1">{s.label}</span>
                {i < STAGES.length - 1 && <span className="text-txt-faint">→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-edge bg-surface-raised px-4 py-3">
            <span className="text-2xs text-txt-muted">Total</span>
            <p className="font-mono text-lg tnum text-txt-primary">{sorted.length}</p>
          </div>
          <div className="rounded-lg border border-edge bg-surface-raised px-4 py-3">
            <span className="text-2xs text-txt-muted">Pending</span>
            <p className="font-mono text-lg tnum text-warn">{sorted.filter((r) => r.verification === 'PENDING').length}</p>
          </div>
          <div className="rounded-lg border border-edge bg-surface-raised px-4 py-3">
            <span className="text-2xs text-txt-muted">Verified</span>
            <p className="font-mono text-lg tnum text-ok">{sorted.filter((r) => r.verification === 'VERIFIED').length}</p>
          </div>
          <div className="rounded-lg border border-edge bg-surface-raised px-4 py-3">
            <span className="text-2xs text-txt-muted">P1 critical</span>
            <p className="font-mono text-lg tnum text-alert">{sorted.filter((r) => r.priority === 'P1').length}</p>
          </div>
        </div>

        {/* Recommendation cards with pipeline progress bar */}
        {sorted.length > 0 ? (
          <div className="flex flex-col gap-4">
            {sorted.map((rec: MaintenanceRecommendation) => (
              <div key={rec.id} className="rounded-lg border border-edge bg-surface-raised">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-edge-soft px-5 py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xs text-txt-faint">{rec.id}</span>
                      <span className={`rounded border px-1.5 py-0.5 text-2xs font-semibold ${priorityConfig[rec.priority]}`}>{rec.priority}</span>
                      <StatusBadge state={rec.condition} />
                    </div>
                    <span className="text-sm text-txt-primary">
                      {SUBSYSTEM_LABELS[rec.subsystem]} — {rec.recommendation}
                    </span>
                  </div>
                </div>

                {/* Pipeline progress bar */}
                <div className="border-b border-edge-soft px-5 py-3">
                  <PipelineProgress rec={rec} />
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-px bg-edge-soft sm:grid-cols-4">
                  <div className="bg-surface-raised px-4 py-2">
                    <span className="text-2xs text-txt-muted">Severity</span>
                    <p className="text-sm text-txt-primary">{rec.severity}</p>
                  </div>
                  <div className="bg-surface-raised px-4 py-2">
                    <span className="text-2xs text-txt-muted">Subsystem</span>
                    <p className="text-sm text-txt-primary">{SUBSYSTEM_LABELS[rec.subsystem]}</p>
                  </div>
                  <div className="bg-surface-raised px-4 py-2">
                    <span className="text-2xs text-txt-muted">Evidence</span>
                    <p className="text-xs text-txt-secondary">{rec.evidence}</p>
                  </div>
                  <div className="bg-surface-raised px-4 py-2">
                    <span className="text-2xs text-txt-muted">Verification</span>
                    <p className={`text-sm ${rec.verification === 'VERIFIED' ? 'text-ok' : rec.verification === 'FAILED' ? 'text-alert' : rec.verification === 'PENDING' ? 'text-warn' : 'text-txt-muted'}`}>
                      {rec.verification === 'NOT_APPLICABLE' ? 'N/A' : rec.verification.charAt(0) + rec.verification.slice(1).toLowerCase()}
                    </p>
                  </div>
                </div>

                {/* Stage details */}
                <div className="grid grid-cols-1 gap-px bg-edge-soft sm:grid-cols-5">
                  {STAGES.map(({ key, label }) => {
                    const s = rec.stages[key];
                    return (
                      <div key={key} className="bg-surface-raised px-4 py-3">
                        <span className={`text-2xs font-medium ${stageStatusColor[s.status]}`}>{label}</span>
                        <p className="mt-1 text-xs text-txt-secondary">{s.detail}</p>
                        {s.timestamp && (
                          <p className="mt-1 font-mono text-2xs text-txt-faint">
                            {new Date(s.timestamp).toLocaleTimeString('en-GB', { hour12: false })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="No maintenance recommendations" hint="Recommendations will appear here when anomalies are detected" />
        )}
      </div>
    </AppLayout>
  );
}
