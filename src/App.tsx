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
import { ReportProblemButton } from './components/ReportProblemButton.tsx';
import { UpdatingScreen } from './components/UpdatingScreen.tsx';
import { trackPageView, updateCurrentStream } from './utils/analyticsClient.ts';
import { findTeamByQuery } from './data/nbaTeams.ts';
import { isSmartTv } from './utils/tvDetector.ts';
import { AlertCircle, RefreshCw, Trophy, Tv } from 'lucide-react';

export const App: React.FC = () => {
  // Current sport state ('nba' | 'nfl') initialized from user's saved default sport setting
  const [currentSport, setCurrentSport] = useState<'nba' | 'nfl'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bss_default_sport');
      if (saved === 'nba' || saved === 'nfl') return saved;
    }
    return 'nba';
  });

  // iOS-style Account Authentication state (auto-kick all 7777 VIP passes immediately)
  // On Smart TVs: Auto-authenticate as TV Guest so the TV viewer directly sees live games without needing mouse/keyboard sign-in
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const isTv = isSmartTv();
      if (isTv) {
        return {
          id: 'user_smart_tv',
          username: 'Smart TV',
          displayName: 'TV Viewer',
          email: 'tv@bigsuustreams.com',
          role: 'member',
          isVip: false,
          membership: 'basic'
        };
      }
      const stored = localStorage.getItem('bigsuu_auth_user');
      const token = localStorage.getItem('bigsuu_auth_token') || sessionStorage.getItem('bigsuu_auth_token');
      
      // PURGE: Kick off all revoked 7777 VIP passes and old 7777 guest sessions
      if (
        !token ||
        token.includes('7777') || 
        token.includes('verified_7777') || 
        stored?.includes('7777') || 
        stored?.includes('vip_7777')
      ) {
        localStorage.removeItem('bigsuu_auth_token');
        localStorage.removeItem('bigsuu_auth_user');
        sessionStorage.removeItem('bigsuu_auth_token');
        localStorage.removeItem('bigsuu_site_token');
        sessionStorage.removeItem('bigsuu_site_token');
        sessionStorage.removeItem('bigsuu_admin_authorized');
        sessionStorage.removeItem('bigsuu_admin_pin');
        return null;
      }

      if (token && stored) {
        const u = JSON.parse(stored);
        if (u.id === 'vip_7777') {
          return null;
        }
        // Enforcement: sandhu.suhail@gmail.com is the ONLY VIP account
        const isSuhail = u?.email?.toLowerCase() === 'sandhu.suhail@gmail.com' || u?.username?.toLowerCase() === 'sandhu.suhail@gmail.com';
        if (isSuhail) {
          u.role = 'vip';
          u.isVip = true;
          u.membership = 'vip';
          if (!u.displayName || u.displayName === 'VIP Member') {
            u.displayName = 'Suhail Sandhu';
          }
        } else {
          u.role = 'member';
          u.isVip = false;
          u.membership = 'basic';
        }
        return u;
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
    localStorage.removeItem('bigsuu_site_token');
    sessionStorage.removeItem('bigsuu_site_token');
    sessionStorage.removeItem('bigsuu_admin_authorized');
    sessionStorage.removeItem('bigsuu_admin_pin');
    setCurrentUser(null);
  };

  // Active Purge: Immediately kick off anyone with old passes, previous admin sessions, or 7777 credentials
  useEffect(() => {
    try {
      if (localStorage.getItem('bss_kick_epoch_v4') !== '7865_purged') {
        sessionStorage.removeItem('bigsuu_admin_authorized');
        sessionStorage.removeItem('bigsuu_admin_pin');
        localStorage.removeItem('bigsuu_admin_authorized');
        localStorage.removeItem('bigsuu_admin_pin');
        localStorage.removeItem('bigsuu_admin_bypass');
        localStorage.setItem('bss_kick_epoch_v4', '7865_purged');
      }
    } catch {}

    const token = localStorage.getItem('bigsuu_auth_token') || sessionStorage.getItem('bigsuu_auth_token');
    const stored = localStorage.getItem('bigsuu_auth_user');
    if (
      token?.includes('7777') || 
      token?.includes('verified_7777') || 
      stored?.includes('7777') || 
      stored?.includes('vip_7777')
    ) {
      handleLogout();
    }
    // Initialize user's preferred theme mode (Light / Dark / System)
    try {
      const theme = localStorage.getItem('bss_theme_mode') || 'light';
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#0b0f19';
        document.body.style.color = '#f8fafc';
      } else {
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#0f172a';
      }
    } catch {}
  }, []);

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
  const [showReportModal, setShowReportModal] = useState(false);
  const [settingsTick, setSettingsTick] = useState(0);

  // Dynamic Theme & Density reactivity on settings change
  useEffect(() => {
    try {
      const theme = localStorage.getItem('bss_theme_mode') || 'light';
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#0b0f19';
        document.body.style.color = '#f8fafc';
      } else {
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#0f172a';
      }

      // Sync default sport if changed
      const savedSport = localStorage.getItem('bss_default_sport');
      if (savedSport === 'nba' || savedSport === 'nfl') {
        setCurrentSport(savedSport as 'nba' | 'nfl');
      }
    } catch {}
  }, [settingsTick]);

  const layoutDensity = useMemo(() => {
    if (typeof window === 'undefined') return 'comfortable';
    return localStorage.getItem('bss_layout_density') || 'comfortable';
  }, [settingsTick]);

  // Website is Updating / Maintenance State
  const [isSiteUpdating, setIsSiteUpdating] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/updating')) {
      return true;
    }
    return false;
  });

  // Automated Site Update / Maintenance Heartbeat
  useEffect(() => {
    let failureCount = 0;

    const checkSystemStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch('/api/system-status', {
          cache: 'no-store',
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data?.updating === true) {
            setIsSiteUpdating(true);
            failureCount = 0;
          } else if (isSiteUpdating && data?.updating === false) {
            window.location.reload();
          } else {
            failureCount = 0;
          }
        } else if (res.status === 502 || res.status === 503) {
          setIsSiteUpdating(true);
        }
      } catch {
        // If consecutive network pings fail while site is live, server is restarting
        failureCount++;
        if (failureCount >= 2) {
          setIsSiteUpdating(true);
        }
      }
    };

    const handleCheckTrigger = () => checkSystemStatus();
    window.addEventListener('bss_check_status', handleCheckTrigger);

    const interval = setInterval(checkSystemStatus, 3000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('bss_check_status', handleCheckTrigger);
    };
  }, [isSiteUpdating]);

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

  // State for direct /quickaccess route
  const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(false);

  // Direct special routing via URL /admin or /quickaccess
  const checkSpecialRoutes = useCallback(() => {
    const p = (window.location.pathname || '').toLowerCase();
    const h = (window.location.hash || '').toLowerCase();
    if (p === '/admin' || p === '/stats' || h === '#/admin' || h === '#admin' || h === '#/stats' || h === '#stats') {
      setShowStatsModal(true);
      return true;
    }
    if (p === '/quickaccess' || p === '/quick-access' || h === '#/quickaccess' || h === '#quickaccess') {
      setIsQuickAccessOpen(true);
      return true;
    }
    return false;
  }, []);

  // Hash-based routing for direct links and admin
  const handleHashChange = useCallback(async () => {
    if (checkSpecialRoutes()) return;

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
  }, [handleWatchHighlights, checkSpecialRoutes]);

  useEffect(() => {
    checkSpecialRoutes();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', checkSpecialRoutes);
    // Check initial hash
    handleHashChange();
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', checkSpecialRoutes);
    };
  }, [handleHashChange, checkSpecialRoutes]);

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

  // Cross-sport live games so NBA & NFL live streams are suggested together
  const [crossSportLiveGames, setCrossSportLiveGames] = useState<ScoreboardGame[]>([]);

  // Fetch the OTHER sport's live games so users can see all live NBA and NFL games in the quick-switcher
  useEffect(() => {
    let isCancelled = false;
    const fetchCrossSport = async () => {
      try {
        const todayStr = getTodayDateString();
        const otherData = currentSport === 'nfl'
          ? await fetchScoreboard(todayStr)
          : await fetchNflScoreboard(todayStr);
        if (!isCancelled && otherData?.games) {
          const liveOnly = otherData.games.filter((g) => Boolean(g.status?.isLive));
          setCrossSportLiveGames(liveOnly);
        }
      } catch {
        // non-blocking
      }
    };

    fetchCrossSport();
    const interval = setInterval(fetchCrossSport, 20000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [currentSport]);

  // Combined games for Other Live Games switcher
  const combinedLiveGames = useMemo(() => {
    const map = new Map<string, ScoreboardGame>();
    allGames.forEach((g) => map.set(g.id, g));
    crossSportLiveGames.forEach((g) => {
      if (!map.has(g.id)) map.set(g.id, g);
    });
    return Array.from(map.values());
  }, [allGames, crossSportLiveGames]);

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

  // Step forward or backward in dates (for iPhone swipe gesture)
  const handleStepDate = useCallback((deltaDays: number) => {
    if (!selectedDate || selectedDate.length !== 8) return;
    const y = parseInt(selectedDate.slice(0, 4), 10);
    const m = parseInt(selectedDate.slice(4, 6), 10) - 1;
    const d = parseInt(selectedDate.slice(6, 8), 10);
    const dt = new Date(y, m, d);
    dt.setDate(dt.getDate() + deltaDays);
    const nextY = dt.getFullYear();
    const nextM = String(dt.getMonth() + 1).padStart(2, '0');
    const nextD = String(dt.getDate()).padStart(2, '0');
    const newDateStr = `${nextY}${nextM}${nextD}`;
    handleSelectDate(newDateStr);
  }, [selectedDate, handleSelectDate]);

  // Touch Swipe Gesture Handlers on Games Section for iPhone
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleGamesTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleGamesTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Detect horizontal swipe if deltaX > 40px and predominantly horizontal (avoids interfering with vertical scroll)
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        // Swiped Left (finger dragged left) -> Advance to Next Day
        handleStepDate(1);
      } else {
        // Swiped Right (finger dragged right) -> Go back to Previous Day
        handleStepDate(-1);
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleWatchGame = async (game: ScoreboardGame) => {
    setSelectedGame(game);
    const isNflGame = game.league === 'NFL' || (game as any).sport === 'nfl';
    setCurrentSport(isNflGame ? 'nfl' : 'nba');
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

  const isTv = useMemo(() => isSmartTv(), []);
  const [tvGameIndex, setTvGameIndex] = useState(0);

  // TV D-Pad Spatial Navigation Controller for Home Scoreboard Grid (Samsung Smart TV)
  useEffect(() => {
    if (!isTv || selectedStream) return;

    const handleHomeTvKeys = (e: KeyboardEvent) => {
      const code = e.keyCode;

      // Arrow Down: move to next game
      if (code === 40) {
        setTvGameIndex((prev) => {
          const next = Math.min(allGames.length - 1, prev + 1);
          const el = document.getElementById(`tv-game-row-${next}`);
          el?.focus();
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return next;
        });
        e.preventDefault();
      }
      // Arrow Up: move to previous game
      else if (code === 38) {
        setTvGameIndex((prev) => {
          const next = Math.max(0, prev - 1);
          const el = document.getElementById(`tv-game-row-${next}`);
          el?.focus();
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return next;
        });
        e.preventDefault();
      }
      // Arrow Left / Right: quick toggle between NBA and NFL
      else if (code === 37 || code === 39) {
        setCurrentSport((prev) => (prev === 'nba' ? 'nfl' : 'nba'));
        setTvGameIndex(0);
        e.preventDefault();
      }
      // Enter / OK on remote: Play the focused game immediately!
      else if (code === 13) {
        if (allGames[tvGameIndex]) {
          handleWatchGame(allGames[tvGameIndex]);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleHomeTvKeys);
    return () => window.removeEventListener('keydown', handleHomeTvKeys);
  }, [isTv, selectedStream, allGames, tvGameIndex, handleWatchGame]);

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
          initialPasscodeMode={isQuickAccessOpen}
          onSuccess={(user) => {
            setCurrentUser(user);
            setIsQuickAccessOpen(false);
            if (window.location.pathname.includes('quickaccess')) {
              window.history.pushState(null, '', '/');
            }
          }}
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
    <div 
      style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}
      className="min-h-screen flex flex-col bg-[#f8f9fa] text-gray-900 selection:bg-orange-500/20 selection:text-orange-900"
    >
      {/* Top Header with Sport Logo and Switcher */}
      <Header
        onNavigateHome={handleBackToHome}
        currentSport={currentSport}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenAuth={() => setIsQuickAccessOpen(true)}
        onOpenReport={() => setShowReportModal(true)}
        onToggleSport={() => {
          setSelectedStream(null);
          setSelectedGame(null);
          setCurrentSport((prev) => (prev === 'nba' ? 'nfl' : 'nba'));
        }}
      />

      <main 
        style={{ width: '100%', maxWidth: isTv ? '1024px' : '1400px', margin: '0 auto', flex: '1 1 auto' }}
        className="flex-1 w-full mx-auto px-2.5 sm:px-4 lg:px-6 pt-2 sm:pt-3 pb-6 max-w-7xl"
      >
        {/* If a game stream or highlight is currently active, render the GameView */}
        {selectedStream ? (
          <GameView
            stream={selectedStream}
            game={selectedGame}
            allGames={combinedLiveGames}
            onBack={handleBackToHome}
            onSelectGame={handleWatchGame}
          />
        ) : (
          <div 
            onTouchStart={handleGamesTouchStart}
            onTouchEnd={handleGamesTouchEnd}
            style={{ maxWidth: isTv ? '896px' : '1400px', margin: '0 auto', width: '100%' }}
            className={`mx-auto space-y-2 sm:space-y-2.5 ${isTv ? 'max-w-4xl' : 'max-w-7xl'}`}
          >
            {/* Smart TV Remote Navigation Helper Banner */}
            {isTv && (
              <div className="bg-neutral-900 border border-orange-500/40 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-2 text-xs font-bold text-white">
                  <Tv className="w-4 h-4 text-orange-500" />
                  <span>Samsung TV Remote Mode</span>
                </div>
                <div className="text-[11px] font-semibold text-gray-300">
                  ▲ / ▼ Select Game • OK to Watch • ◄ / ► Switch Sport
                </div>
              </div>
            )}

            {/* NBA-Style Interactive Date Navigation Carousel (Thinner & Pushed to Top) */}
            <DateNavigation
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />

            {/* Loading Skeleton */}
            {isLoading && (
              <div className={isTv ? "space-y-2 sm:space-y-2.5" : "grid grid-cols-1 md:grid-cols-2 gap-3"}>
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
              <div className={
                isTv 
                  ? "space-y-2 sm:space-y-2.5" 
                  : layoutDensity === 'compact'
                    ? "grid grid-cols-1 md:grid-cols-2 gap-2"
                    : "grid grid-cols-1 md:grid-cols-2 gap-3"
              }>
                {allGames.length > 0 ? (
                  allGames.map((game, idx) => (
                    <GameRow
                      key={game.id}
                      rowId={`tv-game-row-${idx}`}
                      isTvFocused={isTv && tvGameIndex === idx}
                      game={game}
                      favoriteTeam={favoriteTeam}
                      isCountdownActive={isCountdownActive}
                      onWatchGame={handleWatchGame}
                      onWatchHighlights={handleWatchHighlights}
                      onOpenBoxScore={(g) => setBoxScoreGame(g)}
                    />
                  ))
                ) : (
                  <div className={`bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-xs ${!isTv ? 'md:col-span-2' : ''}`}>
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

      {/* Relocated 'i' Report a Problem Modal (Triggered directly from Header under profile badge) */}
      <ReportProblemButton 
        currentUser={currentUser} 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
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

      {/* Direct /quickaccess Modal */}
      {isQuickAccessOpen && (
        <AuthModal
          isOpen={true}
          initialPasscodeMode={true}
          currentSport={currentSport}
          onSuccess={(user) => {
            setCurrentUser(user);
            setIsQuickAccessOpen(false);
            if (window.location.pathname.includes('quickaccess')) {
              window.history.pushState(null, '', '/');
            }
          }}
          onOpenLegal={(tab) => {
            setLegalTab(tab || 'dmca');
            setShowLegalModal(true);
          }}
        />
      )}

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

      {/* Website is Updating Screen (Triggered during VPS deploy / server maintenance) */}
      {isSiteUpdating && (
        <UpdatingScreen onBackOnline={() => window.location.reload()} />
      )}
    </div>
  );
};

export default App;
