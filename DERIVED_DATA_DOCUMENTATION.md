# Derived Data Files Documentation

Generated: 2026-10-04
Location: `D:\3d_printer_predictive_maintanance\data\processed\`

---

## Overview

This directory contains processed data files generated from the raw sensor datasets. These files are ready for consumption by the backend API and frontend visualization.

---

## File: sensor_data_features.csv

### Purpose
Windowed time-domain features extracted from SensorDataFile.csv for machine learning and health analysis.

### Source Dataset
- `dataset/SensorDataFile.csv` (7,967 raw samples)

### Transformation Logic
1. **Windowing**: 2-second windows (~9-10 samples per window)
2. **Sampling Rate**: 4.7 Hz (approximate)
3. **Feature Extraction**: Time-domain statistical features per window

### Columns (97 total)

#### Metadata Columns
- `window_index`: Sequential window number (0-884)
- `window_start`: Starting sample index in raw data
- `window_end`: Ending sample index in raw data
- `window_size`: Number of samples in window
- `timestamp`: Window start timestamp (ISO format)
- `label`: Majority label in window (0 or 1)

#### Acceleration Features (Ax, Ay, Az)
For each axis:
- `{axis}_mean`: Mean acceleration (m/s²)
- `{axis}_std`: Standard deviation (m/s²)
- `{axis}_rms`: Root mean square (m/s²)
- `{axis}_peak`: Peak absolute value (m/s²)
- `{axis}_peak_to_peak`: Peak-to-peak range (m/s²)
- `{axis}_kurtosis`: Kurtosis (dimensionless)
- `{axis}_skewness`: Skewness (dimensionless)
- `{axis}_median`: Median (m/s²)
- `{axis}_q25`: 25th percentile (m/s²)
- `{axis}_q75`: 75th percentile (m/s²)
- `{axis}_crest_factor`: Peak/RMS ratio (dimensionless)
- `{axis}_shape_factor`: RMS/Mean ratio (dimensionless)
- `{axis}_impulse_factor`: Peak/Mean ratio (dimensionless)

#### Gyroscope Features (Gx, Gy, Gz)
Same 13 features as acceleration, units in deg/s.

#### Combined Acceleration Features
- `combined_acceleration_*`: Same 13 features for magnitude vector √(Ax² + Ay² + Az²)

### Row Count
885 windows

### Use Case
Primary feature dataset for:
- Health indicator calculation
- Anomaly detection
- Condition classification
- Machine learning model training

---

## File: benchydefect_features.csv

### Purpose
Windowed features from benchydefect.csv (defective print).

### Source Dataset
- `dataset/benchydefect.csv` (5,088 raw samples)

### Transformation Logic
Same as sensor_data_features.csv (2-second windows, 4.7 Hz sampling).

### Columns
Identical to sensor_data_features.csv (97 columns).

### Row Count
566 windows

### Use Case
Additional labeled data for defect detection analysis.

---

## File: normalbenchy_features.csv

### Purpose
Windowed features from normalbenchy.csv (normal print).

### Source Dataset
- `dataset/normalbenchy.csv` (7,987 raw samples)

### Transformation Logic
Same as sensor_data_features.csv (2-second windows, 4.7 Hz sampling).

### Columns
Identical to sensor_data_features.csv (97 columns).

### Row Count
888 windows

### Special Note
All samples have label=0 (normal operation).

### Use Case
Normal baseline data for anomaly detection and health baseline establishment.

---

## File: sensor_data_with_health_anomaly.csv

### Purpose
Sensor features with health indicators and anomaly detection results.

### Source Dataset
- `data/processed/sensor_data_features.csv`

### Transformation Logic
1. **Statistical Baseline**: Calculated from label=0 windows (normal operation)
2. **Health Indicator**: Deviation-based score (0-100%)
3. **Anomaly Detection**: Two methods applied
   - Statistical threshold (3 std from mean)
   - Isolation Forest (5% contamination)

### Additional Columns (beyond feature columns)

#### Health Indicator
- `health_score`: Overall health percentage (0-100%)
  - 100% = perfectly normal (all features within 1 std of baseline)
  - 0% = highly degraded (features far from baseline)
  - Calculation: Average of (1 - normalized deviation/3) across features

- `condition_state`: Categorical condition
  - NORMAL: health_score >= 80%
  - WARNING: 50% <= health_score < 80%
  - ABNORMAL: health_score < 50%

#### Statistical Anomaly Detection
- `statistical_anomaly_score`: Maximum z-score across features
- `statistical_is_anomaly`: Boolean flag (True if score > 3.0)

#### Isolation Forest Anomaly Detection
- `isolation_forest_prediction`: Prediction (-1 = anomaly, 1 = normal)
- `isolation_forest_anomaly_score`: Anomaly score (higher = more anomalous)
- `isolation_forest_is_anomaly`: Boolean flag (True if prediction = -1)

### Row Count
885 windows

### Use Case
Primary dataset for backend API health and anomaly endpoints.

---

## File: electrical_context.csv

### Purpose
Electrical power data with operating context and stage labels.

### Source Dataset
- `dataset/3D_Printing_Stages_Run_06_Beckhoff.csv` (10,861 samples)

### Transformation Logic
1. **Timestamp Conversion**: Added readable datetime from time_sec
2. **Derived Metrics**: Calculated apparent power and power factor

### Columns
- `time_ms`: Time in milliseconds (0 to 2,715,000)
- `time_sec`: Time in seconds (0 to 2,715)
- `active_power`: Active power in watts
- `current`: Current in amperes
- `voltage`: Voltage in volts
- `label`: Stage label (0, 1, or 2)
- `timestamp_datetime`: ISO format timestamp
- `apparent_power`: Calculated (voltage × current) in VA
- `power_factor`: Calculated (active_power / apparent_power)

### Row Count
10,861 samples

### Sampling Rate
4 Hz (250ms uniform intervals)

### Duration
2,715 seconds (45.2 minutes)

### Label Distribution
- Label 0: 3,334 samples (7.63 W average)
- Label 1: 422 samples (238.46 W average)
- Label 2: 7,105 samples (120.56 W average)

### Use Case
Operating context data for backend API. Provides electrical power consumption and printing stage information.

**Note**: Cannot be synchronized with vibration data due to different sampling rates and lack of common timestamp reference.

---

## File: statistical_baseline.json

### Purpose
Statistical baseline calculated from normal operation data (label=0).

### Source Dataset
- Normal windows from sensor_data_features.csv (852 windows)

### Structure
JSON object with feature names as keys. Each feature contains:

```json
{
  "feature_name": {
    "mean": float,
    "std": float,
    "median": float,
    "q25": float,
    "q75": float,
    "min": float,
    "max": float,
    "lower_threshold": float,  // 2.5th percentile
    "upper_threshold": float   // 97.5th percentile
  }
}
```

### Features Included
All 91 numeric feature columns from sensor_data_features.csv (excluding metadata).

### Use Case
Reference baseline for:
- Health indicator calculation
- Statistical anomaly detection
- Deviation analysis

---

## File: feature_extraction_metadata.json

### Purpose
Metadata about the feature extraction process.

### Structure
```json
{
  "SensorDataFile.csv": {
    "windows": int,
    "features": int,
    "output": "path/to/output.csv"
  },
  ...
}
```

### Use Case
Documentation of feature extraction parameters and results.

---

## File: electrical_analysis_report.json

### Purpose
Detailed analysis of electrical data characteristics.

### Structure
```json
{
  "beckhoff_csv": {
    "filename": string,
    "samples": int,
    "columns": [string],
    "duration_seconds": float,
    "sampling_rate_hz": float,
    "label_distribution": dict,
    "by_label": {
      "label_X": {
        "count": int,
        "duration_seconds": float,
        "active_power": {stats},
        "current": {stats},
        "voltage": {stats}
      }
    }
  },
  "beckhoff_xlsx": {similar structure},
  "comparison": {...}
}
```

### Use Case
Documentation of electrical data analysis for research context.

---

## Data Relationships

```
Raw Sensor Data (CSV)
    ↓ Feature Extraction (2s windows, 4.7 Hz)
