import type {
  AnomalyEvent,
  ConditionState,
  HealthPoint,
  MachineStatus,
  MaintenanceRecommendation,
  MaintenanceStage,
  RecentChange,
  SensorSample,
  Severity,
  SubsystemId,
  SubsystemState,
  VibrationFeature,
} from '../types';

// ─── Deterministic PRNG (mulberry32) ───────────────────────────────────────
// Seeded so every page sees the same data — repeatable across route changes.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
function gaussian(mean: number, std: number): number {
  // Box-Muller
  const u1 = Math.max(rand(), 1e-10);
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

// ─── Session timeline ──────────────────────────────────────────────────────
// A single continuous print session with deterministic phase boundaries.
// Total duration: 30 minutes (1 800 000 ms). Samples at 100 ms intervals.

export const SESSION_START = new Date('2026-10-04T09:00:00Z').getTime();
export const SESSION_END = SESSION_START + 30 * 60 * 1000;
export const SAMPLE_INTERVAL_MS = 100;
export const TOTAL_SAMPLES = Math.floor((SESSION_END - SESSION_START) / SAMPLE_INTERVAL_MS);

// Phase boundaries (as fraction of session)
const PHASE_NORMAL_END = 0.40; // 0–40 % normal
const PHASE_WARNING_END = 0.70; // 40–70 % warning
// 70–100 % abnormal

function phaseForIndex(i: number): ConditionState {
  const frac = i / TOTAL_SAMPLES;
  if (frac < PHASE_NORMAL_END) return 'NORMAL';
  if (frac < PHASE_WARNING_END) return 'WARNING';
  return 'ABNORMAL';
}

function conditionParams(cond: ConditionState): {
  axMean: number; axStd: number; ayMean: number; ayStd: number;
  azMean: number; azStd: number; gStd: number;
} {
  switch (cond) {
    case 'NORMAL':
      return { axMean: 0.02, axStd: 0.15, ayMean: -0.01, ayStd: 0.12, azMean: 9.81, azStd: 0.10, gStd: 0.08 };
    case 'WARNING':
      return { axMean: 0.08, axStd: 0.35, ayMean: 0.03, ayStd: 0.28, azMean: 9.82, azStd: 0.18, gStd: 0.20 };
    case 'ABNORMAL':
      return { axMean: 0.25, axStd: 0.80, ayMean: -0.12, ayStd: 0.65, azMean: 9.85, azStd: 0.35, gStd: 0.55 };
  }
}

// ─── Pre-generate the full sensor dataset ──────────────────────────────────

const sensorSamples: SensorSample[] = (() => {
  const out: SensorSample[] = [];
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const cond = phaseForIndex(i);
    const p = conditionParams(cond);
    const t = SESSION_START + i * SAMPLE_INTERVAL_MS;

    // Inject a periodic component that grows with severity (motor RPM vibration)
    const rpmFreq = 48; // Hz-ish relative to sample index
    const phase = (i / SAMPLE_INTERVAL_MS) * rpmFreq * 2 * Math.PI;
    const periodicAmp = cond === 'NORMAL' ? 0.05 : cond === 'WARNING' ? 0.18 : 0.45;

    // Inject sharp transient spikes during abnormal
    const spike = cond === 'ABNORMAL' && rand() < 0.03 ? gaussian(0, 2.5) : 0;

    out.push({
      t,
      ax: gaussian(p.axMean, p.axStd) + Math.sin(phase) * periodicAmp + spike,
      ay: gaussian(p.ayMean, p.ayStd) + Math.cos(phase * 0.97) * periodicAmp,
      az: gaussian(p.azMean, p.azStd) + Math.sin(phase * 1.03) * periodicAmp * 0.5,
      gx: gaussian(0, p.gStd) + Math.sin(phase * 0.8) * periodicAmp * 0.3,
      gy: gaussian(0, p.gStd) + Math.cos(phase * 0.85) * periodicAmp * 0.3,
      gz: gaussian(0, p.gStd) + Math.sin(phase * 0.9) * periodicAmp * 0.2,
      condition: cond,
    });
  }
  return out;
})();

