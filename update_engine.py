#!/usr/bin/env python3
import os
import sys
import json
import re
import sqlite3
import asyncio
from datetime import datetime
from difflib import SequenceMatcher
from playwright.async_api import async_playwright

# --- CONFIGURATION ---
TIMEOUT = 30000
DB_PATH = "/Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/sports_analytics.db"
ROOT_OUTPUT_JSON = "/Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/sports_data.json"
REACT_OUTPUT_JSON = "/Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/sports-analytics-frontend/public/sports_data.json"
H2H_JSON_PATH = "/Users/primastech/Workspace/prediction/h2hstatsnet.json"

# Helper to calculate name similarity
def name_similarity(s1, s2):
    if not s1 or not s2:
        return 0.0
    return SequenceMatcher(None, s1.lower(), s2.lower()).ratio()

# Playwright helper to get JSON
async def get_json(page, url):
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT)
        content = await page.evaluate("() => document.body.innerText")
        return json.loads(content)
    except Exception as e:
        return None

# Parse results (W, D, L) from raw events
def parse_raw_events(raw_events, team_id):
    results = []
    if not raw_events or not isinstance(raw_events, dict):
        return []
    for e in raw_events.get('events', []):
        if e.get('status', {}).get('type') != "finished":
            continue
        h_score_obj = e.get('homeScore', {})
        a_score_obj = e.get('awayScore', {})
        if 'current' not in h_score_obj or 'current' not in a_score_obj:
            continue
            
        hs, ascore = h_score_obj['current'], a_score_obj['current']
        is_home = e.get('homeTeam', {}).get('id') == team_id
        team_s, opp_s = (hs, ascore) if is_home else (ascore, hs)
        res = "D" if hs == ascore else ("W" if team_s > opp_s else "L")
        results.append(res)
        if len(results) >= 5:
            break
    return results

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        sofascore_id INTEGER,
        league_rank INTEGER,
        form TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fixtures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kickoff_date TEXT,
        kickoff_time TEXT,
        home_team_id INTEGER,
        away_team_id INTEGER,
        league TEXT,
        home_odds REAL,
        draw_odds REAL,
        away_odds REAL,
        FOREIGN KEY(home_team_id) REFERENCES teams(id),
        FOREIGN KEY(away_team_id) REFERENCES teams(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS h2h_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fixture_id INTEGER,
        detail TEXT,
        match_date TEXT,
        is_draw INTEGER,
        FOREIGN KEY(fixture_id) REFERENCES fixtures(id)
    )
    """)
    
    conn.commit()
    conn.close()

# Save parsed entities into SQLite Relational Database
def save_to_sqlite(m):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 1. Insert/Update Teams
        cursor.execute("INSERT OR IGNORE INTO teams (name) VALUES (?)", (m["home_team"],))
        cursor.execute("SELECT id FROM teams WHERE name = ?", (m["home_team"],))
        home_id = cursor.fetchone()[0]
        
        cursor.execute("INSERT OR IGNORE INTO teams (name) VALUES (?)", (m["away_team"],))
        cursor.execute("SELECT id FROM teams WHERE name = ?", (m["away_team"],))
        away_id = cursor.fetchone()[0]
        
        # Update SofaScore ranks/forms if available
        home_form_str = ",".join(m.get("home_form", []))
        away_form_str = ",".join(m.get("away_form", []))
        
        cursor.execute("UPDATE teams SET league_rank = ?, form = ? WHERE id = ?", (m.get("home_rank"), home_form_str, home_id))
        cursor.execute("UPDATE teams SET league_rank = ?, form = ? WHERE id = ?", (m.get("away_rank"), away_form_str, away_id))
        
        # 2. Insert Fixture
        cursor.execute("""
        INSERT INTO fixtures (kickoff_date, kickoff_time, home_team_id, away_team_id, league, home_odds, draw_odds, away_odds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            m.get("date"),
            m.get("time"),
            home_id,
            away_id,
            m.get("league"),
            m.get("odds", {}).get("1"),
            m.get("odds", {}).get("X"),
            m.get("odds", {}).get("2")
        ))
        fixture_id = cursor.lastrowid
        
        # 3. Insert H2H History Records
        for h in m.get("history", []):
            is_draw = 1 if h.get("is_marked") else 0
            cursor.execute("""
            INSERT INTO h2h_records (fixture_id, detail, match_date, is_draw)
            VALUES (?, ?, ?, ?)
            """, (fixture_id, h.get("detail"), h.get("date"), is_draw))
            
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"SQLite Write Error: {e}")