Feature CSVs (97 columns)
    ↓ Health/Anomaly Pipeline
Features with Health/Anomaly (additional columns)
    ↓ Backend API
JSON Responses to Frontend

Raw Electrical Data (CSV)
    ↓ Processing (timestamp, derived metrics)
Electrical Context CSV
    ↓ Backend API
JSON Responses to Frontend
```

---

## Important Notes

### Sampling Rate Limitations
- Vibration data: ~4.7 Hz (irregular)
- Electrical data: 4 Hz (uniform)
- **Implication**: Frequency-domain analysis (FFT) is not appropriate for vibration data due to low sampling rate. Time-domain features only.

### Label Semantics
- **NOT VERIFIED FROM SOURCE**
- Binary labels (0/1): Inferred as normal/abnormal
- Multi-class labels (0/1/2): Inferred as printing stages
- All results presented as "condition classification" without claiming specific fault identification

### Synchronization
- Vibration and electrical data **CANNOT** be synchronized
- Different sampling rates, timestamp formats, and lack of common reference
- Kept as separate context datasets in the API

### Health Indicator Definition
- Based on statistical deviation from normal baseline
- Not a physical wear measurement
- Indicates condition relative to established baseline
- Range: 0-100% (higher = healthier)

---

## API Usage

### Health Endpoint
Source: `sensor_data_with_health_anomaly.csv`
Returns: Health score, condition state, anomaly flags

### Anomaly Endpoint
Source: `sensor_data_with_health_anomaly.csv`
Returns: Anomaly scores, detection flags from both methods

### Vibration Endpoint
Source: `sensor_data_features.csv`
Returns: Windowed time-domain features

### Electrical Endpoint
Source: `electrical_context.csv`
Returns: Power consumption, current, voltage, stage labels

### Machine Status Endpoint
Combines data from:
- `sensor_data_with_health_anomaly.csv` (health, condition)
- `electrical_context.csv` (power context)
Returns: Comprehensive machine status

---

## File Sizes

- sensor_data_features.csv: ~2 MB
- benchydefect_features.csv: ~1.3 MB
- normalbenchy_features.csv: ~2 MB
- sensor_data_with_health_anomaly.csv: ~2.5 MB
- electrical_context.csv: ~1.5 MB
- statistical_baseline.json: ~50 KB
- feature_extraction_metadata.json: ~1 KB
- electrical_analysis_report.json: ~5 KB

---

## Regeneration

To regenerate these files, run in order:

1. `python feature_extraction.py` - Creates feature CSVs
2. `python health_anomaly_pipeline.py` - Adds health/anomaly data
3. `python electrical_analysis.py` - Creates electrical context

All scripts are idempotent and will overwrite existing files.
