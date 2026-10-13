# Unity 6.3 LTS Integration Guide
## 3D Printer Digital Twin Sensor Data Playback

This guide explains how to integrate the exported sensor data into your Unity 6.3 LTS digital twin for simulated sensor readings playback.

---

## 1. File Placement

Place the CSV files in your Unity project:

```
YourUnityProject/
└── Assets/
    └── StreamingAssets/
        ├── unity_sensor_playback.csv
        ├── unity_electrical_playback.csv
        └── unity_data_schema.json
```

**Why StreamingAssets?**
- Files in `StreamingAssets` are included in the build and accessible at runtime
- Works on all platforms (Windows, macOS, Linux, Android, iOS)
- Read-only access (perfect for playback data)

---

## 2. CSV Data Structure

### Sensor Playback CSV (`unity_sensor_playback.csv`)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `timestamp` | string | Window timestamp (YYYY-MM-DD HH:MM:SS) | `2005-12-22 13:15:39` |
| `vibration_rms` | float | Combined acceleration RMS (m/s²) | `9.835` |
| `health_score` | float | Health indicator (0-100%) | `79.945` |
| `machine_status` | string | Condition state | `NORMAL`, `WARNING`, `ABNORMAL` |
| `anomaly_detected` | int | Anomaly flag (0 or 1) | `0` or `1` |
| `anomaly_score` | float | Anomaly score (higher = more anomalous) | `0.387` |
| `maintenance_recommendation` | string | Action to take | `NO_ACTION`, `MONITOR`, `INSPECT` |
| `maintenance_priority` | string | Priority level | `LOW`, `MEDIUM`, `HIGH` |

**Important Notes:**
- Temperature and humidity are **NOT AVAILABLE** in the original dataset
- Data is window-level aggregated, not raw sensor readings
- 885 rows covering ~28 minutes of printing time

### Electrical Playback CSV (`unity_electrical_playback.csv`)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `timestamp` | string | Timestamp (YYYY-MM-DD HH:MM:SS.fff) | `1970-01-01 00:00:00.000` |
| `time_sec` | float | Elapsed time in seconds | `0.0` |
| `voltage` | float | Voltage (V) | `232.731` |
| `current` | float | Current (A) | `0.122` |
| `active_power` | float | Active power (W) | `5.295` |
| `apparent_power` | float | Apparent power (VA) | `28.393` |
| `power_factor` | float | Power factor (dimensionless) | `0.186` |
| `printing_stage` | int | Printing stage label | `0` |

**Important Notes:**
- 10,861 rows at 250ms intervals (4 Hz sample rate)
- Duration: 2,715 seconds (~45 minutes)
- Electrical data has different timestamps than sensor data - **cannot be synchronized**

---

## 3. C# Integration Example

### 3.1 Sensor Data Reader

