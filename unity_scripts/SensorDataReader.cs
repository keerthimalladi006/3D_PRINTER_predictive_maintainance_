using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

/// <summary>
/// Reads and plays back sensor data from unity_sensor_playback.csv
/// Provides vibration, health score, anomaly status, and maintenance recommendations.
/// Data is window-level aggregated features, not raw sensor readings.
/// </summary>
public class SensorDataReader : MonoBehaviour
{
    [Header("File Settings")]
    [Tooltip("CSV filename in StreamingAssets folder")]
    public string csvFileName = "unity_sensor_playback.csv";
    
    [Header("Playback Settings")]
    [Tooltip("Seconds between data rows during playback")]
    public float playbackInterval = 0.5f;
    
    [Tooltip("Auto-start playback on Awake")]
    public bool autoPlay = true;
    
    [Tooltip("Loop back to start when reaching end")]
    public bool loopPlayback = true;
    
    [Header("Debug")]
    [Tooltip("Log data rows to console")]
    public bool debugLog = false;
    
    // Internal data structures
    private List<SensorDataRow> sensorData;
    private int currentIndex = 0;
    private float timer = 0f;
    private bool isPlaying = false;
    private bool isLoaded = false;
    
    // Current data (accessible by other scripts)
    public SensorDataRow CurrentData { get; private set; }
    
    /// <summary>
    /// Single row of sensor data from CSV
    /// </summary>
    [System.Serializable]
    public class SensorDataRow
    {
        public string timestamp;
        public float vibrationRms;
        public float healthScore;
        public string machineStatus;
        public int anomalyDetected;
        public float anomalyScore;
        public string maintenanceRecommendation;
        public string maintenancePriority;
        
        /// <summary>
        /// Returns a string representation for debugging
        /// </summary>
        public override string ToString()
        {
            return $"[{timestamp}] Vibration: {vibrationRms:F2} m/s², Health: {healthScore:F1}%, Status: {machineStatus}, Anomaly: {anomalyDetected}, Rec: {maintenanceRecommendation}";
        }
    }
    
    #region Unity Lifecycle
    
    void Awake()
    {
        LoadSensorData();
    }
    
    void Start()
    {
        if (isLoaded && autoPlay)
        {
            Play();
        }
    }
    
    void Update()
    {
        if (!isPlaying || !isLoaded || sensorData == null || sensorData.Count == 0)
            return;
        
        timer += Time.deltaTime;
        
        if (timer >= playbackInterval)
        {
            timer = 0f;
            AdvanceToNextRow();
        }
    }
    
    void OnDestroy()
    {
        Pause();
    }
    
    #endregion
    
    #region Data Loading
    
    /// <summary>
    /// Load CSV data from StreamingAssets
    /// </summary>
    public void LoadSensorData()
    {
        string filePath = Path.Combine(Application.streamingAssetsPath, csvFileName);
        sensorData = new List<SensorDataRow>();
        
        if (!File.Exists(filePath))
        {
            Debug.LogError($"[SensorDataReader] CSV file not found: {filePath}");
            Debug.LogError($"[SensorDataReader] Expected location: Assets/StreamingAssets/{csvFileName}");
            return;
        }
        
        try
        {
            string[] lines = File.ReadAllLines(filePath);
            
            if (lines.Length < 2)
            {
                Debug.LogError($"[SensorDataReader] CSV file is empty or has no data rows: {filePath}");
                return;
            }
            
            // Parse header row to validate column count
            string[] headers = lines[0].Split(',');
            int expectedColumnCount = 8; // timestamp, vibration_rms, health_score, machine_status, anomaly_detected, anomaly_score, maintenance_recommendation, maintenance_priority
            
            if (headers.Length != expectedColumnCount)
            {
                Debug.LogWarning($"[SensorDataReader] Expected {expectedColumnCount} columns, found {headers.Length}");
            }
            
            // Parse data rows (skip header)
            int parsedRows = 0;
            int skippedRows = 0;
            
            for (int i = 1; i < lines.Length; i++)
            {
                if (string.IsNullOrWhiteSpace(lines[i]))
                {
                    skippedRows++;
                    continue;
                }
                
                SensorDataRow row = ParseCSVLine(lines[i]);
                
                if (row != null)
                {
                    sensorData.Add(row);
                    parsedRows++;
                }
                else
                {
                    skippedRows++;
                }
            }
            
            isLoaded = sensorData.Count > 0;
            
            if (isLoaded)
            {
                Debug.Log($"[SensorDataReader] Loaded {parsedRows} sensor data rows from {csvFileName}");
                if (skippedRows > 0)
                {
                    Debug.LogWarning($"[SensorDataReader] Skipped {skippedRows} invalid rows");
                }
                
                // Initialize current data
                CurrentData = sensorData[0];
            }
            else
            {
                Debug.LogError($"[SensorDataReader] Failed to load any valid data from {csvFileName}");
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"[SensorDataReader] Error loading CSV file: {e.Message}");
            Debug.LogError($"[SensorDataReader] Stack trace: {e.StackTrace}");
        }
    }
    
    /// <summary>
    /// Parse a single CSV line into SensorDataRow
    /// Handles empty strings and malformed data gracefully
    /// </summary>
    private SensorDataRow ParseCSVLine(string line)
    {
        string[] values = SplitCSVLine(line);
        
        if (values.Length < 8)
        {
            if (debugLog)
            {
                Debug.LogWarning($"[SensorDataReader] Skipping malformed line (expected 8 columns, got {values.Length}): {line}");
            }
            return null;
        }
        
        try
        {
            SensorDataRow row = new SensorDataRow
            {
                timestamp = values[0].Trim(),
                vibrationRms = ParseFloat(values[1]),
                healthScore = ParseFloat(values[2]),
                machineStatus = values[3].Trim(),
                anomalyDetected = ParseInt(values[4]),
                anomalyScore = ParseFloat(values[5]),
                maintenanceRecommendation = values[6].Trim(),
                maintenancePriority = values[7].Trim()
            };
            
            return row;
        }
        catch (Exception e)
        {
            if (debugLog)
            {
                Debug.LogWarning($"[SensorDataReader] Failed to parse line: {e.Message}");
            }
            return null;
        }
    }
    
