import React from 'react';

interface NflLogoProps {
  className?: string;
}

export const NflLogo: React.FC<NflLogoProps> = ({ className = 'h-16 sm:h-20 w-auto' }) => {
  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <img
        src="/nfl-shield.png"
        alt="NFL"
        className="h-full w-auto object-contain filter drop-shadow-2xs"
      />
    </div>
  );
};
