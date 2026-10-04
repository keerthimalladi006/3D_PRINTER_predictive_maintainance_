"""
Sensor Data Analysis Script
Analyzes acceleration and gyroscope signals from SensorDataFile.csv
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json

dataset_path = Path(r"D:\3d_printer_predictive_maintanance\dataset")

def calculate_statistics(series):
    """Calculate comprehensive statistics for a signal."""
    stats = {
        "count": int(len(series)),
        "mean": float(series.mean()),
        "std": float(series.std()),
        "min": float(series.min()),
        "max": float(series.max()),
        "median": float(series.median()),
        "q25": float(series.quantile(0.25)),
        "q75": float(series.quantile(0.75)),
        "rms": float(np.sqrt(np.mean(series**2))),
        "peak": float(np.max(np.abs(series))),
        "peak_to_peak": float(series.max() - series.min()),
        "kurtosis": float(series.kurtosis()),
        "skewness": float(series.skew()),
    }
    stats["crest_factor"] = stats["peak"] / stats["rms"] if stats["rms"] > 0 else np.nan
    return stats

def analyze_sensor_data():
    """Analyze SensorDataFile.csv in detail."""
    filepath = dataset_path / "SensorDataFile.csv"
    df = pd.read_csv(filepath)

    # Clean column names (remove newlines and spaces)
    df.columns = df.columns.str.replace('\n', '').str.replace('µ', 'u').str.strip()

    results = {
        "filename": "SensorDataFile.csv",
        "total_samples": len(df),
        "label_distribution": df['label'].value_counts().to_dict(),
        "signals": {}
    }

    # Analyze acceleration signals
    accel_cols = ['Ax(m/s^2)', 'Ay(m/s^2)', 'Az(m/s^2)']
    for col in accel_cols:
        if col in df.columns:
            results["signals"][col] = calculate_statistics(df[col])

    # Analyze gyroscope signals
    gyro_cols = ['Gx(deg/s)', 'Gy(deg/s)', 'Gz(deg/s)']
    for col in gyro_cols:
        if col in df.columns:
            results["signals"][col] = calculate_statistics(df[col])

    # Calculate combined acceleration magnitude
    if all(col in df.columns for col in accel_cols):
        accel_magnitude = np.sqrt(df['Ax(m/s^2)']**2 + df['Ay(m/s^2)']**2 + df['Az(m/s^2)']**2)
        results["signals"]["combined_acceleration_magnitude"] = calculate_statistics(accel_magnitude)

    # Analyze by label
    results["by_label"] = {}
    for label in df['label'].unique():
        label_data = df[df['label'] == label]
        results["by_label"][f"label_{int(label)}"] = {
            "count": int(len(label_data)),
            "percentage": float(len(label_data) / len(df) * 100),
            "signals": {}
        }

        for col in accel_cols:
            if col in df.columns:
                results["by_label"][f"label_{int(label)}"]["signals"][col] = calculate_statistics(label_data[col])

        for col in gyro_cols:
            if col in df.columns:
                results["by_label"][f"label_{int(label)}"]["signals"][col] = calculate_statistics(label_data[col])

    # Temporal behavior of labels
    df['timestamp'] = pd.to_datetime(df['Date(YY:MM:DD)'] + ' ' + df['Time(HH:MM:SS)'], format='%y-%m-%d %H:%M:%S')
    df = df.sort_values('timestamp')

    # Count label transitions
    label_changes = df['label'].diff().fillna(0) != 0
    results["label_transitions"] = int(label_changes.sum())

    # Duration of each label segment
    label_segments = []
    current_label = df.iloc[0]['label']
    segment_start = df.iloc[0]['timestamp']
    segment_count = 1

    for i in range(1, len(df)):
        if df.iloc[i]['label'] != current_label:
            segment_end = df.iloc[i-1]['timestamp']
            duration = (segment_end - segment_start).total_seconds()
            label_segments.append({
                "label": int(current_label),
                "start": str(segment_start),
                "end": str(segment_end),
                "duration_seconds": duration,
                "sample_count": segment_count
            })
            current_label = df.iloc[i]['label']
            segment_start = df.iloc[i]['timestamp']
            segment_count = 1
        else:
            segment_count += 1

    # Add final segment
    segment_end = df.iloc[-1]['timestamp']
    duration = (segment_end - segment_start).total_seconds()
    label_segments.append({
        "label": int(current_label),
        "start": str(segment_start),
        "end": str(segment_end),
        "duration_seconds": duration,
        "sample_count": segment_count
    })

    results["label_segments"] = label_segments

    # Statistical comparison between labels
    if len(df['label'].unique()) == 2:
        label_0 = df[df['label'] == 0]
        label_1 = df[df['label'] == 1]

        results["statistical_comparison"] = {}
        for col in accel_cols + gyro_cols:
            if col in df.columns:
                # Cohen's d (effect size)
                mean_diff = label_1[col].mean() - label_0[col].mean()
                pooled_std = np.sqrt((label_0[col].std()**2 + label_1[col].std()**2) / 2)
                cohens_d = mean_diff / pooled_std if pooled_std > 0 else 0

                results["statistical_comparison"][col] = {
                    "mean_difference": float(mean_diff),
                    "cohens_d": float(cohens_d),
                    "effect_size": "small" if abs(cohens_d) < 0.2 else "medium" if abs(cohens_d) < 0.8 else "large"
                }

    return results

def main():
    print("Analyzing SensorDataFile.csv...")
    results = analyze_sensor_data()

    # Save results
    output_path = Path(r"D:\3d_printer_predictive_maintanance\sensor_analysis_report.json")
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"Analysis saved to: {output_path}")

    # Print summary
    print("\n" + "="*80)
    print("SENSOR DATA ANALYSIS SUMMARY")
    print("="*80)
    print(f"\nTotal samples: {results['total_samples']}")
    print(f"Label distribution: {results['label_distribution']}")
    print(f"Label transitions: {results['label_transitions']}")

    print("\nOverall Signal Statistics:")
    for signal, stats in results['signals'].items():
        print(f"\n{signal}:")
        print(f"  Mean: {stats['mean']:.4f}")
        print(f"  Std: {stats['std']:.4f}")
        print(f"  RMS: {stats['rms']:.4f}")
        print(f"  Peak: {stats['peak']:.4f}")
        print(f"  Peak-to-Peak: {stats['peak_to_peak']:.4f}")
        print(f"  Kurtosis: {stats['kurtosis']:.4f}")
        print(f"  Crest Factor: {stats['crest_factor']:.4f}")

    print("\nLabel Segments:")
    for segment in results['label_segments']:
        print(f"  Label {segment['label']}: {segment['duration_seconds']:.1f}s ({segment['sample_count']} samples)")

    if 'statistical_comparison' in results:
        print("\nStatistical Comparison (Label 1 vs Label 0):")
        for signal, comp in results['statistical_comparison'].items():
            print(f"  {signal}:")
            print(f"    Mean difference: {comp['mean_difference']:.4f}")
            print(f"    Cohen's d: {comp['cohens_d']:.4f} ({comp['effect_size']} effect)")

if __name__ == "__main__":
    main()
