import json
import os
import subprocess
from datetime import datetime, timedelta

ROOT_OUTPUT_JSON = "/Users/primastech/Workspace/Multi-Sports-Analytics-Engine/sofascore_data.json"
REACT_OUTPUT_JSON = "/Users/primastech/Workspace/Multi-Sports-Analytics-Engine/sports-analytics-frontend/public/sofascore_data.json"

def clean_data():
    if not os.path.exists(ROOT_OUTPUT_JSON):
        print(f"File {ROOT_OUTPUT_JSON} not found. Skipping cleanup.")
        return

    with open(ROOT_OUTPUT_JSON, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print("Could not decode JSON file. Starting fresh.")
            data = []

    today = datetime.now()
    
    # Calculate the 5 days to remove: yesterday down to 5 days ago
    dates_to_remove = set()
    for i in range(1, 6):
        d = today - timedelta(days=i)
        dates_to_remove.add(d.strftime("%Y-%m-%d"))
        
    print(f"Removing data for dates: {', '.join(sorted(dates_to_remove))}")

    filtered_data = [m for m in data if m.get("date") not in dates_to_remove]

    print(f"Original matches: {len(data)}, After cleanup: {len(filtered_data)}")

    # Save it back atomically
    tmp_root = ROOT_OUTPUT_JSON + ".tmp"
    with open(tmp_root, "w", encoding="utf-8") as f:
        json.dump(filtered_data, f, indent=2, ensure_ascii=False)
    os.replace(tmp_root, ROOT_OUTPUT_JSON)

    react_dir = os.path.dirname(REACT_OUTPUT_JSON)
    if os.path.exists(react_dir):
        tmp_react = REACT_OUTPUT_JSON + ".tmp"
        with open(tmp_react, "w", encoding="utf-8") as f:
            json.dump(filtered_data, f, indent=2, ensure_ascii=False)
        os.replace(tmp_react, REACT_OUTPUT_JSON)
        print("React copy updated.")

def main():
    print("Starting data cleanup...")
    clean_data()
    print("\nFetching today's data...")
    # sofascoredata.py defaults to fetching today's data if no arguments are provided
    subprocess.run(["python3", "sofascoredata.py"])

if __name__ == "__main__":
    main()
