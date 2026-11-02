import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Stream } from './types/stream.ts';
import type { ScoreboardGame, ScoreboardResponse } from './types/scoreboard.ts';
import { fetchScoreboard, fetchStreamDetails } from './services/api.ts';
import { getTodayDateString } from './utils/date.ts';
import { Header } from './components/Header.tsx';
import type { NavTab } from './components/Header.tsx';
import { DateNavigation } from './components/DateNavigation.tsx';
import { GameRow } from './components/GameRow.tsx';
import { BoxScoreModal } from './components/BoxScoreModal.tsx';
import { GameView } from './components/GameView.tsx';
import { StandingsView } from './components/StandingsView.tsx';
import { Footer } from './components/Footer.tsx';
import { PwaInstallModal } from './components/PwaInstallModal.tsx';
import { AlertCircle, RefreshCw, Trophy } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('games');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [scoreboard, setScoreboard] = useState<ScoreboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [selectedGame, setSelectedGame] = useState<ScoreboardGame | null>(null);
  const [boxScoreGame, setBoxScoreGame] = useState<ScoreboardGame | null>(null);

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

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

  // Hash-based routing for direct links
  const handleHashChange = useCallback(async () => {
    const hash = window.location.hash;
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
      {/* Top White Header with NBA Streams logo and GAMES & STANDINGS navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (selectedStream) handleBackToHome();
        }}
        onNavigateHome={handleBackToHome}
      />

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
            {/* ========================================================= */}
            {/* TAB 1: GAMES (NBA Games & Scores with Date Navigation)    */}
            {/* ========================================================= */}
            {activeTab === 'games' && (
              <>
                {/* Main Heading: NBA GAMES & SCORES - Centered per user instruction */}
                <div className="mb-6 text-center">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase">
                    NBA GAMES & SCORES
                  </h1>
                </div>

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
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Scoreboard</span>
                    </button>
                  </div>
                )}

                {/* NBA Game Cards List */}
                {!isLoading && !error && (
                  <>
                    {allGames.length > 0 ? (
                      <div className="space-y-3.5">
                        {allGames.map((game) => (
                          <GameRow
                            key={game.id}
                            game={game}
                            onWatchGame={handleWatchGame}
                            onOpenBoxScore={(g) => setBoxScoreGame(g)}
                          />
                        ))}
                      </div>
                    ) : (
                      /* Empty state */
                      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center my-6 shadow-xs">
                        <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-gray-900 mb-1">No NBA Games Scheduled</h3>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                          No NBA games scheduled for {scoreboard?.formattedDate || 'this date'}.
                        </p>
                        <button
                          onClick={() => {
                            setSelectedDate(getTodayDateString());
                          }}
                          className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                        >
                          Reset to Today’s Games
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ========================================================= */}
            {/* TAB 2: STANDINGS (Eastern & Western Conference Standings)  */}
            {/* ========================================================= */}
            {activeTab === 'standings' && (
              <div>
                <div className="mb-6 text-center">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase">
                    NBA STANDINGS
                  </h1>
                </div>
                <StandingsView />
              </div>
            )}
          </>
        )}
      </main>

      {/* Centered Clean Footer */}
      <Footer />

      {/* Interactive Box Score Modal */}
      <BoxScoreModal
        game={boxScoreGame}
        onClose={() => setBoxScoreGame(null)}
        onWatchGame={handleWatchGame}
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
