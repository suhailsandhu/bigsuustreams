import React from 'react';
import { Play, FileText, Trophy } from 'lucide-react';
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
  const isPre = game.status.state === 'pre';

  const home = game.homeTeam;
  const away = game.awayTeam;

  const displayLeaders = game.displayLeaders;
  const leadersTitle = displayLeaders?.title || (isPre ? 'SEASON LEADERS' : 'GAME LEADERS');
  const col1 = displayLeaders?.col1 || (isPre ? 'PPG' : 'PTS');
  const col2 = displayLeaders?.col2 || (isPre ? 'RPG' : 'REB');
  const col3 = displayLeaders?.col3 || (isPre ? 'APG' : 'AST');

  // Fallbacks if displayLeaders not populated
  const awayLeader = displayLeaders?.awayLeader || (game.leaders?.away?.pointsLeader ? {
    teamId: away.id,
    teamAbbreviation: away.abbreviation || 'AWAY',
    athlete: {
      id: game.leaders.away.pointsLeader.athlete.id,
      displayName: game.leaders.away.pointsLeader.athlete.displayName,
      jersey: game.leaders.away.pointsLeader.athlete.jersey || '',
      position: game.leaders.away.pointsLeader.athlete.position || '',
      headshot: game.leaders.away.pointsLeader.athlete.headshot
    },
    stat1: game.leaders.away.pointsLeader.displayValue || `${game.leaders.away.pointsLeader.value}`,
    stat2: game.leaders?.away?.reboundsLeader?.displayValue || '-',
    stat3: game.leaders?.away?.assistsLeader?.displayValue || '-'
  } : undefined);

  const homeLeader = displayLeaders?.homeLeader || (game.leaders?.home?.pointsLeader ? {
    teamId: home.id,
    teamAbbreviation: home.abbreviation || 'HOME',
    athlete: {
      id: game.leaders.home.pointsLeader.athlete.id,
      displayName: game.leaders.home.pointsLeader.athlete.displayName,
      jersey: game.leaders.home.pointsLeader.athlete.jersey || '',
      position: game.leaders.home.pointsLeader.athlete.position || '',
      headshot: game.leaders.home.pointsLeader.athlete.headshot
    },
    stat1: game.leaders.home.pointsLeader.displayValue || `${game.leaders.home.pointsLeader.value}`,
    stat2: game.leaders?.home?.reboundsLeader?.displayValue || '-',
    stat3: game.leaders?.home?.assistsLeader?.displayValue || '-'
  } : undefined);

  const hasStream = game.stream?.available;

  // Render scores respecting hideScores
  const renderAwayScore = () => {
    if (hideScores || isPre) return '-';
    return away.score;
  };

  const renderHomeScore = () => {
    if (hideScores || isPre) return '-';
    return home.score;
  };

  return (
    <div className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg shadow-xs hover:shadow-sm transition-all mb-3.5 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: MATCHUP, SCORES & ACTION BUTTONS             */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 p-3.5 sm:p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-200">
          
          {/* Matchup & Scoreboard Header Line (Bulletproof 3-Column Grid) */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-3 pb-3">
            {/* Away Team Info */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center p-0.5 bg-gray-50 border border-gray-100 shrink-0">
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
            <div className="flex items-center justify-center space-x-2 sm:space-x-3.5 shrink-0 px-1 text-center">
              {/* Away Score */}
              <span className={`text-lg sm:text-2xl font-black ${
                isFinal && away.winner ? 'text-gray-900 font-black' : 'text-gray-800'
              }`}>
                {renderAwayScore()}
              </span>

              {/* Status / Clock */}
              <div className="shrink-0 px-0.5">
                {isLive ? (
                  <div className="flex items-center space-x-1 text-red-600 font-extrabold text-[11px] sm:text-xs tracking-tight whitespace-nowrap">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-600 animate-pulse-live" />
                    <span>{game.status.shortDetail || game.status.detail || 'LIVE'}</span>
                  </div>
                ) : isFinal ? (
                  <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {game.status.shortDetail || 'FINAL'}
                  </span>
                ) : (
                  <div className="flex items-center space-x-1 text-[11px] sm:text-xs font-bold text-gray-900 whitespace-nowrap">
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
            <div className="flex items-center justify-end space-x-2 sm:space-x-3 min-w-0 text-right">
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
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center p-0.5 bg-gray-50 border border-gray-100 shrink-0">
                {home.logo ? (
                  <img src={home.logo} alt={home.displayName} className="w-full h-full object-contain" />
                ) : (
                  <Trophy className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-100">
            {isFinal ? (
              <button
                onClick={() => onOpenBoxScore(game)}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-md border border-gray-300 hover:border-black bg-white hover:bg-black hover:text-white text-gray-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Final Box Score</span>
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onWatchGame(game)}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md border border-gray-300 hover:border-black bg-white hover:bg-black hover:text-white text-gray-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isLive ? 'Watch Live' : hasStream ? 'Watch Stream' : 'Preview'}</span>
                </button>

                <button
                  onClick={() => onOpenBoxScore(game)}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <FileText className="w-3 h-3 text-gray-500" />
                  <span>Box Score</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: GAME LEADERS (PTS, REB, AST)                */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 p-4 sm:p-5 flex flex-col justify-between bg-white">
          
          {/* Header Row: Title on Left, Stat Categories on Right */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-gray-100">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-900">
              {leadersTitle}
            </span>
            <div className="flex items-center space-x-7 pr-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span className="w-7 text-right">{col1}</span>
              <span className="w-7 text-right">{col2}</span>
              <span className="w-7 text-right">{col3}</span>
            </div>
          </div>

          {/* Player Rows */}
          {awayLeader || homeLeader ? (
            <div className="space-y-3">
              {/* Away Leader Row */}
              {awayLeader && (
                <div className="flex items-center justify-between">
                  {/* Athlete Avatar + Name + Team/Pos */}
                  <div className="flex items-center space-x-3 truncate pr-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {awayLeader.athlete.headshot ? (
                        <img
                          src={awayLeader.athlete.headshot}
                          alt={awayLeader.athlete.displayName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-gray-500">
                          {awayLeader.athlete.jersey || '#'}
                        </span>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {awayLeader.athlete.displayName}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium">
                        {awayLeader.teamAbbreviation}
                        {awayLeader.athlete.jersey ? ` | #${awayLeader.athlete.jersey}` : ''}
                        {awayLeader.athlete.position ? ` | ${awayLeader.athlete.position}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Stat Numbers */}
                  <div className="flex items-center space-x-7 pr-3 text-xs sm:text-sm font-black text-gray-900 shrink-0">
                    <span className="w-7 text-right">{awayLeader.stat1}</span>
                    <span className="w-7 text-right">{awayLeader.stat2}</span>
                    <span className="w-7 text-right">{awayLeader.stat3}</span>
                  </div>
                </div>
              )}

              {/* Home Leader Row */}
              {homeLeader && (
                <div className="flex items-center justify-between">
                  {/* Athlete Avatar + Name + Team/Pos */}
                  <div className="flex items-center space-x-3 truncate pr-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {homeLeader.athlete.headshot ? (
                        <img
                          src={homeLeader.athlete.headshot}
                          alt={homeLeader.athlete.displayName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-gray-500">
                          {homeLeader.athlete.jersey || '#'}
                        </span>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {homeLeader.athlete.displayName}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium">
                        {homeLeader.teamAbbreviation}
                        {homeLeader.athlete.jersey ? ` | #${homeLeader.athlete.jersey}` : ''}
                        {homeLeader.athlete.position ? ` | ${homeLeader.athlete.position}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Stat Numbers */}
                  <div className="flex items-center space-x-7 pr-3 text-xs sm:text-sm font-black text-gray-900 shrink-0">
                    <span className="w-7 text-right">{homeLeader.stat1}</span>
                    <span className="w-7 text-right">{homeLeader.stat2}</span>
                    <span className="w-7 text-right">{homeLeader.stat3}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400">
              Player statistics and leaders will be updated at tipoff.
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
