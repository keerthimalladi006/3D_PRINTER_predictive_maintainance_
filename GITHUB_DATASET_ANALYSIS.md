# GitHub Dataset Analysis
## FFF Printer Full-Lifecycle Vibration Monitoring

Source: Zenodo (https://doi.org/10.5281/zenodo.5747732)
Title: "Federated learning dataset: A case study of vibration analysis for desktop 3D printers"
Authors: Chou, Cheng-Hao & Okwudire, Chinedum (University of Michigan, 2021)

---

## Dataset Overview

### Purpose
Federated learning case study for vibration analysis of desktop 3D printers.

### Data Description
- **Scope**: Acceleration data from six low-cost 3D printers (same make and model)
- **Task**: Air-printing cubes with different printing speeds
- **Files**:
  - Raw Acceleration Data.zip (90.6 MB)
  - RMS Acceleration by Layer.zip (40.6 kB)
  - GCode.zip (205.8 kB)
  - Figures.zip (1.2 MB)
  - Dataset Descriptions.pdf (274.4 kB)

### Key Characteristics
- **Sensors**: Accelerometers (likely single-axis based on context)
- **Application**: Federated learning, personalized learning
- **Print Type**: Air-printing cubes (no filament extrusion)
- **Variable**: Different printing speeds

---

## Compatibility Assessment

### STRUCTURAL COMPATIBILITY

| Aspect | Sir-Provided Dataset | GitHub Dataset | Compatible? |
|--------|---------------------|----------------|-------------|
| Sensor Type | 6-axis IMU (3x accel + 3x gyro) | Accelerometer only | NO |
| Data Format | CSV with timestamps | LabVIEW Measurement files | NO |
| Sampling Rate | ~4.7 Hz (irregular) | Not specified (likely higher) | UNKNOWN |
| Labels | Binary (0/1) | No wear state labels | NO |
| Duration | ~28 minutes per file | Not specified | UNKNOWN |
| Print Type | Actual 3D printing | Air-printing | NO |

### RESEARCH OBJECTIVE COMPATIBILITY

| Research Goal | Sir-Provided Dataset | GitHub Dataset | Better Fit |
|---------------|---------------------|----------------|------------|
| Condition classification | YES (binary labels) | NO (no labels) | Sir-provided |
| Anomaly detection | YES (statistical + ML) | POSSIBLE (unsupervised) | Sir-provided |
| Degradation estimation | LIMITED (no wear states) | NO (no wear states) | Neither |
| Lifecycle analysis | NO (single time point) | NO (no wear states) | Neither |
| RUL prediction | NO (no degradation data) | NO (no RUL data) | Neither |
| Federated learning | NO (single printer) | YES (6 printers) | GitHub |

### TECHNICAL COMPATIBILITY

#### Data Format
- **Sir-provided**: CSV files with human-readable timestamps
- **GitHub**: LabVIEW Measurement files (.tdms) - requires special libraries
- **Compatibility**: NOT COMPATIBLE - different file formats

#### Sensor Configuration
- **Sir-provided**: 6-axis IMU (3D accelerometer + 3D gyroscope)
- **GitHub**: Accelerometer only (likely single-axis)
- **Compatibility**: NOT COMPATIBLE - different sensor configurations

#### Sampling Rate
- **Sir-provided**: ~4.7 Hz (low frequency, irregular)
- **GitHub**: Not specified in abstract (likely higher for vibration analysis)
- **Compatibility**: UNKNOWN - sampling rate not documented

#### Label Availability
- **Sir-provided**: Binary labels (0/1) - semantics not verified
- **GitHub**: No wear state labels in abstract
- **Compatibility**: NOT COMPATIBLE - no labels for supervised learning

---

## Analysis Conclusion

### PRIMARY FINDING
**The GitHub dataset is NOT compatible with the sir-provided dataset for direct integration.**

### Key Incompatibilities

1. **Sensor Configuration**: 6-axis IMU vs accelerometer-only
2. **Data Format**: CSV vs LabVIEW Measurement files
3. **Labels**: Binary labels present vs no labels
4. **Print Type**: Actual printing vs air-printing
5. **Research Focus**: Condition monitoring vs federated learning

### Potential Uses

#### DEMONSTRATION ONLY
- Could be used to demonstrate federated learning concepts
- Would require separate data processing pipeline
- Not suitable for integration with current backend

#### VALIDATION
- Could serve as an independent validation dataset
- Would require significant preprocessing
- Different sensor configuration makes direct comparison invalid

#### COMPARISON
- Could compare methodological approaches
- Not suitable for performance comparison due to different data characteristics

---

## Recommendation

### DO NOT USE GitHub dataset for this project

**Reasons:**

1. **Integration Complexity**: Requires separate processing pipeline for LabVIEW files
2. **Sensor Mismatch**: Accelerometer-only vs 6-axis IMU
3. **No Labels**: Cannot support supervised learning for condition classification
4. **Different Use Case**: Federated learning vs condition monitoring
5. **Air-Printing**: Does not represent actual 3D printing with filament

### Alternative Recommendation

**Focus on sir-provided dataset:**

1. **Strengths**:
   - Complete sensor suite (accelerometer + gyroscope)
   - Binary labels for classification
   - Actual 3D printing data
   - CSV format (easy to process)

2. **Limitations (acknowledged)**:
   - Low sampling rate (~4.7 Hz)
   - Label semantics not verified
   - No degradation/RUL data
   - Short duration (~28 minutes)

3. **Research Scope (appropriate for data)**:
   - Condition classification (normal/abnormal)
   - Anomaly detection (statistical + Isolation Forest)
   - Health indicator based on deviation from baseline
   - Operating context from electrical data

### Future Enhancement Possibilities

If degradation/RUL analysis is required:

1. **Collect new data** with:
   - High sampling rate (>1 kHz for vibration)
   - Documented wear states
   - Time-series labels (degradation over time)
   - Maintenance records

2. **Use GitHub dataset only if**:
   - Research focus shifts to federated learning
   - Willing to process LabVIEW files
   - Accepting accelerometer-only data
   - Research goal is algorithm comparison, not integration

---

## Final Decision

**EXCLUDE GitHub dataset from current project.**

The sir-provided dataset, despite its limitations, is better suited for the stated research objective of "early identification of abnormal/degrading machine behaviour" because:

1. It contains actual 3D printing data (not air-printing)
2. It has labels for supervised learning
3. It includes gyroscope data in addition to accelerometer
4. It uses a simple CSV format
5. It is already integrated into the analysis pipeline

The GitHub dataset would require:
- Separate data processing infrastructure
- Different sensor handling
- Unsupervised-only approaches
- Significant project scope expansion

This expansion is not justified given the incompatibility with the current research objective and data characteristics.
