import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  Award,
  Layers,
  AlertTriangle,
  Zap,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Trophy,
  Shield,
  Activity,
  ArrowUpDown,
  Flame,
  Plus,
  Grid,
  List,
} from "lucide-react";

// Helper to get today's date in YYYY-MM-DD format (local time)
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to extract country flag from league name
const getLeagueFlag = (leagueName) => {
  if (!leagueName) return "";
  const parts = leagueName.split(" » ");
  const rawCountry = parts[0].trim().toLowerCase();

  // Clean variations like "Amateur", "&", and trim
  const cleanCountry = rawCountry
    .replace(" amateur", "")
    .replace(" & ", " and ")
    .trim();

  // Map country name to ISO two-letter code
  const countryToIso = {
    afghanistan: "af",
    albania: "al",
    algeria: "dz",
    andorra: "ad",
    angola: "ao",
    anguilla: "ai",
    argentina: "ar",
    armenia: "am",
    aruba: "aw",
    asia: "un",
    australia: "au",
    austria: "at",
    azerbaijan: "az",
    barbados: "bb",
    belarus: "by",
    belgium: "be",
    bhutan: "bt",
    bolivia: "bo",
    bonaire: "bq",
    "bosnia and herzegovina": "ba",
    brazil: "br",
    bulgaria: "bg",
    cambodia: "kh",
    cameroon: "cm",
    canada: "ca",
    chile: "cl",
    china: "cn",
    "chinese taipei": "tw",
    colombia: "co",
    comoros: "km",
    croatia: "hr",
    cuba: "cu",
    cyprus: "cy",
    "czech republic": "cz",
    czechia: "cz",
    "dr congo": "cd",
    denmark: "dk",
    dominica: "dm",
    ecuador: "ec",
    egypt: "eg",
    "el salvador": "sv",
    estonia: "ee",
    ethiopia: "et",
    europe: "eu",
    "faroe islands": "fo",
    finland: "fi",
    france: "fr",
    gabon: "ga",
    georgia: "ge",
    germany: "de",
    ghana: "gh",
    greece: "gr",
    "guinea-bissau": "gw",
    honduras: "hn",
    "hong kong": "hk",
    hungary: "hu",
    iceland: "is",
    india: "in",
    indonesia: "id",
    "international clubs": "un",
    iran: "ir",
    iraq: "iq",
    ireland: "ie",
    israel: "il",
    italy: "it",
    japan: "jp",
    kazakhstan: "kz",
    kenya: "ke",
    kuwait: "kw",
    kyrgyzstan: "kg",
    latvia: "lv",
    lithuania: "lt",
    luxembourg: "lu",
    macao: "mo",
    madagascar: "mg",
    malawi: "mw",
    mali: "ml",
    martinique: "mq",
    moldova: "md",
    montenegro: "me",
    morocco: "ma",
    netherlands: "nl",
    "new zealand": "nz",
    niger: "ne",
    nigeria: "ng",
    "northern ireland": "gb-nir",
    norway: "no",
    paraguay: "py",
    peru: "pe",
    philippines: "ph",
    poland: "pl",
    portugal: "pt",
    "puerto rico": "pr",
    qatar: "qa",
    romania: "ro",
    russia: "ru",
    rwanda: "rw",
    scotland: "gb-sct",
    serbia: "rs",
    "sierra leone": "sl",
    singapore: "sg",
    slovakia: "sk",
    slovenia: "si",
    somalia: "so",
    "south africa": "za",
    "south america": "un",
    "south korea": "kr",
    spain: "es",
    sudan: "sd",
    sweden: "se",
    switzerland: "ch",
    tahiti: "pf",
    tajikistan: "tj",
    tanzania: "tz",
    thailand: "th",
    tunisia: "tn",
    turkey: "tr",
    usa: "us",
    "united states": "us",
    ukraine: "ua",
    "united arab emirates": "ae",
    "united kingdom": "gb",
    uruguay: "uy",
    uzbekistan: "uz",
    vietnam: "vn",
    wales: "gb-wls",
    world: "un",
    zimbabwe: "zw",
  };

  const iso = countryToIso[cleanCountry];
  if (!iso) return "🌐"; // Fallback to world globe for unknown categories

  if (iso === "un") return "🌐";
  if (iso === "eu") return "🇪🇺";
  if (iso === "gb-eng") return "🏴󠁧󠁢󠁥󠁮󠁧󠁿"; // England
  if (iso === "gb-sct") return "🏴󠁧󠁢󠁳󠁣󠁴󠁿"; // Scotland
  if (iso === "gb-wls") return "🏴󠁧󠁢󠁷󠁬󠁳󠁿"; // Wales
  if (iso === "gb-nir") return "🇬🇧"; // Northern Ireland fallback

  try {
    const codePoints = iso
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return "🌐";
  }
};

// Helper to filter out specific matches based on forbidden league terms
const shouldFilterOutLeague = (league) => {
  if (!league) return false;
  // Forbidden league terms: u14, u15, u16, u17, u13, liga 6, juniori, round-robin, klasa, liga veterana, Amateur, IV, puchar, Derde, vierde, fkf, V
  // Roman numerals IV and V use word boundaries (\biv\b and \bv\b) to avoid false positives (like division or vs)
  const forbiddenRegex =
    /u14|u15|u16|u17|u13|liga 6|juniori|round-robin|klasa|liga veterana|amateur|puchar|derde|friendlies|vierde|fkf|divize b|divize E|3. NL - istok|3. NL - centar|3. NL - zapad|3. NL - jug|Silver League|\biv\b|\bv\b/i;
  return forbiddenRegex.test(league);
};

