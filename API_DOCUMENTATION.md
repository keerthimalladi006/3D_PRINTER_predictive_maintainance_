# API Documentation
## 3D Printer Predictive Maintenance Backend

Base URL: `http://localhost:5000/api`

---

## Overview

This API provides endpoints for monitoring 3D printer health, detecting anomalies, and accessing electrical context data. All endpoints return JSON responses.

**Important Notes:**
- Label semantics are NOT verified from source
- Binary labels (0/1) are inferred as normal/abnormal
- Multi-class labels (0/1/2) are inferred as printing stages
- Health indicator is based on statistical deviation, not physical wear measurement
- Vibration and electrical data cannot be synchronized due to different sampling rates

---

## Endpoints

### 1. API Health Check

#### GET /api/ping

Check if the API is running.

**Response:**
```json
{
  "status": "healthy",
  "service": "3D Printer Predictive Maintenance API",
  "version": "1.0.0"
}
```

---

### 2. Machine Status

#### GET /api/machine-status

Get comprehensive machine status combining health data and electrical context.

**Query Parameters:**
- `limit` (optional, integer, default: 100) - Number of recent entries to return

**Response Schema:**
```json
{
  "health_status": [
    {
      "window_index": 884,
      "window_start": 7960,
      "window_end": 7967,
      "window_size": 7,
      "timestamp": "2022-12-05 13:43:38",
      "label": 0,
      "health_score": 87.6,
      "condition_state": "NORMAL",
      "statistical_anomaly_score": 0.5,
      "statistical_is_anomaly": false,
      "isolation_forest_prediction": 1,
      "isolation_forest_anomaly_score": 0.1,
      "isolation_forest_is_anomaly": false,
      "...": "additional feature columns"
    }
  ],
  "electrical_context": [
    {
      "time_ms": 2715000,
      "time_sec": 2715.0,
      "active_power": 5.25,
      "current": 0.122,
      "voltage": 232.71,
      "label": 2,
      "timestamp_datetime": "1970-01-01 00:45:15",
      "apparent_power": 28.39,
      "power_factor": 0.185
    }
  ],
  "summary": {
    "total_health_windows": 885,
    "total_electrical_samples": 10861,
    "avg_health_score": 77.7,
    "current_condition": "NORMAL"
  }
}
```

**Field Descriptions:**

#### Health Status Fields
- `window_index`: Sequential window number
- `window_start`: Starting sample index in raw data
- `window_end`: Ending sample index in raw data
- `window_size`: Number of samples in window
- `timestamp`: Window start timestamp
- `label`: Majority label in window (0 or 1)
- `health_score`: Health percentage (0-100%, higher = healthier)
- `condition_state`: Categorical condition (NORMAL, WARNING, ABNORMAL)
- `statistical_anomaly_score`: Maximum z-score across features
- `statistical_is_anomaly`: Boolean flag (True if score > 3.0)
- `isolation_forest_prediction`: Prediction (-1 = anomaly, 1 = normal)
- `isolation_forest_anomaly_score`: Anomaly score (higher = more anomalous)
- `isolation_forest_is_anomaly`: Boolean flag

#### Electrical Context Fields
- `time_ms`: Time in milliseconds
- `time_sec`: Time in seconds
- `active_power`: Active power in watts
- `current`: Current in amperes
- `voltage`: Voltage in volts
- `label`: Stage label (0, 1, or 2)
- `timestamp_datetime`: ISO format timestamp
- `apparent_power`: Calculated (voltage × current) in VA
- `power_factor`: Calculated (active_power / apparent_power)

---

### 3. Vibration Features

#### GET /api/vibration

Get windowed time-domain vibration features.

**Query Parameters:**
- `window_index` (optional, integer) - Specific window index to retrieve
- `limit` (optional, integer, default: 100) - Number of windows to return (if no index specified)