// ─── Vibration features (computed per axis over a window) ──────────────────

function computeFeatures(samples: SensorSample[], key: keyof SensorSample): number[] {
  const vals = samples.map((s) => Number(s[key]));
  const n = vals.length;
  if (n === 0) return [0, 0, 0, 0];
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const rms = Math.sqrt(vals.reduce((a, b) => a + b * b, 0) / n);
  const peak = Math.max(...vals.map((v) => Math.abs(v)));
  // Kurtosis: 4th central moment / variance²
  const kurt =
    variance > 1e-10
      ? vals.reduce((a, b) => a + (b - mean) ** 4, 0) / n / variance ** 2
      : 0;
  return [rms, peak, std, kurt];
}

function featureForAxis(
  samples: SensorSample[],
  axis: VibrationFeature['axis'],
): VibrationFeature {
  const [rms, peak, stdDev, kurtosis] = computeFeatures(samples, axis);
  return { axis, rms, peak, stdDev, kurtosis };
}

// ─── Health timeline (downsampled to 1-second points) ──────────────────────

const healthPoints: HealthPoint[] = (() => {
  const out: HealthPoint[] = [];
  const step = Math.floor(1000 / SAMPLE_INTERVAL_MS); // 1 point per second
  for (let i = 0; i < TOTAL_SAMPLES; i += step) {
    const cond = phaseForIndex(i);
    const frac = i / TOTAL_SAMPLES;
    // Health degrades through the session
    let score: number;
    let anomaly: number;
    if (cond === 'NORMAL') {
      score = 92 + gaussian(0, 1.5) - frac * 5;
      anomaly = 0.05 + Math.abs(gaussian(0, 0.03));
    } else if (cond === 'WARNING') {
      score = 72 + gaussian(0, 2.5) - (frac - PHASE_NORMAL_END) * 30;
      anomaly = 0.35 + Math.abs(gaussian(0, 0.06));
    } else {
      score = 45 + gaussian(0, 3) - (frac - PHASE_WARNING_END) * 60;
      anomaly = 0.65 + Math.abs(gaussian(0, 0.08));
    }
    score = Math.max(5, Math.min(100, score));
    anomaly = Math.max(0, Math.min(1, anomaly));
    out.push({
      t: SESSION_START + i * SAMPLE_INTERVAL_MS,
      healthScore: score,
      anomalyScore: anomaly,
      state: cond,
    });
  }
  return out;
})();

// ─── Anomaly events ────────────────────────────────────────────────────────

