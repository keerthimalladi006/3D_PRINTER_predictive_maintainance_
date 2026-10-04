import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  precision?: number;
  accent?: 'default' | 'ok' | 'warn' | 'alert';
}

export function MetricDisplay({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  precision = 2,
  accent = 'default',
}: Props) {
  const formatted = typeof value === 'number' ? value.toFixed(precision) : value;

  const accentText =
    accent === 'ok'
      ? 'text-ok'
      : accent === 'warn'
        ? 'text-warn'
        : accent === 'alert'
          ? 'text-alert'
          : 'text-txt-primary';

  const deltaIcon =
    delta === undefined ? null : delta > 0 ? (
      <ArrowUp size={12} className="text-warn" />
    ) : delta < 0 ? (
      <ArrowDown size={12} className="text-ok" />
    ) : (
      <Minus size={12} className="text-txt-muted" />
    );

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-edge bg-surface-raised px-4 py-3">
      <span className="text-2xs font-medium text-txt-muted">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono text-xl tnum ${accentText}`}>{formatted}</span>
        {unit && <span className="text-xs text-txt-faint">{unit}</span>}
      </div>
      {(delta !== undefined || deltaLabel) && (
        <div className="flex items-center gap-1">
          {deltaIcon}
          {deltaLabel && <span className="text-2xs text-txt-muted">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function MetricCell({
  label,
  value,
  unit,
  precision = 2,
  accent = 'default',
}: {
  label: string;
  value: string | number;
  unit?: string;
  precision?: number;
  accent?: 'default' | 'ok' | 'warn' | 'alert';
}) {
  const formatted = typeof value === 'number' ? value.toFixed(precision) : value;
  const accentText =
    accent === 'ok'
      ? 'text-ok'
      : accent === 'warn'
        ? 'text-warn'
        : accent === 'alert'
          ? 'text-alert'
          : 'text-txt-primary';

  return (
    <div className="flex flex-col gap-0.5 bg-surface-raised px-4 py-3">
      <span className="text-2xs font-medium text-txt-muted">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-lg tnum ${accentText}`}>{formatted}</span>
        {unit && <span className="text-2xs text-txt-faint">{unit}</span>}
      </div>
    </div>
  );
}
