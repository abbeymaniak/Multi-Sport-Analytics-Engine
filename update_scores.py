#!/usr/bin/env python3
"""
Lightweight Score Updater — fetches ONLY current scores and statuses
from SofaScore, then patches the existing sofascore_data.json in-place.

This is much faster than a full sofascoredata.py run because it:
  - Makes only 1-2 API calls (scheduled-events + inverse) instead of 500+
  - Skips standings, form, H2H, and odds (those don't change mid-day)
  - Preserves all existing predictions and analytics

Usage:
  python3 update_scores.py              # updates today's matches
  python3 update_scores.py 2026-05-27   # updates a specific date
"""
import os
import sys
import json
import re
from datetime import datetime

ROOT_JSON = "/Users/primastech/Workspace/Multi-Sports-Analytics-Engine/sofascore_data.json"
REACT_JSON = "/Users/primastech/Workspace/Multi-Sports-Analytics-Engine/sports-analytics-frontend/public/sofascore_data.json"

SOFASCORE_BASE = "https://www.sofascore.com/api/v1/sport/football/scheduled-events"


async def main():
    import asyncio
    from playwright.async_api import async_playwright

    # Determine target date
    if len(sys.argv) > 1 and re.match(r'^\d{4}-\d{2}-\d{2}$', sys.argv[1]):
        target_date = sys.argv[1]
    else:
        target_date = datetime.now().strftime("%Y-%m-%d")

    print(f"{'='*50}")
    print(f"  Score Updater — {target_date}")
    print(f"{'='*50}")

    # Load existing data
    if not os.path.exists(ROOT_JSON):
        print(f"ERROR: {ROOT_JSON} not found. Run sofascoredata.py first.")
        return

    with open(ROOT_JSON, "r", encoding="utf-8") as f:
        matches = json.load(f)

    # Build lookup by event ID for fast patching
    match_by_id = {}
    for m in matches:
        eid = m.get("sofascore_event_id")
        if eid:
            match_by_id[eid] = m

    if not match_by_id:
        print("No matches with event IDs found in the data. Nothing to update.")
        return

    print(f"Loaded {len(matches)} matches ({len(match_by_id)} with event IDs)\n")

    # Fetch fresh event data from SofaScore (primary + inverse)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        await page.goto("https://www.sofascore.com/", wait_until="domcontentloaded")
        await asyncio.sleep(1)

        fresh_events = {}
        base_url = f"{SOFASCORE_BASE}/{target_date}"

        for label, url in [("primary", base_url), ("inverse", f"{base_url}/inverse")]:
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                content = await page.evaluate("() => document.body.innerText")
                data = json.loads(content)
                batch = data.get('events', [])
                for ev in batch:
                    eid = ev.get('id')
                    if eid:
                        fresh_events[eid] = ev
                print(f"  [{label}] Fetched {len(batch)} events")
            except Exception as e:
                print(f"  [{label}] Failed: {e}")
            await asyncio.sleep(0.3)

        await browser.close()

    if not fresh_events:
        print("ERROR: Could not fetch events from SofaScore.")
        return

    print(f"\nFetched {len(fresh_events)} fresh events from SofaScore\n")

    # Patch scores and statuses
    updated = 0
    for eid, fresh in fresh_events.items():
        if eid not in match_by_id:
            continue

        m = match_by_id[eid]
        new_status = fresh.get('status', {}).get('type', m.get('status', 'notstarted'))
        new_h_score = fresh.get('homeScore', {}).get('current')
        new_a_score = fresh.get('awayScore', {}).get('current')

        # Detect actual changes
        changed = False
        if m.get('status') != new_status:
            changed = True
        if m.get('home_score') != new_h_score or m.get('away_score') != new_a_score:
            changed = True

        if changed:
            old_status = m.get('status', '?')
            old_score = f"{m.get('home_score', '?')}-{m.get('away_score', '?')}"
            m['status'] = new_status
            m['home_score'] = new_h_score
            m['away_score'] = new_a_score
            new_score = f"{new_h_score}-{new_a_score}"
            print(f"  ✓ {m['title']: <45} {old_status: <12} → {new_status: <12} | {old_score} → {new_score}")
            updated += 1

    print(f"\n{'='*50}")
    print(f"  Updated {updated} matches")
    print(f"{'='*50}")

    if updated == 0:
        print("No changes detected. Data is already up to date.")
        return

    # Atomic write back
    json_payload = json.dumps(matches, indent=2, ensure_ascii=False)

    tmp = ROOT_JSON + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(json_payload)
    os.replace(tmp, ROOT_JSON)
    print(f"Saved to: {ROOT_JSON}")

    react_dir = os.path.dirname(REACT_JSON)
    if os.path.exists(react_dir):
        tmp = REACT_JSON + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(json_payload)
        os.replace(tmp, REACT_JSON)
        print(f"Saved React copy to: {REACT_JSON}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