const anomalyEvents: AnomalyEvent[] = [
  {
    id: 'AE-001',
    t: SESSION_START + 12 * 60 * 1000 + 15000,
    severity: 'LOW',
    subsystem: 'X_AXIS',
    title: 'RMS deviation on X-axis',
    description:
      'Vibration RMS on the X-axis accelerometer exceeded the baseline by 18%. Trend is gradual; no transient spikes detected.',
    windowStart: SESSION_START + 12 * 60 * 1000,
    windowEnd: SESSION_START + 12 * 60 * 1000 + 30000,
    evidenceMetrics: ['RMS Ax +18%', 'Kurtosis Ax 4.1'],
  },
  {
    id: 'AE-002',
    t: SESSION_START + 18 * 60 * 1000 + 20000,
    severity: 'MEDIUM',
    subsystem: 'Y_AXIS',
    title: 'Increased kurtosis on Y-axis',
    description:
      'Kurtosis on the Y-axis rose to 5.8, indicating non-Gaussian impact-like vibration. Likely related to belt tension or bearing irregularity.',
    windowStart: SESSION_START + 18 * 60 * 1000,
    windowEnd: SESSION_START + 18 * 60 * 1000 + 40000,
    evidenceMetrics: ['Kurtosis Ay 5.8', 'RMS Ay +31%'],
  },
  {
    id: 'AE-003',
    t: SESSION_START + 22 * 60 * 1000 + 10000,
    severity: 'HIGH',
    subsystem: 'PRINT_HEAD',
    title: 'Print head vibration escalation',
    description:
      'Co-located Ax and Az energy increased sharply. Combined RMS crossed the warning-2 threshold. Pattern consistent with fan imbalance or partial nozzle obstruction.',
    windowStart: SESSION_START + 22 * 60 * 1000,
    windowEnd: SESSION_START + 22 * 60 * 1000 + 50000,
    evidenceMetrics: ['RMS Ax +52%', 'RMS Az +28%', 'Peak Ax 2.1 m/s²'],
  },
  {
    id: 'AE-004',
    t: SESSION_START + 26 * 60 * 1000 + 5000,
    severity: 'CRITICAL',
    subsystem: 'Z_AXIS',
    title: 'Transient spikes on Z-axis lead screw',
    description:
      'Repeating high-amplitude transients detected on the Z-axis accelerometer at 48 Hz harmonics. Pattern suggests lead-screw bearing degradation or misalignment.',
    windowStart: SESSION_START + 26 * 60 * 1000,
    windowEnd: SESSION_START + 26 * 60 * 1000 + 60000,
    evidenceMetrics: ['Peak Az 3.4 m/s²', 'Kurtosis Az 7.2', 'RMS Az +61%'],
  },
  {
    id: 'AE-005',
    t: SESSION_START + 28 * 60 * 1000 + 30000,
    severity: 'HIGH',
    subsystem: 'MOTION_SYSTEM',
    title: 'Motion system resonance shift',
    description:
      'Gyroscope primary frequency shifted from 48 Hz to 52 Hz with broadband energy increase. May indicate loosening mechanical coupling in the motion assembly.',
    windowStart: SESSION_START + 28 * 60 * 1000,
    windowEnd: SESSION_START + 28 * 60 * 1000 + 45000,
    evidenceMetrics: ['Gz RMS +44%', 'Frequency shift 48→52 Hz'],
  },
];

// ─── Maintenance recommendations ───────────────────────────────────────────

function stage(status: MaintenanceStage['status'], detail: string, ts: string | null = null): MaintenanceStage {
  return { status, timestamp: ts, detail };
}

