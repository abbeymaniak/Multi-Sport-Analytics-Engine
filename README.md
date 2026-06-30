# 🏆 Multi-Sports Analytics Engine & Dashboard

An advanced predictive modeling and analytics platform for sports data processing and market forecasting. This system parses scheduled fixtures, rich standing statistics, and historical head-to-head (H2H) performance datasets to model outcome probabilities across five key sports betting markets.

Powered by a relational **SQLite Database Engine** on the backend and an ultra-premium **Vite React Metallic-Glassmorphic Dashboard** on the frontend, this utility automates the end-to-end data lifecycle from scraping and ingestion to probability calculation and interactive visualization.

---

## 📁 Project Architecture & Components

```text
Multi-Sports-Analytics-Engine/
├── sports-analytics-frontend/   # Premium Vite + React Frontend Dashboard
│   ├── src/                     # React application source code
│   │   ├── App.jsx              # Main dashboard component with filters, charts, and collapsible cards
│   │   ├── SofascoreData.jsx    # Standalone SofaScore feed component at /sofascoredata
│   │   ├── index.css            # Dark Obsidian-Metallic glassmorphic design system styles
│   │   ├── App.css              # Structural stylesheet overrides
│   │   └── main.jsx             # React framework entrypoint with BrowserRouter routing
│   ├── public/                  # Static web resources
│   │   ├── sports_data.json     # Copied output of calculated JSON data served to the dashboard
│   │   └── sofascore_data.json  # Standalone SofaScore live data JSON served to /sofascoredata
│   ├── package.json             # React & Vite packages manifest
│   └── vite.config.js           # Vite development server configuration with SPA fallback
├── package.json                 # Root package.json with redirect scripts
├── sofascoredata.py             # Standalone SofaScore Ingestion & 9-Market Calculation Pipeline (Dual-Endpoint Feed)
├── sofascore_data.json          # Standalone SofaScore processed dataset
├── sports_analytics.db          # Relational SQLite database
├── sports_data.json             # Root-level processed and calculated JSON database
├── update_engine.py             # Playwright/SQLite Data Pipeline & Predictive Analytics Engine
└── update_scores.py             # Standalone Live Score and Match Status Patch Updater

```

---

## ⚡ Key Features

### 1. Robust Data Pipeline (`update_engine.py`)
- **Web Automation with Playwright**: Spawns an automated Chromium session to query real-time data from SofaScore, avoiding traditional scraper hurdles and anti-scraping checks.
- **Fuzzy Match Engine**: Executes high-accuracy string similarity checks using python's `SequenceMatcher` to standardise and link team names from different data formats (e.g., matching "Man United" vs "Manchester United").
- **Smart standing Position Cache**: Dramatically improves pipeline efficiency by caching tournament standing total rosters. Reduces API queries from hundreds down to ~15 unique calls.
- **Form Fetch Fallback**: If standard standings form are unavailable (such as in friendly games or cup ties), the pipeline queries the team's historical games `/events/last/0` to extract the most recent 5 outcomes.

### 2. Structured Relational Ingestion (`sports_analytics.db`)
- Structurally normalises data into a robust SQLite database comprising three relational tables: `teams`, `fixtures`, and `h2h_records` with structured foreign keys.
- Implements transaction safety (`INSERT OR IGNORE` and specific update queries) to ensure data integrity and avoid duplicate records across multiple consecutive runs.

### 3. Five High-Yield Betting Market Models
The system calculates mathematically derived probabilities for:
1. **🛡️ Safe Double Chance (1X / X2)**: Compiles recent form wins/draw ratios weighted against standings ranking disparity to output safe outcomes ($\ge$ 75% probability threshold).
2. **⚽ Goals Over/Under 2.5**: Synthesises recent form goals distribution with historical head-to-head scorelines to calculate a combined goal bias.
3. **🔥 Both Teams to Score (BTTS)**: Forecasts clean-sheet ratios and scoring frequency ($\ge$ 65% for BTTS picks).
4. **🎯 Draw Value Picks (+EV)**: Analyzes H2H draw frequency and recent draw trends to evaluate bookmaker odds (`X`) and highlight positive expected value (+EV $\ge$ 1.10).
5. **🏆 Straight Winning Streaks**: Identifies elite teams experiencing hot consecutive winning streaks ($\ge$ 3 wins) with win probability adjustments ($\ge$ 70%).

