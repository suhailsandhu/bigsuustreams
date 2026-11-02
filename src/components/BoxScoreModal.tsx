import React, { useEffect, useState } from 'react';
import { X, Play, RefreshCw, AlertCircle } from 'lucide-react';
import type { ScoreboardGame, GameSummaryResponse } from '../types/scoreboard.ts';
import { fetchGameSummary } from '../services/api.ts';

interface BoxScoreModalProps {
  game: ScoreboardGame | null;
  onClose: () => void;
  onWatchGame?: (game: ScoreboardGame) => void;
}

export const BoxScoreModal: React.FC<BoxScoreModalProps> = ({
  game,
  onClose,
  onWatchGame
}) => {
  const [summary, setSummary] = useState<GameSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'away' | 'home'>('away');

  useEffect(() => {
    if (!game || !game.espnId) return;
    setLoading(true);
    setError(null);

    fetchGameSummary(game.espnId)
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Boxscore fetch error:', err);
        setError('Detailed boxscore statistics not yet posted for this matchup.');
        setLoading(false);
      });
  }, [game]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!game) return null;

  const awayTeam = summary?.boxscore?.away || {
    team: { id: game.awayTeam.id, displayName: game.awayTeam.displayName, logo: game.awayTeam.logo, record: game.awayTeam.record },
    score: game.awayTeam.score,
    linescores: (game.awayTeam.linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? l ?? '0', 10)),
    statLabels: ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT'],
    athletes: []
  };

  const homeTeam = summary?.boxscore?.home || {
    team: { id: game.homeTeam.id, displayName: game.homeTeam.displayName, logo: game.homeTeam.logo, record: game.homeTeam.record },
    score: game.homeTeam.score,
    linescores: (game.homeTeam.linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? l ?? '0', 10)),
    statLabels: ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT'],
    athletes: []
  };

  const currentTeamBox = activeTab === 'away' ? awayTeam : homeTeam;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-gray-200">
        
        {/* ========================================================= */}
        {/* 1. REDESIGNED MODAL HEADER (Spacious, Uncrowded)          */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-white">
          <div className="flex items-start justify-between gap-3">
            {/* Matchup & Status on the left */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {game.awayTeam.name || game.awayTeam.displayName} vs {game.homeTeam.name || game.homeTeam.displayName}
                </h3>
                {game.status?.detail && (
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    game.status.isLive
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : 'bg-gray-100 text-gray-600 border border-gray-200/60'
                  }`}>
                    {game.status.shortDetail || game.status.detail}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 font-normal">
                Official NBA Box Score & Player Stats
              </p>
            </div>

            {/* Actions on the right: Stream & Close (X) */}
            <div className="flex items-center space-x-2 shrink-0">
              {game.stream?.available && onWatchGame && (
                <button
                  onClick={() => {
                    onClose();
                    onWatchGame(game);
                  }}
                  className="flex items-center space-x-1.5 bg-black hover:bg-neutral-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Stream</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition flex items-center justify-center cursor-pointer active:scale-95"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. SCROLLABLE BODY CONTENT                                */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          
          {/* Quarter-by-Quarter Scoreboard (Compact Linescore) */}
          <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-2.5 sm:p-3 overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse min-w-[280px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-200/60 font-medium uppercase text-[10px]">
                  <th className="text-left py-1 px-2 font-semibold text-gray-500 min-w-[90px]">Team</th>
                  <th className="py-1 px-1.5 min-w-[26px]">Q1</th>
                  <th className="py-1 px-1.5 min-w-[26px]">Q2</th>
                  <th className="py-1 px-1.5 min-w-[26px]">Q3</th>
                  <th className="py-1 px-1.5 min-w-[26px]">Q4</th>
                  {awayTeam.linescores.length > 4 && <th className="py-1 px-1.5 min-w-[26px]">OT</th>}
                  <th className="py-1 px-2 text-right font-bold text-gray-900 min-w-[34px]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                <tr>
                  <td className="text-left py-1.5 px-2 font-semibold text-gray-900 flex items-center space-x-1.5">
                    {awayTeam.team.logo && <img src={awayTeam.team.logo} className="w-3.5 h-3.5 object-contain shrink-0" alt="" />}
                    <span className="truncate">{awayTeam.team.displayName}</span>
                  </td>
                  <td className="py-1.5 px-1.5 tabular-nums text-gray-500">{awayTeam.linescores[0] ?? '-'}</td>
                  <td className="py-1.5 px-1.5 tabular-nums text-gray-500">{awayTeam.linescores[1] ?? '-'}</td>
                  <td className="py-1.5 px-1.5 tabular-nums text-gray-500">{awayTeam.linescores[2] ?? '-'}</td>
                  <td className="py-1.5 px-1.5 tabular-nums text-gray-500">{awayTeam.linescores[3] ?? '-'}</td>
                  {awayTeam.linescores.length > 4 && (
                    <td className="py-1.5 px-1.5 tabular-nums text-gray-500">{awayTeam.linescores[4]}</td>
                  )}
                  <td className="py-1.5 px-2 text-right font-bold tabular-nums text-gray-900">
                    {awayTeam.score}
                  </td>
                </tr>
                <tr>
                  <td className="text-left py-1.5 px-2 font-semibold text-gray-900 flex items-center space-x-1.5">
                    {homeTeam.team.logo && <img src={homeTeam.team.logo} className="w-3.5 h-3.5 object-contain shrink-0" alt="" />}
                    <span className="truncate">{homeTeam.team.displayName}</span>
                  </td>
                  <td className="py-1.5 px-1.5 tabular-nums text-gray-500">{homeTeam.linescores[0] ?? '-'}</td>
                  <td className="py-1.5 px-1.5 tabular-nums text-gray-500">{homeTeam.linescores[1] ?? '-'}</td>
                  <td className="py-1.5 px-1.5 tabular-nums text-gray-500">{homeTeam.linescores[2] ?? '-'}</td>
                  <td className="py-1.5 px-1.5 tabular-nums text-gray-500">{homeTeam.linescores[3] ?? '-'}</td>
                  {homeTeam.linescores.length > 4 && (
                    <td className="py-1.5 px-1.5 tabular-nums text-gray-500">{homeTeam.linescores[4]}</td>
                  )}
                  <td className="py-1.5 px-2 text-right font-bold tabular-nums text-gray-900">
                    {homeTeam.score}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Team Switcher Tabs: Balanced 50/50 iOS Segmented Control */}
          <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/60">
            <button
              onClick={() => setActiveTab('away')}
              className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer truncate ${
                activeTab === 'away'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {awayTeam.team.logo && <img src={awayTeam.team.logo} className="w-4 h-4 object-contain shrink-0" alt="" />}
              <span className="truncate">{awayTeam.team.displayName}</span>
            </button>

            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer truncate ${
                activeTab === 'home'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {homeTeam.team.logo && <img src={homeTeam.team.logo} className="w-4 h-4 object-contain shrink-0" alt="" />}
              <span className="truncate">{homeTeam.team.displayName}</span>
            </button>
          </div>

          {/* Player Statistics Table (Sticky Player Name + Smooth Horizontal Stats Swipe) */}
          {loading ? (
            <div className="h-44 flex flex-col items-center justify-center space-y-2 text-gray-400 text-xs">
              <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
              <span>Loading player box score...</span>
            </div>
          ) : error ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
              <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
              <p className="text-xs text-amber-800 font-medium">{error}</p>
            </div>
          ) : currentTeamBox.athletes.length > 0 ? (
            <div
              className="border border-gray-200/80 rounded-xl overflow-x-auto touch-pan-x shadow-2xs"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <table className="w-full text-left text-xs border-collapse min-w-[560px]">
                <thead>
                  <tr className="bg-gray-50/95 border-b border-gray-200/80 text-gray-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3 font-semibold sticky left-0 bg-gray-50 z-20 min-w-[175px] sm:min-w-[200px] shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                      Player
                    </th>
                    {currentTeamBox.statLabels.map((lbl, idx) => (
                      <th
                        key={lbl}
                        className={`py-2.5 px-2.5 text-right font-semibold ${
                          idx === 1 ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {lbl}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {currentTeamBox.athletes.map((ath) => (
                    <tr key={ath.athlete.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Sticky Player Name Column: Widen so full names never truncate */}
                      <td className="py-2 px-3 font-semibold text-gray-900 flex items-center space-x-2.5 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.04)] min-w-[175px] sm:min-w-[200px]">
                        {ath.athlete.headshot ? (
                          <img
                            src={ath.athlete.headshot}
                            className="w-7 h-7 rounded-full object-cover border border-gray-100 shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 shrink-0">
                            {ath.athlete.jersey || '#'}
                          </div>
                        )}
                        <div className="min-w-0 pr-1">
                          <div className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                            {ath.athlete.displayName}
                          </div>
                          <div className="text-[10px] text-gray-400 font-normal">
                            #{ath.athlete.jersey || '-'} • {ath.athlete.position || '-'}
                          </div>
                        </div>
                      </td>

                      {/* Stat Values with Tabular Numerals */}
                      {ath.stats.map((val, idx) => (
                        <td
                          key={idx}
                          className={`py-2 px-2.5 text-right tabular-nums text-xs whitespace-nowrap ${
                            idx === 1 ? 'font-bold text-gray-900' : 'text-gray-600'
                          }`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              Live box score player stats will update dynamically as the game progresses.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
