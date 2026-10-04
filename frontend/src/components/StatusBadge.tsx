import type { ConditionState } from '../types';

const config: Record<ConditionState, { label: string; text: string; bg: string; border: string; dot: string }> = {
  NORMAL: {
    label: 'Normal',
    text: 'text-ok',
    bg: 'bg-ok-soft/10',
    border: 'border-ok-dim/40',
    dot: 'bg-ok',
  },
  WARNING: {
    label: 'Warning',
    text: 'text-warn',
    bg: 'bg-warn-soft/10',
    border: 'border-warn-dim/40',
    dot: 'bg-warn',
  },
  ABNORMAL: {
    label: 'Abnormal',
    text: 'text-alert',
    bg: 'bg-alert-soft/10',
    border: 'border-alert-dim/40',
    dot: 'bg-alert',
  },
};

interface Props {
  state: ConditionState;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function StatusBadge({ state, size = 'sm', pulse = false }: Props) {
  const c = config[state];
  const padding = size === 'lg' ? 'px-3.5 py-2' : size === 'md' ? 'px-3 py-1.5' : 'px-2.5 py-1';
  const textSize = size === 'lg' ? 'text-sm' : 'text-2xs';
  const dotSize = size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border ${c.border} ${c.bg} ${c.text} ${padding} font-medium ${textSize} uppercase tracking-wide tnum`}
    >
      <span className={`relative flex ${dotSize}`}>
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${c.dot} opacity-60`}
          />
        )}
        <span className={`relative inline-flex ${dotSize} rounded-full ${c.dot}`} />
      </span>
      {c.label}
    </span>
  );
}
