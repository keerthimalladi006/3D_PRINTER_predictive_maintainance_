"""
Update electrical context CSV with current timestamps
"""

import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta

CSV_PATH = Path(r"D:\3d_printer_predictive_maintanance\data\processed\electrical_context.csv")

print("Loading electrical CSV...")
df = pd.read_csv(CSV_PATH)

print(f"Original timestamps:")
if 'timestamp_datetime' in df.columns:
    print(f"  First: {df['timestamp_datetime'].iloc[0]}")
    print(f"  Last: {df['timestamp_datetime'].iloc[-1]}")
    
    # Parse original timestamps
    original_times = pd.to_datetime(df['timestamp_datetime'], errors='coerce')
    first_time = original_times.iloc[0]
    time_deltas = original_times - first_time
    
    # Start from current time
    current_start = datetime.now()
    new_times = current_start + time_deltas
    
    # Update timestamp_datetime column
    df['timestamp_datetime'] = new_times
    
    print(f"\nNew timestamps:")
    print(f"  First: {df['timestamp_datetime'].iloc[0]}")
    print(f"  Last: {df['timestamp_datetime'].iloc[-1]}")
    
    # Save
    df.to_csv(CSV_PATH, index=False)
    print(f"\nUpdated electrical CSV saved to: {CSV_PATH}")
else:
    print("No timestamp_datetime column found")