### 4. Premium Metallic Obsidian Dashboard
- **Glassmorphism Design**: Standardised styled cards using beautiful glass layers, responsive linear gradient states, and soft neon outlines tailored to the active market.
- **Dynamic Counters**: Showcases tallies for matches meeting safety parameters across all five categories in real-time.
- **Comprehensive Filtering**: Real-time fuzzy team search, dynamic league selection dropdowns, kickoff date filtering, and multi-variable sorting (by probability, value/EV, kickoff time, or league).
- **Interactive Form Indicators**: Shows a team's last five games as glowing dots (Green for **W**, Orange for **D**, Red for **L**).
- **Collapsible H2H Inspector (Grid & List)**: Allows users to tap any match card or list row to smoothly expand and view exact historical head-to-head match histories. When the Draws or H2H Draws filter tabs are active, the drawer list dynamically filters to **only show draws** (leaving historical wins/losses hidden). For all other filters, the **full match history** is beautifully displayed in full.
- **Match Status Tracking**: Real-time status badges visually reflect current states: `● LIVE` (pulsing neon emerald green for active matches), `FT` (muted finished layout), `PP` (muted rose for postponed games), and `🕐 HH:MM` (kickoff time for scheduled matches). In list view layouts, kickoff times are elegantly preserved and displayed directly beneath active status badges (LIVE/FT/PP) for full temporal context.
- **Dynamic Cup & Friendly Highlighting**: Any match card/row in List View belonging to a cup competition or friendly match (detected by `CUP`, `cup`, `Cup`, or `Friendly` in the league name title attribute) is highlighted with a custom premium frosted crimson/light-red glassmorphic background.
- **Bookmarking Capability**: Bookmark individual fixtures of interest. Bookmarks use a stable composite match key (`date_homeTeam_awayTeam`) to ensure expanding or saving matches remains robust, correct, and state-synchronized even when sorting, filtering, or switching tabs. Bookmarks are **persistently saved** inside the browser's `localStorage`, keeping your selections intact across page reloads and refreshes.


---

## 🗄️ Relational Database Schema

The system initializes a local database named `sports_analytics.db` with the following entities:

```mermaid
erDiagram
    TEAMS {
        INTEGER id PK
        TEXT name UNIQUE
        INTEGER sofascore_id
        INTEGER league_rank
        TEXT form
    }
    FIXTURES {
        INTEGER id PK
        TEXT kickoff_date
        TEXT kickoff_time
        INTEGER home_team_id FK
        INTEGER away_team_id FK
        TEXT league
        REAL home_odds
        REAL draw_odds
        REAL away_odds
    }
    H2H_RECORDS {
        INTEGER id PK
        INTEGER fixture_id FK
        TEXT detail
        TEXT match_date
        INTEGER is_draw
    }
    TEAMS ||--o{ FIXTURES : "hosts/visits"
    FIXTURES ||--o{ H2H_RECORDS : "contains"
```

### Table Definitions:
- **`teams`**: Persists processed club names alongside parsed standing positions and their serialized string form (e.g. `W,W,D,L,W`).
- **`fixtures`**: Stores kickoff timestamps, tournament league classifications, relational team links, and kickoff betting odds.
- **`h2h_records`**: Maintains historical matches list and indicates draw occurrences.

---

## 🛠️ Getting Started & Installation

### Prerequisites
- **Python**: version 3.8 or above
- **Node.js**: version 18.0 or above

### Step 1: Install Python Dependencies
It is highly recommended to run the engine inside a Python virtual environment. You can use the existing virtual environment in your parent workspace or spin up a new one:

```bash
# Create and activate virtual environment inside this directory
python3 -m venv .venv
source .venv/bin/activate

# Install required python packages
pip install playwright

# Download headless browsers for Playwright
playwright install chromium
```

### Step 2: Run the Analytics Engine
The pipeline expects a structured scraped file `h2hstatsnet.json` at the parent directory `/Users/primastech/Workspace/prediction/h2hstatsnet.json` (generated by the parent crawler `scrape_h2h.py`). 

Run the calculations to update the SQLite database and output calculated JSON matrices:
```bash
python update_engine.py
```
This updates `sports_analytics.db` and writes both `sports_data.json` (root) and copies it into the frontend's static path at `sports-analytics-frontend/public/sports_data.json`.

### Step 3: Run the React Frontend
You can now start the React frontend dev server directly from the root workspace directory or from the frontend directory:

```bash
# Option A: Start from the root folder (highly recommended)
npm run dev

# Option B: Start from the frontend folder
cd sports-analytics-frontend
npm install
npm run dev
```

Open your web browser and navigate to:
- `http://localhost:5173/` — To view the core **Multi-Sports Analytics Engine** dashboard.
- `http://localhost:5173/sofascoredata` — To view the dedicated **SofaScore Live Data Engine** dashboard feed.

---

## 🛰️ Standalone SofaScore Data Feed

In addition to the core analytics engine, the project features a **completely standalone SofaScore Data Feed pipeline**:

