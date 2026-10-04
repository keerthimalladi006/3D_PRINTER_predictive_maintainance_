# Project Summary
## Agentic AI-Driven Digital Twin for Predictive Maintenance of a 3D Printer

---

## Project Overview

This project implements a backend system for predictive maintenance of an FDM 3D printer using sensor data analysis, anomaly detection, and health monitoring. The system processes vibration and electrical sensor data to identify abnormal machine behavior and provide maintenance recommendations.

---

## Completed Tasks

### ✓ TASK 1: Dataset Audit
**File**: `DATASET_AUDIT.md`

Comprehensive analysis of 19 dataset files:
- **Vibration Data**: 4 files with 6-axis IMU measurements (accelerometer + gyroscope)
- **Electrical Data**: 11 files with power/current/voltage measurements
- **Experimental Metadata**: 2 files with experimental parameters

**Key Findings**:
- Primary vibration dataset: SensorDataFile.csv (7,967 samples, binary labels)
- Electrical dataset: 3D_Printing_Stages_Run_06_Beckhoff.csv (10,861 samples, 3-class labels)
- RUL dataset excluded due to missing metadata
- GitHub dataset excluded due to incompatibility

**Critical Finding**: Label semantics NOT verified from source. All interpretations are inferred.

---

### ✓ TASK 2: Sensor Data Analysis
**File**: `sensor_analysis.py` → `sensor_analysis_report.json`

Statistical analysis of acceleration and gyroscope signals:

