# Unity C# Scripts for 3D Printer Digital Twin

Complete, ready-to-use Unity 6.3 LTS C# scripts for displaying sensor data playback in your 3D printer digital twin.

---

## 📦 Deliverables

All files are in the `unity_scripts/` directory:

| File | Lines | Purpose |
|------|-------|---------|
| `SensorDataReader.cs` | 436 | Reads sensor CSV, handles playback, provides current data |
| `ElectricalDataReader.cs` | 437 | Reads electrical CSV, handles playback, provides current data |
| `DashboardManager.cs` | 427 | Updates TextMeshPro UI with sensor and electrical values |
| `PlaybackController.cs` | 484 | Controls Play, Pause, Reset, speed, and progress |
| `SETUP_GUIDE.md` | 548 | Complete integration instructions with step-by-step setup |

---

## ✨ Features

### SensorDataReader.cs
- ✅ Robust CSV parsing with error handling
- ✅ Configurable playback interval (default 0.5s)
- ✅ Loop playback support
- ✅ Play/Pause/Reset/JumpToRow controls
- ✅ Speed multiplier support (0.1x to 5.0x)
- ✅ Debug logging option
- ✅ Public accessors for total rows, current index, progress
- ✅ CurrentData property for external access

### ElectricalDataReader.cs
- ✅ Robust CSV parsing with error handling
- ✅ Configurable playback interval (default 0.25s = 4 Hz)
- ✅ Loop playback support
- ✅ Play/Pause/Reset/JumpToRow controls
- ✅ Speed multiplier support (0.1x to 5.0x)
- ✅ Debug logging option
- ✅ Public accessors for total rows, current index, progress
- ✅ CurrentData property for external access

### DashboardManager.cs
- ✅ Automatic UI updates from both readers
- ✅ Configurable update frequency (performance optimization)
- ✅ Color-coded health scores (green/yellow/red)
- ✅ Color-coded status and priority
- ✅ Optional status indicators (enable/disable GameObjects)
- ✅ Graceful handling of missing data (shows "--" for N/A)
- ✅ Timestamp display for both sensor and electrical data
- ✅ Auto-finds readers if not assigned

### PlaybackController.cs
- ✅ Unified control of both readers
- ✅ Play/Pause/Reset buttons
- ✅ Speed slider (0.1x to 5.0x)
- ✅ Progress slider with seek functionality
- ✅ Loop toggle
- ✅ Button state management (disable play when playing)
- ✅ Auto-start option
- ✅ Public properties for current state

---

## 🚀 Quick Start

### 1. Copy Files to Unity

**CSV Files:**
```
YourUnityProject/Assets/StreamingAssets/
├── unity_sensor_playback.csv
├── unity_electrical_playback.csv
└── unity_data_schema.json
```

**C# Scripts:**
```
YourUnityProject/Assets/Scripts/
├── SensorDataReader.cs
├── ElectricalDataReader.cs
├── DashboardManager.cs
└── PlaybackController.cs
```

### 2. Create GameObjects

1. Create empty GameObject `SensorDataReader` → Add `SensorDataReader` component
2. Create empty GameObject `ElectricalDataReader` → Add `ElectricalDataReader` component
3. Select Canvas → Add `DashboardManager` component
4. Select Canvas → Add `PlaybackController` component

### 3. Create UI Elements

Create TextMeshPro text elements for:
- Vibration (label, value, unit)
- Health Score (label, value, unit)
- Machine Status (label, value)
- Anomaly (label, value, score label, score value)
- Maintenance (label, value, priority label, priority value)
- Timestamps (sensor and electrical)
- Voltage, Current, Power, Power Factor, Stage, Time (electrical)

Create controls:
- Play Button, Pause Button, Reset Button
- Speed Slider, Speed Text
- Progress Slider, Progress Text
- Loop Toggle

### 4. Assign References in Inspector

**DashboardManager:**
- Drag `SensorDataReader` to Sensor Reader field
- Drag `ElectricalDataReader` to Electrical Reader field
- Drag all TextMeshPro elements to their respective fields
- Assign optional status indicators

**PlaybackController:**
- Drag `SensorDataReader` to Sensor Reader field
- Drag `ElectricalDataReader` to Electrical Reader field
- Drag buttons to button fields
- Drag sliders to slider fields
- Drag text elements to text fields
- Drag toggle to loop toggle field

### 5. Test

1. Press Play in Unity
2. Verify Console shows: "Loaded 885 sensor data rows" and "Loaded 10861 electrical data rows"
3. Check UI values updating
4. Test Play/Pause/Reset buttons
5. Test speed slider
6. Test progress slider (drag to seek)

---

## 📋 CSV Column Mapping

### Sensor Data (unity_sensor_playback.csv)

