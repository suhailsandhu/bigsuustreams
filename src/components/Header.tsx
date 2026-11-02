import React from 'react';

export type NavTab = 'games' | 'standings';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onNavigateHome
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Left: Bigger NBA Streams Logo + GAMES and STANDINGS navigation */}
        <div className="flex items-center space-x-6 sm:space-x-10">
          {/* Bigger, formatted NBA Streams Logo */}
          <div
            onClick={() => {
              onTabChange('games');
              onNavigateHome();
            }}
            className="flex items-center cursor-pointer group py-1"
            title="NBA Streams"
          >
            <img
              src="/logo.png"
              alt="NBA Streams"
              className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </div>

          {/* Nav Tabs: GAMES, STANDINGS */}
          <nav className="flex items-center space-x-4 sm:space-x-8">
            <button
              onClick={() => {
                onTabChange('games');
                onNavigateHome();
              }}
              className={`text-sm sm:text-base tracking-wider uppercase transition-all cursor-pointer py-1 ${
                activeTab === 'games'
                  ? 'text-black font-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-black font-bold'
              }`}
            >
              GAMES
            </button>

            <button
              onClick={() => onTabChange('standings')}
              className={`text-sm sm:text-base tracking-wider uppercase transition-all cursor-pointer py-1 ${
                activeTab === 'standings'
                  ? 'text-black font-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-black font-bold'
              }`}
            >
              STANDINGS
            </button>
          </nav>
        </div>

        {/* Right side is kept completely clean (no live, refresh, search, or app buttons) */}
        <div />
      </div>
    </header>
  );
};