**Key Results**:
- Ax: Mean 0.52 m/s², RMS 1.57 m/s², Kurtosis 39.8
- Ay: Mean 0.39 m/s², RMS 0.72 m/s², Kurtosis 161.4
- Az: Mean 9.70 m/s², RMS 9.79 m/s², Kurtosis 69.3
- Label 1 vs Label 0: Small effect sizes (Cohen's d < 0.2 for all signals)

**Conclusion**: Provided labels show minimal statistical difference between classes. Labels may not represent meaningful fault states.

---

### ✓ TASK 3: Time/Sampling Analysis
**File**: `time_sampling_analysis.py` → `time_sampling_report.json`

Sampling characteristics:

**Vibration Data**:
- Sampling rate: ~4.7 Hz (irregular)
- Duration: ~28 minutes
- Issues: Duplicate timestamps detected
- **Limitation**: Too slow for meaningful FFT analysis

**Electrical Data**:
- Sampling rate: 4 Hz (uniform, 250ms intervals)
- Duration: 45.2 minutes
- No issues

**Conclusion**: Frequency-domain features not appropriate for vibration data. Time-domain features only.

---

### ✓ TASK 4: Feature Pipeline
**File**: `feature_extraction.py`

Reproducible time-domain feature extraction:

**Windowing**: 2-second windows (~9-10 samples per window)
**Justification**: Provides enough samples for statistical features while maintaining temporal resolution.

**Features per Window** (97 total):
- Acceleration (Ax, Ay, Az): 13 features each (mean, std, rms, peak, peak-to-peak, kurtosis, skewness, median, q25, q75, crest factor, shape factor, impulse factor)
- Gyroscope (Gx, Gy, Gz): 13 features each
- Combined acceleration magnitude: 13 features

**Output Files**:
- `data/processed/sensor_data_features.csv` (885 windows)
- `data/processed/benchydefect_features.csv` (566 windows)
- `data/processed/normalbenchy_features.csv` (888 windows)

---

### ✓ TASK 5: Health/Anomaly Pipeline
**File**: `health_anomaly_pipeline.py`

Condition analysis using two methods:

**1. Statistical Baseline**:
- Calculated from label=0 windows (normal operation)
- Includes mean, std, percentiles for all features
- Threshold-based anomaly detection (3 std from mean)

**2. Isolation Forest**:
- Unsupervised anomaly detection
- Trained on normal data, 5% contamination
- Returns anomaly scores and flags

**3. Health Indicator**:
- Calculated as deviation from baseline
- Range: 0-100% (higher = healthier)
- Condition states: NORMAL (≥80%), WARNING (50-80%), ABNORMAL (<50%)

**Results**:
- Health score: Mean 77.7%, Std 8.8%
- Condition distribution: NORMAL 473, WARNING 391, ABNORMAL 21
- Statistical anomalies: 220 (24.9%)
- Isolation Forest anomalies: 55 (6.2%)
- Label 1 average health: 64.7% vs Label 0: 78.2%

**Output File**: `data/processed/sensor_data_with_health_anomaly.csv`

---

### ✓ TASK 6: Electrical Data Analysis
**File**: `electrical_analysis.py`

Analysis of Beckhoff power/current/voltage data:

**Results**:
- Duration: 2,715 seconds (45.2 minutes)
- Sampling: 4 Hz (uniform)
- Active power: Mean 90.47 W, Std 67.34 W
- Current: Mean 0.5184 A, Std 0.2989 A
- Voltage: Mean 232.63 V, Std 0.07 V

**Power by Label**:
- Label 0: 7.63 W (idle/low power)
- Label 1: 238.46 W (high power)
- Label 2: 120.56 W (active printing)

**Synchronization Decision**: NOT POSSIBLE with vibration data due to different sampling rates and lack of common timestamp.

**Output File**: `data/processed/electrical_context.csv`

---

### ✓ TASK 7: GitHub Dataset Analysis
**File**: `GITHUB_DATASET_ANALYSIS.md`

Analysis of Zenodo dataset "Federated learning dataset: A case study of vibration analysis for desktop 3D printers":

**Dataset Characteristics**:
- 6 printers, accelerometer-only
- LabVIEW Measurement files
- Air-printing (no filament)
- No wear state labels
- Purpose: Federated learning

**Compatibility Assessment**: NOT COMPATIBLE
- Different sensor configuration (accelerometer vs 6-axis IMU)
- Different file format (LabVIEW vs CSV)
- No labels for supervised learning
- Different use case (federated learning vs condition monitoring)

**Decision**: EXCLUDE from project. Sir-provided dataset is better suited for current research objective.

---

### ✓ TASK 8: Derived Data Files
**File**: `DERIVED_DATA_DOCUMENTATION.md`

Comprehensive documentation of all processed data files:

**Files Created**:
1. `sensor_data_features.csv` - Windowed vibration features (885 windows, 97 columns)
2. `benchydefect_features.csv` - Defective print features (566 windows)
3. `normalbenchy_features.csv` - Normal print features (888 windows)
4. `sensor_data_with_health_anomaly.csv` - Features + health + anomalies (885 windows)
5. `electrical_context.csv` - Electrical power context (10,861 samples)
6. `statistical_baseline.json` - Normal operation baseline
7. `feature_extraction_metadata.json` - Extraction metadata
8. `electrical_analysis_report.json` - Electrical analysis results

**Purpose**: All files documented with columns, transformations, and use cases.

---

### ✓ TASK 9: Backend API
**Files**: `backend/app.py`, `backend/services/data_service.py`

Flask-based REST API with service layer architecture:

**Architecture**:
- Service layer (`data_service.py`): Data access and processing logic
- API layer (`app.py`): RESTful endpoints and request handling
- Separation of concerns for maintainability

**Endpoints**:
- `GET /api/ping` - API health check
- `GET /api/machine-status` - Combined health + electrical status
- `GET /api/vibration` - Vibration features
- `GET /api/health` - Health indicator data
- `GET /api/anomalies` - Detected anomalies
- `GET /api/maintenance` - Maintenance recommendations
- `GET /api/electrical` - Electrical context

**Features**:
- CORS enabled for frontend access
- Query parameters for filtering
- Error handling (400, 404, 500)
- JSON responses with consistent structure

---

### ✓ TASK 10: API Documentation
**File**: `API_DOCUMENTATION.md`

Complete API contract documentation:

**Contents**:
- Endpoint descriptions and parameters
- Response schemas with field descriptions
- Usage examples (Python and JavaScript)
- Error response formats
- Data source information
- Research limitations
- Installation and running instructions

**Response Schemas Documented**:
- MachineStatus
- VibrationFeature
- HealthPoint
- AnomalyEvent
- MaintenanceRecommendation
- ElectricalContext

---

## System Architecture

```
Raw Datasets (CSV/XLSX)
    ↓
Data Processing Pipeline
    ├─ Feature Extraction (2s windows, time-domain features)
    ├─ Health/Anomaly Detection (statistical + Isolation Forest)
    └─ Electrical Processing (derived metrics)
    ↓
Processed Data Files (CSV/JSON)
    ↓
Service Layer (data_service.py)
    ↓
API Layer (app.py)
    ↓
Frontend (React - to be generated separately)
```

---

## Research Scope (Aligned with Data)

### What the System CAN Do:
1. **Condition Classification**: Binary classification of normal/abnormal states
2. **Anomaly Detection**: Statistical threshold and Isolation Forest methods
3. **Health Monitoring**: Deviation-based health indicator (0-100%)
4. **Operating Context**: Electrical power consumption and stage labels
5. **Maintenance Recommendations**: Rule-based recommendations based on health state

### What the System CANNOT Do (Acknowledged Limitations):
1. **Wear Prediction**: No degradation data or time-series wear labels
2. **RUL Prediction**: No remaining useful life information
3. **Fault Identification**: Labels do not specify fault types
4. **Frequency Analysis**: Sampling rate too low for meaningful FFT
5. **Lifecycle Analysis**: Data spans only ~28 minutes, not full lifecycle
6. **Sensor Fusion**: Vibration and electrical data cannot be synchronized

---

## Important Research Notes

### Label Semantics
**NOT VERIFIED FROM SOURCE**
- Binary labels (0/1): Inferred as normal/abnormal
- Multi-class labels (0/1/2): Inferred as printing stages
- All results presented as "condition classification"
- No claims about specific fault identification

### Health Indicator Definition
- Based on statistical deviation from normal baseline
- Not a physical wear measurement
- Indicates condition relative to established baseline
- Range: 0-100% (higher = healthier)
- Calculation: Average of (1 - normalized deviation/3) across features

### Sampling Rate Limitations
- Vibration data: ~4.7 Hz (irregular)
- Electrical data: 4 Hz (uniform)
- **Implication**: Frequency-domain analysis (FFT) is not appropriate
- Time-domain features only are scientifically justified

### Data Synchronization
- Vibration and electrical data **CANNOT** be synchronized
- Different sampling rates, timestamp formats, lack of common reference
- Kept as separate context datasets in the API

---

## Project Structure

```
D:\3d_printer_predictive_maintanance\
├── dataset/                          # Raw datasets
│   ├── SensorDataFile.csv
│   ├── benchydefect.csv
│   ├── normalbenchy.csv
│   ├── 3D_Printing_Stages_Run_06_Beckhoff.csv
│   └── ... (other files)
├── data/
│   └── processed/                   # Processed data files
│       ├── sensor_data_features.csv
│       ├── benchydefect_features.csv
│       ├── normalbenchy_features.csv
│       ├── sensor_data_with_health_anomaly.csv
│       ├── electrical_context.csv
│       ├── statistical_baseline.json
│       ├── feature_extraction_metadata.json
│       └── electrical_analysis_report.json
├── backend/
│   ├── app.py                       # Flask API
│   ├── requirements.txt
│   └── services/
│       ├── __init__.py
│       └── data_service.py          # Data service layer
├── dataset_audit.py                 # Dataset audit script
├── sensor_analysis.py               # Sensor analysis script
├── time_sampling_analysis.py       # Time/sampling analysis script
├── feature_extraction.py            # Feature extraction script
├── health_anomaly_pipeline.py      # Health/anomaly detection script
├── electrical_analysis.py           # Electrical analysis script
├── DATASET_AUDIT.md                 # Dataset audit documentation
├── GITHUB_DATASET_ANALYSIS.md       # GitHub dataset analysis
├── DERIVED_DATA_DOCUMENTATION.md    # Derived data documentation
├── API_DOCUMENTATION.md             # API contract documentation
└── PROJECT_SUMMARY.md               # This file
```

---

## Running the System

### 1. Data Processing (One-time setup)
```bash
# Extract features
python feature_extraction.py

# Run health/anomaly detection
python health_anomaly_pipeline.py

# Process electrical data
python electrical_analysis.py
```

### 2. Start Backend API
```bash
cd backend
pip install -r requirements.txt
python app.py
```

API will be available at `http://localhost:5000`

### 3. Test API
```bash
curl http://localhost:5000/api/ping
curl http://localhost:5000/api/machine-status
curl http://localhost:5000/api/health
curl http://localhost:5000/api/anomalies
curl http://localhost:5000/api/maintenance
curl http://localhost:5000/api/electrical
```

---

## Frontend Integration

The frontend (to be generated separately in Bolt) should:

1. **Fetch data from API endpoints** using the documented schemas
2. **Display health indicators** with visual gauges or charts
3. **Show anomaly events** with timestamps and severity
4. **Visualize vibration features** over time
5. **Display electrical context** (power consumption, stages)
6. **Present maintenance recommendations** with priority levels

**Important**: Frontend should not need to know internal CSV file organization. All data accessed through API endpoints.

---

## Research Integrity

### What Was NOT Done:
1. No label fabrication or inference presented as fact
2. No wear states or RUL values invented
3. No health scores based on non-existent physical measurements
4. No frequency-domain features (FFT) added inappropriately
5. No false claims about fault identification capabilities
6. No dataset merging without justification

### What Was Done:
1. Rigorous dataset audit with documented limitations
2. Time-domain features justified by actual sampling rate
3. Health indicator based on measurable statistical deviation
4. Clear distinction between classification, anomaly detection, and degradation estimation
5. All limitations explicitly stated
6. GitHub dataset rejected due to documented incompatibility

---

## Next Steps for Frontend Development

When generating the React frontend in Bolt:

1. **Use the API endpoints** documented in `API_DOCUMENTATION.md`
2. **Follow the response schemas** for type safety
3. **Handle the research limitations** in UI (e.g., show "condition classification" not "fault diagnosis")
4. **Display health scores** with appropriate context (deviation-based, not physical wear)
5. **Show electrical data** as separate context (not synchronized with vibration)
6. **Implement error handling** for API failures
7. **Add loading states** for async data fetching

---

## Conclusion

This project provides a research-grade backend system for 3D printer predictive maintenance that:

1. **Respects data limitations**: Only claims capabilities supported by actual data
2. **Maintains research integrity**: No fabrication of labels, wear states, or RUL
3. **Uses appropriate methods**: Time-domain features justified by sampling rate
4. **Provides clear documentation**: All decisions, limitations, and assumptions documented
5. **Enables frontend integration**: Stable API contracts with documented schemas
6. **Supports digital twin concept**: Health monitoring and anomaly detection as foundation

The system is ready for frontend development and provides a solid foundation for the "Agentic AI-Driven Digital Twin" concept, with clear boundaries around what can and cannot be claimed given the available data.
