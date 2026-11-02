import React from 'react';
import { Play, Trophy, Film } from 'lucide-react';
import type { ScoreboardGame } from '../types/scoreboard.ts';

interface GameRowProps {
  game: ScoreboardGame;
  hideScores?: boolean;
  onWatchGame: (game: ScoreboardGame) => void;
  onWatchHighlights?: (game: ScoreboardGame) => void;
  onOpenBoxScore: (game: ScoreboardGame) => void;
}

function formatTipoff(dateStr?: string, fallback = 'Scheduled'): string {
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    } catch {
      // ignore
    }
  }
  return fallback;
}

export const GameRow: React.FC<GameRowProps> = ({
  game,
  hideScores = false,
  onWatchGame,
  onWatchHighlights,
  onOpenBoxScore
}) => {
  const isLive = game.status.isLive;
  const isFinal = game.status.state === 'post';
  const isUpcoming = game.status.state === 'pre';

  const home = game.homeTeam;
  const away = game.awayTeam;

  const awayScore = hideScores ? '-' : away.score ?? '-';
  const homeScore = hideScores ? '-' : home.score ?? '-';

  const handleRowClick = () => {
    if (isLive) {
      onWatchGame(game);
    } else if (isFinal) {
      if (onWatchHighlights) {
        onWatchHighlights(game);
      } else {
        onOpenBoxScore(game);
      }
    } else {
      onOpenBoxScore(game);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-gray-300 transition-all p-2.5 sm:p-3.5 select-none cursor-pointer ${
        isLive ? 'ring-2 ring-red-500/20 border-red-200' : ''
      }`}
    >
      {/* Teams & Score / Matchup Row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-4">
        
        {/* AWAY TEAM (Left Column) */}
        <div className="flex flex-col items-center text-center min-w-0">
          {/* Pure Logo - Balanced & Crisp, No Gray Border */}
          <div className="w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
            {away.logo ? (
              <img
                src={away.logo}
                alt={away.displayName}
                className="w-full h-full object-contain filter drop-shadow-xs"
                loading="lazy"
              />
            ) : (
              <Trophy className="w-8 h-8 text-gray-400" />
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
        <div className="flex flex-col items-center justify-center shrink-0 px-1 sm:px-3 text-center">
          {isUpcoming ? (
            /* Upcoming Game: Scheduled Tip-off Time (No Circle Border, No 'at' word) */
            <div className="flex flex-col items-center">
              <div className="text-xs sm:text-sm font-extrabold text-gray-800 whitespace-nowrap">
                {formatTipoff(game.date, game.status.detail)}
              </div>
            </div>
          ) : (
            /* Live or Completed Game: Scores & Status */
            <div className="flex items-center space-x-2 sm:space-x-3.5">
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
          {/* Pure Logo - Balanced & Crisp, No Gray Border */}
          <div className="w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
            {home.logo ? (
              <img
                src={home.logo}
                alt={home.displayName}
                className="w-full h-full object-contain filter drop-shadow-xs"
                loading="lazy"
              />
            ) : (
              <Trophy className="w-8 h-8 text-gray-400" />
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

      {/* For Live Games: Single 'Watch Live' Action Button */}
      {isLive && (
        <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWatchGame(game);
            }}
            className="w-full sm:w-auto px-6 py-2 rounded-full bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-xs transition active:scale-98 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch Live</span>
          </button>
        </div>
      )}

      {/* For Completed Games: 'Watch Highlights' Button for NBA and NFL */}
      {isFinal && (
        <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onWatchHighlights) {
                onWatchHighlights(game);
              } else {
                onWatchGame(game);
              }
            }}
            className="w-full sm:w-auto px-6 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-xs transition active:scale-98 cursor-pointer"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Watch Highlights</span>
          </button>
        </div>
      )}
    </div>
  );
};
