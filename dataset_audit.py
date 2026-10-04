"""
Dataset Audit Script
Analyzes all files in the dataset directory and generates a comprehensive report.
"""

import pandas as pd
import numpy as np
import os
from pathlib import Path
import json

dataset_path = Path(r"D:\3d_printer_predictive_maintanance\dataset")

def analyze_file(filepath):
    """Analyze a single file and return its metadata."""
    filename = filepath.name
    file_type = filepath.suffix

    result = {
        "filename": filename,
        "file_type": file_type,
        "path": str(filepath),
        "error": None
    }

    try:
        if file_type == '.csv':
            df = pd.read_csv(filepath)
        elif file_type in ['.xlsx', '.xls']:
            df = pd.read_excel(filepath)
        else:
            result["error"] = f"Unsupported file type: {file_type}"
            return result

        result["num_rows"] = len(df)
        result["num_columns"] = len(df.columns)
        result["columns"] = list(df.columns)
        result["dtypes"] = {col: str(dtype) for col, dtype in df.dtypes.items()}
        result["missing_values"] = {col: int(count) for col, count in df.isnull().sum().items()}
        result["duplicate_rows"] = int(df.duplicated().sum())

        # Timestamp analysis if timestamp columns exist
        timestamp_cols = [col for col in df.columns if 'time' in col.lower() or 'date' in col.lower()]
        result["timestamp_columns"] = timestamp_cols

        if timestamp_cols:
            for ts_col in timestamp_cols:
                col_data = df[ts_col]
                result[f"{ts_col}_sample"] = {
                    "first_5": col_data.head(5).tolist(),
                    "last_5": col_data.tail(5).tolist(),
                    "unique_count": col_data.nunique()
                }

        # Label analysis if label column exists
        label_cols = [col for col in df.columns if 'label' in col.lower()]
        result["label_columns"] = label_cols

        if label_cols:
            for label_col in label_cols:
                label_counts = df[label_col].value_counts()
                result[f"{label_col}_distribution"] = {
                    str(k): int(v) for k, v in label_counts.items()
                }
                result[f"{label_col}_unique_values"] = int(df[label_col].nunique())

        # Sample first few rows
        result["sample_rows"] = df.head(3).to_dict(orient='records')

    except Exception as e:
        result["error"] = str(e)

    return result

def main():
    files = list(dataset_path.glob("*.*"))
    files = [f for f in files if f.is_file()]

    audit_results = []
    for filepath in files:
        print(f"Analyzing: {filepath.name}")
        result = analyze_file(filepath)
        audit_results.append(result)
        print(f"  Rows: {result.get('num_rows', 'N/A')}, Cols: {result.get('num_columns', 'N/A')}")
        if result.get('error'):
            print(f"  ERROR: {result['error']}")
        print()

    # Save audit results
    output_path = Path(r"D:\3d_printer_predictive_maintanance\dataset_audit_report.json")
    with open(output_path, 'w') as f:
        json.dump(audit_results, f, indent=2)

    print(f"\nAudit report saved to: {output_path}")

    # Print summary
    print("\n" + "="*80)
    print("DATASET AUDIT SUMMARY")
    print("="*80)
    for result in audit_results:
        print(f"\nFile: {result['filename']}")
        print(f"  Type: {result['file_type']}")
        print(f"  Rows: {result.get('num_rows', 'N/A')}")
        print(f"  Columns: {result.get('num_columns', 'N/A')}")
        print(f"  Columns: {result.get('columns', [])}")
        if result.get('error'):
            print(f"  ERROR: {result['error']}")

if __name__ == "__main__":
    main()
