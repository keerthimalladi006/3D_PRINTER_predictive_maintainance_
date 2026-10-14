"""
Process 3D_Printer_Sensor_Data.csv for backend streaming
Apply anomaly detection and save in format expected by data_service.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import pickle
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

PROCESSED_PATH = Path(r"D:\3d_printer_predictive_maintanance\data\processed")
CSV_PATH = Path(r"D:\3d_printer_predictive_maintanance\data\processed\3d_printer_sensor_data.csv")

# Load the dataset
df = pd.read_csv(CSV_PATH)

# Remove header row (row 2 is duplicate header)
df = df[df['Time_ms'] != 'Time_ms'].copy()

# Convert columns to numeric
numeric_cols = ['Time_ms', 'Ax', 'Ay', 'Az', 'DHT_Temperature', 'Humidity', 'DS18B20_Temperature']
for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce')

print(f"Dataset loaded: {len(df)} rows")

# Feature columns for anomaly detection
feature_cols = ['Ax', 'Ay', 'Az', 'DHT_Temperature', 'Humidity', 'DS18B20_Temperature']

# Calculate statistical baseline
baseline = {}
for col in feature_cols:
    col_data = df[col].dropna()
    if len(col_data) > 0:
        baseline[col] = {
            "mean": float(col_data.mean()),
            "std": float(col_data.std()),
            "median": float(col_data.median()),
            "q25": float(col_data.quantile(0.25)),
            "q75": float(col_data.quantile(0.75)),
            "min": float(col_data.min()),
            "max": float(col_data.max()),
            "lower_threshold": float(col_data.quantile(0.025)),
            "upper_threshold": float(col_data.quantile(0.975)),
        }

# Statistical anomaly detection
statistical_scores = []
statistical_flags = []

for idx, row in df.iterrows():
    feature_deviations = []
    for col in feature_cols:
        value = row[col]
        if pd.notna(value) and col in baseline:
            baseline_stats = baseline[col]
            if baseline_stats["std"] > 0:
                z_score = abs(value - baseline_stats["mean"]) / baseline_stats["std"]
                feature_deviations.append(z_score)

    if feature_deviations:
        anomaly_score = max(feature_deviations)
    else:
        anomaly_score = 0

    is_anomaly = anomaly_score > 3.0
    statistical_scores.append(anomaly_score)
    statistical_flags.append(is_anomaly)

df['statistical_anomaly_score'] = statistical_scores
df['statistical_is_anomaly'] = statistical_flags

# Isolation Forest detection
X = df[feature_cols].fillna(0)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

iso_forest = IsolationForest(
    contamination=0.05,
    random_state=42,
    n_estimators=100
)
iso_forest.fit(X_scaled)

# Save the trained Isolation Forest model and scaler
MODEL_PATH = PROCESSED_PATH.parent / "backend" / "models"
MODEL_PATH.mkdir(parents=True, exist_ok=True)

with open(MODEL_PATH / "isolation_forest_model.pkl", 'wb') as f:
    pickle.dump(iso_forest, f)

with open(MODEL_PATH / "isolation_forest_scaler.pkl", 'wb') as f:
    pickle.dump(scaler, f)

# Save feature columns
with open(MODEL_PATH / "isolation_forest_metadata.json", 'w') as f:
    json.dump({
        'feature_cols': feature_cols,
        'contamination': 0.05,
        'n_estimators': 100,
        'model_type': 'IsolationForest'
    }, f, indent=2)

print(f"Isolation Forest model saved to: {MODEL_PATH / 'isolation_forest_model.pkl'}")
print(f"Scaler saved to: {MODEL_PATH / 'isolation_forest_scaler.pkl'}")

predictions = iso_forest.predict(X_scaled)
anomaly_scores = iso_forest.score_samples(X_scaled)

df['isolation_forest_prediction'] = predictions
df['isolation_forest_anomaly_score'] = -anomaly_scores
df['isolation_forest_is_anomaly'] = predictions == -1

# Calculate health score
health_scores = []
for idx, row in df.iterrows():
    feature_health = []
    for col in feature_cols:
        value = row[col]
        if pd.notna(value) and col in baseline:
            baseline_stats = baseline[col]
            if baseline_stats["std"] > 0:
                deviation = abs(value - baseline_stats["mean"]) / baseline_stats["std"]
                health_contribution = max(0, 1 - deviation / 3.0)
                feature_health.append(health_contribution)

    if feature_health:
        health_score = np.mean(feature_health) * 100
    else:
        health_score = 100

    health_scores.append(health_score)

df['health_score'] = health_scores

# Define condition states
conditions = []
for score in health_scores:
    if score >= 80:
        conditions.append("NORMAL")
    elif score >= 50:
        conditions.append("WARNING")
    else:
        conditions.append("ABNORMAL")

df['condition_state'] = conditions

# Add window_index for compatibility with existing data_service
df['window_index'] = range(len(df))
df['window_start'] = df['Time_ms']
df['window_end'] = df['Time_ms']
df['window_size'] = 1
df['timestamp'] = df['Date_Time']
df['label'] = 0  # No ground truth labels

# Save processed data in format expected by data_service
output_file = PROCESSED_PATH / "sensor_data_with_health_anomaly.csv"
df.to_csv(output_file, index=False)
print(f"Processed data saved to: {output_file}")

# Save baseline
baseline_file = PROCESSED_PATH / "statistical_baseline.json"
with open(baseline_file, 'w') as f:
    json.dump(baseline, f, indent=2)
print(f"Baseline saved to: {baseline_file}")

# Create dummy electrical context data for compatibility
electrical_data = pd.DataFrame({
    'time_ms': df['Time_ms'],
    'time_sec': df['Time_ms'] / 1000,
    'active_power': df['Ax'] * 10,  # Dummy calculation
    'current': df['Ay'] * 0.5,  # Dummy calculation
    'voltage': 24.0,  # Constant
    'label': 0,
    'timestamp_datetime': pd.to_datetime(df['Date_Time']),
    'apparent_power': df['Ax'] * 12,
    'power_factor': 0.9
})

electrical_file = PROCESSED_PATH / "electrical_context.csv"
electrical_data.to_csv(electrical_file, index=False)
print(f"Electrical context saved to: {electrical_file}")

print("\n" + "="*80)
print("PROCESSING COMPLETE")
print("="*80)
print(f"Total rows: {len(df)}")
print(f"Statistical anomalies: {df['statistical_is_anomaly'].sum()}")
print(f"Isolation Forest anomalies: {df['isolation_forest_is_anomaly'].sum()}")
print(f"Condition distribution:")
print(f"  NORMAL: {(df['condition_state'] == 'NORMAL').sum()}")
print(f"  WARNING: {(df['condition_state'] == 'WARNING').sum()}")
print(f"  ABNORMAL: {(df['condition_state'] == 'ABNORMAL').sum()}")
