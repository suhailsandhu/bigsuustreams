import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Share2, Check, Trophy, RefreshCw } from 'lucide-react';
import type { Stream } from '../types/stream';
import type { ScoreboardGame, GameSummaryResponse } from '../types/scoreboard';
import { CourtsidePlayer } from './CourtsidePlayer';
import { formatTipoffTime, fetchGameSummary } from '../services/api';
import { isSmartTv, TV_KEYS } from '../utils/tvDetector';

// Helper to highlight leader stats in green, highest turnovers in red, and +/- positive/negative
function getStatHighlightClass(
  val: string,
  label: string,
  athletes: any[],
  colIdx: number
): string {
  if (!val || val === '-') return 'text-gray-400 font-normal';

  const cleanLabel = (label || '').toUpperCase().trim();

  // 1. Plus-Minus: Any positive ones in green, negative ones in red
  if (cleanLabel === '+/-' || cleanLabel === 'PLUSMINUS' || cleanLabel.includes('+/-')) {
    const raw = String(val).trim();
    if (raw.startsWith('+')) return 'text-emerald-600 font-black';
    if (raw.startsWith('-')) return 'text-red-500 font-black';
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      if (num > 0) return 'text-emerald-600 font-black';
      if (num < 0) return 'text-red-500 font-black';
    }
    return 'text-gray-500 font-semibold';
  }

  // 2. Ignore field goal and three-point columns per user instruction
  if (
    cleanLabel === 'FG' || cleanLabel === '3PT' || cleanLabel === '3P' ||
    cleanLabel === 'FT' || cleanLabel.includes('FG') || cleanLabel.includes('3P') || cleanLabel.includes('FT')
  ) {
    return 'text-gray-600 font-semibold';
  }

  // Helper to parse numeric value from stat string (supports "36:12" for minutes)
  const parseNum = (str: string): number => {
    if (!str || str === '-') return -Infinity;
    if (str.includes(':')) {
      const parts = str.split(':');
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }
    const n = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? -Infinity : n;
  };

  const currentNum = parseNum(String(val));
  if (currentNum <= 0) {
    return cleanLabel === 'PTS' ? 'text-gray-900 font-black' : 'text-gray-600 font-semibold';
  }

  // Find maximum numeric value across active athletes for this column
  let maxVal = -Infinity;
  for (const ath of athletes) {
    if (ath.didNotPlay) continue;
    const statStr = ath.stats?.[colIdx];
    const n = parseNum(String(statStr));
    if (n > maxVal) maxVal = n;
  }

  // Check if current athlete is the column leader
  if (currentNum === maxVal && maxVal > 0) {
    // Turnovers: highest number is in RED
    if (cleanLabel === 'TO' || cleanLabel === 'TURNOVERS') {
      return 'text-red-600 font-black';
    }
    // Points, Rebounds, Assists, Steals, Blocks, Minutes, OREB, DREB, etc.: GREEN
    return 'text-emerald-600 font-black';
  }

  // Non-leaders:
  if (cleanLabel === 'PTS') {
    return 'text-gray-900 font-black';
  }
  return 'text-gray-600 font-semibold';
}

interface GameViewProps {
  stream: Stream;
  game?: ScoreboardGame | null;
  allGames?: ScoreboardGame[];
  onBack: () => void;
  onSelectGame?: (game: ScoreboardGame) => void;
}