# Compute betting analytical probabilities for all 5 markets
def calculate_probabilities(m):
    home_form = m.get("home_form", [])
    away_form = m.get("away_form", [])
    history = m.get("history", [])
    odds = m.get("odds", {})
    home_rank = m.get("home_rank")
    away_rank = m.get("away_rank")
    
    # Base layout
    markets = {
        "double_chance": {"home_1x_prob": 50, "away_2x_prob": 50, "recommendation": None},
        "over_under": {"avg_goals_home": 0.0, "avg_goals_away": 0.0, "over_25_prob": 50, "under_25_prob": 50, "recommendation": None},
        "btts": {"prob": 50, "recommendation": None},
        "draw_value": {"prob": 0, "ev": 0.0, "recommendation": None},
        "streaks": {"home_streak": 0, "away_streak": 0, "recommendation": None}
    }
    
    # 1. Safe Double Chance (1X / X2)
    if home_form:
        home_wins = home_form.count("W")
        home_draws = home_form.count("D")
        home_score = (home_wins * 1.0 + home_draws * 0.5) / len(home_form)
    else:
        home_score = 0.5
        
    if away_form:
        away_wins = away_form.count("W")
        away_draws = away_form.count("D")
        away_score = (away_wins * 1.0 + away_draws * 0.5) / len(away_form)
    else:
        away_score = 0.5
        
    rank_factor = 0.0
    if home_rank and away_rank:
        rank_gap = away_rank - home_rank
        rank_factor = max(-0.2, min(0.2, rank_gap * 0.015))
        
    prob_1x = int(max(20, min(95, (home_score * 0.6 + (1 - away_score) * 0.4 + rank_factor) * 100)))
    prob_2x = int(max(20, min(95, (away_score * 0.6 + (1 - home_score) * 0.4 - rank_factor) * 100)))
    
    h2h_draw_percent = 0.0
    if history:
        h2h_draws = sum(1 for h in history if h.get("is_marked"))
        h2h_draw_percent = h2h_draws / len(history)
        prob_1x = int(min(98, prob_1x + h2h_draw_percent * 15))
        prob_2x = int(min(98, prob_2x + h2h_draw_percent * 15))
        
    markets["double_chance"]["home_1x_prob"] = prob_1x
    markets["double_chance"]["away_2x_prob"] = prob_2x
    
    if prob_1x >= 75 and (not home_rank or not away_rank or home_rank < away_rank + 3):
        markets["double_chance"]["recommendation"] = "1X"
    elif prob_2x >= 75 and (not home_rank or not away_rank or away_rank < home_rank + 3):
        markets["double_chance"]["recommendation"] = "2X"
        
    # 2. Over / Under 2.5 Goals
    h2h_goals = []
    for h in history:
        score_match = re.search(r'\s(\d+):(\d+)(?:\s|$)', h.get("detail", ""))
        if score_match:
            h2h_goals.append(int(score_match.group(1)) + int(score_match.group(2)))
            
    avg_h2h_goals = sum(h2h_goals) / len(h2h_goals) if h2h_goals else 2.5
    
    goals_home_form = [2.2 if f=="W" else (1.8 if f=="D" else 2.5) for f in home_form]
    avg_goals_home = sum(goals_home_form) / len(goals_home_form) if home_form else 2.4
    
    goals_away_form = [2.2 if f=="W" else (1.8 if f=="D" else 2.5) for f in away_form]
    avg_goals_away = sum(goals_away_form) / len(goals_away_form) if away_form else 2.4
    
    combined_avg = (avg_goals_home + avg_goals_away + avg_h2h_goals) / 3
    prob_over_25 = int(max(10, min(90, (combined_avg / 4.0) * 100)))
    prob_under_25 = 100 - prob_over_25
    
    markets["over_under"]["avg_goals_home"] = round(avg_goals_home, 2)
    markets["over_under"]["avg_goals_away"] = round(avg_goals_away, 2)
    markets["over_under"]["over_25_prob"] = prob_over_25
    markets["over_under"]["under_25_prob"] = prob_under_25
    
    if prob_over_25 >= 65:
        markets["over_under"]["recommendation"] = "OVER_25"
    elif prob_under_25 >= 65:
        markets["over_under"]["recommendation"] = "UNDER_25"
        
    # 3. Both Teams to Score (BTTS)
    h2h_btts_count = 0
    for h in history:
        score_match = re.search(r'\s(\d+):(\d+)(?:\s|$)', h.get("detail", ""))
        if score_match:
            if int(score_match.group(1)) > 0 and int(score_match.group(2)) > 0:
                h2h_btts_count += 1
    h2h_btts_percent = h2h_btts_count / len(history) if history else 0.5
    
    prob_btts = int(max(10, min(95, (prob_over_25 * 0.6 + h2h_btts_percent * 40))))
    markets["btts"]["prob"] = prob_btts
    if prob_btts >= 65:
        markets["btts"]["recommendation"] = "BTTS_YES"
        
    # 4. Draw Value Picks (+EV)
    draws_home = home_form.count("D") / len(home_form) if home_form else 0.25
    draws_away = away_form.count("D") / len(away_form) if away_form else 0.25
    avg_form_draws = (draws_home + draws_away) / 2
    h2h_draw_percent = sum(1 for h in history if h.get("is_marked")) / len(history) if history else 0.25
    
    prob_draw = (h2h_draw_percent * 0.6 + avg_form_draws * 0.4)
    prob_draw_percent = int(max(15, min(65, prob_draw * 100)))
    markets["draw_value"]["prob"] = prob_draw_percent
    
    draw_odds = odds.get("X", 0.0)
    if draw_odds > 0.0:
        ev = (prob_draw_percent / 100.0) * draw_odds
        markets["draw_value"]["ev"] = round(ev, 2)
        if ev >= 1.10:
            markets["draw_value"]["recommendation"] = "VALUE_DRAW"
            
    # 5. Straight Winning Streaks
    home_streak = 0
    for f in home_form:
        if f == "W":
            home_streak += 1
        else:
            break
            
    away_streak = 0
    for f in away_form:
        if f == "W":
            away_streak += 1
        else:
            break
            
    markets["streaks"]["home_streak"] = home_streak
    markets["streaks"]["away_streak"] = away_streak
    
    if home_streak >= 3:
        win_prob = 55 + (home_streak * 5) + (rank_factor * 50)
        win_prob = int(max(20, min(95, win_prob)))
        if win_prob >= 70:
            markets["streaks"]["recommendation"] = "HOME_STREAK"
    elif away_streak >= 3:
        win_prob = 45 + (away_streak * 5) - (rank_factor * 50)
        win_prob = int(max(20, min(95, win_prob)))
        if win_prob >= 70:
            markets["streaks"]["recommendation"] = "AWAY_STREAK"
            
    m["markets"] = markets
    return m

