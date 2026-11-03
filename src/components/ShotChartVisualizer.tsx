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
  const [teamFilter, setTeamFilter] = useState<'all' | 'away' | 'home'>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'made' | 'missed'>('all');
  const [shotTypeFilter, setShotTypeFilter] = useState<'all' | '2pt' | '3pt'>('all');
  const [hoveredShot, setHoveredShot] = useState<ShotItem | null>(null);

  const rawShots = shotChart?.shots || [];

  // Determine home vs away team ID based on first plays or names
  const firstShotTeamId = rawShots[0]?.teamId;

  // Filter shots based on active selectors
  const filteredShots = useMemo(() => {
    return rawShots.filter((s) => {
      // 1. Team filter
      if (teamFilter === 'away' && firstShotTeamId && s.teamId !== firstShotTeamId) {
        return false;
      }
      if (teamFilter === 'home' && firstShotTeamId && s.teamId === firstShotTeamId) {
        return false;
      }

      // 2. Player filter
      if (selectedPlayer !== 'all' && s.athleteName !== selectedPlayer) {
        return false;
      }

      // 3. Outcome filter
      if (outcomeFilter === 'made' && !s.scoringPlay) return false;
      if (outcomeFilter === 'missed' && s.scoringPlay) return false;

      // 4. Shot type filter
      if (shotTypeFilter === '2pt' && s.pointsAttempted !== 2) return false;
      if (shotTypeFilter === '3pt' && s.pointsAttempted !== 3) return false;

      return true;
    });
  }, [rawShots, teamFilter, selectedPlayer, outcomeFilter, shotTypeFilter, firstShotTeamId]);

  // Player selector list sorted by shot attempts
  const players = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const s of rawShots) {
      if (!s.athleteName) continue;
      const existing = map.get(s.athleteName);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(s.athleteName, { id: s.athleteId, name: s.athleteName, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [rawShots]);

  // Overall and split statistics
  const totalAttempted = filteredShots.length;
  const totalMade = filteredShots.filter((s) => s.scoringPlay).length;
  const fgPct = totalAttempted > 0 ? ((totalMade / totalAttempted) * 100).toFixed(1) : '0.0';

  const twoPtShots = filteredShots.filter((s) => s.pointsAttempted === 2);
  const twoPtMade = twoPtShots.filter((s) => s.scoringPlay).length;
  const twoPtPct = twoPtShots.length > 0 ? ((twoPtMade / twoPtShots.length) * 100).toFixed(1) : '0.0';

  const threePtShots = filteredShots.filter((s) => s.pointsAttempted === 3);
  const threePtMade = threePtShots.filter((s) => s.scoringPlay).length;
  const threePtPct = threePtShots.length > 0 ? ((threePtMade / threePtShots.length) * 100).toFixed(1) : '0.0';

  if ((!rawShots || rawShots.length === 0) && (!winProbability || winProbability.length === 0)) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-2xs text-center">
        <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Visual Shot Tracker</p>
        <p className="text-xs text-gray-400 mt-1">Shot coordinates and win probability will appear as game plays unfold.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
      {/* Top Header / Mode Switcher */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/70">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('shotchart')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'shotchart'
                ? 'bg-black text-white shadow-2xs'
                : 'text-gray-500 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Interactive Shot Chart</span>
          </button>

          {winProbability && winProbability.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('winprob')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
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

        {/* Legend */}
        {activeTab === 'shotchart' && (
          <div className="flex items-center space-x-3 text-xs font-bold">
            <span className="flex items-center space-x-1 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-200" />
              <span>Made</span>
            </span>
            <span className="flex items-center space-x-1 text-rose-500">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block ring-2 ring-rose-200" />
              <span>Missed</span>
            </span>
          </div>
        )}
      </div>

      {activeTab === 'shotchart' && (
        <div className="p-3 sm:p-5 space-y-3.5">
          {/* Controls Bar: Filters & Player Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {/* Team Filter Pills */}
            <div className="flex items-center space-x-1 bg-gray-100/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTeamFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  teamFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All Shots
              </button>
              <button
                type="button"
                onClick={() => setTeamFilter('away')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  teamFilter === 'away'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {awayTeamLogo && <img src={awayTeamLogo} alt={awayTeamName} className="w-3.5 h-3.5 object-contain" />}
                <span className="truncate max-w-[80px] sm:max-w-none">{awayTeamName}</span>
              </button>
              <button
                type="button"
                onClick={() => setTeamFilter('home')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  teamFilter === 'home'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {homeTeamLogo && <img src={homeTeamLogo} alt={homeTeamName} className="w-3.5 h-3.5 object-contain" />}
                <span className="truncate max-w-[80px] sm:max-w-none">{homeTeamName}</span>
              </button>
            </div>

            {/* Player Selector Dropdown */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-black cursor-pointer shadow-2xs"
              >
                <option value="all">All Players ({rawShots.length} shots)</option>
                {players.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.count} attempts)
                  </option>
                ))}
              </select>
            </div>

            {/* Outcome & Shot Type Pills */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setOutcomeFilter((f) => (f === 'all' ? 'made' : f === 'made' ? 'missed' : 'all'))}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
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
                type="button"
                onClick={() => setShotTypeFilter((f) => (f === 'all' ? '3pt' : f === '3pt' ? '2pt' : 'all'))}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  shotTypeFilter === 'all'
                    ? 'bg-gray-100 text-gray-700 border-gray-200'
                    : 'bg-black text-white border-black'
                }`}
              >
                {shotTypeFilter === 'all' ? '2PT & 3PT' : shotTypeFilter.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Shooting Stats Ribbon */}
          <div className="grid grid-cols-3 gap-2 bg-neutral-900 text-white rounded-xl p-2.5 sm:p-3 shadow-xs text-center">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Total FG</div>
              <div className="text-sm sm:text-base font-black text-white mt-0.5">{fgPct}%</div>
              <div className="text-[10px] text-gray-400">{totalMade}/{totalAttempted}</div>
            </div>
            <div className="border-x border-neutral-700">
              <div className="text-[10px] uppercase font-bold text-gray-400">2-Point FG</div>
              <div className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">{twoPtPct}%</div>
              <div className="text-[10px] text-gray-400">{twoPtMade}/{twoPtShots.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400">3-Point FG</div>
              <div className="text-sm sm:text-base font-black text-amber-400 mt-0.5">{threePtPct}%</div>
              <div className="text-[10px] text-gray-400">{threePtMade}/{threePtShots.length}</div>
            </div>
          </div>

          {/* Authentic Real NBA Hardwood Court Container */}
          <div className="relative w-full aspect-[50/47] max-w-lg mx-auto rounded-2xl overflow-hidden shadow-md border border-amber-950/20 bg-[#d8b07d] select-none">
            <svg
              viewBox="0 0 50 47"
              className="w-full h-full"
            >
              <defs>
                {/* 1. Realistic Hardwood Parquet Plank Pattern */}
                <pattern id="hardwoodMaple" width="50" height="2.5" patternUnits="userSpaceOnUse">
                  <rect x="0" y="0" width="50" height="2.5" fill="#dfbe91" />
                  <line x1="0" y1="0" x2="50" y2="0" stroke="#cfa873" strokeWidth="0.08" />
                  <line x1="12" y1="0" x2="12" y2="2.5" stroke="#cfa873" strokeWidth="0.06" opacity="0.4" />
                  <line x1="28" y1="0" x2="28" y2="2.5" stroke="#cfa873" strokeWidth="0.06" opacity="0.4" />
                  <line x1="42" y1="0" x2="42" y2="2.5" stroke="#cfa873" strokeWidth="0.06" opacity="0.4" />
                </pattern>

                {/* 2. Painted Key Hardwood Texture (Contrasting warm tone) */}
                <linearGradient id="paintFill" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#bf9462" />
                  <stop offset="50%" stopColor="#c89d6a" />
                  <stop offset="100%" stopColor="#bf9462" />
                </linearGradient>

                {/* 3. Drop Shadow Filter for Shot Markers */}
                <filter id="shotShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0.3" stdDeviation="0.4" floodColor="#000000" floodOpacity="0.45" />
                </filter>
                <filter id="hoverGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#ffffff" floodOpacity="0.9" />
                </filter>
              </defs>

              {/* Hardwood Maple Floor Background */}
              <rect x="0" y="0" width="50" height="47" fill="url(#hardwoodMaple)" />

              {/* Subtle Arena Gloss Overlay */}
              <radialGradient id="arenaLight" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
              </radialGradient>
              <rect x="0" y="0" width="50" height="47" fill="url(#arenaLight)" pointerEvents="none" />

              {/* Court Boundary Lines (Official NBA White / Cream) */}
              <rect x="0.25" y="0.25" width="49.5" height="46.5" fill="none" stroke="#ffffff" strokeWidth="0.5" />

              {/* The Painted Key / Free Throw Lane (16ft wide x 19ft deep from baseline y=0 to y=19) */}
              <rect x="17" y="0" width="16" height="19" fill="url(#paintFill)" stroke="#ffffff" strokeWidth="0.5" />

              {/* Key Lane Hash Marks / Rebounding Blocks (at y=7, 8, 11, 14 ft from baseline) */}
              <rect x="16.3" y="7" width="0.7" height="0.6" fill="#ffffff" />
              <rect x="33.0" y="7" width="0.7" height="0.6" fill="#ffffff" />
              <rect x="16.3" y="8" width="0.7" height="0.2" fill="#ffffff" />
              <rect x="33.0" y="8" width="0.7" height="0.2" fill="#ffffff" />
              <rect x="16.3" y="11" width="0.7" height="0.2" fill="#ffffff" />
              <rect x="33.0" y="11" width="0.7" height="0.2" fill="#ffffff" />
              <rect x="16.3" y="14" width="0.7" height="0.2" fill="#ffffff" />
              <rect x="33.0" y="14" width="0.7" height="0.2" fill="#ffffff" />

              {/* Inner 12-foot lane boundary line */}
              <line x1="19" y1="0" x2="19" y2="19" stroke="#ffffff" strokeWidth="0.35" strokeDasharray="1,0.8" opacity="0.8" />
              <line x1="31" y1="0" x2="31" y2="19" stroke="#ffffff" strokeWidth="0.35" strokeDasharray="1,0.8" opacity="0.8" />

              {/* Free Throw Circle (Radius = 6ft, Center at x=25, y=19) */}
              {/* Lower half (towards basket): solid */}
              <path d="M 19 19 A 6 6 0 0 0 31 19" fill="none" stroke="#ffffff" strokeWidth="0.5" />
              {/* Upper half (towards half court): regulation dashed */}
              <path d="M 19 19 A 6 6 0 0 1 31 19" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="1,1" />

              {/* Restricted Area Arc (Radius = 4ft from center of rim x=25, y=5.25) */}
              <path d="M 21 4 L 21 5.25 A 4 4 0 0 0 29 5.25 L 29 4" fill="none" stroke="#ffffff" strokeWidth="0.4" />

              {/* 3-Point Boundary:
                  - Corner 3 sidelines: 3ft from sideline (x=3 and x=47), extending from y=0 to y=14
                  - 23.75ft Arc centered at rim (x=25, y=5.25) from (3, 14) to (47, 14)
              */}
              <line x1="3" y1="0" x2="3" y2="14" stroke="#ffffff" strokeWidth="0.55" />
              <line x1="47" y1="0" x2="47" y2="14" stroke="#ffffff" strokeWidth="0.55" />
              <path d="M 3 14 A 23.75 23.75 0 0 0 47 14" fill="none" stroke="#ffffff" strokeWidth="0.55" />

              {/* Center Court Jump Circle at Half Court line (y=47) */}
              <line x1="0" y1="47" x2="50" y2="47" stroke="#ffffff" strokeWidth="0.5" />
              <path d="M 19 47 A 6 6 0 0 1 31 47" fill="none" stroke="#ffffff" strokeWidth="0.5" />
              <path d="M 23 47 A 2 2 0 0 1 27 47" fill="none" stroke="#ffffff" strokeWidth="0.4" />

              {/* Backboard & Regulation Steel Rim (Hoop at x=25, y=5.25; Backboard at y=4, width=6ft) */}
              {/* Backboard Support Arm */}
              <line x1="25" y1="0" x2="25" y2="4" stroke="#222222" strokeWidth="0.8" />
              {/* Backboard Glass */}
              <line x1="22" y1="4" x2="28" y2="4" stroke="#ffffff" strokeWidth="0.9" />
              <rect x="23.5" y="3.8" width="3" height="0.4" fill="none" stroke="#ffffff" strokeWidth="0.2" />
              {/* Rim Bracket & Orange Regulation Ring */}
              <line x1="25" y1="4" x2="25" y2="4.5" stroke="#e67e22" strokeWidth="0.8" />
              <circle cx="25" cy="5.25" r="0.75" fill="none" stroke="#ff5722" strokeWidth="0.5" />
              {/* Net Strands indication */}
              <circle cx="25" cy="5.25" r="0.4" fill="none" stroke="#ffffff" strokeWidth="0.25" opacity="0.6" />

              {/* Plot Shot Markers */}
              {filteredShots.map((shot) => {
                // ESPN coordinates: x is 1-50 (width), y is distance from basket rim!
                // We add 5.25 so y=0 lands squarely in the center of the rim.
                const rawX = typeof shot.x === 'number' ? shot.x : 25;
                const rawY = typeof shot.y === 'number' ? shot.y : 0;

                const posX = Math.max(1.5, Math.min(48.5, rawX));
                const posY = Math.max(2, Math.min(46, rawY + 5.25));
                const isMade = Boolean(shot.scoringPlay);
                const isHovered = hoveredShot?.id === shot.id;

                return (
                  <g
                    key={shot.id}
                    onMouseEnter={() => setHoveredShot(shot)}
                    onMouseLeave={() => setHoveredShot(null)}
                    onClick={() => setHoveredShot(shot)}
                    className="cursor-pointer transition-transform duration-150"
                    style={{ transformOrigin: `${posX}px ${posY}px` }}
                  >
                    {isMade ? (
                      /* Made Shot: Radiant Emerald Target Disc */
                      <g filter={isHovered ? 'url(#hoverGlow)' : 'url(#shotShadow)'}>
                        <circle
                          cx={posX}
                          cy={posY}
                          r={isHovered ? 1.5 : 1.15}
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="0.3"
                        />
                        <circle cx={posX} cy={posY} r="0.4" fill="#ffffff" />
                      </g>
                    ) : (
                      /* Missed Shot: Sleek Crimson Marker */
                      <g filter={isHovered ? 'url(#hoverGlow)' : 'url(#shotShadow)'}>
                        <circle
                          cx={posX}
                          cy={posY}
                          r={isHovered ? 1.4 : 1.05}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="0.25"
                          opacity="0.92"
                        />
                        {/* Crisp Internal Cross */}
                        <line
                          x1={posX - 0.45}
                          y1={posY - 0.45}
                          x2={posX + 0.45}
                          y2={posY + 0.45}
                          stroke="#ffffff"
                          strokeWidth="0.28"
                          strokeLinecap="round"
                        />
                        <line
                          x1={posX + 0.45}
                          y1={posY - 0.45}
                          x2={posX - 0.45}
                          y2={posY + 0.45}
                          stroke="#ffffff"
                          strokeWidth="0.28"
                          strokeLinecap="round"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Interactive Floating Shot Tooltip */}
            {hoveredShot && (
              <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-neutral-950/95 backdrop-blur-md text-white rounded-xl p-3 border border-white/15 shadow-2xl pointer-events-none transition-all duration-200">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center space-x-2">
                    {hoveredShot.scoringPlay ? (
                      <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide">
                        <Check className="w-3 h-3" />
                        <span>MADE {hoveredShot.pointsAttempted}PT</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-rose-400 bg-rose-950/70 border border-rose-500/30 px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide">
                        <X className="w-3 h-3" />
                        <span>MISSED {hoveredShot.pointsAttempted}PT</span>
                      </span>
                    )}
                    <span className="text-white font-extrabold text-xs">{hoveredShot.athleteName}</span>
                  </div>
                  <span className="text-gray-400 text-[10px] font-semibold">
                    {hoveredShot.periodDisplay} • {hoveredShot.clock}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 mt-1.5 leading-snug font-medium line-clamp-2">
                  {hoveredShot.text}
                </p>
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
                  const y = 50 - (pt.homeWinPercentage / 100) * 50;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                });
                const pathStr = `M 0,50 L ${points.join(' L ')} L 100,50 Z`;

                return (
                  <>
                    <defs>
                      <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d={pathStr} fill="url(#probGrad)" />
                    <polyline
                      fill="none"
                      stroke="#000000"
                      strokeWidth="1.5"
                      points={points.join(' ')}
                    />
                  </>
                );
              })()}
            </svg>
            <div className="absolute top-2 left-2 text-[10px] font-bold text-gray-400">100% {homeTeamName}</div>
            <div className="absolute bottom-2 left-2 text-[10px] font-bold text-gray-400">100% {awayTeamName}</div>
          </div>
        </div>
      )}
    </div>
  );
};
