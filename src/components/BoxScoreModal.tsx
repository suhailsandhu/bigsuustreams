import React, { useEffect, useState } from 'react';
import { X, Play, Trophy, AlertCircle, RefreshCw } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-4xl bg-white border border-gray-300 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-xs">
              <Trophy className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-black text-gray-900">
                  {game.awayTeam.displayName} vs {game.homeTeam.displayName}
                </h3>
                <span className="text-[10px] font-bold text-orange-700 uppercase bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                  {game.status.detail || 'Box Score'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Official NBA Statistics & Player Performance
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {game.stream?.available && onWatchGame && (
              <button
                onClick={() => {
                  onClose();
                  onWatchGame(game);
                }}
                className="flex items-center space-x-1.5 bg-black hover:bg-neutral-800 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Watch Stream</span>
                <span className="sm:hidden">Stream</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors border border-gray-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Quarter by Quarter Scoreboard Breakdown */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200 font-bold uppercase">
                  <th className="text-left py-2 px-3 font-semibold">Team</th>
                  <th className="py-2 px-2">Q1</th>
                  <th className="py-2 px-2">Q2</th>
                  <th className="py-2 px-2">Q3</th>
                  <th className="py-2 px-2">Q4</th>
                  {awayTeam.linescores.length > 4 && <th className="py-2 px-2">OT</th>}
                  <th className="py-2 px-3 text-right font-black text-gray-900">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-semibold text-gray-700">
                <tr>
                  <td className="text-left py-2.5 px-3 font-bold text-gray-900 flex items-center space-x-2">
                    {awayTeam.team.logo && <img src={awayTeam.team.logo} className="w-4 h-4 object-contain" alt="" />}
                    <span>{awayTeam.team.displayName}</span>
                  </td>
                  <td className="py-2.5 px-2">{awayTeam.linescores[0] ?? '-'}</td>
                  <td className="py-2.5 px-2">{awayTeam.linescores[1] ?? '-'}</td>
                  <td className="py-2.5 px-2">{awayTeam.linescores[2] ?? '-'}</td>
                  <td className="py-2.5 px-2">{awayTeam.linescores[3] ?? '-'}</td>
                  {awayTeam.linescores.length > 4 && (
                    <td className="py-2.5 px-2">{awayTeam.linescores[4]}</td>
                  )}
                  <td className="py-2.5 px-3 text-right font-black text-base text-gray-900">
                    {awayTeam.score}
                  </td>
                </tr>
                <tr>
                  <td className="text-left py-2.5 px-3 font-bold text-gray-900 flex items-center space-x-2">
                    {homeTeam.team.logo && <img src={homeTeam.team.logo} className="w-4 h-4 object-contain" alt="" />}
                    <span>{homeTeam.team.displayName}</span>
                  </td>
                  <td className="py-2.5 px-2">{homeTeam.linescores[0] ?? '-'}</td>
                  <td className="py-2.5 px-2">{homeTeam.linescores[1] ?? '-'}</td>
                  <td className="py-2.5 px-2">{homeTeam.linescores[2] ?? '-'}</td>
                  <td className="py-2.5 px-2">{homeTeam.linescores[3] ?? '-'}</td>
                  {homeTeam.linescores.length > 4 && (
                    <td className="py-2.5 px-2">{homeTeam.linescores[4]}</td>
                  )}
                  <td className="py-2.5 px-3 text-right font-black text-base text-gray-900">
                    {homeTeam.score}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Team Switcher Tabs */}
          <div className="flex items-center space-x-3 border-b border-gray-200 pb-3">
            <button
              onClick={() => setActiveTab('away')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'away'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {awayTeam.team.logo && <img src={awayTeam.team.logo} className="w-4 h-4 object-contain" alt="" />}
              <span>{awayTeam.team.displayName}</span>
            </button>

            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {homeTeam.team.logo && <img src={homeTeam.team.logo} className="w-4 h-4 object-contain" alt="" />}
              <span>{homeTeam.team.displayName}</span>
            </button>
          </div>

          {/* Player Statistics Table */}
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-orange-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <p className="text-xs text-amber-800 font-semibold">{error}</p>
            </div>
          ) : currentTeamBox.athletes.length > 0 ? (
            <div className="border border-gray-200 rounded-xl overflow-x-auto touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-left text-xs border-collapse min-w-[560px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3 sm:px-4 font-semibold sticky left-0 bg-gray-50 z-10 min-w-[140px] sm:min-w-[180px] shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                      Player
                    </th>
                    {currentTeamBox.statLabels.map((lbl) => (
                      <th key={lbl} className="py-2.5 px-2.5 text-right font-bold">{lbl}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {currentTeamBox.athletes.map((ath) => (
                    <tr key={ath.athlete.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3 sm:px-4 font-bold text-gray-900 flex items-center space-x-2 sm:space-x-2.5 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        {ath.athlete.headshot ? (
                          <img src={ath.athlete.headshot} className="w-6 h-6 rounded-full object-cover border border-gray-200 shrink-0" alt="" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                            {ath.athlete.jersey || '#'}
                          </div>
                        )}
                        <div className="min-w-0 truncate">
                          <div className="truncate text-xs font-bold text-gray-900">{ath.athlete.displayName}</div>
                          <div className="text-[10px] text-gray-400 font-normal truncate">
                            #{ath.athlete.jersey} • {ath.athlete.position}
                          </div>
                        </div>
                      </td>
                      {ath.stats.map((val, idx) => (
                        <td key={idx} className={`py-2.5 px-2.5 text-right font-medium text-xs whitespace-nowrap ${idx === 1 ? 'font-black text-gray-900' : 'text-gray-700'}`}>
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
