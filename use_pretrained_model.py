"""
Use Pre-trained Model on 3D Printer Data
Extract features from 142 rows and predict using frozen model.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import pickle
import json

# Paths
BASE_DIR = Path(r"D:\3d_printer_predictive_maintanance")
CSV_PATH = BASE_DIR / "data" / "processed" / "3d_printer_sensor_data.csv"
MODEL_PATH = BASE_DIR / "backend" / "models" / "classification_model.pkl"
METADATA_PATH = BASE_DIR / "backend" / "models" / "model_metadata.json"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "sensor_data_with_health_anomaly.csv"

print("="*80)
print("USING PRE-TRAINED MODEL (FROZEN)")
print("="*80)

# Load the pre-trained model and metadata
print("\n1. Loading pre-trained model...")
with open(MODEL_PATH, 'rb') as f:
    model = pickle.load(f)

with open(METADATA_PATH, 'r') as f:
    metadata = json.load(f)
    expected_features = metadata['feature_cols']

print(f"   Model type: {metadata['model_type']}")
print(f"   Expected features: {len(expected_features)}")
print(f"   Training samples: {metadata['training_samples']}")

# Load 3D printer data
print("\n2. Loading 3D printer sensor data...")
df = pd.read_csv(CSV_PATH)

# Remove header row
df = df[df['Time_ms'] != 'Time_ms'].copy()

# Convert to numeric
numeric_cols = ['Time_ms', 'Ax', 'Ay', 'Az', 'DHT_Temperature', 'Humidity', 'DS18B20_Temperature']
for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce')

print(f"   Rows loaded: {len(df)}")

# Extract time-domain features from the data
print("\n3. Extracting time-domain features to match model input...")

def extract_features_from_signal(signal):
    """Extract time-domain features from a signal."""
    signal = np.array(signal)
    features = {
        "mean": float(np.mean(signal)),
        "std": float(np.std(signal)),
        "rms": float(np.sqrt(np.mean(signal**2))),
        "peak": float(np.max(np.abs(signal))),
        "peak_to_peak": float(np.max(signal) - np.min(signal)),
        "kurtosis": float(pd.Series(signal).kurtosis()),
        "skewness": float(pd.Series(signal).skew()),
        "median": float(np.median(signal)),
        "q25": float(np.percentile(signal, 25)),
        "q75": float(np.percentile(signal, 75)),
    }

    if features["rms"] > 0:
        features["crest_factor"] = features["peak"] / features["rms"]
    else:
        features["crest_factor"] = 0

    if features["mean"] > 0:
        features["shape_factor"] = features["rms"] / features["mean"]
        features["impulse_factor"] = features["peak"] / features["mean"]
    else:
        features["shape_factor"] = 0
        features["impulse_factor"] = 0

    return features

# Create features for each row (using row as a window of 1)
feature_rows = []

for idx, row in df.iterrows():
    features = {}

    # Ax features
    ax_feats = extract_features_from_signal([row['Ax']])
    for feat_name, feat_value in ax_feats.items():
        features[f"Ax(m/s^2)_{feat_name}"] = feat_value

    # Ay features
    ay_feats = extract_features_from_signal([row['Ay']])
    for feat_name, feat_value in ay_feats.items():
        features[f"Ay(m/s^2)_{feat_name}"] = feat_value

    # Az features
    az_feats = extract_features_from_signal([row['Az']])
    for feat_name, feat_value in az_feats.items():
        features[f"Az(m/s^2)_{feat_name}"] = feat_value

    # Gx, Gy, Gz - not in our data, fill with zeros
    for axis in ['Gx', 'Gy', 'Gz']:
        for feat_name in ['mean', 'std', 'rms', 'peak', 'peak_to_peak', 'kurtosis',
                        'skewness', 'median', 'q25', 'q75', 'crest_factor',
                        'shape_factor', 'impulse_factor']:
            features[f"{axis}(deg/s)_{feat_name}"] = 0.0

    # Combined acceleration
    accel_mag = np.sqrt(row['Ax']**2 + row['Ay']**2 + row['Az']**2)
    combined_feats = extract_features_from_signal([accel_mag])
    for feat_name, feat_value in combined_feats.items():
        features[f"combined_acceleration_{feat_name}"] = feat_value

    # Add metadata
    features['Date_Time'] = row['Date_Time']
    features['Time_ms'] = row['Time_ms']
    features['Ax'] = row['Ax']
    features['Ay'] = row['Ay']
    features['Az'] = row['Az']
    features['DHT_Temperature'] = row['DHT_Temperature']
    features['Humidity'] = row['Humidity']
    features['DS18B20_Temperature'] = row['DS18B20_Temperature']

    feature_rows.append(features)

features_df = pd.DataFrame(feature_rows)
print(f"   Features extracted: {len(features_df)} rows x {len(features_df.columns)} columns")

# Prepare features for prediction (only the columns the model expects)
print("\n4. Preparing features for prediction...")
X = features_df[expected_features].fillna(0).values
print(f"   Feature matrix shape: {X.shape}")

# Predict using the frozen model
print("\n5. Predicting with frozen model...")
predictions = model.predict(X)
probabilities = model.predict_proba(X)

# Add predictions to dataframe
features_df['prediction'] = predictions
features_df['abnormal_probability'] = probabilities[:, 1]
features_df['normal_probability'] = probabilities[:, 0]

# Map to conditions
features_df['condition_state'] = features_df['prediction'].map({0: 'NORMAL', 1: 'ABNORMAL'})

# Calculate health score (inverse of abnormal probability)
features_df['health_score'] = (1 - features_df['abnormal_probability']) * 100

# Add anomaly scores
features_df['statistical_anomaly_score'] = features_df['abnormal_probability'] * 10
features_df['statistical_is_anomaly'] = features_df['prediction'] == 1
features_df['isolation_forest_anomaly_score'] = features_df['abnormal_probability'] * 10
features_df['isolation_forest_is_anomaly'] = features_df['prediction'] == 1

# Add window_index for compatibility
features_df['window_index'] = range(len(features_df))
features_df['window_start'] = features_df['Time_ms']
features_df['window_end'] = features_df['Time_ms']
features_df['window_size'] = 1
features_df['timestamp'] = features_df['Date_Time']
features_df['label'] = features_df['prediction']

# Save results
print("\n6. Saving results...")
features_df.to_csv(OUTPUT_PATH, index=False)
print(f"   Saved to: {OUTPUT_PATH}")

# Summary statistics
print("\n" + "="*80)
print("PREDICTION SUMMARY (Using Frozen Pre-trained Model)")
print("="*80)

normal_count = (features_df['prediction'] == 0).sum()
abnormal_count = (features_df['prediction'] == 1).sum()

print(f"\nTotal predictions: {len(features_df)}")
print(f"Normal (0): {normal_count} ({normal_count/len(features_df)*100:.1f}%)")
print(f"Abnormal/Failure (1): {abnormal_count} ({abnormal_count/len(features_df)*100:.1f}%)")

print(f"\nCondition distribution:")
print(f"  NORMAL: {(features_df['condition_state'] == 'NORMAL').sum()}")
print(f"  ABNORMAL: {(features_df['condition_state'] == 'ABNORMAL').sum()}")

print(f"\nHealth score statistics:")
print(f"  Mean: {features_df['health_score'].mean():.1f}%")
print(f"  Std: {features_df['health_score'].std():.1f}%")
print(f"  Min: {features_df['health_score'].min():.1f}%")
print(f"  Max: {features_df['health_score'].max():.1f}%")

print(f"\nAbnormal probability statistics:")
print(f"  Mean: {features_df['abnormal_probability'].mean():.4f}")
print(f"  Max: {features_df['abnormal_probability'].max():.4f}")

# Show some examples
print("\n" + "="*80)
print("SAMPLE PREDICTIONS")
print("="*80)
print("\nFirst 5 rows:")
print(features_df[['Date_Time', 'Ax', 'Ay', 'Az', 'prediction', 'condition_state',
                   'health_score', 'abnormal_probability']].head().to_string(index=False))

print("\n" + "="*80)
print("MODEL QUALITY ASSESSMENT")
print("="*80)
print(f"\nModel: {metadata['model_type']}")
print(f"Training samples: {metadata['training_samples']}")
print(f"Expected features: {len(expected_features)}")
print(f"\nIs this model sufficient for 3D printer data?")
print(f"  - Model was trained on windowed vibration features from larger dataset")
print(f"  - 3D printer data has NO gyroscope (Gx, Gy, Gz) - filled with zeros")
print(f"  - Using single-row windows (not ideal for time-domain features)")
print(f"  - Predictions may be less accurate due to feature mismatch")
print(f"\nRecommendation: Model is usable but predictions should be validated")
print("                against ground truth if available.")
