import React from 'react';
import { RefreshCw } from 'lucide-react';
import { NflLogo } from './NflLogo';

interface HeaderProps {
  onNavigateHome: () => void;
  currentSport: 'nba' | 'nfl';
  onToggleSport: () => void;
  currentUser?: any;
  onLogout?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  currentSport,
  onToggleSport,
  currentUser,
  onOpenProfile
}) => {
  const isVip = Boolean(
    currentUser?.isVip === true ||
    currentUser?.role === 'vip' ||
    currentUser?.role === 'admin' ||
    currentUser?.membership === 'vip' ||
    currentUser?.id === 'vip_7865' ||
    currentUser?.username === 'vip_guest'
  );

  const initial = (currentUser?.displayName || currentUser?.username || 'M')[0].toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-2xs select-none relative">

      {/* Account / Membership Status in Top Right */}
      <div className="absolute right-3 sm:right-6 top-2.5 sm:top-3.5 flex flex-col items-end space-y-1.5 z-20">
        {currentUser && onOpenProfile && (
          <button
            onClick={onOpenProfile}
            className={`flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-full border shadow-2xs transition active:scale-95 cursor-pointer ${
              isVip
                ? 'bg-amber-50/80 text-amber-900 border-amber-200/80 hover:bg-amber-100/80'
                : 'bg-gray-100 text-gray-700 border-gray-200/80 hover:bg-gray-200'
            }`}
            title="Account & Settings"
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold uppercase shrink-0 ${
              isVip ? 'bg-amber-200 text-amber-900' : 'bg-gray-300 text-gray-700'
            }`}>
              {initial}
            </div>
            <span className="truncate max-w-[85px] sm:max-w-[120px] font-semibold">
              {isVip ? 'VIP Member' : 'Basic Member'}
            </span>
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex flex-col items-center justify-center">
        
        {/* Prominent League Logo (NBA / NFL) - Big & Crisp */}
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
