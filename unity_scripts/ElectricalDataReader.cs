using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

/// <summary>
/// Reads and plays back electrical data from unity_electrical_playback.csv
/// Provides voltage, current, power, and printing stage information.
/// Data is sampled at 250ms intervals (4 Hz).
/// Note: Electrical data has independent timestamps and cannot be synchronized with sensor data.
/// </summary>
public class ElectricalDataReader : MonoBehaviour
{
    [Header("File Settings")]
    [Tooltip("CSV filename in StreamingAssets folder")]
    public string csvFileName = "unity_electrical_playback.csv";
    
    [Header("Playback Settings")]
    [Tooltip("Seconds between data rows during playback (default 0.25s = 4 Hz to match data sample rate)")]
    public float playbackInterval = 0.25f;
    
    [Tooltip("Auto-start playback on Awake")]
    public bool autoPlay = true;
    
    [Tooltip("Loop back to start when reaching end")]
    public bool loopPlayback = true;
    
    [Header("Debug")]
    [Tooltip("Log data rows to console")]
    public bool debugLog = false;
    
    // Internal data structures
    private List<ElectricalDataRow> electricalData;
    private int currentIndex = 0;
    private float timer = 0f;
    private bool isPlaying = false;
    private bool isLoaded = false;
    
    // Current data (accessible by other scripts)
    public ElectricalDataRow CurrentData { get; private set; }
    
    /// <summary>
    /// Single row of electrical data from CSV
    /// </summary>
    [System.Serializable]
    public class ElectricalDataRow
    {
        public string timestamp;
        public float timeSec;
        public float voltage;
        public float current;
        public float activePower;
        public float apparentPower;
        public float powerFactor;
        public int printingStage;
        
        /// <summary>
        /// Returns a string representation for debugging
        /// </summary>
        public override string ToString()
        {
            return $"[{timestamp}] Time: {timeSec:F2}s, Voltage: {voltage:F2}V, Current: {current:F3}A, Power: {activePower:F2}W, Stage: {printingStage}";
        }
    }
    
    #region Unity Lifecycle
    