```csharp
using System.Collections.Generic;
using System.IO;
using UnityEngine;

public class SensorDataReader : MonoBehaviour
{
    [Header("Playback Settings")]
    public float playbackInterval = 0.5f; // Seconds between rows
    public bool autoPlay = true;
    
    [Header("UI References")]
    public TMPro.TextMeshProUGUI vibrationText;
    public TMPro.TextMeshProUGUI healthScoreText;
    public TMPro.TextMeshProUGUI machineStatusText;
    public TMPro.TextMeshProUGUI anomalyStatusText;
    public TMPro.TextMeshProUGUI maintenanceText;
    
    private List<SensorDataRow> sensorData;
    private int currentIndex = 0;
    private float timer = 0f;
    private bool isPlaying = false;
    
    private class SensorDataRow
    {
        public string timestamp;
        public float vibrationRms;
        public float healthScore;
        public string machineStatus;
        public int anomalyDetected;
        public float anomalyScore;
        public string maintenanceRecommendation;
        public string maintenancePriority;
    }
    
    void Start()
    {
        LoadSensorData();
        if (autoPlay)
        {
            Play();
        }
    }
    
    void LoadSensorData()
    {
        string filePath = Path.Combine(Application.streamingAssetsPath, "unity_sensor_playback.csv");
        sensorData = new List<SensorDataRow>();
        
        if (!File.Exists(filePath))
        {
            Debug.LogError($"Sensor data file not found: {filePath}");
            return;
        }
        
        string[] lines = File.ReadAllLines(filePath);
        
        // Skip header row
        for (int i = 1; i < lines.Length; i++)
        {
            string[] values = lines[i].Split(',');
            
            if (values.Length < 8) continue;
            
            SensorDataRow row = new SensorDataRow
            {
                timestamp = values[0],
                vibrationRms = ParseFloat(values[1]),
                healthScore = ParseFloat(values[2]),
                machineStatus = values[3],
                anomalyDetected = ParseInt(values[4]),
                anomalyScore = ParseFloat(values[5]),
                maintenanceRecommendation = values[6],
                maintenancePriority = values[7]
            };
            
            sensorData.Add(row);
        }
        
        Debug.Log($"Loaded {sensorData.Count} sensor data rows");
    }
    
    float ParseFloat(string value)
    {
        if (string.IsNullOrEmpty(value)) return 0f;
        if (float.TryParse(value, out float result)) return result;
        return 0f;
    }
    
    int ParseInt(string value)
    {
        if (string.IsNullOrEmpty(value)) return 0;
        if (int.TryParse(value, out int result)) return result;
        return 0;
    }
    
    void Update()
    {
        if (!isPlaying || sensorData == null || sensorData.Count == 0)
            return;
        
        timer += Time.deltaTime;
        
        if (timer >= playbackInterval)
        {
            timer = 0f;
            PlayNextRow();
        }
    }
    
    void PlayNextRow()
    {
        if (currentIndex >= sensorData.Count)
        {
            // Loop back to start or stop
            currentIndex = 0;
            // Alternatively: Pause();
            return;
        }
        
        SensorDataRow row = sensorData[currentIndex];
        UpdateUI(row);
        
        currentIndex++;
    }
    
    void UpdateUI(SensorDataRow row)
    {
        if (vibrationText != null)
            vibrationText.text = $"Vibration: {row.vibrationRms:F2} m/s²";
        
        if (healthScoreText != null)
        {
            healthScoreText.text = $"Health: {row.healthScore:F1}%";
            // Optional: Color code health score
            healthScoreText.color = GetHealthColor(row.healthScore);
        }
        
        if (machineStatusText != null)
            machineStatusText.text = $"Status: {row.machineStatus}";
        
        if (anomalyStatusText != null)
        {
            anomalyStatusText.text = row.anomalyDetected == 1 ? "ANOMALY DETECTED" : "Normal";
            anomalyStatusText.color = row.anomalyDetected == 1 ? Color.red : Color.green;
        }
        
        if (maintenanceText != null)
        {
            maintenanceText.text = $"{row.maintenanceRecommendation} ({row.maintenancePriority})";
        }
    }
    
    Color GetHealthColor(float healthScore)
    {
        if (healthScore >= 80f) return Color.green;
        if (healthScore >= 50f) return Color.yellow;
        return Color.red;
    }
    
    // Public control methods
    public void Play()
    {
        isPlaying = true;
    }
    
    public void Pause()
    {
        isPlaying = false;
    }
    
    public void Reset()
    {
        currentIndex = 0;
        timer = 0f;
        if (sensorData != null && sensorData.Count > 0)
        {
            UpdateUI(sensorData[0]);
        }
    }
    
    public void SetPlaybackInterval(float interval)
    {
        playbackInterval = interval;
    }
}
```

### 3.2 Electrical Data Reader

