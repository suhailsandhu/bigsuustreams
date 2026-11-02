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
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-2xs select-none relative">
      {/* VIP Member Profile Button in Top Right on iPhone & Desktop */}
      {currentUser && onOpenProfile && (
        <div className="absolute right-3 sm:right-6 top-3 sm:top-4 flex items-center space-x-2 z-20">
          <button
            onClick={onOpenProfile}
            className="flex items-center space-x-1.5 text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-200/80 px-2.5 py-1 rounded-full shadow-2xs transition active:scale-95 cursor-pointer"
            title="VIP Member Profile & Settings"
          >
            <span className="text-sm leading-none">
              {typeof window !== 'undefined' ? (localStorage.getItem('bss_profile_emoji') || '👑') : '👑'}
            </span>
            <span className="truncate max-w-[85px] sm:max-w-[120px]">
              {currentUser.displayName === 'vip_guest' || currentUser.displayName === 'VIP Member'
                ? 'VIP Member'
                : (currentUser.displayName || currentUser.username || 'VIP Member')}
            </span>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col items-center justify-center">
        
        {/* Balanced, Clean Sport Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center justify-center cursor-pointer group py-0.5"
          title={`${currentSport === 'nba' ? 'NBA' : 'NFL'} Streams Home`}
        >
          {currentSport === 'nba' ? (
            <img
              src="/nba-logo.png"
              alt="NBA"
              className="h-16 sm:h-20 md:h-22 w-auto object-contain transition-transform group-hover:scale-105 filter drop-shadow-sm"
            />
          ) : (
            <div className="transition-transform group-hover:scale-105">
              <NflLogo className="h-16 sm:h-20 md:h-22 w-auto" />
            </div>
          )}
        </div>

        {/* Switch Sport Button: Two arrows circling each other (Small & Sleek) */}
        <button
          onClick={onToggleSport}
          className="mt-1 p-1 rounded-full bg-gray-100/80 hover:bg-gray-200 text-gray-500 hover:text-black border border-gray-200/60 shadow-2xs transition-all duration-300 active:scale-90 hover:rotate-180 cursor-pointer"
          title={`Switch to ${currentSport === 'nba' ? 'NFL' : 'NBA'} Streams`}
          aria-label="Switch Sport"
        >
          <RefreshCw className="w-2.5 h-2.5 text-gray-500 hover:text-black transition-colors" />
        </button>

      </div>
    </header>
  );
};
