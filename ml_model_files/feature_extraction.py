"""
Feature Extraction Pipeline
Extracts time-domain features from vibration sensor data.
Given the low sampling rate (~4.7 Hz), frequency-domain features are not appropriate.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json

dataset_path = Path(r"D:\3d_printer_predictive_maintanance\dataset")
output_path = Path(r"D:\3d_printer_predictive_maintanance\data\processed")
output_path.mkdir(parents=True, exist_ok=True)

def extract_window_features(signal):
    """Extract time-domain features from a signal window."""
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

    # Crest factor (only if RMS > 0)
    if features["rms"] > 0:
        features["crest_factor"] = features["peak"] / features["rms"]
    else:
        features["crest_factor"] = np.nan

    # Shape factor
    if features["mean"] > 0:
        features["shape_factor"] = features["rms"] / features["mean"]
    else:
        features["shape_factor"] = np.nan

    # Impulse factor
    if features["mean"] > 0:
        features["impulse_factor"] = features["peak"] / features["mean"]
    else:
        features["impulse_factor"] = np.nan

    return features

def extract_features_from_file(filepath, window_size_seconds=2.0, sampling_rate_hz=4.7):
    """
    Extract windowed features from a vibration sensor file.

    Parameters:
    - filepath: Path to the CSV file
    - window_size_seconds: Size of each window in seconds
    - sampling_rate_hz: Approximate sampling rate in Hz

    Window size justification:
    - Sampling rate: ~4.7 Hz
    - Window size: 2 seconds = ~9-10 samples per window
    - This provides enough samples for statistical feature calculation
    - Smaller windows would have too few samples for reliable statistics
    """
    df = pd.read_csv(filepath)
    df.columns = df.columns.str.replace('\n', '').str.replace('µ', 'u').str.strip()

    # Create timestamp
    if 'Date(YY:MM:DD)' in df.columns and 'Time(HH:MM:SS)' in df.columns:
        try:
            df['timestamp'] = pd.to_datetime(df['Date(YY:MM:DD)'] + ' ' + df['Time(HH:MM:SS)'], format='%y-%m-%d %H:%M:%S')
        except:
            df['timestamp'] = pd.to_datetime(df['Date(YY:MM:DD)'] + ' ' + df['Time(HH:MM:SS)'])
        df = df.sort_values('timestamp')
    else:
        df = df.reset_index(drop=True)

    # Calculate window size in samples
    window_size_samples = int(window_size_seconds * sampling_rate_hz)
    if window_size_samples < 5:
        window_size_samples = 5  # Minimum samples for meaningful statistics

    # Signal columns
    accel_cols = ['Ax(m/s^2)', 'Ay(m/s^2)', 'Az(m/s^2)']
    gyro_cols = ['Gx(deg/s)', 'Gy(deg/s)', 'Gz(deg/s)']

    all_features = []

    # Extract features for each window
    for i in range(0, len(df), window_size_samples):
        window = df.iloc[i:i+window_size_samples]

        if len(window) < 3:  # Skip very small windows
            continue

        window_features = {
            "window_index": i // window_size_samples,
            "window_start": i,
            "window_end": i + len(window),
            "window_size": len(window),
        }

        # Add timestamp if available
        if 'timestamp' in df.columns:
            window_features["timestamp"] = str(window.iloc[0]['timestamp'])

        # Add label if available
        if 'label' in df.columns:
            # Use majority label in window
            window_features["label"] = int(window['label'].mode()[0]) if len(window['label'].mode()) > 0 else None

        # Extract acceleration features
        for col in accel_cols:
            if col in window.columns:
                feats = extract_window_features(window[col])
                for feat_name, feat_value in feats.items():
                    window_features[f"{col}_{feat_name}"] = feat_value

        # Extract gyroscope features
        for col in gyro_cols:
            if col in window.columns:
                feats = extract_window_features(window[col])
                for feat_name, feat_value in feats.items():
                    window_features[f"{col}_{feat_name}"] = feat_value

        # Combined acceleration magnitude
        if all(col in window.columns for col in accel_cols):
            accel_mag = np.sqrt(
                window['Ax(m/s^2)']**2 +
                window['Ay(m/s^2)']**2 +
                window['Az(m/s^2)']**2
            )
            feats = extract_window_features(accel_mag)
            for feat_name, feat_value in feats.items():
                window_features[f"combined_acceleration_{feat_name}"] = feat_value

        all_features.append(window_features)

    return pd.DataFrame(all_features)

def main():
    print("Extracting features from vibration datasets...")

    # Files to process
    files_to_process = [
        ("SensorDataFile.csv", "sensor_data_features.csv"),
        ("benchydefect.csv", "benchydefect_features.csv"),
        ("normalbenchy.csv", "normalbenchy_features.csv"),
    ]

    results = {}
    for input_file, output_file in files_to_process:
        filepath = dataset_path / input_file
        if not filepath.exists():
            print(f"Skipping {input_file} - file not found")
            continue

        print(f"\nProcessing: {input_file}")
        features_df = extract_features_from_file(filepath, window_size_seconds=2.0, sampling_rate_hz=4.7)

        output_filepath = output_path / output_file
        features_df.to_csv(output_filepath, index=False)

        print(f"  Windows extracted: {len(features_df)}")
        print(f"  Features per window: {len(features_df.columns)}")
        print(f"  Saved to: {output_filepath}")

        results[input_file] = {
            "windows": len(features_df),
            "features": len(features_df.columns),
            "output": str(output_filepath)
        }

    # Save metadata
    metadata_path = output_path / "feature_extraction_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nFeature extraction metadata saved to: {metadata_path}")

    # Print summary
    print("\n" + "="*80)
    print("FEATURE EXTRACTION SUMMARY")
    print("="*80)
    for file, info in results.items():
        print(f"\n{file}:")
        print(f"  Windows: {info['windows']}")
        print(f"  Features per window: {info['features']}")
        print(f"  Output: {info['output']}")

if __name__ == "__main__":
    main()
