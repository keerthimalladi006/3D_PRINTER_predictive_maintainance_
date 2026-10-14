"""
Directly update CSV file with current timestamps
"""

import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta

CSV_PATH = Path(r"D:\3d_printer_predictive_maintanance\data\processed\sensor_data_with_health_anomaly.csv")

print("Loading CSV...")
df = pd.read_csv(CSV_PATH)

print(f"Original timestamps:")
print(f"  First: {df['Date_Time'].iloc[0]}")
print(f"  Last: {df['Date_Time'].iloc[-1]}")

# Parse original timestamps
original_times = pd.to_datetime(df['Date_Time'], errors='coerce')
first_time = original_times.iloc[0]
time_deltas = original_times - first_time

# Start from current time
current_start = datetime.now()
new_times = current_start + time_deltas

# Update Date_Time column
df['Date_Time'] = new_times

# Update timestamp column with ISO format
df['timestamp'] = new_times.dt.strftime('%Y-%m-%d %H:%M')

print(f"\nNew timestamps:")
print(f"  First: {df['Date_Time'].iloc[0]}")
print(f"  Last: {df['Date_Time'].iloc[-1]}")

# Save
df.to_csv(CSV_PATH, index=False)
print(f"\nUpdated CSV saved to: {CSV_PATH}")
