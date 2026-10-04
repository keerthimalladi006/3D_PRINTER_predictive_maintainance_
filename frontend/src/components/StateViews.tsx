import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-lg border border-edge-soft bg-surface-raised py-16">
      <Loader2 size={18} className="animate-spin text-txt-muted" />
      <span className="text-sm text-txt-secondary">{label}</span>
    </div>
  );
}

export function EmptyState({
  label = 'No data available',
  hint,
}: {
  label?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-edge-soft bg-surface-raised py-16">
      <Inbox size={24} className="text-txt-faint" />
      <span className="text-sm text-txt-secondary">{label}</span>
      {hint && <span className="text-2xs text-txt-faint">{hint}</span>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-alert-dim/40 bg-alert-soft/5 py-16">
      <AlertTriangle size={24} className="text-alert" />
      <span className="text-sm text-alert">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-md border border-edge-strong px-3 py-1 text-2xs text-txt-secondary hover:bg-surface-overlay"
        >
          Retry
        </button>
      )}
    </div>
  );
}
