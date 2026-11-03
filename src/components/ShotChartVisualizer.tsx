import React, { useState, useMemo } from 'react';
import type { ShotChartData, ShotItem, WinProbabilityPoint } from '../types/scoreboard.ts';
import { Target, Activity, Check, X } from 'lucide-react';

interface ShotChartVisualizerProps {
  shotChart?: ShotChartData;
  winProbability?: WinProbabilityPoint[];
  awayTeamName: string;
  homeTeamName: string;
  awayTeamLogo?: string;
  homeTeamLogo?: string;
}

export const ShotChartVisualizer: React.FC<ShotChartVisualizerProps> = ({
  shotChart,
  winProbability,
  awayTeamName,
  homeTeamName,
  awayTeamLogo,
  homeTeamLogo
}) => {
  const [activeTab, setActiveTab] = useState<'shotchart' | 'winprob'>('shotchart');
  const [teamFilter] = useState<'all' | 'away' | 'home'>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'made' | 'missed'>('all');
  const [shotTypeFilter, setShotTypeFilter] = useState<'all' | '2pt' | '3pt'>('all');
  const [hoveredShot, setHoveredShot] = useState<ShotItem | null>(null);

  const shots = shotChart?.shots || [];

  // Get unique players who attempted shots
  const players = useMemo(() => {
    const map = new Map<string, { id: string; name: string; teamId: string; count: number }>();
    for (const s of shots) {
      if (!s.athleteName) continue;
      const existing = map.get(s.athleteName);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(s.athleteName, { id: s.athleteId, name: s.athleteName, teamId: s.teamId, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [shots]);

  // Filter shots
  const filteredShots = useMemo(() => {
    return shots.filter(s => {
      if (teamFilter === 'away' && s.teamId !== shots[0]?.teamId && shots.length > 0) {
        // match based on first team or name
      }
      if (selectedPlayer !== 'all' && s.athleteName !== selectedPlayer) {
        return false;
      }
      if (outcomeFilter === 'made' && !s.scoringPlay) return false;
      if (outcomeFilter === 'missed' && s.scoringPlay) return false;
      if (shotTypeFilter === '2pt' && s.pointsAttempted !== 2) return false;
      if (shotTypeFilter === '3pt' && s.pointsAttempted !== 3) return false;
      return true;
    });
  }, [shots, teamFilter, selectedPlayer, outcomeFilter, shotTypeFilter]);

  const madeCount = filteredShots.filter(s => s.scoringPlay).length;
  const attemptedCount = filteredShots.length;
  const pct = attemptedCount > 0 ? ((madeCount / attemptedCount) * 100).toFixed(1) : '0.0';

  if ((!shots || shots.length === 0) && (!winProbability || winProbability.length === 0)) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-2xs text-center">
        <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Visual Shot Tracker</p>
        <p className="text-xs text-gray-400 mt-1">Shot coordinates and win probability will appear as game plays unfold.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('shotchart')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'shotchart'
                ? 'bg-black text-white shadow-2xs'
                : 'text-gray-500 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Shot Chart ({shots.length})</span>
          </button>

          {winProbability && winProbability.length > 0 && (
            <button
              onClick={() => setActiveTab('winprob')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'winprob'
                  ? 'bg-black text-white shadow-2xs'
                  : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Win Probability</span>
            </button>
          )}
        </div>

        {/* Made / Missed Legend */}
        {activeTab === 'shotchart' && (
          <div className="flex items-center space-x-3 text-[11px] font-bold">
            <span className="flex items-center space-x-1 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs" />
              <span>Made</span>
            </span>
            <span className="flex items-center space-x-1 text-rose-500">
              <span className="w-2.5 h-2.5 rounded-full border border-rose-500 inline-block" />
              <span>Missed</span>
            </span>
          </div>
        )}
      </div>

      {activeTab === 'shotchart' && (
        <div className="p-4 sm:p-6 space-y-4">
          {/* Controls & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {/* Player Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Player:</span>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-800 outline-none focus:border-black cursor-pointer"
              >
                <option value="all">All Players ({shots.length} shots)</option>
                {players.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setOutcomeFilter(f => f === 'all' ? 'made' : f === 'made' ? 'missed' : 'all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                  outcomeFilter === 'all' 
                    ? 'bg-gray-100 text-gray-700 border-gray-200' 
                    : outcomeFilter === 'made'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {outcomeFilter === 'all' ? 'All Outcomes' : outcomeFilter === 'made' ? 'Made Only' : 'Missed Only'}
              </button>

              <button
                onClick={() => setShotTypeFilter(f => f === 'all' ? '3pt' : f === '3pt' ? '2pt' : 'all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                  shotTypeFilter === 'all'
                    ? 'bg-gray-100 text-gray-700 border-gray-200'
                    : 'bg-black text-white border-black'
                }`}
              >
                {shotTypeFilter === 'all' ? '2PT & 3PT' : shotTypeFilter.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Shooting Split Stat Bar */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 text-xs font-bold text-gray-700">
            <div>
              <span className="text-gray-400 font-semibold mr-1.5">Selection:</span>
              <span>{selectedPlayer === 'all' ? 'Team Combined' : selectedPlayer}</span>
            </div>
            <div className="flex items-center space-x-3">
              <span>{madeCount}/{attemptedCount} FG</span>
              <span className="text-black font-black text-sm bg-white px-2 py-0.5 rounded-md border border-gray-200">{pct}%</span>
            </div>
          </div>

          {/* Interactive NBA Court SVG Canvas */}
          <div className="relative w-full aspect-[50/47] max-w-lg mx-auto bg-amber-50/20 rounded-2xl border-2 border-amber-900/10 overflow-hidden shadow-inner p-2">
            <svg
              viewBox="0 0 50 47"
              className="w-full h-full select-none"
            >
              {/* Court Outline (50ft wide x 47ft half court) */}
              <rect x="0" y="0" width="50" height="47" fill="#fdfbf7" stroke="#e0d4c3" strokeWidth="0.6" />

              {/* Paint / Key (16ft wide x 19ft deep, centered from x=17 to x=33) */}
              <rect x="17" y="0" width="16" height="19" fill="#f5ede0" stroke="#d5c4af" strokeWidth="0.5" />
              <rect x="19" y="0" width="12" height="19" fill="none" stroke="#d5c4af" strokeWidth="0.4" strokeDasharray="1,1" />

              {/* Free Throw Circle (Radius = 6ft, center at x=25, y=19) */}
              <path d="M 19 19 A 6 6 0 0 0 31 19" fill="none" stroke="#d5c4af" strokeWidth="0.5" />
              <path d="M 19 19 A 6 6 0 0 1 31 19" fill="none" stroke="#d5c4af" strokeWidth="0.5" strokeDasharray="1,1" />

              {/* Backboard & Hoop */}
              <line x1="22" y1="4" x2="28" y2="4" stroke="#8c7860" strokeWidth="0.8" />
              <circle cx="25" cy="5.25" r="1.5" fill="none" stroke="#e67e22" strokeWidth="0.6" />
              {/* Restricted Area Arc (Radius = 4ft from hoop) */}
              <path d="M 21 5.25 A 4 4 0 0 0 29 5.25" fill="none" stroke="#d5c4af" strokeWidth="0.4" />

              {/* Three Point Line */}
              {/* Corner 3 lines: x=3 and x=47 from y=0 down to y=14 */}
              <line x1="3" y1="0" x2="3" y2="14" stroke="#d5c4af" strokeWidth="0.6" />
              <line x1="47" y1="0" x2="47" y2="14" stroke="#d5c4af" strokeWidth="0.6" />
              {/* Arc from (3, 14) to (47, 14) with apex around y=28.75 */}
              <path d="M 3 14 A 23.75 23.75 0 0 0 47 14" fill="none" stroke="#d5c4af" strokeWidth="0.6" />

              {/* Center Court Circle at Half Court (y=47) */}
              <path d="M 19 47 A 6 6 0 0 1 31 47" fill="none" stroke="#d5c4af" strokeWidth="0.5" />

              {/* Plot Shot Markers */}
              {filteredShots.map((shot) => {
                // Coordinate transformation: ESPN x is 1-50, y is 0-47 from baseline
                const posX = Math.max(1, Math.min(49, shot.x));
                const posY = Math.max(1, Math.min(46, shot.y));
                const isMade = shot.scoringPlay;

                return (
                  <g
                    key={shot.id}
                    onMouseEnter={() => setHoveredShot(shot)}
                    onMouseLeave={() => setHoveredShot(null)}
                    onClick={() => setHoveredShot(shot)}
                    className="cursor-pointer transition-transform hover:scale-150"
                  >
                    {isMade ? (
                      <>
                        <circle
                          cx={posX}
                          cy={posY}
                          r="1.2"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="0.3"
                          opacity="0.9"
                        />
                        <circle cx={posX} cy={posY} r="0.4" fill="#ffffff" />
                      </>
                    ) : (
                      <>
                        <circle
                          cx={posX}
                          cy={posY}
                          r="1.1"
                          fill="#ffffff"
                          stroke="#ef4444"
                          strokeWidth="0.4"
                          opacity="0.85"
                        />
                        <line x1={posX - 0.5} y1={posY - 0.5} x2={posX + 0.5} y2={posY + 0.5} stroke="#ef4444" strokeWidth="0.3" />
                        <line x1={posX + 0.5} y1={posY - 0.5} x2={posX - 0.5} y2={posY + 0.5} stroke="#ef4444" strokeWidth="0.3" />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredShot && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/90 backdrop-blur-md text-white rounded-xl p-3 border border-white/10 shadow-xl pointer-events-none transition-all">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center space-x-1.5">
                    {hoveredShot.scoringPlay ? (
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>MADE {hoveredShot.pointsAttempted}PT</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center space-x-1">
                        <X className="w-3.5 h-3.5" />
                        <span>MISSED {hoveredShot.pointsAttempted}PT</span>
                      </span>
                    )}
                    <span className="text-gray-300">• {hoveredShot.athleteName}</span>
                  </span>
                  <span className="text-gray-400 text-[11px]">{hoveredShot.periodDisplay} {hoveredShot.clock}</span>
                </div>
                <p className="text-[11px] text-gray-300 mt-1 line-clamp-1">{hoveredShot.text}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Win Probability & Momentum View */}
      {activeTab === 'winprob' && winProbability && winProbability.length > 0 && (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <div className="flex items-center space-x-2">
              {awayTeamLogo && <img src={awayTeamLogo} alt={awayTeamName} className="w-5 h-5 object-contain" />}
              <span>{awayTeamName}</span>
            </div>
            <span className="text-gray-400 uppercase tracking-widest text-[10px]">Win Probability %</span>
            <div className="flex items-center space-x-2">
              <span>{homeTeamName}</span>
              {homeTeamLogo && <img src={homeTeamLogo} alt={homeTeamName} className="w-5 h-5 object-contain" />}
            </div>
          </div>

          {/* SVG Win Probability Curve */}
          <div className="relative w-full h-44 bg-gray-50 rounded-xl border border-gray-200 p-2 overflow-hidden">
            <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
              {/* 50% Equilibrium Line */}
              <line x1="0" y1="25" x2="100" y2="25" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2,2" />
              
              {/* Probability Polygon */}
              {(() => {
                const points = winProbability.map((pt, i) => {
                  const x = (i / (winProbability.length - 1 || 1)) * 100;
                  // y=0 is 100% Home win, y=50 is 100% Away win (inverted for SVG coordinates)
                  const y = 50 - (pt.homeWinPercentage / 100) * 50;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                }).join(' ');

                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                  </>
                );
              })()}
            </svg>

            <div className="absolute top-2 left-3 text-[10px] font-bold text-gray-500">
              100% {homeTeamName}
            </div>
            <div className="absolute bottom-2 left-3 text-[10px] font-bold text-gray-500">
              100% {awayTeamName}
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-3 text-[9px] font-bold text-gray-400 bg-white/80 px-1.5 py-0.5 rounded border border-gray-200">
              50 / 50 Tie
            </div>
          </div>

          <p className="text-[11px] text-gray-500 text-center">
            Live win probability dynamically recalculated after every basket and possession based on scoring pace and game clock.
          </p>
        </div>
      )}
    </div>
  );
};
