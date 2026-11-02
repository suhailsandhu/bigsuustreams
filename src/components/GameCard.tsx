import React from 'react';
import { Play, Clock, Trophy } from 'lucide-react';
import type { Stream } from '../types/stream';
import { formatTipoffTime, getTimeUntilTipoff } from '../services/api';

interface GameCardProps {
  stream: Stream;
  onSelect: (stream: Stream) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ stream, onSelect }) => {
  const team1 = stream.team1 || { name: stream.name.split(' vs ')[0] || 'Team 1', logo: '' };
  const team2 = stream.team2 || { name: stream.name.split(' vs ')[1] || 'Team 2', logo: '' };

  return (
    <div
      onClick={() => onSelect(stream)}
      className="group relative bg-[#12151e] hover:bg-[#181d29] border border-slate-800/80 hover:border-orange-500/40 rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-orange-500/5 hover:-translate-y-1"
    >
      {/* Top Bar: League & Live/Time Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
          {stream.league}
        </span>

        {stream.is_live ? (
          <div className="flex items-center space-x-1.5 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
            <span className="text-[10px] font-bold text-red-400 tracking-wider">LIVE</span>
            {stream.viewers > 0 && (
              <>
                <span className="text-slate-600 text-[10px]">•</span>
                <span className="text-[10px] text-slate-300 font-medium">
                  {stream.viewers.toLocaleString()}
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-[11px] font-medium text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-md">
            <Clock className="w-3 h-3" />
            <span>{getTimeUntilTipoff(stream.match_timestamp)}</span>
          </div>
        )}
      </div>

      {/* Matchup Center: Team Crests & Names */}
      <div className="space-y-3 my-2">
        {/* Team 1 */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800/80 p-1.5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            {team1.logo ? (
              <img
                src={team1.logo}
                alt={team1.name}
                className="max-w-full max-h-full object-contain"
                loading="lazy"
              />
            ) : (
              <Trophy className="w-5 h-5 text-slate-500" />
            )}
          </div>
          <span className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1">
            {team1.name}
          </span>
        </div>

        {/* Team 2 */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800/80 p-1.5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            {team2.logo ? (
              <img
                src={team2.logo}
                alt={team2.name}
                className="max-w-full max-h-full object-contain"
                loading="lazy"
              />
            ) : (
              <Trophy className="w-5 h-5 text-slate-500" />
            )}
          </div>
          <span className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1">
            {team2.name}
          </span>
        </div>
      </div>

      {/* Bottom Footer: Tipoff time & Watch CTA */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px]">
          {formatTipoffTime(stream.match_timestamp)}
        </span>

        <button className="flex items-center space-x-1 text-xs font-bold text-orange-400 group-hover:text-orange-300 transition-colors">
          <span>{stream.is_live ? 'Watch Live' : 'Matchup'}</span>
          <Play className="w-3 h-3 fill-current ml-0.5" />
        </button>
      </div>
    </div>
  );
};
