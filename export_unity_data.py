"""
Unity Data Export Script
Exports processed sensor and electrical data for Unity 3D printer digital twin playback.
Reuses existing processed CSV files and adds maintenance recommendations.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from datetime import datetime

# Paths
BASE_DIR = Path(__file__).resolve().parent
PROCESSED_PATH = BASE_DIR / "data" / "processed"
OUTPUT_PATH = BASE_DIR / "unity_data"

def load_sensor_data():
    """Load sensor data with health and anomaly information."""
    filepath = PROCESSED_PATH / "sensor_data_with_health_anomaly.csv"
    if not filepath.exists():
        raise FileNotFoundError(f"Sensor data file not found: {filepath}")
    
    df = pd.read_csv(filepath)
    print(f"Loaded sensor data: {len(df)} rows, {len(df.columns)} columns")
    return df

def load_electrical_data():
    """Load electrical context data."""
    filepath = PROCESSED_PATH / "electrical_context.csv"
    if not filepath.exists():
        raise FileNotFoundError(f"Electrical data file not found: {filepath}")
    
    df = pd.read_csv(filepath)
    print(f"Loaded electrical data: {len(df)} rows, {len(df.columns)} columns")
    return df

def add_maintenance_recommendations(df):
    """
    Add maintenance recommendations based on condition state.
    Mirrors the logic from backend/services/data_service.py.
    """
    recommendations = []
    priorities = []
    messages = []
    
    for _, row in df.iterrows():
        condition = row['condition_state']
        health_score = row['health_score']
        
        if condition == "NORMAL":
            recommendations.append("NO_ACTION")
            priorities.append("LOW")
            messages.append("Machine operating normally. Continue regular monitoring.")
        elif condition == "WARNING":
            recommendations.append("MONITOR")
            priorities.append("MEDIUM")
            messages.append("Machine health degraded. Increase monitoring frequency.")
        else:  # ABNORMAL
            recommendations.append("INSPECT")
            priorities.append("HIGH")
            messages.append("Machine condition abnormal. Schedule inspection and maintenance.")
    
    df = df.copy()
    df['maintenance_recommendation'] = recommendations
    df['maintenance_priority'] = priorities
    df['maintenance_message'] = messages
    
    return df

def export_sensor_playback(df):
    """
    Export simplified sensor playback CSV for Unity.
    
    Available fields from existing data:
    - timestamp: Window timestamp
    - vibration_rms: Combined acceleration RMS (m/s^2)
    - health_score: Health indicator (0-100%)
    - condition_state: NORMAL, WARNING, ABNORMAL
    - anomaly_detected: Boolean (using isolation_forest_is_anomaly)
    - anomaly_score: Isolation Forest anomaly score
    - maintenance_recommendation: Rule-based recommendation
    - maintenance_priority: LOW, MEDIUM, HIGH
    
    Note: Temperature and humidity are NOT available in the original dataset.
    These fields will be omitted rather than invented.
    """
    # Select and rename columns for Unity
    playback_cols = {
        'timestamp': 'timestamp',
        'combined_acceleration_rms': 'vibration_rms',
        'health_score': 'health_score',
        'condition_state': 'machine_status',
        'isolation_forest_is_anomaly': 'anomaly_detected',
        'isolation_forest_anomaly_score': 'anomaly_score',
        'maintenance_recommendation': 'maintenance_recommendation',
        'maintenance_priority': 'maintenance_priority',
    }
    
    # Create playback DataFrame
    playback_df = df[list(playback_cols.keys())].copy()
    playback_df.columns = playback_cols.values()
    
    # Sort by timestamp
    playback_df = playback_df.sort_values('timestamp')
    
    # Convert Booleans to integers for C# parsing
    playback_df['anomaly_detected'] = playback_df['anomaly_detected'].astype(int)
    
    # Handle NaN values
    playback_df = playback_df.fillna('')
    
    output_file = OUTPUT_PATH / "unity_sensor_playback.csv"
    playback_df.to_csv(output_file, index=False)
    print(f"Exported sensor playback: {output_file}")
    print(f"  Rows: {len(playback_df)}")
    print(f"  Columns: {list(playback_df.columns)}")
    print(f"  Time range: {playback_df['timestamp'].min()} to {playback_df['timestamp'].max()}")
    
    return playback_df

def export_electrical_playback(df):
    """
    Export electrical playback CSV for Unity.
    
    Available fields:
    - timestamp_datetime: Timestamp
    - time_sec: Time in seconds
    - voltage: Voltage (V)
    - current: Current (A)
    - active_power: Active power (W)
    - apparent_power: Apparent power (VA)
    - power_factor: Power factor
    - label: Printing stage label
    """
    # Select and rename columns for Unity
    playback_cols = {
        'timestamp_datetime': 'timestamp',
        'time_sec': 'time_sec',
        'voltage': 'voltage',
        'current': 'current',
        'active_power': 'active_power',
        'apparent_power': 'apparent_power',
        'power_factor': 'power_factor',
        'label': 'printing_stage',
    }
    
    # Create playback DataFrame
    playback_df = df[list(playback_cols.keys())].copy()
    playback_df.columns = playback_cols.values()
    
    # Sort by timestamp
    playback_df = playback_df.sort_values('timestamp')
    
    # Handle NaN values
    playback_df = playback_df.fillna('')
    
    output_file = OUTPUT_PATH / "unity_electrical_playback.csv"
    playback_df.to_csv(output_file, index=False)
    print(f"Exported electrical playback: {output_file}")
    print(f"  Rows: {len(playback_df)}")
    print(f"  Columns: {list(playback_df.columns)}")
    print(f"  Time range: {playback_df['timestamp'].min()} to {playback_df['timestamp'].max()}")
    
    return playback_df

def generate_schema(sensor_df, electrical_df):
    """
    Generate schema JSON documenting the Unity data files.
    """
    schema = {
        "generated_at": datetime.now().isoformat(),
        "source_project": "3D Printer Predictive Maintenance",
        "note": "Data exported from existing processed CSV files. No live sensor data required.",
        "files": [
            {
                "filename": "unity_sensor_playback.csv",
                "description": "Window-level sensor data with health, anomaly, and maintenance recommendations",
                "source_file": "data/processed/sensor_data_with_health_anomaly.csv",
                "processing_script": "health_anomaly_pipeline.py",
                "row_count": len(sensor_df),
                "columns": [
                    {
                        "name": "timestamp",
                        "type": "string",
                        "description": "Window timestamp (YYYY-MM-DD HH:MM:SS format)",
                        "unit": "datetime"
                    },
                    {
                        "name": "vibration_rms",
                        "type": "float",
                        "description": "Combined acceleration RMS (magnitude of 3-axis acceleration)",
                        "unit": "m/s^2",
                        "note": "Derived from Ax, Ay, Az acceleration data"
                    },
                    {
                        "name": "health_score",
                        "type": "float",
                        "description": "Health indicator (0-100%, higher is healthier)",
                        "unit": "percent",
                        "calculation": "Based on deviation from normal baseline"
                    },
                    {
                        "name": "machine_status",
                        "type": "string",
                        "description": "Condition state derived from health score",
                        "values": ["NORMAL", "WARNING", "ABNORMAL"],
                        "thresholds": "NORMAL >= 80%, WARNING 50-80%, ABNORMAL < 50%"
                    },
                    {
                        "name": "anomaly_detected",
                        "type": "integer",
                        "description": "Isolation Forest anomaly flag (0 = normal, 1 = anomaly)",
                        "values": [0, 1],
                        "method": "Isolation Forest (contamination=0.05)"
                    },
                    {
                        "name": "anomaly_score",
                        "type": "float",
                        "description": "Isolation Forest anomaly score (higher = more anomalous)",
                        "unit": "score",
                        "method": "Isolation Forest score_samples (negated to positive)"
                    },
                    {
                        "name": "maintenance_recommendation",
                        "type": "string",
                        "description": "Rule-based maintenance action",
                        "values": ["NO_ACTION", "MONITOR", "INSPECT"]
                    },
                    {
                        "name": "maintenance_priority",
                        "type": "string",
                        "description": "Priority level for maintenance action",
                        "values": ["LOW", "MEDIUM", "HIGH"]
                    }
                ],
                "missing_value_handling": "Empty string for NaN values",
                "data_gaps": [
                    "Temperature data: NOT AVAILABLE in original dataset",
                    "Humidity data: NOT AVAILABLE in original dataset",
                    "Data is window-level aggregated, not raw sensor readings"
                ]
            },
            {
                "filename": "unity_electrical_playback.csv",
                "description": "Electrical power measurements with printing stage labels",
                "source_file": "data/processed/electrical_context.csv",
                "processing_script": "electrical_analysis.py",
                "row_count": len(electrical_df),
                "columns": [
                    {
                        "name": "timestamp",
                        "type": "string",
                        "description": "Timestamp (YYYY-MM-DD HH:MM:SS.fff format)",
                        "unit": "datetime"
                    },
                    {
                        "name": "time_sec",
                        "type": "float",
                        "description": "Elapsed time in seconds",
                        "unit": "seconds"
                    },
                    {
                        "name": "voltage",
                        "type": "float",
                        "description": "Voltage measurement",
                        "unit": "V (volts)"
                    },
                    {
                        "name": "current",
                        "type": "float",
                        "description": "Current measurement",
                        "unit": "A (amperes)"
                    },
                    {
                        "name": "active_power",
                        "type": "float",
                        "description": "Active power consumption",
                        "unit": "W (watts)"
                    },
                    {
                        "name": "apparent_power",
                        "type": "float",
                        "description": "Apparent power",
                        "unit": "VA (volt-amperes)"
                    },
                    {
                        "name": "power_factor",
                        "type": "float",
                        "description": "Power factor (ratio of active to apparent power)",
                        "unit": "dimensionless"
                    },
                    {
                        "name": "printing_stage",
                        "type": "integer",
                        "description": "Printing stage label from dataset",
                        "values": "Integer labels (semantics defined in source dataset)"
                    }
                ],
                "missing_value_handling": "Empty string for NaN values",
                "sample_rate": "250ms intervals (4 Hz)",
                "data_gaps": [
                    "Electrical data is at higher temporal resolution than sensor windows",
                    "Cannot synchronize with sensor data - treat as separate context"
                ]
            }
        ],
        "limitations": [
            "Sensor data is window-level aggregated features, not raw time-series",
            "Electrical and sensor data have different timestamps and cannot be synchronized",
            "Temperature and humidity sensors are not present in the original dataset",
            "Maintenance recommendations are rule-based, not ML-driven",
            "No Remaining Useful Life (RUL) predictions included",
            "Data is from historical recordings, not live ESP32 streaming"
        ],
        "integration_notes": [
            "Place CSV files in Unity Assets/StreamingAssets/ folder",
            "Parse rows sequentially for playback",
            "Use configurable interval for playback speed",
            "Handle empty strings as missing values",
            "Parse anomaly_detected as integer (0 or 1)",
            "Parse health_score as float percentage"
        ]
    }
    
    output_file = OUTPUT_PATH / "unity_data_schema.json"
    with open(output_file, 'w') as f:
        json.dump(schema, f, indent=2)
    print(f"Generated schema: {output_file}")
    
    return schema

def validate_outputs(sensor_df, electrical_df):
    """
    Validate exported files and report statistics.
    """
    print("\n" + "="*80)
    print("VALIDATION REPORT")
    print("="*80)
    
    # Sensor validation
    print("\nSensor Playback (unity_sensor_playback.csv):")
    print(f"  Total rows: {len(sensor_df)}")
    print(f"  Columns: {len(sensor_df.columns)}")
    print(f"  Time range: {sensor_df['timestamp'].min()} to {sensor_df['timestamp'].max()}")
    print(f"  Missing values: {sensor_df.isnull().sum().sum()}")
    print(f"  Health score range: {sensor_df['health_score'].min():.1f}% to {sensor_df['health_score'].max():.1f}%")
    print(f"  Status distribution:")
    print(f"    NORMAL: {(sensor_df['machine_status'] == 'NORMAL').sum()}")
    print(f"    WARNING: {(sensor_df['machine_status'] == 'WARNING').sum()}")
    print(f"    ABNORMAL: {(sensor_df['machine_status'] == 'ABNORMAL').sum()}")
    print(f"  Anomalies detected: {sensor_df['anomaly_detected'].sum()}")
    print(f"  Maintenance distribution:")
    print(f"    NO_ACTION: {(sensor_df['maintenance_recommendation'] == 'NO_ACTION').sum()}")
    print(f"    MONITOR: {(sensor_df['maintenance_recommendation'] == 'MONITOR').sum()}")
    print(f"    INSPECT: {(sensor_df['maintenance_recommendation'] == 'INSPECT').sum()}")
    
    # Electrical validation
    print("\nElectrical Playback (unity_electrical_playback.csv):")
    print(f"  Total rows: {len(electrical_df)}")
    print(f"  Columns: {len(electrical_df.columns)}")
    print(f"  Time range: {electrical_df['timestamp'].min()} to {electrical_df['timestamp'].max()}")
    print(f"  Duration: {electrical_df['time_sec'].max():.2f} seconds")
    print(f"  Missing values: {electrical_df.isnull().sum().sum()}")
    print(f"  Voltage range: {electrical_df['voltage'].min():.2f}V to {electrical_df['voltage'].max():.2f}V")
    print(f"  Current range: {electrical_df['current'].min():.3f}A to {electrical_df['current'].max():.3f}A")
    print(f"  Power range: {electrical_df['active_power'].min():.2f}W to {electrical_df['active_power'].max():.2f}W")
    
    # Known gaps
    print("\nKnown Data Gaps:")
    print("  - Temperature: NOT AVAILABLE in original dataset")
    print("  - Humidity: NOT AVAILABLE in original dataset")
    print("  - Sensor and electrical data have different timestamps (not synchronized)")
    
    print("\n" + "="*80)
    print("VALIDATION COMPLETE")
    print("="*80)

def main():
    print("Unity Data Export Script")
    print("="*80)
    
    # Ensure output directory exists
    OUTPUT_PATH.mkdir(exist_ok=True)
    
    # Load data
    print("\n1. Loading processed data...")
    sensor_df = load_sensor_data()
    electrical_df = load_electrical_data()
    
    # Add maintenance recommendations
    print("\n2. Adding maintenance recommendations...")
    sensor_df = add_maintenance_recommendations(sensor_df)
    
    # Export sensor playback
    print("\n3. Exporting sensor playback CSV...")
    sensor_playback = export_sensor_playback(sensor_df)
    
    # Export electrical playback
    print("\n4. Exporting electrical playback CSV...")
    electrical_playback = export_electrical_playback(electrical_df)
    
    # Generate schema
    print("\n5. Generating data schema...")
    schema = generate_schema(sensor_playback, electrical_playback)
    
    # Validate outputs
    print("\n6. Validating outputs...")
    validate_outputs(sensor_playback, electrical_playback)
    
    print("\nExport complete! Files ready for Unity integration.")
    print(f"Output directory: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