**Response Schema:**
```json
{
  "features": [
    {
      "window_index": 884,
      "window_start": 7960,
      "window_end": 7967,
      "window_size": 7,
      "timestamp": "2022-12-05 13:43:38",
      "label": 0,
      "Ax(m/s^2)_mean": 0.5,
      "Ax(m/s^2)_std": 1.2,
      "Ax(m/s^2)_rms": 1.3,
      "Ax(m/s^2)_peak": 5.2,
      "Ax(m/s^2)_peak_to_peak": 10.4,
      "Ax(m/s^2)_kurtosis": 3.5,
      "Ax(m/s^2)_skewness": 0.2,
      "Ax(m/s^2)_median": 0.4,
      "Ax(m/s^2)_q25": 0.1,
      "Ax(m/s^2)_q75": 0.8,
      "Ax(m/s^2)_crest_factor": 4.0,
      "Ax(m/s^2)_shape_factor": 2.6,
      "Ax(m/s^2)_impulse_factor": 10.4,
      "...": "similar features for Ay, Az, Gx, Gy, Gz, and combined acceleration"
    }
  ]
}
```

**Feature Naming Convention:**
- Acceleration: `Ax(m/s^2)_*`, `Ay(m/s^2)_*`, `Az(m/s^2)_*`
- Gyroscope: `Gx(deg/s)_*`, `Gy(deg/s)_*`, `Gz(deg/s)_*`
- Combined: `combined_acceleration_*`
- Suffixes: `_mean`, `_std`, `_rms`, `_peak`, `_peak_to_peak`, `_kurtosis`, `_skewness`, `_median`, `_q25`, `_q75`, `_crest_factor`, `_shape_factor`, `_impulse_factor`

---

### 4. Health Indicator

#### GET /api/health

Get health indicator data with summary statistics.

**Query Parameters:**
- `limit` (optional, integer, default: 100) - Number of entries to return

**Response Schema:**
```json
{
  "health_data": [
    {
      "window_index": 884,
      "timestamp": "2022-12-05 13:43:38",
      "label": 0,
      "health_score": 87.6,
      "condition_state": "NORMAL",
      "statistical_anomaly_score": 0.5,
      "statistical_is_anomaly": false,
      "isolation_forest_anomaly_score": 0.1,
      "isolation_forest_is_anomaly": false
    }
  ],
  "summary": {
    "avg_health_score": 77.7,
    "min_health_score": 28.5,
    "max_health_score": 87.6,
    "std_health_score": 8.8,
    "condition_distribution": {
      "NORMAL": 473,
      "WARNING": 391,
      "ABNORMAL": 21
    },
    "statistical_anomaly_count": 220,
    "isolation_forest_anomaly_count": 55
  }
}
```

**Field Descriptions:**
- `health_score`: Health percentage (0-100%)
  - 100% = perfectly normal (all features within 1 std of baseline)
  - 0% = highly degraded (features far from baseline)
- `condition_state`: Categorical condition
  - NORMAL: health_score >= 80%
  - WARNING: 50% <= health_score < 80%
  - ABNORMAL: health_score < 50%

---

### 5. Anomalies

#### GET /api/anomalies

Get detected anomalies.

**Query Parameters:**
- `method` (optional, string, default: "both") - Detection method: "statistical", "isolation_forest", or "both"
- `limit` (optional, integer, default: 50) - Maximum number of anomalies to return

**Response Schema:**
```json
{
  "anomalies": [
    {
      "window_index": 42,
      "timestamp": "2022-12-05 13:16:06",
      "label": 1,
      "health_score": 45.2,
      "condition_state": "ABNORMAL",
      "statistical_anomaly_score": 3.5,
      "statistical_is_anomaly": true,
      "isolation_forest_anomaly_score": 0.8,
      "isolation_forest_is_anomaly": false
    }
  ],
  "total_count": 220,
  "method": "both"
}
```

**Detection Methods:**
- `statistical`: Threshold-based (3 standard deviations from mean)
- `isolation_forest`: Unsupervised ML (5% contamination)
- `both`: Union of both methods

---

### 6. Maintenance Recommendations

#### GET /api/maintenance

