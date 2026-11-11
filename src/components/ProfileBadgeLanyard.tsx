import React, { useMemo } from 'react';
import Lanyard from './Lanyard';

interface ProfileBadgeLanyardProps {
  displayName: string;
  email: string;
  isVip: boolean;
  initials: string;
  className?: string;
}

export const ProfileBadgeLanyard: React.FC<ProfileBadgeLanyardProps> = ({
  displayName,
  email,
  isVip,
  initials,
  className = ''
}) => {
  // Generate crisp front and back SVG data URLs for the 3D swinging badge
  const frontBadgeDataUrl = useMemo(() => {
    const bgGradient = isVip
      ? '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="50%" stop-color="#312e81"/><stop offset="100%" stop-color="#0f172a"/></linearGradient>'
      : '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#18181b"/><stop offset="100%" stop-color="#09090b"/></linearGradient>';

    const borderStroke = isVip ? '#fbbf24' : '#52525b';
    const tagText = isVip ? 'VIP PASS' : 'MEMBER PASS';
    const tagBg = isVip ? '#d97706' : '#27272a';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
        <defs>
          ${bgGradient}
        </defs>
        <rect width="600" height="900" rx="36" fill="url(#g)" stroke="${borderStroke}" stroke-width="6"/>
        
        <!-- Top Strap Hole Area -->
        <circle cx="300" cy="65" r="22" fill="#000000" opacity="0.3"/>

        <!-- Header Branding -->
        <text x="300" y="160" font-family="-apple-system, sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="4">
          COURTSIDE
        </text>
        <text x="300" y="195" font-family="-apple-system, sans-serif" font-weight="700" font-size="20" fill="${isVip ? '#fbbf24' : '#ea580c'}" text-anchor="middle" letter-spacing="3">
          LIVE STREAM ACCESS
        </text>

        <!-- Pass Type Pill -->
        <rect x="200" y="240" width="200" height="42" rx="21" fill="${tagBg}"/>
        <text x="300" y="267" font-family="-apple-system, sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle" letter-spacing="2">
          ${tagText}
        </text>

        <!-- Avatar Circle -->
        <circle cx="300" cy="420" r="85" fill="${isVip ? '#fef3c7' : '#27272a'}" stroke="${isVip ? '#f59e0b' : '#3f3f46'}" stroke-width="4"/>
        <text x="300" y="445" font-family="-apple-system, sans-serif" font-weight="900" font-size="64" fill="${isVip ? '#b45309' : '#ffffff'}" text-anchor="middle">
          ${initials}
        </text>

        <!-- User Information -->
        <text x="300" y="560" font-family="-apple-system, sans-serif" font-weight="800" font-size="36" fill="#ffffff" text-anchor="middle">
          ${displayName.length > 18 ? displayName.slice(0, 18) + '...' : displayName}
        </text>
        <text x="300" y="600" font-family="-apple-system, sans-serif" font-weight="500" font-size="22" fill="#a1a1aa" text-anchor="middle">
          ${email.length > 26 ? email.slice(0, 26) + '...' : email}
        </text>

        <!-- Barcode / Security ID Details -->
        <line x1="80" y1="670" x2="520" y2="670" stroke="${borderStroke}" stroke-width="2" stroke-dasharray="8 6"/>
        
        <g fill="#ffffff" opacity="0.85">
          <rect x="100" y="710" width="8" height="60"/>
          <rect x="115" y="710" width="16" height="60"/>
          <rect x="140" y="710" width="6" height="60"/>
          <rect x="155" y="710" width="22" height="60"/>
          <rect x="185" y="710" width="12" height="60"/>
          <rect x="205" y="710" width="8" height="60"/>
          <rect x="220" y="710" width="18" height="60"/>
          <rect x="245" y="710" width="10" height="60"/>
          <rect x="265" y="710" width="24" height="60"/>
          <rect x="300" y="710" width="8" height="60"/>
          <rect x="315" y="710" width="14" height="60"/>
          <rect x="340" y="710" width="20" height="60"/>
          <rect x="370" y="710" width="10" height="60"/>
          <rect x="390" y="710" width="28" height="60"/>
          <rect x="430" y="710" width="12" height="60"/>
          <rect x="450" y="710" width="16" height="60"/>
          <rect x="475" y="710" width="8" height="60"/>
        </g>
        <text x="300" y="805" font-family="monospace" font-weight="700" font-size="18" fill="#a1a1aa" text-anchor="middle" letter-spacing="6">
          BSS-PASS-7865
        </text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [displayName, email, isVip, initials]);

  return (
    <div className={`w-full h-[270px] sm:h-[310px] relative rounded-2xl overflow-hidden bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 flex items-center justify-center ${className}`}>
      {/* 3D WebGL Swinging Lanyard Badge */}
      <Lanyard
        frontImage={frontBadgeDataUrl}
        backImage={frontBadgeDataUrl}
        cardColor={isVip ? '#1e1b4b' : '#18181b'}
        strapColor={isVip ? '#d97706' : '#27272a'}
        metal={isVip ? 'gold' : 'silver'}
        size={0.65}
        strapLength={0.45}
        strapWidth={0.6}
        finish={isVip ? 'holographic' : 'glossy'}
        gravity={1.2}
        damping={0.45}
        elasticity={0.45}
        breeze={0.3}
        interactive={true}
        intro={true}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
        <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400/80 bg-neutral-900/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-neutral-800/80">
          Touch or drag badge
        </span>
      </div>
    </div>
  );
};

export default ProfileBadgeLanyard;
