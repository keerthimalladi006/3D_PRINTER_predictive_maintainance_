import { CheckCircle2, Circle, Clock, Loader2, XCircle } from 'lucide-react';
import type { MaintenanceRecommendation, MaintenanceStage } from '../types';
import { StatusBadge } from './StatusBadge';
import { SUBSYSTEM_LABELS } from '../data/demoData';

const priorityConfig: Record<string, string> = {
  P1: 'text-alert border-alert-dim/40 bg-alert-soft/5',
  P2: 'text-warn border-warn-dim/40 bg-warn-soft/5',
  P3: 'text-txt-secondary border-edge bg-surface-overlay',
  P4: 'text-txt-muted border-edge-soft bg-surface-inset',
};

function StageIcon({ status }: { status: MaintenanceStage['status'] }) {
  switch (status) {
    case 'COMPLETE':
      return <CheckCircle2 size={14} className="text-ok" />;
    case 'IN_PROGRESS':
      return <Loader2 size={14} className="animate-spin text-warn" />;
    case 'PENDING':
      return <Clock size={14} className="text-txt-faint" />;
  }
}

function stageLabel(s: MaintenanceStage, label: string) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <StageIcon status={s.status} />
        <span
          className={`text-2xs font-medium ${
            s.status === 'COMPLETE'
              ? 'text-ok'
              : s.status === 'IN_PROGRESS'
                ? 'text-warn'
                : 'text-txt-muted'
          }`}
        >
          {label}
        </span>
      </div>
      <span className="text-xs text-txt-secondary">{s.detail}</span>
      {s.timestamp && (
        <span className="font-mono text-2xs text-txt-faint">
          {new Date(s.timestamp).toLocaleTimeString('en-GB', { hour12: false })}
        </span>
      )}
    </div>
  );
}

interface Props {
  rec: MaintenanceRecommendation;
}

export function MaintenanceRecommendationCard({ rec }: Props) {
  const stages = [
    { label: 'Detection', stage: rec.stages.detection },
    { label: 'Assessment', stage: rec.stages.assessment },
    { label: 'Recommendation', stage: rec.stages.recommendation },
    { label: 'Maintenance', stage: rec.stages.maintenance },
    { label: 'Verification', stage: rec.stages.verification },
  ];

  const verificationIcon =
    rec.verification === 'VERIFIED' ? (
      <span className="flex items-center gap-1 text-2xs text-ok">
        <CheckCircle2 size={12} /> Verified
      </span>
    ) : rec.verification === 'FAILED' ? (
      <span className="flex items-center gap-1 text-2xs text-alert">
        <XCircle size={12} /> Failed
      </span>
    ) : rec.verification === 'NOT_APPLICABLE' ? (
      <span className="flex items-center gap-1 text-2xs text-txt-muted">
        <Circle size={12} /> N/A
      </span>
    ) : (
      <span className="flex items-center gap-1 text-2xs text-warn">
        <Clock size={12} /> Pending
      </span>
    );

  return (
    <div className="rounded-lg border border-edge bg-surface-raised">
      <div className="flex items-start justify-between gap-4 border-b border-edge-soft px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xs text-txt-faint">{rec.id}</span>
            <span
              className={`rounded border px-1.5 py-0.5 text-2xs font-semibold ${priorityConfig[rec.priority]}`}
            >
              {rec.priority}
            </span>
            <StatusBadge state={rec.condition} />
          </div>
          <span className="text-sm text-txt-primary">
            {SUBSYSTEM_LABELS[rec.subsystem]} — {rec.recommendation}
          </span>
        </div>
        {verificationIcon}
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-edge-soft bg-edge-soft sm:grid-cols-4">
        <div className="bg-surface-raised px-4 py-2">
          <span className="text-2xs text-txt-muted">Severity</span>
          <p className="text-sm text-txt-primary">{rec.severity}</p>
        </div>
        <div className="bg-surface-raised px-4 py-2">
          <span className="text-2xs text-txt-muted">Subsystem</span>
          <p className="text-sm text-txt-primary">{SUBSYSTEM_LABELS[rec.subsystem]}</p>
        </div>
        <div className="bg-surface-raised px-4 py-2">
          <span className="text-2xs text-txt-muted">Priority</span>
          <p className="text-sm text-txt-primary">{rec.priority}</p>
        </div>
        <div className="bg-surface-raised px-4 py-2">
          <span className="text-2xs text-txt-muted">Evidence</span>
          <p className="text-xs text-txt-secondary">{rec.evidence}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-edge-soft sm:grid-cols-5">
        {stages.map(({ label, stage }) => (
          <div key={label} className="bg-surface-raised px-4 py-3">
            {stageLabel(stage, label)}
          </div>
        ))}
      </div>
    </div>
  );
}
