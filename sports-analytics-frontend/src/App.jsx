import React, { useState, useEffect, useMemo } from 'react';
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
  Plus
} from 'lucide-react';

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Interactive UI Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('ALL');
  const [activeTab, setActiveTab] = useState('DOUBLE_CHANCE'); // Default to Double Chance safety picks
  const [sortBy, setSortBy] = useState('PROBABILITY'); // Default to sorting by probability
  const [expandedCards, setExpandedCards] = useState({});
  const [favorites, setFavorites] = useState({});
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch the Multi-Sports analyzed JSON database
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/sports_data.json?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sports analyzed data. Please verify update_engine.py completed successfully.');
      }
      const data = await response.json();
      setMatches(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not load the sports_data.json file. Check if the database update script was executed.');
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
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Toggle card collapse
  const toggleCard = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle bookmark favorites
  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    setFavorites(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Generate unique list of leagues and dates for dropdown selectors
  const leaguesList = useMemo(() => {
    const leagues = new Set();
    matches.forEach(m => {
      if (m.league) leagues.add(m.league);
    });
    return ['ALL', ...Array.from(leagues).sort()];
  }, [matches]);

  const datesList = useMemo(() => {
    const dates = new Set();
    matches.forEach(m => {
      if (m.date) dates.add(m.date);
    });
    return ['ALL', ...Array.from(dates).sort()];
  }, [matches]);

  // Tab count indicators for counters panel
  const tabCounts = useMemo(() => {
    let dc = 0;
    let ou = 0;
    let btts = 0;
    let streaks = 0;
    let draws = 0;

    matches.forEach(m => {
      const mkts = m.markets || {};
      if (mkts.double_chance?.recommendation) dc++;
      if (mkts.over_under?.recommendation) ou++;
      if (mkts.btts?.recommendation) btts++;
      if (mkts.streaks?.recommendation) streaks++;
      if (mkts.draw_value?.recommendation) draws++;
    });

    return { total: matches.length, dc, ou, btts, streaks, draws };
  }, [matches]);

  // Filter & Sort matches dynamically based on active tab and inputs
  const filteredAndSortedMatches = useMemo(() => {
    let result = [...matches];

    // 1. Text Search Input
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        m => m.home_team.toLowerCase().includes(query) || 
             m.away_team.toLowerCase().includes(query) ||
             m.league.toLowerCase().includes(query)
      );
    }

    // 2. League Selection
    if (selectedLeague !== 'ALL') {
      result = result.filter(m => m.league === selectedLeague);
    }

    // 3. Kickoff Date Selection
    if (selectedDate !== 'ALL') {
      result = result.filter(m => m.date === selectedDate);
    }

    // 4. Tab Market Filtering
    if (activeTab === 'DOUBLE_CHANCE') {
      result = result.filter(m => m.markets?.double_chance?.recommendation);
    } else if (activeTab === 'OVER_UNDER') {
      result = result.filter(m => m.markets?.over_under?.recommendation);
    } else if (activeTab === 'BTTS') {
      result = result.filter(m => m.markets?.btts?.recommendation);
    } else if (activeTab === 'STREAKS') {
      result = result.filter(m => m.markets?.streaks?.recommendation);
    } else if (activeTab === 'DRAWS') {
      result = result.filter(m => m.markets?.draw_value?.recommendation);
    } else if (activeTab === 'FAVORITES') {
      result = result.filter((_, idx) => favorites[idx]);
    }

    // 5. Advanced Sorting Controls
    result.sort((a, b) => {
      const aMkts = a.markets || {};
      const bMkts = b.markets || {};

      if (sortBy === 'PROBABILITY') {
        // Sort based on active tab primary probability metric
        if (activeTab === 'DOUBLE_CHANCE') {
          const aMax = Math.max(aMkts.double_chance?.home_1x_prob || 0, aMkts.double_chance?.away_2x_prob || 0);
          const bMax = Math.max(bMkts.double_chance?.home_1x_prob || 0, bMkts.double_chance?.away_2x_prob || 0);
          return bMax - aMax;
        } else if (activeTab === 'OVER_UNDER') {
          const aMax = Math.max(aMkts.over_under?.over_25_prob || 0, aMkts.over_under?.under_25_prob || 0);
          const bMax = Math.max(bMkts.over_under?.over_25_prob || 0, bMkts.over_under?.under_25_prob || 0);
          return bMax - aMax;
        } else if (activeTab === 'BTTS') {
          return (bMkts.btts?.prob || 0) - (aMkts.btts?.prob || 0);
        } else if (activeTab === 'STREAKS') {
          const aMaxStreak = Math.max(aMkts.streaks?.home_streak || 0, aMkts.streaks?.away_streak || 0);
          const bMaxStreak = Math.max(bMkts.streaks?.home_streak || 0, bMkts.streaks?.away_streak || 0);
          return bMaxStreak - aMaxStreak;
        } else if (activeTab === 'DRAWS') {
          return (bMkts.draw_value?.prob || 0) - (aMkts.draw_value?.prob || 0);
        }
        return b.marked_count - a.marked_count; // Default to historical draw counts
      }
      if (sortBy === 'KICKOFF') {
        return a.time.localeCompare(b.time);
      }
      if (sortBy === 'LEAGUE') {
        return a.league.localeCompare(b.league);
      }
      if (sortBy === 'VALUE') {
        if (activeTab === 'DRAWS') {
          return (bMkts.draw_value?.ev || 0.0) - (aMkts.draw_value?.ev || 0.0);
        }
        return (b.odds?.X || 0.0) - (a.odds?.X || 0.0);
      }
      return 0;
    });

    return result;
  }, [matches, searchTerm, selectedLeague, selectedDate, activeTab, sortBy, favorites]);

  // Helper render to display small glossy dots for team forms
  const renderFormDots = (formArray) => {
    if (!formArray || formArray.length === 0) return null;
    return (
      <div className="form-dots-container" onClick={(e) => e.stopPropagation()}>
        {formArray.slice(0, 5).map((letter, index) => {
          let colorClass = 'form-dot-unknown';
          if (letter === 'W') colorClass = 'form-dot-w';
          else if (letter === 'D') colorClass = 'form-dot-d';
          else if (letter === 'L') colorClass = 'form-dot-l';
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
        <div className="brand-badge">
          <Trophy size={14} fill="currentColor" /> Multi-Sports Value Engine
        </div>
        <h1 className="app-title">Multi-Sports Analytics Engine</h1>
        <p className="app-subtitle">
          Advanced predictive modeling executing structured SQLite relational analysis across multiple high-yield sports betting markets. Fuzzy matches schedules, standing positions, and H2H records in real-time.
        </p>
      </header>

      {/* Loading & Error States */}
      {loading && (
        <div className="empty-state">
          <RefreshCw className="animate-spin" size={48} style={{ color: 'var(--accent-gold)' }} />
          <div className="empty-title">Compiling Sports Database...</div>
          <div className="empty-desc">Parsing update_engine SQLite structures and calculating probabilities.</div>
        </div>
      )}

      {error && !loading && (
        <div className="empty-state" style={{ borderColor: '#ef4444' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444' }} />
          <div className="empty-title" style={{ color: '#ef4444' }}>Engine Fetch Error</div>
          <div className="empty-desc">{error}</div>
          <button onClick={handleRefresh} className="tab-btn active" style={{ marginTop: '16px' }}>
            Retry Query
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Counters Grid Roster */}
          <section className="stats-grid" aria-label="Dashboard Metrics">
            <div className="stat-card" onClick={() => setActiveTab('DOUBLE_CHANCE')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper double-chance">
                <Shield size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.dc}</div>
                <div className="stat-label">Safe Double Chance</div>
              </div>
              <div className="stat-card-badge">🛡️ High safety</div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab('OVER_UNDER')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper goals">
                <Award size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.ou}</div>
                <div className="stat-label">Over / Under Goals</div>
              </div>
              <div className="stat-card-badge">⚽ Total goals</div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab('BTTS')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper btts">
                <Activity size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.btts}</div>
                <div className="stat-label">Both Teams to Score</div>
              </div>
              <div className="stat-card-badge">🔥 Goal streaks</div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab('STREAKS')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper streaks">
                <Flame size={24} fill="currentColor" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.streaks}</div>
                <div className="stat-label">Winning Streaks</div>
              </div>
              <div className="stat-card-badge">🏆 Form power</div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab('DRAWS')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper draws">
                <Zap size={24} fill="currentColor" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{tabCounts.draws}</div>
                <div className="stat-label">Draw Value Picks</div>
              </div>
              <div className="stat-card-badge">🎯 Value EV</div>
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
                      {league === 'ALL' ? 'All Leagues' : league}
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
                      {date === 'ALL' ? 'All Dates' : date}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="select-icon" />
              </div>

              <div className="select-wrapper" style={{ minWidth: '180px' }}>
                <select 
                  className="select-input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="PROBABILITY">Sort by Probability</option>
                  <option value="KICKOFF">Sort by Kickoff Time</option>
                  <option value="LEAGUE">Sort by League Name</option>
                  {activeTab === 'DRAWS' && <option value="VALUE">Sort by Expected Value (EV)</option>}
                </select>
                <ArrowUpDown size={18} className="select-icon" />
              </div>

              <button 
                onClick={handleRefresh}
                className="tab-btn" 
                style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--glass-border)' }}
                title="Refresh database output"
                disabled={refreshing}
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Navigation tabs */}
            <div className="tabs-container">
              <button 
                onClick={() => setActiveTab('DOUBLE_CHANCE')}
                className={`tab-btn double-chance ${activeTab === 'DOUBLE_CHANCE' ? 'active' : ''}`}
              >
                <Shield size={14} /> Safe Double Chance <span className="tab-count">{tabCounts.dc}</span>
              </button>

              <button 
                onClick={() => setActiveTab('OVER_UNDER')}
                className={`tab-btn over-under ${activeTab === 'OVER_UNDER' ? 'active' : ''}`}
              >
                <Award size={14} /> Over / Under 2.5 <span className="tab-count">{tabCounts.ou}</span>
              </button>

              <button 
                onClick={() => setActiveTab('BTTS')}
                className={`tab-btn btts ${activeTab === 'BTTS' ? 'active' : ''}`}
              >
                <Activity size={14} /> Both Teams to Score <span className="tab-count">{tabCounts.btts}</span>
              </button>

              <button 
                onClick={() => setActiveTab('STREAKS')}
                className={`tab-btn streaks ${activeTab === 'STREAKS' ? 'active' : ''}`}
              >
                <Flame size={14} fill="currentColor" /> Winning Streaks <span className="tab-count">{tabCounts.streaks}</span>
              </button>

              <button 
                onClick={() => setActiveTab('DRAWS')}
                className={`tab-btn draws ${activeTab === 'DRAWS' ? 'active' : ''}`}
              >
                <Zap size={14} fill="currentColor" /> Draw Value Picks <span className="tab-count">{tabCounts.draws}</span>
              </button>

              <button 
                onClick={() => setActiveTab('ALL')}
                className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
              >
                <Layers size={14} /> All Roster <span className="tab-count">{tabCounts.total}</span>
              </button>

              <button 
                onClick={() => setActiveTab('FAVORITES')}
                className={`tab-btn ${activeTab === 'FAVORITES' ? 'active' : ''}`}
                style={{ marginLeft: 'auto', borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                Bookmarks <span className="tab-count">{Object.values(favorites).filter(Boolean).length}</span>
              </button>
            </div>
          </section>

          {/* Roster list counts */}
          <div className="matches-header-info" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
            <div className="matches-count-label" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Displaying <span className="matches-count-number" style={{ color: 'var(--accent-gold)' }}>{filteredAndSortedMatches.length}</span> analyzed fixtures
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              * Toggle cards to inspect SQLite chronological head-to-head records.
            </div>
          </div>

          {/* Cards Grid list */}
          {filteredAndSortedMatches.length > 0 ? (
            <div className="matches-grid">
              {filteredAndSortedMatches.map((match, idx) => {
                const isExpanded = !!expandedCards[idx];
                const isFavorite = !!favorites[idx];
                
                const mkts = match.markets || {};
                const dcRec = mkts.double_chance?.recommendation;
                const ouRec = mkts.over_under?.recommendation;
                const bttsRec = mkts.btts?.recommendation;
                const streakRec = mkts.streaks?.recommendation;
                const drawRec = mkts.draw_value?.recommendation;

                // Determine border highlight color based on active tab recommendation
                let cardClass = '';
                if (activeTab === 'DOUBLE_CHANCE' && dcRec) cardClass = 'highlight-dc';
                else if (activeTab === 'OVER_UNDER' && ouRec) cardClass = `highlight-${ouRec === 'OVER_25' ? 'over' : 'under'}`;
                else if (activeTab === 'BTTS' && bttsRec) cardClass = 'highlight-btts';
                else if (activeTab === 'STREAKS' && streakRec) cardClass = 'highlight-streaks';
                else if (activeTab === 'DRAWS' && drawRec) cardClass = 'highlight-draws';

                return (
                  <article 
                    key={idx}
                    onClick={() => toggleCard(idx)}
                    className={`match-card ${cardClass} ${isExpanded ? 'expanded' : ''}`}
                  >
                    {/* Header section */}
                    <div className="card-header-section">
                      <div className="league-time-row">
                        <span className="league-badge" title={match.league}>{match.league}</span>
                        <span className="time-badge">
                          <Clock size={12} /> {match.time || 'TBD'}
                        </span>
                      </div>

                      <div className="teams-display">
                        <div className="team-row">
                          <span className="team-name" title={match.home_team}>{match.home_team}</span>
                          <div className="team-stats-summary">
                            {match.home_rank && (
                              <span className="team-rank-badge" title={`League Position: ${match.home_rank}`}>
                                Rank #{match.home_rank}
                              </span>
                            )}
                            {renderFormDots(match.home_form)}
                          </div>
                        </div>

                        <div className="team-vs-indicator">VS</div>

                        <div className="team-row">
                          <span className="team-name" title={match.away_team}>{match.away_team}</span>
                          <div className="team-stats-summary">
                            {match.away_rank && (
                              <span className="team-rank-badge" title={`League Position: ${match.away_rank}`}>
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
                      <div className="prediction-widget-row" style={{ opacity: activeTab === 'DOUBLE_CHANCE' ? 1 : 0.65 }}>
                        <span className="prediction-label">
                          <Shield size={14} style={{ color: 'var(--accent-emerald)' }} /> Double Chance
                        </span>
                        <div className="prediction-value-col">
                          {dcRec && <span className="recommendation-badge dc">{dcRec} SAFE</span>}
                          <div className="mini-progress-bar-bg">
                            <div 
                              className="mini-progress-bar-fill dc" 
                              style={{ width: `${Math.max(mkts.double_chance?.home_1x_prob || 50, mkts.double_chance?.away_2x_prob || 50)}%` }}
                            ></div>
                          </div>
                          <span className="probability-percentage-text" style={{ color: 'var(--accent-emerald)' }}>
                            {Math.max(mkts.double_chance?.home_1x_prob || 50, mkts.double_chance?.away_2x_prob || 50)}%
                          </span>
                        </div>
                      </div>

                      {/* 2. Over/Under Goals */}
                      <div className="prediction-widget-row" style={{ opacity: activeTab === 'OVER_UNDER' ? 1 : 0.65 }}>
                        <span className="prediction-label">
                          <Award size={14} style={{ color: 'var(--accent-cyan)' }} /> Over / Under 2.5
                        </span>
                        <div className="prediction-value-col">
                          {ouRec && (
                            <span className={`recommendation-badge ${ouRec === 'OVER_25' ? 'over' : 'under'}`}>
                              {ouRec === 'OVER_25' ? 'OVER 2.5' : 'UNDER 2.5'}
                            </span>
                          )}
                          <div className="mini-progress-bar-bg">
                            <div 
                              className={`mini-progress-bar-fill ${ouRec === 'OVER_25' ? 'over' : 'under'}`}
                              style={{ width: `${Math.max(mkts.over_under?.over_25_prob || 50, mkts.over_under?.under_25_prob || 50)}%` }}
                            ></div>
                          </div>
                          <span className="probability-percentage-text" style={{ color: 'var(--accent-cyan)' }}>
                            {Math.max(mkts.over_under?.over_25_prob || 50, mkts.over_under?.under_25_prob || 50)}%
                          </span>
                        </div>
                      </div>

                      {/* 3. Both Teams to Score */}
                      <div className="prediction-widget-row" style={{ opacity: activeTab === 'BTTS' ? 1 : 0.65 }}>
                        <span className="prediction-label">
                          <Activity size={14} style={{ color: 'var(--accent-orange)' }} /> BTTS
                        </span>
                        <div className="prediction-value-col">
                          {bttsRec && <span className="recommendation-badge btts">BTTS YES</span>}
                          <div className="mini-progress-bar-bg">
                            <div 
                              className="mini-progress-bar-fill btts" 
                              style={{ width: `${mkts.btts?.prob || 50}%` }}
                            ></div>
                          </div>
                          <span className="probability-percentage-text" style={{ color: 'var(--accent-orange)' }}>
                            {mkts.btts?.prob || 50}%
                          </span>
                        </div>
                      </div>

                      {/* 4. Straight Winning Streaks */}
                      <div className="prediction-widget-row" style={{ opacity: activeTab === 'STREAKS' ? 1 : 0.65 }}>
                        <span className="prediction-label">
                          <Flame size={14} style={{ color: 'var(--accent-rose)' }} /> Winning Streaks
                        </span>
                        <div className="prediction-value-col">
                          {streakRec && (
                            <span className="recommendation-badge streak" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Flame size={10} fill="currentColor" /> 
                              {streakRec === 'HOME_STREAK' ? `${mkts.streaks?.home_streak} W-STREAK` : `${mkts.streaks?.away_streak} W-STREAK`}
                            </span>
                          )}
                          <div className="mini-progress-bar-bg">
                            <div 
                              className="mini-progress-bar-fill streak" 
                              style={{ width: `${Math.max(mkts.streaks?.home_streak || 0, mkts.streaks?.away_streak || 0) * 20}%` }}
                            ></div>
                          </div>
                          <span className="probability-percentage-text" style={{ color: 'var(--accent-rose)' }}>
                            {Math.max(mkts.streaks?.home_streak || 0, mkts.streaks?.away_streak || 0)}W
                          </span>
                        </div>
                      </div>

                      {/* 5. Draw Value Picks */}
                      <div className="prediction-widget-row" style={{ opacity: activeTab === 'DRAWS' ? 1 : 0.65 }}>
                        <span className="prediction-label">
                          <Zap size={14} style={{ color: 'var(--accent-gold)' }} /> Draw Value (+EV)
                        </span>
                        <div className="prediction-value-col">
                          {drawRec && (
                            <span className="recommendation-badge draw" title={`Expected Value Yield: ${mkts.draw_value?.ev}`}>
                              {mkts.draw_value?.ev} EV
                            </span>
                          )}
                          <div className="mini-progress-bar-bg">
                            <div 
                              className="mini-progress-bar-fill draw" 
                              style={{ width: `${mkts.draw_value?.prob || 25}%` }}
                            ></div>
                          </div>
                          <span className="probability-percentage-text" style={{ color: 'var(--accent-gold)' }}>
                            {mkts.draw_value?.prob || 25}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="card-analytics-footer">
                      {/* Primary market highlight display */}
                      <div className="primary-market-info-chip">
                        {activeTab === 'DOUBLE_CHANCE' && (
                          <span>🏡 1X: {mkts.double_chance?.home_1x_prob}% | ✈️ 2X: {mkts.double_chance?.away_2x_prob}%</span>
                        )}
                        {activeTab === 'OVER_UNDER' && (
                          <span>Predicted Goals Bias: {roundGoalsBias(mkts.over_under?.avg_goals_home, mkts.over_under?.avg_goals_away)} goals</span>
                        )}
                        {activeTab === 'BTTS' && (
                          <span>Goal scoring chance: {mkts.btts?.prob}%</span>
                        )}
                        {activeTab === 'STREAKS' && (
                          <span>Active Streaks: Home {mkts.streaks?.home_streak}W | Away {mkts.streaks?.away_streak}W</span>
                        )}
                        {activeTab === 'DRAWS' && (
                          <span>Draw Odds (X): {match.odds?.X || 'N/A'} (Expected Value: {mkts.draw_value?.ev || '0.00'})</span>
                        )}
                        {(activeTab === 'ALL' || activeTab === 'FAVORITES') && (
                          <span>Marked draws count: {match.marked_count} out of {match.total_history_count} H2H</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                          onClick={(e) => toggleFavorite(e, idx)}
                          style={{ background: 'transparent', border: 'none', color: isFavorite ? 'var(--accent-gold)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                          title={isFavorite ? "Remove bookmark" : "Bookmark match"}
                        >
                          {isFavorite ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                        </button>

                        <span className="history-toggle-hint">
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </div>

                    {/* SQLite collapsible H2H records inspect list */}
                    <div className="history-collapsible">
                      <div className="history-inner" onClick={(e) => e.stopPropagation()}>
                        <div className="history-header-row">
                          <span>SQLite Persisted H2H Matches ({match.history.length})</span>
                          <span>Date</span>
                        </div>
                        <div className="history-list">
                          {match.history && match.history.length > 0 ? (
                            match.history.map((hist, hIdx) => {
                              return (
                                <div 
                                  key={hIdx}
                                  className={`history-row ${hist.is_marked ? 'is-draw' : ''}`}
                                >
                                  <span className="history-fixture">{hist.detail}</span>
                                  <span className="history-date">
                                    {hist.is_marked && <span style={{ color: 'var(--accent-gold)', marginRight: '6px', fontSize: '0.62rem', fontWeight: 800 }}>[DRAW]</span>}
                                    {hist.date}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '10px 0', textAlign: 'center' }}>
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
            <div className="empty-state">
              <AlertTriangle size={48} style={{ color: 'var(--text-muted)' }} />
              <div className="empty-title">No Matches Isolated</div>
              <div className="empty-desc">
                No fixtures matched your selected filters or the active market probability indicators. Try searching another team or changing tabs.
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer Section */}
      <footer className="app-footer">
        <div className="footer-text">
          Multi-Sports Analytics Engine Dashboard • SQLite v3 Relational Persistence • Active Today
        </div>
        <div className="footer-text" style={{ fontSize: '0.75rem', opacity: 0.6 }}>
          Designed with ❤️ utilizing Vite React and curating obsidian aesthetics. Sports predictions are calculations, not absolute guarantees.
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
  if (g1 === undefined || g2 === undefined) return '0.00';
  return (parseFloat(g1) + parseFloat(g2)).toFixed(2);
}

export default App;
