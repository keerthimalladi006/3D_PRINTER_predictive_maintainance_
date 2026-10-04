"""
Health and Anomaly Detection Pipeline
Implements condition analysis using statistical baseline and Isolation Forest.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

processed_path = Path(r"D:\3d_printer_predictive_maintanance\data\processed")
output_path = Path(r"D:\3d_printer_predictive_maintanance\data\processed")
dataset_path = Path(r"D:\3d_printer_predictive_maintanance\dataset")

def calculate_statistical_baseline(normal_features_df, contamination=0.05):
    """
    Calculate statistical baseline from normal operation data.

    Parameters:
    - normal_features_df: Features from normal operation (label=0)
    - contamination: Expected anomaly rate (default 5%)

    Returns:
    - Dictionary with baseline statistics for each feature
    """
    # Select only numeric feature columns
    feature_cols = [col for col in normal_features_df.columns
                    if col not in ['window_index', 'window_start', 'window_end', 'window_size', 'timestamp', 'label']
                    and normal_features_df[col].dtype in ['float64', 'int64']]

    baseline = {}
    for col in feature_cols:
        col_data = normal_features_df[col].dropna()
        if len(col_data) > 0:
            baseline[col] = {
                "mean": float(col_data.mean()),
                "std": float(col_data.std()),
                "median": float(col_data.median()),
                "q25": float(col_data.quantile(0.25)),
                "q75": float(col_data.quantile(0.75)),
                "min": float(col_data.min()),
                "max": float(col_data.max()),
                "lower_threshold": float(col_data.quantile(0.025)),  # 2.5th percentile
                "upper_threshold": float(col_data.quantile(0.975)),  # 97.5th percentile
            }

    return baseline

def detect_anomalies_statistical(features_df, baseline, threshold_multiplier=3.0):
    """
    Detect anomalies using statistical threshold method.

    Parameters:
    - features_df: Feature DataFrame
    - baseline: Statistical baseline from normal data
    - threshold_multiplier: Multiplier for std-based thresholds

    Returns:
    - DataFrame with anomaly scores and flags
    """
    # Select numeric feature columns
    feature_cols = [col for col in features_df.columns
                    if col in baseline and col not in ['window_index', 'window_start', 'window_end', 'window_size', 'timestamp', 'label']]

    anomaly_scores = []
    anomaly_flags = []

    for idx, row in features_df.iterrows():
        feature_deviations = []
        for col in feature_cols:
            value = row[col]
            if pd.notna(value) and col in baseline:
                baseline_stats = baseline[col]
                # Z-score based deviation
                if baseline_stats["std"] > 0:
                    z_score = abs(value - baseline_stats["mean"]) / baseline_stats["std"]
                    feature_deviations.append(z_score)

        # Overall anomaly score = max z-score across features
        if feature_deviations:
            anomaly_score = max(feature_deviations)
        else:
            anomaly_score = 0

        # Flag as anomaly if score exceeds threshold
        is_anomaly = anomaly_score > threshold_multiplier

        anomaly_scores.append(anomaly_score)
        anomaly_flags.append(is_anomaly)

    features_df = features_df.copy()
    features_df['statistical_anomaly_score'] = anomaly_scores
    features_df['statistical_is_anomaly'] = anomaly_flags

    return features_df

def detect_anomalies_isolation_forest(normal_features_df, all_features_df, contamination=0.05):
    """
    Detect anomalies using Isolation Forest.

    Parameters:
    - normal_features_df: Features from normal operation (for training)
    - all_features_df: All features (for prediction)
    - contamination: Expected anomaly rate

    Returns:
    - DataFrame with anomaly scores and flags
    """
    # Select numeric feature columns
    feature_cols = [col for col in normal_features_df.columns
                    if col not in ['window_index', 'window_start', 'window_end', 'window_size', 'timestamp', 'label']
                    and normal_features_df[col].dtype in ['float64', 'int64']]

    # Prepare training data (normal only)
    X_train = normal_features_df[feature_cols].fillna(0)

    # Prepare prediction data
    X_pred = all_features_df[feature_cols].fillna(0)

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_pred_scaled = scaler.transform(X_pred)

    # Train Isolation Forest on normal data
    iso_forest = IsolationForest(
        contamination=contamination,
        random_state=42,
        n_estimators=100
    )
    iso_forest.fit(X_train_scaled)

    # Predict on all data
    # Isolation Forest returns -1 for anomalies, 1 for normal
    predictions = iso_forest.predict(X_pred_scaled)
    anomaly_scores = iso_forest.score_samples(X_pred_scaled)  # Negative scores indicate anomalies

    all_features_df = all_features_df.copy()
    all_features_df['isolation_forest_prediction'] = predictions
    all_features_df['isolation_forest_anomaly_score'] = -anomaly_scores  # Convert to positive (higher = more anomalous)
    all_features_df['isolation_forest_is_anomaly'] = predictions == -1

    return all_features_df

def calculate_health_indicator(features_df, baseline):
    """
    Calculate a health indicator based on deviation from baseline.

    Health score definition:
    - 100% = perfectly normal (all features within 1 std of baseline mean)
    - 0% = highly degraded (features far from baseline)
    - Calculated as average of (1 - normalized deviation) across features

    Parameters:
    - features_df: Feature DataFrame
    - baseline: Statistical baseline

    Returns:
    - DataFrame with health indicator
    """
    # Select numeric feature columns
    feature_cols = [col for col in features_df.columns
                    if col in baseline and col not in ['window_index', 'window_start', 'window_end', 'window_size', 'timestamp', 'label']]

    health_scores = []

    for idx, row in features_df.iterrows():
        feature_health = []
        for col in feature_cols:
            value = row[col]
            if pd.notna(value) and col in baseline:
                baseline_stats = baseline[col]
                if baseline_stats["std"] > 0:
                    # Normalized deviation
                    deviation = abs(value - baseline_stats["mean"]) / baseline_stats["std"]
                    # Health contribution (capped at 0 for deviations > 3 std)
                    health_contribution = max(0, 1 - deviation / 3.0)
                    feature_health.append(health_contribution)

        # Overall health = average of feature health
        if feature_health:
            health_score = np.mean(feature_health) * 100  # Convert to percentage
        else:
            health_score = 100

        health_scores.append(health_score)

    features_df = features_df.copy()
    features_df['health_score'] = health_scores

    # Define condition states based on health score
    conditions = []
    for score in health_scores:
        if score >= 80:
            conditions.append("NORMAL")
        elif score >= 50:
            conditions.append("WARNING")
        else:
            conditions.append("ABNORMAL")

    features_df['condition_state'] = conditions

    return features_df

def main():
    print("Running health and anomaly detection pipeline...")

    # Load features
    sensor_features = pd.read_csv(processed_path / "sensor_data_features.csv")

    # Separate normal and labeled data
    normal_features = sensor_features[sensor_features['label'] == 0].copy()
    labeled_features = sensor_features.copy()

    print(f"Normal windows: {len(normal_features)}")
    print(f"Total windows: {len(labeled_features)}")

    # 1. Calculate statistical baseline from normal data
    print("\n1. Calculating statistical baseline...")
    baseline = calculate_statistical_baseline(normal_features, contamination=0.05)
    baseline_path = output_path / "statistical_baseline.json"
    with open(baseline_path, 'w') as f:
        json.dump(baseline, f, indent=2)
    print(f"  Baseline saved to: {baseline_path}")

    # 2. Statistical anomaly detection
    print("\n2. Running statistical anomaly detection...")
    sensor_features = detect_anomalies_statistical(sensor_features, baseline, threshold_multiplier=3.0)
    stat_anomalies = sensor_features['statistical_is_anomaly'].sum()
    print(f"  Statistical anomalies detected: {stat_anomalies} ({stat_anomalies/len(sensor_features)*100:.1f}%)")

    # 3. Isolation Forest anomaly detection
    print("\n3. Running Isolation Forest anomaly detection...")
    sensor_features = detect_anomalies_isolation_forest(normal_features, sensor_features, contamination=0.05)
    iso_anomalies = sensor_features['isolation_forest_is_anomaly'].sum()
    print(f"  Isolation Forest anomalies detected: {iso_anomalies} ({iso_anomalies/len(sensor_features)*100:.1f}%)")

    # 4. Calculate health indicator
    print("\n4. Calculating health indicator...")
    sensor_features = calculate_health_indicator(sensor_features, baseline)

    # Print health score distribution
    print(f"  Health score - Mean: {sensor_features['health_score'].mean():.1f}%")
    print(f"  Health score - Std: {sensor_features['health_score'].std():.1f}%")
    print(f"  Health score - Min: {sensor_features['health_score'].min():.1f}%")
    print(f"  Health score - Max: {sensor_features['health_score'].max():.1f}%")

    print(f"\n  Condition distribution:")
    print(f"    NORMAL: {(sensor_features['condition_state'] == 'NORMAL').sum()}")
    print(f"    WARNING: {(sensor_features['condition_state'] == 'WARNING').sum()}")
    print(f"    ABNORMAL: {(sensor_features['condition_state'] == 'ABNORMAL').sum()}")

    # 5. Save results
    output_file = output_path / "sensor_data_with_health_anomaly.csv"
    sensor_features.to_csv(output_file, index=False)
    print(f"\n5. Results saved to: {output_file}")

    # 6. Compare with provided labels
    if 'label' in sensor_features.columns:
        print("\n6. Comparison with provided labels:")
        print(f"  Provided label=1 samples: {(sensor_features['label'] == 1).sum()}")
        print(f"  Statistical detection on label=1: {sensor_features[sensor_features['label'] == 1]['statistical_is_anomaly'].sum()}")
        print(f"  Isolation Forest detection on label=1: {sensor_features[sensor_features['label'] == 1]['isolation_forest_is_anomaly'].sum()}")

        # Average health score by label
        print(f"\n  Average health score by label:")
        print(f"    Label 0: {sensor_features[sensor_features['label'] == 0]['health_score'].mean():.1f}%")
        print(f"    Label 1: {sensor_features[sensor_features['label'] == 1]['health_score'].mean():.1f}%")

    print("\n" + "="*80)
    print("HEALTH/ANOMALY PIPELINE SUMMARY")
    print("="*80)
    print(f"\nMethod: Statistical baseline + Isolation Forest")
    print(f"Health indicator: Based on deviation from normal baseline (0-100%)")
    print(f"Condition states: NORMAL (>=80%), WARNING (50-80%), ABNORMAL (<50%)")
    print(f"\nAnomaly detection methods:")
    print(f"  1. Statistical threshold (3 std from mean)")
    print(f"  2. Isolation Forest (unsupervised, 5% contamination)")
    print(f"\nNote: Label semantics not verified from source. Results are for")
    print(f"      condition classification, not specific fault identification.")

if __name__ == "__main__":
    main()
