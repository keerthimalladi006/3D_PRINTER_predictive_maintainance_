# Dataset Audit Report
## 3D Printer Predictive Maintenance Project

Generated: 2026-10-04

---

## Summary

The dataset contains 19 files comprising vibration/gyroscope sensor data, electrical power measurements, and experimental results. Files are categorized into three main groups:

1. **Vibration/Gyroscope Sensor Data** - 6 files with accelerometer and gyroscope measurements
2. **Electrical Power Data** - 11 files with power/current/voltage measurements
3. **Experimental Metadata** - 2 files with experimental parameters and results

---

## File-by-File Analysis

### VIBRATION / GYROSCOPE SENSOR DATA

#### 1. SensorDataFile.csv
- **File Type**: CSV
- **Rows**: 7,967
- **Columns**: 10
- **Columns**: Date, Time, Time (µs), Ax (m/s²), Ay (m/s²), Az (m/s²), Gx (deg/s), Gy (deg/s), Gz (deg/s), label
- **Data Types**: Object (timestamps), float64 (sensor values), int64 (label)
- **Missing Values**: None
- **Duplicate Rows**: 0
- **Label Distribution**: 0: 7,672 (96.3%), 1: 295 (3.7%)
- **Label Semantics**: NOT VERIFIED FROM SOURCE. Inference: Binary classification (normal/abnormal)
- **Timestamp Structure**: Date (YY:MM:DD), Time (HH:MM:SS), microseconds
- **Sampling**: Single date (05-12-22), 1,681 unique time values over ~28 minutes
- **Units**: Acceleration in m/s², Gyroscope in deg/s
- **Purpose**: Primary vibration dataset with binary labels
- **Use in Project**: YES - Primary dataset for condition classification
- **Reason**: Contains labeled vibration data with acceleration and gyroscope measurements

#### 2. Gyroscope_SensorDataFile.csv
- **File Type**: CSV
- **Rows**: 1,870
- **Columns**: 9
- **Columns**: Date, Time, Time (µs), Ax (m/s²), Ay (m/s²), Az (m/s²), Gx (deg/s), Gy (deg/s), Gz (deg/s)
- **Data Types**: Object (timestamps), float64 (sensor values)
- **Missing Values**: None
- **Duplicate Rows**: 0
- **Label Distribution**: No label column
- **Timestamp Structure**: Date (MM/DD/YYYY), Time (HH:MM:SS), microseconds
- **Sampling**: Single date (3/15/2022), 398 unique time values over ~7 minutes
- **Units**: Acceleration in m/s², Gyroscope in deg/s
- **Purpose**: Unlabeled vibration/gyroscope dataset
- **Use in Project**: POSSIBLY - for anomaly detection if labeled dataset insufficient
- **Reason**: Unlabeled data could support unsupervised learning, but small size (1,870 rows) limits utility

#### 3. benchydefect.csv
- **File Type**: CSV
- **Rows**: 5,088
- **Columns**: 10
- **Columns**: Date, Time, Time (µs), Ax (m/s²), Ay (m/s²), Az (m/s²), Gx (deg/s), Gy (deg/s), Gz (deg/s), label
- **Data Types**: Object (timestamps), float64 (sensor values), int64 (label)
- **Missing Values**: None
- **Duplicate Rows**: 0
- **Label Distribution**: 0: 4,600 (90.5%), 1: 488 (9.6%)
- **Label Semantics**: NOT VERIFIED FROM SOURCE. Inference: Binary classification (normal/defect)
- **Timestamp Structure**: Date (YY:MM:DD), Time (HH:MM:SS), microseconds
- **Sampling**: Single date (05-12-22), 1,080 unique time values over ~18 minutes
- **Units**: Acceleration in m/s², Gyroscope in deg/s
- **Purpose**: Labeled vibration dataset for "benchy" print with defects
- **Use in Project**: YES - Additional labeled data for classification
- **Reason**: Contains labeled vibration data, complements SensorDataFile.csv

#### 4. normalbenchy.csv
- **File Type**: CSV
- **Rows**: 7,987
- **Columns**: 10
- **Columns**: Date, Time, Time (µs), Ax (m/s²), Ay (m/s²), Az (m/s²), Gx (deg/s), Gy (deg/s), Gz (deg/s), label
- **Data Types**: Object (timestamps), float64 (sensor values), int64 (label)
- **Missing Values**: None
- **Duplicate Rows**: 0
- **Label Distribution**: 0: 7,987 (100%)
- **Label Semantics**: NOT VERIFIED FROM SOURCE. All samples labeled 0
- **Timestamp Structure**: Date (YY:MM:DD), Time (HH:MM:SS), microseconds
- **Sampling**: Single date (05-12-22), 1,681 unique time values over ~28 minutes
- **Units**: Acceleration in m/s², Gyroscope in deg/s
- **Purpose**: Normal "benchy" print vibration data
- **Use in Project**: YES - Normal baseline data
- **Reason**: Provides normal operation baseline (all label=0), useful for anomaly detection

---