    /// <summary>
    /// Split CSV line handling quoted values if present
    /// For simplicity, assumes no quoted commas in this dataset
    /// </summary>
    private string[] SplitCSVLine(string line)
    {
        return line.Split(',');
    }
    
    /// <summary>
    /// Parse float with safe default for empty or invalid values
    /// </summary>
    private float ParseFloat(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return 0f;
        
        if (float.TryParse(value.Trim(), out float result))
            return result;
        
        return 0f;
    }
    
    /// <summary>
    /// Parse integer with safe default for empty or invalid values
    /// </summary>
    private int ParseInt(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return 0;
        
        if (int.TryParse(value.Trim(), out int result))
            return result;
        
        return 0;
    }
    
    #endregion
    
    #region Playback Control
    
    /// <summary>
    /// Start playback
    /// </summary>
    public void Play()
    {
        if (!isLoaded)
        {
            Debug.LogWarning("[SensorDataReader] Cannot play - data not loaded");
            return;
        }
        
        isPlaying = true;
        if (debugLog)
            Debug.Log("[SensorDataReader] Playback started");
    }
    
    /// <summary>
    /// Pause playback
    /// </summary>
    public void Pause()
    {
        isPlaying = false;
        if (debugLog)
            Debug.Log("[SensorDataReader] Playback paused");
    }
    
    /// <summary>
    /// Reset to first row
    /// </summary>
    public void Reset()
    {
        currentIndex = 0;
        timer = 0f;
        
        if (isLoaded && sensorData.Count > 0)
        {
            CurrentData = sensorData[0];
            if (debugLog)
                Debug.Log("[SensorDataReader] Reset to start");
        }
    }
    
    /// <summary>
    /// Jump to specific row index
    /// </summary>
    public void JumpToRow(int index)
    {
        if (!isLoaded || sensorData == null)
            return;
        
        if (index < 0 || index >= sensorData.Count)
        {
            Debug.LogWarning($"[SensorDataReader] Invalid row index: {index} (valid range: 0-{sensorData.Count - 1})");
            return;
        }
        
        currentIndex = index;
        CurrentData = sensorData[currentIndex];
        timer = 0f;
        
        if (debugLog)
            Debug.Log($"[SensorDataReader] Jumped to row {index}");
    }
    
    /// <summary>
    /// Set playback interval (speed control)
    /// </summary>
    public void SetPlaybackInterval(float interval)
    {
        if (interval <= 0f)
        {
            Debug.LogWarning("[SensorDataReader] Invalid playback interval (must be > 0)");
            return;
        }
        
        playbackInterval = interval;
        if (debugLog)
            Debug.Log($"[SensorDataReader] Playback interval set to {interval:F2}s");
    }
    
    /// <summary>
    /// Set playback speed multiplier (1.0 = normal, 2.0 = 2x faster, 0.5 = half speed)
    /// </summary>
    public void SetPlaybackSpeed(float speedMultiplier)
    {
        if (speedMultiplier <= 0f)
        {
            Debug.LogWarning("[SensorDataReader] Invalid speed multiplier (must be > 0)");
            return;
        }
        
        float baseInterval = 0.5f; // Default interval
        playbackInterval = baseInterval / speedMultiplier;
        
        if (debugLog)
            Debug.Log($"[SensorDataReader] Playback speed set to {speedMultiplier:F2}x (interval: {playbackInterval:F2}s)");
    }
    
    /// <summary>
    /// Advance to next data row
    /// </summary>
    private void AdvanceToNextRow()
    {
        if (sensorData == null || sensorData.Count == 0)
            return;
        
        currentIndex++;
        
        // Handle end of data
        if (currentIndex >= sensorData.Count)
        {
            if (loopPlayback)
            {
                currentIndex = 0;
                if (debugLog)
                    Debug.Log("[SensorDataReader] Looping back to start");
            }
            else
            {
                currentIndex = sensorData.Count - 1;
                Pause();
                if (debugLog)
                    Debug.Log("[SensorDataReader] Reached end of data, playback stopped");
                return;
            }
        }
        
        CurrentData = sensorData[currentIndex];
        
        if (debugLog && currentIndex % 10 == 0) // Log every 10 rows to avoid spam
        {
            Debug.Log($"[SensorDataReader] Row {currentIndex}/{sensorData.Count}: {CurrentData}");
        }
    }
    
    #endregion
    
    #region Public Accessors
    
    /// <summary>
    /// Get total number of data rows
    /// </summary>
    public int TotalRows => isLoaded ? sensorData.Count : 0;
    
    /// <summary>
    /// Get current row index
    /// </summary>
    public int CurrentIndex => currentIndex;
    
    /// <summary>
    /// Get playback progress (0.0 to 1.0)
    /// </summary>
    public float Progress => isLoaded && sensorData.Count > 0 ? (float)currentIndex / sensorData.Count : 0f;
    
    /// <summary>
    /// Check if data is loaded
    /// </summary>
    public bool IsLoaded => isLoaded;
    
    /// <summary>
    /// Check if currently playing
    /// </summary>
    public bool IsPlaying => isPlaying;
    
    #endregion
}
