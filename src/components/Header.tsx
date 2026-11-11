import React from 'react';
import { RefreshCw, KeyRound } from 'lucide-react';
import { NflLogo } from './NflLogo';
import ShinyText from './ShinyText';

interface HeaderProps {
  onNavigateHome: () => void;
  currentSport: 'nba' | 'nfl';
  onToggleSport: () => void;
  currentUser?: any;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onOpenAuth?: () => void;
  onOpenReport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  currentSport,
  onToggleSport,
  currentUser,
  onOpenProfile,
  onOpenAuth,
  onOpenReport
}) => {
  // sandhu.suhail@gmail.com and bigsuu are VIP member accounts
  const isVip = Boolean(
    currentUser?.email?.toLowerCase() === 'sandhu.suhail@gmail.com' ||
    currentUser?.username?.toLowerCase() === 'sandhu.suhail@gmail.com' ||
    currentUser?.username?.toLowerCase() === 'bigsuu' ||
    currentUser?.role === 'vip' ||
    currentUser?.isVip === true
  );

  const initial = (currentUser?.displayName || currentUser?.username || 'B')[0].toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-2xs select-none relative">

      {/* Account / Membership Status in Top Right with Report button directly underneath */}
      <div className="absolute right-3 sm:right-6 top-2 sm:top-2.5 flex flex-col items-end z-20">
        {currentUser && onOpenProfile && (
          isVip ? (
            <button
              onClick={onOpenProfile}
              className="flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-full border shadow-2xs transition active:scale-95 cursor-pointer bg-amber-50/80 text-amber-900 border-amber-200/80 hover:bg-amber-100/80"
              title="Account & Settings"
            >
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold uppercase shrink-0 bg-amber-200 text-amber-900">
                {initial}
              </div>
              <span className="truncate max-w-[85px] sm:max-w-[120px] font-semibold">
                <ShinyText text="VIP Member" speed={4} className="font-bold text-amber-900" />
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenProfile}
              className="flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-full border shadow-2xs transition active:scale-95 cursor-pointer bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              title="Account & Settings"
            >
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold uppercase shrink-0 bg-slate-300 text-slate-800">
                {initial}
              </div>
              <span className="font-semibold text-[11px]">Member Pass</span>
            </button>
          )
        )}

        {/* 'i' Report Problem button directly underneath the Profile Pass */}
        {onOpenReport && (
          <button
            onClick={onOpenReport}
            className="mt-1 flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer text-[10px] font-bold group"
            title="Report a problem"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-slate-200 group-hover:bg-orange-100 group-hover:text-orange-600 flex items-center justify-center text-[9px] font-serif font-bold italic text-slate-600 transition-colors">
              i
            </span>
            <span className="tracking-tight">Report</span>
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex flex-col items-center justify-center">
        
        {/* Prominent League Logo (NBA / NFL) - Clean without box */}
        <div
          onClick={onNavigateHome}
          className="flex items-center justify-center cursor-pointer group py-0.5"
          title={`${currentSport === 'nba' ? 'NBA' : 'NFL'} Streams Home`}
        >
          {currentSport === 'nba' ? (
            <img
              src="/nba-logo.png"
              alt="NBA"
              style={{ maxHeight: '120px', width: 'auto' }}
              className="h-24 sm:h-28 md:h-32 w-auto object-contain transition-transform group-hover:scale-105 filter drop-shadow-sm"
            />
          ) : (
            <div className="transition-transform group-hover:scale-105">
              <NflLogo className="h-24 sm:h-28 md:h-32 w-auto" />
            </div>
          )}
        </div>

        {/* Switch Sport Button: Two arrows circling each other (Small & Sleek) */}
        <button
          onClick={onToggleSport}
          className="mt-0.5 p-1 rounded-full bg-gray-100/80 hover:bg-gray-200 text-gray-500 hover:text-black border border-gray-200/60 shadow-2xs transition-all duration-300 active:scale-90 hover:rotate-180 cursor-pointer"
          title={`Switch to ${currentSport === 'nba' ? 'NFL' : 'NBA'} Streams`}
          aria-label="Switch Sport"
        >
          <RefreshCw className="w-2.5 h-2.5 text-gray-500 hover:text-black transition-colors" />
        </button>

      </div>
    </header>
  );
};
