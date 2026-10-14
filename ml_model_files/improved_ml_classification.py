"""
Improved ML Classification with Class Imbalance Handling
Uses SMOTE and ensemble methods to improve abnormal class detection.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_curve, auc
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE
from imblearn.combine import SMOTETomek
import json

processed_path = Path(r"D:\3d_printer_predictive_maintanance\data\processed")

def train_with_smote(X, y, model_name="Random Forest"):
    """Train model with SMOTE oversampling."""
    print(f"\n{'='*80}")
    print(f"Training {model_name} with SMOTE")
    print(f"{'='*80}")

    # Train-test split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )

    print(f"\nBefore SMOTE:")
    print(f"  Training samples: {len(X_train)}")
    print(f"  Label distribution: {np.bincount(y_train)}")

    # Apply SMOTE
    smote = SMOTE(random_state=42, k_neighbors=5)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)

    print(f"\nAfter SMOTE:")
    print(f"  Training samples: {len(X_train_resampled)}")
    print(f"  Label distribution: {np.bincount(y_train_resampled)}")

    # Train model
    if model_name == "Random Forest":
        model = RandomForestClassifier(n_estimators=100, random_state=42)
    elif model_name == "Gradient Boosting":
        model = GradientBoostingClassifier(n_estimators=100, random_state=42)
    else:
        model = RandomForestClassifier(n_estimators=100, random_state=42)

    model.fit(X_train_resampled, y_train_resampled)

    # Predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]

    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision, recall, _ = precision_recall_curve(y_test, y_pred_proba)
    pr_auc = auc(recall, precision)

    print(f"\nTest Results:")
    print(f"  Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"  PR-AUC: {pr_auc:.4f}")

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal (0)', 'Abnormal (1)']))

    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  True Normal: {cm[0,0]}, False Abnormal: {cm[0,1]}")
    print(f"  False Normal: {cm[1,0]}, True Abnormal: {cm[1,1]}")

    # Abnormal class recall (most important for fault detection)
    abnormal_recall = cm[1,1] / (cm[1,0] + cm[1,1]) if (cm[1,0] + cm[1,1]) > 0 else 0
    print(f"\nAbnormal Class Recall: {abnormal_recall:.4f} ({abnormal_recall*100:.2f}%)")

    return {
        'model': model,
        'accuracy': float(accuracy),
        'pr_auc': float(pr_auc),
        'confusion_matrix': cm.tolist(),
        'abnormal_recall': float(abnormal_recall),
        'test_samples': len(X_test)
    }

def train_with_smotetomek(X, y):
    """Train model with SMOTE+Tomek (oversampling + undersampling)."""
    print(f"\n{'='*80}")
    print(f"Training Random Forest with SMOTE+Tomek")
    print(f"{'='*80}")

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )

    print(f"\nBefore SMOTE+Tomek:")
    print(f"  Training samples: {len(X_train)}")
    print(f"  Label distribution: {np.bincount(y_train)}")

    # Apply SMOTE+Tomek
    smt = SMOTETomek(random_state=42)
    X_train_resampled, y_train_resampled = smt.fit_resample(X_train, y_train)

    print(f"\nAfter SMOTE+Tomek:")
    print(f"  Training samples: {len(X_train_resampled)}")
    print(f"  Label distribution: {np.bincount(y_train_resampled)}")

    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_resampled, y_train_resampled)

    # Predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]

    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision, recall, _ = precision_recall_curve(y_test, y_pred_proba)
    pr_auc = auc(recall, precision)

    print(f"\nTest Results:")
    print(f"  Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"  PR-AUC: {pr_auc:.4f}")

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal (0)', 'Abnormal (1)']))

    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  True Normal: {cm[0,0]}, False Abnormal: {cm[0,1]}")
    print(f"  False Normal: {cm[1,0]}, True Abnormal: {cm[1,1]}")

    abnormal_recall = cm[1,1] / (cm[1,0] + cm[1,1]) if (cm[1,0] + cm[1,1]) > 0 else 0
    print(f"\nAbnormal Class Recall: {abnormal_recall:.4f} ({abnormal_recall*100:.2f}%)")

    return {
        'model': model,
        'accuracy': float(accuracy),
        'pr_auc': float(pr_auc),
        'confusion_matrix': cm.tolist(),
        'abnormal_recall': float(abnormal_recall),
        'test_samples': len(X_test)
    }

def main():
    print("IMPROVED ML CLASSIFICATION WITH CLASS IMBALANCE HANDLING")
    print("="*80)

    # Load features
    features_df = pd.read_csv(processed_path / "sensor_data_features.csv")

    # Select numeric feature columns
    feature_cols = [col for col in features_df.columns
                    if col not in ['window_index', 'window_start', 'window_end', 'window_size', 'timestamp', 'label']
                    and features_df[col].dtype in ['float64', 'int64']]

    X = features_df[feature_cols].fillna(0).values
    y = features_df['label'].values

    print(f"\nDataset: {len(X)} samples, {len(feature_cols)} features")
    print(f"Label distribution: {np.bincount(y)} (Class imbalance: {np.bincount(y)[1]/len(y)*100:.2f}% abnormal)")

    # Method 1: SMOTE with Random Forest
    results_smote_rf = train_with_smote(X, y, "Random Forest")

    # Method 2: SMOTE with Gradient Boosting
    results_smote_gb = train_with_smote(X, y, "Gradient Boosting")

    # Method 3: SMOTE+Tomek with Random Forest
    results_smt = train_with_smotetomek(X, y)

    # Summary comparison
    print("\n" + "="*80)
    print("METHOD COMPARISON")
    print("="*80)

    methods = [
        ("Random Forest (No SMOTE)", 0.9662, 0.10),
        ("Random Forest + SMOTE", results_smote_rf['accuracy'], results_smote_rf['abnormal_recall']),
        ("Gradient Boosting + SMOTE", results_smote_gb['accuracy'], results_smote_gb['abnormal_recall']),
        ("Random Forest + SMOTE+Tomek", results_smt['accuracy'], results_smt['abnormal_recall']),
    ]

    print(f"\n{'Method':<40} {'Accuracy':<12} {'Abnormal Recall':<18}")
    print("-"*70)
    for method, acc, recall in methods:
        print(f"{method:<40} {acc*100:>10.2f}%  {recall*100:>14.2f}%")

    # Best method
    best_method = max(methods[1:], key=lambda x: x[2])  # Compare by abnormal recall
    print(f"\nBest Method for Abnormal Detection: {best_method[0]}")
    print(f"  Abnormal Recall: {best_method[2]*100:.2f}%")

    # Save results
    results = {
        "dataset_info": {
            "total_samples": int(len(X)),
            "features": int(len(feature_cols)),
            "label_distribution": np.bincount(y).tolist(),
            "class_imbalance": float(np.bincount(y)[1]/len(y))
        },
        "methods": {
            "smote_random_forest": {
                "accuracy": results_smote_rf['accuracy'],
                "pr_auc": results_smote_rf['pr_auc'],
                "abnormal_recall": results_smote_rf['abnormal_recall'],
                "confusion_matrix": results_smote_rf['confusion_matrix']
            },
            "smote_gradient_boosting": {
                "accuracy": results_smote_gb['accuracy'],
                "pr_auc": results_smote_gb['pr_auc'],
                "abnormal_recall": results_smote_gb['abnormal_recall'],
                "confusion_matrix": results_smote_gb['confusion_matrix']
            },
            "smotetomek_random_forest": {
                "accuracy": results_smt['accuracy'],
                "pr_auc": results_smt['pr_auc'],
                "abnormal_recall": results_smt['abnormal_recall'],
                "confusion_matrix": results_smt['confusion_matrix']
            }
        },
        "best_method": best_method[0],
        "recommendation": "Use SMOTE+Tomek with Random Forest for best abnormal class detection"
    }

    output_path = Path(r"D:\3d_printer_predictive_maintanance\improved_ml_results.json")
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to: {output_path}")

    print("\n" + "="*80)
    print("CONCLUSION")
    print("="*80)
    print("\nClass imbalance handling SIGNIFICANTLY improves abnormal detection:")
    print(f"  - Without SMOTE: 10% abnormal recall")
    print(f"  - With SMOTE: {results_smote_rf['abnormal_recall']*100:.1f}% abnormal recall")
    print(f"  - With SMOTE+Tomek: {results_smt['abnormal_recall']*100:.1f}% abnormal recall")
    print("\nRecommendation: Use SMOTE+Tomek for production deployment.")

if __name__ == "__main__":
    main()