export const GameView: React.FC<GameViewProps> = ({ stream, game, allGames = [], onBack, onSelectGame }) => {
  const isTv = useMemo(() => isSmartTv(), []);
  const [, setTvSwitcherIndex] = useState(0);

  // Auto-scroll to top on mount so video is front-and-center without scrolling
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [stream.stream_key]);

  // Only games that are ON RIGHT NOW (live broadcasts)
  const liveGamesNow = useMemo(() => {
    return allGames.filter((g) => Boolean(g.status?.isLive));
  }, [allGames]);

  // Samsung TV Remote Control listener (Back button & Channel carousel navigation)
  useEffect(() => {
    if (!isTv) return;

    const handleTvKeys = (e: KeyboardEvent) => {
      const code = e.keyCode;
      // RETURN / BACK on Samsung remote (10009), Escape, Backspace
      if (code === TV_KEYS.RETURN || code === TV_KEYS.ESCAPE || code === TV_KEYS.BACKSPACE) {
        onBack();
        e.preventDefault();
        return;
      }

      // Quick-Switch Games Carousel Navigation for LIVE games
      if (liveGamesNow.length > 1) {
        if (code === TV_KEYS.LEFT) {
          setTvSwitcherIndex((prev) => {
            const next = Math.max(0, prev - 1);
            const el = document.getElementById(`tv-switcher-${next}`);
            el?.focus();
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            return next;
          });
          e.preventDefault();
        } else if (code === TV_KEYS.RIGHT) {
          setTvSwitcherIndex((prev) => {
            const next = Math.min(liveGamesNow.length - 1, prev + 1);
            const el = document.getElementById(`tv-switcher-${next}`);
            el?.focus();
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            return next;
          });
          e.preventDefault();
        } else if (code === TV_KEYS.ENTER) {
          const activeEl = document.activeElement;
          if (activeEl && activeEl.id && activeEl.id.startsWith('tv-switcher-')) {
            const idx = parseInt(activeEl.id.replace('tv-switcher-', ''), 10);
            if (liveGamesNow[idx] && onSelectGame) {
              onSelectGame(liveGamesNow[idx]);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleTvKeys);
    return () => window.removeEventListener('keydown', handleTvKeys);
  }, [isTv, liveGamesNow, onBack, onSelectGame]);
  // Default quality: reads user profile setting (1080p or 720p), fallback to 1080p
  const [selectedQuality, setSelectedQuality] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bss_default_quality') || '1080p';
    }
    return '1080p';
  });
  const [copied, setCopied] = useState(false);

  // Box score state
  const [summary, setSummary] = useState<GameSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [activeTeamTab, setActiveTeamTab] = useState<'away' | 'home'>('away');

  const team1 = game?.awayTeam || {
    id: 'away',
    name: stream.team1?.name || stream.name.split(' at ')[0] || stream.name.split(' vs ')[0] || 'Away Team',
    displayName: stream.team1?.name || stream.name.split(' at ')[0] || stream.name.split(' vs ')[0] || 'Away Team',
    shortDisplayName: stream.team1?.name || 'Away',
    abbreviation: 'AWAY',
    logo: stream.team1?.logo || '',
    score: 0,
    record: '',
    winner: false
  };

  const team2 = game?.homeTeam || {
    id: 'home',
    name: stream.team2?.name || (stream.name.includes(' at ') ? stream.name.split(' at ')[1] : stream.name.split(' vs ')[1]) || 'Home Team',
    displayName: stream.team2?.name || (stream.name.includes(' at ') ? stream.name.split(' at ')[1] : stream.name.split(' vs ')[1]) || 'Home Team',
    shortDisplayName: stream.team2?.name || 'Home',
    abbreviation: 'HOME',
    logo: stream.team2?.logo || '',
    score: 0,
    record: '',
    winner: false
  };

  const isLive = game?.status?.isLive ?? stream.is_live;
  const isFinal = game?.status?.state === 'post';
  const statusDetail = game?.status?.shortDetail || game?.status?.detail || (isLive ? 'LIVE' : formatTipoffTime(stream.match_timestamp));

  // Fetch box score stats with auto-refresh every 15 seconds
  useEffect(() => {
    let activeEspnId = game?.espnId;
    let isCancelled = false;

    const loadSummary = (silent = false) => {
      if (!silent) {
        setLoadingSummary(true);
        setSummaryError(null);
      }

      const runFetch = (id: string) => {
        fetchGameSummary(id)
          .then((data) => {
            if (!isCancelled) {
              setSummary(data);
              setLoadingSummary(false);
            }
          })
          .catch((err) => {
            if (!isCancelled) {
              console.warn('GameView boxscore fetch error:', err);
              if (!silent) {
                setSummaryError('Detailed box score statistics not yet available.');
              }
              setLoadingSummary(false);
            }
          });
      };

      if (activeEspnId) {
        runFetch(activeEspnId);
      } else {
        fetch('/api/basketball/scoreboard')
          .then(r => r.json())
          .then(data => {
            if (isCancelled) return;
            const matched = (data.games || []).find((g: any) => 
              g.stream?.streamKey === stream.stream_key ||
              stream.stream_key.includes(g.awayTeam?.name?.toLowerCase()) ||
              stream.name.toLowerCase().includes(g.awayTeam?.name?.toLowerCase())
            );
            if (matched?.espnId) {
              activeEspnId = matched.espnId;
              runFetch(matched.espnId);
            } else if (!silent) {
              setLoadingSummary(false);
            }
          })
          .catch(() => {
            if (!isCancelled && !silent) setLoadingSummary(false);
          });
      }
    };

    loadSummary(false);
    const interval = setInterval(() => loadSummary(true), 15000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [game?.espnId, stream.stream_key]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const awayTeamBox = summary?.boxscore?.away || {
    team: { id: team1.id, displayName: team1.displayName, name: team1.name, logo: team1.logo, record: team1.record },
    score: team1.score,
    linescores: ((team1 as any).linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? l ?? '0', 10)),
    statLabels: ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT', 'TO', 'STL', 'BLK', 'PF', '+/-'],
    athletes: []
  };

  const homeTeamBox = summary?.boxscore?.home || {
    team: { id: team2.id, displayName: team2.displayName, name: team2.name, logo: team2.logo, record: team2.record },
    score: team2.score,
    linescores: ((team2 as any).linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? l ?? '0', 10)),
    statLabels: ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT', 'TO', 'STL', 'BLK', 'PF', '+/-'],
    athletes: []
  };

  const currentTeamBox = activeTeamTab === 'away' ? awayTeamBox : homeTeamBox;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16">
      {/* Top Navigation & Share Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 px-3.5 py-1.5 rounded-full shadow-2xs transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Games</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleShare}
            className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 hover:text-black bg-white hover:bg-gray-50 border border-gray-200 px-3.5 py-1.5 rounded-full shadow-2xs transition-colors cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-gray-500" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video Player Section: Clean Courtside Player */}
      <CourtsidePlayer
        stream={stream}
        selectedQuality={selectedQuality}
        onQualityChange={setSelectedQuality}
      />

      {/* Live Channels Quick-Switcher (Clean White Card Carousel - Only Games Live Right Now) */}
      {liveGamesNow.length > 0 && (
        <div className="bg-white border border-gray-200/90 rounded-2xl p-3 sm:p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="text-xs sm:text-sm font-extrabold text-gray-900 tracking-tight">
                Live Games On Right Now
              </span>
            </div>
            <div className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
              {liveGamesNow.length} Live Now
            </div>
          </div>

          <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {liveGamesNow.map((g, idx) => {
              const isCurrent = g.stream?.streamKey === stream.stream_key || 
                (game && game.id === g.id);
              const awayName = g.awayTeam?.shortDisplayName || g.awayTeam?.name || 'Away';
              const homeName = g.homeTeam?.shortDisplayName || g.homeTeam?.name || 'Home';
              const awayScore = g.awayTeam?.score ?? 0;
              const homeScore = g.homeTeam?.score ?? 0;
              const quarterClock = g.status?.shortDetail || g.status?.detail || 'LIVE';

              return (
                <button
                  key={g.id}
                  id={`tv-switcher-${idx}`}
                  tabIndex={0}
                  onClick={() => onSelectGame?.(g)}
                  className={`shrink-0 flex flex-col justify-between p-2.5 sm:p-3 rounded-xl min-w-[200px] sm:min-w-[220px] transition-all cursor-pointer text-left ${
                    isCurrent
                      ? 'bg-emerald-50/60 border-2 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-white hover:bg-gray-50 border border-gray-200/90 hover:border-gray-400 shadow-2xs hover:shadow-xs focus:ring-3 focus:ring-orange-500 focus:border-orange-500 focus:outline-none focus:scale-[1.02]'
                  }`}
                >
                  {/* Top Matchup Header with Scores */}
                  <div className="flex items-center justify-between w-full space-x-2">
                    {/* Away Team */}
                    <div className="flex items-center space-x-1.5 min-w-0">
                      {g.awayTeam?.logo && (
                        <img src={g.awayTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                      )}
                      <span className="text-xs font-black text-gray-900 truncate">{awayName}</span>
                    </div>
                    <span className="text-xs font-black tabular-nums text-gray-900">{awayScore}</span>
                  </div>

                  <div className="flex items-center justify-between w-full space-x-2 mt-1">
                    {/* Home Team */}
                    <div className="flex items-center space-x-1.5 min-w-0">
                      {g.homeTeam?.logo && (
                        <img src={g.homeTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                      )}
                      <span className="text-xs font-black text-gray-900 truncate">{homeName}</span>
                    </div>
                    <span className="text-xs font-black tabular-nums text-gray-900">{homeScore}</span>
                  </div>

                  {/* Card Bottom Quarter & Watching Status */}
                  <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-gray-100 text-[10px] font-bold">
                    <span className="inline-flex items-center space-x-1 text-red-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                      <span>{quarterClock}</span>
                    </span>
                    {isCurrent ? (
                      <span className="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md font-extrabold text-[9px] uppercase tracking-wider">
                        Watching Now
                      </span>
                    ) : (
                      <span className="text-gray-500 hover:text-black text-[9px]">
                        Switch Stream →
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Matchup Header & Live Scoreboard Section (Symmetrical 3-Column Layout) */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
          
          {/* Away Team */}
          <div className="flex flex-col sm:flex-row items-center sm:space-x-3.5 text-center sm:text-left min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gray-50 border border-gray-100 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
              {team1.logo ? (
                <img
                  src={team1.logo}
                  alt={team1.displayName}
                  className="w-full h-full object-contain filter drop-shadow-2xs"
                />
              ) : (
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 mt-1.5 sm:mt-0">
              <h2 className="text-xs sm:text-lg font-extrabold text-gray-900 leading-tight truncate">
                {team1.name || team1.displayName}
              </h2>
              <div className="flex items-center justify-center sm:justify-start space-x-1.5 mt-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  AWAY
                </span>
                {team1.record && (
                  <span className="text-[10px] sm:text-xs text-gray-400 font-normal">
                    {team1.record}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Live / Final Score & Clock */}
          <div className="flex flex-col items-center justify-center shrink-0 px-1 sm:px-4 text-center">
            {game ? (
              <div className="flex items-center space-x-2.5 sm:space-x-4">
                <span className={`text-xl sm:text-4xl font-black tabular-nums ${
                  isFinal && team1.winner ? 'text-gray-900' : isFinal ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  {team1.score}
                </span>

                <div className="flex flex-col items-center px-1">
                  {isLive ? (
                    <div className="flex items-center space-x-1.5 text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                      <span>{statusDetail}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider bg-gray-50 border border-gray-200/70 px-2 sm:px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      {statusDetail}
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-wider">
                    {game?.league || stream.league || 'NBA'}
                  </span>
                </div>

                <span className={`text-xl sm:text-4xl font-black tabular-nums ${
                  isFinal && team2.winner ? 'text-gray-900' : isFinal ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  {team2.score}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AT</span>
                <span className="text-xs font-semibold text-gray-600 mt-1">{statusDetail}</span>
              </div>
            )}
          </div>

          {/* Home Team */}
          <div className="flex flex-col sm:flex-row-reverse items-center sm:space-x-3.5 sm:space-x-reverse text-center sm:text-right min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gray-50 border border-gray-100 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
              {team2.logo ? (
                <img
                  src={team2.logo}
                  alt={team2.displayName}
                  className="w-full h-full object-contain filter drop-shadow-2xs"
                />
              ) : (
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 mt-1.5 sm:mt-0">
              <h2 className="text-xs sm:text-lg font-extrabold text-gray-900 leading-tight truncate">
                {team2.name || team2.displayName}
              </h2>
              <div className="flex items-center justify-center sm:justify-end space-x-1.5 mt-0.5">
                {team2.record && (
                  <span className="text-[10px] sm:text-xs text-gray-400 font-normal">
                    {team2.record}
                  </span>
                )}
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  HOME
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* BOX SCORE & STATS SECTION                                 */}
      {/* ========================================================= */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        
        {/* Title & Quarter Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">
              Game Stats & Box Score
            </h3>
            <span className="text-[11px] font-semibold text-gray-400">
              {game?.status?.detail || 'Live Statistics'}
            </span>
          </div>

          {/* Quarter Linescore Table */}
          <div className="bg-gray-50/90 border border-gray-200/80 rounded-2xl p-3 sm:p-4 overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse min-w-[280px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-200/80 font-bold uppercase text-[10px] sm:text-[11px]">
                  <th className="text-left py-1.5 px-2 font-semibold text-gray-500 min-w-[120px]">Team</th>
                  <th className="py-1.5 px-1.5 min-w-[28px]">Q1</th>
                  <th className="py-1.5 px-1.5 min-w-[28px]">Q2</th>
                  <th className="py-1.5 px-1.5 min-w-[28px]">Q3</th>
                  <th className="py-1.5 px-1.5 min-w-[28px]">Q4</th>
                  {awayTeamBox.linescores.length > 4 && <th className="py-1.5 px-1.5 min-w-[28px]">OT</th>}
                  <th className="py-1.5 px-2 text-right font-black text-gray-900 min-w-[36px]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {/* Away Team */}
                <tr>
                  <td className="text-left py-2 px-2 font-bold text-gray-900 flex items-center space-x-2">
                    {team1.logo && <img src={team1.logo} className="w-5 h-5 object-contain shrink-0" alt="" />}
                    <span className="truncate">{team1.name || team1.displayName}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase bg-gray-200/60 px-1 py-0.5 rounded shrink-0">
                      AWAY
                    </span>
                  </td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{awayTeamBox.linescores[0] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{awayTeamBox.linescores[1] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{awayTeamBox.linescores[2] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{awayTeamBox.linescores[3] ?? '-'}</td>
                  {awayTeamBox.linescores.length > 4 && (
                    <td className="py-2 px-1.5 tabular-nums text-gray-500">{awayTeamBox.linescores[4]}</td>
                  )}
                  <td className={`py-2 px-2 text-right font-black tabular-nums text-sm ${
                    isFinal && (team1 as any).winner ? 'text-gray-900' : isFinal ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {team1.score}
                  </td>
                </tr>

                {/* Home Team */}
                <tr>
                  <td className="text-left py-2 px-2 font-bold text-gray-900 flex items-center space-x-2">
                    {team2.logo && <img src={team2.logo} className="w-5 h-5 object-contain shrink-0" alt="" />}
                    <span className="truncate">{team2.name || team2.displayName}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase bg-gray-200/60 px-1 py-0.5 rounded shrink-0">
                      HOME
                    </span>
                  </td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{homeTeamBox.linescores[0] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{homeTeamBox.linescores[1] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{homeTeamBox.linescores[2] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{homeTeamBox.linescores[3] ?? '-'}</td>
                  {homeTeamBox.linescores.length > 4 && (
                    <td className="py-2 px-1.5 tabular-nums text-gray-500">{homeTeamBox.linescores[4]}</td>
                  )}
                  <td className={`py-2 px-2 text-right font-black tabular-nums text-sm ${
                    isFinal && (team2 as any).winner ? 'text-gray-900' : isFinal ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {team2.score}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Balanced Team Selector Tabs */}
        <div className="w-full grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200/70 sm:w-auto sm:inline-flex">
          <button
            onClick={() => setActiveTeamTab('away')}
            className={`flex items-center justify-center space-x-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer truncate ${
              activeTeamTab === 'away'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {team1.logo && <img src={team1.logo} className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" alt="" />}
            <span className="truncate">{team1.name || team1.displayName}</span>
          </button>

          <button
            onClick={() => setActiveTeamTab('home')}
            className={`flex items-center justify-center space-x-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer truncate ${
              activeTeamTab === 'home'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {team2.logo && <img src={team2.logo} className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" alt="" />}
            <span className="truncate">{team2.name || team2.displayName}</span>
          </button>
        </div>

        {/* Player Statistics Table */}
        {loadingSummary ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-500 text-xs">
            <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
            <span>Loading player box score...</span>
          </div>
        ) : summaryError && currentTeamBox.athletes.length === 0 ? (
          null
        ) : currentTeamBox.athletes.length > 0 ? (
          <div
            className="border border-gray-200/90 rounded-2xl overflow-x-auto touch-pan-x shadow-2xs bg-white"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table className="w-full text-left text-xs border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3 sm:px-4 font-bold sticky left-0 bg-gray-50 z-20 min-w-[175px] sm:min-w-[210px] shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                    Player
                  </th>
                  {currentTeamBox.statLabels.map((lbl) => (
                    <th
                      key={lbl}
                      className={`py-2.5 px-2.5 text-right font-bold ${
                        lbl === 'PTS' ? 'text-gray-900 font-black' : 'text-gray-500'
                      }`}
                    >
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {currentTeamBox.athletes.map((ath) => (
                  <tr key={ath.athlete.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Sticky Player Name Column: Widen so full names never truncate */}
                    <td className="py-2.5 px-3 sm:px-4 font-bold text-gray-900 flex items-center space-x-2.5 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.04)] min-w-[175px] sm:min-w-[210px]">
                      {ath.athlete.headshot ? (
                        <img
                          src={ath.athlete.headshot}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-gray-100 shrink-0"
                          alt=""
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                          {ath.athlete.jersey || '#'}
                        </div>
                      )}
                      <div className="min-w-0 pr-1">
                        <div className="text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">
                          {ath.athlete.displayName}
                        </div>
                        <div className="text-[10px] text-gray-400 font-normal">
                          {ath.athlete.jersey ? `#${ath.athlete.jersey}` : ''} {ath.athlete.position ? `• ${ath.athlete.position}` : ''}
                        </div>
                      </div>
                    </td>

                    {/* Stat Values with Tabular Numerals & Column Leader Highlighting */}
                    {ath.stats.map((val, idx) => {
                      const lbl = currentTeamBox.statLabels[idx] || '';
                      const highlightClass = getStatHighlightClass(val, lbl, currentTeamBox.athletes, idx);
                      return (
                        <td
                          key={idx}
                          className={`py-2.5 px-2.5 text-right tabular-nums text-xs whitespace-nowrap ${highlightClass}`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          null
        )}
      </div>
    </div>
  );
};
