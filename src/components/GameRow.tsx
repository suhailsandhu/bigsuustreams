import React from 'react';
import { Play, FileText, Trophy, Clock } from 'lucide-react';
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
    <div className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg shadow-xs hover:shadow-sm transition-all mb-3.5 overflow-hidden p-4 sm:p-5">
      {/* Matchup & Scoreboard Header Line (3-Column Grid: Away Team, Score/Status, Home Team) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 pb-3 sm:pb-4">
        {/* Away Team Info */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center p-0.5 bg-gray-50 border border-gray-100 shrink-0">
            {away.logo ? (
              <img src={away.logo} alt={away.displayName} className="w-full h-full object-contain" />
            ) : (
              <Trophy className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">
              {away.name || away.displayName}
            </div>
            {away.record && (
              <div className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                {away.record}
              </div>
            )}
          </div>
        </div>

        {/* Scores & Game Status (Center) */}
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 shrink-0 px-1 text-center">
          {/* Away Score */}
          <span className={`text-lg sm:text-2xl font-black ${
            isFinal && away.winner ? 'text-gray-900 font-black' : 'text-gray-800'
          }`}>
            {renderAwayScore()}
          </span>

          {/* Status / Clock */}
          <div className="shrink-0 px-0.5 sm:px-1">
            {isLive ? (
              <div className="flex items-center space-x-1.5 text-red-600 font-extrabold text-xs sm:text-sm tracking-tight whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse-live" />
                <span>{game.status.shortDetail || game.status.detail || 'LIVE'}</span>
              </div>
            ) : isFinal ? (
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                {game.status.shortDetail || 'FINAL'}
              </span>
            ) : (
              <div className="flex items-center space-x-1 text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">
                <span>{formatTipoff(game.date, game.status.detail)}</span>
              </div>
            )}
          </div>

          {/* Home Score */}
          <span className={`text-lg sm:text-2xl font-black ${
            isFinal && home.winner ? 'text-gray-900 font-black' : 'text-gray-800'
          }`}>
            {renderHomeScore()}
          </span>
        </div>

        {/* Home Team Info */}
        <div className="flex items-center justify-end space-x-2.5 sm:space-x-3.5 min-w-0 text-right">
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">
              {home.name || home.displayName}
            </div>
            {home.record && (
              <div className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                {home.record}
              </div>
            )}
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center p-0.5 bg-gray-50 border border-gray-100 shrink-0">
            {home.logo ? (
              <img src={home.logo} alt={home.displayName} className="w-full h-full object-contain" />
            ) : (
              <Trophy className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Action / Status Row */}
      <div className="pt-3 border-t border-gray-100">
        {isFinal ? (
          <button
            onClick={() => onOpenBoxScore(game)}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-md border border-gray-300 hover:border-black bg-white hover:bg-black hover:text-white text-gray-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Final Box Score</span>
          </button>
        ) : isLive ? (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onWatchGame(game)}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md border border-gray-300 hover:border-black bg-white hover:bg-black hover:text-white text-gray-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Watch Live</span>
            </button>

            <button
              onClick={() => onOpenBoxScore(game)}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>Box Score</span>
            </button>
          </div>
        ) : (
          /* Game has not started yet / future games: "Stream Starting Soon" */
          <div className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-md border border-gray-200 bg-gray-50/90 text-gray-500 text-xs font-semibold select-none">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>Stream Starting Soon</span>
          </div>
        )}
      </div>
    </div>
  );
};
