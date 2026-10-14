"""
ML Prediction Service
Provides real-time classification using trained models.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import pickle
import json
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE

BASE_DIR = Path(__file__).resolve().parents[2]
PROCESSED_PATH = BASE_DIR / "data" / "processed"
MODEL_PATH = Path(__file__).resolve().parents[1] / "models"
MODEL_PATH.mkdir(parents=True, exist_ok=True)


class MLService:
    """Service for ML-based predictions."""

    def __init__(self):
        self.model = None
        self.feature_cols = None
        self.scaler = None
        self.iso_forest = None
        self.iso_scaler = None
        self.iso_feature_cols = None
        self._load_or_train_model()
        self._load_isolation_forest()

    def _load_or_train_model(self):
        """Load existing model or train new one."""
        model_file = MODEL_PATH / "classification_model.pkl"
        metadata_file = MODEL_PATH / "model_metadata.json"

        if model_file.exists() and metadata_file.exists():
            # Load existing model
            with open(model_file, 'rb') as f:
                self.model = pickle.load(f)
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
                self.feature_cols = metadata['feature_cols']
            print("ML Model loaded from disk")
        else:
            # Train new model
            self._train_model()
            self._save_model()

    def _train_model(self):
        """Train Gradient Boosting model with SMOTE."""
        print("Training ML model with SMOTE...")

        # Load features
        features_df = pd.read_csv(PROCESSED_PATH / "sensor_data_features.csv")

        # Select feature columns
        self.feature_cols = [col for col in features_df.columns
                            if col not in ['window_index', 'window_start', 'window_end',
                                         'window_size', 'timestamp', 'label']
                            and features_df[col].dtype in ['float64', 'int64']]

        X = features_df[self.feature_cols].fillna(0).values
        y = features_df['label'].values

        # Train-test split
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.3, random_state=42, stratify=y
        )

        # Apply SMOTE
        smote = SMOTE(random_state=42, k_neighbors=5)
        X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)

        # Train Gradient Boosting (best performer)
        self.model = GradientBoostingClassifier(
            n_estimators=100,
            random_state=42,
            max_depth=5
        )
        self.model.fit(X_train_resampled, y_train_resampled)

        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = (y_pred == y_test).mean()
        print(f"Model trained. Test accuracy: {accuracy:.4f}")

    def _save_model(self):
        """Save model and metadata."""
        with open(MODEL_PATH / "classification_model.pkl", 'wb') as f:
            pickle.dump(self.model, f)

        metadata = {
            'feature_cols': self.feature_cols,
            'model_type': 'GradientBoostingClassifier',
            'training_samples': len(self.feature_cols),
            'version': '1.0'
        }

        with open(MODEL_PATH / "model_metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)

        print("Model saved to disk")

    def predict(self, features_dict):
        """
        Predict condition from feature dictionary.

        Args:
            features_dict: Dictionary of feature names to values

        Returns:
            Dictionary with prediction and confidence
        """
        if self.model is None:
            return {"error": "Model not loaded"}

        # Extract features in correct order
        X = np.array([[features_dict.get(col, 0) for col in self.feature_cols]])

        # Predict
        prediction = int(self.model.predict(X)[0])
        probability = float(self.model.predict_proba(X)[0, 1])

        # Map prediction to label
        label_map = {0: "NORMAL", 1: "ABNORMAL"}
        condition = label_map.get(prediction, "UNKNOWN")

        # Confidence calculation
        confidence = max(probability, 1 - probability)

        return {
            "prediction": prediction,
            "condition": condition,
            "abnormal_probability": probability,
            "confidence": confidence,
            "model_version": "1.0"
        }

    def predict_batch(self, features_list):
        """
        Predict condition for multiple feature sets.

        Args:
            features_list: List of feature dictionaries

        Returns:
            List of prediction results
        """
        results = []
        for features in features_list:
            result = self.predict(features)
            results.append(result)
        return results

    def _load_isolation_forest(self):
        """Load Isolation Forest model for anomaly detection."""
        iso_model_file = MODEL_PATH / "isolation_forest_model.pkl"
        iso_scaler_file = MODEL_PATH / "isolation_forest_scaler.pkl"
        iso_metadata_file = MODEL_PATH / "isolation_forest_metadata.json"

        if iso_model_file.exists() and iso_scaler_file.exists() and iso_metadata_file.exists():
            try:
                with open(iso_model_file, 'rb') as f:
                    self.iso_forest = pickle.load(f)
                with open(iso_scaler_file, 'rb') as f:
                    self.iso_scaler = pickle.load(f)
                with open(iso_metadata_file, 'r') as f:
                    metadata = json.load(f)
                    self.iso_feature_cols = metadata['feature_cols']
                print("Isolation Forest model loaded from disk")
            except Exception as e:
                print(f"Failed to load Isolation Forest: {e}")
                self.iso_forest = None
        else:
            print("Isolation Forest model not found")

    def predict_anomaly(self, features_dict):
        """
        Predict anomaly using Isolation Forest (unsupervised).

        Args:
            features_dict: Dictionary of feature names to values

        Returns:
            Dictionary with anomaly prediction and score
        """
        if self.iso_forest is None or self.iso_scaler is None:
            return {"error": "Isolation Forest model not loaded"}

        # Extract features in correct order
        X = np.array([[features_dict.get(col, 0) for col in self.iso_feature_cols]])

        # Scale features
        X_scaled = self.iso_scaler.transform(X)

        # Predict
        prediction = int(self.iso_forest.predict(X_scaled)[0])
        anomaly_score = float(-self.iso_forest.score_samples(X_scaled)[0])

        # Map prediction (-1=anomaly, 1=normal)
        is_anomaly = prediction == -1
        condition = "ABNORMAL" if is_anomaly else "NORMAL"

        return {
            "prediction": prediction,
            "condition": condition,
            "is_anomaly": is_anomaly,
            "anomaly_score": anomaly_score,
            "model_type": "IsolationForest"
        }


# Singleton instance
ml_service = MLService()