| CSV Column | Script Field | Type | Example |
|------------|--------------|------|---------|
| timestamp | timestamp | string | "2005-12-22 13:15:39" |
| vibration_rms | vibrationRms | float | 9.835 |
| health_score | healthScore | float | 79.945 |
| machine_status | machineStatus | string | "WARNING" |
| anomaly_detected | anomalyDetected | int | 0 or 1 |
| anomaly_score | anomalyScore | float | 0.387 |
| maintenance_recommendation | maintenanceRecommendation | string | "MONITOR" |
| maintenance_priority | maintenancePriority | string | "MEDIUM" |

### Electrical Data (unity_electrical_playback.csv)

| CSV Column | Script Field | Type | Example |
|------------|--------------|------|---------|
| timestamp | timestamp | string | "1970-01-01 00:00:00.000" |
| time_sec | timeSec | float | 0.0 |
| voltage | voltage | float | 232.731 |
| current | current | float | 0.122 |
| active_power | activePower | float | 5.295 |
| apparent_power | apparentPower | float | 28.393 |
| power_factor | powerFactor | float | 0.186 |
| printing_stage | printingStage | int | 0 |

---

## ⚠️ Important Notes

### Data Limitations

1. **Temperature and Humidity**: NOT AVAILABLE in original dataset
   - Do not create UI elements for these fields
   - Scripts do not include temperature or humidity readings

2. **Temporal Misalignment**: Sensor and electrical data have different timestamps
   - Cannot be synchronized row-by-row
   - Display as separate contexts in UI
   - Scripts handle them independently

3. **Aggregated Data**: Sensor data is window-level features
   - Not raw sensor readings
   - Suitable for status display, not waveform visualization

4. **Historical Data**: Timestamps reflect original recording time
   - This is historical playback, not real-time monitoring
   - Suitable for simulation and demonstration

### Missing Value Handling

- Empty strings in CSV are parsed as 0 (float) or 0 (int)
- DashboardManager displays "--" for missing values
- No crashes on malformed data
- Skips invalid rows with warning in Console (if debug enabled)

---

## 🔧 Inspector Configuration

### SensorDataReader

| Field | Default | Description |
|-------|---------|-------------|
| CSV Filename | unity_sensor_playback.csv | CSV file in StreamingAssets |
| Playback Interval | 0.5 | Seconds between rows |
| Auto Play | true | Start playback on Awake |
| Loop Playback | true | Loop when reaching end |
| Debug Log | false | Log rows to Console |

### ElectricalDataReader

| Field | Default | Description |
|-------|---------|-------------|
| CSV Filename | unity_electrical_playback.csv | CSV file in StreamingAssets |
| Playback Interval | 0.25 | Seconds between rows (matches 4 Hz) |
| Auto Play | true | Start playback on Awake |
| Loop Playback | true | Loop when reaching end |
| Debug Log | false | Log rows to Console |

### DashboardManager

| Field | Default | Description |
|-------|---------|-------------|
| Sensor Reader | (none) | SensorDataReader reference |
| Electrical Reader | (none) | ElectricalDataReader reference |
| [Sensor UI fields] | (none) | TextMeshPro references |
| [Electrical UI fields] | (none) | TextMeshPro references |
| Normal Health Color | Green | Color for >=80% health |
| Warning Health Color | Yellow | Color for 50-80% health |
| Abnormal Health Color | Red | Color for <50% health |
| Update Frequency | 1 | Update every N frames |

### PlaybackController

| Field | Default | Description |
|-------|---------|-------------|
| Sensor Reader | (none) | SensorDataReader reference |
| Electrical Reader | (none) | ElectricalDataReader reference |
| Play Button | (none) | Button reference |
| Pause Button | (none) | Button reference |
| Reset Button | (none) | Button reference |
| Speed Slider | (none) | Slider reference |
| Speed Text | (none) | TextMeshPro reference |
| Progress Slider | (none) | Slider reference |
| Progress Text | (none) | TextMeshPro reference |
| Loop Toggle | (none) | Toggle reference |
| Min Speed | 0.1 | Minimum speed multiplier |
| Max Speed | 5.0 | Maximum speed multiplier |
| Default Speed | 1.0 | Default speed multiplier |
| Auto Start | false | Auto-start on scene load |

---

## 🎯 Code Quality

### Robust CSV Parsing
- Handles empty strings gracefully
- Skips malformed rows with warnings
- Validates column count
- Safe float/int parsing with defaults
- Error logging with stack traces

### Performance Optimized
- CSV loaded once at Awake
- Minimal Update() overhead
- Configurable UI update frequency
- No memory leaks (proper cleanup)

### Clean Architecture
- Separation of concerns (data reading, UI updates, playback control)
- Public properties for external access
- Clear method naming
- Comprehensive XML documentation

### Error Handling
- Graceful degradation on missing files
- Null checks before accessing data
- Default values for missing UI references
- Warning logs for configuration issues

---

## 📖 Detailed Setup Guide

For complete step-by-step instructions with screenshots and hierarchy examples, see:

