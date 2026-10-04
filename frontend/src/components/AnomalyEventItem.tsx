import { ChevronRight } from 'lucide-react';
import type { AnomalyEvent, Severity, SubsystemId } from '../types';
import { SUBSYSTEM_LABELS } from '../data/demoData';

const severityConfig: Record<Severity, string> = {
  LOW: 'text-txt-muted border-edge',
  MEDIUM: 'text-warn border-warn-dim/40',
  HIGH: 'text-warn border-warn-dim/40',
  CRITICAL: 'text-alert border-alert-dim/40',
};

interface Props {
  event: AnomalyEvent;
  selected: boolean;
  onSelect: (event: AnomalyEvent) => void;
}

function fmtTime(t: number): string {
  const d = new Date(t);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function AnomalyEventItem({ event, selected, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(event)}
      className={`w-full text-left border-l-2 px-4 py-3 transition-colors ${
        selected
          ? 'border-brand bg-brand/5'
          : 'border-edge-soft bg-surface-raised hover:bg-surface-overlay'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs text-txt-faint">{event.id}</span>
            <span
              className={`rounded border px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide ${severityConfig[event.severity]}`}
            >
              {event.severity}
            </span>
          </div>
          <span className="text-sm text-txt-primary">{event.title}</span>
          <span className="text-2xs text-txt-muted">
            {SUBSYSTEM_LABELS[event.subsystem as SubsystemId]} · {fmtTime(event.windowStart)} –{' '}
            {fmtTime(event.windowEnd)} ({fmtDuration(event.windowEnd - event.windowStart)})
          </span>
        </div>
        <ChevronRight
          size={16}
          className={selected ? 'text-brand' : 'text-txt-faint'}
        />
      </div>
    </button>
  );
}