    void Awake()
    {
        LoadElectricalData();
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
        if (!isPlaying || !isLoaded || electricalData == null || electricalData.Count == 0)
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
    public void LoadElectricalData()
    {
        string filePath = Path.Combine(Application.streamingAssetsPath, csvFileName);
        electricalData = new List<ElectricalDataRow>();
        
        if (!File.Exists(filePath))
        {
            Debug.LogError($"[ElectricalDataReader] CSV file not found: {filePath}");
            Debug.LogError($"[ElectricalDataReader] Expected location: Assets/StreamingAssets/{csvFileName}");
            return;
        }
        
        try
        {
            string[] lines = File.ReadAllLines(filePath);
            
            if (lines.Length < 2)
            {
                Debug.LogError($"[ElectricalDataReader] CSV file is empty or has no data rows: {filePath}");
                return;
            }
            
            // Parse header row to validate column count
            string[] headers = lines[0].Split(',');
            int expectedColumnCount = 8; // timestamp, time_sec, voltage, current, active_power, apparent_power, power_factor, printing_stage
            
            if (headers.Length != expectedColumnCount)
            {
                Debug.LogWarning($"[ElectricalDataReader] Expected {expectedColumnCount} columns, found {headers.Length}");
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
                
                ElectricalDataRow row = ParseCSVLine(lines[i]);
                
                if (row != null)
                {
                    electricalData.Add(row);
                    parsedRows++;
                }
                else
                {
                    skippedRows++;
                }
            }
            
            isLoaded = electricalData.Count > 0;
            
            if (isLoaded)
            {
                Debug.Log($"[ElectricalDataReader] Loaded {parsedRows} electrical data rows from {csvFileName}");
                if (skippedRows > 0)
                {
                    Debug.LogWarning($"[ElectricalDataReader] Skipped {skippedRows} invalid rows");
                }
                
                // Initialize current data
                CurrentData = electricalData[0];
            }
            else
            {
                Debug.LogError($"[ElectricalDataReader] Failed to load any valid data from {csvFileName}");
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"[ElectricalDataReader] Error loading CSV file: {e.Message}");
            Debug.LogError($"[ElectricalDataReader] Stack trace: {e.StackTrace}");
        }
    }
    
    /// <summary>
    /// Parse a single CSV line into ElectricalDataRow
    /// Handles empty strings and malformed data gracefully
    /// </summary>
    private ElectricalDataRow ParseCSVLine(string line)
    {
        string[] values = SplitCSVLine(line);
        
        if (values.Length < 8)
        {
            if (debugLog)
            {
                Debug.LogWarning($"[ElectricalDataReader] Skipping malformed line (expected 8 columns, got {values.Length}): {line}");
            }
            return null;
        }
        
        try
        {
            ElectricalDataRow row = new ElectricalDataRow
            {
                timestamp = values[0].Trim(),
                timeSec = ParseFloat(values[1]),
                voltage = ParseFloat(values[2]),
                current = ParseFloat(values[3]),
                activePower = ParseFloat(values[4]),
                apparentPower = ParseFloat(values[5]),
                powerFactor = ParseFloat(values[6]),
                printingStage = ParseInt(values[7])
            };
            
            return row;
        }
        catch (Exception e)
        {
            if (debugLog)
            {
                Debug.LogWarning($"[ElectricalDataReader] Failed to parse line: {e.Message}");
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
            Debug.LogWarning("[ElectricalDataReader] Cannot play - data not loaded");
            return;
        }
        
        isPlaying = true;
        if (debugLog)
            Debug.Log("[ElectricalDataReader] Playback started");
    }
    
    /// <summary>
    /// Pause playback
    /// </summary>
    public void Pause()
    {
        isPlaying = false;
        if (debugLog)
            Debug.Log("[ElectricalDataReader] Playback paused");
    }
    
    /// <summary>
    /// Reset to first row
    /// </summary>
    public void Reset()
    {
        currentIndex = 0;
        timer = 0f;
        
        if (isLoaded && electricalData.Count > 0)
        {
            CurrentData = electricalData[0];
            if (debugLog)
                Debug.Log("[ElectricalDataReader] Reset to start");
        }
    }
    
    /// <summary>
    /// Jump to specific row index
    /// </summary>
    public void JumpToRow(int index)
    {
        if (!isLoaded || electricalData == null)
            return;
        
        if (index < 0 || index >= electricalData.Count)
        {
            Debug.LogWarning($"[ElectricalDataReader] Invalid row index: {index} (valid range: 0-{electricalData.Count - 1})");
            return;
        }
        
        currentIndex = index;
        CurrentData = electricalData[currentIndex];
        timer = 0f;
        
        if (debugLog)
            Debug.Log($"[ElectricalDataReader] Jumped to row {index}");
    }
    
    /// <summary>
    /// Set playback interval (speed control)
    /// </summary>
    public void SetPlaybackInterval(float interval)
    {
        if (interval <= 0f)
        {
            Debug.LogWarning("[ElectricalDataReader] Invalid playback interval (must be > 0)");
            return;
        }
        
        playbackInterval = interval;
        if (debugLog)
            Debug.Log($"[ElectricalDataReader] Playback interval set to {interval:F2}s");
    }
    
    /// <summary>
    /// Set playback speed multiplier (1.0 = normal, 2.0 = 2x faster, 0.5 = half speed)
    /// </summary>
    public void SetPlaybackSpeed(float speedMultiplier)
    {
        if (speedMultiplier <= 0f)
        {
            Debug.LogWarning("[ElectricalDataReader] Invalid speed multiplier (must be > 0)");
            return;
        }
        
        float baseInterval = 0.25f; // Default interval (matches 4 Hz sample rate)
        playbackInterval = baseInterval / speedMultiplier;
        
        if (debugLog)
            Debug.Log($"[ElectricalDataReader] Playback speed set to {speedMultiplier:F2}x (interval: {playbackInterval:F2}s)");
    }
    
    /// <summary>
    /// Advance to next data row
    /// </summary>
    private void AdvanceToNextRow()
    {
        if (electricalData == null || electricalData.Count == 0)
            return;
        
        currentIndex++;
        
        // Handle end of data
        if (currentIndex >= electricalData.Count)
        {
            if (loopPlayback)
            {
                currentIndex = 0;
                if (debugLog)
                    Debug.Log("[ElectricalDataReader] Looping back to start");
            }
            else
            {
                currentIndex = electricalData.Count - 1;
                Pause();
                if (debugLog)
                    Debug.Log("[ElectricalDataReader] Reached end of data, playback stopped");
                return;
            }
        }
        
        CurrentData = electricalData[currentIndex];
        
        if (debugLog && currentIndex % 50 == 0) // Log every 50 rows to avoid spam (electrical has more rows)
        {
            Debug.Log($"[ElectricalDataReader] Row {currentIndex}/{electricalData.Count}: {CurrentData}");
        }
    }
    
    #endregion
    
    #region Public Accessors
    
    /// <summary>
    /// Get total number of data rows
    /// </summary>
    public int TotalRows => isLoaded ? electricalData.Count : 0;
    
    /// <summary>
    /// Get current row index
    /// </summary>
    public int CurrentIndex => currentIndex;
    
    /// <summary>
    /// Get playback progress (0.0 to 1.0)
    /// </summary>
    public float Progress => isLoaded && electricalData.Count > 0 ? (float)currentIndex / electricalData.Count : 0f;
    
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
