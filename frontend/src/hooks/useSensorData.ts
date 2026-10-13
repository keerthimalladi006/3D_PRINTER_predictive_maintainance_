import { useState, useEffect, useRef, useCallback } from 'react';

export interface SensorReading {
  timestamp: string;
  timeMs: number;
  ax: number;
  ay: number;
  az: number;
  dhtTemperature: number;
  humidity: number;
  ds18b20Temperature: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentIndex: number;
  speed: number;
  currentReading: SensorReading | null;
  totalReadings: number;
}

export function useSensorData(csvPath: string = '/3D_Printer_Sensor_Data.csv') {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    currentIndex: 0,
    speed: 1.0,
    currentReading: null,
    totalReadings: 0,
  });
  
  const intervalRef = useRef<number | null>(null);
  const playbackIntervalMs = 500; // 500ms per reading (adjustable)

  // Load and parse CSV
  useEffect(() => {
    const loadCSV = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(csvPath);
        if (!response.ok) {
          throw new Error(`Failed to load CSV: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV file is empty or has no data');
        }
        
        // Parse CSV, skipping repeated header rows
        const parsedReadings: SensorReading[] = [];
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          
          // Skip if this is a header row (check if Time_ms column is not a number)
          if (values.length < 8) continue;
          
          const timeMsValue = values[1];
          if (isNaN(parseFloat(timeMsValue))) {
            console.log(`Skipping header row at index ${i}`);
            continue;
          }
          
          const reading: SensorReading = {
            timestamp: values[0],
            timeMs: parseFloat(values[1]) || 0,
            ax: parseFloat(values[2]) || 0,
            ay: parseFloat(values[3]) || 0,
            az: parseFloat(values[4]) || 0,
            dhtTemperature: parseFloat(values[5]) || 0,
            humidity: parseFloat(values[6]) || 0,
            ds18b20Temperature: parseFloat(values[7]) || 0,
          };
          
          parsedReadings.push(reading);
        }
        
        if (parsedReadings.length === 0) {
          throw new Error('No valid data found in CSV');
        }
        
        setReadings(parsedReadings);
        setPlayback(prev => ({
          ...prev,
          totalReadings: parsedReadings.length,
          currentReading: parsedReadings[0],
        }));
        
        console.log(`Loaded ${parsedReadings.length} sensor readings from CSV`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sensor data');
        console.error('Error loading CSV:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadCSV();
  }, [csvPath]);

  // Playback loop
  useEffect(() => {
    if (!playback.isPlaying || readings.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    const interval = setInterval(() => {
      setPlayback(prev => {
        let nextIndex = prev.currentIndex + 1;
        
        // Loop back to start when reaching end
        if (nextIndex >= readings.length) {
          nextIndex = 0;
        }
        
        return {
          ...prev,
          currentIndex: nextIndex,
          currentReading: readings[nextIndex],
        };
      });
    }, playbackIntervalMs / playback.speed);
    
    intervalRef.current = interval;
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playback.isPlaying, playback.speed, readings, playbackIntervalMs]);

  const play = useCallback(() => {
    setPlayback(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setPlayback(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const restart = useCallback(() => {
    setPlayback(prev => ({
      ...prev,
      currentIndex: 0,
      currentReading: readings[0] || null,
    }));
  }, [readings]);

  const setSpeed = useCallback((speed: number) => {
    setPlayback(prev => ({ ...prev, speed }));
  }, []);

  const jumpToIndex = useCallback((index: number) => {
    if (index >= 0 && index < readings.length) {
      setPlayback(prev => ({
        ...prev,
        currentIndex: index,
        currentReading: readings[index],
      }));
    }
  }, [readings]);

  return {
    readings,
    loading,
    error,
    playback,
    play,
    pause,
    restart,
    setSpeed,
    jumpToIndex,
  };
}
