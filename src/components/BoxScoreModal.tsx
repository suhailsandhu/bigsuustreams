import React, { useEffect, useState } from 'react';
import { X, Play, RefreshCw } from 'lucide-react';
import type { ScoreboardGame, GameSummaryResponse } from '../types/scoreboard.ts';
import { fetchGameSummary, fetchNflGameSummary } from '../services/api.ts';

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

  // Helper to parse numeric value from stat string (e.g. "36:12" for minutes or standard numbers)
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

    const isNfl = game.league === 'NFL';
    const fetchFn = isNfl ? fetchNflGameSummary : fetchGameSummary;

    fetchFn(game.espnId)
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Boxscore fetch error:', err);
        setError('Detailed box score statistics not yet posted for this matchup.');
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
    team: { id: game.awayTeam.id, displayName: game.awayTeam.displayName, name: game.awayTeam.name, logo: game.awayTeam.logo, record: game.awayTeam.record },
    score: game.awayTeam.score,
    linescores: (game.awayTeam.linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? l ?? '0', 10)),
    statLabels: ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT', 'TO', 'STL', 'BLK', 'PF', '+/-'],
    athletes: []
  };

  const homeTeam = summary?.boxscore?.home || {
    team: { id: game.homeTeam.id, displayName: game.homeTeam.displayName, name: game.homeTeam.name, logo: game.homeTeam.logo, record: game.homeTeam.record },
    score: game.homeTeam.score,
    linescores: (game.homeTeam.linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? l ?? '0', 10)),
    statLabels: ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT', 'TO', 'STL', 'BLK', 'PF', '+/-'],
    athletes: []
  };

  const currentTeamBox = activeTab === 'away' ? awayTeam : homeTeam;
  const isFinal = game.status.state === 'post';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-gray-200">
        
        {/* ========================================================= */}
        {/* 1. MODAL HEADER: Matchup using 'at' & Clear Status        */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-white">
          <div className="flex items-start justify-between gap-3">
            {/* Matchup & Status: Away at Home */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h3 className="text-sm sm:text-lg font-black text-gray-900 tracking-tight">
                  {game.awayTeam.name || game.awayTeam.displayName} <span className="text-gray-400 font-semibold text-xs sm:text-sm">at</span> {game.homeTeam.name || game.homeTeam.displayName}
                </h3>
                {game.status?.detail && (
                  <span className={`text-[10px] sm:text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    game.status.isLive
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : isFinal
                      ? 'bg-gray-100 text-gray-700 font-extrabold border border-gray-200/80'
                      : 'bg-gray-100 text-gray-600 border border-gray-200/80'
                  }`}>
                    {game.status.shortDetail || game.status.detail}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                {game.league === 'NFL' ? 'Official NFL Box Score & Player Stats' : 'Official NBA Box Score & Player Stats'}
              </p>
            </div>

            {/* Actions: Stream & Close Button */}
            <div className="flex items-center space-x-2 shrink-0">
              {game.stream?.available && onWatchGame && (
                <button
                  onClick={() => {
                    onClose();
                    onWatchGame(game);
                  }}
                  className="flex items-center space-x-1.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-2xs transition active:scale-95 cursor-pointer"
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
          
          {/* Quarter-by-Quarter Linescore Table */}
          <div className="bg-gray-50/90 border border-gray-200/80 rounded-2xl p-3 sm:p-4 overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse min-w-[280px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-200/80 font-bold uppercase text-[10px] sm:text-[11px]">
                  <th className="text-left py-1.5 px-2 font-semibold text-gray-500 min-w-[120px]">Team</th>
                  <th className="py-1.5 px-1.5 min-w-[28px]">Q1</th>
                  <th className="py-1.5 px-1.5 min-w-[28px]">Q2</th>
                  <th className="py-1.5 px-1.5 min-w-[28px]">Q3</th>
                  <th className="py-1.5 px-1.5 min-w-[28px]">Q4</th>
                  {awayTeam.linescores.length > 4 && <th className="py-1.5 px-1.5 min-w-[28px]">OT</th>}
                  <th className="py-1.5 px-2 text-right font-black text-gray-900 min-w-[36px]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {/* Away Team Row */}
                <tr>
                  <td className="text-left py-2 px-2 font-bold text-gray-900 flex items-center space-x-2">
                    {awayTeam.team.logo && (
                      <img src={awayTeam.team.logo} className="w-5 h-5 object-contain shrink-0" alt="" />
                    )}
                    <span className="truncate">{(awayTeam.team as any).name || awayTeam.team.displayName}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase bg-gray-200/60 px-1 py-0.5 rounded shrink-0">
                      AWAY
                    </span>
                  </td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{awayTeam.linescores[0] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{awayTeam.linescores[1] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{awayTeam.linescores[2] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{awayTeam.linescores[3] ?? '-'}</td>
                  {awayTeam.linescores.length > 4 && (
                    <td className="py-2 px-1.5 tabular-nums text-gray-500">{awayTeam.linescores[4]}</td>
                  )}
                  <td className={`py-2 px-2 text-right font-black tabular-nums text-sm ${
                    isFinal && game.awayTeam.winner ? 'text-gray-900' : isFinal ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {awayTeam.score}
                  </td>
                </tr>

                {/* Home Team Row */}
                <tr>
                  <td className="text-left py-2 px-2 font-bold text-gray-900 flex items-center space-x-2">
                    {homeTeam.team.logo && (
                      <img src={homeTeam.team.logo} className="w-5 h-5 object-contain shrink-0" alt="" />
                    )}
                    <span className="truncate">{(homeTeam.team as any).name || homeTeam.team.displayName}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase bg-gray-200/60 px-1 py-0.5 rounded shrink-0">
                      HOME
                    </span>
                  </td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{homeTeam.linescores[0] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{homeTeam.linescores[1] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{homeTeam.linescores[2] ?? '-'}</td>
                  <td className="py-2 px-1.5 tabular-nums text-gray-500">{homeTeam.linescores[3] ?? '-'}</td>
                  {homeTeam.linescores.length > 4 && (
                    <td className="py-2 px-1.5 tabular-nums text-gray-500">{homeTeam.linescores[4]}</td>
                  )}
                  <td className={`py-2 px-2 text-right font-black tabular-nums text-sm ${
                    isFinal && game.homeTeam.winner ? 'text-gray-900' : isFinal ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {homeTeam.score}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Balanced 50/50 Team Segmented Control Tabs */}
          <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200/70">
            <button
              onClick={() => setActiveTab('away')}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer truncate ${
                activeTab === 'away'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {awayTeam.team.logo && (
                <img src={awayTeam.team.logo} className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" alt="" />
              )}
              <span className="truncate">{(awayTeam.team as any).name || awayTeam.team.displayName}</span>
            </button>

            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer truncate ${
                activeTab === 'home'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {homeTeam.team.logo && (
                <img src={homeTeam.team.logo} className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" alt="" />
              )}
              <span className="truncate">{(homeTeam.team as any).name || homeTeam.team.displayName}</span>
            </button>
          </div>

          {/* Player Statistics Table (Sticky Player Name + Smooth Horizontal Stats Swipe) */}
          {loading ? (
            <div className="h-44 flex flex-col items-center justify-center space-y-2 text-gray-400 text-xs">
              <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
              <span>Loading player box score...</span>
            </div>
          ) : error && currentTeamBox.athletes.length === 0 ? (
            /* For upcoming games without box score, leave area completely empty per user instruction */
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
                      {/* Sticky Player Column: Wide enough so player names never truncate */}
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
                            #{ath.athlete.jersey || '-'} • {ath.athlete.position || '-'}
                          </div>
                        </div>
                      </td>

                      {/* Stat Values with Tabular Numerals & Leader Highlighting */}
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
            /* Upcoming game empty state per user request: leave that area empty */
            null
          )}
        </div>
      </div>
    </div>
  );
};
