#!/usr/bin/env python3
import os
import sys
import json
import sqlite3
import subprocess
import argparse
from datetime import datetime, timedelta

# --- CONFIGURATION ---
DB_PATH = "/Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/sports_analytics.db"
ROOT_DIR = "/Users/primastech/Workspace/prediction"
ENGINE_DIR = os.path.join(ROOT_DIR, "Multi-Sports-Analytics-Engine")
PYTHON_ENV = os.path.join(ROOT_DIR, "draws/.venv/bin/python")

H2H_JSON_PATH = os.path.join(ROOT_DIR, "h2hstatsnet.json")
H2H_REACT_JSON_PATH = os.path.join(ROOT_DIR, "h2h-app/public/h2hstatsnet.json")

def get_current_week_range():
    """Returns the Monday and Sunday dates of the current week."""
    today = datetime.today()
    # today.weekday(): Monday is 0, Sunday is 6
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")

def generate_date_list(start_date_str, end_date_str):
    """Generates a list of YYYY-MM-DD date strings between start and end (inclusive)."""
    start = datetime.strptime(start_date_str, "%Y-%m-%d")
    end = datetime.strptime(end_date_str, "%Y-%m-%d")
    
    date_list = []
    curr = start
    while curr <= end:
        date_list.append(curr.strftime("%Y-%m-%d"))
        curr += timedelta(days=1)
    return date_list

def reset_upcoming_data():
    """Wipes the SQLite database fixtures/h2h tables and initializes JSON files to [] (Option B)."""
    print("\n🧹 [Reset Mode] Option B: Clearing upcoming fixtures and predictions...")
    
    # 1. Clear SQLite Tables
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # Delete records
            cursor.execute("DELETE FROM h2h_records")
            cursor.execute("DELETE FROM fixtures")
            
            # Reset autoincrement sequences
            cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('fixtures', 'h2h_records')")
            
            conn.commit()
            conn.close()
            print("  ✅ SQLite fixtures and h2h_records tables cleared successfully.")
        except Exception as e:
            print(f"  ❌ Error wiping SQLite database: {e}")
    else:
        print("  ⚠️ SQLite database not found yet. It will be initialized during update_engine execution.")

    # 2. Reset h2hstatsnet.json files to empty list []
    for path in [H2H_JSON_PATH, H2H_REACT_JSON_PATH]:
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump([], f)
            print(f"  ✅ Initialized empty JSON file: {path}")
        except Exception as e:
            print(f"  ❌ Error resetting JSON file at {path}: {e}")

def run_subprocess(command, cwd=None):
    """Runs a subprocess and streams output to terminal, raises exception on non-zero exit."""
    print(f"\n🚀 Running: {' '.join(command)}")
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        cwd=cwd
    )
    
    # Stream stdout/stderr line by line
    while True:
        line = process.stdout.readline()
        if not line and process.poll() is not None:
            break
        if line:
            print(line.strip())
            
    rc = process.poll()
    if rc != 0:
        raise subprocess.CalledProcessError(rc, command)
    print("✅ Completed successfully.")

def main():
    parser = argparse.ArgumentParser(description="Weekly Sports prediction ingestion pipeline.")
    parser.add_argument("--start-date", type=str, help="Start date in YYYY-MM-DD format (defaults to Monday of current week)")
    parser.add_argument("--end-date", type=str, help="End date in YYYY-MM-DD format (defaults to Sunday of current week)")
    parser.add_argument("--no-reset", action="store_true", help="Skip database and JSON reset (Option B)")
    args = parser.parse_args()

    # Determine date range
    if args.start_date and args.end_date:
        start_date, end_date = args.start_date, args.end_date
        print(f"📅 Custom Date Range Provided: {start_date} to {end_date}")
    else:
        start_date, end_date = get_current_week_range()
        print(f"📅 Dynamic Current Week Date Range: {start_date} to {end_date}")

    dates_to_scrape = generate_date_list(start_date, end_date)
    print(f"📋 Generating predictions for the following {len(dates_to_scrape)} dates:")
    for d in dates_to_scrape:
        print(f"  - {d}")

    # Step 1: Wipe existing data (Option B)
    if not args.no_reset:
        reset_upcoming_data()
    else:
        print("\n⚠️ Skipping data reset. Scraped data will be merged/appended.")

    # Step 2: Run scrape_h2h.py for each day in range
    print("\n--- PHASE 1: Scrape Fixture Data from H2HStats.net ---")
    scrape_script = os.path.join(ROOT_DIR, "scrape_h2h.py")
    
    for date_str in dates_to_scrape:
        print(f"\n🔍 Scraping date: {date_str}")
        try:
            run_subprocess([PYTHON_ENV, scrape_script, "--date", date_str], cwd=ROOT_DIR)
        except Exception as e:
            print(f"❌ Error scraping data for {date_str}: {e}")
            sys.exit(1)

    # Step 3: Run update_engine.py
    print("\n--- PHASE 2: Run Multi-Market Betting Analytics Engine ---")
    engine_script = os.path.join(ENGINE_DIR, "update_engine.py")
    try:
        run_subprocess([PYTHON_ENV, engine_script], cwd=ENGINE_DIR)
    except Exception as e:
        print(f"❌ Error running Multi-Market Predictor Engine: {e}")
        sys.exit(1)

    # Step 4: Run enrich_stats.py
    print("\n--- PHASE 3: Run SofaScore Standings & Forms Enricher ---")
    enrich_script = os.path.join(ROOT_DIR, "enrich_stats.py")
    try:
        run_subprocess([PYTHON_ENV, enrich_script], cwd=ROOT_DIR)
    except Exception as e:
        print(f"❌ Error enriching Draw Finder stats: {e}")
        sys.exit(1)

    print("\n🎉 ======================================================= 🎉")
    print(f"✨ Weekly Ingestion Pipeline Completed Successfully! ✨")
    print(f"📈 Range: {start_date} to {end_date}")
    print("=========================================================== 🎉")

if __name__ == "__main__":
    main()