const maintenanceRecs: MaintenanceRecommendation[] = [
  {
    id: 'MR-001',
    condition: 'ABNORMAL',
    evidence: 'AE-004: Transient spikes on Z-axis lead screw at 48 Hz harmonics',
    severity: 'CRITICAL',
    subsystem: 'Z_AXIS',
    recommendation:
      'Inspect Z-axis lead screw bearings and coupling alignment. Replace bearings if pitting or wear is visible. Re-calibrate Z-axis backlash after reassembly.',
    priority: 'P1',
    verification: 'PENDING',
    stages: {
      detection: stage('COMPLETE', 'AE-004 detected at 26 min into session', new Date(SESSION_START + 26 * 60 * 1000 + 5000).toISOString()),
      assessment: stage('COMPLETE', 'Severity assessed as CRITICAL based on kurtosis 7.2 and repeating transient pattern', new Date(SESSION_START + 27 * 60 * 1000).toISOString()),
      recommendation: stage('COMPLETE', 'Lead-screw bearing inspection and Z-axis recalibration recommended', new Date(SESSION_START + 27 * 60 * 1000 + 30000).toISOString()),
      maintenance: stage('PENDING', 'Awaiting technician scheduling'),
      verification: stage('PENDING', 'Post-maintenance vibration baseline comparison required'),
    },
  },
  {
    id: 'MR-002',
    condition: 'WARNING',
    evidence: 'AE-003: Print head vibration escalation — Ax +52%, Az +28%',
    severity: 'HIGH',
    subsystem: 'PRINT_HEAD',
    recommendation:
      'Check print head cooling fan balance and nozzle condition. Clean or replace fan if imbalance is detected. Inspect hot-end heat break for partial obstruction.',
    priority: 'P2',
    verification: 'PENDING',
    stages: {
      detection: stage('COMPLETE', 'AE-003 detected at 22 min into session', new Date(SESSION_START + 22 * 60 * 1000 + 10000).toISOString()),
      assessment: stage('COMPLETE', 'Severity assessed as HIGH — co-located Ax/Az energy with sharp escalation', new Date(SESSION_START + 23 * 60 * 1000).toISOString()),
      recommendation: stage('COMPLETE', 'Fan balance check and nozzle inspection recommended', new Date(SESSION_START + 23 * 60 * 1000 + 20000).toISOString()),
      maintenance: stage('PENDING', 'Scheduled for next maintenance window'),
      verification: stage('PENDING', 'Vibration RMS should return to baseline within 10% after intervention'),
    },
  },
  {
    id: 'MR-003',
    condition: 'WARNING',
    evidence: 'AE-002: Increased kurtosis on Y-axis (5.8)',
    severity: 'MEDIUM',
    subsystem: 'Y_AXIS',
    recommendation:
      'Check Y-axis belt tension and idler bearing condition. Re-tension belt to specification if slack is detected. Monitor kurtosis trend over next 2 print sessions.',
    priority: 'P3',
    verification: 'NOT_APPLICABLE',
    stages: {
      detection: stage('COMPLETE', 'AE-002 detected at 18 min into session', new Date(SESSION_START + 18 * 60 * 1000 + 20000).toISOString()),
      assessment: stage('COMPLETE', 'Severity assessed as MEDIUM — kurtosis elevated but RMS within warning band', new Date(SESSION_START + 19 * 60 * 1000).toISOString()),
      recommendation: stage('COMPLETE', 'Belt tension check and trend monitoring recommended', new Date(SESSION_START + 19 * 60 * 1000 + 15000).toISOString()),
      maintenance: stage('IN_PROGRESS', 'Belt tension adjustment in progress', new Date(SESSION_START + 20 * 60 * 1000).toISOString()),
      verification: stage('PENDING', 'Confirm kurtosis returns below 4.0 after adjustment'),
    },
  },
  {
    id: 'MR-004',
    condition: 'NORMAL',
    evidence: 'AE-001: RMS deviation on X-axis (+18%)',
    severity: 'LOW',
    subsystem: 'X_AXIS',
    recommendation:
      'No immediate action required. Log the observation and monitor the X-axis RMS trend during the next print session for recurrence.',
    priority: 'P4',
    verification: 'VERIFIED',
    stages: {
      detection: stage('COMPLETE', 'AE-001 detected at 12 min into session', new Date(SESSION_START + 12 * 60 * 1000 + 15000).toISOString()),
      assessment: stage('COMPLETE', 'Severity assessed as LOW — minor RMS deviation, self-resolving', new Date(SESSION_START + 13 * 60 * 1000).toISOString()),
      recommendation: stage('COMPLETE', 'Observation only — log and monitor', new Date(SESSION_START + 13 * 60 * 1000 + 10000).toISOString()),
      maintenance: stage('COMPLETE', 'No intervention applied — observation logged', new Date(SESSION_START + 14 * 60 * 1000).toISOString()),
      verification: stage('COMPLETE', 'X-axis RMS returned to baseline within 3 minutes', new Date(SESSION_START + 15 * 60 * 1000).toISOString()),
    },
  },
];

// ─── Recent changes ────────────────────────────────────────────────────────

const recentChanges: RecentChange[] = [
  {
    id: 'RC-001',
    t: SESSION_START + 21 * 60 * 1000,
    type: 'STATE_TRANSITION',
    description: 'Machine state transitioned WARNING → ABNORMAL',
    direction: 'UP',
  },
  {
    id: 'RC-002',
    t: SESSION_START + 18 * 60 * 1000 + 20000,
    type: 'ANOMALY_DETECTED',
    description: 'Anomaly AE-002 detected: Y-axis kurtosis 5.8',
    direction: 'UP',
  },
  {
    id: 'RC-003',
    t: SESSION_START + 12 * 60 * 1000,
    type: 'STATE_TRANSITION',
    description: 'Machine state transitioned NORMAL → WARNING',
    direction: 'UP',
  },
  {
    id: 'RC-004',
    t: SESSION_START + 10 * 60 * 1000,
    type: 'THRESHOLD_CROSS',
    description: 'X-axis RMS crossed warning threshold (0.35 m/s²)',
    direction: 'UP',
  },
  {
    id: 'RC-005',
    t: SESSION_START + 5 * 60 * 1000,
    type: 'METRIC_SHIFT',
    description: 'Health score decreased from 94 to 89 over 2 min',
    direction: 'DOWN',
  },
];