async def main():
    if not os.path.exists(H2H_JSON_PATH):
        print(f"Error: Scraped JSON not found at {H2H_JSON_PATH}. Run scrape_h2h.py first.")
        sys.exit(1)
        
    with open(H2H_JSON_PATH, "r", encoding="utf-8") as f:
        matches = json.load(f)
        
    if not matches:
        print("No matches loaded.")
        return
        
    print(f"Loaded {len(matches)} matches from {H2H_JSON_PATH}...")
    
    # Initialize the relational SQLite Database
    init_db()
    
    # Group matches by date
    matches_by_date = {}
    for m in matches:
        date = m.get("date", "2026-05-25")
        if date not in matches_by_date:
            matches_by_date[date] = []
        matches_by_date[date].append(m)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        # Initialize SofaScore cookies
        await page.goto("https://www.sofascore.com/", wait_until="domcontentloaded")
        await asyncio.sleep(2)
        
        # Standings and form caches
        standings_cache = {}
        team_form_cache = {}
        
        for date, date_matches in matches_by_date.items():
            print(f"\n--- Fetching SofaScore scheduled events for {date} ---")
            sofascore_url = f"https://www.sofascore.com/api/v1/sport/football/scheduled-events/{date}"
            evs = await get_json(page, sofascore_url)
            if not evs:
                print(f"No SofaScore events found for date {date}.")
                continue
                
            sofascore_events = evs.get('events', [])
            print(f"Found {len(sofascore_events)} scheduled events on SofaScore.")
            
            for m in date_matches:
                home_team = m.get("home_team", "")
                away_team = m.get("away_team", "")
                
                # Match to SofaScore event using fuzzy name similarity
                matched_event = None
                best_sim = 0.0
                for event in sofascore_events:
                    s_home = event.get('homeTeam', {}).get('name', '')
                    s_away = event.get('awayTeam', {}).get('name', '')
                    
                    sim_home = name_similarity(home_team, s_home)
                    sim_away = name_similarity(away_team, s_away)
                    
                    avg_sim = (sim_home + sim_away) / 2
                    if sim_home > 0.65 and sim_away > 0.65 and avg_sim > best_sim:
                        best_sim = avg_sim
                        matched_event = event
                
                # Default SofaScore fields
                m["home_rank"] = None
                m["away_rank"] = None
                m["home_form"] = []
                m["away_form"] = []
                
                if matched_event:
                    home_team_id = matched_event['homeTeam']['id']
                    away_team_id = matched_event['awayTeam']['id']
                    
                    tournament_id = matched_event.get('tournament', {}).get('uniqueTournament', {}).get('id')
                    season_id = matched_event.get('season', {}).get('id')
                    
                    standings_data = None
                    if tournament_id and season_id:
                        cache_key = (tournament_id, season_id)
                        if cache_key in standings_cache:
                            standings_data = standings_cache[cache_key]
                        else:
                            standings_url = f"https://www.sofascore.com/api/v1/unique-tournament/{tournament_id}/season/{season_id}/standings/total"
                            raw_standings = await get_json(page, standings_url)
                            standings_map = {}
                            if raw_standings and isinstance(raw_standings, dict):
                                for standing in raw_standings.get('standings', []):
                                    if standing.get('type') == 'total':
                                        for row in standing.get('rows', []):
                                            t_id = row.get('team', {}).get('id')
                                            t_position = row.get('position')
                                            t_form = row.get('form', [])
                                            
                                            standings_map[t_id] = {
                                                "rank": t_position,
                                                "form": t_form
                                            }
                            standings_cache[cache_key] = standings_map
                            standings_data = standings_map
                    
                    if standings_data:
                        if home_team_id in standings_data:
                            m["home_rank"] = standings_data[home_team_id]["rank"]
                            m["home_form"] = standings_data[home_team_id]["form"] or []
                        if away_team_id in standings_data:
                            m["away_rank"] = standings_data[away_team_id]["rank"]
                            m["away_form"] = standings_data[away_team_id]["form"] or []
                            
                    # Fallback to team events if form is empty
                    if not m["home_form"]:
                        if home_team_id in team_form_cache:
                            m["home_form"] = team_form_cache[home_team_id]
                        else:
                            raw_events = await get_json(page, f"https://www.sofascore.com/api/v1/team/{home_team_id}/events/last/0")
                            home_form = parse_raw_events(raw_events, home_team_id)
                            team_form_cache[home_team_id] = home_form
                            m["home_form"] = home_form
                            await asyncio.sleep(0.1)
                            
                    if not m["away_form"]:
                        if away_team_id in team_form_cache:
                            m["away_form"] = team_form_cache[away_team_id]
                        else:
                            raw_events = await get_json(page, f"https://www.sofascore.com/api/v1/team/{away_team_id}/events/last/0")
                            away_form = parse_raw_events(raw_events, away_team_id)
                            team_form_cache[away_team_id] = away_form
                            m["away_form"] = away_form
                            await asyncio.sleep(0.1)
                            
                    m["home_form"] = [f.upper() for f in m["home_form"]]
                    m["away_form"] = [f.upper() for f in m["away_form"]]
                    
                # Run the betting probability engine
                calculate_probabilities(m)
                
                # Write record to the relational SQLite Database
                save_to_sqlite(m)
                
            print(f"Successfully processed and calculated markets for {len(date_matches)} matches.")
            
        await browser.close()
        
    # Write output to the workspace directory
    with open(ROOT_OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(matches, f, indent=2, ensure_ascii=False)
    print(f"\nSaved Multi-Sports data to root at: {ROOT_OUTPUT_JSON}")
    
    # Write output copy to React app public directory if exists
    react_public_dir = os.path.dirname(REACT_OUTPUT_JSON)
    if os.path.exists(react_public_dir):
        with open(REACT_OUTPUT_JSON, "w", encoding="utf-8") as f:
            json.dump(matches, f, indent=2, ensure_ascii=False)
        print(f"Saved Multi-Sports copy to React app public folder: {REACT_OUTPUT_JSON}")
    else:
        print(f"React app public folder not found yet: {react_public_dir}. Will copy during React setup.")

if __name__ == "__main__":
    asyncio.run(main())
