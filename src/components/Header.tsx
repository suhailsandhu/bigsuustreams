import React from 'react';

interface HeaderProps {
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateHome }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        
        {/* NBA Streams Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center cursor-pointer group py-1"
          title="NBA Streams Home"
        >
          <img
            src="/logo.png"
            alt="NBA Streams"
            className="h-11 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </div>

        {/* Right side is kept completely clean */}
        <div />
      </div>
    </header>
  );
};
