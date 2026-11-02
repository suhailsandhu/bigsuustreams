import React from 'react';

interface NflLogoProps {
  className?: string;
}

export const NflLogo: React.FC<NflLogoProps> = ({ className = 'h-16 sm:h-20 w-auto' }) => {
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 160 140"
        className="h-full w-auto filter drop-shadow-2xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Shield Outline */}
        <path
          d="M80 6 L134 22 C134 62 122 104 80 128 C38 104 26 62 26 22 Z"
          fill="#013369"
          stroke="#D50A0A"
          strokeWidth="3.5"
        />

        {/* Inner Shield White Border */}
        <path
          d="M80 12 L128 26 C128 62 117 99 80 121 C43 99 32 62 32 26 Z"
          fill="#013369"
          stroke="#FFFFFF"
          strokeWidth="2.5"
        />

        {/* Top Dark Navy Section with Football */}
        <ellipse cx="80" cy="40" rx="14" ry="9" fill="#955227" stroke="#FFFFFF" strokeWidth="1.5" />
        <line x1="72" y1="40" x2="88" y2="40" stroke="#FFFFFF" strokeWidth="1.5" />
        <line x1="76" y1="37" x2="76" y2="43" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="80" y1="36" x2="80" y2="44" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="84" y1="37" x2="84" y2="43" stroke="#FFFFFF" strokeWidth="1" />

        {/* Stars on Left & Right */}
        <g fill="#FFFFFF">
          <circle cx="48" cy="36" r="2.2" />
          <circle cx="56" cy="44" r="2.2" />
          <circle cx="104" cy="44" r="2.2" />
          <circle cx="112" cy="36" r="2.2" />
        </g>

        {/* NFL Bold Varsity Letters */}
        <text
          x="80"
          y="78"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="24"
          letterSpacing="2.5"
        >
          NFL
        </text>

        {/* STREAMS Banner */}
        <rect x="24" y="92" width="112" height="26" rx="6" fill="#D50A0A" stroke="#FFFFFF" strokeWidth="1.5" />
        <text
          x="80"
          y="110"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="14"
          letterSpacing="3"
        >
          STREAMS
        </text>
      </svg>
    </div>
  );
};
