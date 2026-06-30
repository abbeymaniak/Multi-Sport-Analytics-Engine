import json
import os

ROOT_OUTPUT_JSON = "/Users/primastech/Workspace/Multi-Sports-Analytics-Engine/sofascore_data.json"
REACT_OUTPUT_JSON = "/Users/primastech/Workspace/Multi-Sports-Analytics-Engine/sports-analytics-frontend/public/sofascore_data.json"

def main():
    if not os.path.exists(ROOT_OUTPUT_JSON):
        print("JSON file not found.")
        return

    with open(ROOT_OUTPUT_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Original records: {len(data)}")

    # Remove games from last month (May 2026)
    filtered_data = [m for m in data if not m.get("date", "").startswith("2026-05")]

    print(f"Records after removing May 2026: {len(filtered_data)}")

    with open(ROOT_OUTPUT_JSON + ".tmp", "w", encoding="utf-8") as f:
        json.dump(filtered_data, f, indent=2, ensure_ascii=False)

    os.replace(ROOT_OUTPUT_JSON + ".tmp", ROOT_OUTPUT_JSON)

    if os.path.exists(os.path.dirname(REACT_OUTPUT_JSON)):
        with open(REACT_OUTPUT_JSON + ".tmp", "w", encoding="utf-8") as f:
            json.dump(filtered_data, f, indent=2, ensure_ascii=False)
        os.replace(REACT_OUTPUT_JSON + ".tmp", REACT_OUTPUT_JSON)
        print("React copy updated.")

    print("Cleanup done.")

if __name__ == "__main__":
    main()
