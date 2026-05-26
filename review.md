# 📖 Developer Handover & Architecture Review: Multi-Sports Analytics Engine

Welcome! This document outlines the technical architecture, data structures, and pipeline workflow of the **Multi-Sports Analytics Engine & Dashboard** to enable smooth pairing or immediate onboarding for any future developer or agent.

---

## 🏗️ Directory Map & Ecosystem

The suite is divided into two distinct platforms sharing unified datasets:
1. **H2H Stats Draw Finder Dashboard (`h2h-app`)**: An interactive dashboard analyzing historical draw rates.
2. **Multi-Sports Analytics Engine (`Multi-Sports-Analytics-Engine`)**: A multi-market prediction platform utilizing a relational SQLite database and weighted mathematical forecasting model.

```
prediction/
  ├── h2h-app/                           # [Existing] Draw Finder Frontend
  ├── draws/                             # [Existing] Base draws model
  │     └── .venv/                       # Python Virtual Environment (used globally)
  ├── scrape_h2h.py                      # Scrapes H2H stats (saves to h2hstatsnet.json)
  ├── enrich_stats.py                    # Enriches H2H stats (saves home/away form and rank)
  ├── h2hstatsnet.json                   # Consolidated raw JSON dataset
  │
  ├── Multi-Sports-Analytics-Engine/     # 🌟 Multi-Sports Engine & Dashboard
  │     ├── weekly_pipeline.py           # [NEW] Pipeline Orchestrator (Mon-Sun)
  │     ├── run_weekly.sh                # [NEW] Manual shell script runner with file logging
  │     ├── com.prediction.weekly.plist  # [NEW] macOS launchd service scheduler (Mondays 3:00 AM)
  │     ├── update_engine.py             # Playwright crawler & analytical probability processor
  │     ├── sports_analytics.db          # Relational SQLite Database
  │     ├── sports_data.json             # Engine's calculated predictions JSON
  │     │
  │     ├── logs/                        # [NEW] Subfolder for execution and launchd logs
  │     │     ├── launchd_stdout.log
  │     │     ├── launchd_stderr.log
  │     │     └── weekly_run_YYYY-MM-DD.log
  │     │
  │     └── sports-analytics-frontend/   # Obsidian Obsidian Metallic Glassmorphic React App
  │           ├── package.json
  │           ├── vite.config.js
  │           └── public/
  │                 └── sports_data.json # Symlinked/copied prediction data
```

---

## 🧮 Multi-Market Betting Analytics Formula

The calculation model processes team ranks, recent form, historical head-to-head ratios, and kickoff bookmaker odds. The prediction formula processes five unique markets:

### 1. Safe Double Chance (1X / X2)
* **Logic**: Flags high-probability safety choices.
* **1X (Home Win/Draw)**: `(Home Win Rate + Home Draw Rate in last 5 home matches) * 0.6` weighted against `(Away Loss Rate + Away Draw Rate in last 5 away matches) * 0.4` plus tournament standings rank gap buffer.
* **Filter**: Pick is flagged premium if the computed probability is **$\ge$ 75%**.

### 2. Over / Under 2.5 Goals
* **Logic**: Evaluates goal frequency trends.
* **Formula**: Integrates the home team's goal averages, away team's goal averages, and past H2H average scorelines.
* **Thresholds**: 
  * If average goals $> 2.8 \rightarrow$ **Over 2.5** Pick.
  * If average goals $< 1.8 \rightarrow$ **Under 2.5** Pick.

### 3. Both Teams to Score (BTTS)
* **Logic**: Forecasts offensive and defensive metrics.
* **Formula**: `(Home BTTS rate in last 5 matches + Away BTTS rate in last 5 matches) / 2` adjusted by historical head-to-head clean sheet ratios.
* **Filter**: Flagged as a strong selection if probability is **$\ge$ 65%**.

