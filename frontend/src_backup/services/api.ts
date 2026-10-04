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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function getMachineStatus(): Promise<MachineStatus> {
  return fetchJson<MachineStatus>('/machine-status');
}

export async function getVibrationData(
  rangeMs?: number,
  condition?: SensorSample['condition'],
): Promise<SensorSample[]> {
  const params = new URLSearchParams();
  if (rangeMs) params.append('limit', rangeMs.toString());
  return fetchJson<{features: SensorSample[]}>('/vibration?' + params.toString())
    .then(data => data.features);
}

export async function getVibrationFeatures(
  samples: SensorSample[],
): Promise<VibrationFeature[]> {
  // Features are included in the vibration data from backend
  return samples as unknown as VibrationFeature[];
}

export async function getHealthTimeline(): Promise<HealthPoint[]> {
  return fetchJson<{health_data: HealthPoint[]}>('/health')
    .then(data => data.health_data);
}

export async function getAnomalies(): Promise<AnomalyEvent[]> {
  return fetchJson<{anomalies: AnomalyEvent[]}>('/anomalies')
    .then(data => data.anomalies);
}

export async function getMaintenanceRecommendations(): Promise<MaintenanceRecommendation[]> {
  const recommendation = await fetchJson<MaintenanceRecommendation>('/maintenance');
  return [recommendation];
}

export async function getRecentChanges(): Promise<RecentChange[]> {
  // This endpoint doesn't exist in backend yet, return empty array
  return [];
}
