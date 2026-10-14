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
from datetime import datetime, timedelta
from pytz import timezone

BASE_DIR = Path(__file__).resolve().parents[2]
PROCESSED_PATH = BASE_DIR / "data" / "processed"


class DataService:
    """Service class for data access and processing."""

    def __init__(self):
        self._health_data = None
        self._electrical_data = None
        self._baseline = None

    def _clean_row(self, row: Dict) -> Dict:
        """Clean NaN values from a row dictionary."""
        return {k: (v if pd.notna(v) else None) for k, v in row.items()}

    def _adjust_timestamps_to_current(self, df: pd.DataFrame, time_col: str = 'Date_Time') -> pd.DataFrame:
        """
        Dynamically adjust timestamps so the last reading is at current time.
        
        Args:
            df: DataFrame with timestamp column
            time_col: Name of timestamp column
            
        Returns:
            DataFrame with timestamps adjusted to end at current time (IST)
        """
        df = df.copy()
        
        if time_col not in df.columns:
            return df
        
        # Parse original timestamps
        original_times = pd.to_datetime(df[time_col], errors='coerce')
        
        if len(original_times) == 0:
            return df
        
        # Calculate time deltas from the LAST reading (not first)
        last_time = original_times.iloc[-1]
        time_deltas = original_times - last_time  # These will be negative or zero
        
        # Set the last reading to current time in IST (UTC+5:30)
        ist = timezone('Asia/Kolkata')
        current_end = datetime.now(ist)
        
        # Apply time deltas to current end time
        new_times = current_end + time_deltas
        
        # Update timestamp column
        df[time_col] = new_times
        
        # Also update timestamp column if it exists (for API responses)
        if 'timestamp' in df.columns:
            df['timestamp'] = new_times.dt.strftime('%Y-%m-%d %H:%M')
        
        # Update timestamp_datetime if it exists (for electrical data)
        if 'timestamp_datetime' in df.columns:
            df['timestamp_datetime'] = new_times
        
        return df

    def load_health_data(self) -> pd.DataFrame:
        """Load health and anomaly data with dynamic timestamp adjustment."""
        filepath = PROCESSED_PATH / "sensor_data_with_health_anomaly.csv"
        health_df = pd.read_csv(filepath)
        # Dynamically adjust timestamps to current time
        health_df = self._adjust_timestamps_to_current(health_df, 'Date_Time')
        return health_df

    def load_electrical_data(self) -> pd.DataFrame:
        """Load electrical context data with dynamic timestamp adjustment."""
        filepath = PROCESSED_PATH / "electrical_context.csv"
        electrical_df = pd.read_csv(filepath)
        # Dynamically adjust timestamps to current time
        if 'timestamp_datetime' in electrical_df.columns:
            electrical_df = self._adjust_timestamps_to_current(electrical_df, 'timestamp_datetime')
        return electrical_df

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

            # Transform to match expected format for frontend
            # Convert raw Ax, Ay, Az to the format expected by vibration page
            result = []
            for _, row in recent_data.iterrows():
                # Format timestamp as string
                ts = row.get('Date_Time', row.get('timestamp', ''))
                if isinstance(ts, pd.Timestamp):
                    ts = ts.strftime('%Y-%m-%d %H:%M:%S.%f')
                
                result.append({
                    'window_index': row.get('window_index', 0),
                    'timestamp': ts,
                    'Ax(m/s^2)_mean': row.get('Ax', 0),
                    'Ay(m/s^2)_mean': row.get('Ay', 0),
                    'Az(m/s^2)_mean': row.get('Az', 0),
                    'Gx(deg/s)_mean': 0,  # No gyroscope data, set to 0
                    'Gy(deg/s)_mean': 0,  # No gyroscope data, set to 0
                    'Gz(deg/s)_mean': 0,  # No gyroscope data, set to 0
                    'condition_state': row.get('condition_state', 'NORMAL'),
                    'health_score': row.get('health_score', 100),
                    'Ax': row.get('Ax', 0),
                    'Ay': row.get('Ay', 0),
                    'Az': row.get('Az', 0),
                    'Gx': 0,
                    'Gy': 0,
                    'Gz': 0,
                })
            return result

    def get_health_data(self, limit: int = 100) -> List[Dict]:
        """
        Get health indicator data.

        Returns health scores and condition states.
        """
        health_df = self.load_health_data()

        # Select only health-related columns that exist
        available_cols = list(health_df.columns)
        health_cols = [
            'window_index', 'timestamp', 'label',
            'health_score', 'condition_state',
            'statistical_anomaly_score', 'statistical_is_anomaly',
            'isolation_forest_anomaly_score', 'isolation_forest_is_anomaly'
        ]
        
        # Only select columns that exist
        health_cols = [col for col in health_cols if col in available_cols]

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

        # Format timestamps
        for row in electrical_data:
            ts = row.get('timestamp_datetime', '')
            if isinstance(ts, pd.Timestamp):
                row['timestamp_datetime'] = ts.strftime('%Y-%m-%d %H:%M:%S.%f')

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

    def get_raw_sensor_data(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Get raw 3D printer sensor data from CSV.

        Args:
            limit: Number of rows to return (default: all)

        Returns:
            Raw sensor readings with timestamps adjusted to current time.
        """
        health_df = self.load_health_data()

        # Select sensor columns
        sensor_cols = [
            'Date_Time', 'Time_ms', 'Ax', 'Ay', 'Az',
            'DHT_Temperature', 'Humidity', 'DS18B20_Temperature',
            'health_score', 'condition_state',
            'statistical_anomaly_score', 'statistical_is_anomaly',
            'isolation_forest_anomaly_score', 'isolation_forest_is_anomaly'
        ]

        if limit:
            sensor_data = health_df[sensor_cols].tail(limit)
        else:
            sensor_data = health_df[sensor_cols]

        return sensor_data.to_dict('records')


# Singleton instance
data_service = DataService()
