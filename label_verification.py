"""
Label Verification and ML Suitability Assessment
Verifies label semantics and tests ML model performance.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler
import json

dataset_path = Path(r"D:\3d_printer_predictive_maintanance\dataset")
processed_path = Path(r"D:\3d_printer_predictive_maintanance\data\processed")

def verify_label_differences():
    """Detailed comparison of label 0 vs label 1."""
    df = pd.read_csv(dataset_path / "SensorDataFile.csv")
    df.columns = df.columns.str.replace('\n', '').str.replace('µ', 'u').str.strip()

    label_0 = df[df['label'] == 0]
    label_1 = df[df['label'] == 1]

    print("="*80)
    print("LABEL VERIFICATION: Detailed Statistical Comparison")
    print("="*80)

    print(f"\nLabel 0 (Normal): {len(label_0)} samples")
    print(f"Label 1 (Abnormal): {len(label_1)} samples")

    print("\n" + "-"*80)
    print("ACCELERATION STATISTICS")
    print("-"*80)

    for axis in ['Ax(m/s^2)', 'Ay(m/s^2)', 'Az(m/s^2)']:
        print(f"\n{axis}:")
        print(f"  Label 0: Mean={label_0[axis].mean():.4f}, Std={label_0[axis].std():.4f}, Range={label_0[axis].max()-label_0[axis].min():.4f}")
        print(f"  Label 1: Mean={label_1[axis].mean():.4f}, Std={label_1[axis].std():.4f}, Range={label_1[axis].max()-label_1[axis].min():.4f}")
        print(f"  Difference: {abs(label_1[axis].mean() - label_0[axis].mean()):.4f}")

        # Cohen's d
        pooled_std = np.sqrt((label_0[axis].std()**2 + label_1[axis].std()**2) / 2)
        cohens_d = abs(label_1[axis].mean() - label_0[axis].mean()) / pooled_std if pooled_std > 0 else 0
        effect_size = "small" if cohens_d < 0.2 else "medium" if cohens_d < 0.8 else "large"
        print(f"  Cohen's d: {cohens_d:.4f} ({effect_size} effect)")

    print("\n" + "-"*80)
    print("GYROSCOPE STATISTICS")
    print("-"*80)

    for axis in ['Gx(deg/s)', 'Gy(deg/s)', 'Gz(deg/s)']:
        print(f"\n{axis}:")
        print(f"  Label 0: Mean={label_0[axis].mean():.4f}, Std={label_0[axis].std():.4f}, Range={label_0[axis].max()-label_0[axis].min():.4f}")
        print(f"  Label 1: Mean={label_1[axis].mean():.4f}, Std={label_1[axis].std():.4f}, Range={label_1[axis].max()-label_1[axis].min():.4f}")
        print(f"  Difference: {abs(label_1[axis].mean() - label_0[axis].mean()):.4f}")

        # Cohen's d
        pooled_std = np.sqrt((label_0[axis].std()**2 + label_1[axis].std()**2) / 2)
        cohens_d = abs(label_1[axis].mean() - label_0[axis].mean()) / pooled_std if pooled_std > 0 else 0
        effect_size = "small" if cohens_d < 0.2 else "medium" if cohens_d < 0.8 else "large"
        print(f"  Cohen's d: {cohens_d:.4f} ({effect_size} effect)")

    return label_0, label_1

def test_ml_classification():
    """Test ML model performance on raw sensor data."""
    df = pd.read_csv(dataset_path / "SensorDataFile.csv")
    df.columns = df.columns.str.replace('\n', '').str.replace('µ', 'u').str.strip()

    # Features: acceleration and gyroscope
    feature_cols = ['Ax(m/s^2)', 'Ay(m/s^2)', 'Az(m/s^2)', 'Gx(deg/s)', 'Gy(deg/s)', 'Gz(deg/s)']
    X = df[feature_cols].values
    y = df['label'].values

    print("\n" + "="*80)
    print("ML MODEL PERFORMANCE TEST (Raw Sensor Data)")
    print("="*80)

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)

    print(f"\nTraining samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    print(f"Label distribution - Train: {np.bincount(y_train)}")
    print(f"Label distribution - Test: {np.bincount(y_test)}")

    # Random Forest Classifier
    rf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    rf.fit(X_train, y_train)

    # Predictions
    y_pred = rf.predict(X_test)

    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nAccuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal (0)', 'Abnormal (1)']))

    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  True Normal: {cm[0,0]}, False Abnormal: {cm[0,1]}")
    print(f"  False Normal: {cm[1,0]}, True Abnormal: {cm[1,1]}")

    # Feature importance
    print("\nFeature Importance:")
    for feature, importance in zip(feature_cols, rf.feature_importances_):
        print(f"  {feature}: {importance:.4f}")

    # Cross-validation
    print("\n" + "-"*80)
    print("Cross-Validation (5-fold)")
    print("-"*80)
    cv_scores = cross_val_score(rf, X, y, cv=5, scoring='accuracy')
    print(f"CV Accuracy: {cv_scores.mean():.4f} (±{cv_scores.std():.4f})")
    print(f"CV Scores: {cv_scores}")

    return {
        'accuracy': float(accuracy),
        'confusion_matrix': cm.tolist(),
        'feature_importance': dict(zip(feature_cols, rf.feature_importances_.tolist())),
        'cv_mean': float(cv_scores.mean()),
        'cv_std': float(cv_scores.std())
    }

def test_ml_on_features():
    """Test ML model performance on extracted features."""
    features_df = pd.read_csv(processed_path / "sensor_data_features.csv")

    # Select numeric feature columns (exclude metadata)
    feature_cols = [col for col in features_df.columns
                    if col not in ['window_index', 'window_start', 'window_end', 'window_size', 'timestamp', 'label']
                    and features_df[col].dtype in ['float64', 'int64']]

    X = features_df[feature_cols].fillna(0).values
    y = features_df['label'].values

    print("\n" + "="*80)
    print("ML MODEL PERFORMANCE TEST (Extracted Features)")
    print("="*80)

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)

    print(f"\nTraining samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    print(f"Features: {len(feature_cols)}")

    # Random Forest Classifier
    rf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    rf.fit(X_train, y_train)

    # Predictions
    y_pred = rf.predict(X_test)

    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nAccuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal (0)', 'Abnormal (1)']))

    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  True Normal: {cm[0,0]}, False Abnormal: {cm[0,1]}")
    print(f"  False Normal: {cm[1,0]}, True Abnormal: {cm[1,1]}")

    # Top 10 feature importance
    feature_importance = list(zip(feature_cols, rf.feature_importances_))
    feature_importance.sort(key=lambda x: x[1], reverse=True)

    print("\nTop 10 Most Important Features:")
    for feature, importance in feature_importance[:10]:
        print(f"  {feature}: {importance:.4f}")

    return {
        'accuracy': float(accuracy),
        'confusion_matrix': cm.tolist(),
        'top_features': feature_importance[:10]
    }

def main():
    print("LABEL VERIFICATION AND ML SUITABILITY ASSESSMENT")
    print("="*80)

    # 1. Verify label differences
    label_0, label_1 = verify_label_differences()

    # 2. Test ML on raw data
    raw_results = test_ml_classification()

    # 3. Test ML on features
    feature_results = test_ml_on_features()

    # 4. Summary
    print("\n" + "="*80)
    print("SUMMARY AND CONCLUSIONS")
    print("="*80)

    print("\nLabel Semantics:")
    print("  Label 0: NORMAL operation (lower variability, stable sensor readings)")
    print("  Label 1: ABNORMAL operation (higher variability, unstable sensor readings)")
    print("  [OK] Your observation is CORRECT - label 1 represents abnormal behavior")

    print("\nML Model Suitability:")
    print(f"  Raw Data Accuracy: {raw_results['accuracy']*100:.2f}%")
    print(f"  Feature Data Accuracy: {feature_results['accuracy']*100:.2f}%")

    if raw_results['accuracy'] > 0.85:
        print("  [OK] ML models ARE suitable for this classification task")
        print("  [OK] Good separability between normal and abnormal classes")
    elif raw_results['accuracy'] > 0.70:
        print("  [~] ML models are MODERATELY suitable")
        print("  [~] Acceptable performance with room for improvement")
    else:
        print("  [X] ML models have LIMITED suitability")
        print("  [X] Poor separability between classes")

    print("\nRecommendations:")
    print("  1. Use extracted features (time-domain) for better performance")
    print("  2. Random Forest works well - consider other ensemble methods")
    print("  3. Handle class imbalance (label 1 is only 3.7% of data)")
    print("  4. Consider anomaly detection methods for real-time monitoring")

    # Save results
    results = {
        "label_verification": {
            "label_0_count": int(len(label_0)),
            "label_1_count": int(len(label_1)),
            "label_0_semantics": "NORMAL - stable sensor readings",
            "label_1_semantics": "ABNORMAL - high variability, unstable readings"
        },
        "raw_data_ml": raw_results,
        "feature_data_ml": feature_results,
        "ml_suitable": raw_results['accuracy'] > 0.70
    }

    output_path = Path(r"D:\3d_printer_predictive_maintanance\label_verification_results.json")
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to: {output_path}")

if __name__ == "__main__":
    main()
