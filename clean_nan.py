"""
Clean NaN values from processed CSV files
"""

import pandas as pd
from pathlib import Path

processed_path = Path(r"D:\3d_printer_predictive_maintanance\data\processed")

# Clean sensor_data_with_health_anomaly.csv
print("Cleaning sensor_data_with_health_anomaly.csv...")
df = pd.read_csv(processed_path / "sensor_data_with_health_anomaly.csv")
df = df.fillna(0)
df.to_csv(processed_path / "sensor_data_with_health_anomaly.csv", index=False)
print(f"Done. Rows: {len(df)}, Columns: {len(df.columns)}")

# Clean electrical_context.csv
print("\nCleaning electrical_context.csv...")
df = pd.read_csv(processed_path / "electrical_context.csv")
df = df.fillna(0)
df.to_csv(processed_path / "electrical_context.csv", index=False)
print(f"Done. Rows: {len(df)}, Columns: {len(df.columns)}")

print("\nAll files cleaned successfully!")
