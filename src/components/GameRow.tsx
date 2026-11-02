import React from 'react';
import { Play, Trophy } from 'lucide-react';
import type { ScoreboardGame } from '../types/scoreboard.ts';

interface GameRowProps {
  game: ScoreboardGame;
  hideScores?: boolean;
  onWatchGame: (game: ScoreboardGame) => void;
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
  onOpenBoxScore
}) => {
  const isLive = game.status.isLive;
  const isFinal = game.status.state === 'post';
  const isPre = game.status.state === 'pre' || (!isLive && !isFinal);

  const home = game.homeTeam;
  const away = game.awayTeam;

  // Render scores respecting hideScores and pre-game state
  const renderAwayScore = () => {
    if (hideScores || isPre) return '-';
    return away.score;
  };

  const renderHomeScore = () => {
    if (hideScores || isPre) return '-';
    return home.score;
  };

  return (
    <div
      onClick={() => onOpenBoxScore(game)}
      className="w-full bg-white border border-gray-200/90 hover:border-gray-300 rounded-2xl shadow-xs hover:shadow-sm transition-all mb-3 overflow-hidden p-3.5 sm:p-5 cursor-pointer active:bg-gray-50/70 select-none"
    >
      {/* Matchup & Scoreboard Line: Symmetrical 3-Column Grid */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        
        {/* Away Team Info (Left) */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center p-0.5 bg-gray-50 border border-gray-100 shrink-0">
            {away.logo ? (
              <img src={away.logo} alt={away.displayName} className="w-full h-full object-contain" />
            ) : (
              <Trophy className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
              {away.name || away.displayName}
            </div>
            {away.record && (
              <div className="text-[10px] sm:text-[11px] text-gray-400 font-normal truncate mt-0.5">
                {away.record}
              </div>
            )}
          </div>
        </div>

        {/* Scores & Game Status (Center) */}
        <div className="flex items-center justify-center space-x-2 sm:space-x-3.5 shrink-0 px-1 text-center">
          {/* Away Score */}
          <span className={`text-base sm:text-xl font-bold tabular-nums min-w-[20px] text-right ${
            isFinal && away.winner ? 'text-gray-900' : 'text-gray-700'
          }`}>
            {renderAwayScore()}
          </span>

          {/* Status / Clock */}
          <div className="shrink-0 px-0.5">
            {isLive ? (
              <div className="flex items-center space-x-1.5 text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span>{game.status.shortDetail || game.status.detail || 'LIVE'}</span>
              </div>
            ) : isFinal ? (
              <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                FINAL
              </span>
            ) : (
              <div className="text-[11px] sm:text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                <span>{formatTipoff(game.date, game.status.detail)}</span>
              </div>
            )}
          </div>

          {/* Home Score */}
          <span className={`text-base sm:text-xl font-bold tabular-nums min-w-[20px] text-left ${
            isFinal && home.winner ? 'text-gray-900' : 'text-gray-700'
          }`}>
            {renderHomeScore()}
          </span>
        </div>

        {/* Home Team Info (Right) */}
        <div className="flex items-center justify-end space-x-2 sm:space-x-3 min-w-0 text-right">
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
              {home.name || home.displayName}
            </div>
            {home.record && (
              <div className="text-[10px] sm:text-[11px] text-gray-400 font-normal truncate mt-0.5">
                {home.record}
              </div>
            )}
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center p-0.5 bg-gray-50 border border-gray-100 shrink-0">
            {home.logo ? (
              <img src={home.logo} alt={home.displayName} className="w-full h-full object-contain" />
            ) : (
              <Trophy className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* For Live Games Only: Centered 'Watch Live' Button */}
      {isLive && (
        <div className="pt-2.5 mt-2.5 border-t border-gray-100 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWatchGame(game);
            }}
            className="w-full sm:w-auto px-5 py-1.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Watch Live</span>
          </button>
        </div>
      )}
    </div>
  );
};
