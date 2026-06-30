#!/usr/bin/env python3
import os
import sys
import json
import re
import urllib.request
import ssl
from datetime import datetime

ROOT_OUTPUT_JSON = "/Users/primastech/Workspace/Multi-Sports-Analytics-Engine/sofascore_data.json"
REACT_OUTPUT_JSON = "/Users/primastech/Workspace/Multi-Sports-Analytics-Engine/sports-analytics-frontend/public/sofascore_data.json"

# ============================================================
# Probability Engine (identical formulas to sofascoredata.py)
# ============================================================
def calculate_probabilities(m):
    home_form = m.get("home_form", [])
    away_form = m.get("away_form", [])
    history = m.get("history", [])
    odds = m.get("odds", {})
    home_rank = m.get("home_rank")
    away_rank = m.get("away_rank")

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

    goals_home_form = [2.2 if f == "W" else (1.8 if f == "D" else 2.5) for f in home_form]
    avg_goals_home = sum(goals_home_form) / len(goals_home_form) if home_form else 2.4

    goals_away_form = [2.2 if f == "W" else (1.8 if f == "D" else 2.5) for f in away_form]
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

    # 6. Most Scoring Half
    half_2h_prob = int(53 + (combined_avg - 2.5) * 5)
    half_2h_prob = max(40, min(75, half_2h_prob))

    half_1h_prob = int(35 - (combined_avg - 2.5) * 2)
    half_1h_prob = max(20, min(45, half_1h_prob))

    equal_prob = 100 - half_2h_prob - half_1h_prob
    if avg_form_draws > 0.3:
        equal_prob += 5
        half_2h_prob -= 5

    markets["most_scoring_half"] = {
        "half_1h_prob": half_1h_prob,
        "half_2h_prob": half_2h_prob,
        "equal_prob": equal_prob,
        "recommendation": "2H" if half_2h_prob >= 50 else ("1H" if half_1h_prob >= 40 else "EQUAL")
    }

    # 7. Corners (Over / Under 8.5)
    corners_over_prob = int(55 + (combined_avg - 2.5) * 6)
    corners_over_prob = max(30, min(85, corners_over_prob))
    corners_under_prob = 100 - corners_over_prob

    markets["corners"] = {
        "over_85_prob": corners_over_prob,
        "under_85_prob": corners_under_prob,
        "recommendation": "OVER_85" if corners_over_prob >= 60 else ("UNDER_85" if corners_under_prob >= 60 else None)
    }

    # 8. Both Teams to Score in Both Halves (GG/GG)
    gg_both_count = 0
    total_scoreline_matches = 0
    for h in history:
        score_match = re.search(r'\s(\d+):(\d+)(?:\s|$)', h.get("detail", ""))
        if score_match:
            total_scoreline_matches += 1
            h_goals = int(score_match.group(1))
            a_goals = int(score_match.group(2))
            if h_goals >= 2 and a_goals >= 2:
                gg_both_count += 1

    gg_both_percent = gg_both_count / total_scoreline_matches if total_scoreline_matches > 0 else 0.1
    gg_both_halves_prob = int((prob_btts * prob_btts) / 100 * 0.3 + gg_both_percent * 30)
    gg_both_halves_prob = max(3, min(35, gg_both_halves_prob))

    markets["gg_both_halves"] = {
        "prob": gg_both_halves_prob,
        "recommendation": "GG/GG" if gg_both_halves_prob >= 15 else None
    }

    # 9. HT/FT Turnaround (1/2 or 2/1)
    turnaround_count = 0
    for h in history:
        match_scores = re.search(r'(\d+):(\d+)\s*\((\d+):(\d+)\)', h.get("detail", ""))
        if match_scores:
            ft_h, ft_a, ht_h, ht_a = map(int, match_scores.groups())
            ht_draw = ht_h == ht_a
            ft_draw = ft_h == ft_a
            if not ht_draw and not ft_draw:
                ht_lead_h = ht_h > ht_a
                ft_lead_h = ft_h > ft_a
                if ht_lead_h != ft_lead_h:
                    turnaround_count += 1

    turnaround_percent = turnaround_count / total_scoreline_matches if total_scoreline_matches > 0 else 0.05
    rank_gap_abs = abs(away_rank - home_rank) if home_rank and away_rank else 10
    volatility_factor = max(0, min(10, (10 - rank_gap_abs) * 0.5))

    ht1_ft2_prob = int(4 + turnaround_percent * 25 + volatility_factor)
    ht2_ft1_prob = int(4 + turnaround_percent * 25 + volatility_factor)

    ht1_ft2_prob = max(2, min(18, ht1_ft2_prob))
    ht2_ft1_prob = max(2, min(18, ht2_ft1_prob))

    rec_val = None
    if ht1_ft2_prob >= 8:
        rec_val = "1/2 TURN"
    elif ht2_ft1_prob >= 8:
        rec_val = "2/1 TURN"

    markets["turnaround"] = {
        "ht1_ft2_prob": ht1_ft2_prob,
        "ht2_ft1_prob": ht2_ft1_prob,
        "recommendation": rec_val
    }

    m["markets"] = markets
    return m

