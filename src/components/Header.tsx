import React from 'react';
import { NflLogo } from './NflLogo';

interface HeaderProps {
  onNavigateHome: () => void;
  currentSport: 'nba' | 'nfl';
  onToggleSport: () => void;
  currentUser?: any;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  currentSport,
  onToggleSport,
  currentUser,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-2xs select-none relative">
      {/* User Session Pill in Top Right */}
      {currentUser && onLogout && (
        <div className="absolute right-3 sm:right-6 top-3 sm:top-4 flex items-center space-x-2 z-20">
          <div className="hidden sm:flex items-center space-x-1.5 text-xs font-bold text-gray-700 bg-gray-100/90 border border-gray-200/80 px-3 py-1 rounded-full shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[120px]">{currentUser.displayName || currentUser.username}</span>
          </div>
          <button
            onClick={onLogout}
            className="text-[11px] font-bold text-gray-400 hover:text-red-600 bg-gray-50 sm:bg-transparent border border-gray-200 sm:border-0 px-2 py-0.5 rounded-full transition cursor-pointer"
            title="Sign Out"
          >
            Sign Out
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col items-center justify-center">
        
        {/* Prominent, Noticeably Bigger Sport Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center justify-center cursor-pointer group py-1"
          title={`${currentSport === 'nba' ? 'NBA' : 'NFL'} Streams Home`}
        >
          {currentSport === 'nba' ? (
            <img
              src="/logo.png"
              alt="NBA Streams"
              className="h-20 sm:h-28 md:h-32 w-auto object-contain transition-transform group-hover:scale-105 filter drop-shadow-2xs"
            />
          ) : (
            <div className="transition-transform group-hover:scale-105">
              <NflLogo className="h-20 sm:h-28 md:h-32 w-auto" />
            </div>
          )}
        </div>

        {/* Switch Sport Button Right Under Logo */}
        <button
          onClick={onToggleSport}
          className="mt-2.5 inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200/90 text-gray-800 text-xs sm:text-sm font-bold border border-gray-200/80 shadow-2xs transition active:scale-95 cursor-pointer"
        >
          <span>{currentSport === 'nba' ? 'Go to NFL Streams 🏈' : 'Go to NBA Streams 🏀'}</span>
        </button>

      </div>
    </header>
  );
};
