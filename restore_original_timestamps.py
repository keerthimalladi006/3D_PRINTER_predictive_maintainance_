"""
Restore CSV files to original historical timestamps
"""

import pandas as pd
from pathlib import Path
from datetime import datetime

HEALTH_CSV = Path(r"D:\3d_printer_predictive_maintanance\data\processed\sensor_data_with_health_anomaly.csv")
ELECTRICAL_CSV = Path(r"D:\3d_printer_predictive_maintanance\data\processed\electrical_context.csv")

print("Restoring health CSV to original timestamps...")
df = pd.read_csv(HEALTH_CSV)

# Parse current timestamps
current_times = pd.to_datetime(df['Date_Time'], errors='coerce')
first_current = current_times.iloc[0]

# Calculate offset from original start time (08-10-2026 10:20)
original_start = datetime(2026, 10, 8, 10, 20)
offset = first_current - original_start

# Subtract offset to get back to original
original_times = current_times - offset
df['Date_Time'] = original_times
df['timestamp'] = original_times.dt.strftime('%Y-%m-%d %H:%M')

print(f"Restored timestamps:")
print(f"  First: {df['Date_Time'].iloc[0]}")
print(f"  Last: {df['Date_Time'].iloc[-1]}")

df.to_csv(HEALTH_CSV, index=False)
print(f"Health CSV restored to: {HEALTH_CSV}")

print("\nRestoring electrical CSV to original timestamps...")
df_elec = pd.read_csv(ELECTRICAL_CSV)

if 'timestamp_datetime' in df_elec.columns:
    current_times_elec = pd.to_datetime(df_elec['timestamp_datetime'], errors='coerce')
    first_current_elec = current_times_elec.iloc[0]
    offset_elec = first_current_elec - original_start
    original_times_elec = current_times_elec - offset_elec
    df_elec['timestamp_datetime'] = original_times_elec
    
    print(f"Restored timestamps:")
    print(f"  First: {df_elec['timestamp_datetime'].iloc[0]}")
    print(f"  Last: {df_elec['timestamp_datetime'].iloc[-1]}")
    
    df_elec.to_csv(ELECTRICAL_CSV, index=False)
    print(f"Electrical CSV restored to: {ELECTRICAL_CSV}")
