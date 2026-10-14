import type {
  AnomalyEvent,
  HealthPoint,
  MachineStatus,
  MaintenanceRecommendation,
  RecentChange,
  SensorSample,
  VibrationFeature,
} from '../types';

// ─── API service layer ─────────────────────────────────────────────────────
// Connected to real backend API at http://localhost:5000/api
// Using frozen pre-trained model for predictions

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
    t: data.Date_Time ? new Date(data.Date_Time).getTime() : (data.timestamp ? new Date(data.timestamp).getTime() : Date.now()),
    healthScore: Number(data.health_score) || 0,
    anomalyScore: Number(data.statistical_anomaly_score) || 0,
    state: (data.condition_state || 'NORMAL') as 'NORMAL' | 'WARNING' | 'ABNORMAL',
  };
}

function transformAnomalyEvent(data: any): AnomalyEvent {
  return {
    id: `anomaly-${data.window_index}`,
    t: data.Date_Time ? new Date(data.Date_Time).getTime() : (data.timestamp ? new Date(data.timestamp).getTime() : Date.now()),
    severity: (data.statistical_is_anomaly ? 'HIGH' : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    subsystem: 'PRINT_HEAD' as const,
    title: data.condition_state === 'ABNORMAL' ? 'Abnormal Condition Detected' : 'Anomaly Detected',
    description: `Health score: ${Number(data.health_score)?.toFixed(1)}%`,
    windowStart: data.window_start || 0,
    windowEnd: data.window_end || 0,
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
    verification: 'PENDING' as const,
    stages: {
      detection: { status: 'COMPLETE' as const, timestamp: new Date().toISOString(), detail: 'Automated detection' },
      assessment: { status: 'COMPLETE' as const, timestamp: new Date().toISOString(), detail: 'Rule-based assessment' },
      recommendation: { status: 'COMPLETE' as const, timestamp: new Date().toISOString(), detail: 'Generated recommendation' },
      maintenance: { status: 'PENDING' as const, timestamp: null, detail: 'Pending execution' },
      verification: { status: 'PENDING' as const, timestamp: null, detail: 'Pending verification' },
    },
  };
}

export async function getMachineStatus(): Promise<MachineStatus> {
  const data = await fetchJson<any>('/machine-status');
  return transformMachineStatus(data);
}

export async function getVibrationData(
  rangeMs?: number,
  condition?: SensorSample['condition'],
): Promise<SensorSample[]> {
  const params = new URLSearchParams();
  if (rangeMs) params.append('limit', rangeMs.toString());
  const data = await fetchJson<{features: any[]}>('/vibration?' + params.toString());

  return data.features.map((row: any) => ({
    t: row.Date_Time ? new Date(row.Date_Time).getTime() : (row.timestamp ? new Date(row.timestamp).getTime() : Date.now()),
    ax: row.Ax || row['Ax(m/s^2)_mean'] || 0,
    ay: row.Ay || row['Ay(m/s^2)_mean'] || 0,
    az: row.Az || row['Az(m/s^2)_mean'] || 0,
    gx: row.Gx || row['Gx(deg/s)_mean'] || 0,  // Will be 0 (no gyroscope data)
    gy: row.Gy || row['Gy(deg/s)_mean'] || 0,  // Will be 0 (no gyroscope data)
    gz: row.Gz || row['Gz(deg/s)_mean'] || 0,  // Will be 0 (no gyroscope data)
    condition: (row.condition_state || 'NORMAL') as 'NORMAL' | 'WARNING' | 'ABNORMAL',
  }));
}

export async function getVibrationFeatures(
  samples: SensorSample[],
): Promise<VibrationFeature[]> {
  // Calculate features from samples
  const features: VibrationFeature[] = [];
  ['ax', 'ay', 'az', 'gx', 'gy', 'gz'].forEach(axis => {
    const values = samples.map(s => s[axis as keyof SensorSample] as number);
    if (values.length > 0) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
      const std = Math.sqrt(variance);
      const peak = Math.max(...values.map(Math.abs));
      const rms = Math.sqrt(values.reduce((a, b) => a + b ** 2, 0) / values.length);

      features.push({
        axis: axis as any,
        rms,
        peak,
        stdDev: std,
        kurtosis: 0, // Simplified
      });
    }
  });
  return features;
}

export async function getHealthTimeline(): Promise<HealthPoint[]> {
  const data = await fetchJson<{health_data: any[]}>('/health');
  return data.health_data.map(transformHealthPoint);
}

export async function getAnomalies(): Promise<AnomalyEvent[]> {
  const data = await fetchJson<{anomalies: any[]}>('/anomalies');
  return data.anomalies.map(transformAnomalyEvent);
}

export async function getMaintenanceRecommendations(): Promise<MaintenanceRecommendation[]> {
  const data = await fetchJson('/maintenance');
  return [transformMaintenanceRecommendation(data)];
}

export async function getRecentChanges(): Promise<RecentChange[]> {
  // Generate from health data changes
  const healthData = await getHealthTimeline();
  const changes: RecentChange[] = [];
  for (let i = 1; i < healthData.length; i++) {
    if (healthData[i].state !== healthData[i - 1].state) {
      changes.push({
        id: `change-${i}`,
        t: healthData[i].t,
        type: 'STATE_TRANSITION',
        direction: healthData[i].state === 'ABNORMAL' ? 'UP' : 'DOWN',
        description: `State changed from ${healthData[i - 1].state} to ${healthData[i].state}`,
      });
    }
  }
  return changes.slice(-10); // Return last 10 changes
}