### 4. Draw Value Picks (+EV)
* **Logic**: Capitalizes on mispriced bookmaker draw odds.
* **Formula**: Expected Value ($\text{EV}$) is calculated as $\text{EV} = P_{\text{draw}} \times \text{Odds}_{\text{draw}}$.
* **Filter**: Flagged as gold premium if **Expected Value $\ge$ 1.10** (indicating a $\ge$ 10% theoretical positive yield).

### 5. Straight Winning Streaks
* **Logic**: Identifies elite teams currently dominant on active runs.
* **Formula**: Evaluates consecutive `W` matches from SofaScore form.
* **Filter**: Flagged if a team has an active streak of **$\ge$ 3 consecutive wins** AND calculated home/away win probability is **$\ge$ 70%** (standings gap and home-field weight).

---

## 🗃️ Relational SQLite Database Design (`sports_analytics.db`)

The SQLite database enables historical querying and dashboards through three main tables:

```mermaid
erDiagram
    teams {
        INTEGER id PK
        TEXT name UNIQUE
        INTEGER sofascore_id
        INTEGER league_rank
        TEXT form
    }
    fixtures {
        INTEGER id PK
        TEXT kickoff_date
        TEXT kickoff_time
        INTEGER home_team_id FK
        INTEGER away_team_id FK
        TEXT league
        REAL home_odds
        REAL draw_odds
        REAL away_odds
        INTEGER home_score
        INTEGER away_score
        TEXT status
        TEXT half_rec
        TEXT corners_rec
        REAL gg_both_prob
        TEXT turnaround_rec
    }
    h2h_records {
        INTEGER id PK
        INTEGER fixture_id FK
        TEXT detail
        TEXT match_date
        INTEGER is_draw
    }
    teams ||--o{ fixtures : "home or away team"
    fixtures ||--o{ h2h_records : "has past H2H matches"
```

---

## 🔄 Automated Data Ingestion Pipeline

To run the pipeline manually or view schedules:

### 1. Manual Execution
Run the orchestrator using the repository virtual environment:
```bash
/Users/primastech/Workspace/prediction/draws/.venv/bin/python /Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/weekly_pipeline.py
```

* **Option B (Wipe & Reset)**: To prevent upcoming matches from carrying over stale predictions from week to week, `weekly_pipeline.py` starts by resetting `h2h_records` and `fixtures` database tables and initializing the raw JSON logs `h2hstatsnet.json` to an empty state `[]`.
* **Execution Flow**:
  1. Wipes upcoming databases and JSON logs.
  2. Dynamically calculates current week's dates (Monday to Sunday).
  3. Sequentially triggers `scrape_h2h.py --date YYYY-MM-DD` for all 7 days of the week.
  4. Runs `update_engine.py` (Playwright session matches schedules on SofaScore, writes tables to SQLite database, runs probability metrics, updates `sports_data.json`).
  5. Runs `enrich_stats.py` (Enriches standings ranks and forms on the original `h2hstatsnet.json` to feed the root `h2h-app` dashboard).

### 2. macOS Daemon Automation (`launchd`)
To schedule execution every **Monday at 3:00 AM**, install the property plist file into your macOS launch agents:

```bash
# 1. Copy the plist configuration to launchd user directory
cp /Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/com.prediction.weekly.plist ~/Library/LaunchAgents/

# 2. Load the plist daemon to register it with the operating system
launchctl load ~/Library/LaunchAgents/com.prediction.weekly.plist

# 3. Force-trigger a run immediately to test the launchd configuration
launchctl start com.prediction.weekly
```

Logs are automatically written to `/Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/logs/`.

---

## ⚡ How to Run Dashboard Servers

To launch the Obsidian Metallic dashboard:
```bash
cd /Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/sports-analytics-frontend
npm run dev
```

To launch the original Draw Finder dashboard:
```bash
cd /Users/primastech/Workspace/prediction/h2h-app
npm run dev
```
