import React from 'react';

interface NflLogoProps {
  className?: string;
}

export const NflLogo: React.FC<NflLogoProps> = ({ className = 'h-16 sm:h-22 w-auto' }) => {
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* Official NFL Shield Image provided by user */}
      <img
        src="/nfl-shield.png"
        alt="NFL"
        className="h-14 sm:h-18 md:h-22 w-auto object-contain filter drop-shadow-2xs"
      />
      {/* Word 'STREAMS' in NFL Red */}
      <span className="text-[#D50A0A] font-black tracking-[0.25em] text-[11px] sm:text-xs md:text-sm font-sans uppercase mt-1 leading-none drop-shadow-2xs">
        STREAMS
      </span>
    </div>
  );
};