1. **`sofascoredata.py`**: A dedicated Python script that uses Playwright to fetch daily events directly from SofaScore APIs.
   - **Dual-Endpoint Gathering**: SofaScore splits daily events across two separate endpoints: `/scheduled-events/{date}` (primary batch) and `/scheduled-events/{date}/inverse` (inverse batch). The pipeline queries **both** endpoints, aggregates, and de-duplicates them, enabling full data collection (1000+ events on peak days) rather than just the first batch.
   - It automatically downloads:
     - Today's global fixtures and scheduled matches.
     - Real-time tournament tables and standings positioning.
     - Comprehensive team form sequences.
     - Historical Head-to-Head (H2H) match history and outcomes.
     - Active bookmaker 1X2 odds.
     - Processes all data through the 9 predictive betting models.
   - **Atomic JSON Writes**: Both the full pipeline and the score updater perform **atomic file-swapping** (writing to `.json.tmp` and running `os.replace()`) to prevent the dashboard frontend from reading empty or partially-written JSON files.
2. **`update_scores.py`**: A highly efficient score and match status patcher that runs in seconds.
   - Instead of re-scraping standings, form, and H2H data for hundreds of games (which requires 500+ requests and takes ~15 minutes), it queries SofaScore's dual event APIs in **2 bulk requests** and updates scores, match times, and active statuses in place inside `sofascore_data.json`.
   - Preserves all calculated betting analytics, probability metrics, and standings details from the last full run.
3. **`/sofascoredata` route**: A client-side routed React dashboard powered by `react-router-dom` that mirrors the core layout but renders SofaScore live data directly, branded with a custom design.

### Run SofaScore Standalone Feed:
```bash
# Run full crawler for today's date (fetches standings, forms, H2Hs, odds, predictions)
python sofascoredata.py

# Run full crawler for a custom date
python sofascoredata.py 2026-05-27
```

### Run Live Score Updater (Lightweight):
```bash
# Instant score update for today (updates scores/statuses, keeps pre-calculated analytics)
python update_scores.py

# Instant score update for a custom date
python update_scores.py 2026-05-27
```
Outputs data atomically directly into `/sports-analytics-frontend/public/sofascore_data.json`.



---

## 📐 Mathematical Model Overview

Here is a summary of how the prediction engine calculates probability and makes recommendations:

### 1. Safe Double Chance
- Calculates individual team scores based on recent forms: 
  $$\text{Form Score} = \frac{(\text{Wins} \times 1.0) + (\text{Draws} \times 0.5)}{\text{Total Games Evaluated}}$$
- Adjusts for standings ranking disparities:
  $$\text{Rank Factor} = \text{Clamp}(-0.2, 0.2, (\text{Away Rank} - \text{Home Rank}) \times 0.015)$$
- Accounts for head-to-head draw trends:
  $$\text{Probability Improvement} = \frac{\text{H2H Draws}}{\text{Total H2H}} \times 15\%$$
- **Rule**: If Home $1X \ge 75\%$, recommend **1X**. If Away $2X \ge 75\%$, recommend **2X**.

### 2. Goals Over/Under 2.5
- Evaluates recent scoring patterns:
  - **Win**: Weights as $2.2$ average goals.
  - **Draw**: Weights as $1.8$ average goals.
  - **Loss**: Weights as $2.5$ average goals.
- Combined goals bias is formulated by combining form goals average with historical head-to-head goals.
- **Rule**: If Over 2.5 Probability $\ge 65\%$, recommend **OVER_25**. If Under 2.5 Probability $\ge 65\%$, recommend **UNDER_25**.

### 3. Draw Value (+EV) Picks
- Synthesizes head-to-head draw frequency (60% weight) with recent form draw averages (40% weight) to isolate the calculated draw probability.
- Compares calculated draw probability against bookmaker kickoff odds to evaluate expected value:
  $$\text{Expected Value (EV)} = \text{Calculated Draw Probability} \times \text{Bookmaker Draw Odds (X)}$$
- **Rule**: If Calculated Draw Probability is between $15\%$ and $65\%$, and $\text{EV} \ge 1.10$, it flags a high-yield **VALUE_DRAW** recommendation.

---

## 🎨 Styling & Customization
The dashboard implements high-fidelity dark obsidian styling loaded through `index.css`. The metallic design uses customizable CSS color tokens:
- `--bg-primary`: Deep dark base (`#0b0d10`)
- `--card-bg`: Frosted glass backing (`rgba(22, 28, 36, 0.45)`)
- `--accent-gold`: Neon value pick highlight (`#f59e0b`)
- `--accent-emerald`: Safe Double Chance mint highlight (`#10b981`)
- `--accent-cyan`: Goals indicator (`#06b6d4`)
- `--accent-rose`: Streak flame indicator (`#f43f5e`)

You can customize typography and glass layers by editing the custom property tokens in the `:root` selector of [index.css](file:///Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/sports-analytics-frontend/src/index.css).