Get maintenance recommendations based on current health state.

**Response Schema:**
```json
{
  "action": "MONITOR",
  "priority": "MEDIUM",
  "message": "Machine health degraded. Increase monitoring frequency.",
  "health_score": 65.4,
  "recent_anomaly_count": 3
}
```

**Action Types:**
- `NO_ACTION`: Machine operating normally
- `MONITOR`: Machine health degraded, increase monitoring
- `INSPECT`: Machine condition abnormal, schedule maintenance

**Priority Levels:**
- `LOW`: Normal operation
- `MEDIUM`: Degraded health
- `HIGH`: Abnormal condition

---

### 7. Electrical Context

#### GET /api/electrical

Get electrical power context data.

**Query Parameters:**
- `limit` (optional, integer, default: 100) - Number of entries to return

**Response Schema:**
```json
{
  "electrical_data": [
    {
      "time_ms": 2715000,
      "time_sec": 2715.0,
      "active_power": 5.25,
      "current": 0.122,
      "voltage": 232.71,
      "label": 2,
      "timestamp_datetime": "1970-01-01 00:45:15",
      "apparent_power": 28.39,
      "power_factor": 0.185
    }
  ],
  "summary": {
    "avg_power": 90.47,
    "avg_current": 0.5184,
    "avg_voltage": 232.63,
    "duration_seconds": 2715.0,
    "label_distribution": {
      "0": 3334,
      "1": 422,
      "2": 7105
    }
  }
}
```

**Label Semantics (Inferred):**
- Label 0: Idle/low power (7.63 W average)
- Label 1: High power (238.46 W average)
- Label 2: Active printing (120.56 W average)

---

### 8. ML Prediction (POST)

#### POST /api/predict

Predict machine condition using trained ML model (Gradient Boosting + SMOTE).

**Request Body:**
```json
{
  "Ax(m/s^2)_mean": 0.5,
  "Ax(m/s^2)_std": 1.2,
  "Ax(m/s^2)_rms": 1.3,
  "...": "all 91 feature values"
}
```

**Response Schema:**
```json
{
  "prediction": 0,
  "condition": "NORMAL",
  "abnormal_probability": 0.15,
  "confidence": 0.85,
  "model_version": "1.0"
}
```

**Field Descriptions:**
- `prediction`: 0 (normal) or 1 (abnormal)
- `condition`: "NORMAL" or "ABNORMAL"
- `abnormal_probability`: Probability of abnormal state (0-1)
- `confidence`: Model confidence (max of class probabilities)
- `model_version`: Model version identifier

**Note**: Model trained with SMOTE to handle class imbalance (3.7% abnormal). Abnormal recall improved from 10% → 50%.

---

### 9. ML Batch Prediction (POST)

#### POST /api/predict/batch

Predict condition for multiple feature sets.

**Request Body:**
```json
[
  {
    "Ax(m/s^2)_mean": 0.5,
    "...": "features for sample 1"
  },
  {
    "Ax(m/s^2)_mean": 0.6,
    "...": "features for sample 2"
  }
]
```

**Response Schema:**
```json
{
  "predictions": [
    {
      "prediction": 0,
      "condition": "NORMAL",
      "abnormal_probability": 0.15,
      "confidence": 0.85,
      "model_version": "1.0"
    },
    {
      "prediction": 1,
      "condition": "ABNORMAL",
      "abnormal_probability": 0.78,
      "confidence": 0.78,
      "model_version": "1.0"
    }
  ]
}
```

---

### 10. ML Latest Prediction (GET)

#### GET /api/predict/latest

Predict condition for the most recent sensor window.

