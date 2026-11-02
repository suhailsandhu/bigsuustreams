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

  const home = game.homeTeam;
  const away = game.awayTeam;

  const renderAwayScore = () => {
    if (hideScores) return '-';
    if (game.status.state === 'pre') return '';
    return away.score !== undefined ? away.score : '-';
  };

  const renderHomeScore = () => {
    if (hideScores) return '-';
    if (game.status.state === 'pre') return '';
    return home.score !== undefined ? home.score : '-';
  };

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
      className={`group relative overflow-hidden rounded-2xl bg-white border border-gray-200/90 shadow-2xs hover:shadow-sm hover:border-gray-300 transition-all p-3 sm:p-4 select-none cursor-pointer ${
        isLive ? 'ring-1 ring-orange-500/30' : ''
      }`}
    >
      {/* Teams & Score Row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        
        {/* Away Team: Noticeably Bigger Logo + Full Name */}
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
            <div className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
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
            <span className={`text-lg sm:text-2xl font-black tabular-nums min-w-[20px] text-right ${
              isFinal && away.winner ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {renderAwayScore()}
            </span>

            {/* Status Badge */}
            <div className="shrink-0 px-0.5">
              {isLive ? (
                <div className="flex items-center space-x-1.5 text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                  <span>{game.status.shortDetail || game.status.detail || 'LIVE'}</span>
                </div>
              ) : isFinal ? (
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  FINAL
                </span>
              ) : (
                <div className="text-[11px] sm:text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  <span>{formatTipoff(game.date, game.status.detail)}</span>
                </div>
              )}
            </div>

            {/* Home Score */}
            <span className={`text-lg sm:text-2xl font-black tabular-nums min-w-[20px] text-left ${
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
            <div className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
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

      {/* For Live Games: 'Watch Live' Button */}
      {isLive && (
        <div className="pt-2.5 mt-2.5 border-t border-gray-100 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWatchGame(game);
            }}
            className="w-full sm:w-auto px-6 py-2 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch Live</span>
          </button>
        </div>
      )}

      {/* For Completed Games: 'Watch Highlights' + 'Box Score' Buttons */}
      {isFinal && (
        <div className="pt-2.5 mt-2.5 border-t border-gray-100 flex items-center justify-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onWatchHighlights) {
                onWatchHighlights(game);
              } else {
                onWatchGame(game);
              }
            }}
            className="w-full sm:w-auto px-5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Watch Highlights</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenBoxScore(game);
            }}
            className="w-full sm:w-auto px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center justify-center space-x-1 transition active:scale-95 cursor-pointer"
          >
            <span>Box Score</span>
          </button>
        </div>
      )}
    </div>
  );
};
