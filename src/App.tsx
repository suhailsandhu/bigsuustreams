import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { Stream } from './types/stream.ts';
import type { ScoreboardGame, ScoreboardResponse } from './types/scoreboard.ts';
import { fetchScoreboard, fetchNflScoreboard, fetchStreamDetails } from './services/api.ts';
import { getTodayDateString } from './utils/date.ts';
import { Header } from './components/Header.tsx';
import { DateNavigation } from './components/DateNavigation.tsx';
import { GameRow } from './components/GameRow.tsx';
import { BoxScoreModal } from './components/BoxScoreModal.tsx';
import { GameView } from './components/GameView.tsx';
import { Footer } from './components/Footer.tsx';
import { PwaInstallModal } from './components/PwaInstallModal.tsx';
import { AdminStatsModal } from './components/AdminStatsModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { LegalModal } from './components/LegalModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { trackPageView, updateCurrentStream } from './utils/analyticsClient.ts';
import { findTeamByQuery } from './data/nbaTeams.ts';
import { isSmartTv } from './utils/tvDetector.ts';
import { AlertCircle, RefreshCw, Trophy } from 'lucide-react';

export const App: React.FC = () => {
  // Current sport state ('nba' | 'nfl')
  const [currentSport, setCurrentSport] = useState<'nba' | 'nfl'>('nba');

  // iOS-style Account Authentication state (auto-bypassed with VIP Guest pass on Smart TVs)
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('bigsuu_auth_user');
      const token = localStorage.getItem('bigsuu_auth_token') || sessionStorage.getItem('bigsuu_auth_token');
      if (token && stored) {
        return JSON.parse(stored);
      }
      // Smart TV living room optimization: grant automatic VIP pass
      if (typeof window !== 'undefined' && isSmartTv()) {
        const tvUser = {
          id: 'vip_7777',
          username: 'smart_tv_viewer',
          displayName: 'Smart TV VIP',
          email: 'tv@bigsuustreams.com',
          role: 'vip',
          isVip: true,
          membership: 'vip'
        };
        try {
          localStorage.setItem('bigsuu_auth_user', JSON.stringify(tvUser));
          localStorage.setItem('bigsuu_auth_token', 'token_7777');
        } catch {}
        return tvUser;
      }
      return null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('bigsuu_auth_token');
    localStorage.removeItem('bigsuu_auth_user');
    sessionStorage.removeItem('bigsuu_auth_token');
    setCurrentUser(null);
  };

  // Self-healing account sync: ensures registered member accounts are persisted permanently on server
  useEffect(() => {
    if (currentUser && (currentUser.username || currentUser.email)) {
      fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser })
      }).catch(() => {});
    }
  }, [currentUser]);

  // Legal modal state
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<'dmca' | 'disclaimer' | 'terms' | 'privacy'>('dmca');

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [scoreboard, setScoreboard] = useState<ScoreboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [selectedGame, setSelectedGame] = useState<ScoreboardGame | null>(null);
  const [boxScoreGame, setBoxScoreGame] = useState<ScoreboardGame | null>(null);

  // Admin & PWA modal states
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // VIP Member Profile modal & custom settings reactivity
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [settingsTick, setSettingsTick] = useState(0);

  // Anti-reverse-engineering & client-side security guards
  useEffect(() => {
    // 1. Disable context menu (right-click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Block inspection hotkeys (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) ||
        (e.metaKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S'))
      ) {
        e.preventDefault();
        return false;
      }
    };

    // 3. Silence console outputs in production to prevent data leakage
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
      const noop = () => {};
      console.log = noop;
      console.debug = noop;
      console.info = noop;
      console.warn = noop;
    }

    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Initialize analytics visitor tracking
  useEffect(() => {
    trackPageView();
  }, []);

  // Update telemetry when switching streams
  useEffect(() => {
    if (selectedStream) {
      updateCurrentStream(selectedStream.stream_key, selectedGame?.name || selectedStream.name);
    } else {
      updateCurrentStream(undefined, undefined);
    }
  }, [selectedStream, selectedGame]);

  // Detect standalone mode
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Games list preserved strictly in normal chronological schedule order
  const allGames = useMemo(() => {
    const targetLeague = currentSport === 'nfl' ? 'NFL' : 'NBA';
    return (scoreboard?.games || []).filter((g) => g.league === targetLeague);
  }, [scoreboard, currentSport]);

  // Periodic tick every 30s to keep countdown active checks fresh
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClockTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Countdown active: triggers 1 hour before the earliest game of the day, or anytime games are underway
  const isCountdownActive = useMemo(() => {
    if (!allGames.length) return false;
    const hasStartedAny = allGames.some((g) => g.status?.isLive || g.status?.state === 'post');
    if (hasStartedAny) return true;

    let earliest = Infinity;
    for (const g of allGames) {
      if (g.date) {
        const t = new Date(g.date).getTime();
        if (!isNaN(t) && t < earliest) {
          earliest = t;
        }
      }
    }
    if (earliest === Infinity) return false;
    return Date.now() >= (earliest - 60 * 60 * 1000);
  }, [allGames, clockTick]);

  // Active favorite team for subtle card highlighting
  const favoriteTeam = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const favKey = localStorage.getItem('bss_favorite_team') || '';
    return findTeamByQuery(favKey) || null;
  }, [settingsTick]);

  const handleWatchHighlights = useCallback(async (game: ScoreboardGame) => {
    setSelectedGame(game);
    setIsLoading(true);
    try {
      const awayName = game.awayTeam?.name || game.awayTeam?.displayName || '';
      const homeName = game.homeTeam?.name || game.homeTeam?.displayName || '';
      const isNfl = game.league === 'NFL';
      const endpoint = isNfl ? '/api/football/highlights' : '/api/basketball/highlights';
      const res = await fetch(
        `${endpoint}?away=${encodeURIComponent(awayName)}&home=${encodeURIComponent(homeName)}&date=${encodeURIComponent(game.date)}`
      );
      if (res.ok) {
        const data = await res.json();
        const highlightStream: Stream = {
          id: `highlight-${game.id}`,
          name: `${awayName} at ${homeName} — Official ${isNfl ? 'NFL' : 'NBA'} Highlights`,
          category: isNfl ? 'football' : 'basketball',
          league: isNfl ? 'NFL' : 'NBA',
          stream_key: `highlight-${game.id}`,
          match_timestamp: Math.floor(new Date(game.date).getTime() / 1000),
          viewers: 0,
          is_external: false,
          thumbnail_url: '',
          sources: [],
          live_sources: [],
          team1: { name: awayName, logo: game.awayTeam?.logo || '' },
          team2: { name: homeName, logo: game.homeTeam?.logo || '' },
          is_live: false,
          status: 'ended',
          youtubeVideoId: data.videoId,
          is_highlight: true
        };
        setSelectedStream(highlightStream);
        window.location.hash = `#/game/highlight-${game.id}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setBoxScoreGame(game);
      }
    } catch {
      setBoxScoreGame(game);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const allGamesRef = useRef(allGames);
  allGamesRef.current = allGames;
  const selectedStreamRef = useRef(selectedStream);
  selectedStreamRef.current = selectedStream;

  // Direct admin routing via URL /admin or hash #/admin
  const checkAdminRoute = useCallback(() => {
    const p = window.location.pathname;
    const h = window.location.hash;
    if (p === '/admin' || p === '/stats' || h === '#/admin' || h === '#admin' || h === '#/stats' || h === '#stats') {
      setShowStatsModal(true);
      return true;
    }
    return false;
  }, []);

  // Hash-based routing for direct links and admin
  const handleHashChange = useCallback(async () => {
    if (checkAdminRoute()) return;

    const hash = window.location.hash;
    if (hash.startsWith('#/game/')) {
      const key = hash.replace('#/game/', '');
      if (key.startsWith('highlight-')) {
        const gameId = key.replace('highlight-', '');
        const matched = allGamesRef.current.find((g: ScoreboardGame) => g.id === gameId);
        if (matched) {
          handleWatchHighlights(matched);
          return;
        }
      }

      // If already playing this stream, do not re-fetch or re-mount video player!
      if (selectedStreamRef.current && (selectedStreamRef.current.stream_key === key || selectedStreamRef.current.id === key)) {
        return;
      }

      try {
        const fetched = await fetchStreamDetails(key);
        setSelectedStream(fetched);
        const matched = allGamesRef.current.find((g: ScoreboardGame) => g.stream?.streamKey === key);
        if (matched) setSelectedGame(matched);
      } catch (e) {
        console.warn('Game in hash not found:', e);
      }
    } else {
      setSelectedStream(null);
      setSelectedGame(null);
    }
  }, [handleWatchHighlights, checkAdminRoute]);

  useEffect(() => {
    checkAdminRoute();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', checkAdminRoute);
    // Check initial hash
    handleHashChange();
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', checkAdminRoute);
    };
  }, [handleHashChange, checkAdminRoute]);

  // Synchronize selectedGame whenever scoreboard or stream changes
  useEffect(() => {
    if (selectedStream && allGames.length > 0) {
      const matched = allGames.find(g => 
        g.stream?.streamKey === selectedStream.stream_key ||
        (g.awayTeam?.name && selectedStream.stream_key.includes(g.awayTeam.name.toLowerCase())) ||
        (g.awayTeam?.name && selectedStream.name.toLowerCase().includes(g.awayTeam.name.toLowerCase()))
      );
      if (matched) {
        setSelectedGame(matched);
      }
    }
  }, [selectedStream, allGames]);

  // Load scoreboard data for selectedDate with silent background auto-refresh
  const loadScoreboardData = useCallback(async (dateStr: string, silent = false, sport: 'nba' | 'nfl' = currentSport) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = sport === 'nfl'
        ? await fetchNflScoreboard(dateStr)
        : await fetchScoreboard(dateStr);
      setScoreboard(data);
    } catch (err: any) {
      console.error(`Failed to load ${sport} scoreboard:`, err);
      if (!silent) {
        setError(`Unable to load live ${sport.toUpperCase()} scoreboard data. Please check your network connection.`);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [currentSport]);

  useEffect(() => {
    loadScoreboardData(selectedDate, false, currentSport);

    // Auto-refresh every 15 seconds silently for live scores and stream updates
    const interval = setInterval(() => {
      loadScoreboardData(selectedDate, true, currentSport);
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedDate, currentSport, loadScoreboardData]);

  const handleSelectDate = (newDateStr: string) => {
    setSelectedDate(newDateStr);
    loadScoreboardData(newDateStr);
  };

  const handleWatchGame = async (game: ScoreboardGame) => {
    setSelectedGame(game);
    if (game.stream?.streamData) {
      setSelectedStream(game.stream.streamData);
      window.location.hash = `#/game/${game.stream.streamKey}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (game.stream?.streamKey) {
      try {
        const fetched = await fetchStreamDetails(game.stream.streamKey);
        setSelectedStream(fetched);
        window.location.hash = `#/game/${game.stream.streamKey}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.warn('Stream fetch error, creating fallback stream:', err);
        const awayName = game.awayTeam?.displayName || game.awayTeam?.name || 'Away';
        const homeName = game.homeTeam?.displayName || game.homeTeam?.name || 'Home';
        const isNfl = game.league === 'NFL';
        const fallbackStream: Stream = {
          id: game.stream.streamKey,
          name: `${awayName} at ${homeName}`,
          category: isNfl ? 'football' : 'basketball',
          league: isNfl ? 'NFL' : 'NBA',
          stream_key: game.stream.streamKey,
          match_timestamp: Math.floor(new Date(game.date).getTime() / 1000) || Math.floor(Date.now() / 1000),
          viewers: 0,
          is_external: false,
          thumbnail_url: '',
          sources: [
            { quality: '1080p', url: '' },
            { quality: '720p', url: '' }
          ],
          live_sources: [
            { quality: '1080p', url: '' },
            { quality: '720p', url: '' }
          ],
          team1: { name: awayName, logo: game.awayTeam?.logo || '' },
          team2: { name: homeName, logo: game.homeTeam?.logo || '' },
          is_live: Boolean(game.status?.isLive),
          status: game.status?.isLive ? 'live' : 'upcoming'
        };
        setSelectedStream(fallbackStream);
        window.location.hash = `#/game/${game.stream.streamKey}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      const awayName = game.awayTeam?.displayName || game.awayTeam?.name || 'Away';
      const homeName = game.homeTeam?.displayName || game.homeTeam?.name || 'Home';
      const isNfl = game.league === 'NFL';
      const streamKey = `${awayName.toLowerCase().replace(/[^a-z0-9]/g, '')}-vs-${homeName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const fallbackStream: Stream = {
        id: streamKey,
        name: `${awayName} at ${homeName}`,
        category: isNfl ? 'football' : 'basketball',
        league: isNfl ? 'NFL' : 'NBA',
        stream_key: streamKey,
        match_timestamp: Math.floor(new Date(game.date).getTime() / 1000) || Math.floor(Date.now() / 1000),
        viewers: 0,
        is_external: false,
        thumbnail_url: '',
        sources: [
          { quality: '1080p', url: '' },
          { quality: '720p', url: '' }
        ],
        live_sources: [
          { quality: '1080p', url: '' },
          { quality: '720p', url: '' }
        ],
        team1: { name: awayName, logo: game.awayTeam?.logo || '' },
        team2: { name: homeName, logo: game.homeTeam?.logo || '' },
        is_live: Boolean(game.status?.isLive),
        status: game.status?.isLive ? 'live' : 'upcoming'
      };
      setSelectedStream(fallbackStream);
      window.location.hash = `#/game/${streamKey}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToHome = () => {
    setSelectedStream(null);
    setSelectedGame(null);
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Direct admin routing via /admin or #/admin
  const isAdminPath = typeof window !== 'undefined' && (
    window.location.pathname === '/admin' || 
    window.location.pathname === '/stats' || 
    window.location.hash === '#/admin' || 
    window.location.hash === '#admin'
  );

  if (showStatsModal || isAdminPath) {
    return (
      <AdminStatsModal
        isOpen={true}
        onClose={() => {
          setShowStatsModal(false);
          if (window.location.pathname === '/admin' || window.location.pathname === '/stats') {
            window.history.pushState({}, '', '/');
          } else {
            window.location.hash = '';
          }
        }}
      />
    );
  }

  // Render iOS-Style Account Auth Modal if user has not yet signed in or created an account
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-between items-center p-4 select-none">
        <AuthModal
          isOpen={true}
          currentSport={currentSport}
          onSuccess={(user) => setCurrentUser(user)}
          onOpenLegal={(tab) => {
            setLegalTab(tab || 'dmca');
            setShowLegalModal(true);
          }}
        />
        <LegalModal
          isOpen={showLegalModal}
          initialTab={legalTab}
          onClose={() => setShowLegalModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col text-gray-900 selection:bg-orange-500/20 selection:text-orange-900">
      {/* Top White Header with Sport Logo and Switcher */}
      <Header
        onNavigateHome={handleBackToHome}
        currentSport={currentSport}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setShowProfileModal(true)}
        onToggleSport={() => {
          setSelectedStream(null);
          setSelectedGame(null);
          setCurrentSport((prev) => (prev === 'nba' ? 'nfl' : 'nba'));
        }}
      />

      <main className="flex-1 w-full mx-auto px-2.5 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-6">
        {/* If a game stream or highlight is currently active, render the GameView */}
        {selectedStream ? (
          <GameView
            stream={selectedStream}
            game={selectedGame}
            onBack={handleBackToHome}
          />
        ) : (
          <div className="max-w-4xl mx-auto space-y-2 sm:space-y-2.5">
            {/* NBA-Style Interactive Date Navigation Carousel (Thinner & Pushed to Top) */}
            <DateNavigation
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />

            {/* Loading Skeleton */}
            {isLoading && (
              <div className="space-y-2 sm:space-y-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-white border border-gray-200 animate-pulse shadow-xs" />
                ))}
              </div>
            )}

            {/* Error Notice */}
            {error && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center my-6">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <h3 className="text-base font-bold text-gray-900 mb-1">Scoreboard Notice</h3>
                <p className="text-xs text-gray-600 max-w-md mx-auto mb-4">{error}</p>
                <button
                  onClick={() => loadScoreboardData(selectedDate)}
                  className="inline-flex items-center space-x-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Retry Loading
                </button>
              </div>
            )}

            {/* Games List (Scoreboard & Live Feeds & Highlights) */}
            {!isLoading && !error && (
              <div className="space-y-2 sm:space-y-2.5">
                {allGames.length > 0 ? (
                  allGames.map((game) => (
                    <GameRow
                      key={game.id}
                      game={game}
                      favoriteTeam={favoriteTeam}
                      isCountdownActive={isCountdownActive}
                      onWatchGame={handleWatchGame}
                      onWatchHighlights={handleWatchHighlights}
                      onOpenBoxScore={(g) => setBoxScoreGame(g)}
                    />
                  ))
                ) : (
                  <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-xs">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      No {currentSport.toUpperCase()} Games Scheduled
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                      There are no {currentSport.toUpperCase()} games scheduled for this date. Use the date bar above to check games for other days.
                    </p>
                    <button
                      onClick={() => handleSelectDate(getTodayDateString())}
                      className="bg-black hover:bg-neutral-800 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                    >
                      Go to Today
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Centered Clean Footer with Legal Links */}
      <Footer
        onOpenLegal={(tab) => {
          setLegalTab(tab || 'dmca');
          setShowLegalModal(true);
        }}
      />

      {/* Legal Shield Modal (DMCA, Trademark Non-Affiliation, Terms & Privacy) */}
      <LegalModal
        isOpen={showLegalModal}
        initialTab={legalTab}
        onClose={() => setShowLegalModal(false)}
      />

      {/* Interactive Box Score Modal */}
      <BoxScoreModal
        game={boxScoreGame}
        onClose={() => setBoxScoreGame(null)}
        onWatchGame={handleWatchGame}
      />

      {/* Live Admin Analytics & Activity Telemetry Modal (Accessible ONLY via /admin directly) */}
      <AdminStatsModal
        isOpen={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          if (window.location.pathname === '/admin' || window.location.pathname === '/stats') {
            window.history.pushState(null, '', '/');
          }
          if (window.location.hash.includes('stats') || window.location.hash.includes('admin')) {
            window.location.hash = '';
          }
        }}
      />

      {/* VIP Member Profile & Settings Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSettingsChange={() => setSettingsTick((t) => t + 1)}
      />

      {/* PWA Install Guide Modal */}
      <PwaInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => {
          setShowInstallModal(false);
        }}
      />
    </div>
  );
};

export default App;
