import React from 'react';
import { NflLogo } from './NflLogo';

interface HeaderProps {
  onNavigateHome: () => void;
  currentSport: 'nba' | 'nfl';
  onToggleSport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  currentSport,
  onToggleSport
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-2xs select-none">
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
