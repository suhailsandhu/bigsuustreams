import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, Check, Trophy, AlertCircle, RefreshCw } from 'lucide-react';
import type { Stream } from '../types/stream';
import type { ScoreboardGame, GameSummaryResponse } from '../types/scoreboard';
import { CourtsidePlayer } from './CourtsidePlayer';
import { formatTipoffTime, fetchGameSummary } from '../services/api';

interface GameViewProps {
  stream: Stream;
  game?: ScoreboardGame | null;
  onBack: () => void;
}

export const GameView: React.FC<GameViewProps> = ({ stream, game, onBack }) => {
  // Always default to 1080p as requested
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [copied, setCopied] = useState(false);

  // Box score state
  const [summary, setSummary] = useState<GameSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [activeTeamTab, setActiveTeamTab] = useState<'away' | 'home'>('away');

  const team1 = game?.awayTeam || {
    id: 'away',
    displayName: stream.team1?.name || stream.name.split(' vs ')[0] || 'Away Team',
    logo: stream.team1?.logo || '',
    score: 0,
    record: ''
  };

  const team2 = game?.homeTeam || {
    id: 'home',
    displayName: stream.team2?.name || stream.name.split(' vs ')[1] || 'Home Team',
    logo: stream.team2?.logo || '',
    score: 0,
    record: ''
  };

  const isLive = game?.status?.isLive ?? stream.is_live;
  const statusDetail = game?.status?.shortDetail || game?.status?.detail || (isLive ? 'LIVE' : formatTipoffTime(stream.match_timestamp));

  // Fetch box score stats
  useEffect(() => {
    let activeEspnId = game?.espnId;
    
    if (!activeEspnId) {
      fetch('/api/basketball/scoreboard')
        .then(r => r.json())
        .then(data => {
          const matched = (data.games || []).find((g: any) => 
            g.stream?.streamKey === stream.stream_key ||
            stream.stream_key.includes(g.awayTeam?.name?.toLowerCase()) ||
            stream.name.toLowerCase().includes(g.awayTeam?.name?.toLowerCase())
          );
          if (matched?.espnId) {
            setLoadingSummary(true);
            fetchGameSummary(matched.espnId)
              .then(d => {
                setSummary(d);
                setLoadingSummary(false);
              })
              .catch(() => setLoadingSummary(false));
          }
        })
        .catch(console.warn);
      return;
    }

    setLoadingSummary(true);
    setSummaryError(null);

    fetchGameSummary(activeEspnId)
      .then((data) => {
        setSummary(data);
        setLoadingSummary(false);
      })
      .catch((err) => {
        console.warn('GameView boxscore fetch error:', err);
        setSummaryError('Live box score stats will update as the game progresses.');
        setLoadingSummary(false);
      });
  }, [game?.espnId, stream.stream_key]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const awayTeamBox = summary?.boxscore?.away || {
    team: { id: team1.id, displayName: team1.displayName, logo: team1.logo, record: team1.record },
    score: team1.score,
    linescores: ((team1 as any).linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? l ?? '0', 10)),
    statLabels: ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT'],
    athletes: []
  };

  const homeTeamBox = summary?.boxscore?.home || {
    team: { id: team2.id, displayName: team2.displayName, logo: team2.logo, record: team2.record },
    score: team2.score,
    linescores: ((team2 as any).linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? l ?? '0', 10)),
    statLabels: ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT'],
    athletes: []
  };

  const currentTeamBox = activeTeamTab === 'away' ? awayTeamBox : homeTeamBox;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Navigation & Share Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-bold text-gray-800 hover:text-black bg-white hover:bg-gray-50 border border-gray-300 px-3.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Basketball Games</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleShare}
            className="flex items-center space-x-1.5 text-xs font-semibold text-gray-800 hover:text-black bg-white hover:bg-gray-50 border border-gray-300 px-3 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-gray-600" />
                <span>Share Game</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary Video Player Component */}
      <CourtsidePlayer
        stream={stream}
        selectedQuality={selectedQuality}
        onQualityChange={setSelectedQuality}
      />

      {/* Matchup Header & Live Scoreboard Section (Symmetrical 3-Column Layout) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-7 shadow-xs">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
          
          {/* Away Team */}
          <div className="flex flex-col sm:flex-row items-center sm:space-x-4 text-center sm:text-left min-w-0">
            <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-2xl bg-gray-50 border border-gray-200 p-1.5 sm:p-2 flex items-center justify-center shrink-0">
              {team1.logo ? (
                <img
                  src={team1.logo}
                  alt={team1.displayName}
                  className="max-w-full max-h-full object-contain filter drop-shadow"
                />
              ) : (
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 mt-1 sm:mt-0">
              <h2 className="text-xs sm:text-lg font-black text-gray-900 leading-tight truncate">
                {team1.displayName}
              </h2>
              {team1.record && (
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium truncate block">({team1.record})</span>
              )}
            </div>
          </div>

          {/* Center: Live Score & Clock */}
          <div className="flex flex-col items-center justify-center shrink-0 px-2 sm:px-4 text-center">
            {game ? (
              <div className="flex items-center space-x-2.5 sm:space-x-4">
                <span className="text-2xl sm:text-4xl font-black text-gray-900">
                  {team1.score}
                </span>
                <div className="flex flex-col items-center px-1">
                  {isLive ? (
                    <div className="flex items-center space-x-1 sm:space-x-1.5 text-red-600 font-extrabold text-[11px] sm:text-xs tracking-tight whitespace-nowrap">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-600 animate-pulse-live" />
                      <span>{statusDetail}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] sm:text-xs font-bold text-gray-600 uppercase whitespace-nowrap">
                      {statusDetail}
                    </span>
                  )}
                  <span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase mt-0.5 tracking-wider">
                    NBA
                  </span>
                </div>
                <span className="text-2xl sm:text-4xl font-black text-gray-900">
                  {team2.score}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-sm font-black text-orange-600 italic">VS</span>
                <span className="text-xs font-bold text-gray-600 mt-1">{statusDetail}</span>
              </div>
            )}
          </div>

          {/* Home Team */}
          <div className="flex flex-col sm:flex-row-reverse items-center sm:space-x-4 sm:space-x-reverse text-center sm:text-right min-w-0">
            <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-2xl bg-gray-50 border border-gray-200 p-1.5 sm:p-2 flex items-center justify-center shrink-0">
              {team2.logo ? (
                <img
                  src={team2.logo}
                  alt={team2.displayName}
                  className="max-w-full max-h-full object-contain filter drop-shadow"
                />
              ) : (
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 mt-1 sm:mt-0">
              <h2 className="text-xs sm:text-lg font-black text-gray-900 leading-tight truncate">
                {team2.displayName}
              </h2>
              {team2.record && (
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium truncate block">({team2.record})</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* BOX SCORE & STATS (Requested right underneath score)      */}
      {/* ========================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
        
        {/* Box Score Title & Quarter Linescores Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              GAME STATS & BOX SCORE
            </h3>
            <span className="text-xs font-semibold text-gray-500">
              {game?.status?.detail || 'Live Game Statistics'}
            </span>
          </div>

          {/* Quarter Breakdown */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4 overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200 font-bold uppercase text-[11px]">
                  <th className="text-left py-2 px-3 font-semibold">Team</th>
                  <th className="py-2 px-2">Q1</th>
                  <th className="py-2 px-2">Q2</th>
                  <th className="py-2 px-2">Q3</th>
                  <th className="py-2 px-2">Q4</th>
                  {awayTeamBox.linescores.length > 4 && <th className="py-2 px-2">OT</th>}
                  <th className="py-2 px-3 text-right font-black text-gray-900">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-semibold text-gray-700">
                <tr>
                  <td className="text-left py-2.5 px-3 font-bold text-gray-900 flex items-center space-x-2">
                    {team1.logo && <img src={team1.logo} className="w-4 h-4 object-contain" alt="" />}
                    <span>{team1.displayName}</span>
                  </td>
                  <td className="py-2.5 px-2">{awayTeamBox.linescores[0] ?? '-'}</td>
                  <td className="py-2.5 px-2">{awayTeamBox.linescores[1] ?? '-'}</td>
                  <td className="py-2.5 px-2">{awayTeamBox.linescores[2] ?? '-'}</td>
                  <td className="py-2.5 px-2">{awayTeamBox.linescores[3] ?? '-'}</td>
                  {awayTeamBox.linescores.length > 4 && (
                    <td className="py-2.5 px-2">{awayTeamBox.linescores[4]}</td>
                  )}
                  <td className="py-2.5 px-3 text-right font-black text-sm sm:text-base text-gray-900">
                    {team1.score}
                  </td>
                </tr>
                <tr>
                  <td className="text-left py-2.5 px-3 font-bold text-gray-900 flex items-center space-x-2">
                    {team2.logo && <img src={team2.logo} className="w-4 h-4 object-contain" alt="" />}
                    <span>{team2.displayName}</span>
                  </td>
                  <td className="py-2.5 px-2">{homeTeamBox.linescores[0] ?? '-'}</td>
                  <td className="py-2.5 px-2">{homeTeamBox.linescores[1] ?? '-'}</td>
                  <td className="py-2.5 px-2">{homeTeamBox.linescores[2] ?? '-'}</td>
                  <td className="py-2.5 px-2">{homeTeamBox.linescores[3] ?? '-'}</td>
                  {homeTeamBox.linescores.length > 4 && (
                    <td className="py-2.5 px-2">{homeTeamBox.linescores[4]}</td>
                  )}
                  <td className="py-2.5 px-3 text-right font-black text-sm sm:text-base text-gray-900">
                    {team2.score}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Selector Tabs (Away Team vs Home Team) */}
        <div className="flex items-center space-x-3 border-b border-gray-200 pb-3">
          <button
            onClick={() => setActiveTeamTab('away')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTeamTab === 'away'
                ? 'bg-black text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {team1.logo && <img src={team1.logo} className="w-4 h-4 object-contain" alt="" />}
            <span>{team1.displayName}</span>
          </button>

          <button
            onClick={() => setActiveTeamTab('home')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTeamTab === 'home'
                ? 'bg-black text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {team2.logo && <img src={team2.logo} className="w-4 h-4 object-contain" alt="" />}
            <span>{team2.displayName}</span>
          </button>
        </div>

        {/* Player Statistics Table */}
        {loadingSummary ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-500 text-xs">
            <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
            <span>Loading player box score...</span>
          </div>
        ) : summaryError && currentTeamBox.athletes.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-xs text-gray-500">
            <AlertCircle className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p>{summaryError}</p>
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
                        <img
                          src={ath.athlete.headshot}
                          className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                          alt=""
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                          {ath.athlete.jersey || '#'}
                        </div>
                      )}
                      <div className="min-w-0 truncate">
                        <div className="truncate text-xs font-bold text-gray-900">{ath.athlete.displayName}</div>
                        <div className="text-[10px] text-gray-400 font-normal truncate">
                          {ath.athlete.jersey ? `#${ath.athlete.jersey}` : ''} {ath.athlete.position ? `• ${ath.athlete.position}` : ''}
                        </div>
                      </div>
                    </td>
                    {ath.stats.map((val, idx) => (
                      <td
                        key={idx}
                        className={`py-2.5 px-2.5 text-right font-medium text-xs whitespace-nowrap ${
                          idx === 1 ? 'font-black text-gray-900' : 'text-gray-700'
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
            Player statistics and box score will be updated live as the game progresses.
          </div>
        )}

      </div>
    </div>
  );
};