// ─── Current machine status ────────────────────────────────────────────────

const subsystemStates: SubsystemState[] = [
  { id: 'X_AXIS', label: 'X-Axis', state: 'WARNING', detail: 'RMS elevated +18%, gradual trend' },
  { id: 'Y_AXIS', label: 'Y-Axis', state: 'WARNING', detail: 'Kurtosis 5.8 — impact-like vibration' },
  { id: 'Z_AXIS', label: 'Z-Axis', state: 'ABNORMAL', detail: 'Transient spikes at 48 Hz harmonics' },
  { id: 'PRINT_HEAD', label: 'Print Head', state: 'ABNORMAL', detail: 'Co-located Ax/Az energy escalation' },
  { id: 'MOTION_SYSTEM', label: 'Motion System', state: 'WARNING', detail: 'Resonance shift 48 → 52 Hz' },
  { id: 'FRAME', label: 'Frame', state: 'NORMAL', detail: 'No significant deviation detected' },
];

const machineStatus: MachineStatus = {
  machineId: 'FDM-UNIT-04',
  machineName: 'FDM Research Printer — Unit 04',
  condition: 'ABNORMAL',
  healthScore: 38,
  vibrationRms: 1.24,
  anomalyState: 'ABNORMAL',
  lastUpdate: new Date(SESSION_END).toISOString(),
  axisPosition: { x: 124.3, y: 86.7, z: 42.1 },
  subsystems: subsystemStates,
  printHeadState: 'PRINTING',
  motionState: 'MOVING',
};

// ─── Subsystem helpers ─────────────────────────────────────────────────────

export const SUBSYSTEM_LABELS: Record<SubsystemId, string> = {
  X_AXIS: 'X-Axis',
  Y_AXIS: 'Y-Axis',
  Z_AXIS: 'Z-Axis',
  PRINT_HEAD: 'Print Head',
  MOTION_SYSTEM: 'Motion System',
  FRAME: 'Frame',
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

// ─── Public demo data accessors ────────────────────────────────────────────
// These are consumed by the API service layer. Each returns a deep copy so
// the UI cannot accidentally mutate the source dataset.

export function getDemoMachineStatus(): MachineStatus {
  return structuredClone(machineStatus);
}

export function getDemoVibrationData(
  rangeMs: number = 30 * 60 * 1000,
  conditionFilter?: ConditionState,
): SensorSample[] {
  const end = SESSION_END;
  const start = end - rangeMs;
  let out = sensorSamples.filter((s) => s.t >= start && s.t <= end);
  if (conditionFilter) {
    out = out.filter((s) => s.condition === conditionFilter);
  }
  return structuredClone(out);
}

export function getDemoVibrationFeatures(samples: SensorSample[]): VibrationFeature[] {
  return (['ax', 'ay', 'az', 'gx', 'gy', 'gz'] as const).map((axis) =>
    featureForAxis(samples, axis),
  );
}

export function getDemoHealthTimeline(): HealthPoint[] {
  return structuredClone(healthPoints);
}

export function getDemoAnomalies(): AnomalyEvent[] {
  return structuredClone(anomalyEvents);
}

export function getDemoMaintenance(): MaintenanceRecommendation[] {
  return structuredClone(maintenanceRecs);
}

export function getDemoRecentChanges(): RecentChange[] {
  return structuredClone(recentChanges);
}

// Utility: downsample samples for chart rendering (avoid 18 000 SVG points)
export function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  // Always include last point
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}
