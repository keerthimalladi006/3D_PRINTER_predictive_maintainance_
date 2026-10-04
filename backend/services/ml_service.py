"""
ML Prediction Service
Provides real-time classification using trained models.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import pickle
import json
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from imblearn.over_sampling import SMOTE

PROCESSED_PATH = Path(r"D:\3d_printer_predictive_maintanance\data\processed")
MODEL_PATH = Path(r"D:\3d_printer_predictive_maintanance\backend\models")
MODEL_PATH.mkdir(parents=True, exist_ok=True)


class MLService:
    """Service for ML-based predictions."""

    def __init__(self):
        self.model = None
        self.feature_cols = None
        self.scaler = None
        self._load_or_train_model()

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


# Singleton instance
ml_service = MLService()
