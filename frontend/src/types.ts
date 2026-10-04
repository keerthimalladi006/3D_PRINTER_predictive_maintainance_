// ─── Core domain types for the FDM Condition Monitor ───────────────────────
// These interfaces define the contract between the UI and the data layer.
// The API service layer returns these shapes; swapping demo data for a real
// backend requires no UI changes as long as the backend returns the same shapes.

export type ConditionState = 'NORMAL' | 'WARNING' | 'ABNORMAL';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export type VerificationState = 'PENDING' | 'VERIFIED' | 'FAILED' | 'NOT_APPLICABLE';

export type SubsystemId =
  | 'X_AXIS'
  | 'Y_AXIS'
  | 'Z_AXIS'
  | 'PRINT_HEAD'
  | 'MOTION_SYSTEM'
  | 'FRAME';

export interface SubsystemState {
  id: SubsystemId;
  label: string;
  state: ConditionState;
  detail: string;
}

export interface AxisPosition {
  x: number; // mm
  y: number; // mm
  z: number; // mm;
}

export interface MachineStatus {
  machineId: string;
  machineName: string;
  condition: ConditionState;
  healthScore: number; // 0–100
  vibrationRms: number; // mm/s
  anomalyState: ConditionState;
  lastUpdate: string; // ISO timestamp
  axisPosition: AxisPosition;
  subsystems: SubsystemState[];
  printHeadState: 'IDLE' | 'PRINTING' | 'HOMING' | 'ERROR';
  motionState: 'MOVING' | 'IDLE' | 'HOMING';
}

export interface SensorSample {
  t: number; // epoch ms
  ax: number; // acceleration X (m/s²)
  ay: number;
  az: number;
  gx: number; // gyroscope X (°/s) — secondary signal
  gy: number;
  gz: number;
  condition: ConditionState; // label for the period this sample belongs to
}

export interface VibrationFeature {
  axis: 'ax' | 'ay' | 'az' | 'gx' | 'gy' | 'gz';
  rms: number;
  peak: number;
  stdDev: number;
  kurtosis: number;
}

export interface HealthPoint {
  t: number; // epoch ms
  healthScore: number; // 0–100
  anomalyScore: number; // 0–1
  state: ConditionState;
}

export interface AnomalyEvent {
  id: string;
  t: number; // epoch ms — detection time
  severity: Severity;
  subsystem: SubsystemId;
  title: string;
  description: string;
  windowStart: number; // epoch ms
  windowEnd: number; // epoch ms
  evidenceMetrics: string[]; // e.g. ["RMS Ax +42%", "Kurtosis Ay 6.3"]
}

export interface MaintenanceStage {
  status: 'COMPLETE' | 'IN_PROGRESS' | 'PENDING';
  timestamp: string | null; // ISO
  detail: string;
}

export interface MaintenanceRecommendation {
  id: string;
  condition: ConditionState;
  evidence: string;
  severity: Severity;
  subsystem: SubsystemId;
  recommendation: string;
  priority: Priority;
  verification: VerificationState;
  stages: {
    detection: MaintenanceStage;
    assessment: MaintenanceStage;
    recommendation: MaintenanceStage;
    maintenance: MaintenanceStage;
    verification: MaintenanceStage;
  };
}

// ─── Recent change entries for the overview page ───────────────────────────

export interface RecentChange {
  id: string;
  t: number; // epoch ms
  type: 'STATE_TRANSITION' | 'THRESHOLD_CROSS' | 'METRIC_SHIFT' | 'ANOMALY_DETECTED';
  description: string;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
}
