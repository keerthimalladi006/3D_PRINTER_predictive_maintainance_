# Unity C# Scripts Setup Guide
## 3D Printer Digital Twin Sensor Data Playback

This guide explains how to integrate the provided C# scripts into your existing Unity 6.3 LTS project for 3D printer digital twin visualization.

---

## File List

All scripts are in the `unity_scripts/` directory:

1. **SensorDataReader.cs** - Reads and plays back sensor data from CSV
2. **ElectricalDataReader.cs** - Reads and plays back electrical data from CSV
3. **DashboardManager.cs** - Updates TextMeshPro UI elements with data
4. **PlaybackController.cs** - Controls Play, Pause, Reset, and speed

---

## Step 1: Copy CSV Files to Unity

Copy the CSV files from your project to Unity's StreamingAssets folder:

```
YourUnityProject/
└── Assets/
    └── StreamingAssets/
        ├── unity_sensor_playback.csv
        ├── unity_electrical_playback.csv
        └── unity_data_schema.json
```

**How to do this:**
1. In Unity, right-click in the Project window
2. Select `Create > Folder`
3. Name it `StreamingAssets` (if it doesn't exist)
4. Copy the CSV files from `D:\3d_printer_predictive_maintanance\unity_data\` to this folder
5. Or, manually create the folder structure in your file system and Unity will detect it

---

## Step 2: Copy C# Scripts to Unity

Copy the C# scripts to your Unity project:

```
YourUnityProject/
└── Assets/
    └── Scripts/  (or any Scripts folder you prefer)
        ├── SensorDataReader.cs
        ├── ElectricalDataReader.cs
        ├── DashboardManager.cs
        └── PlaybackController.cs
```

**How to do this:**
1. In Unity, create a `Scripts` folder in `Assets` (or use existing)
2. Copy the `.cs` files from `D:\3d_printer_predictive_maintanance\unity_scripts\` to this folder
3. Unity will automatically compile them

**Verification:**
- Open the Console window (`Window > General > Console`)
- You should see no compilation errors
- If you see errors about `TextMeshPro`, ensure TextMeshPro is installed (included in Unity 6.3 LTS)

---

## Step 3: Create UI Structure

Create a Canvas and UI elements for your dashboard.

### 3.1 Create Canvas

1. Right-click in Hierarchy
2. Select `UI > Canvas`
3. Set Canvas Scaler to `Scale With Screen Size`
4. Reference resolution: 1920x1080 (or your preference)

### 3.2 Create Sensor Panel

Create a panel to hold sensor data UI:

```
Canvas
└── SensorPanel (Panel)
    ├── Vibration Group
    │   ├── VibrationLabel (Text - TextMeshPro)
    │   ├── VibrationValue (Text - TextMeshPro)
    │   └── VibrationUnit (Text - TextMeshPro)
    ├── Health Score Group
    │   ├── HealthLabel (Text - TextMeshPro)
    │   ├── HealthValue (Text - TextMeshPro)
    │   └── HealthUnit (Text - TextMeshPro)
    ├── Status Group
    │   ├── StatusLabel (Text - TextMeshPro)
    │   └── StatusValue (Text - TextMeshPro)
    ├── Anomaly Group
    │   ├── AnomalyLabel (Text - TextMeshPro)
    │   ├── AnomalyValue (Text - TextMeshPro)
    │   ├── AnomalyScoreLabel (Text - TextMeshPro)
    │   └── AnomalyScoreValue (Text - TextMeshPro)
    ├── Maintenance Group
    │   ├── MaintenanceLabel (Text - TextMeshPro)
    │   ├── MaintenanceValue (Text - TextMeshPro)
    │   ├── MaintenancePriorityLabel (Text - TextMeshPro)
    │   └── MaintenancePriorityValue (Text - TextMeshPro)
    └── Timestamp Group
        ├── SensorTimestampLabel (Text - TextMeshPro)
        └── SensorTimestampValue (Text - TextMeshPro)
```

**How to create TextMeshPro text:**
1. Right-click in Hierarchy under SensorPanel
2. Select `UI > Text - TextMeshPro`
3. Position and size as needed
4. Set font size, alignment, and colors

### 3.3 Create Electrical Panel

Create a separate panel for electrical data:

```
Canvas
└── ElectricalPanel (Panel)
    ├── Voltage Group
    │   ├── VoltageLabel (Text - TextMeshPro)
    │   ├── VoltageValue (Text - TextMeshPro)
    │   └── VoltageUnit (Text - TextMeshPro)
    ├── Current Group
    │   ├── CurrentLabel (Text - TextMeshPro)
    │   ├── CurrentValue (Text - TextMeshPro)
    │   └── CurrentUnit (Text - TextMeshPro)
    ├── Power Group
    │   ├── PowerLabel (Text - TextMeshPro)
    │   ├── PowerValue (Text - TextMeshPro)
    │   └── PowerUnit (Text - TextMeshPro)
    ├── Power Factor Group
    │   ├── PowerFactorLabel (Text - TextMeshPro)
    │   └── PowerFactorValue (Text - TextMeshPro)
    ├── Stage Group
    │   ├── StageLabel (Text - TextMeshPro)
    │   └── StageValue (Text - TextMeshPro)
    ├── Time Group
    │   ├── TimeLabel (Text - TextMeshPro)
    │   ├── TimeValue (Text - TextMeshPro)
    │   └── TimeUnit (Text - TextMeshPro)
    └── Timestamp Group
        ├── ElectricalTimestampLabel (Text - TextMeshPro)
        └── ElectricalTimestampValue (Text - TextMeshPro)
```

### 3.4 Create Controls Panel

Create a panel for playback controls:

```
Canvas
└── ControlsPanel (Panel)
    ├── PlayButton (Button)
    ├── PauseButton (Button)
    ├── ResetButton (Button)
    ├── SpeedSlider (Slider)
    │   ├── Background
    │   ├── Fill Area
    │   └── Handle Slide Area
    ├── SpeedText (Text - TextMeshPro)
    ├── ProgressSlider (Slider)
    │   ├── Background
    │   ├── Fill Area
    │   └── Handle Slide Area
    ├── ProgressText (Text - TextMeshPro)
    └── LoopToggle (Toggle)
```

**How to create buttons:**
1. Right-click in Hierarchy under ControlsPanel
2. Select `UI > Button - TextMeshPro`
3. Set button text (Play, Pause, Reset)

**How to create sliders:**
1. Right-click in Hierarchy under ControlsPanel
2. Select `UI > Slider - TextMeshPro`
3. Configure min/max values in Inspector

**How to create toggle:**
1. Right-click in Hierarchy under ControlsPanel
2. Select `UI > Toggle - TextMeshPro`
3. Set label text (Loop)

---

## Step 4: Attach Scripts to GameObjects

### 4.1 Create Data Reader GameObjects

Create empty GameObjects for the data readers:

1. Right-click in Hierarchy
2. Select `Create Empty`
3. Name it `SensorDataReader`
4. With `SensorDataReader` selected, click `Add Component` in Inspector
5. Search for and add `SensorDataReader`
6. Repeat for `ElectricalDataReader`

**SensorDataReader Inspector Settings:**
- CSV Filename: `unity_sensor_playback.csv`
- Playback Interval: `0.5`
- Auto Play: `true`
- Loop Playback: `true`
- Debug Log: `false` (set to `true` for troubleshooting)

**ElectricalDataReader Inspector Settings:**
- CSV Filename: `unity_electrical_playback.csv`
- Playback Interval: `0.25`
- Auto Play: `true`
- Loop Playback: `true`
- Debug Log: `false` (set to `true` for troubleshooting)

### 4.2 Attach DashboardManager

Attach the DashboardManager to update UI:

1. Select your Canvas (or create a new empty GameObject named `DashboardManager`)
2. Click `Add Component` in Inspector
3. Search for and add `DashboardManager`

**DashboardManager Inspector Assignments:**

**Data Readers:**
- Sensor Reader: Drag the `SensorDataReader` GameObject here
- Electrical Reader: Drag the `ElectricalDataReader` GameObject here

**Sensor UI:**
- Vibration Label: Drag the VibrationLabel TextMeshPro
- Vibration Value: Drag the VibrationValue TextMeshPro
- Vibration Unit: Drag the VibrationUnit TextMeshPro
- Health Score Label: Drag the HealthLabel TextMeshPro
- Health Score Value: Drag the HealthValue TextMeshPro
- Health Score Unit: Drag the HealthUnit TextMeshPro
- Status Label: Drag the StatusLabel TextMeshPro
- Status Value: Drag the StatusValue TextMeshPro
- Anomaly Label: Drag the AnomalyLabel TextMeshPro
- Anomaly Value: Drag the AnomalyValue TextMeshPro
- Anomaly Score Label: Drag the AnomalyScoreLabel TextMeshPro
- Anomaly Score Value: Drag the AnomalyScoreValue TextMeshPro
- Maintenance Label: Drag the MaintenanceLabel TextMeshPro
- Maintenance Value: Drag the MaintenanceValue TextMeshPro
- Maintenance Priority Label: Drag the MaintenancePriorityLabel TextMeshPro
- Maintenance Priority Value: Drag the MaintenancePriorityValue TextMeshPro
- Sensor Timestamp Label: Drag the SensorTimestampLabel TextMeshPro
- Sensor Timestamp Value: Drag the SensorTimestampValue TextMeshPro

**Electrical UI:**
- Voltage Label: Drag the VoltageLabel TextMeshPro
- Voltage Value: Drag the VoltageValue TextMeshPro
- Voltage Unit: Drag the VoltageUnit TextMeshPro
- Current Label: Drag the CurrentLabel TextMeshPro
- Current Value: Drag the CurrentValue TextMeshPro
- Current Unit: Drag the CurrentUnit TextMeshPro
- Power Label: Drag the PowerLabel TextMeshPro
- Power Value: Drag the PowerValue TextMeshPro
- Power Unit: Drag the PowerUnit TextMeshPro
- Power Factor Label: Drag the PowerFactorLabel TextMeshPro
- Power Factor Value: Drag the PowerFactorValue TextMeshPro
- Stage Label: Drag the StageLabel TextMeshPro
- Stage Value: Drag the StageValue TextMeshPro
- Time Label: Drag the TimeLabel TextMeshPro
- Time Value: Drag the TimeValue TextMeshPro
- Time Unit: Drag the TimeUnit TextMeshPro
- Electrical Timestamp Label: Drag the ElectricalTimestampLabel TextMeshPro
- Electrical Timestamp Value: Drag the ElectricalTimestampValue TextMeshPro

**Status Indicators (Optional):**
- Anomaly Indicator: Drag a GameObject (e.g., a red warning icon) to enable when anomaly detected
- Maintenance Indicator: Drag a GameObject to enable when maintenance required

**Color Settings:**
- Normal Health Color: Green (default)
- Warning Health Color: Yellow (default)
- Abnormal Health Color: Red (default)

**Update Settings:**
- Update Frequency: `1` (update every frame, increase to reduce UI updates)

### 4.3 Attach PlaybackController

Attach the PlaybackController for playback controls:

1. Select your Canvas (or create a new empty GameObject named `PlaybackController`)
2. Click `Add Component` in Inspector
3. Search for and add `PlaybackController`

**PlaybackController Inspector Assignments:**

**Data Readers:**
- Sensor Reader: Drag the `SensorDataReader` GameObject here
- Electrical Reader: Drag the `ElectricalDataReader` GameObject here

**Playback Buttons:**
- Play Button: Drag the PlayButton
- Pause Button: Drag the PauseButton
- Reset Button: Drag the ResetButton

**Speed Control:**
- Speed Slider: Drag the SpeedSlider
- Speed Text: Drag the SpeedText TextMeshPro

**Progress Display:**
- Progress Slider: Drag the ProgressSlider
- Progress Text: Drag the ProgressText TextMeshPro

**Loop Toggle:**
- Loop Toggle: Drag the LoopToggle

**Settings:**
- Min Speed: `0.1`
- Max Speed: `5.0`
- Default Speed: `1.0`
- Auto Start: `false` (or `true` to auto-start on scene load)

---

## Step 5: Final Scene Hierarchy Example

Your final Hierarchy should look something like this:

```
Scene
├── Main Camera
├── Directional Light
├── Canvas
│   ├── SensorPanel
│   │   ├── VibrationLabel (TMP)
│   │   ├── VibrationValue (TMP)
│   │   ├── VibrationUnit (TMP)
│   │   ├── HealthLabel (TMP)
│   │   ├── HealthValue (TMP)
│   │   ├── HealthUnit (TMP)
│   │   ├── StatusLabel (TMP)
│   │   ├── StatusValue (TMP)
│   │   ├── AnomalyLabel (TMP)
│   │   ├── AnomalyValue (TMP)
│   │   ├── AnomalyScoreLabel (TMP)
│   │   ├── AnomalyScoreValue (TMP)
│   │   ├── MaintenanceLabel (TMP)
│   │   ├── MaintenanceValue (TMP)
│   │   ├── MaintenancePriorityLabel (TMP)
│   │   ├── MaintenancePriorityValue (TMP)
│   │   ├── SensorTimestampLabel (TMP)
│   │   └── SensorTimestampValue (TMP)
│   ├── ElectricalPanel
│   │   ├── VoltageLabel (TMP)
│   │   ├── VoltageValue (TMP)
│   │   ├── VoltageUnit (TMP)
│   │   ├── CurrentLabel (TMP)
│   │   ├── CurrentValue (TMP)
│   │   ├── CurrentUnit (TMP)
│   │   ├── PowerLabel (TMP)
│   │   ├── PowerValue (TMP)
│   │   ├── PowerUnit (TMP)
│   │   ├── PowerFactorLabel (TMP)
│   │   ├── PowerFactorValue (TMP)
│   │   ├── StageLabel (TMP)
│   │   ├── StageValue (TMP)
│   │   ├── TimeLabel (TMP)
│   │   ├── TimeValue (TMP)
│   │   ├── TimeUnit (TMP)
│   │   ├── ElectricalTimestampLabel (TMP)
│   │   └── ElectricalTimestampValue (TMP)
│   ├── ControlsPanel
│   │   ├── PlayButton
│   │   ├── PauseButton
│   │   ├── ResetButton
│   │   ├── SpeedSlider
│   │   ├── SpeedText (TMP)
│   │   ├── ProgressSlider
│   │   ├── ProgressText (TMP)
│   │   └── LoopToggle
│   ├── DashboardManager (Script)
│   └── PlaybackController (Script)
├── SensorDataReader (Empty GameObject)
│   └── SensorDataReader (Script)
└── ElectricalDataReader (Empty GameObject)
    └── ElectricalDataReader (Script)
```

---

## Step 6: Test the Setup

1. Save your scene
2. Press Play in Unity
3. Check the Console for any errors
4. Verify:
   - UI values start updating
   - Play/Pause/Reset buttons work
   - Speed slider changes playback rate
   - Progress slider shows current position
   - Health score colors change based on value
   - Anomaly indicator appears when anomaly detected

**Expected Console Output:**
```
[SensorDataReader] Loaded 885 sensor data rows from unity_sensor_playback.csv
[ElectricalDataReader] Loaded 10861 electrical data rows from unity_electrical_playback.csv
[PlaybackController] Initialized successfully
```

---

## Troubleshooting

### Issue: "CSV file not found" error

**Solution:**
- Verify CSV files are in `Assets/StreamingAssets/`
- Check filename spelling matches exactly (case-sensitive on some platforms)
- Rebuild Unity project after adding files (Assets > Rebuild All)

### Issue: UI not updating

**Solution:**
- Verify DashboardManager script references are assigned in Inspector
- Check that sensorReader and electricalReader are not null
- Ensure both readers have `Auto Play = true` or press Play button
- Set `Debug Log = true` on readers to see if data is advancing

### Issue: Values showing as "--" or "N/A"

**Solution:**
- Check Console for CSV loading errors
- Verify CSV files are not corrupted
- Ensure column count matches expected (8 columns)
- Try setting `Debug Log = true` on readers

### Issue: Compilation errors about TextMeshPro

**Solution:**
- Install TextMeshPro: `Window > TextMeshPro > Import TMP Essentials`
- Or use Unity UI (Text) instead and remove `using TMPro;` from scripts

### Issue: Buttons not responding

**Solution:**
- Verify button event listeners are wired (check Inspector > Button > On Click)
- Ensure PlaybackController script is attached and references are assigned
- Check that buttons have `Interactable = true`

### Issue: Playback too fast/slow

**Solution:**
- Adjust `Playback Interval` on SensorDataReader and ElectricalDataReader
- Use Speed Slider to adjust speed multiplier
- Sensor default: 0.5s per row
- Electrical default: 0.25s per row (matches 4 Hz sample rate)

---

## Customization Tips

### Hide Temperature/Humidity Fields

Temperature and humidity are not available in the dataset. Do not create UI elements for them. The scripts do not include these fields.

### Adjust UI Update Frequency

If UI updates are causing performance issues:
- Set `Update Frequency` on DashboardManager to `5` or `10` (update every N frames)
- This reduces UI update rate while keeping data playback smooth

### Change Color Scheme

Modify color settings in DashboardManager Inspector:
- Normal Health Color: Change from green to your preferred color
- Warning Health Color: Change from yellow to your preferred color
- Abnormal Health Color: Change from red to your preferred color

### Add Custom Indicators

Use the Status Indicators in DashboardManager:
- Create visual GameObjects (e.g., warning lights, icons)
- Assign them to Anomaly Indicator and Maintenance Indicator
- They will automatically enable/disable based on data

### Modify Playback Behavior

In PlaybackController Inspector:
- Disable looping by unchecking Loop Toggle
- Change speed range by adjusting Min Speed and Max Speed
- Set Auto Start to true to begin playback on scene load

---

## Performance Considerations

- CSV files are small (sensor: ~100KB, electrical: ~500KB)
- Loading is fast (single operation at Awake)
- Playback is lightweight (simple UI updates)
- No performance issues expected for typical Unity projects
- If you have performance issues, increase `Update Frequency` on DashboardManager

---

## Data Limitations

**Important Notes:**
- Temperature and humidity are NOT AVAILABLE (do not display)
- Sensor and electrical data have different timestamps (cannot be synchronized)
- Data is window-level aggregated, not raw sensor readings
- Timestamps reflect original recording time (historical data)
- This is for playback/simulation, not real-time monitoring

These limitations are documented in `unity_data_schema.json` and `unity_data/README.md`.

---

## Next Steps

1. Test the basic setup as described above
2. Customize UI layout and styling to match your digital twin aesthetic
3. Integrate with your 3D printer FBX model
4. Add visual feedback (e.g., change model color based on health score)
5. Add sound effects for anomalies or maintenance alerts
6. Consider adding a timeline visualization

---

## Support

For issues:
1. Check Console for error messages
2. Verify all Inspector references are assigned
3. Ensure CSV files are in StreamingAssets
4. Review this guide's Troubleshooting section
5. Enable Debug Log on readers for detailed information

---

## Summary

You now have:
- ✅ Four complete C# scripts for Unity 6.3 LTS
- ✅ Robust CSV parsing with error handling
- ✅ Comprehensive UI update system
- ✅ Full playback control (Play, Pause, Reset, Speed)
- ✅ Clear setup instructions
- ✅ Troubleshooting guide

Your 3D printer digital twin can now display simulated sensor readings by replaying the processed historical data in Unity.
