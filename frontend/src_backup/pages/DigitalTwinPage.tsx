import { getMachineStatus } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import type { AxisPosition, SubsystemState } from '../types';
import { AppLayout } from '../components/AppLayout';
import { SubsystemStateRow } from '../components/SubsystemStateRow';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState, ErrorState } from '../components/StateViews';

const stateColor: Record<string, string> = {
  NORMAL: '#2dd4bf',
  WARNING: '#f59e0b',
  ABNORMAL: '#ef4444',
};

function PrinterSchematic({
  axisPosition,
  subsystems,
  motionState,
  printHeadState,
}: {
  axisPosition: AxisPosition;
  subsystems: SubsystemState[];
  motionState: string;
  printHeadState: string;
}) {
  const subById = (id: string) => subsystems.find((s) => s.id === id);
  const headX = 30 + (axisPosition.x / 200) * 240;
  const bedYOffset = (axisPosition.y / 200) * 80;

  const xState = subById('X_AXIS')?.state ?? 'NORMAL';
  const yState = subById('Y_AXIS')?.state ?? 'NORMAL';
  const zState = subById('Z_AXIS')?.state ?? 'NORMAL';
  const headState = subById('PRINT_HEAD')?.state ?? 'NORMAL';
  const motionColor = stateColor[subById('MOTION_SYSTEM')?.state ?? 'NORMAL'];

  return (
    <svg viewBox="0 0 500 360" className="w-full">
      {/* Frame */}
      <rect x="15" y="15" width="470" height="330" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-edge-strong" />
      <rect x="28" y="28" width="444" height="304" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" className="text-edge" />

      {/* Z-axis columns */}
      <line x1="40" y1="40" x2="40" y2="320" stroke={stateColor[zState]} strokeWidth="2.5" />
      <line x1="460" y1="40" x2="460" y2="320" stroke={stateColor[zState]} strokeWidth="2.5" />
      <text x="32" y="36" fill={stateColor[zState]} fontSize="11" fontWeight="600">Z</text>

      {/* Lead screw */}
      <line x1="250" y1="40" x2="250" y2="310" stroke={stateColor[zState]} strokeWidth="1.5" strokeDasharray="2 4" />
      <text x="256" y="36" fill={stateColor[zState]} fontSize="9" fontFamily="monospace">Z={axisPosition.z.toFixed(1)}mm</text>

      {/* X-axis rail */}
      <line x1="40" y1="100" x2="460" y2="100" stroke={stateColor[xState]} strokeWidth="2.5" />
      <text x="470" y="104" fill={stateColor[xState]} fontSize="11" fontWeight="600">X</text>

      {/* Print head carriage */}
      <g>
        <rect x={headX - 10} y="90" width="20" height="20" rx="2" fill="none" stroke={stateColor[headState]} strokeWidth="2" />
        <polygon points={`${headX - 5},${110} ${headX + 5},${110} ${headX},${122}`} fill="none" stroke={stateColor[headState]} strokeWidth="1.5" />
        <text x={headX + 14} y="98" fill={stateColor[headState]} fontSize="8" fontFamily="monospace">X={axisPosition.x.toFixed(1)}</text>
      </g>

      {/* Y-axis bed */}
      <rect x="80" y={140 + bedYOffset} width="340" height="70" rx="2" fill="none" stroke={stateColor[yState]} strokeWidth="2.5" />
      <text x="60" y={140 + bedYOffset + 40} fill={stateColor[yState]} fontSize="11" fontWeight="600">Y</text>
      <text x="425" y={140 + bedYOffset + 40} fill={stateColor[yState]} fontSize="8" fontFamily="monospace">Y={axisPosition.y.toFixed(1)}</text>

      {/* Motion indicator */}
      <circle cx="475" cy="335" r="4" fill={motionColor} opacity="0.8" />
      <text x="430" y="338" fill={motionColor} fontSize="8" fontFamily="monospace">{motionState}</text>

      {/* Print head state */}
      <text x="32" y="338" fill={stateColor[headState]} fontSize="8" fontFamily="monospace">HEAD: {printHeadState}</text>
    </svg>
  );
}

export function DigitalTwinPage() {
  const statusRes = useAsync(getMachineStatus);

  if (statusRes.loading) {
    return <AppLayout status={statusRes.data}><LoadingState label="Loading machine state…" /></AppLayout>;
  }
  if (statusRes.error) {
    return <AppLayout status={statusRes.data}><ErrorState message={statusRes.error} onRetry={statusRes.refetch} /></AppLayout>;
  }

  const status = statusRes.data!;

  return (
    <AppLayout status={status}>
      <div className="flex flex-col gap-5">
        {/* Full-width centered schematic */}
        <div className="rounded-lg border border-edge bg-surface-raised p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-txt-secondary">FDM printer schematic</h2>
            <span className="text-2xs text-txt-faint">Health / state representation</span>
          </div>
          <div className="flex justify-center">
            <PrinterSchematic
              axisPosition={status.axisPosition}
              subsystems={status.subsystems}
              motionState={status.motionState}
              printHeadState={status.printHeadState}
            />
          </div>
        </div>

        {/* Compact axis position + state summary */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-edge bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-medium text-txt-secondary">Axis position</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xs text-txt-muted">X</span>
                <span className="font-mono text-xl tnum text-txt-primary">{status.axisPosition.x.toFixed(1)}</span>
                <span className="text-2xs text-txt-faint">mm</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xs text-txt-muted">Y</span>
                <span className="font-mono text-xl tnum text-txt-primary">{status.axisPosition.y.toFixed(1)}</span>
                <span className="text-2xs text-txt-faint">mm</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xs text-txt-muted">Z</span>
                <span className="font-mono text-xl tnum text-txt-primary">{status.axisPosition.z.toFixed(1)}</span>
                <span className="text-2xs text-txt-faint">mm</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-edge bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-medium text-txt-secondary">Operational state</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-txt-muted">Print head</span>
                <span className="text-sm text-txt-primary">{status.printHeadState}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-txt-muted">Motion</span>
                <span className="text-sm text-txt-primary">{status.motionState}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-txt-muted">Overall</span>
                <StatusBadge state={status.condition} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-edge bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-medium text-txt-secondary">Subsystem states</h2>
            <div className="flex flex-col gap-2">
              {status.subsystems.slice(0, 4).map((sub) => (
                <SubsystemStateRow key={sub.id} subsystem={sub} />
              ))}
            </div>
          </div>
        </div>

        {/* Remaining subsystems */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {status.subsystems.slice(4).map((sub) => (
            <SubsystemStateRow key={sub.id} subsystem={sub} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