```csharp
using System.Collections.Generic;
using System.IO;
using UnityEngine;

public class ElectricalDataReader : MonoBehaviour
{
    [Header("Playback Settings")]
    public float playbackInterval = 0.25f; // 250ms (matches data sample rate)
    public bool autoPlay = true;
    
    [Header("UI References")]
    public TMPro.TextMeshProUGUI voltageText;
    public TMPro.TextMeshProUGUI currentText;
    public TMPro.TextMeshProUGUI powerText;
    public TMPro.TextMeshProUGUI powerFactorText;
    public TMPro.TextMeshProUGUI stageText;
    
    private List<ElectricalDataRow> electricalData;
    private int currentIndex = 0;
    private float timer = 0f;
    private bool isPlaying = false;
    
    private class ElectricalDataRow
    {
        public string timestamp;
        public float timeSec;
        public float voltage;
        public float current;
        public float activePower;
        public float apparentPower;
        public float powerFactor;
        public int printingStage;
    }
    
    void Start()
    {
        LoadElectricalData();
        if (autoPlay)
        {
            Play();
        }
    }
    
    void LoadElectricalData()
    {
        string filePath = Path.Combine(Application.streamingAssetsPath, "unity_electrical_playback.csv");
        electricalData = new List<ElectricalDataRow>();
        
        if (!File.Exists(filePath))
        {
            Debug.LogError($"Electrical data file not found: {filePath}");
            return;
        }
        
        string[] lines = File.ReadAllLines(filePath);
        
        // Skip header row
        for (int i = 1; i < lines.Length; i++)
        {
            string[] values = lines[i].Split(',');
            
            if (values.Length < 8) continue;
            
            ElectricalDataRow row = new ElectricalDataRow
            {
                timestamp = values[0],
                timeSec = ParseFloat(values[1]),
                voltage = ParseFloat(values[2]),
                current = ParseFloat(values[3]),
                activePower = ParseFloat(values[4]),
                apparentPower = ParseFloat(values[5]),
                powerFactor = ParseFloat(values[6]),
                printingStage = ParseInt(values[7])
            };
            
            electricalData.Add(row);
        }
        
        Debug.Log($"Loaded {electricalData.Count} electrical data rows");
    }
    
    float ParseFloat(string value)
    {
        if (string.IsNullOrEmpty(value)) return 0f;
        if (float.TryParse(value, out float result)) return result;
        return 0f;
    }
    
    int ParseInt(string value)
    {
        if (string.IsNullOrEmpty(value)) return 0;
        if (int.TryParse(value, out int result)) return result;
        return 0;
    }
    
    void Update()
    {
        if (!isPlaying || electricalData == null || electricalData.Count == 0)
            return;
        
        timer += Time.deltaTime;
        
        if (timer >= playbackInterval)
        {
            timer = 0f;
            PlayNextRow();
        }
    }
    
    void PlayNextRow()
    {
        if (currentIndex >= electricalData.Count)
        {
            currentIndex = 0;
            return;
        }
        
        ElectricalDataRow row = electricalData[currentIndex];
        UpdateUI(row);
        
        currentIndex++;
    }
    
    void UpdateUI(ElectricalDataRow row)
    {
        if (voltageText != null)
            voltageText.text = $"Voltage: {row.voltage:F2} V";
        
        if (currentText != null)
            currentText.text = $"Current: {row.current:F3} A";
        
        if (powerText != null)
            powerText.text = $"Power: {row.activePower:F2} W";
        
        if (powerFactorText != null)
            powerFactorText.text = $"PF: {row.powerFactor:F3}";
        
        if (stageText != null)
            stageText.text = $"Stage: {row.printingStage}";
    }
    
    public void Play() => isPlaying = true;
    public void Pause() => isPlaying = false;
    public void Reset()
    {
        currentIndex = 0;
        timer = 0f;
        if (electricalData != null && electricalData.Count > 0)
        {
            UpdateUI(electricalData[0]);
        }
    }
}
```

### 3.3 Combined Playback Controller

```csharp
using UnityEngine;
using UnityEngine.UI;

public class PlaybackController : MonoBehaviour
{
    public SensorDataReader sensorReader;
    public ElectricalDataReader electricalReader;
    
    public Button playButton;
    public Button pauseButton;
    public Button resetButton;
    
    public Slider speedSlider;
    
    void Start()
    {
        // Wire up buttons
        if (playButton != null)
            playButton.onClick.AddListener(OnPlay);
        
        if (pauseButton != null)
            pauseButton.onClick.AddListener(OnPause);
        
        if (resetButton != null)
            resetButton.onClick.AddListener(OnReset);
        
        if (speedSlider != null)
            speedSlider.onValueChanged.AddListener(OnSpeedChanged);
    }
    
    void OnPlay()
    {
        sensorReader?.Play();
        electricalReader?.Play();
    }
    
    void OnPause()
    {
        sensorReader?.Pause();
        electricalReader?.Pause();
    }
    
    void OnReset()
    {
        sensorReader?.Reset();
        electricalReader?.Reset();
    }
    
    void OnSpeedChanged(float value)
    {
        // Map slider 0.1-2.0 to interval
        float interval = 0.5f / value;
        sensorReader?.SetPlaybackInterval(interval);
        electricalReader?.SetPlaybackInterval(interval * 0.5f); // Keep electrical faster
    }
}
```

