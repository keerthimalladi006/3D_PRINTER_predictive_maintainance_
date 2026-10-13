import { useState } from 'react';
import { Play, Pause, RotateCcw, Gauge, Thermometer, Droplets, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ThreeViewer, ComponentName } from '../components/ThreeViewer';
import { useSensorData } from '../hooks/useSensorData';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';

const COMPONENT_LABELS: Record<string, string> = {
  Accelerometer: 'Accelerometer Sensor',
  HumiditySensor: 'Humidity Sensor',
  Temperaturesensor: 'Temperature Sensor',
  digital_twin_1: 'Printer Body',
  null: 'Full Model',
};

const COMPONENT_SENSORS: Record<string, string[]> = {
  Accelerometer: ['ax', 'ay', 'az'],
  HumiditySensor: ['humidity'],
  Temperaturesensor: ['dhtTemperature', 'ds18b20Temperature'],
  digital_twin_1: ['ax', 'ay', 'az', 'dHT_Temperature', 'humidity', 'ds18b20Temperature'],
  null: ['ax', 'ay', 'az', 'dHT_Temperature', 'humidity', 'ds18b20Temperature'],
};

export function InteractiveDigitalTwinPage() {
  const [selectedComponent, setSelectedComponent] = useState<ComponentName>(null);
  const { readings, loading, error, playback, play, pause, restart, setSpeed } = useSensorData();

  const sensorLabels = {
    ax: 'Ax (m/s²)',
    ay: 'Ay (m/s²)',
    az: 'Az (m/s²)',
    dhtTemperature: 'DHT Temp (°C)',
    humidity: 'Humidity (%)',
    ds18b20Temperature: 'DS18B20 Temp (°C)',
  };

  const sensorColors = {
    ax: '#ef4444',
    ay: '#f59e0b',
    az: '#3b82f6',
    dhtTemperature: '#10b981',
    humidity: '#8b5cf6',
    ds18b20Temperature: '#ec4899',
  };

  // Get active sensors for selected component
  const selectedKey = selectedComponent || 'null';
  const activeSensors = COMPONENT_SENSORS[selectedKey] || COMPONENT_SENSORS['null'];

  // Prepare chart data for selected component
  const chartData = readings.slice(-50).map((reading, index) => {
    const dataPoint: any = {
      index: index,
    };
    
    activeSensors.forEach((sensor: string) => {
      const key = sensor as keyof typeof reading;
      dataPoint[sensor] = reading[key];
    });
    
    return dataPoint;
  });

  return (
    <AppLayout status={null}>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-txt-primary">Interactive 3D Printer Digital Twin</h1>
            <p className="text-sm text-txt-secondary mt-1">Click components to isolate and inspect</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge state="NORMAL" size="lg" />
            <div className="text-right">
              <p className="text-2xs text-txt-muted">Playback Status</p>
              <p className="text-sm text-txt-secondary">{playback.isPlaying ? 'Playing' : 'Paused'}</p>
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="rounded-lg border border-edge bg-surface-raised p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={playback.isPlaying ? pause : play}
                className="p-2 bg-surface-hover border border-edge rounded-md hover:bg-surface-raised transition-colors"
                title={playback.isPlaying ? 'Pause' : 'Play'}
              >
                {playback.isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={restart}
                className="p-2 bg-surface-hover border border-edge rounded-md hover:bg-surface-raised transition-colors"
                title="Restart"
              >
                <RotateCcw size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-txt-secondary">Speed:</span>
              {[0.5, 1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSpeed(speed)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    playback.speed === speed
                      ? 'bg-brand text-white'
                      : 'bg-surface-hover border border-edge hover:bg-surface-raised'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
            
            <div className="ml-auto text-right">
              <p className="text-2xs text-txt-muted">Reading</p>
              <p className="text-sm text-txt-secondary">
                {playback.currentIndex + 1} / {playback.totalReadings}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* 3D Viewer */}
          <div className="lg:col-span-2 rounded-lg border border-edge bg-surface-inset overflow-hidden">
            <ThreeViewer
              modelPath="/3d_printer.glb"
              onComponentSelect={setSelectedComponent}
              selectedComponent={selectedComponent}
            />
          </div>

          {/* Component Info Panel */}
          <div className="rounded-lg border border-edge bg-surface-raised p-4">
            <h2 className="text-sm font-medium text-txt-secondary mb-4">
              {selectedComponent ? 'Selected Component' : 'Component Legend'}
            </h2>
            
            {selectedComponent ? (
              <div className="space-y-4">
                <div className="p-3 bg-surface-inset rounded-md border border-edge">
                  <p className="text-sm font-medium text-txt-primary mb-2">
                    {COMPONENT_LABELS[selectedComponent] || 'Unknown Component'}
                  </p>
                  <p className="text-2xs text-txt-muted">
                    Click "Restore Full Model" to view all components
                  </p>
                </div>
                
                {playback.currentReading && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-medium text-txt-secondary">Current Readings</h3>
                    {activeSensors.map((sensor: string) => {
                      const key = sensor as keyof typeof playback.currentReading;
                      const value = playback.currentReading?.[key];
                      return (
                        <div key={sensor} className="flex items-center justify-between p-2 bg-surface-inset rounded-md">
                          <span className="text-xs text-txt-secondary">{sensorLabels[key as keyof typeof sensorLabels]}</span>
                          <span className="text-sm font-mono text-txt-primary">
                            {typeof value === 'number' ? value.toFixed(2) : value ?? 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(COMPONENT_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedComponent(key as ComponentName)}
                    className="w-full text-left px-3 py-2 rounded-md border border-edge hover:bg-surface-hover transition-colors text-sm text-txt-secondary"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sensor Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {playback.currentReading ? (
            <>
              <SensorCard
                label="Ax"
                value={playback.currentReading.ax}
                unit="m/s²"
                icon={<Activity size={16} className="text-red-500" />}
                color="text-red-500"
              />
              <SensorCard
                label="Ay"
                value={playback.currentReading.ay}
                unit="m/s²"
                icon={<Activity size={16} className="text-yellow-500" />}
                color="text-yellow-500"
              />
              <SensorCard
                label="Az"
                value={playback.currentReading.az}
                unit="m/s²"
                icon={<Activity size={16} className="text-blue-500" />}
                color="text-blue-500"
              />
              <SensorCard
                label="DHT Temp"
                value={playback.currentReading.dhtTemperature}
                unit="°C"
                icon={<Thermometer size={16} className="text-green-500" />}
                color="text-green-500"
              />
              <SensorCard
                label="Humidity"
                value={playback.currentReading.humidity}
                unit="%"
                icon={<Droplets size={16} className="text-purple-500" />}
                color="text-purple-500"
              />
              <SensorCard
                label="DS18B20"
                value={playback.currentReading.ds18b20Temperature}
                unit="°C"
                icon={<Thermometer size={16} className="text-pink-500" />}
                color="text-pink-500"
              />
            </>
          ) : (
            <div className="col-span-6 text-center text-sm text-txt-muted py-4">
              Loading sensor data...
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-edge bg-surface-raised p-4">
          <h2 className="text-sm font-medium text-txt-secondary mb-4">
            {selectedComponent 
              ? `${COMPONENT_LABELS[selectedComponent] || 'Selected Component'} - Historical Data`
              : 'All Sensors - Historical Data'
            }
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="index" 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '#334155' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                {activeSensors.map((sensor: string) => (
                  <Line
                    key={sensor}
                    type="monotone"
                    dataKey={sensor}
                    stroke={sensorColors[sensor as keyof typeof sensorColors] || '#3b82f6'}
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

function SensorCard({
  label,
  value,
  unit,
  icon,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-edge bg-surface-raised p-3">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-txt-muted">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-lg tnum ${color}`}>
          {typeof value === 'number' ? value.toFixed(2) : value}
        </span>
        <span className="text-xs text-txt-faint">{unit}</span>
      </div>
    </div>
  );
}