function SofascoreData() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interactive UI Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("ALL");
  const [activeTab, setActiveTab] = useState("DOUBLE_CHANCE"); // Default to Double Chance safety picks
  const [sortBy, setSortBy] = useState("PROBABILITY"); // Default to sorting by probability
  const [expandedCards, setExpandedCards] = useState({});
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("sports_favorites");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [layoutMode, setLayoutMode] = useState("GRID"); // "GRID" or "LINE"

  useEffect(() => {
    try {
      localStorage.setItem("sports_favorites", JSON.stringify(favorites));
    } catch (e) {
      console.error("Error saving favorites to localStorage:", e);
    }
  }, [favorites]);

  // Fetch the Multi-Sports analyzed JSON database
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/sofascore_data.json?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(
          "Failed to fetch SofaScore data. Please verify sofascoredata.py completed successfully.",
        );
      }
      const data = await response.json();
      setMatches(data);

      // Intelligently select default date:
      //   1. Today's date if present in data
      //   2. Nearest future date (e.g. tomorrow) if today has no data
      //   3. First available date as fallback
      if (data && data.length > 0) {
        const uniqueDates = Array.from(
          new Set(data.map((m) => m.date).filter(Boolean)),
        ).sort();
        const today = getTodayString();
        if (uniqueDates.includes(today)) {
          setSelectedDate(today);
        } else {
          // Pick nearest future date first, else first in list
          const futureDates = uniqueDates.filter((d) => d >= today);
          if (futureDates.length > 0) {
            setSelectedDate(futureDates[0]);
          } else if (uniqueDates.length > 0) {
            setSelectedDate(uniqueDates[uniqueDates.length - 1]); // most recent past
          } else {
            setSelectedDate("ALL");
          }
        }
      }

      setError(null);
    } catch (err) {
      console.error(err);
      setError(
        "Could not load sofascore_data.json. Check if sofascoredata.py was executed.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Scroll listener for Back to Top Button
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Toggle card collapse
  const toggleCard = (id) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle bookmark favorites
  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  };

  // Generate unique list of leagues and dates for dropdown selectors
  const leaguesList = useMemo(() => {
    const leagues = new Set();
    matches.forEach((m) => {
      if (
        m.league &&
        m.history &&
        m.history.length > 0 &&
        !shouldFilterOutLeague(m.league)
      ) {
        leagues.add(m.league);
      }
    });
    return ["ALL", ...Array.from(leagues).sort()];
  }, [matches]);

  const datesList = useMemo(() => {
    const dates = new Set();
    matches.forEach((m) => {
      if (
        m.date &&
        m.history &&
        m.history.length > 0 &&
        !shouldFilterOutLeague(m.league)
      ) {
        dates.add(m.date);
      }
    });
    // Only include dates that actually have data — don't force-add today
    return ["ALL", ...Array.from(dates).sort()];
  }, [matches]);

  // Helper to render friendly date labels (Today, Tomorrow, Yesterday)
  const getDateLabel = (dateStr) => {
    if (dateStr === "ALL") return "All Dates";
    const today = getTodayString();
    const d = new Date(dateStr + "T00:00:00");
    const t = new Date(today + "T00:00:00");
    const diffDays = Math.round((d - t) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return `Today (${dateStr})`;
    if (diffDays === 1) return `Tomorrow (${dateStr})`;
    if (diffDays === -1) return `Yesterday (${dateStr})`;
    return dateStr;
  };

  // Tab count indicators for counters panel
  const tabCounts = useMemo(() => {
    let dc = 0;
    let ou = 0;
    let btts = 0;
    let streaks = 0;
    let draws = 0;
    let h2hDraws = 0;
    let scoringHalf = 0;
    let corners = 0;
    let ggBoth = 0;
    let turnaround = 0;

    matches.forEach((m) => {
      const mkts = m.markets || {};
      if (mkts.double_chance?.recommendation) dc++;
      if (mkts.over_under?.recommendation) ou++;
      if (mkts.btts?.recommendation) btts++;
      if (mkts.streaks?.recommendation) streaks++;
      if (mkts.draw_value?.recommendation) draws++;
      if (mkts.most_scoring_half?.recommendation) scoringHalf++;
      if (mkts.corners?.recommendation) corners++;
      if (mkts.gg_both_halves?.recommendation) ggBoth++;
      if (mkts.turnaround?.recommendation) turnaround++;

      // H2H Draws trend calculation
      const hist = m.history || [];
      if (hist.length >= 2) {
        const last3 = hist.slice(0, 3);
        const drawCount = last3.filter((h) => h.is_marked).length;
        const isConsecutive2Draws = hist[0]?.is_marked && hist[1]?.is_marked;
        if (isConsecutive2Draws || (last3.length >= 2 && drawCount >= 2)) {
          h2hDraws++;
        }
      }
    });

    return {
      total: matches.length,
      dc,
      ou,
      btts,
      streaks,
      draws,
      h2hDraws,
      scoringHalf,
      corners,
      ggBoth,
      turnaround,
    };
  }, [matches]);

  // Filter & Sort matches dynamically based on active tab and inputs
  const filteredAndSortedMatches = useMemo(() => {
    // Filter out matches that have no H2H data and matches from forbidden leagues
    let result = matches.filter(
      (m) =>
        m.history && m.history.length > 0 && !shouldFilterOutLeague(m.league),
    );

    // 1. Text Search Input
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.home_team.toLowerCase().includes(query) ||
          m.away_team.toLowerCase().includes(query) ||
          m.league.toLowerCase().includes(query),
      );
    }

    // 2. League Selection
    if (selectedLeague !== "ALL") {
      result = result.filter((m) => m.league === selectedLeague);
    }

    // 3. Kickoff Date Selection
    if (selectedDate !== "ALL") {
      result = result.filter((m) => m.date === selectedDate);
    }

    // 4. Tab Market Filtering
    if (activeTab === "DOUBLE_CHANCE") {
      result = result.filter((m) => m.markets?.double_chance?.recommendation);
    } else if (activeTab === "OVER_UNDER") {
      result = result.filter((m) => m.markets?.over_under?.recommendation);
    } else if (activeTab === "BTTS") {
      result = result.filter((m) => m.markets?.btts?.recommendation);
    } else if (activeTab === "STREAKS") {
      result = result.filter((m) => m.markets?.streaks?.recommendation);
    } else if (activeTab === "DRAWS") {
      result = result.filter((m) => m.markets?.draw_value?.recommendation);
    } else if (activeTab === "H2H_DRAWS") {
      result = result.filter((m) => {
        const hist = m.history || [];
        if (hist.length < 2) return false;
        const last3 = hist.slice(0, 3);
        const drawCount = last3.filter((h) => h.is_marked).length;
        const isConsecutive2Draws = hist[0]?.is_marked && hist[1]?.is_marked;
        return isConsecutive2Draws || (last3.length >= 2 && drawCount >= 2);
      });
    } else if (activeTab === "SCORING_HALF") {
      result = result.filter(
        (m) => m.markets?.most_scoring_half?.recommendation,
      );
    } else if (activeTab === "CORNERS") {
      result = result.filter((m) => m.markets?.corners?.recommendation);
    } else if (activeTab === "GG_BOTH") {
      result = result.filter((m) => m.markets?.gg_both_halves?.recommendation);
    } else if (activeTab === "TURNAROUND") {
      result = result.filter((m) => m.markets?.turnaround?.recommendation);
    } else if (activeTab === "FAVORITES") {
      result = result.filter((m) => {
        const key = `${m.date}_${m.home_team}_${m.away_team}`;
        return !!favorites[key];
      });
    }

    // 5. Advanced Sorting Controls
    result.sort((a, b) => {
      const aMkts = a.markets || {};
      const bMkts = b.markets || {};

      if (sortBy === "PROBABILITY") {
        // Sort based on active tab primary probability metric
        if (activeTab === "DOUBLE_CHANCE") {
          const aMax = Math.max(
            aMkts.double_chance?.home_1x_prob || 0,
            aMkts.double_chance?.away_2x_prob || 0,
          );
          const bMax = Math.max(
            bMkts.double_chance?.home_1x_prob || 0,
            bMkts.double_chance?.away_2x_prob || 0,
          );
          return bMax - aMax;
        } else if (activeTab === "OVER_UNDER") {
          const aMax = Math.max(
            aMkts.over_under?.over_25_prob || 0,
            aMkts.over_under?.under_25_prob || 0,
          );
          const bMax = Math.max(
            bMkts.over_under?.over_25_prob || 0,
            bMkts.over_under?.under_25_prob || 0,
          );
          return bMax - aMax;
        } else if (activeTab === "BTTS") {
          return (bMkts.btts?.prob || 0) - (aMkts.btts?.prob || 0);
        } else if (activeTab === "STREAKS") {
          const aMaxStreak = Math.max(
            aMkts.streaks?.home_streak || 0,
            aMkts.streaks?.away_streak || 0,
          );
          const bMaxStreak = Math.max(
            bMkts.streaks?.home_streak || 0,
            bMkts.streaks?.away_streak || 0,
          );
          return bMaxStreak - aMaxStreak;
        } else if (activeTab === "DRAWS" || activeTab === "H2H_DRAWS") {
          return (bMkts.draw_value?.prob || 0) - (aMkts.draw_value?.prob || 0);
        } else if (activeTab === "SCORING_HALF") {
          return (
            (bMkts.most_scoring_half?.half_2h_prob || 0) -
            (aMkts.most_scoring_half?.half_2h_prob || 0)
          );
        } else if (activeTab === "CORNERS") {
          return (
            (bMkts.corners?.over_85_prob || 0) -
            (aMkts.corners?.over_85_prob || 0)
          );
        } else if (activeTab === "GG_BOTH") {
          return (
            (bMkts.gg_both_halves?.prob || 0) -
            (aMkts.gg_both_halves?.prob || 0)
          );
        } else if (activeTab === "TURNAROUND") {
          const aMax = Math.max(
            aMkts.turnaround?.ht1_ft2_prob || 0,
            aMkts.turnaround?.ht2_ft1_prob || 0,
          );
          const bMax = Math.max(
            bMkts.turnaround?.ht1_ft2_prob || 0,
            bMkts.turnaround?.ht2_ft1_prob || 0,
          );
          return bMax - aMax;
        }
        return b.marked_count - a.marked_count; // Default to historical draw counts
      }
      if (sortBy === "KICKOFF") {
        return a.time.localeCompare(b.time);
      }
      if (sortBy === "LEAGUE") {
        return a.league.localeCompare(b.league);
      }
      if (sortBy === "VALUE") {
        if (activeTab === "DRAWS" || activeTab === "H2H_DRAWS") {
          return (bMkts.draw_value?.ev || 0.0) - (aMkts.draw_value?.ev || 0.0);
        }
        return (b.odds?.X || 0.0) - (a.odds?.X || 0.0);
      }
      return 0;
    });

    return result;
  }, [
    matches,
    searchTerm,
    selectedLeague,
    selectedDate,
    activeTab,
    sortBy,
    favorites,
  ]);

  // Helper render to display small glossy dots for team forms
  const renderFormDots = (formArray) => {
    if (!formArray || formArray.length === 0) return null;
    return (
      <div className="form-dots-container" onClick={(e) => e.stopPropagation()}>
        {formArray.slice(0, 5).map((letter, index) => {
          let colorClass = "form-dot-unknown";
          if (letter === "W") colorClass = "form-dot-w";
          else if (letter === "D") colorClass = "form-dot-d";
          else if (letter === "L") colorClass = "form-dot-l";
          return (
            <span
              key={index}
              className={`form-dot ${colorClass}`}
              title={`Match ${index + 1}: ${letter}`}
            >
              {letter}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="app-container fade-in">
      {/* Premium Dashboard Header */}
      <header className="app-header">
        <div className="brand-badge" style={{ color: "var(--accent-cyan)" }}>
          <Zap size={14} fill="currentColor" /> SofaScore Direct Feed
        </div>
        <h1 className="app-title">Hugoboss Live Data Engine</h1>
        <p className="app-subtitle">
          Real-time predictive analytics sourced exclusively from SofaScore
          APIs. Events, standings, form, H2H history, and odds fetched directly
          — no external scrapers required.
        </p>
      </header>

      {/* Loading & Error States */}
      {loading && (
        <div className="empty-state">
          <RefreshCw
            className="animate-spin"
            size={48}
            style={{ color: "var(--accent-gold)" }}
          />
          <div className="empty-title">Loading SofaScore Data...</div>
          <div className="empty-desc">
            Parsing SofaScore API responses and calculating probabilities.
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="empty-state" style={{ borderColor: "#ef4444" }}>
          <AlertTriangle size={48} style={{ color: "#ef4444" }} />
          <div className="empty-title" style={{ color: "#ef4444" }}>
            Engine Fetch Error
          </div>
          <div className="empty-desc">{error}</div>
          <button
            onClick={handleRefresh}
            className="tab-btn active"
            style={{ marginTop: "16px" }}
          >
            Retry Query
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Counters Grid Roster */}
          <section className="stats-grid" aria-label="Dashboard Metrics">
            <div
              className="stat-card"
              onClick={() => setActiveTab("DOUBLE_CHANCE")}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon-wrapper double-chance">
                <Shield size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.dc}</div>
                <div className="stat-label">Safe Double Chance</div>
              </div>
              <div className="stat-card-badge">🛡️ High safety</div>
            </div>

            <div
              className="stat-card"
              onClick={() => setActiveTab("OVER_UNDER")}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon-wrapper goals">
                <Award size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.ou}</div>
                <div className="stat-label">Over / Under Goals</div>
              </div>
              <div className="stat-card-badge">⚽ Total goals</div>
            </div>

            <div
              className="stat-card"
              onClick={() => setActiveTab("BTTS")}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon-wrapper btts">
                <Activity size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.btts}</div>
                <div className="stat-label">Both Teams to Score</div>
              </div>
              <div className="stat-card-badge">🔥 Goal streaks</div>
            </div>

            <div
              className="stat-card"
              onClick={() => setActiveTab("STREAKS")}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon-wrapper streaks">
                <Flame size={24} fill="currentColor" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.streaks}</div>
                <div className="stat-label">Winning Streaks</div>
              </div>
              <div className="stat-card-badge">🏆 Form power</div>
            </div>

            <div
              className="stat-card"
              onClick={() => setActiveTab("DRAWS")}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon-wrapper draws">
                <Zap size={24} fill="currentColor" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.draws}</div>
                <div className="stat-label">Draw Value Picks</div>
              </div>
              <div className="stat-card-badge">🎯 Value EV</div>
            </div>

            <div
              className="stat-card"
              onClick={() => setActiveTab("H2H_DRAWS")}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon-wrapper h2h-draws">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.h2hDraws}</div>
                <div className="stat-label">H2H Draw Trend</div>
              </div>
              <div className="stat-card-badge">🤝 Recent draws</div>
            </div>
          </section>

          {/* Interactive Filters Panel */}
          <section className="control-panel" aria-label="Filters Panel">
            <div className="filter-row">
              <div className="search-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search home/away teams, leagues, divisions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="select-wrapper">
                <select
                  className="select-input"
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                >
                  {leaguesList.map((league) => (
                    <option key={league} value={league}>
                      {league === "ALL" ? "All Leagues" : league}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="select-icon" />
              </div>

              <div className="select-wrapper">
                <select
                  className="select-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  {datesList.map((date) => (
                    <option key={date} value={date}>
                      {getDateLabel(date)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="select-icon" />
              </div>

              <div className="select-wrapper" style={{ minWidth: "180px" }}>
                <select
                  className="select-input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="PROBABILITY">Sort by Probability</option>
                  <option value="KICKOFF">Sort by Kickoff Time</option>
                  <option value="LEAGUE">Sort by League Name</option>
                  {activeTab === "DRAWS" && (
                    <option value="VALUE">Sort by Expected Value (EV)</option>
                  )}
                </select>
                <ArrowUpDown size={18} className="select-icon" />
              </div>

              <button
                onClick={handleRefresh}
                className="tab-btn"
                style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--glass-border)",
                }}
                title="Refresh database output"
                disabled={refreshing}
              >
                <RefreshCw
                  size={18}
                  className={refreshing ? "animate-spin" : ""}
                />
              </button>

              <div className="layout-toggle-container">
                <button
                  onClick={() => setLayoutMode("GRID")}
                  className={`layout-btn ${layoutMode === "GRID" ? "active" : ""}`}
                  title="Grid View"
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setLayoutMode("LINE")}
                  className={`layout-btn ${layoutMode === "LINE" ? "active" : ""}`}
                  title="List View"
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {/* Navigation tabs */}
            <div className="tabs-container">
              <button
                onClick={() => setActiveTab("DOUBLE_CHANCE")}
                className={`tab-btn double-chance ${activeTab === "DOUBLE_CHANCE" ? "active" : ""}`}
              >
                <Shield size={14} /> Safe Double Chance{" "}
                <span className="tab-count">{tabCounts.dc}</span>
              </button>

              <button
                onClick={() => setActiveTab("OVER_UNDER")}
                className={`tab-btn over-under ${activeTab === "OVER_UNDER" ? "active" : ""}`}
              >
                <Award size={14} /> Over / Under 2.5{" "}
                <span className="tab-count">{tabCounts.ou}</span>
              </button>

              <button
                onClick={() => setActiveTab("BTTS")}
                className={`tab-btn btts ${activeTab === "BTTS" ? "active" : ""}`}
              >
                <Activity size={14} /> Both Teams to Score{" "}
                <span className="tab-count">{tabCounts.btts}</span>
              </button>

              <button
                onClick={() => setActiveTab("STREAKS")}
                className={`tab-btn streaks ${activeTab === "STREAKS" ? "active" : ""}`}
              >
                <Flame size={14} fill="currentColor" /> Winning Streaks{" "}
                <span className="tab-count">{tabCounts.streaks}</span>
              </button>

              <button
                onClick={() => setActiveTab("DRAWS")}
                className={`tab-btn draws ${activeTab === "DRAWS" ? "active" : ""}`}
              >
                <Zap size={14} fill="currentColor" /> Draw Value Picks{" "}
                <span className="tab-count">{tabCounts.draws}</span>
              </button>

              <button
                onClick={() => setActiveTab("H2H_DRAWS")}
                className={`tab-btn h2h-draws ${activeTab === "H2H_DRAWS" ? "active" : ""}`}
              >
                <TrendingUp size={14} /> H2H Draw Trend{" "}
                <span className="tab-count">{tabCounts.h2hDraws}</span>
              </button>

              <button
                onClick={() => setActiveTab("SCORING_HALF")}
                className={`tab-btn scoring-half ${activeTab === "SCORING_HALF" ? "active" : ""}`}
              >
                <TrendingUp size={14} /> Most Scoring Half{" "}
                <span className="tab-count">{tabCounts.scoringHalf}</span>
              </button>

              <button
                onClick={() => setActiveTab("CORNERS")}
                className={`tab-btn corners ${activeTab === "CORNERS" ? "active" : ""}`}
              >
                <Activity size={14} /> Corners O/U{" "}
                <span className="tab-count">{tabCounts.corners}</span>
              </button>

              <button
                onClick={() => setActiveTab("GG_BOTH")}
                className={`tab-btn gg-both ${activeTab === "GG_BOTH" ? "active" : ""}`}
              >
                <Flame size={14} fill="currentColor" /> GG/GG Both Halves{" "}
                <span className="tab-count">{tabCounts.ggBoth}</span>
              </button>

              <button
                onClick={() => setActiveTab("TURNAROUND")}
                className={`tab-btn turnaround ${activeTab === "TURNAROUND" ? "active" : ""}`}
              >
                <RefreshCw size={14} /> HT/FT Turnaround{" "}
                <span className="tab-count">{tabCounts.turnaround}</span>
              </button>

              <button
                onClick={() => setActiveTab("ALL")}
                className={`tab-btn ${activeTab === "ALL" ? "active" : ""}`}
              >
                <Layers size={14} /> All Roster{" "}
                <span className="tab-count">{tabCounts.total}</span>
              </button>

              <button
                onClick={() => setActiveTab("FAVORITES")}
                className={`tab-btn ${activeTab === "FAVORITES" ? "active" : ""}`}
                style={{
                  marginLeft: "auto",
                  borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                Bookmarks{" "}
                <span className="tab-count">
                  {Object.values(favorites).filter(Boolean).length}
                </span>
              </button>
            </div>
          </section>

          {/* Roster list counts */}
          <div
            className="matches-header-info"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
              padding: "0 4px",
            }}
          >
            <div
              className="matches-count-label"
              style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Displaying{" "}
              <span
                className="matches-count-number"
                style={{ color: "var(--accent-gold)" }}
              >
                {filteredAndSortedMatches.length}
              </span>{" "}
              analyzed fixtures
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              * Toggle cards to inspect SofaScore head-to-head records.
            </div>
          </div>

          {/* Render matches roster dynamically in GRID or compact LINE mode */}
          {filteredAndSortedMatches.length > 0 ? (
            layoutMode === "GRID" ? (
              <div className="matches-grid">
                {filteredAndSortedMatches.map((match, idx) => {
                  const matchKey = `${match.date}_${match.home_team}_${match.away_team}`;
                  const isExpanded = !!expandedCards[matchKey];
                  const isFavorite = !!favorites[matchKey];

                  const mkts = match.markets || {};
                  const dcRec = mkts.double_chance?.recommendation;
                  const ouRec = mkts.over_under?.recommendation;
                  const bttsRec = mkts.btts?.recommendation;
                  const streakRec = mkts.streaks?.recommendation;
                  const drawRec = mkts.draw_value?.recommendation;
                  const halfRec = mkts.most_scoring_half?.recommendation;
                  const cornersRec = mkts.corners?.recommendation;
                  const ggBothRec = mkts.gg_both_halves?.recommendation;
                  const turnaroundRec = mkts.turnaround?.recommendation;

                  // Determine border highlight color based on active tab recommendation
                  let cardClass = "";
                  if (activeTab === "DOUBLE_CHANCE" && dcRec)
                    cardClass = "highlight-dc";
                  else if (activeTab === "OVER_UNDER" && ouRec)
                    cardClass = `highlight-${ouRec === "OVER_25" ? "over" : "under"}`;
                  else if (activeTab === "BTTS" && bttsRec)
                    cardClass = "highlight-btts";
                  else if (activeTab === "STREAKS" && streakRec)
                    cardClass = "highlight-streaks";
                  else if (activeTab === "DRAWS" && drawRec)
                    cardClass = "highlight-draws";
                  else if (activeTab === "H2H_DRAWS")
                    cardClass = "highlight-h2h-draws";
                  else if (activeTab === "SCORING_HALF" && halfRec)
                    cardClass = "highlight-scoring-half";
                  else if (activeTab === "CORNERS" && cornersRec)
                    cardClass = `highlight-${cornersRec === "OVER_85" ? "corners-over" : "corners-under"}`;
                  else if (activeTab === "GG_BOTH" && ggBothRec)
                    cardClass = "highlight-gg-both";
                  else if (activeTab === "TURNAROUND" && turnaroundRec)
                    cardClass = "highlight-turnaround";

                  return (
                    <article
                      key={matchKey}
                      onClick={() => toggleCard(matchKey)}
                      className={`match-card ${cardClass} ${isExpanded ? "expanded" : ""}`}
                    >
                      {/* Header section */}
                      <div className="card-header-section">
                        <div className="league-time-row">
                          <span className="league-badge" title={match.league}>
                            {getLeagueFlag(match.league)} {match.league}
                          </span>
                          <span
                            className={`time-badge ${match.status === "finished" ? "finished" : match.status === "inprogress" ? "live" : match.status === "postponed" ? "postponed" : ""}`}
                          >
                            {match.status === "finished" ? (
                              <span className="status-finished-tag">FT</span>
                            ) : match.status === "inprogress" ? (
                              <span className="status-live-tag">● LIVE</span>
                            ) : match.status === "postponed" ? (
                              <span className="status-postponed-tag">PP</span>
                            ) : (
                              <>
                                <Clock size={12} /> {match.time || "TBD"}
                              </>
                            )}
                          </span>
                        </div>

                        <div className="teams-display">
                          <div className="team-row">
                            <span className="team-name" title={match.home_team}>
                              {match.home_team}
                            </span>
                            <div className="team-stats-summary">
                              {match.home_score !== undefined &&
                                match.home_score !== null && (
                                  <span className="score-display">
                                    {match.home_score}
                                  </span>
                                )}
                              {match.home_rank && (
                                <span
                                  className="team-rank-badge"
                                  title={`League Position: ${match.home_rank}`}
                                >
                                  Rank #{match.home_rank}
                                </span>
                              )}
                              {renderFormDots(match.home_form)}
                            </div>
                          </div>

                          <div className="team-vs-indicator">VS</div>

                          <div className="team-row">
                            <span className="team-name" title={match.away_team}>
                              {match.away_team}
                            </span>
                            <div className="team-stats-summary">
                              {match.away_score !== undefined &&
                                match.away_score !== null && (
                                  <span className="score-display">
                                    {match.away_score}
                                  </span>
                                )}
                              {match.away_rank && (
                                <span
                                  className="team-rank-badge"
                                  title={`League Position: ${match.away_rank}`}
                                >
                                  Rank #{match.away_rank}
                                </span>
                              )}
                              {renderFormDots(match.away_form)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Market Predictions details block */}
                      <div className="card-predictions-container">
                        {/* 1. Safe Double Chance */}
                        <div
                          className="prediction-widget-row"
                          style={{
                            opacity: activeTab === "DOUBLE_CHANCE" ? 1 : 0.65,
                          }}
                        >
                          <span className="prediction-label">
                            <Shield
                              size={14}
                              style={{ color: "var(--accent-emerald)" }}
                            />{" "}
                            Double Chance
                          </span>
                          <div className="prediction-value-col">
                            {dcRec && (
                              <span className="recommendation-badge dc">
                                {dcRec} SAFE
                              </span>
                            )}
                            <div className="mini-progress-bar-bg">
                              <div
                                className="mini-progress-bar-fill dc"
                                style={{
                                  width: `${Math.max(mkts.double_chance?.home_1x_prob || 50, mkts.double_chance?.away_2x_prob || 50)}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className="probability-percentage-text"
                              style={{ color: "var(--accent-emerald)" }}
                            >
                              {Math.max(
                                mkts.double_chance?.home_1x_prob || 50,
                                mkts.double_chance?.away_2x_prob || 50,
                              )}
                              %
                            </span>
                          </div>
                        </div>

                        {/* 2. Over/Under Goals */}
                        <div
                          className="prediction-widget-row"
                          style={{
                            opacity: activeTab === "OVER_UNDER" ? 1 : 0.65,
                          }}
                        >
                          <span className="prediction-label">
                            <Award
                              size={14}
                              style={{ color: "var(--accent-cyan)" }}
                            />{" "}
                            Over / Under 2.5
                          </span>
                          <div className="prediction-value-col">
                            {ouRec && (
                              <span
                                className={`recommendation-badge ${ouRec === "OVER_25" ? "over" : "under"}`}
                              >
                                {ouRec === "OVER_25" ? "OVER 2.5" : "UNDER 2.5"}
                              </span>
                            )}
                            <div className="mini-progress-bar-bg">
                              <div
                                className={`mini-progress-bar-fill ${ouRec === "OVER_25" ? "over" : "under"}`}
                                style={{
                                  width: `${Math.max(mkts.over_under?.over_25_prob || 50, mkts.over_under?.under_25_prob || 50)}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className="probability-percentage-text"
                              style={{ color: "var(--accent-cyan)" }}
                            >
                              {Math.max(
                                mkts.over_under?.over_25_prob || 50,
                                mkts.over_under?.under_25_prob || 50,
                              )}
                              %
                            </span>
                          </div>
                        </div>

                        {/* 3. Both Teams to Score */}
                        <div
                          className="prediction-widget-row"
                          style={{ opacity: activeTab === "BTTS" ? 1 : 0.65 }}
                        >
                          <span className="prediction-label">
                            <Activity
                              size={14}
                              style={{ color: "var(--accent-orange)" }}
                            />{" "}
                            BTTS
                          </span>
                          <div className="prediction-value-col">
                            {bttsRec && (
                              <span className="recommendation-badge btts">
                                BTTS YES
                              </span>
                            )}
                            <div className="mini-progress-bar-bg">
                              <div
                                className="mini-progress-bar-fill btts"
                                style={{ width: `${mkts.btts?.prob || 50}%` }}
                              ></div>
                            </div>
                            <span
                              className="probability-percentage-text"
                              style={{ color: "var(--accent-orange)" }}
                            >
                              {mkts.btts?.prob || 50}%
                            </span>
                          </div>
                        </div>

                        {/* 4. Straight Winning Streaks */}
                        <div
                          className="prediction-widget-row"
                          style={{
                            opacity: activeTab === "STREAKS" ? 1 : 0.65,
                          }}
                        >
                          <span className="prediction-label">
                            <Flame
                              size={14}
                              style={{ color: "var(--accent-rose)" }}
                            />{" "}
                            Winning Streaks
                          </span>
                          <div className="prediction-value-col">
                            {streakRec && (
                              <span
                                className="recommendation-badge streak"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                <Flame size={10} fill="currentColor" />
                                {streakRec === "HOME_STREAK"
                                  ? `${mkts.streaks?.home_streak} W-STREAK`
                                  : `${mkts.streaks?.away_streak} W-STREAK`}
                              </span>
                            )}
                            <div className="mini-progress-bar-bg">
                              <div
                                className="mini-progress-bar-fill streak"
                                style={{
                                  width: `${Math.max(mkts.streaks?.home_streak || 0, mkts.streaks?.away_streak || 0) * 20}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className="probability-percentage-text"
                              style={{ color: "var(--accent-rose)" }}
                            >
                              {Math.max(
                                mkts.streaks?.home_streak || 0,
                                mkts.streaks?.away_streak || 0,
                              )}
                              W
                            </span>
                          </div>
                        </div>

                        {/* 5. Draw Value Picks */}
                        <div
                          className="prediction-widget-row"
                          style={{ opacity: activeTab === "DRAWS" ? 1 : 0.65 }}
                        >
                          <span className="prediction-label">
                            <Zap
                              size={14}
                              style={{ color: "var(--accent-gold)" }}
                            />{" "}
                            Draw Value (+EV)
                          </span>
                          <div className="prediction-value-col">
                            {drawRec && (
                              <span
                                className="recommendation-badge draw"
                                title={`Expected Value Yield: ${mkts.draw_value?.ev}`}
                              >
                                {mkts.draw_value?.ev} EV
                              </span>
                            )}
                            <div className="mini-progress-bar-bg">
                              <div
                                className="mini-progress-bar-fill draw"
                                style={{
                                  width: `${mkts.draw_value?.prob || 25}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className="probability-percentage-text"
                              style={{ color: "var(--accent-gold)" }}
                            >
                              {mkts.draw_value?.prob || 25}%
                            </span>
                          </div>
                        </div>

                        {/* 6. Most Scoring Half */}
                        <div
                          className="prediction-widget-row"
                          style={{
                            opacity: activeTab === "SCORING_HALF" ? 1 : 0.65,
                          }}
                        >
                          <span className="prediction-label">
                            <TrendingUp
                              size={14}
                              style={{ color: "var(--accent-violet)" }}
                            />{" "}
                            Most Scoring Half
                          </span>
                          <div className="prediction-value-col">
                            {halfRec && (
                              <span
                                className="recommendation-badge half"
                                style={{
                                  background: "rgba(139, 92, 246, 0.1)",
                                  color: "var(--accent-violet)",
                                  border: "1px solid rgba(139, 92, 246, 0.3)",
                                }}
                              >
                                {halfRec}
                              </span>
                            )}
                            <div
                              className="mini-progress-bar-bg"
                              title={`1H: ${mkts.most_scoring_half?.half_1h_prob || 0}% | 2H: ${mkts.most_scoring_half?.half_2h_prob || 0}% | EQ: ${mkts.most_scoring_half?.equal_prob || 0}%`}
                            >
                              <div
                                className="mini-progress-bar-fill half"
                                style={{
                                  background: "var(--grad-h2h-draws)",
                                  width: `${mkts.most_scoring_half?.half_2h_prob || 50}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className="probability-percentage-text"
                              style={{ color: "var(--accent-violet)" }}
                            >
                              {mkts.most_scoring_half?.half_2h_prob || 50}%
                            </span>
                          </div>
                        </div>

                        {/* 7. Corners O/U 8.5 */}
                        <div
                          className="prediction-widget-row"
                          style={{
                            opacity: activeTab === "CORNERS" ? 1 : 0.65,
                          }}
                        >
                          <span className="prediction-label">
                            <Award
                              size={14}
                              style={{ color: "var(--accent-cyan)" }}
                            />{" "}
                            Corners O/U 8.5
                          </span>
                          <div className="prediction-value-col">
                            {cornersRec && (
                              <span
                                className={`recommendation-badge ${cornersRec === "OVER_85" ? "over" : "under"}`}
                              >
                                {cornersRec === "OVER_85"
                                  ? "OVER 8.5"
                                  : "UNDER 8.5"}
                              </span>
                            )}
                            <div className="mini-progress-bar-bg">
                              <div
                                className={`mini-progress-bar-fill ${cornersRec === "OVER_85" ? "over" : "under"}`}
                                style={{
                                  width: `${Math.max(mkts.corners?.over_85_prob || 50, mkts.corners?.under_85_prob || 50)}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className="probability-percentage-text"
                              style={{ color: "var(--accent-cyan)" }}
                            >
                              {Math.max(
                                mkts.corners?.over_85_prob || 50,
                                mkts.corners?.under_85_prob || 50,
                              )}
                              %
                            </span>
                          </div>
                        </div>

                        {/* 8. GG/GG Both Halves */}
                        <div
                          className="prediction-widget-row"
                          style={{
                            opacity: activeTab === "GG_BOTH" ? 1 : 0.65,
                          }}
                        >
                          <span className="prediction-label">
                            <Flame
                              size={14}
                              style={{ color: "var(--accent-rose)" }}
                            />{" "}
                            GG/GG Both Halves
                          </span>
                          <div className="prediction-value-col">
                            {ggBothRec && (
                              <span
                                className="recommendation-badge gg-both"
                                style={{
                                  background: "rgba(236, 72, 153, 0.1)",
                                  color: "var(--accent-rose)",
                                  border: "1px solid rgba(236, 72, 153, 0.3)",
                                }}
                              >
                                GG/GG YES
                              </span>
                            )}
                            <div className="mini-progress-bar-bg">
                              <div
                                className="mini-progress-bar-fill streak"
                                style={{
                                  width: `${(mkts.gg_both_halves?.prob || 10) * 2.8}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className="probability-percentage-text"
                              style={{ color: "var(--accent-rose)" }}
                            >
                              {mkts.gg_both_halves?.prob || 10}%
                            </span>
                          </div>
                        </div>

                        {/* 9. HT/FT Turnaround */}
                        <div
                          className="prediction-widget-row"
                          style={{
                            opacity: activeTab === "TURNAROUND" ? 1 : 0.65,
                          }}
                        >
                          <span className="prediction-label">
                            <RefreshCw
                              size={14}
                              style={{ color: "var(--accent-gold)" }}
                            />{" "}
                            HT/FT Turnaround
                          </span>
                          <div className="prediction-value-col">
                            {turnaroundRec && (
                              <span
                                className="recommendation-badge draw"
                                style={{ padding: "2px 6px" }}
                              >
                                {turnaroundRec}
                              </span>
                            )}
                            <div className="mini-progress-bar-bg">
                              <div
                                className="mini-progress-bar-fill draw"
                                style={{
                                  width: `${Math.max(mkts.turnaround?.ht1_ft2_prob || 5, mkts.turnaround?.ht2_ft1_prob || 5) * 5}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className="probability-percentage-text"
                              style={{ color: "var(--accent-gold)" }}
                            >
                              {Math.max(
                                mkts.turnaround?.ht1_ft2_prob || 5,
                                mkts.turnaround?.ht2_ft1_prob || 5,
                              )}
                              %
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="card-analytics-footer">
                        {/* Primary market highlight display */}
                        <div className="primary-market-info-chip">
                          {activeTab === "DOUBLE_CHANCE" && (
                            <span>
                              🏡 1X: {mkts.double_chance?.home_1x_prob}% | ✈️
                              2X: {mkts.double_chance?.away_2x_prob}%
                            </span>
                          )}
                          {activeTab === "OVER_UNDER" && (
                            <span>
                              Predicted Goals Bias:{" "}
                              {roundGoalsBias(
                                mkts.over_under?.avg_goals_home,
                                mkts.over_under?.avg_goals_away,
                              )}{" "}
                              goals
                            </span>
                          )}
                          {activeTab === "BTTS" && (
                            <span>Goal scoring chance: {mkts.btts?.prob}%</span>
                          )}
                          {activeTab === "STREAKS" && (
                            <span>
                              Active Streaks: Home {mkts.streaks?.home_streak}W
                              | Away {mkts.streaks?.away_streak}W
                            </span>
                          )}
                          {activeTab === "DRAWS" && (
                            <span>
                              Draw Odds (X): {match.odds?.X || "N/A"} (Expected
                              Value: {mkts.draw_value?.ev || "0.00"})
                            </span>
                          )}
                          {activeTab === "H2H_DRAWS" && (
                            <span>
                              🤝 H2H Draw Trend: {match.marked_count} draws in{" "}
                              {match.total_history_count} H2H matches
                            </span>
                          )}
                          {activeTab === "SCORING_HALF" && (
                            <span>
                              Goal Halves: 1H{" "}
                              {mkts.most_scoring_half?.half_1h_prob}% | 2H{" "}
                              {mkts.most_scoring_half?.half_2h_prob}% | EQ{" "}
                              {mkts.most_scoring_half?.equal_prob}%
                            </span>
                          )}
                          {activeTab === "CORNERS" && (
                            <span>
                              Corners Bias: Over 8.5 (
                              {mkts.corners?.over_85_prob}%) | Under 8.5 (
                              {mkts.corners?.under_85_prob}%)
                            </span>
                          )}
                          {activeTab === "GG_BOTH" && (
                            <span>
                              GG Both Halves Probability:{" "}
                              {mkts.gg_both_halves?.prob}%
                            </span>
                          )}
                          {activeTab === "TURNAROUND" && (
                            <span>
                              HT/FT Flips: HT1/FT2 (
                              {mkts.turnaround?.ht1_ft2_prob}%) | HT2/FT1 (
                              {mkts.turnaround?.ht2_ft1_prob}%)
                            </span>
                          )}
                          {(activeTab === "ALL" ||
                            activeTab === "FAVORITES") && (
                            <span>
                              Marked draws count: {match.marked_count} out of{" "}
                              {match.total_history_count} H2H
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <button
                            onClick={(e) => toggleFavorite(e, matchKey)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: isFavorite
                                ? "var(--accent-gold)"
                                : "var(--text-muted)",
                              cursor: "pointer",
                              display: "flex",
                            }}
                            title={
                              isFavorite ? "Remove bookmark" : "Bookmark match"
                            }
                          >
                            {isFavorite ? (
                              <BookmarkCheck size={18} />
                            ) : (
                              <Bookmark size={18} />
                            )}
                          </button>

                          <span className="history-toggle-hint">
                            <ChevronDown size={16} />
                          </span>
                        </div>
                      </div>

                      {/* SQLite collapsible H2H records inspect list */}
                      <div className="history-collapsible">
                        <div
                          className="history-inner"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="history-header-row">
                            <span>
                              {activeTab === "DRAWS" ||
                              activeTab === "H2H_DRAWS"
                                ? `SofaScore H2H Draws (${match.history.filter((h) => h.is_marked).length})`
                                : `SofaScore H2H Matches (${match.history.length})`}
                            </span>
                            <span>Date</span>
                          </div>
                          <div className="history-list">
                            {match.history && match.history.length > 0 ? (
                              match.history
                                .filter((hist) => {
                                  if (
                                    activeTab === "DRAWS" ||
                                    activeTab === "H2H_DRAWS"
                                  ) {
                                    return !!hist.is_marked;
                                  }
                                  return true;
                                })
                                .map((hist, hIdx) => {
                                  return (
                                    <div
                                      key={hIdx}
                                      className={`history-row ${hist.is_marked ? "is-draw" : ""}`}
                                    >
                                      <span className="history-fixture">
                                        {hist.detail}
                                      </span>
                                      <span className="history-date">
                                        {hist.is_marked && (
                                          <span
                                            style={{
                                              color: "var(--accent-gold)",
                                              marginRight: "6px",
                                              fontSize: "0.62rem",
                                              fontWeight: 800,
                                            }}
                                          >
                                            [DRAW]
                                          </span>
                                        )}
                                        {hist.date}
                                      </span>
                                    </div>
                                  );
                                })
                            ) : (
                              <div
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: "0.82rem",
                                  padding: "10px 0",
                                  textAlign: "center",
                                }}
                              >
                                No detailed SQLite history persisted.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              // Toggle list/line layout view on a single straight line
              <div className="matches-list">
                {filteredAndSortedMatches.map((match, idx) => {
                  const matchKey = `${match.date}_${match.home_team}_${match.away_team}`;
                  const isExpanded = !!expandedCards[matchKey];
                  const isFavorite = !!favorites[matchKey];

                  const mkts = match.markets || {};
                  const dcRec = mkts.double_chance?.recommendation;
                  const ouRec = mkts.over_under?.recommendation;
                  const bttsRec = mkts.btts?.recommendation;
                  const streakRec = mkts.streaks?.recommendation;
                  const drawRec = mkts.draw_value?.recommendation;
                  const halfRec = mkts.most_scoring_half?.recommendation;
                  const cornersRec = mkts.corners?.recommendation;
                  const ggBothRec = mkts.gg_both_halves?.recommendation;
                  const turnaroundRec = mkts.turnaround?.recommendation;

                  // Determine active highlights for single row borders
                  let rowClass = "";
                  if (activeTab === "DOUBLE_CHANCE" && dcRec)
                    rowClass = "highlight-dc";
                  else if (activeTab === "OVER_UNDER" && ouRec)
                    rowClass = `highlight-${ouRec === "OVER_25" ? "over" : "under"}`;
                  else if (activeTab === "BTTS" && bttsRec)
                    rowClass = "highlight-btts";
                  else if (activeTab === "STREAKS" && streakRec)
                    rowClass = "highlight-streaks";
                  else if (activeTab === "DRAWS" && drawRec)
                    rowClass = "highlight-draws";
                  else if (activeTab === "H2H_DRAWS")
                    rowClass = "highlight-h2h-draws";
                  else if (activeTab === "SCORING_HALF" && halfRec)
                    rowClass = "highlight-scoring-half";
                  else if (activeTab === "CORNERS" && cornersRec)
                    rowClass = `highlight-${cornersRec === "OVER_85" ? "corners-over" : "corners-under"}`;
                  else if (activeTab === "GG_BOTH" && ggBothRec)
                    rowClass = "highlight-gg-both";
                  else if (activeTab === "TURNAROUND" && turnaroundRec)
                    rowClass = "highlight-turnaround";

                  // Extract primary recommendation text and color coding
                  let activeRec = "";
                  let activeProb = 0;
                  let activeColor = "var(--text-secondary)";
                  let graphType = "DC";

                  if (
                    activeTab === "DOUBLE_CHANCE" ||
                    (activeTab === "ALL" && dcRec) ||
                    (activeTab === "FAVORITES" && dcRec)
                  ) {
                    activeRec = dcRec ? `${dcRec} SAFE` : "";
                    activeProb = Math.max(
                      mkts.double_chance?.home_1x_prob || 0,
                      mkts.double_chance?.away_2x_prob || 0,
                    );
                    activeColor = "var(--accent-emerald)";
                    graphType = "DC";
                  } else if (
                    activeTab === "OVER_UNDER" ||
                    (activeTab === "ALL" && ouRec) ||
                    (activeTab === "FAVORITES" && ouRec)
                  ) {
                    activeRec = ouRec === "OVER_25" ? "OVER 2.5" : "UNDER 2.5";
                    activeProb = Math.max(
                      mkts.over_under?.over_25_prob || 0,
                      mkts.over_under?.under_25_prob || 0,
                    );
                    activeColor = "var(--accent-cyan)";
                    graphType = "OU";
                  } else if (
                    activeTab === "BTTS" ||
                    (activeTab === "ALL" && bttsRec) ||
                    (activeTab === "FAVORITES" && bttsRec)
                  ) {
                    activeRec = "BTTS YES";
                    activeProb = mkts.btts?.prob || 0;
                    activeColor = "var(--accent-orange)";
                    graphType = "BTTS";
                  } else if (
                    activeTab === "STREAKS" ||
                    (activeTab === "ALL" && streakRec) ||
                    (activeTab === "FAVORITES" && streakRec)
                  ) {
                    activeRec =
                      streakRec === "HOME_STREAK"
                        ? `${mkts.streaks?.home_streak}W HOME`
                        : `${mkts.streaks?.away_streak}W AWAY`;
                    activeProb =
                      Math.max(
                        mkts.streaks?.home_streak || 0,
                        mkts.streaks?.away_streak || 0,
                      ) * 10;
                    activeColor = "var(--accent-rose)";
                    graphType = "STREAK";
                  } else if (
                    activeTab === "DRAWS" ||
                    activeTab === "H2H_DRAWS" ||
                    (activeTab === "ALL" && drawRec) ||
                    (activeTab === "FAVORITES" && drawRec)
                  ) {
                    activeRec = drawRec
                      ? `${mkts.draw_value?.ev} EV`
                      : "DRAW VALUE";
                    activeProb = mkts.draw_value?.prob || 0;
                    activeColor = "var(--accent-gold)";
                    graphType = "DRAW";
                  } else if (
                    activeTab === "SCORING_HALF" ||
                    (activeTab === "ALL" && halfRec) ||
                    (activeTab === "FAVORITES" && halfRec)
                  ) {
                    activeRec = halfRec || "";
                    activeProb = mkts.most_scoring_half?.half_2h_prob || 0;
                    activeColor = "var(--accent-violet)";
                    graphType = "HALF";
                  } else if (
                    activeTab === "CORNERS" ||
                    (activeTab === "ALL" && cornersRec) ||
                    (activeTab === "FAVORITES" && cornersRec)
                  ) {
                    activeRec =
                      cornersRec === "OVER_85" ? "OVER 8.5" : "UNDER 8.5";
                    activeProb = Math.max(
                      mkts.corners?.over_85_prob || 0,
                      mkts.corners?.under_85_prob || 0,
                    );
                    activeColor = "var(--accent-cyan)";
                    graphType = "CORNERS";
                  } else if (
                    activeTab === "GG_BOTH" ||
                    (activeTab === "ALL" && ggBothRec) ||
                    (activeTab === "FAVORITES" && ggBothRec)
                  ) {
                    activeRec = "GG/GG YES";
                    activeProb = mkts.gg_both_halves?.prob || 0;
                    activeColor = "var(--accent-rose)";
                    graphType = "GG_BOTH";
                  } else if (
                    activeTab === "TURNAROUND" ||
                    (activeTab === "ALL" && turnaroundRec) ||
                    (activeTab === "FAVORITES" && turnaroundRec)
                  ) {
                    activeRec = turnaroundRec || "";
                    activeProb = Math.max(
                      mkts.turnaround?.ht1_ft2_prob || 0,
                      mkts.turnaround?.ht2_ft1_prob || 0,
                    );
                    activeColor = "var(--accent-gold)";
                    graphType = "TURNAROUND";
                  }

                  // Default safety fallback if not matched
                  if (!activeRec) {
                    if (dcRec) {
                      activeRec = `${dcRec} SAFE`;
                      activeProb = Math.max(
                        mkts.double_chance?.home_1x_prob || 0,
                        mkts.double_chance?.away_2x_prob || 0,
                      );
                      activeColor = "var(--accent-emerald)";
                      graphType = "DC";
                    } else {
                      activeRec = "ANALYSED";
                      activeProb = 50;
                      activeColor = "var(--text-muted)";
                    }
                  }

                  const isCupOrFriendly =
                    match.league &&
                    /cup|friendly|kup|copa|coupe/i.test(match.league);

                  return (
                    <article
                      key={matchKey}
                      onClick={() => toggleCard(matchKey)}
                      className={`match-line-row ${rowClass} ${isExpanded ? "expanded" : ""} ${isCupOrFriendly ? "is-cup" : ""}`}
                    >
                      <div className="line-main-content">
                        {/* 1. Date & Time Badges */}
                        <div className="line-date-time">
                          <span className="line-date">{match.date}</span>
                          <span
                            className={`line-time ${match.status === "finished" ? "finished" : match.status === "inprogress" ? "live" : match.status === "postponed" ? "postponed" : ""}`}
                          >
                            {match.status === "finished"
                              ? "FT"
                              : match.status === "inprogress"
                                ? "● LIVE"
                                : match.status === "postponed"
                                  ? "PP"
                                  : match.time || "TBD"}
                          </span>
                          {(match.status === "finished" ||
                            match.status === "inprogress" ||
                            match.status === "postponed") &&
                            match.time && (
                              <span className="line-kickoff-time">
                                <Clock size={11} /> {match.time}
                              </span>
                            )}
                        </div>

                        {/* 2. League Label */}
                        <div className="line-league" title={match.league}>
                          {getLeagueFlag(match.league)}{" "}
                          {match.league.split(" » ").pop() || match.league}
                        </div>

                        {/* 3. Team Roster straight aligned */}
                        <div className="line-teams-roster">
                          <div className="line-team home">
                            <span
                              className="line-team-name"
                              title={match.home_team}
                            >
                              {match.home_team}
                            </span>
                            {match.home_rank && (
                              <span className="line-team-rank">
                                #{match.home_rank}
                              </span>
                            )}
                            {renderFormDots(match.home_form)}
                          </div>

                          <div className="line-scoreline">
                            {match.home_score !== undefined &&
                            match.home_score !== null &&
                            match.away_score !== undefined &&
                            match.away_score !== null ? (
                              <span className="line-score-val">
                                {match.home_score} - {match.away_score}
                              </span>
                            ) : (
                              <span className="line-vs-val">VS</span>
                            )}
                          </div>

                          <div className="line-team away">
                            {renderFormDots(match.away_form)}
                            {match.away_rank && (
                              <span className="line-team-rank">
                                #{match.away_rank}
                              </span>
                            )}
                            <span
                              className="line-team-name"
                              title={match.away_team}
                            >
                              {match.away_team}
                            </span>
                          </div>
                        </div>

                        {/* 4. Active Recommendation Badge */}
                        <div className="line-active-market">
                          <span
                            className="line-market-badge"
                            style={{
                              borderColor: activeColor,
                              color: activeColor,
                              background: `${activeColor}1A`,
                            }}
                          >
                            {activeRec}
                          </span>
                        </div>

                        {/* 5. Large Probability Text */}
                        <div
                          className="line-prob-pct"
                          style={{ color: activeColor }}
                        >
                          {activeProb}%
                        </div>

                        {/* 6. CSS Progress Split Graph Sparkline */}
                        <div className="line-graph-wrapper">
                          {graphType === "HALF" && (
                            <div className="line-progress-graph-container split-3">
                              <div
                                className="line-progress-segment p-1h"
                                style={{
                                  width: `${mkts.most_scoring_half?.half_1h_prob || 30}%`,
                                }}
                                title={`1H Goal Prob: ${mkts.most_scoring_half?.half_1h_prob || 30}%`}
                              ></div>
                              <div
                                className="line-progress-segment p-eq"
                                style={{
                                  width: `${mkts.most_scoring_half?.equal_prob || 20}%`,
                                }}
                                title={`Equal Goal Prob: ${mkts.most_scoring_half?.equal_prob || 20}%`}
                              ></div>
                              <div
                                className="line-progress-segment p-2h"
                                style={{
                                  width: `${mkts.most_scoring_half?.half_2h_prob || 50}%`,
                                }}
                                title={`2H Goal Prob: ${mkts.most_scoring_half?.half_2h_prob || 50}%`}
                              ></div>
                            </div>
                          )}

                          {graphType === "DC" && (
                            <div className="line-progress-graph-container split-2">
                              <div
                                className="line-progress-segment p-1x"
                                style={{
                                  width: `${Math.round(((mkts.double_chance?.home_1x_prob || 50) / ((mkts.double_chance?.home_1x_prob || 50) + (mkts.double_chance?.away_2x_prob || 50))) * 100)}%`,
                                }}
                                title={`1X Bias: ${mkts.double_chance?.home_1x_prob || 50}%`}
                              ></div>
                              <div
                                className="line-progress-segment p-2x"
                                style={{
                                  width: `${100 - Math.round(((mkts.double_chance?.home_1x_prob || 50) / ((mkts.double_chance?.home_1x_prob || 50) + (mkts.double_chance?.away_2x_prob || 50))) * 100)}%`,
                                }}
                                title={`2X Bias: ${mkts.double_chance?.away_2x_prob || 50}%`}
                              ></div>
                            </div>
                          )}

                          {graphType === "OU" && (
                            <div className="line-progress-graph-container split-2">
                              <div
                                className="line-progress-segment p-over"
                                style={{
                                  width: `${mkts.over_under?.over_25_prob || 50}%`,
                                }}
                                title={`Over 2.5: ${mkts.over_under?.over_25_prob || 50}%`}
                              ></div>
                              <div
                                className="line-progress-segment p-under"
                                style={{
                                  width: `${mkts.over_under?.under_25_prob || 50}%`,
                                }}
                                title={`Under 2.5: ${mkts.over_under?.under_25_prob || 50}%`}
                              ></div>
                            </div>
                          )}

                          {graphType === "BTTS" && (
                            <div className="line-progress-graph-container split-2">
                              <div
                                className="line-progress-segment p-yes"
                                style={{ width: `${mkts.btts?.prob || 50}%` }}
                                title={`BTTS Yes: ${mkts.btts?.prob || 50}%`}
                              ></div>
                              <div
                                className="line-progress-segment p-no"
                                style={{
                                  width: `${100 - (mkts.btts?.prob || 50)}%`,
                                }}
                                title={`BTTS No: ${100 - (mkts.btts?.prob || 50)}%`}
                              ></div>
                            </div>
                          )}

                          {graphType === "STREAK" && (
                            <div className="line-progress-graph-container split-2">
                              <div
                                className="line-progress-segment p-home-streak"
                                style={{
                                  width: `${mkts.streaks?.home_streak || mkts.streaks?.away_streak ? Math.round(((mkts.streaks?.home_streak || 0) / ((mkts.streaks?.home_streak || 0) + (mkts.streaks?.away_streak || 0) || 1)) * 100) : 50}%`,
                                }}
                                title={`Home Streak: ${mkts.streaks?.home_streak || 0}`}
                              ></div>
                              <div
                                className="line-progress-segment p-away-streak"
                                style={{
                                  width: `${mkts.streaks?.home_streak || mkts.streaks?.away_streak ? 100 - Math.round(((mkts.streaks?.home_streak || 0) / ((mkts.streaks?.home_streak || 0) + (mkts.streaks?.away_streak || 0) || 1)) * 100) : 50}%`,
                                }}
                                title={`Away Streak: ${mkts.streaks?.away_streak || 0}`}
                              ></div>
                            </div>
                          )}

                          {graphType === "DRAW" && (
                            <div className="line-progress-graph-container split-2">
                              <div
                                className="line-progress-segment p-draw"
                                style={{
                                  width: `${mkts.draw_value?.prob || 25}%`,
                                }}
                                title={`Draw Value: ${mkts.draw_value?.prob || 25}%`}
                              ></div>
                              <div
                                className="line-progress-segment p-rem"
                                style={{
                                  width: `${100 - (mkts.draw_value?.prob || 25)}%`,
                                }}
                                title={`Decisive Out: ${100 - (mkts.draw_value?.prob || 25)}%`}
                              ></div>
                            </div>
                          )}

                          {graphType === "CORNERS" && (
                            <div className="line-progress-graph-container split-2">
                              <div
                                className="line-progress-segment p-corners-over"
                                style={{
                                  width: `${mkts.corners?.over_85_prob || 50}%`,
                                }}
                                title={`Over 8.5 Corners: ${mkts.corners?.over_85_prob || 50}%`}
                              ></div>
                              <div
                                className="line-progress-segment p-corners-under"
                                style={{
                                  width: `${mkts.corners?.under_85_prob || 50}%`,
                                }}
                                title={`Under 8.5 Corners: ${mkts.corners?.under_85_prob || 50}%`}
                              ></div>
                            </div>
                          )}

                          {graphType === "GG_BOTH" && (
                            <div className="line-progress-graph-container split-2">
                              <div
                                className="line-progress-segment p-gg-yes"
                                style={{
                                  width: `${(mkts.gg_both_halves?.prob || 10) * 2.8}%`,
                                }}
                                title={`GG Both Halves: ${mkts.gg_both_halves?.prob || 10}%`}
                              ></div>
                              <div
                                className="line-progress-segment p-gg-no"
                                style={{
                                  width: `${100 - (mkts.gg_both_halves?.prob || 10) * 2.8}%`,
                                }}
                                title={`GG Standard: ${100 - (mkts.gg_both_halves?.prob || 10) * 2.8}%`}
                              ></div>
                            </div>
                          )}

                          {graphType === "TURNAROUND" && (
                            <div className="line-progress-graph-container split-3">
                              <div
                                className="line-progress-segment p-t12"
                                style={{
                                  width: `${mkts.turnaround?.ht1_ft2_prob || 5}%`,
                                }}
                                title={`HT 1 / FT 2: ${mkts.turnaround?.ht1_ft2_prob || 5}%`}
                              ></div>
                              <div
                                className="line-progress-segment p-t21"
                                style={{
                                  width: `${mkts.turnaround?.ht2_ft1_prob || 5}%`,
                                }}
                                title={`HT 2 / FT 1: ${mkts.turnaround?.ht2_ft1_prob || 5}%`}
                              ></div>
                              <div
                                className="line-progress-segment p-trem"
                                style={{
                                  width: `${100 - (mkts.turnaround?.ht1_ft2_prob || 5) - (mkts.turnaround?.ht2_ft1_prob || 5)}%`,
                                }}
                                title={`Steady Outcome: ${100 - (mkts.turnaround?.ht1_ft2_prob || 5) - (mkts.turnaround?.ht2_ft1_prob || 5)}%`}
                              ></div>
                            </div>
                          )}
                        </div>

                        {/* 7. Action Bookmarks & collapsers */}
                        <div className="line-actions">
                          <button
                            onClick={(e) => toggleFavorite(e, matchKey)}
                            className={`line-fav-btn ${isFavorite ? "active" : ""}`}
                            title={
                              isFavorite ? "Remove bookmark" : "Bookmark match"
                            }
                          >
                            {isFavorite ? (
                              <BookmarkCheck
                                size={18}
                                style={{ color: "var(--accent-gold)" }}
                              />
                            ) : (
                              <Bookmark size={18} />
                            )}
                          </button>

                          <span className="line-arrow">
                            <ChevronDown size={16} />
                          </span>
                        </div>
                      </div>

                      {/* SQLite Collapsible drawer same as Grid card */}
                      <div className="history-collapsible">
                        <div
                          className="history-inner"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="history-header-row">
                            <span>
                              {activeTab === "DRAWS" ||
                              activeTab === "H2H_DRAWS"
                                ? `SofaScore H2H Draws (${match.history.filter((h) => h.is_marked).length})`
                                : `SofaScore H2H Matches (${match.history.length})`}
                            </span>
                            <span>Date</span>
                          </div>
                          <div className="history-list">
                            {match.history && match.history.length > 0 ? (
                              match.history
                                .filter((hist) => {
                                  if (
                                    activeTab === "DRAWS" ||
                                    activeTab === "H2H_DRAWS"
                                  ) {
                                    return !!hist.is_marked;
                                  }
                                  return true;
                                })
                                .map((hist, hIdx) => {
                                  return (
                                    <div
                                      key={hIdx}
                                      className={`history-row ${hist.is_marked ? "is-draw" : ""}`}
                                    >
                                      <span className="history-fixture">
                                        {hist.detail}
                                      </span>
                                      <span className="history-date">
                                        {hist.is_marked && (
                                          <span
                                            style={{
                                              color: "var(--accent-gold)",
                                              marginRight: "6px",
                                              fontSize: "0.62rem",
                                              fontWeight: 800,
                                            }}
                                          >
                                            [DRAW]
                                          </span>
                                        )}
                                        {hist.date}
                                      </span>
                                    </div>
                                  );
                                })
                            ) : (
                              <div
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: "0.82rem",
                                  padding: "10px 0",
                                  textAlign: "center",
                                }}
                              >
                                No detailed SQLite history persisted.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : (
            <div className="empty-state">
              <AlertTriangle size={48} style={{ color: "var(--text-muted)" }} />
              <div className="empty-title">No Matches Isolated</div>
              <div className="empty-desc">
                No fixtures matched your selected filters or the active market
                probability indicators. Try searching another team or changing
                tabs.
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer Section */}
      <footer className="app-footer">
        <div className="footer-text">
          SofaScore Live Data Engine • Direct API Pipeline • Active Today
        </div>
        <div
          className="footer-text"
          style={{ fontSize: "0.75rem", opacity: 0.6 }}
        >
          Powered by SofaScore APIs with ❤️ utilizing Vite React and obsidian
          aesthetics. Sports predictions are calculations, not absolute
          guarantees.
        </div>
      </footer>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="back-to-top-btn"
          aria-label="Back to Top"
          title="Back to Top"
        >
          <ChevronUp size={20} />
        </button>
      )}
    </div>
  );
}

// Helper to round predicted goals bias
function roundGoalsBias(g1, g2) {
  if (g1 === undefined || g2 === undefined) return "0.00";
  return (parseFloat(g1) + parseFloat(g2)).toFixed(2);
}

export default SofascoreData;