**Response Schema:**
```json
{
  "prediction": 0,
  "condition": "NORMAL",
  "abnormal_probability": 0.12,
  "confidence": 0.88,
  "model_version": "1.0",
  "window_index": 884,
  "timestamp": "2022-12-05 13:43:38"
}
```

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid method. Use: statistical, isolation_forest, or both"
}
```

**404 Not Found:**
```json
{
  "error": "Endpoint not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## Usage Examples

### Python (requests)
```python
import requests

# Get machine status
response = requests.get('http://localhost:5000/api/machine-status?limit=50')
status = response.json()

# Get health data
response = requests.get('http://localhost:5000/api/health?limit=100')
health = response.json()

# Get anomalies
response = requests.get('http://localhost:5000/api/anomalies?method=both&limit=20')
anomalies = response.json()

# Get maintenance recommendation
response = requests.get('http://localhost:5000/api/maintenance')
recommendation = response.json()
```

### JavaScript (fetch)
```javascript
// Get machine status
fetch('http://localhost:5000/api/machine-status?limit=50')
  .then(response => response.json())
  .then(status => console.log(status));

// Get health data
fetch('http://localhost:5000/api/health?limit=100')
  .then(response => response.json())
  .then(health => console.log(health));

// Get anomalies
fetch('http://localhost:5000/api/anomalies?method=both&limit=20')
  .then(response => response.json())
  .then(anomalies => console.log(anomalies));

// Get maintenance recommendation
fetch('http://localhost:5000/api/maintenance')
  .then(response => response.json())
  .then(recommendation => console.log(recommendation));

// ML prediction for latest window
fetch('http://localhost:5000/api/predict/latest')
  .then(response => response.json())
  .then(prediction => console.log(prediction));

// ML prediction with custom features
fetch('http://localhost:5000/api/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    "Ax(m/s^2)_mean": 0.5,
    "Ax(m/s^2)_std": 1.2,
    "...": "other features"
  })
})
  .then(response => response.json())
  .then(prediction => console.log(prediction));
```

---

## Data Source Information

### Vibration Data
- **Source**: SensorDataFile.csv
- **Sensors**: 6-axis IMU (3-axis accelerometer + 3-axis gyroscope)
- **Sampling Rate**: ~4.7 Hz (irregular)
- **Window Size**: 2 seconds (~9-10 samples per window)
- **Features**: 97 time-domain features per window
- **Limitation**: Low sampling rate precludes frequency-domain analysis

### Electrical Data
- **Source**: 3D_Printing_Stages_Run_06_Beckhoff.csv
- **Sampling Rate**: 4 Hz (uniform, 250ms intervals)
- **Duration**: 2,715 seconds (45.2 minutes)
- **Parameters**: Active power, current, voltage
- **Labels**: 3 printing stages (inferred semantics)

### Synchronization Note
Vibration and electrical data **CANNOT** be synchronized due to:
- Different sampling rates (4.7 Hz vs 4 Hz)
- Different timestamp formats
- Lack of common reference timestamp
- Separate experimental setups

Therefore, they are provided as separate context datasets.

---

## Research Limitations

1. **Label Semantics**: Not verified from source. Binary labels inferred as normal/abnormal.

2. **Sampling Rate**: Vibration data sampled at ~4.7 Hz is too slow for high-frequency vibration analysis. Only time-domain features are appropriate.

3. **No Degradation Data**: Dataset does not contain time-series degradation information or RUL labels. Health indicator is based on statistical deviation, not physical wear.

4. **Short Duration**: Vibration data spans ~28 minutes only. Not suitable for long-term degradation analysis.

5. **No Fault Identification**: Labels do not specify fault types. System performs condition classification, not specific fault diagnosis.

6. **No Synchronization**: Vibration and electrical data cannot be synchronized for multi-sensor fusion.

---

## Running the API

### Installation
```bash
cd backend
pip install -r requirements.txt
```

### Start Server
```bash
python app.py
```

The API will be available at `http://localhost:5000`

### Test Endpoints
```bash
# Health check
curl http://localhost:5000/api/ping

# Get machine status
curl http://localhost:5000/api/machine-status

# Get health data
curl http://localhost:5000/api/health

# Get anomalies
curl http://localhost:5000/api/anomalies

# Get maintenance recommendation
curl http://localhost:5000/api/maintenance

# Get electrical context
curl http://localhost:5000/api/electrical
```