**`SETUP_GUIDE.md`**

Includes:
- Detailed UI creation steps
- Exact Inspector assignments
- Scene hierarchy example
- Troubleshooting section
- Customization tips
- Performance considerations

---

## 🔍 Troubleshooting

### "CSV file not found"
- Verify files in `Assets/StreamingAssets/`
- Check filename spelling (case-sensitive)
- Rebuild project after adding files

### "UI not updating"
- Verify DashboardManager references assigned
- Check readers have `Auto Play = true` or press Play
- Enable `Debug Log` on readers

### "Values showing as --"
- Check Console for CSV loading errors
- Verify CSV files not corrupted
- Enable `Debug Log` on readers

### "Compilation errors about TextMeshPro"
- Install: `Window > TextMeshPro > Import TMP Essentials`
- Or remove `using TMPro;` and use Unity UI Text

### "Buttons not responding"
- Verify button event listeners wired in Inspector
- Ensure PlaybackController references assigned
- Check buttons have `Interactable = true`

---

## 🎨 Customization Examples

### Change Health Score Colors
In DashboardManager Inspector:
- Normal Health Color: Set to your preferred green
- Warning Health Color: Set to your preferred yellow
- Abnormal Health Color: Set to your preferred red

### Adjust Playback Speed
- Use Speed Slider in runtime
- Or change Default Speed in PlaybackController Inspector
- Or call `SetSpeed(2.0f)` from another script

### Add Custom Indicators
- Create GameObjects (e.g., warning lights)
- Assign to Anomaly Indicator and Maintenance Indicator in DashboardManager
- They auto-enable/disable based on data

### Reduce UI Update Frequency
- Set Update Frequency to 5 or 10 in DashboardManager
- Reduces UI updates while keeping playback smooth

---

## 📊 Data Statistics

### Sensor Data
- Rows: 885
- Duration: ~28 minutes
- Health score range: 28.5% to 87.6%
- Status distribution: NORMAL (53.4%), WARNING (44.2%), ABNORMAL (2.4%)
- Anomalies: 55 (6.2%)

### Electrical Data
- Rows: 10,861
- Duration: ~45 minutes
- Sample rate: 250ms (4 Hz)
- Voltage: 232.43V to 232.77V
- Current: 0.121A to 1.218A
- Power: 5.22W to 266.57W

---

## ✅ Verification Checklist

Before testing in Unity:

- [ ] CSV files copied to `Assets/StreamingAssets/`
- [ ] C# scripts copied to `Assets/Scripts/`
- [ ] TextMeshPro installed (or use Unity UI Text)
- [ ] SensorDataReader GameObject created and configured
- [ ] ElectricalDataReader GameObject created and configured
- [ ] DashboardManager component added to Canvas
- [ ] PlaybackController component added to Canvas
- [ ] All UI TextMeshPro elements created
- [ ] All UI references assigned in DashboardManager Inspector
- [ ] All control references assigned in PlaybackController Inspector
- [ ] Reader references assigned in both DashboardManager and PlaybackController

---

## 🎮 Runtime Controls

Once in Play mode:

- **Play Button**: Start/resume playback
- **Pause Button**: Pause playback
- **Reset Button**: Return to start
- **Speed Slider**: Adjust playback speed (0.1x to 5.0x)
- **Progress Slider**: Seek to specific position
- **Loop Toggle**: Enable/disable looping

---

## 📝 Code Access

### Access Current Data from Other Scripts

```csharp
// Get reference to reader
SensorDataReader reader = FindFirstObjectByType<SensorDataReader>();

// Access current data
if (reader != null && reader.IsLoaded)
{
    float vibration = reader.CurrentData.vibrationRms;
    float health = reader.CurrentData.healthScore;
    string status = reader.CurrentData.machineStatus;
    
    // Use data...
}
```

### Control Playback from Other Scripts

```csharp
// Get reference to controller
PlaybackController controller = FindFirstObjectByType<PlaybackController>();

// Control playback
controller.Play();
controller.Pause();
controller.Reset();
controller.SetSpeed(2.0f);
controller.JumpToProgress(0.5f); // Jump to 50%
```

---

## 🎯 Summary

You now have:

✅ **4 complete C# scripts** for Unity 6.3 LTS
✅ **Robust CSV parsing** with error handling
✅ **Comprehensive UI system** with color coding
✅ **Full playback control** (Play, Pause, Reset, Speed, Progress)
✅ **Detailed setup guide** with step-by-step instructions
✅ **Clear documentation** with examples and troubleshooting
✅ **No dependencies** on live ESP32 or backend
✅ **Compatible with existing Unity project**

The scripts are ready to integrate into your 3D printer digital twin for simulated sensor data playback.

---

## 📞 Support

For detailed setup instructions, see `SETUP_GUIDE.md`.

For data documentation, see `unity_data/README.md` and `unity_data/unity_data_schema.json`.
