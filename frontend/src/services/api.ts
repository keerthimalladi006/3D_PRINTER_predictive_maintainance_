import type {
  AnomalyEvent,
  HealthPoint,
  MachineStatus,
  MaintenanceRecommendation,
  RecentChange,
  SensorSample,
  VibrationFeature,
} from '../types';
import {
  getDemoAnomalies,
  getDemoHealthTimeline,
  getDemoMachineStatus,
  getDemoMaintenance,
  getDemoRecentChanges,
  getDemoVibrationData,
  getDemoVibrationFeatures,
} from '../data/demoData';

// ─── API service layer ─────────────────────────────────────────────────────
// Connected to real backend API at http://localhost:5000/api
// Falls back to demo data if API fails or not configured

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

async function fetchJson<T>(path: string): Promise<T> {
  console.log(`Fetching: ${API_BASE_URL}${path}`);
  const res = await fetch(`${API_BASE_URL}${path}`);
  console.log(`Response status: ${res.status}`);
  if (!res.ok) {
    console.error(`API Error: ${res.status} ${res.statusText}`);
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  console.log(`Response data:`, data);
  return data as Promise<T>;
}

// Simulate network latency for realistic loading states
function withDelay<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ─── Data transformation functions ─────────────────────────────────────────

function transformMachineStatus(data: any): MachineStatus {
  return {
    machineId: 'PRINTER-001',
    machineName: 'FDM 3D Printer',
    condition: (data.summary?.current_condition || 'NORMAL') as 'NORMAL' | 'WARNING' | 'ABNORMAL',
    healthScore: Number(data.summary?.avg_health_score) || 0,
    vibrationRms: 0,
    anomalyState: (data.summary?.current_condition || 'NORMAL') as 'NORMAL' | 'WARNING' | 'ABNORMAL',
    lastUpdate: new Date().toISOString(),
    axisPosition: { x: 0, y: 0, z: 0 },
    subsystems: [],
    printHeadState: 'IDLE' as const,
    motionState: 'IDLE' as const,
  };
}

function transformHealthPoint(data: any): HealthPoint {
  return {
    t: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
    healthScore: Number(data.health_score) || 0,
    anomalyScore: Number(data.statistical_anomaly_score) || 0,
    state: (data.condition_state || 'NORMAL') as 'NORMAL' | 'WARNING' | 'ABNORMAL',
  };
}

function transformAnomalyEvent(data: any): AnomalyEvent {
  return {
    id: `anomaly-${data.window_index}`,
    t: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
    severity: (data.statistical_is_anomaly ? 'HIGH' : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    subsystem: 'PRINT_HEAD' as const,
    title: data.condition_state === 'ABNORMAL' ? 'Abnormal Condition Detected' : 'Anomaly Detected',
    description: `Health score: ${Number(data.health_score)?.toFixed(1)}%`,
    windowStart: 0,
    windowEnd: 0,
    evidenceMetrics: [
      `Statistical score: ${Number(data.statistical_anomaly_score)?.toFixed(2)}`,
      `ISO Forest score: ${Number(data.isolation_forest_anomaly_score)?.toFixed(2)}`,
    ],
  };
}

function transformMaintenanceRecommendation(data: any): MaintenanceRecommendation {
  const priorityMap: Record<string, 'P1' | 'P2' | 'P3' | 'P4'> = {
    'HIGH': 'P1',
    'MEDIUM': 'P2',
    'LOW': 'P3',
  };
  
  return {
    id: 'rec-001',
    condition: (data.message?.toLowerCase().includes('normal') ? 'NORMAL' : data.message?.toLowerCase().includes('abnormal') ? 'ABNORMAL' : 'WARNING') as 'NORMAL' | 'WARNING' | 'ABNORMAL',
    evidence: data.message || 'No evidence',
    severity: (data.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    subsystem: 'PRINT_HEAD' as const,
    recommendation: data.message || 'No recommendation',
    priority: priorityMap[data.priority] || 'P2',
    verification: 'NOT_APPLICABLE' as const,
    stages: {
      detection: { status: 'COMPLETE' as const, timestamp: new Date().toISOString(), detail: 'Automated detection' },
      assessment: { status: 'COMPLETE' as const, timestamp: new Date().toISOString(), detail: 'Rule-based assessment' },
      recommendation: { status: 'COMPLETE' as const, timestamp: new Date().toISOString(), detail: 'Generated recommendation' },
      maintenance: { status: 'PENDING' as const, timestamp: null, detail: 'Pending execution' },
      verification: { status: 'NOT_APPLICABLE' as const, timestamp: null, detail: 'Not verified' },
    },
  };
}

export async function getMachineStatus(): Promise<MachineStatus> {
  try {
    const data = await fetchJson<any>('/machine-status');
    return transformMachineStatus(data);
  } catch (error) {
    console.warn('Failed to fetch machine status, using demo data:', error);
    return withDelay(getDemoMachineStatus());
  }
}

export async function getVibrationData(
  rangeMs?: number,
  condition?: SensorSample['condition'],
): Promise<SensorSample[]> {
  try {
    const params = new URLSearchParams();
    if (rangeMs) params.append('limit', rangeMs.toString());
    const data = await fetchJson<{features: any[]}>('/vibration?' + params.toString());
    
    return data.features.map((row: any) => ({
      t: row.timestamp ? new Date(row.timestamp).getTime() : Date.now(),
      ax: row['Ax(m/s^2)_mean'] || 0,
      ay: row['Ay(m/s^2)_mean'] || 0,
      az: row['Az(m/s^2)_mean'] || 0,
      gx: row['Gx(deg/s)_mean'] || 0,
      gy: row['Gy(deg/s)_mean'] || 0,
      gz: row['Gz(deg/s)_mean'] || 0,
      condition: (row.condition_state || 'NORMAL') as 'NORMAL' | 'WARNING' | 'ABNORMAL',
    }));
  } catch (error) {
    console.warn('Failed to fetch vibration data, using demo data:', error);
    return withDelay(getDemoVibrationData(rangeMs, condition));
  }
}

export async function getVibrationFeatures(
  samples: SensorSample[],
): Promise<VibrationFeature[]> {
  return withDelay(getDemoVibrationFeatures(samples), 200);
}

export async function getHealthTimeline(): Promise<HealthPoint[]> {
  try {
    const data = await fetchJson<{health_data: any[]}>('/health');
    return data.health_data.map(transformHealthPoint);
  } catch (error) {
    console.warn('Failed to fetch health timeline, using demo data:', error);
    return withDelay(getDemoHealthTimeline());
  }
}

export async function getAnomalies(): Promise<AnomalyEvent[]> {
  try {
    const data = await fetchJson<{anomalies: any[]}>('/anomalies');
    return data.anomalies.map(transformAnomalyEvent);
  } catch (error) {
    console.warn('Failed to fetch anomalies, using demo data:', error);
    return withDelay(getDemoAnomalies());
  }
}

export async function getMaintenanceRecommendations(): Promise<MaintenanceRecommendation[]> {
  try {
    const data = await fetchJson('/maintenance');
    return [transformMaintenanceRecommendation(data)];
  } catch (error) {
    console.warn('Failed to fetch maintenance recommendations, using demo data:', error);
    return withDelay(getDemoMaintenance());
  }
}

export async function getRecentChanges(): Promise<RecentChange[]> {
  try {
    // This endpoint doesn't exist in backend yet, return demo data
    return withDelay(getDemoRecentChanges(), 250);
  } catch (error) {
    console.warn('Failed to fetch recent changes, using demo data:', error);
    return withDelay(getDemoRecentChanges(), 250);
  }
}
