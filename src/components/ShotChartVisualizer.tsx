import React, { useState, useMemo } from 'react';
import type { ShotChartData, ShotItem, TeamBoxscore } from '../types/scoreboard.ts';
import { Target, Check, X, User } from 'lucide-react';

interface ShotChartVisualizerProps {
  shotChart?: ShotChartData;
  boxscore?: {
    away?: TeamBoxscore;
    home?: TeamBoxscore;
  };
  awayTeamName: string;
  homeTeamName: string;
  awayTeamLogo?: string;
  homeTeamLogo?: string;
}

interface PlayerStats {
  id: string;
  name: string;
  jersey?: string;
  position?: string;
  headshot?: string;
  made: number;
  attempted: number;
  pct: string;
  twoPtMade: number;
  twoPtAtt: number;
  threePtMade: number;
  threePtAtt: number;
}

export const ShotChartVisualizer: React.FC<ShotChartVisualizerProps> = ({
  shotChart,
  boxscore,
  awayTeamName,
  homeTeamName,
  awayTeamLogo,
  homeTeamLogo
}) => {
  // Single-team view: default to 'away' (Thunder), can toggle to 'home' (Cavaliers)
  const [teamFilter, setTeamFilter] = useState<'away' | 'home'>('away');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'made' | 'missed'>('all');
  const [shotTypeFilter, setShotTypeFilter] = useState<'all' | '2pt' | '3pt'>('all');
  const [hoveredShot, setHoveredShot] = useState<ShotItem | null>(null);

  const rawShots = useMemo(() => shotChart?.shots || [], [shotChart]);

  // Determine away and home team IDs from boxscore or shots
  const awayTeamId = boxscore?.away?.team?.id;
  const homeTeamId = boxscore?.home?.team?.id;

  // Identify distinct team IDs present in shot data
  const distinctShotTeamIds = useMemo(() => {
    return Array.from(new Set(rawShots.map((s) => s.teamId).filter(Boolean)));
  }, [rawShots]);

  // Active team ID resolution
  const activeTeamId = useMemo(() => {
    if (teamFilter === 'away') {
      return awayTeamId || distinctShotTeamIds[0] || '25';
    }
    return homeTeamId || (distinctShotTeamIds.length > 1 ? distinctShotTeamIds[1] : '5');
  }, [teamFilter, awayTeamId, homeTeamId, distinctShotTeamIds]);

  // Team-level shots
  const currentTeamShots = useMemo(() => {
    return rawShots.filter((s) => {
      if (activeTeamId && s.teamId) {
        return s.teamId === activeTeamId;
      }
      return true;
    });
  }, [rawShots, activeTeamId]);

  // Away & Home overall shooting totals for top team switcher cards
  const awayStats = useMemo(() => {
    const id = awayTeamId || distinctShotTeamIds[0] || '25';
    const s = rawShots.filter((sh) => sh.teamId === id);
    const att = s.length;
    const made = s.filter((sh) => sh.scoringPlay).length;
    const pct = att > 0 ? ((made / att) * 100).toFixed(1) : '0.0';
    return { att, made, pct };
  }, [rawShots, awayTeamId, distinctShotTeamIds]);

  const homeStats = useMemo(() => {
    const id = homeTeamId || (distinctShotTeamIds.length > 1 ? distinctShotTeamIds[1] : '5');
    const s = rawShots.filter((sh) => sh.teamId === id);
    const att = s.length;
    const made = s.filter((sh) => sh.scoringPlay).length;
    const pct = att > 0 ? ((made / att) * 100).toFixed(1) : '0.0';
    return { att, made, pct };
  }, [rawShots, homeTeamId, distinctShotTeamIds]);

  // Active team boxscore athletes map for headshot, jersey & position enrichment
  const athletesMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; jersey?: string; position?: string; headshot?: string }>();
    const activeBox = teamFilter === 'away' ? boxscore?.away : boxscore?.home;
    if (activeBox?.athletes) {
      for (const item of activeBox.athletes) {
        if (item.athlete?.displayName) {
          map.set(item.athlete.displayName.toLowerCase(), {
            id: item.athlete.id,
            name: item.athlete.displayName,
            jersey: item.athlete.jersey,
            position: item.athlete.position,
            headshot: item.athlete.headshot
          });
        }
      }
    }
    return map;
  }, [teamFilter, boxscore]);

  // Aggregated player list for active team, sorted by total shot attempts
  const teamPlayers = useMemo(() => {
    const pMap = new Map<string, PlayerStats>();

    for (const s of currentTeamShots) {
      if (!s.athleteName) continue;
      const key = s.athleteName;
      let record = pMap.get(key);
      if (!record) {
        const enriched = athletesMap.get(key.toLowerCase());
        const athId = s.athleteId || enriched?.id || '';
        record = {
          id: athId,
          name: key,
          jersey: enriched?.jersey,
          position: enriched?.position,
          headshot: enriched?.headshot || (athId ? `https://a.espncdn.com/i/headshots/nba/players/full/${athId}.png` : undefined),
          made: 0,
          attempted: 0,
          pct: '0.0',
          twoPtMade: 0,
          twoPtAtt: 0,
          threePtMade: 0,
          threePtAtt: 0
        };
        pMap.set(key, record);
      }

      record.attempted += 1;
      if (s.scoringPlay) record.made += 1;

      if (s.pointsAttempted === 2) {
        record.twoPtAtt += 1;
        if (s.scoringPlay) record.twoPtMade += 1;
      } else if (s.pointsAttempted === 3) {
        record.threePtAtt += 1;
        if (s.scoringPlay) record.threePtMade += 1;
      }

      record.pct = record.attempted > 0 ? ((record.made / record.attempted) * 100).toFixed(1) : '0.0';
    }

    return Array.from(pMap.values()).sort((a, b) => b.attempted - a.attempted);
  }, [currentTeamShots, athletesMap]);

  // Shots filtered by selected player, outcome, and shot type
  const displayedShots = useMemo(() => {
    return currentTeamShots.filter((s) => {
      // Player filter
      if (selectedPlayer !== 'all' && s.athleteName !== selectedPlayer) {
        return false;
      }
      // Outcome filter
      if (outcomeFilter === 'made' && !s.scoringPlay) return false;
      if (outcomeFilter === 'missed' && s.scoringPlay) return false;
      // Shot type filter
      if (shotTypeFilter === '2pt' && s.pointsAttempted !== 2) return false;
      if (shotTypeFilter === '3pt' && s.pointsAttempted !== 3) return false;
      return true;
    });
  }, [currentTeamShots, selectedPlayer, outcomeFilter, shotTypeFilter]);

  // Stats for the currently filtered view
  const totalAttempted = displayedShots.length;
  const totalMade = displayedShots.filter((s) => s.scoringPlay).length;
  const fgPct = totalAttempted > 0 ? ((totalMade / totalAttempted) * 100).toFixed(1) : '0.0';

  const twoPtShots = displayedShots.filter((s) => s.pointsAttempted === 2);
  const twoPtMade = twoPtShots.filter((s) => s.scoringPlay).length;
  const twoPtPct = twoPtShots.length > 0 ? ((twoPtMade / twoPtShots.length) * 100).toFixed(1) : '0.0';

  const threePtShots = displayedShots.filter((s) => s.pointsAttempted === 3);
  const threePtMade = threePtShots.filter((s) => s.scoringPlay).length;
  const threePtPct = threePtShots.length > 0 ? ((threePtMade / threePtShots.length) * 100).toFixed(1) : '0.0';

  // Active team metadata
  const isAway = teamFilter === 'away';
  const currentTeamName = isAway ? awayTeamName : homeTeamName;
  const currentTeamLogo = isAway ? awayTeamLogo : homeTeamLogo;

  if (!rawShots || rawShots.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-2xs text-center">
        <Target className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Live NBA Shot Tracker</p>
        <p className="text-xs text-gray-400 mt-1">Shot locations will update automatically as plays occur.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden select-none">
      {/* 1. Header: Sleek Team Switcher */}
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/70">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-900">
              NBA Shot Chart
            </h3>
          </div>

          {/* Shot Legend */}
          <div className="flex items-center space-x-3 text-xs font-bold">
            <span className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-300" />
              <span>Made</span>
            </span>
            <span className="flex items-center space-x-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block ring-2 ring-rose-300" />
              <span>Missed</span>
            </span>
          </div>
        </div>

        {/* Team Selection Cards: Thunder vs Cavaliers */}
        <div className="grid grid-cols-2 gap-3">
          {/* Away Team Card (e.g. Thunder) */}
          <button
            type="button"
            onClick={() => {
              setTeamFilter('away');
              setSelectedPlayer('all');
            }}
            className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
              teamFilter === 'away'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-neutral-900/10'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              {awayTeamLogo ? (
                <img src={awayTeamLogo} alt={awayTeamName} className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
              )}
              <div className="truncate">
                <div className="text-xs sm:text-sm font-black truncate">{awayTeamName}</div>
                <div className={`text-[10px] font-bold ${teamFilter === 'away' ? 'text-gray-300' : 'text-gray-400'}`}>
                  Away Team
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <div className={`text-xs sm:text-sm font-black ${teamFilter === 'away' ? 'text-white' : 'text-gray-900'}`}>
                {awayStats.pct}%
              </div>
              <div className={`text-[10px] font-medium ${teamFilter === 'away' ? 'text-gray-300' : 'text-gray-400'}`}>
                {awayStats.made}/{awayStats.att} FG
              </div>
            </div>
          </button>

          {/* Home Team Card (e.g. Cavaliers) */}
          <button
            type="button"
            onClick={() => {
              setTeamFilter('home');
              setSelectedPlayer('all');
            }}
            className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
              teamFilter === 'home'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-neutral-900/10'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              {homeTeamLogo ? (
                <img src={homeTeamLogo} alt={homeTeamName} className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
              )}
              <div className="truncate">
                <div className="text-xs sm:text-sm font-black truncate">{homeTeamName}</div>
                <div className={`text-[10px] font-bold ${teamFilter === 'home' ? 'text-gray-300' : 'text-gray-400'}`}>
                  Home Team
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <div className={`text-xs sm:text-sm font-black ${teamFilter === 'home' ? 'text-white' : 'text-gray-900'}`}>
                {homeStats.pct}%
              </div>
              <div className={`text-[10px] font-medium ${teamFilter === 'home' ? 'text-gray-300' : 'text-gray-400'}`}>
                {homeStats.made}/{homeStats.att} FG
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Main Content: Real Wood Court + Player Roster Sidebar */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Court & Quick Filters (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Filters: Outcome & Range */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Outcome Pills */}
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setOutcomeFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  outcomeFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setOutcomeFilter('made')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  outcomeFilter === 'made' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-500 hover:text-emerald-700'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>Made ({currentTeamShots.filter((s) => s.scoringPlay).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setOutcomeFilter('missed')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  outcomeFilter === 'missed' ? 'bg-rose-600 text-white shadow-2xs' : 'text-gray-500 hover:text-rose-700'
                }`}
              >
                <X className="w-3 h-3" />
                <span>Missed ({currentTeamShots.filter((s) => !s.scoringPlay).length})</span>
              </button>
            </div>

            {/* Shot Type Pills */}
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setShotTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  shotTypeFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                2PT & 3PT
              </button>
              <button
                type="button"
                onClick={() => setShotTypeFilter('2pt')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  shotTypeFilter === '2pt' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                2-Pointers
              </button>
              <button
                type="button"
                onClick={() => setShotTypeFilter('3pt')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  shotTypeFilter === '3pt' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                3-Pointers
              </button>
            </div>
          </div>

          {/* Active Filter Summary Bar */}
          <div className="grid grid-cols-3 gap-2 bg-neutral-900 text-white rounded-2xl p-3 text-center shadow-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Total FG</div>
              <div className="text-sm sm:text-base font-black text-white mt-0.5">{fgPct}%</div>
              <div className="text-[10px] text-gray-400">{totalMade}/{totalAttempted}</div>
            </div>
            <div className="border-x border-neutral-800">
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

          {/* Photorealistic Hardwood Court SVG */}
          <div className="relative w-full aspect-[50/47] max-w-xl mx-auto rounded-3xl overflow-hidden shadow-lg border border-amber-950/20 bg-[#c99f6b]">
            <svg viewBox="0 0 50 47" className="w-full h-full">
              <defs>
                {/* Drop shadow for crisp shot elevation off hardwood */}
                <filter id="shotShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0.35" stdDeviation="0.45" floodColor="#000000" floodOpacity="0.55" />
                </filter>
                <filter id="hoverGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.0" floodColor="#ffffff" floodOpacity="0.95" />
                </filter>
                {/* Arena overhead lighting gloss */}
                <radialGradient id="arenaSpotlight" cx="50%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
                  <stop offset="70%" stopColor="#ffffff" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
                </radialGradient>
              </defs>

              {/* 1. Photorealistic Northern Maple Hardwood Floor Image */}
              <image
                href="/nba-court-wood.jpg"
                x="0"
                y="0"
                width="50"
                height="47"
                preserveAspectRatio="none"
              />

              {/* 2. Arena Stadium Lighting Layer */}
              <rect x="0" y="0" width="50" height="47" fill="url(#arenaSpotlight)" pointerEvents="none" />

              {/* 3. Key Interior Hardwood Subtle Accent */}
              <rect
                x="17"
                y="0"
                width="16"
                height="19"
                fill="#000000"
                fillOpacity="0.08"
              />

              {/* 4. NBA Regulation Boundary & Court Markings (Official White) */}
              <rect x="0.25" y="0.25" width="49.5" height="46.5" fill="none" stroke="#ffffff" strokeWidth="0.45" />

              {/* Baseline */}
              <line x1="0" y1="0.25" x2="50" y2="0.25" stroke="#ffffff" strokeWidth="0.6" />

              {/* Free Throw Key (16ft wide x 19ft deep) */}
              <rect x="17" y="0" width="16" height="19" fill="none" stroke="#ffffff" strokeWidth="0.45" />

              {/* Free Throw Circle (Radius 6ft at y=19) */}
              {/* Top half (solid) */}
              <path d="M 19,19 A 6,6 0 0,0 31,19" fill="none" stroke="#ffffff" strokeWidth="0.45" />
              {/* Bottom half (dashed) */}
              <path
                d="M 19,19 A 6,6 0 0,1 31,19"
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.45"
                strokeDasharray="0.8, 0.8"
              />

              {/* Restricted Area Arc (Radius 4ft from rim at 25, 5.25) */}
              <path d="M 21,5.25 A 4,4 0 0,0 29,5.25" fill="none" stroke="#ffffff" strokeWidth="0.4" />

              {/* 3-Point Corner Straight Lines (3ft from sideline, 22ft from rim) */}
              <line x1="3" y1="0" x2="3" y2="14.2" stroke="#ffffff" strokeWidth="0.45" />
              <line x1="47" y1="0" x2="47" y2="14.2" stroke="#ffffff" strokeWidth="0.45" />

              {/* 3-Point Arc (Radius 23.75ft from rim at 25, 5.25) */}
              <path
                d="M 3,14.2 A 23.75,23.75 0 0,0 47,14.2"
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.45"
              />

              {/* Center Court Semicircle at Half Court Line (y=47) */}
              <path d="M 19,47 A 6,6 0 0,1 31,47" fill="none" stroke="#ffffff" strokeWidth="0.45" />

              {/* Backboard (6ft wide, 4ft from baseline) */}
              <line x1="22" y1="4" x2="28" y2="4" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" />
              {/* Backboard neck connection to baseline */}
              <line x1="25" y1="0" x2="25" y2="4" stroke="#111827" strokeWidth="0.4" />

              {/* Rim Connector & Rim Ring (Radius 0.75ft = 18in regulation rim) */}
              <line x1="25" y1="4" x2="25" y2="4.5" stroke="#f97316" strokeWidth="0.3" />
              <circle
                cx="25"
                cy="5.25"
                r="0.75"
                fill="none"
                stroke="#f97316"
                strokeWidth="0.25"
              />

              {/* 5. Shot Markers */}
              {displayedShots.map((shot, idx) => {
                const posX = Math.max(1, Math.min(49, shot.x));
                const posY = Math.max(1, Math.min(46, shot.y + 5.25));
                const isHovered = hoveredShot?.id === shot.id;

                return (
                  <g
                    key={shot.id || idx}
                    className="cursor-pointer transition-transform duration-150"
                    onMouseEnter={() => setHoveredShot(shot)}
                    onMouseLeave={() => setHoveredShot(null)}
                    onClick={() => setHoveredShot(shot)}
                  >
                    {shot.scoringPlay ? (
                      /* Made Shot: Vibrant Emerald Green Circle */
                      <g filter={isHovered ? 'url(#hoverGlow)' : 'url(#shotShadow)'}>
                        <circle
                          cx={posX}
                          cy={posY}
                          r={isHovered ? 1.55 : 1.25}
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="0.3"
                        />
                        {/* Inner checkmark */}
                        <path
                          d={`M ${posX - 0.45} ${posY} L ${posX - 0.1} ${posY + 0.4} L ${posX + 0.45} ${posY - 0.35}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="0.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    ) : (
                      /* Missed Shot: Crisp Rose Red Circle with X */
                      <g filter={isHovered ? 'url(#hoverGlow)' : 'url(#shotShadow)'}>
                        <circle
                          cx={posX}
                          cy={posY}
                          r={isHovered ? 1.55 : 1.25}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="0.3"
                        />
                        {/* Inner X */}
                        <path
                          d={`M ${posX - 0.4} ${posY - 0.4} L ${posX + 0.4} ${posY + 0.4} M ${posX + 0.4} ${posY - 0.4} L ${posX - 0.4} ${posY + 0.4}`}
                          stroke="#ffffff"
                          strokeWidth="0.25"
                          strokeLinecap="round"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Floating Shot Detail Tooltip on Hover / Click */}
            {hoveredShot && (
              <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-xs bg-neutral-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-white/10 pointer-events-none transition-all z-20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        hoveredShot.scoringPlay ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {hoveredShot.scoringPlay ? 'Made' : 'Missed'} {hoveredShot.pointsAttempted}PT
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {hoveredShot.periodDisplay || `Q${hoveredShot.period}`} • {hoveredShot.clock}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-300">
                    {Math.round(Math.hypot(hoveredShot.x - 25, hoveredShot.y))} ft
                  </span>
                </div>
                <div className="text-xs font-bold text-white line-clamp-1">{hoveredShot.athleteName}</div>
                <p className="text-[11px] text-gray-300 mt-1 line-clamp-2 leading-snug">{hoveredShot.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Player Roster & Click-to-Filter List (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-gray-100">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                {currentTeamName} Roster
              </h4>
              <p className="text-[11px] text-gray-400">Click a player to view their individual shot chart</p>
            </div>
            {selectedPlayer !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedPlayer('all')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Scrollable Player List */}
          <div className="space-y-1.5 max-h-[510px] overflow-y-auto pr-1">
            {/* 1. All Players Combined Option */}
            <button
              type="button"
              onClick={() => setSelectedPlayer('all')}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                selectedPlayer === 'all'
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm ring-1 ring-neutral-900'
                  : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  selectedPlayer === 'all' ? 'bg-white/10' : 'bg-gray-100'
                }`}>
                  {currentTeamLogo ? (
                    <img src={currentTeamLogo} alt={currentTeamName} className="w-5 h-5 object-contain" />
                  ) : (
                    <Target className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="truncate">
                  <div className="text-xs font-black truncate">All {currentTeamName} Players</div>
                  <div className={`text-[10px] ${selectedPlayer === 'all' ? 'text-gray-300' : 'text-gray-400'}`}>
                    {currentTeamShots.length} total attempts
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 pl-2">
                <div className={`text-xs font-black ${selectedPlayer === 'all' ? 'text-white' : 'text-gray-900'}`}>
                  {currentTeamShots.length > 0
                    ? ((currentTeamShots.filter((s) => s.scoringPlay).length / currentTeamShots.length) * 100).toFixed(1)
                    : '0.0'}%
                </div>
                <div className={`text-[10px] ${selectedPlayer === 'all' ? 'text-gray-300' : 'text-gray-400'}`}>
                  {currentTeamShots.filter((s) => s.scoringPlay).length}/{currentTeamShots.length} FG
                </div>
              </div>
            </button>

            {/* 2. Individual Players with Headshots & Shooting Stats */}
            {teamPlayers.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                No shot attempts recorded for this team yet.
              </div>
            ) : (
              teamPlayers.map((player) => {
                const isSelected = selectedPlayer === player.name;
                const fgPctNum = parseFloat(player.pct);
                const pctColor =
                  isSelected
                    ? 'text-white'
                    : fgPctNum >= 50
                    ? 'text-emerald-600'
                    : fgPctNum >= 40
                    ? 'text-amber-600'
                    : 'text-gray-600';

                return (
                  <button
                    key={player.name}
                    type="button"
                    onClick={() => setSelectedPlayer(isSelected ? 'all' : player.name)}
                    className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm ring-1 ring-neutral-900'
                        : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Player Headshot */}
                      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-black/5">
                        {player.headshot ? (
                          <img
                            src={player.headshot}
                            alt={player.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Name & Jersey */}
                      <div className="truncate">
                        <div className="text-xs font-black truncate">{player.name}</div>
                        <div className={`text-[10px] font-bold ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                          {player.jersey ? `#${player.jersey}` : ''} {player.position ? `• ${player.position}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Shooting Splits */}
                    <div className="text-right shrink-0 pl-2">
                      <div className={`text-xs font-black ${pctColor}`}>
                        {player.pct}%
                      </div>
                      <div className={`text-[10px] ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                        {player.made}/{player.attempted} FG
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
