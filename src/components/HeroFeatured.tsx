import React from 'react';
import { Play, Users, Trophy, Clock } from 'lucide-react';
import type { Stream } from '../types/stream';
import { formatTipoffTime, getTimeUntilTipoff } from '../services/api';

interface HeroFeaturedProps {
  stream: Stream;
  onSelectGame: (stream: Stream) => void;
}

export const HeroFeatured: React.FC<HeroFeaturedProps> = ({ stream, onSelectGame }) => {
  const team1 = stream.team1 || { name: stream.name.split(' vs ')[0] || 'Team 1', logo: '' };
  const team2 = stream.team2 || { name: stream.name.split(' vs ')[1] || 'Team 2', logo: '' };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800/80 bg-gradient-to-br from-slate-900 via-[#10141f] to-[#0b0d12] shadow-2xl p-6 sm:p-8 lg:p-10 mb-8">
      {/* Background Court Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Event Details & Badges */}
        <div className="flex-1 text-center lg:text-left">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mb-4">
            {stream.is_live ? (
              <span className="flex items-center space-x-1.5 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-live" />
                <span>FEATURED LIVE</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                <span>UPCOMING MARQUEE</span>
              </span>
            )}

            <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {stream.league}
            </span>

            {stream.is_live && stream.viewers > 0 && (
              <span className="flex items-center space-x-1 text-xs text-slate-400 font-medium">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{stream.viewers.toLocaleString()} watching</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">
            {stream.name}
          </h1>

          <p className="text-sm text-slate-400 mb-6 flex items-center justify-center lg:justify-start gap-2">
            <span>Tipoff: <strong className="text-slate-200">{formatTipoffTime(stream.match_timestamp)}</strong></span>
            {!stream.is_live && (
              <span className="text-amber-400/90 font-medium text-xs bg-amber-400/10 px-2 py-0.5 rounded">
                {getTimeUntilTipoff(stream.match_timestamp)}
              </span>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <button
              onClick={() => onSelectGame(stream)}
              className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-sm px-6 py-3 rounded-2xl shadow-xl shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{stream.is_live ? 'WATCH LIVE NOW' : 'GO TO PRE-GAME'}</span>
            </button>

            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl flex items-center space-x-1.5">
              <span>HD 1080p • No Ads</span>
            </span>
          </div>
        </div>

        {/* Right: Team Matchup Arena Visual */}
        <div className="flex items-center justify-center space-x-4 sm:space-x-8 bg-slate-950/60 p-6 rounded-3xl border border-slate-800/80 backdrop-blur-sm w-full lg:w-auto">
          {/* Team 1 */}
          <div className="flex flex-col items-center text-center space-y-2 w-28 sm:w-32">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900 border border-slate-800 p-2.5 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              {team1.logo ? (
                <img
                  src={team1.logo}
                  alt={team1.name}
                  className="max-w-full max-h-full object-contain filter drop-shadow-md"
                  loading="lazy"
                />
              ) : (
                <Trophy className="w-10 h-10 text-orange-400/60" />
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-200 line-clamp-2 leading-tight">
              {team1.name}
            </span>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-base sm:text-lg font-black text-orange-500/80 italic tracking-wider">
              VS
            </span>
            <span className="w-8 h-0.5 bg-slate-800 my-1"></span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              COURT
            </span>
          </div>

          {/* Team 2 */}
          <div className="flex flex-col items-center text-center space-y-2 w-28 sm:w-32">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900 border border-slate-800 p-2.5 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              {team2.logo ? (
                <img
                  src={team2.logo}
                  alt={team2.name}
                  className="max-w-full max-h-full object-contain filter drop-shadow-md"
                  loading="lazy"
                />
              ) : (
                <Trophy className="w-10 h-10 text-orange-400/60" />
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-200 line-clamp-2 leading-tight">
              {team2.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
