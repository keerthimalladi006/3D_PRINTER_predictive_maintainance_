"""
Electrical Data Analysis
Analyzes Beckhoff power/current/voltage datasets for operating context.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json

dataset_path = Path(r"D:\3d_printer_predictive_maintanance\dataset")
output_path = Path(r"D:\3d_printer_predictive_maintanance\data\processed")
output_path.mkdir(parents=True, exist_ok=True)

def analyze_electrical_data():
    """Analyze Beckhoff electrical data files."""
    results = {}

    # 1. Analyze 3D_Printing_Stages_Run_06_Beckhoff.csv
    print("Analyzing 3D_Printing_Stages_Run_06_Beckhoff.csv...")
    beckhoff_csv = pd.read_csv(dataset_path / "3D_Printing_Stages_Run_06_Beckhoff.csv")

    results["beckhoff_csv"] = {
        "filename": "3D_Printing_Stages_Run_06_Beckhoff.csv",
        "samples": len(beckhoff_csv),
        "columns": beckhoff_csv.columns.tolist(),
        "duration_seconds": beckhoff_csv['time_sec'].max(),
        "sampling_rate_hz": 4.0,  # 250ms intervals
        "label_distribution": beckhoff_csv['label'].value_counts().to_dict(),
    }

    # Statistics by label
    results["beckhoff_csv"]["by_label"] = {}
    for label in beckhoff_csv['label'].unique():
        label_data = beckhoff_csv[beckhoff_csv['label'] == label]
        results["beckhoff_csv"]["by_label"][f"label_{int(label)}"] = {
            "count": int(len(label_data)),
            "duration_seconds": float(label_data['time_sec'].max() - label_data['time_sec'].min()),
            "active_power": {
                "mean": float(label_data['active_power'].mean()),
                "std": float(label_data['active_power'].std()),
                "min": float(label_data['active_power'].min()),
                "max": float(label_data['active_power'].max()),
            },
            "current": {
                "mean": float(label_data['current'].mean()),
                "std": float(label_data['current'].std()),
                "min": float(label_data['current'].min()),
                "max": float(label_data['current'].max()),
            },
            "voltage": {
                "mean": float(label_data['voltage'].mean()),
                "std": float(label_data['voltage'].std()),
                "min": float(label_data['voltage'].min()),
                "max": float(label_data['voltage'].max()),
            },
        }

    # 2. Analyze Reference_Run_06_Beckhoff.xlsx
    print("Analyzing Reference_Run_06_Beckhoff.xlsx...")
    beckhoff_xlsx = pd.read_excel(dataset_path / "Reference_Run_06_Beckhoff.xlsx")

    results["beckhoff_xlsx"] = {
        "filename": "Reference_Run_06_Beckhoff.xlsx",
        "samples": len(beckhoff_xlsx),
        "columns": beckhoff_xlsx.columns.tolist(),
        "duration_seconds": beckhoff_xlsx['Time in seconds'].max(),
        "sampling_rate_hz": 4.0,  # 250ms intervals
    }

    # Overall statistics
    results["beckhoff_xlsx"]["statistics"] = {
        "active_power": {
            "mean": float(beckhoff_xlsx['Active Power in watts'].mean()),
            "std": float(beckhoff_xlsx['Active Power in watts'].std()),
            "min": float(beckhoff_xlsx['Active Power in watts'].min()),
            "max": float(beckhoff_xlsx['Active Power in watts'].max()),
        },
        "current": {
            "mean": float(beckhoff_xlsx['Current in amperes'].mean()),
            "std": float(beckhoff_xlsx['Current in amperes'].std()),
            "min": float(beckhoff_xlsx['Current in amperes'].min()),
            "max": float(beckhoff_xlsx['Current in amperes'].max()),
        },
        "voltage": {
            "mean": float(beckhoff_xlsx['Voltage in volts'].mean()),
            "std": float(beckhoff_xlsx['Voltage in volts'].std()),
            "min": float(beckhoff_xlsx['Voltage in volts'].min()),
            "max": float(beckhoff_xlsx['Voltage in volts'].max()),
        },
    }

    # 3. Compare CSV and XLSX
    print("Comparing CSV and XLSX datasets...")
    if len(beckhoff_csv) == len(beckhoff_xlsx):
        results["comparison"] = {
            "same_length": True,
            "length": len(beckhoff_csv),
            "notes": "Both datasets have identical length and timing structure"
        }
    else:
        results["comparison"] = {
            "same_length": False,
            "csv_length": len(beckhoff_csv),
            "xlsx_length": len(beckhoff_xlsx),
        }

    return results

def create_electrical_context_file():
    """Create a processed electrical context file for the API."""
    print("\nCreating electrical context file...")

    # Load Beckhoff data with labels
    beckhoff_csv = pd.read_csv(dataset_path / "3D_Printing_Stages_Run_06_Beckhoff.csv")

    # Add readable timestamp
    beckhoff_csv['timestamp_datetime'] = pd.to_datetime(beckhoff_csv['time_sec'], unit='s', origin='unix')

    # Calculate power factor (if applicable)
    beckhoff_csv['apparent_power'] = beckhoff_csv['voltage'] * beckhoff_csv['current']
    beckhoff_csv['power_factor'] = beckhoff_csv['active_power'] / beckhoff_csv['apparent_power']
    beckhoff_csv['power_factor'] = beckhoff_csv['power_factor'].fillna(0)

    # Save processed file
    output_file = output_path / "electrical_context.csv"
    beckhoff_csv.to_csv(output_file, index=False)

    print(f"  Electrical context saved to: {output_file}")
    print(f"  Samples: {len(beckhoff_csv)}")
    print(f"  Duration: {beckhoff_csv['time_sec'].max():.1f}s ({beckhoff_csv['time_sec'].max()/60:.1f} minutes)")

    return str(output_file)

def main():
    print("Analyzing electrical data...")

    # Run analysis
    results = analyze_electrical_data()

    # Save analysis results
    analysis_path = output_path / "electrical_analysis_report.json"
    with open(analysis_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nAnalysis report saved to: {analysis_path}")

    # Create processed context file
    context_file = create_electrical_context_file()

    # Print summary
    print("\n" + "="*80)
    print("ELECTRICAL DATA ANALYSIS SUMMARY")
    print("="*80)

    print(f"\nBeckhoff CSV (3D_Printing_Stages_Run_06_Beckhoff.csv):")
    print(f"  Samples: {results['beckhoff_csv']['samples']}")
    print(f"  Duration: {results['beckhoff_csv']['duration_seconds']:.1f}s ({results['beckhoff_csv']['duration_seconds']/60:.1f} minutes)")
    print(f"  Sampling rate: {results['beckhoff_csv']['sampling_rate_hz']} Hz")
    print(f"  Label distribution: {results['beckhoff_csv']['label_distribution']}")

    print(f"\n  Power consumption by label:")
    for label, stats in results['beckhoff_csv']['by_label'].items():
        print(f"    {label}: {stats['active_power']['mean']:.2f} W (±{stats['active_power']['std']:.2f})")

    print(f"\nReference Beckhoff XLSX (Reference_Run_06_Beckhoff.xlsx):")
    print(f"  Samples: {results['beckhoff_xlsx']['samples']}")
    print(f"  Duration: {results['beckhoff_xlsx']['duration_seconds']:.1f}s ({results['beckhoff_xlsx']['duration_seconds']/60:.1f} minutes)")
    print(f"  Sampling rate: {results['beckhoff_xlsx']['sampling_rate_hz']} Hz")

    print(f"\nOverall electrical statistics:")
    print(f"  Active Power: {results['beckhoff_xlsx']['statistics']['active_power']['mean']:.2f} W (±{results['beckhoff_xlsx']['statistics']['active_power']['std']:.2f})")
    print(f"  Current: {results['beckhoff_xlsx']['statistics']['current']['mean']:.4f} A (±{results['beckhoff_xlsx']['statistics']['current']['std']:.4f})")
    print(f"  Voltage: {results['beckhoff_xlsx']['statistics']['voltage']['mean']:.2f} V (±{results['beckhoff_xlsx']['statistics']['voltage']['std']:.2f})")

    print(f"\nSynchronization Decision:")
    print(f"  Electrical data sampling: 4 Hz (uniform)")
    print(f"  Vibration data sampling: ~4.7 Hz (irregular)")
    print(f"  Synchronization: NOT POSSIBLE without additional metadata")
    print(f"  Decision: Keep as separate context dataset")

    print(f"\nPurpose:")
    print(f"  Electrical data provides operating context (power consumption, stages)")
    print(f"  Vibration data provides condition monitoring (health, anomalies)")
    print(f"  Both will be exposed as separate API endpoints")

if __name__ == "__main__":
    main()
