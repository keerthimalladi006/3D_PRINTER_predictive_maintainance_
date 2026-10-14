"""
Prediction on 3D_Printer_Sensor_Data.csv
Apply anomaly detection to the unlabeled dataset.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Load the dataset
csv_path = Path(r"D:\3d_printer_predictive_maintanance\3D_Printer_Sensor_Data.csv")
df = pd.read_csv(csv_path)

# Remove header row (row 2 is duplicate header)
df = df[df['Time_ms'] != 'Time_ms'].copy()

# Convert columns to numeric
numeric_cols = ['Time_ms', 'Ax', 'Ay', 'Az', 'DHT_Temperature', 'Humidity', 'DS18B20_Temperature']
for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce')

print(f"Dataset loaded: {len(df)} rows")
print(f"Columns: {list(df.columns)}")
print(f"\nData statistics:")
print(df.describe())

# Feature columns for anomaly detection
feature_cols = ['Ax', 'Ay', 'Az', 'DHT_Temperature', 'Humidity', 'DS18B20_Temperature']

# Method 1: Statistical baseline from the data itself
print("\n" + "="*80)
print("METHOD 1: Statistical Threshold Detection")
print("="*80)

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

# Calculate statistical anomaly scores
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

    is_anomaly = anomaly_score > 3.0  # 3 standard deviations
    statistical_scores.append(anomaly_score)
    statistical_flags.append(is_anomaly)

df['statistical_anomaly_score'] = statistical_scores
df['statistical_is_anomaly'] = statistical_flags

stat_anomalies = df['statistical_is_anomaly'].sum()
print(f"Statistical anomalies detected: {stat_anomalies} ({stat_anomalies/len(df)*100:.1f}%)")

# Method 2: Isolation Forest
print("\n" + "="*80)
print("METHOD 2: Isolation Forest Detection")
print("="*80)

X = df[feature_cols].fillna(0)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

iso_forest = IsolationForest(
    contamination=0.05,  # 5% expected anomalies
    random_state=42,
    n_estimators=100
)
iso_forest.fit(X_scaled)

predictions = iso_forest.predict(X_scaled)
anomaly_scores = iso_forest.score_samples(X_scaled)

df['isolation_forest_prediction'] = predictions
df['isolation_forest_anomaly_score'] = -anomaly_scores
df['isolation_forest_is_anomaly'] = predictions == -1

iso_anomalies = df['isolation_forest_is_anomaly'].sum()
print(f"Isolation Forest anomalies detected: {iso_anomalies} ({iso_anomalies/len(df)*100:.1f}%)")

# Calculate health score
print("\n" + "="*80)
print("HEALTH SCORE CALCULATION")
print("="*80)

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

print(f"Health score - Mean: {df['health_score'].mean():.1f}%")
print(f"Health score - Std: {df['health_score'].std():.1f}%")
print(f"Health score - Min: {df['health_score'].min():.1f}%")
print(f"Health score - Max: {df['health_score'].max():.1f}%")
print(f"\nCondition distribution:")
print(f"  NORMAL: {(df['condition_state'] == 'NORMAL').sum()}")
print(f"  WARNING: {(df['condition_state'] == 'WARNING').sum()}")
print(f"  ABNORMAL: {(df['condition_state'] == 'ABNORMAL').sum()}")

# Display all rows with predictions
print("\n" + "="*80)
print("PREDICTION RESULTS FOR ALL ROWS")
print("="*80)

output_cols = ['Date_Time', 'Time_ms', 'Ax', 'Ay', 'Az', 'DHT_Temperature', 'Humidity',
               'DS18B20_Temperature', 'health_score', 'condition_state',
               'statistical_anomaly_score', 'statistical_is_anomaly',
               'isolation_forest_anomaly_score', 'isolation_forest_is_anomaly']

print("\nRow-by-row predictions:")
print("-" * 140)
for idx, row in df.iterrows():
    print(f"Row {idx}: {row['Date_Time']} | Health: {row['health_score']:.1f}% ({row['condition_state']}) | "
          f"Stat Anomaly: {row['statistical_is_anomaly']} (score: {row['statistical_anomaly_score']:.2f}) | "
          f"ISO Anomaly: {row['isolation_forest_is_anomaly']} (score: {row['isolation_forest_anomaly_score']:.4f})")

# Save results
output_path = Path(r"D:\3d_printer_predictive_maintanance\3d_printer_predictions.csv")
df[output_cols].to_csv(output_path, index=False)
print(f"\nResults saved to: {output_path}")

# Summary
print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"Total rows analyzed: {len(df)}")
print(f"\nStatistical Method:")
print(f"  Normal: {len(df) - stat_anomalies} ({(len(df) - stat_anomalies)/len(df)*100:.1f}%)")
print(f"  Anomaly: {stat_anomalies} ({stat_anomalies/len(df)*100:.1f}%)")
print(f"\nIsolation Forest Method:")
print(f"  Normal: {len(df) - iso_anomalies} ({(len(df) - iso_anomalies)/len(df)*100:.1f}%)")
print(f"  Anomaly: {iso_anomalies} ({iso_anomalies/len(df)*100:.1f}%)")
print(f"\nHealth Score Method:")
print(f"  NORMAL (>=80%): {(df['condition_state'] == 'NORMAL').sum()} ({(df['condition_state'] == 'NORMAL').sum()/len(df)*100:.1f}%)")
print(f"  WARNING (50-80%): {(df['condition_state'] == 'WARNING').sum()} ({(df['condition_state'] == 'WARNING').sum()/len(df)*100:.1f}%)")
print(f"  ABNORMAL (<50%): {(df['condition_state'] == 'ABNORMAL').sum()} ({(df['condition_state'] == 'ABNORMAL').sum()/len(df)*100:.1f}%)")
print(f"\n" + "="*80)
print("IMPORTANT NOTE:")
print("="*80)
print("This dataset has NO GROUND TRUTH LABELS.")
print("The predictions above are based on statistical anomaly detection and")
print("unsupervised learning. They indicate deviation from the data's own")
print("statistical baseline, NOT actual confirmed failures.")
print("Without labeled data, we cannot determine true accuracy.")
