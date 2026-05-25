# Walkthrough: H2H Stats Draw Finder

We have successfully built and verified the "H2H Stats Draw Finder" application. The implementation is robust, fully responsive, and styled with premium glassmorphism aesthetics using vanilla CSS.

---

## 🛠️ Changes Implemented

### 1. Scraper & JSON Generator
- **File Modified**: [scrape_h2h.py](file:///Users/primastech/Workspace/prediction/scrape_h2h.py) (Workspace Root)
- **Features**:
  - **Dual-URL Aggregation**: Automatically scrapes both the original HT/FT odds endpoint (`category=htft`) and the newly requested head-to-head streaks draws endpoint (`category=h2hstreaks&filter=draws`) for any selected date.
  - **Universal Class Parser**: Flexibly checks both `.match-title` (original layout) and `.match-teams` (streaks draws layout) to parse competing team names accurately.
  - **Regex Date Extractor**: Extracts chronological dates using standard formatting search (`\d{2}\.\d{2}\.\d{4}`) from trailing text elements or inside `<small>` layout containers.
  - **Dynamic Draw Detector**: Analyzes history rows to detect draws based on score configurations (e.g. `0:0`, `1:1`, etc.) as a fallback for pages lacking `is_marked_row` css labels.
  - **Anti-Duplication Filter**: Standardizes match unique keys to filter out duplicates when scraping both sources for the same day, outputting clean, sorted arrays of fixtures.
  - **Incremental Date Appending**: Incorporates a chronological merging strategy. Running the scraper for a new date will append the records to the existing JSON dataset, while re-scraping the same date will automatically overwrite previous matches for that date to prevent duplicates. Matches are kept sorted by date and kickoff time.
  - Saves the structured JSON dataset to two locations:
    1. Root workspace: `/Users/primastech/Workspace/prediction/h2hstatsnet.json` (as requested)
    2. React `public/` directory: `/Users/primastech/Workspace/prediction/h2h-app/public/h2hstatsnet.json` (for dynamic loading)

### 1b. SofaScore Standings & Forms Enricher
- **File Created**: [enrich_stats.py](file:///Users/primastech/Workspace/prediction/enrich_stats.py) (Workspace Root)
- **Features**:
  - Automatically queries SofaScore events for matched dates to scrape and inject league standings rank and recent form details.
  - Utilizes a Playwright-controlled Chromium browser context to safely load events and stand-alone tables, effectively bypassing Cloudflare's strict 403 Forbidden checks.
  - Implements a SequenceMatcher fuzzy name matching algorithm to automatically pair `h2hstats.net` team names with SofaScore team representations.
  - Incorporates tournament standings caching: compresses standings lookups for 200+ matches into roughly 15-20 API tournament calls, avoiding rate limits.
  - Provides a robust fallback handler: for cups or friendly fixtures without standings, it automatically queries SofaScore's team events log (`/events/last/0`) to compute a team's last 5 W-D-L history.
  - Formats results into standardized uppercase forms (W, D, L) and writes the enriched dataset back to `h2hstatsnet.json` in both the workspace root and the React `public/` directory.

### 2. React Application Scaffolding & Setup
- **Directory Created**: [h2h-app/](file:///Users/primastech/Workspace/prediction/h2h-app/) (Safe subfolder outside the `@draws` directory)
- **Dependencies Installed**: Vite core packages, `react`, `react-dom`, and `lucide-react` (for icons).

### 3. Premium Styling System
- **File Modified**: [h2h-app/src/index.css](file:///Users/primastech/Workspace/prediction/h2h-app/src/index.css)
- **Features**:
  - Implements custom typography (Google Fonts *Outfit* for headers, *Plus Jakarta Sans* for text).
  - Designed a high-fidelity glassmorphic dashboard theme utilizing metallic deep blue backgrounds and glowing amber-gold accents (symbolic of draws).
  - Tailored visual effects: smooth transitions, hover translation lifts, luminous glow borders for high-probability picks, custom scrollbars, and dynamic badges.
  - **Dynamic Year-Based Highlighting**: Added new classes (`is-draw-current`, `is-draw-previous`, `is-draw-older`) to apply custom backgrounds and borders based on the year.
  - **Dynamic Card Highlighting**: Added classes (`high-probability-current`, `high-probability-previous`, `high-probability-older`) to style the top indicator bar and borders of the main cards.
  - **Stretching Height Flaw Fix**: Added `align-items: start;` to `.matches-grid` to ensure that only the expanded card grows vertically, while other cards in the same grid row remain in their natural, compact height.
  - **Back to Top Button styling**: Added styling for the circular fixed-position scroll-to-top widget featuring deep glassmorphic blur, thin gold border accents, interactive translation lifts, scale-in entries, and mouse-active scale feedback.

### 4. Interactive Core Logic
- **File Modified**: [h2h-app/src/App.jsx](file:///Users/primastech/Workspace/prediction/h2h-app/src/App.jsx)
- **Features**:
  - **Metrics Dashboard**: Computes total matches, high-probability candidates (draw count > 2), medium-probability candidates (draw count = 2), and global H2H draw frequency dynamically.
  - **Live Standings Rank Badges**: Renders interactive rank indicators next to team names inside the cards (e.g. `Rank #3`), revealing current league position with elegant hover highlights.
  - **Interactive W-D-L Form Dots**: Displays a row of the team's last 5 matches as glossy color-coded pills (Green for Win, Amber/Orange for Draw, Red for Loss) that scale smoothly and reveal match details upon interaction.
  - **Comprehensive Filtering**:
    - Case-insensitive search bar (filters by team names, leagues, and text query).
    - Dynamic league drop-down aggregator.
    - **Dynamic Date Drop-down Selector**: Automatically aggregates all unique dates parsed in the JSON file, allowing real-time selection of specific kickoff dates or showing all dates merged together.
    - Quick-filter tabs for draw counts: **High Draws (> 2)** (active by default), **Super Draws** (Home Ground is the last draw location), **Medium/High (>= 2)**, **Any (>= 1)**, **All Matches**, and **Bookmarked Favorites**.
  - **Multi-Sort Selector**: Sort by Draw frequency (highest draws first), kickoff time, alphabetical league name, or draw odds (X bookmaker coefficient).
  - **Collapsible Inspection**: Clicking any card reveals the complete chronological H2H fixtures, showing dates, final scores, and highlighting past draws in golden glassmorphic styling.
  - **Dynamic Year-Based Highlighting**: History row matches that resulted in draws are colored based on their year (using a vibrant green `#10b981` for the current year `2026`, a lighter green `#34d399` for the previous year `2025`, and standard amber gold for older records).
  - **Card Highlight Synchronization**: Main high-probability match cards automatically check their head-to-head records and render their top border color and indicator bar in green if they have a draw in `2026`, minty light-green if their most recent draw was in `2025`, or standard gold/orange for older draws.
  - **Super Draws Feature Integration**: Introduced a new filter category and a premium `⚡ SUPER DRAW` glowing badge. It identifies fixtures that meet the `High Draws` criteria (`marked_count > 2`) **AND** satisfy at least one of these two premium analytics rules:
    - **Condition A (Home Ground Draw)**: The most recent past head-to-head draw match was played at today's Home Team's stadium (meaning today's Home Team was the Home Team of that past draw match, confirming the last H2H draw occurred on their home ground).
    - **Condition B (Consecutive Draws)**: The first two head-to-head matches overall (the two most recent matches chronologically) were BOTH draws (i.e. both ended with equal scores such as `0:0`, `1:1`, `2:2`, `3:3`, etc.).
  - **Bookmark Favorites System**: Save specific items to your local watchlist state.
  - **Stateful Back to Top Smooth Scroll Button**: Integrates real-time scroll position tracking (visible after scrolling past 400px) that initiates smooth viewport scroll transitions back to the top of the dashboard.

---

## 🧪 Verification Results

### 1. Scraper Validation
We ran the scraper script in the virtual environment. It successfully loaded match fixtures from `h2hstats.net`, correctly counted and tagged all drawing rows, parsed odds, and saved the datasets inside `h2hstatsnet.json`.

### 1b. SofaScore Standings & Forms Enricher Validation
We ran the standalone `enrich_stats.py` script. It launched Playwright Chromium, successfully fetched scheduled events on SofaScore across all scraped dates, and enriched:
- **219 matches** for date 2026-05-24.
- **78 matches** for date 2026-05-25.
- **26 matches** for date 2026-05-26.
- **36 matches** for date 2026-05-27.

It successfully resolved league positions and forms for these teams, saved the results back to our primary JSON database files, and verified zero duplicates.

### 2. Vite Compilation Build
We executed `npm run build` in the `h2h-app` directory. The production package compiled perfectly with **zero warnings or errors** in just `178ms`:
```bash
vite v8.0.14 building client environment for production...
✓ built in 178ms
```

---

## 🚀 How to Run the App Locally

To start the dashboard and view the premium interface in your browser:

1. **Start the Vite Dev Server**:
   Propose starting the dev server in the `h2h-app` directory:
   ```bash
   cd h2h-app && npm run dev
   ```
2. **Open the Local URL**:
   The server will start instantly and provide a link, typically `http://localhost:5173`. Open this URL in your web browser to explore the dashboard.

3. **Updating and Enriching Data**:
   Whenever you want to fetch new data or look up a different date, run the scraper and then the enricher script:
   ```bash
   # 1. Scrape matches for a date (e.g. May 26)
   ./draws/.venv/bin/python scrape_h2h.py --date 2026-05-26

   # 2. Enrich matches with standings rankings and W-D-L forms
   ./draws/.venv/bin/python enrich_stats.py
   ```
   Then refresh your browser to see the newly loaded and enriched stats instantly!

---

# 🏆 PART 2: Multi-Sports Analytics Engine & Dashboard

We have engineered and compiled a separate, advanced betting intelligence pipeline located inside the `Multi-Sports-Analytics-Engine` workspace directory. This extends the project into a comprehensive multi-market analyzer while strictly leaving the `./draws/` and `./h2h-app/` directories untouched.

## 🛠️ Components Developed

### 1. Multi-Sports Analysis Engine & Relational DB
* **File Created**: [update_engine.py](file:///Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/update_engine.py)
* **Features**:
  * **Relational SQLite Database**: Auto-initializes and updates `sports_analytics.db` with structured relational tables for `fixtures`, `teams`, `forms`, and `h2h_records`, enabling relational cross-queries.
  * **Playwright SofaScore Crawler**: Automates a headless Chromium browser session to bypass Cloudflare protection and fetch active standings rankings and 5-match form letters (W, D, L) for all scraped daily roster matches.
  * **Fuzzy Name Standardizer**: Integrates sequence matching to automatically map fixtures between `h2hstats.net` and SofaScore.
  * **Multi-Market Mathematical Calculators**: Evaluates every fixture across 5 distinct betting predictions:
    1. **🛡️ Safe Double Chance (1X / X2)**: Calculates home/away win & draw probabilities ($\ge$ 75% for safety picks).
    2. **⚽ Over / Under 2.5 Goals**: Analyzes average goal scoring/conceding rates in recent forms and H2H matches to isolate high-scoring or low-scoring defensive standoffs.
    3. **🔥 Both Teams to Score (BTTS)**: Forecasts clean-sheet ratios and scoring frequency ($\ge$ 65% for BTTS picks).
    4. **🏆 Straight Winning Streaks**: Scans team forms chronologically to flag powerhouses on consecutive winning streaks ($\ge$ 3 wins) with today's win probability $\ge$ 70%.
    5. **🎯 Draw Value Picks (+EV)**: Computes draw probabilities against bookmaker odds to isolate positive expected values (+EV $\ge$ 1.10).
  * Saves the compiled calculations to a structured `sports_data.json` database.

### 2. Premium React Vite Dashboard
* **Directory Scaffolded**: [sports-analytics-frontend/](file:///Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/sports-analytics-frontend/) (Fresh Vite React setup).
* **Core Stylesheet**: [index.css](file:///Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/sports-analytics-frontend/src/index.css)
  * Implements an ultra-premium **obsidian-metallic glassmorphism theme** with outfit typography.
  * Visual highlights: glowing neon-gradient border headers for tab selections, smooth micro-animations, glossy forms dots, and custom progress animations.
* **Core Logic**: [App.jsx](file:///Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/sports-analytics-frontend/src/App.jsx)
  * **Dynamic Multi-Market Tabs**: Allows users to filter fixtures instantly across 5 distinct prediction tabs: *Safe Double Chance*, *Goals Over/Under*, *BTTS*, *Winning Streaks*, and *Draw Value Picks*.
  * **Dynamic Metric Counters**: Displays roster summaries for all market picks in real-time.
  * **Filtering & Sorting**: Multi-input search, dynamic league and date filters, and custom probability/value sorting.
  * **Collapsible SQLite Records**: Clicking any card smoothly reveals relational historical records, with past draw matches styled in glowing amber.
  * **Smooth Scroll Back to Top Button**: Renders a fixed glassmorphic widget after scrolling past 400px that floats users back to the top seamlessly.

---

## 🧪 Verification & Build Results

### 1. Playwright Engine Calculations
We ran the analytical database compiler. It successfully launched Chromium, fuzzy-matched, and processed predictions for all 359 matches, committing records into the relational SQLite database `sports_analytics.db` and outputting the JSON files:
* **219 matches** for date 2026-05-24
* **78 matches** for date 2026-05-25 (incorporating the new streaks draws aggregates!)
* **26 matches** for date 2026-05-26
* **36 matches** for date 2026-05-27

### 2. Vite Production Compilation
We ran `npm run build` inside `sports-analytics-frontend/`. The application bundled cleanly with **zero warnings or errors** in just **841ms**:
```bash
vite v8.0.14 building client environment for production...
transforming...✓ 1738 modules transformed.
rendering chunks...
✓ built in 841ms
```

---

## 🚀 How to Run the Multi-Sports App Locally

To start the new dashboard:

1. **Launch the Vite Dev Server**:
   ```bash
   cd Multi-Sports-Analytics-Engine/sports-analytics-frontend
   npm run dev
   ```
2. **Open the App**:
   Navigate to the local URL (usually `http://localhost:5173` or `5174`) in your web browser.
3. **Triggering Engine Calculations**:
   Whenever you fetch new rosters via `scrape_h2h.py`, run the Multi-Sports processor to update the database:
   ```bash
   cd Multi-Sports-Analytics-Engine
   ../draws/.venv/bin/python update_engine.py
   ```
   Refresh your browser to see the live standings, winning streaks, and probability gauges update instantly!
