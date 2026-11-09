import React from 'react';
import { Play, Trophy, Clock } from 'lucide-react';
import type { ScoreboardGame } from '../types/scoreboard.ts';
import type { SportsTeam } from '../data/nbaTeams.ts';

interface GameRowProps {
  game: ScoreboardGame;
  hideScores?: boolean;
  onWatchGame: (game: ScoreboardGame) => void;
  onWatchHighlights?: (game: ScoreboardGame) => void;
  onOpenBoxScore: (game: ScoreboardGame) => void;
  favoriteTeam?: SportsTeam | null;
  isCountdownActive?: boolean;
  isTvFocused?: boolean;
  rowId?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(0, 0, 0, ${alpha})`;
}

function formatTipoff(dateStr?: string, fallback = 'Scheduled'): string {
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const is24h = typeof window !== 'undefined' && localStorage.getItem('bss_time_format') === '24h';
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !is24h });
      }
    } catch {
      // ignore
    }
  }
  return fallback.replace(/^played\s+at\s+/i, '').replace(/^(today|tomorrow)\s+at\s+/i, '').trim() || 'Scheduled';
}

// Calculates remaining minutes until this game starts
function getMinutesUntilStart(dateStr?: string): number {
  if (!dateStr) return 0;
  try {
    const gameTime = new Date(dateStr).getTime();
    if (isNaN(gameTime)) return 0;
    const diffMs = gameTime - Date.now();
    return Math.ceil(diffMs / 60000);
  } catch {
    return 0;
  }
}

export const GameRow: React.FC<GameRowProps> = ({
  game,
  hideScores = false,
  onWatchGame,
  onWatchHighlights,
  onOpenBoxScore,
  favoriteTeam,
  isCountdownActive = false,
  isTvFocused = false,
  rowId
}) => {
  const isLive = game.status.isLive;
  const isFinal = game.status.state === 'post';
  const isUpcoming = game.status.state === 'pre';

  const home = game.homeTeam;
  const away = game.awayTeam;

  const effectiveHideScores = hideScores || (typeof window !== 'undefined' && localStorage.getItem('bss_hide_scores') === 'true');
  const awayScore = effectiveHideScores && isFinal ? '-' : (away.score ?? '-');
  const homeScore = effectiveHideScores && isFinal ? '-' : (home.score ?? '-');

  // Live countdown for upcoming games
  const [minutesUntilStart, setMinutesUntilStart] = React.useState<number>(() =>
    getMinutesUntilStart(game.date)
  );

  React.useEffect(() => {
    if (!isUpcoming || !isCountdownActive) return;
    const update = () => setMinutesUntilStart(getMinutesUntilStart(game.date));
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [game.date, isUpcoming, isCountdownActive]);

  // Check if this matchup features the user's favorite team
  const isFavoriteGame = Boolean(
    favoriteTeam && (
      (away.name && (away.name.toLowerCase().includes(favoriteTeam.name.toLowerCase()) || away.displayName?.toLowerCase().includes(favoriteTeam.displayName.toLowerCase()))) ||
      (home.name && (home.name.toLowerCase().includes(favoriteTeam.name.toLowerCase()) || home.displayName?.toLowerCase().includes(favoriteTeam.displayName.toLowerCase()))) ||
      (away.abbreviation && away.abbreviation.toUpperCase() === favoriteTeam.abbreviation.toUpperCase()) ||
      (home.abbreviation && home.abbreviation.toUpperCase() === favoriteTeam.abbreviation.toUpperCase())
    )
  );

  const cardStyle: React.CSSProperties = isFavoriteGame && favoriteTeam?.primaryColor
    ? {
        borderLeftWidth: '4px',
        borderLeftColor: favoriteTeam.primaryColor,
        backgroundColor: hexToRgba(favoriteTeam.primaryColor, 0.038)
      }
    : {};

  // Live stream status: active if ESPN says isLive, backend attached live stream, or scheduled tip-off has arrived
  const isStreamLiveNow = !isFinal && (isLive || Boolean(game.stream?.isLive) || (isUpcoming && minutesUntilStart <= 0));

  const handleRowClick = () => {
    if (isFinal) {
      if (onWatchHighlights) {
        onWatchHighlights(game);
      } else {
        onWatchGame(game);
      }
    } else {
      onWatchGame(game);
    }
  };

  return (
    <div
      id={rowId}
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          handleRowClick();
        }
      }}
      style={cardStyle}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl border transition-all p-2 sm:p-2.5 select-none cursor-pointer flex flex-col justify-between h-full ${
        isTvFocused
          ? 'ring-4 ring-orange-500 border-orange-500 scale-[1.02] shadow-2xl z-10 bg-orange-50/20'
          : isFavoriteGame
            ? 'border-gray-200/90 shadow-2xs hover:shadow-md'
            : 'bg-white border-gray-200/90 shadow-2xs hover:shadow-md hover:border-gray-300'
      } ${
        isLive ? 'ring-2 ring-red-500/20 border-red-200' : ''
      }`}
    >
      {/* Teams & Score / Matchup Row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-3">
        
        {/* AWAY TEAM (Left Column) */}
        <div className="flex flex-col items-center text-center min-w-0">
          {/* Pure Logo - Prominent & Crisp (Increased Size) */}
          <div 
            style={{ width: '56px', height: '56px', maxWidth: '56px', maxHeight: '56px' }}
            className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
          >
            {away.logo ? (
              <img
                src={away.logo}
                alt={away.displayName}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                className="w-full h-full object-contain filter drop-shadow-xs"
                loading="lazy"
              />
            ) : (
              <Trophy className="w-10 h-10 text-gray-400" />
            )}
          </div>

          {/* 1. Team Name Under Logo */}
          <div className="text-xs sm:text-sm font-extrabold text-gray-900 leading-tight truncate mt-1 max-w-full">
            {away.name || away.displayName}
          </div>

          {/* 2. Record Under Team Name */}
          {away.record && (
            <div className="text-[10px] sm:text-[11px] text-gray-400 font-medium leading-none mt-0.5">
              {away.record}
            </div>
          )}

          {/* 3. AWAY Under Record */}
          <div className="mt-0.5">
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded leading-none">
              AWAY
            </span>
          </div>
        </div>

        {/* CENTER COLUMN (Score & Game Status / Tipoff) */}
        <div className="flex flex-col items-center justify-center shrink-0 px-1 sm:px-2 text-center">
          {isUpcoming ? (
            /* Upcoming Game: Scheduled Tip-off Time (No Circle Border, No 'at' word) */
            <div className="flex flex-col items-center">
              <div className="text-xs sm:text-sm font-extrabold text-gray-800 whitespace-nowrap">
                {formatTipoff(game.date, game.status.detail)}
              </div>
            </div>
          ) : (
            /* Live or Completed Game: Scores & Status (Clicking score opens box score) */
            <div 
              onClick={(e) => {
                if (isFinal) {
                  e.stopPropagation();
                  onOpenBoxScore(game);
                }
              }}
              className="flex items-center space-x-2 sm:space-x-3.5"
            >
              {/* Away Score */}
              <span
                className={`text-lg sm:text-2xl font-black tabular-nums min-w-[24px] text-right ${
                  isFinal && away.winner ? 'text-gray-900' : isFinal ? 'text-gray-400 font-bold' : 'text-gray-900'
                }`}
              >
                {awayScore}
              </span>

              {/* Status Badge */}
              <div className="shrink-0">
                {isLive ? (
                  <div className="flex items-center space-x-1 text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                    <span>{game.status.shortDetail || game.status.detail || 'LIVE'}</span>
                  </div>
                ) : (
                  <div className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider bg-gray-50 border border-gray-200/70 px-2 py-0.5 rounded-full">
                    FINAL
                  </div>
                )}
              </div>

              {/* Home Score */}
              <span
                className={`text-lg sm:text-2xl font-black tabular-nums min-w-[24px] text-left ${
                  isFinal && home.winner ? 'text-gray-900' : isFinal ? 'text-gray-400 font-bold' : 'text-gray-900'
                }`}
              >
                {homeScore}
              </span>
            </div>
          )}
        </div>

        {/* HOME TEAM (Right Column) */}
        <div className="flex flex-col items-center text-center min-w-0">
          {/* Pure Logo - Prominent & Crisp (Increased Size) */}
          <div 
            style={{ width: '56px', height: '56px', maxWidth: '56px', maxHeight: '56px' }}
            className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
          >
            {home.logo ? (
              <img
                src={home.logo}
                alt={home.displayName}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                className="w-full h-full object-contain filter drop-shadow-xs"
                loading="lazy"
              />
            ) : (
              <Trophy className="w-10 h-10 text-gray-400" />
            )}
          </div>

          {/* 1. Team Name Under Logo */}
          <div className="text-xs sm:text-sm font-extrabold text-gray-900 leading-tight truncate mt-1 max-w-full">
            {home.name || home.displayName}
          </div>

          {/* 2. Record Under Team Name */}
          {home.record && (
            <div className="text-[10px] sm:text-[11px] text-gray-400 font-medium leading-none mt-0.5">
              {home.record}
            </div>
          )}

          {/* 3. HOME Under Record */}
          <div className="mt-0.5">
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded leading-none">
              HOME
            </span>
          </div>
        </div>

      </div>

      {/* For Upcoming Games: Gray Button indicating when stream starts (only when > 0 minutes left) */}
      {isUpcoming && !isStreamLiveNow && isCountdownActive && minutesUntilStart > 0 && (
        <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWatchGame(game);
            }}
            className="w-full sm:w-auto px-5 py-1.5 rounded-full bg-gray-100/90 hover:bg-gray-200/80 text-gray-600 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border border-gray-200/70 shadow-2xs transition active:scale-98 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>
              Stream starting in {minutesUntilStart} {minutesUntilStart === 1 ? 'minute' : 'minutes'}
            </span>
          </button>
        </div>
      )}

      {/* For Live Games: Sleek 'Watch Live' Action Button */}
      {isStreamLiveNow && !isFinal && (
        <div className="pt-1.5 mt-1.5 border-t border-gray-100 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWatchGame(game);
            }}
            className="px-3.5 py-1 rounded-full bg-black hover:bg-neutral-800 text-white text-[11px] font-bold flex items-center justify-center space-x-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <Play className="w-3 h-3 fill-current" />
            <span>Watch Live</span>
          </button>
        </div>
      )}

    </div>
  );
};