### ELECTRICAL POWER DATA

#### 5. 3D_Printing_Stages.csv
- **File Type**: CSV
- **Rows**: 2,641
- **Columns**: 5
- **Columns**: Name, Out_Active_Power_Station_6, Out_Current_Station_6, Out_Voltage_Station_6, labels
- **Data Types**: Object (all columns initially - needs type conversion), float64 (labels)
- **Missing Values**: labels: 1
- **Duplicate Rows**: 0
- **Label Distribution**: 0: 1,009, 1: 310, 2: 1,321
- **Label Semantics**: NOT VERIFIED FROM SOURCE. Inference: Printing stages (idle/active/complete)
- **Timestamp Structure**: "Name" column appears to be milliseconds (0, 250, 500, ...)
- **Sampling**: 250ms intervals
- **Units**: Power (Watts - inferred), Current (Amperes - inferred), Voltage (Volts - inferred)
- **Purpose**: Electrical measurements with stage labels
- **Use in Project**: YES - Operating context data
- **Reason**: Provides electrical power context with multi-class labels

#### 6. 3D_Printing_Stages_Run_06_Beckhoff.csv
- **File Type**: CSV
- **Rows**: 10,861
- **Columns**: 6
- **Columns**: time_ms, time_sec, active_power, current, voltage, label
- **Data Types**: int64 (time_ms), float64 (time_sec, electrical), int64 (label)
- **Missing Values**: None
- **Duplicate Rows**: 0
- **Label Distribution**: 0: 3,334, 1: 422, 2: 7,105
- **Label Semantics**: NOT VERIFIED FROM SOURCE. Inference: Printing stages
- **Timestamp Structure**: time_ms (0 to 2,715,000), time_sec (0 to 2,715)
- **Sampling**: 250ms intervals (4 Hz)
- **Duration**: 2,715 seconds (~45 minutes)
- **Units**: Power (Watts), Current (Amperes), Voltage (Volts)
- **Purpose**: Run 06 electrical measurements with Beckhoff system
- **Use in Project**: YES - Detailed electrical context
- **Reason**: Well-structured electrical data with timestamps and labels

#### 7. Reference_Run_06_Beckhoff.xlsx
- **File Type**: XLSX
- **Rows**: 10,861
- **Columns**: 5
- **Columns**: Time in ms, Time in seconds, Active Power in watts, Current in amperes, Voltage in volts
- **Data Types**: int64 (time_ms), float64 (time_sec, electrical)
- **Missing Values**: None
- **Duplicate Rows**: 0
- **Label Distribution**: No label column
- **Timestamp Structure**: Time in ms (0 to 2,715,000), Time in seconds (0 to 2,715)
- **Sampling**: 250ms intervals (4 Hz)
- **Duration**: 2,715 seconds (~45 minutes)
- **Units**: Power (Watts), Current (Amperes), Voltage (Volts)
- **Purpose**: Reference electrical measurements for Run 06
- **Use in Project**: YES - Reference electrical data
- **Reason**: Clean reference data, matches Run 06 timing structure

#### 8. RUL_Prediction_Data_Nozzle.xlsx
- **File Type**: XLSX
- **Rows**: 410,062
- **Columns**: 5
- **Columns**: power, current, voltage, Unnamed: 3, 0 done
- **Data Types**: float64 (power, current, voltage, Unnamed: 3), object (0 done)
- **Missing Values**: Unnamed: 3: 410,062 (100%), 0 done: 410,013 (99.99%)
- **Duplicate Rows**: 15,766
- **Label Distribution**: No valid label column
- **Timestamp Structure**: No timestamp columns
- **Units**: Power (Watts - inferred), Current (Amperes - inferred), Voltage (Volts - inferred)
- **Purpose**: Large electrical dataset intended for RUL prediction
- **Use in Project**: EXCLUDED
- **Reason**: Missing critical metadata (no timestamps, 99.99% missing labels), high duplicates, unclear structure

#### 9-19. Run_X_Scope YT Project1.csv (Multiple files)
- **Files**: PLA_Run_1, Run_2, Run_3, Run_4, Run_5, Run_6, Run_7, Run_8, Run_9, Run_9_Fan_off, Run_9_Filament_reloaded
- **File Type**: CSV
- **Rows**: 2,641 to 11,786 (varies by run)
- **Columns**: 4
- **Columns**: Name, Out_Active_Power_Station_6, Out_Current_Station_6, Out_Voltage_Station_6
- **Data Types**: Object (all columns - needs type conversion)
- **Missing Values**: None
- **Duplicate Rows**: 0
- **Label Distribution**: No label columns
- **Timestamp Structure**: "Name" column appears to be milliseconds (0, 250, 500, ...)
- **Sampling**: 250ms intervals (4 Hz)
- **Units**: Power (Watts - inferred), Current (Amperes - inferred), Voltage (Volts - inferred)
- **Purpose**: Electrical measurements for various experimental runs
- **Use in Project**: SELECTIVELY - Run 6 for comparison with labeled data
- **Reason**: Run 6 matches 3D_Printing_Stages.csv timing; other runs lack labels