---

## 4. Handling Missing Values

The CSV files use empty strings for missing values. The `ParseFloat` and `ParseInt` methods in the examples handle this by returning default values (0f or 0).

If you need to distinguish between "missing" and "zero", modify the parsing:

```csharp
float? ParseNullableFloat(string value)
{
    if (string.IsNullOrEmpty(value)) return null;
    if (float.TryParse(value, out float result)) return result;
    return null;
}

// Usage
float? vibration = ParseNullableFloat(values[1]);
if (vibration.HasValue)
{
    vibrationText.text = $"Vibration: {vibration.Value:F2} m/s²";
}
else
{
    vibrationText.text = "Vibration: N/A";
}
```

---

## 5. Data Limitations

### Known Gaps

1. **Temperature and Humidity**
   - Not available in the original dataset
   - Do not display these fields in Unity
   - If needed, these would require new sensor data collection

2. **Synchronization**
   - Sensor data (window-level) and electrical data (250ms samples) have different timestamps
   - Cannot be synchronized row-by-row
   - Display them as separate contexts in your UI

3. **Temporal Resolution**
   - Sensor data is window-aggregated features, not raw readings
   - Playback represents ~28 minutes of printing in 885 windows
   - Electrical data has higher resolution (10,861 samples)

4. **Historical Data**
   - This is historical recording from 2005-12-22
   - Not live ESP32 streaming
   - Timestamps reflect original recording time

---

## 6. Unity Project Setup

### Required Packages

- **TextMeshPro** (included in Unity 6.3 LTS)
- No additional packages required for CSV reading

### UI Setup

1. Create a Canvas
2. Add TextMeshPro text elements for:
   - Vibration RMS
   - Health Score
   - Machine Status
   - Anomaly Status
   - Maintenance Recommendation
   - Voltage, Current, Power (electrical)
3. Add Buttons for Play, Pause, Reset
4. Add Slider for playback speed
5. Attach the scripts to GameObjects

### Hierarchy Example

```
Canvas
├── SensorPanel
│   ├── VibrationText (TMP)
│   ├── HealthScoreText (TMP)
│   ├── StatusText (TMP)
│   ├── AnomalyText (TMP)
│   └── MaintenanceText (TMP)
├── ElectricalPanel
│   ├── VoltageText (TMP)
│   ├── CurrentText (TMP)
│   ├── PowerText (TMP)
│   └── StageText (TMP)
└── Controls
    ├── PlayButton
    ├── PauseButton
    ├── ResetButton
    └── SpeedSlider
```

---

## 7. Performance Considerations

- CSV files are small (sensor: ~100KB, electrical: ~500KB)
- Loading is fast (single operation at Start)
- Playback is lightweight (simple UI updates)
- No performance issues expected for typical Unity projects

---

## 8. Testing

1. Place CSV files in `Assets/StreamingAssets/`
2. Add scripts to scene
3. Wire up UI references
4. Press Play in Unity
5. Verify:
   - Data loads without errors
   - UI updates at configured interval
   - Play/Pause/Reset work correctly
   - Speed slider changes playback rate
   - No crashes on missing values

---

## 9. Troubleshooting

### "File not found" error
- Verify CSV files are in `Assets/StreamingAssets/`
- Check filename spelling matches exactly
- Rebuild project after adding files

### UI not updating
- Verify script references are assigned in Inspector
- Check `isPlaying` flag is true
- Ensure `playbackInterval` is not too large

### Values showing as 0
- Check CSV column order matches parsing code
- Verify CSV delimiter is comma (not semicolon)
- Check for empty strings in CSV

---

## 10. Regenerating Data

If you need to regenerate the Unity CSV files from the processed data:

```bash
cd D:\3d_printer_predictive_maintanance
python export_unity_data.py
```

This will:
- Load existing processed CSV files
- Add maintenance recommendations
- Export Unity-compatible files
- Generate schema documentation
- Validate outputs

No live ESP32 connection required.

---

## Summary

You now have:
- ✅ Unity-ready CSV files in `unity_data/`
- ✅ Schema documentation in `unity_data_schema.json`
- ✅ C# scripts for playback
- ✅ Integration guide for Unity 6.3 LTS
- ✅ Reproducible export script

The digital twin can now display simulated sensor readings by replaying the processed historical data, independent of live ESP32 streaming.
