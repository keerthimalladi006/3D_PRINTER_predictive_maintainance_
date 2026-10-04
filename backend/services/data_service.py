"""
Data Service Layer
Handles all data access and processing logic.
Separated from API routes for maintainability.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional
import json

PROCESSED_PATH = Path(r"D:\3d_printer_predictive_maintanance\data\processed")


class DataService:
    """Service class for data access and processing."""

    def __init__(self):
        self._health_data = None
        self._electrical_data = None
        self._baseline = None

    def _clean_row(self, row: Dict) -> Dict:
        """Clean NaN values from a row dictionary."""
        return {k: (v if pd.notna(v) else None) for k, v in row.items()}

    def load_health_data(self) -> pd.DataFrame:
        """Load health and anomaly data."""
        if self._health_data is None:
            filepath = PROCESSED_PATH / "sensor_data_with_health_anomaly.csv"
            self._health_data = pd.read_csv(filepath)
        return self._health_data

    def load_electrical_data(self) -> pd.DataFrame:
        """Load electrical context data."""
        if self._electrical_data is None:
            filepath = PROCESSED_PATH / "electrical_context.csv"
            self._electrical_data = pd.read_csv(filepath)
        return self._electrical_data

    def load_baseline(self) -> Dict:
        """Load statistical baseline."""
        if self._baseline is None:
            filepath = PROCESSED_PATH / "statistical_baseline.json"
            with open(filepath, 'r') as f:
                self._baseline = json.load(f)
        return self._baseline

    def get_machine_status(self, limit: int = 100) -> List[Dict]:
        """
        Get current machine status combining health and electrical data.

        Returns the most recent status entries.
        """
        health_df = self.load_health_data()
        electrical_df = self.load_electrical_data()

        # Get recent health data
        recent_health = health_df.tail(limit).to_dict('records')

        # Get recent electrical data (downsample if needed)
        recent_electrical = electrical_df.tail(limit).to_dict('records')

        # Clean NaN values from data
        def clean_data(data):
            if isinstance(data, dict):
                return {k: (v if pd.notna(v) else None) for k, v in data.items()}
            return data

        recent_health = [clean_data(row) for row in recent_health]
        recent_electrical = [clean_data(row) for row in recent_electrical]

        # Combine (note: cannot synchronize, so return as separate context)
        status = {
            "health_status": recent_health,
            "electrical_context": recent_electrical,
            "summary": {
                "total_health_windows": len(health_df),
                "total_electrical_samples": len(electrical_df),
                "avg_health_score": float(health_df['health_score'].mean()),
                "current_condition": self._get_most_recent_condition(health_df),
            }
        }

        return status

    def _get_most_recent_condition(self, health_df: pd.DataFrame) -> str:
        """Get the most recent condition state."""
        return health_df.iloc[-1]['condition_state']

    def get_vibration_features(self, window_index: Optional[int] = None, limit: int = 100) -> List[Dict]:
        """
        Get vibration features.

        Args:
            window_index: Specific window index (optional)
            limit: Number of windows to return if no index specified
        """
        health_df = self.load_health_data()

        if window_index is not None:
            # Return specific window
            window_data = health_df[health_df['window_index'] == window_index]
            if len(window_data) == 0:
                return []
            # Clean NaN values
            window_data = window_data.fillna(0)
            return window_data.to_dict('records')
        else:
            # Return recent windows
            recent_data = health_df.tail(limit)
            # Clean NaN values
            recent_data = recent_data.fillna(0)
            return recent_data.to_dict('records')

    def get_health_data(self, limit: int = 100) -> List[Dict]:
        """
        Get health indicator data.

        Returns health scores and condition states.
        """
        health_df = self.load_health_data()

        # Select only health-related columns
        health_cols = [
            'window_index', 'timestamp', 'label',
            'health_score', 'condition_state',
            'statistical_anomaly_score', 'statistical_is_anomaly',
            'isolation_forest_anomaly_score', 'isolation_forest_is_anomaly'
        ]

        health_data = health_df[health_cols].tail(limit).to_dict('records')

        # Add summary statistics
        summary = {
            "avg_health_score": float(health_df['health_score'].mean()),
            "min_health_score": float(health_df['health_score'].min()),
            "max_health_score": float(health_df['health_score'].max()),
            "std_health_score": float(health_df['health_score'].std()),
            "condition_distribution": {
                "NORMAL": int((health_df['condition_state'] == 'NORMAL').sum()),
                "WARNING": int((health_df['condition_state'] == 'WARNING').sum()),
                "ABNORMAL": int((health_df['condition_state'] == 'ABNORMAL').sum()),
            },
            "statistical_anomaly_count": int(health_df['statistical_is_anomaly'].sum()),
            "isolation_forest_anomaly_count": int(health_df['isolation_forest_is_anomaly'].sum()),
        }

        return {
            "health_data": health_data,
            "summary": summary
        }

    def get_anomalies(self, method: str = "both", limit: int = 50) -> List[Dict]:
        """
        Get detected anomalies.

        Args:
            method: "statistical", "isolation_forest", or "both"
            limit: Maximum number of anomalies to return
        """
        health_df = self.load_health_data()

        if method == "statistical":
            anomalies = health_df[health_df['statistical_is_anomaly'] == True]
        elif method == "isolation_forest":
            anomalies = health_df[health_df['isolation_forest_is_anomaly'] == True]
        else:  # both
            anomalies = health_df[
                (health_df['statistical_is_anomaly'] == True) |
                (health_df['isolation_forest_is_anomaly'] == True)
            ]

        # Select relevant columns
        anomaly_cols = [
            'window_index', 'timestamp', 'label',
            'health_score', 'condition_state',
            'statistical_anomaly_score', 'statistical_is_anomaly',
            'isolation_forest_anomaly_score', 'isolation_forest_is_anomaly'
        ]

        anomaly_data = anomalies[anomaly_cols].tail(limit).to_dict('records')

        return {
            "anomalies": anomaly_data,
            "total_count": len(anomalies),
            "method": method
        }

    def get_maintenance_recommendations(self) -> Dict:
        """
        Get maintenance recommendations based on current health state.

        Note: This is a simple rule-based system.
        For a production system, this would use more sophisticated logic.
        """
        health_df = self.load_health_data()

        recent_health = health_df.tail(10)  # Last 10 windows
        avg_health = recent_health['health_score'].mean()
        current_condition = recent_health.iloc[-1]['condition_state']

        # Simple rule-based recommendations
        if current_condition == "NORMAL":
            recommendation = {
                "action": "NO_ACTION",
                "priority": "LOW",
                "message": "Machine operating normally. Continue regular monitoring.",
                "health_score": float(avg_health),
            }
        elif current_condition == "WARNING":
            recommendation = {
                "action": "MONITOR",
                "priority": "MEDIUM",
                "message": "Machine health degraded. Increase monitoring frequency.",
                "health_score": float(avg_health),
            }
        else:  # ABNORMAL
            recommendation = {
                "action": "INSPECT",
                "priority": "HIGH",
                "message": "Machine condition abnormal. Schedule inspection and maintenance.",
                "health_score": float(avg_health),
            }

        # Add anomaly context
        recent_anomalies = recent_health[
            (recent_health['statistical_is_anomaly'] == True) |
            (recent_health['isolation_forest_is_anomaly'] == True)
        ]

        recommendation["recent_anomaly_count"] = len(recent_anomalies)

        return recommendation

    def get_electrical_context(self, limit: int = 100) -> List[Dict]:
        """
        Get electrical power context data.
        """
        electrical_df = self.load_electrical_data()

        # Select relevant columns
        electrical_cols = [
            'time_ms', 'time_sec', 'active_power', 'current', 'voltage',
            'label', 'timestamp_datetime', 'apparent_power', 'power_factor'
        ]

        electrical_data = electrical_df[electrical_cols].tail(limit).to_dict('records')

        # Add summary
        summary = {
            "avg_power": float(electrical_df['active_power'].mean()),
            "avg_current": float(electrical_df['current'].mean()),
            "avg_voltage": float(electrical_df['voltage'].mean()),
            "duration_seconds": float(electrical_df['time_sec'].max()),
            "label_distribution": electrical_df['label'].value_counts().to_dict(),
        }

        return {
            "electrical_data": electrical_data,
            "summary": summary
        }


# Singleton instance
data_service = DataService()
