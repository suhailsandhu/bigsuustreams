import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Stream } from './types/stream.ts';
import type { ScoreboardGame, ScoreboardResponse } from './types/scoreboard.ts';
import { fetchScoreboard, fetchStreamDetails } from './services/api.ts';
import { getTodayDateString } from './utils/date.ts';
import { Header } from './components/Header.tsx';
import { DateNavigation } from './components/DateNavigation.tsx';
import { GameRow } from './components/GameRow.tsx';
import { BoxScoreModal } from './components/BoxScoreModal.tsx';
import { GameView } from './components/GameView.tsx';
import { Footer } from './components/Footer.tsx';
import { PwaInstallModal } from './components/PwaInstallModal.tsx';
import { AdminStatsModal } from './components/AdminStatsModal.tsx';
import { trackPageView, updateCurrentStream } from './utils/analyticsClient.ts';
import { AlertCircle, RefreshCw, Trophy } from 'lucide-react';

export const App: React.FC = () => {
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

  const allGames = useMemo(() => {
    // Only NBA games per user request
    return (scoreboard?.games || []).filter((g) => g.league === 'NBA');
  }, [scoreboard]);

  // Hash-based routing for direct links and admin
  const handleHashChange = useCallback(async () => {
    const hash = window.location.hash;
    if (hash === '#/stats' || hash === '#/admin' || hash === '#stats' || hash === '#admin') {
      setShowStatsModal(true);
      return;
    }

    if (hash.startsWith('#/game/')) {
      const key = hash.replace('#/game/', '');
      try {
        const fetched = await fetchStreamDetails(key);
        setSelectedStream(fetched);
        const matched = allGames.find((g) => g.stream?.streamKey === key);
        if (matched) setSelectedGame(matched);
      } catch (e) {
        console.warn('Game in hash not found:', e);
      }
    } else {
      setSelectedStream(null);
      setSelectedGame(null);
    }
  }, [allGames]);

  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    // Check initial hash
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

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
  const loadScoreboardData = useCallback(async (dateStr: string, silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchScoreboard(dateStr);
      setScoreboard(data);
    } catch (err: any) {
      console.error('Failed to load scoreboard:', err);
      if (!silent) {
        setError('Unable to load live scoreboard data. Please check your network connection.');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadScoreboardData(selectedDate, false);

    // Auto-refresh every 15 seconds silently for live scores and stream updates
    const interval = setInterval(() => {
      loadScoreboardData(selectedDate, true);
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedDate, loadScoreboardData]);

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
        console.warn('Stream fetch error:', err);
      }
    }
  };

  const handleBackToHome = () => {
    setSelectedStream(null);
    setSelectedGame(null);
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col text-gray-900 selection:bg-orange-500/20 selection:text-orange-900">
      {/* Top White Header with NBA Streams logo */}
      <Header onNavigateHome={handleBackToHome} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* If a game stream is currently active, render the GameView */}
        {selectedStream ? (
          <GameView
            stream={selectedStream}
            game={selectedGame}
            onBack={handleBackToHome}
          />
        ) : (
          <>
            {/* NBA-Style Interactive 7-Day Date Navigation */}
            <DateNavigation
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />

            {/* Loading Skeleton */}
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 rounded-lg bg-white border border-gray-200 animate-pulse shadow-xs" />
                ))}
              </div>
            )}

            {/* Error Notice */}
            {error && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center my-6">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <h3 className="text-base font-bold text-gray-900 mb-1">Scoreboard Notice</h3>
                <p className="text-xs text-gray-600 max-w-md mx-auto mb-4">{error}</p>
                <button
                  onClick={() => loadScoreboardData(selectedDate)}
                  className="inline-flex items-center space-x-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-md transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Retry Loading
                </button>
              </div>
            )}

            {/* Games List (Scoreboard & Live Feeds) */}
            {!isLoading && !error && (
              <div className="space-y-4 sm:space-y-5">
                {allGames.length > 0 ? (
                  allGames.map((game) => (
                    <GameRow
                      key={game.id}
                      game={game}
                      onWatchGame={handleWatchGame}
                      onOpenBoxScore={(g) => setBoxScoreGame(g)}
                    />
                  ))
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-xs">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No NBA Games Scheduled</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                      There are no NBA games scheduled for this date. Use the date bar above to check games for other days.
                    </p>
                    <button
                      onClick={() => handleSelectDate(getTodayDateString())}
                      className="bg-black hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-md transition-colors cursor-pointer"
                    >
                      Return to Today's Games
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Centered Clean Footer with Live Stats Trigger */}
      <Footer onOpenStats={() => setShowStatsModal(true)} />

      {/* Interactive Box Score Modal */}
      <BoxScoreModal
        game={boxScoreGame}
        onClose={() => setBoxScoreGame(null)}
        onWatchGame={handleWatchGame}
      />

      {/* Live Admin Analytics & Activity Telemetry Modal */}
      <AdminStatsModal
        isOpen={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          if (window.location.hash === '#/stats' || window.location.hash === '#/admin' || window.location.hash === '#stats' || window.location.hash === '#admin') {
            window.location.hash = '';
          }
        }}
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
