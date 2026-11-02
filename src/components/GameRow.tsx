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
      {/* Symmetrical 3-Column Matchup Grid */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        
        {/* Away Team: Noticeably Bigger Logo + Full Name (No awkward truncation) */}
        <div className="flex flex-col sm:flex-row items-center sm:space-x-3 text-center sm:text-left min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center p-1 bg-gray-50/80 border border-gray-100 shrink-0 shadow-2xs">
            {away.logo ? (
              <img
                src={away.logo}
                alt={away.displayName}
                className="w-full h-full object-contain filter drop-shadow-2xs transition-transform hover:scale-105"
              />
            ) : (
              <Trophy className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 mt-1 sm:mt-0">
            <div className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">
              {away.name || away.displayName}
            </div>
            {away.record && (
              <div className="text-[10px] sm:text-[11px] text-gray-400 font-normal mt-0.5">
                {away.record}
              </div>
            )}
          </div>
        </div>

        {/* Center: Scores & Live / Tipoff Status */}
        <div className="flex flex-col items-center justify-center shrink-0 px-1 sm:px-3 text-center">
          <div className="flex items-center space-x-2 sm:space-x-3.5">
            {/* Away Score */}
            <span className={`text-lg sm:text-2xl font-bold tabular-nums min-w-[20px] text-right ${
              isFinal && away.winner ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {renderAwayScore()}
            </span>

            {/* Status Badge */}
            <div className="shrink-0 px-0.5">
              {isLive ? (
                <div className="flex items-center space-x-1.5 text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap">
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
            <span className={`text-lg sm:text-2xl font-bold tabular-nums min-w-[20px] text-left ${
              isFinal && home.winner ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {renderHomeScore()}
            </span>
          </div>
        </div>

        {/* Home Team: Noticeably Bigger Logo + Full Name */}
        <div className="flex flex-col sm:flex-row-reverse items-center sm:space-x-3 sm:space-x-reverse text-center sm:text-right min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center p-1 bg-gray-50/80 border border-gray-100 shrink-0 shadow-2xs">
            {home.logo ? (
              <img
                src={home.logo}
                alt={home.displayName}
                className="w-full h-full object-contain filter drop-shadow-2xs transition-transform hover:scale-105"
              />
            ) : (
              <Trophy className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 mt-1 sm:mt-0">
            <div className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">
              {home.name || home.displayName}
            </div>
            {home.record && (
              <div className="text-[10px] sm:text-[11px] text-gray-400 font-normal mt-0.5">
                {home.record}
              </div>
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
            className="w-full sm:w-auto px-6 py-2 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch Live</span>
          </button>
        </div>
      )}
    </div>
  );
};
