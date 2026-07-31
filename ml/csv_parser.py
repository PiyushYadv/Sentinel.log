import os
import pandas as pd
import json

def parse_csv_logs(csv_file_path):
  print(f"Loading data from {csv_file_path}...")
  
  # 1. Load the CSV
  try:
    df = pd.read_csv(csv_file_path)
  except Exception as e:
    print(f"Failed to read CSV: {e}")
    return

  # Check for exact column name (adjust if yours is lowercase like 'eventid' or 'eventId')
  if 'EventId' not in df.columns:
    print(f"Error: Could not find 'EventId' column. Available columns: {df.columns.tolist()}")
    return

  # 2. Extract the IDs and create a mapping
  raw_events = df['EventId'].tolist()
  unique_events = sorted(list(set(raw_events)))
  
  # Map each unique EventId string to an integer starting from 1
  # (Leaving 0 available for padding/unknowns later if needed)
  event_to_int = {event: idx + 1 for idx, event in enumerate(unique_events)}
  
  # 3. Convert the entire dataset into an integer sequence
  sequence = [event_to_int[event] for event in raw_events]
  
  # 4. Save the sequence for train.py
  os.makedirs("data", exist_ok=True)
  with open("data/sequence.txt", "w") as f:
    f.write(",".join(map(str, sequence)))
      
  # Save the mapping so we know which integer corresponds to which EventId later
  with open("data/event_mapping.json", "w") as f:
    json.dump(event_to_int, f)
      
  print(f"\nFound {len(unique_events)} unique Event IDs.")
  print(f"Successfully processed {len(sequence)} log events.")
  print("Saved sequence to data/sequence.txt")

if __name__ == "__main__":
  # Replace with the actual name of your CSV file
  parse_csv_logs("HDFS_100k.csv")