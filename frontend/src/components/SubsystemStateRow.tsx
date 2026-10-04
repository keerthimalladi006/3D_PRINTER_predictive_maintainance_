import type { SubsystemState } from '../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  subsystem: SubsystemState;
}

export function SubsystemStateRow({ subsystem }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-edge-soft bg-surface-raised px-4 py-2.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-txt-primary">{subsystem.label}</span>
        <span className="text-2xs text-txt-muted">{subsystem.detail}</span>
      </div>
      <StatusBadge state={subsystem.state} />
    </div>
  );
}
