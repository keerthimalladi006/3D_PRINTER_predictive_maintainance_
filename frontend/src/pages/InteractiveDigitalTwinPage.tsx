import { useState } from 'react';
import { Play, Pause, RotateCcw, Thermometer, Droplets, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PrinterViewer3D, SensorId } from '../components/PrinterViewer3D';
import { useSensorData } from '../hooks/useSensorData';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';

const SENSOR_LABELS: Record<SensorId, string> = {
  Accelerometer: 'Accelerometer',
  HumiditySensor: 'Humidity Sensor',
  Temperaturesensor: 'Temperature Sensor',
};

const SENSOR_COLORS: Record<string, string> = {
  ax: '#ef4444',
  ay: '#f59e0b',
  az: '#3b82f6',
  dhtTemperature: '#10b981',
  humidity: '#8b5cf6',
  ds18b20Temperature: '#ec4899',
};

export function InteractiveDigitalTwinPage() {
  const [selectedSensor, setSelectedSensor] = useState<SensorId | null>(null);
  const { readings, loading, error, playback, play, pause, restart, setSpeed } = useSensorData();

  const sensorLabels = {
    ax: 'Ax (m/s²)',
    ay: 'Ay (m/s²)',
    az: 'Az (m/s²)',
    dhtTemperature: 'DHT Temp (°C)',
    humidity: 'Humidity (%)',
    ds18b20Temperature: 'DS18B20 Temp (°C)',
  };

  // Map sensor ID to CSV fields
  const SENSOR_FIELDS: Record<SensorId, string[]> = {
    Accelerometer: ['ax', 'ay', 'az'],
    HumiditySensor: ['humidity'],
    Temperaturesensor: ['dhtTemperature', 'ds18b20Temperature'],
  };

  // Get active sensors for selected component
  const activeSensors = selectedSensor ? SENSOR_FIELDS[selectedSensor] : ['ax', 'ay', 'az', 'dhtTemperature', 'humidity', 'ds18b20Temperature'];

  // Prepare chart data
  const chartData = readings.slice(-50).map((reading, index) => {
    const dataPoint: any = { index };
    activeSensors.forEach((sensor: string) => {
      const key = sensor as keyof typeof reading;
      dataPoint[sensor] = reading[key];
    });
    return dataPoint;
  });

  return (
    <AppLayout status={null}>
      <div className="flex flex-col gap-4 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-2">
          <div>
            <h1 className="text-lg font-semibold text-txt-primary">3D Printer Digital Twin</h1>
            <p className="text-xs text-txt-secondary">Click colored sensors to inspect readings</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge state="NORMAL" size="md" />
            <div className="text-right">
              <p className="text-2xs text-txt-muted">Status</p>
              <p className="text-xs text-txt-secondary">{playback.isPlaying ? 'Playing' : 'Paused'}</p>
            </div>
          </div>
        </div>

        {/* 3D Viewer */}
        <PrinterViewer3D
          modelUrl="/3d_printer.glb"
          condition="NORMAL"
          selected={selectedSensor}
          onSelect={setSelectedSensor}
        />

        {/* Playback Controls */}
        <div className="rounded-lg border border-edge bg-surface-raised p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button onClick={playback.isPlaying ? pause : play} className="p-2 bg-surface-hover border border-edge rounded-md hover:bg-surface-raised">
                {playback.isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={restart} className="p-2 bg-surface-hover border border-edge rounded-md hover:bg-surface-raised">
                <RotateCcw size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-txt-secondary">Speed:</span>
              {[0.5, 1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSpeed(speed)}
                  className={`px-2 py-1 text-xs rounded-md ${
                    playback.speed === speed ? 'bg-brand text-white' : 'bg-surface-hover border border-edge hover:bg-surface-raised'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
            
            <div className="ml-auto text-right">
              <p className="text-2xs text-txt-muted">Reading</p>
              <p className="text-xs text-txt-secondary">{playback.currentIndex + 1} / {playback.totalReadings}</p>
            </div>
          </div>
        </div>

        {/* Sensor Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {playback.currentReading ? (
            <>
              <SensorCard label="Ax" value={playback.currentReading.ax} unit="m/s²" icon={<Activity size={14} className="text-red-500" />} color="text-red-500" />
              <SensorCard label="Ay" value={playback.currentReading.ay} unit="m/s²" icon={<Activity size={14} className="text-yellow-500" />} color="text-yellow-500" />
              <SensorCard label="Az" value={playback.currentReading.az} unit="m/s²" icon={<Activity size={14} className="text-blue-500" />} color="text-blue-500" />
              <SensorCard label="DHT" value={playback.currentReading.dhtTemperature} unit="°C" icon={<Thermometer size={14} className="text-green-500" />} color="text-green-500" />
              <SensorCard label="Humidity" value={playback.currentReading.humidity} unit="%" icon={<Droplets size={14} className="text-purple-500" />} color="text-purple-500" />
              <SensorCard label="DS18B20" value={playback.currentReading.ds18b20Temperature} unit="°C" icon={<Thermometer size={14} className="text-pink-500" />} color="text-pink-500" />
            </>
          ) : (
            <div className="col-span-6 text-center text-xs text-txt-muted py-2">Loading sensor data...</div>
          )}
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-edge bg-surface-raised p-3">
          <h2 className="text-xs font-medium text-txt-secondary mb-2">
            {selectedSensor ? `${SENSOR_LABELS[selectedSensor]} - History` : 'All Sensors - History'}
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="index" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#334155' }} itemStyle={{ color: '#e2e8f0' }} />
                <Legend />
                {activeSensors.map((sensor: string) => (
                  <Line
                    key={sensor}
                    type="monotone"
                    dataKey={sensor}
                    stroke={SENSOR_COLORS[sensor as keyof typeof SENSOR_COLORS] || '#3b82f6'}
                    strokeWidth={2}
                    dot={false}
                    name={sensorLabels[sensor as keyof typeof sensorLabels] || sensor}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SensorCard({ label, value, unit, icon, color }: { label: string; value: number; unit: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-raised p-2">
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-2xs text-txt-muted">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-sm tnum ${color}`}>{typeof value === 'number' ? value.toFixed(2) : value}</span>
        <span className="text-2xs text-txt-faint">{unit}</span>
      </div>
    </div>
  );
}