---

### EXPERIMENTAL METADATA

#### 20. Experimental results.xlsx
- **File Type**: XLSX
- **Rows**: 20
- **Columns**: 14
- **Columns**: RunOrder, Infill(%), Layer Height (mm), Scale (%), Energy (KWh), Build Time(min), Part Weight (g), Scrap Weight (g), Total weight (g), Quality factor, Material Energy (KWh), Material Carbon Intensity (kg CO2/KWh), Process Carbon Intensity (kg CO2/KWh), Total CO2 (kg CO2/KWh)
- **Data Types**: int64, float64
- **Missing Values**: None
- **Duplicate Rows**: 0
- **Label Distribution**: N/A (metadata)
- **Purpose**: Experimental design parameters and results
- **Use in Project**: YES - Context metadata
- **Reason**: Documents experimental conditions (infill, layer height, scale) for correlation analysis

---

## Dataset Compatibility Assessment

### Vibration Data
- **SensorDataFile.csv**: 7,967 samples, binary labels
- **benchydefect.csv**: 5,088 samples, binary labels
- **normalbenchy.csv**: 7,987 samples, all label=0
- **Gyroscope_SensorDataFile.csv**: 1,870 samples, unlabeled

**Compatibility**: All use same column structure and units. Can be combined for analysis.

### Electrical Data
- **3D_Printing_Stages.csv**: 2,641 samples, 3-class labels
- **3D_Printing_Stages_Run_06_Beckhoff.csv**: 10,861 samples, 3-class labels
- **Reference_Run_06_Beckhoff.xlsx**: 10,861 samples, unlabeled
- **Run_X files**: Various lengths, unlabeled

**Compatibility**: Electrical data appears synchronized at 250ms intervals (4 Hz). Run 06 datasets match in length and timing.

### Vibration-Electrical Synchronization
- Vibration data: Irregular sampling (microsecond timestamps, variable intervals)
- Electrical data: Regular 250ms intervals (4 Hz)
- No common timestamp format or experiment ID
- **Synchronization**: NOT POSSIBLE without additional metadata
- **Decision**: Keep as separate context datasets

---

## Sampling Analysis

### Vibration Data Sampling
- SensorDataFile.csv: 7,967 samples over ~28 minutes
  - 1,681 unique HH:MM:SS values
  - Average: ~4.7 samples per second
  - Irregular microsecond timestamps indicate variable sampling rate
- **Sampling Frequency**: NOT uniform - cannot reliably estimate
- **FFT Feasibility**: Limited - irregular sampling precludes standard frequency analysis

### Electrical Data Sampling
- Beckhoff datasets: 250ms uniform intervals = 4 Hz
- Duration: Up to 45 minutes (Run 06)
- **Sampling Frequency**: 4 Hz (uniform)
- **FFT Feasibility**: Possible for very low-frequency analysis (<2 Hz)

---

## Label Semantics

### Critical Finding
**NO LABEL SEMANTICS ARE DOCUMENTED IN SOURCE FILES.**

All label interpretations are inferred:
- Binary labels (0/1): Likely normal/abnormal or normal/defect
- Multi-class labels (0/1/2): Likely printing stages (idle/active/complete)

**Research Impact**: Cannot claim specific fault detection without label verification. Must present results as "condition classification" with inferred meanings clearly stated.

---

## Recommended Dataset Usage

### Primary Datasets (Use in Project)
1. **SensorDataFile.csv** - Primary vibration dataset with binary labels
2. **benchydefect.csv** - Additional labeled vibration data
3. **normalbenchy.csv** - Normal baseline data
4. **3D_Printing_Stages_Run_06_Beckhoff.csv** - Electrical context with stage labels
5. **Reference_Run_06_Beckhoff.xlsx** - Reference electrical data
6. **Experimental results.xlsx** - Experimental context metadata

### Secondary Datasets (Consider if Needed)
7. **Gyroscope_SensorDataFile.csv** - Unlabeled data for unsupervised methods
8. **3D_Printing_Stages.csv** - Matches Run 6, provides stage context

### Excluded Datasets
9. **RUL_Prediction_Data_Nozzle.xlsx** - Missing critical metadata, unusable
10. **Run_X_Scope files (except Run 6)** - No labels, limited utility

---

## Data Quality Issues

1. **Type Inconsistency**: Electrical CSVs store numeric values as object type - requires conversion
2. **Missing Labels**: No source documentation for label meanings
3. **Timestamp Formats**: Inconsistent across files (MM/DD/YYYY vs YY:MM:DD)
4. **Synchronization**: Vibration and electrical data cannot be synchronized
5. **RUL Dataset**: 99.99% missing labels, high duplicates - unusable

---

## Next Steps

1. Clean and convert electrical data types
2. Standardize timestamp formats
3. Perform detailed statistical analysis of vibration signals
4. Develop feature extraction pipeline appropriate for irregular sampling
5. Implement condition classification using binary labels
6. Keep electrical data as separate context API endpoint