def fetch_espn_matches(target_date):
    # Convert YYYY-MM-DD to YYYYMMDD
    espn_date = target_date.replace("-", "")
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates={espn_date}"
    
    print(f"Fetching matches from ESPN for {target_date}...")
    
    ctx = ssl._create_unverified_context()
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'}
    )
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read())
    except Exception as e:
        print(f"Error fetching from ESPN: {e}")
        return []
        
    events = data.get("events", [])
    print(f"Successfully retrieved {len(events)} events from ESPN.")
    
    mapped_matches = []
    
    for ev in events:
        try:
            # Extract basic info
            match_id = ev.get("id")
            iso_date = ev.get("date", "")
            
            # Format date and time
            # ESPN date format: "2026-07-01T16:00Z"
            kickoff_time = ""
            if iso_date:
                try:
                    dt = datetime.strptime(iso_date, "%Y-%m-%dT%H:%MZ")
                    kickoff_time = dt.strftime("%H:%M")
                except ValueError:
                    # Fallback
                    kickoff_time = "12:00"
            
            competition = ev.get("competitions", [])[0]
            status_type = competition.get("status", {}).get("type", {}).get("state", "pre")
            
            # Competitors
            competitors = competition.get("competitors", [])
            home_team_data = next((c for c in competitors if c.get("homeAway") == "home"), None)
            away_team_data = next((c for c in competitors if c.get("homeAway") == "away"), None)
            
            if not home_team_data or not away_team_data:
                continue
                
            home_team = home_team_data.get("team", {}).get("displayName", "Unknown")
            away_team = away_team_data.get("team", {}).get("displayName", "Unknown")
            
            # Form (ESPN provides it as e.g. "WLDLD" or similar)
            home_form_str = home_team_data.get("form", "")
            away_form_str = away_team_data.get("form", "")
            
            home_form = list(home_form_str.upper()) if home_form_str else []
            away_form = list(away_form_str.upper()) if away_form_str else []
            
            # League
            league_name = ev.get("season", {}).get("slug", "Soccer")
            if "Round" in league_name or "round" in league_name:
                # Use the game note or league name from the top-level
                league_name = competition.get("altGameNote", "International")
            
            # Scores (if finished/live)
            h_score = int(home_team_data.get("score", 0)) if status_type != "pre" else None
            a_score = int(away_team_data.get("score", 0)) if status_type != "pre" else None
            
            match = {
                "date": target_date,
                "time": kickoff_time,
                "title": f"{home_team} - {away_team}",
                "home_team": home_team,
                "away_team": away_team,
                "league": league_name,
                "odds": {
                    "1": 1.95,
                    "X": 3.40,
                    "2": 3.60
                },
                "history": [],
                "marked_count": 0,
                "total_history_count": 0,
                "home_rank": None,
                "away_rank": None,
                "home_form": home_form,
                "away_form": away_form,
                "status": "notstarted" if status_type == "pre" else status_type,
                "home_score": h_score,
                "away_score": a_score,
                "sofascore_event_id": f"espn_{match_id}",
            }
            
            # Calculate predictions
            calculate_probabilities(match)
            mapped_matches.append(match)
            
        except Exception as ex:
            print(f"Error parsing event: {ex}")
            continue
            
    return mapped_matches

def main():
    if len(sys.argv) > 1 and re.match(r'^\d{4}-\d{2}-\d{2}$', sys.argv[1]):
        target_date = sys.argv[1]
    else:
        target_date = datetime.now().strftime("%Y-%m-%d")
        
    print(f"=== ESPN BACKUP INGESTION FOR {target_date} ===")
    
    new_matches = fetch_espn_matches(target_date)
    if not new_matches:
        print("No matches fetched. Exiting.")
        return
        
    # Load existing matches to merge/append
    existing_matches = []
    if os.path.exists(ROOT_OUTPUT_JSON):
        try:
            with open(ROOT_OUTPUT_JSON, "r", encoding="utf-8") as f:
                existing_matches = json.load(f)
        except Exception as e:
            print(f"Warning: Could not parse existing JSON: {e}")
            
    # Merge
    merged_map = {}
    for m in existing_matches:
        eid = m.get("sofascore_event_id")
        if eid:
            key = f"id_{eid}"
        else:
            key = f"key_{m.get('date')}_{m.get('home_team')}_{m.get('away_team')}"
        merged_map[key] = m
        
    for m in new_matches:
        eid = m.get("sofascore_event_id")
        key = f"id_{eid}"
        merged_map[key] = m
        
    final_matches = list(merged_map.values())
    final_matches.sort(key=lambda x: (x.get("date", ""), x.get("time", "")))
    
    # Save
    json_payload = json.dumps(final_matches, indent=2, ensure_ascii=False)
    
    # Save to Root
    with open(ROOT_OUTPUT_JSON, "w", encoding="utf-8") as f:
        f.write(json_payload)
    print(f"Saved to: {ROOT_OUTPUT_JSON}")
    
    # Save to React
    react_dir = os.path.dirname(REACT_OUTPUT_JSON)
    if os.path.exists(react_dir):
        with open(REACT_OUTPUT_JSON, "w", encoding="utf-8") as f:
            f.write(json_payload)
        print(f"Saved React copy to: {REACT_OUTPUT_JSON}")
        
    print(f"Done! Ingested {len(new_matches)} matches for {target_date}.")

if __name__ == "__main__":
    main()
