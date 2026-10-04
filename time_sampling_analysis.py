"""
Time and Sampling Analysis Script
Analyzes timestamp structure and sampling characteristics
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json

dataset_path = Path(r"D:\3d_printer_predictive_maintanance\dataset")

def analyze_sampling(filepath, file_type='csv'):
    """Analyze sampling characteristics of a file."""
    if file_type == 'csv':
        df = pd.read_csv(filepath)
    else:
        df = pd.read_excel(filepath)

    # Clean column names
    df.columns = df.columns.str.replace('\n', '').str.replace('µ', 'u').str.strip()

    results = {
        "filename": filepath.name,
        "num_samples": len(df),
        "sampling_analysis": {}
    }

    # Identify timestamp columns
    time_cols = [col for col in df.columns if 'time' in col.lower() or 'date' in col.lower()]

    if not time_cols:
        results["sampling_analysis"]["error"] = "No timestamp columns found"
        return results

    # Try to create a proper timestamp
    if 'Date(YY:MM:DD)' in df.columns and 'Time(HH:MM:SS)' in df.columns:
        try:
            df['timestamp'] = pd.to_datetime(df['Date(YY:MM:DD)'] + ' ' + df['Time(HH:MM:SS)'], format='%y-%m-%d %H:%M:%S')
        except:
            # Try alternative format
            df['timestamp'] = pd.to_datetime(df['Date(YY:MM:DD)'] + ' ' + df['Time(HH:MM:SS)'])
        df = df.sort_values('timestamp')
        time_diffs = df['timestamp'].diff().dt.total_seconds().dropna()
    elif 'time_ms' in df.columns:
        time_diffs = df['time_ms'].diff().dropna() / 1000.0  # Convert to seconds
    elif 'Time in ms' in df.columns:
        time_diffs = df['Time in ms'].diff().dropna() / 1000.0
    elif 'Name' in df.columns:
        # Try to parse as milliseconds
        try:
            df['Name'] = pd.to_numeric(df['Name'], errors='coerce')
            time_diffs = df['Name'].diff().dropna() / 1000.0
        except:
            results["sampling_analysis"]["error"] = "Could not parse time column"
            return results
    else:
        results["sampling_analysis"]["error"] = "Unrecognized timestamp format"
        return results

    if len(time_diffs) == 0:
        results["sampling_analysis"]["error"] = "No time differences calculated"
        return results

    # Sampling analysis
    results["sampling_analysis"] = {
        "total_duration_seconds": float(time_diffs.sum()),
        "mean_interval_seconds": float(time_diffs.mean()),
        "std_interval_seconds": float(time_diffs.std()),
        "min_interval_seconds": float(time_diffs.min()),
        "max_interval_seconds": float(time_diffs.max()),
        "median_interval_seconds": float(time_diffs.median()),
        "unique_intervals": int(time_diffs.nunique()),
        "is_uniform": bool(time_diffs.nunique() <= 2),  # Allow some minor variation
    }

    # Calculate sampling frequency if uniform
    if results["sampling_analysis"]["is_uniform"]:
        results["sampling_analysis"]["sampling_frequency_hz"] = float(1.0 / time_diffs.mean())
    else:
        results["sampling_analysis"]["sampling_frequency_hz"] = None
        results["sampling_analysis"]["sampling_frequency_note"] = "Irregular sampling - no single frequency"

    # Detect sampling issues
    issues = []
    if time_diffs.min() == 0:
        issues.append("Duplicate timestamps detected")
    if time_diffs.max() > 10 * time_diffs.mean():
        issues.append("Large gaps in sampling detected")
    if time_diffs.nunique() > 10:
        issues.append("Highly irregular sampling detected")

    results["sampling_analysis"]["issues"] = issues

    # Sample interval distribution
    results["sampling_analysis"]["interval_distribution"] = {
        "most_common_interval": float(time_diffs.mode()[0]) if len(time_diffs.mode()) > 0 else None,
        "most_common_count": int(time_diffs.value_counts().iloc[0]) if len(time_diffs.value_counts()) > 0 else None
    }

    return results

def main():
    print("Analyzing time and sampling characteristics...")

    files_to_analyze = [
        ("SensorDataFile.csv", "csv"),
        ("benchydefect.csv", "csv"),
        ("normalbenchy.csv", "csv"),
        ("Gyroscope_SensorDataFile.csv", "csv"),
        ("3D_Printing_Stages_Run_06_Beckhoff.csv", "csv"),
        ("Reference_Run_06_Beckhoff.xlsx", "xlsx"),
        ("3D_Printing_Stages.csv", "csv"),
    ]

    all_results = []
    for filename, file_type in files_to_analyze:
        filepath = dataset_path / filename
        if filepath.exists():
            print(f"\nAnalyzing: {filename}")
            result = analyze_sampling(filepath, file_type)
            all_results.append(result)

            print(f"  Samples: {result['num_samples']}")
            if "error" in result.get("sampling_analysis", {}):
                print(f"  ERROR: {result['sampling_analysis']['error']}")
            else:
                sa = result["sampling_analysis"]
                print(f"  Duration: {sa['total_duration_seconds']:.1f}s")
                print(f"  Mean interval: {sa['mean_interval_seconds']:.4f}s")
                print(f"  Std interval: {sa['std_interval_seconds']:.4f}s")
                print(f"  Is uniform: {sa['is_uniform']}")
                if sa['sampling_frequency_hz']:
                    print(f"  Sampling frequency: {sa['sampling_frequency_hz']:.2f} Hz")
                if sa['issues']:
                    print(f"  Issues: {', '.join(sa['issues'])}")

    # Save results
    output_path = Path(r"D:\3d_printer_predictive_maintanance\time_sampling_report.json")
    with open(output_path, 'w') as f:
        json.dump(all_results, f, indent=2)

    print(f"\n\nReport saved to: {output_path}")

    # Summary
    print("\n" + "="*80)
    print("TIME/SAMPLING ANALYSIS SUMMARY")
    print("="*80)

    for result in all_results:
        print(f"\n{result['filename']}:")
        sa = result.get("sampling_analysis", {})
        if "error" in sa:
            print(f"  ERROR: {sa['error']}")
        else:
            print(f"  Duration: {sa['total_duration_seconds']:.1f}s")
            print(f"  Mean interval: {sa['mean_interval_seconds']:.4f}s")
            print(f"  Std interval: {sa['std_interval_seconds']:.4f}s")
            print(f"  Uniform: {sa['is_uniform']}")
            if sa['sampling_frequency_hz']:
                print(f"  Frequency: {sa['sampling_frequency_hz']:.2f} Hz")
            if sa['issues']:
                print(f"  Issues: {', '.join(sa['issues'])}")

if __name__ == "__main__":
    main()
