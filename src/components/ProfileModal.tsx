import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ALL_TEAMS } from '../data/nbaTeams';
import Lanyard from './Lanyard';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onLogout: () => void;
  onSettingsChange?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onSettingsChange
}) => {
  const [favoriteTeamId, setFavoriteTeamId] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_favorite_team')) || '';
  });

  const [hideScores, setHideScores] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('bss_hide_scores') === 'true';
  });

  const [streamQualityMode, setStreamQualityMode] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_stream_quality_mode')) || 'auto';
  });

  const [problemReported, setProblemReported] = useState(false);
  const [copiedIptv, setCopiedIptv] = useState(false);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isVip = Boolean(
    currentUser?.email?.toLowerCase() === 'sandhu.suhail@gmail.com' ||
    currentUser?.username?.toLowerCase() === 'sandhu.suhail@gmail.com' ||
    currentUser?.username?.toLowerCase() === 'bigsuu' ||
    currentUser?.role === 'vip' ||
    currentUser?.isVip === true
  );

  const displayName = currentUser?.displayName || currentUser?.username || 'Big Suu';
  const roleName = isVip ? 'VIP PASS' : 'MEMBER PASS';
  const initials = (displayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'BS').toUpperCase();

  const handleFavoriteTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFavoriteTeamId(val);
    if (val) localStorage.setItem('bss_favorite_team', val);
    else localStorage.removeItem('bss_favorite_team');
    onSettingsChange?.();
  };

  const handleToggleHideScores = () => {
    const next = !hideScores;
    setHideScores(next);
    localStorage.setItem('bss_hide_scores', next ? 'true' : 'false');
    onSettingsChange?.();
  };

  const handleToggleQuality = () => {
    const next = streamQualityMode === 'highest' ? 'auto' : 'highest';
    setStreamQualityMode(next);
    localStorage.setItem('bss_stream_quality_mode', next);
    onSettingsChange?.();
  };

  const handleReport = () => {
    setProblemReported(true);
    setTimeout(() => setProblemReported(false), 3000);
  };

  const handleCopyIptv = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bigsuustreams.com';
    const cleanOrigin = origin.includes('localhost') ? 'https://bigsuustreams.com' : origin;
    const url = `${cleanOrigin}/playlist.m3u`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedIptv(true);
    setTimeout(() => setCopiedIptv(false), 2500);
  };

  // Ultra-crisp, premium pure white card for the FRONT (only username, pass type & initials)
  const frontBadgeDataUrl = () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
        <rect width="600" height="900" rx="46" fill="#ffffff" stroke="#e2e8f0" stroke-width="4"/>
        
        <!-- Top Strap Ring Slot -->
        <circle cx="300" cy="70" r="20" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="3"/>

        <!-- Header Tag -->
        <text x="300" y="180" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="30" fill="#0f172a" text-anchor="middle" letter-spacing="4">
          COURTSIDE
        </text>
        <rect x="210" y="220" width="180" height="38" rx="19" fill="${isVip ? '#fef3c7' : '#f1f5f9'}" stroke="${isVip ? '#fbbf24' : '#e2e8f0'}" stroke-width="2"/>
        <text x="300" y="245" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="15" fill="${isVip ? '#b45309' : '#64748b'}" text-anchor="middle" letter-spacing="2">
          ${roleName}
        </text>

        <!-- Premium Avatar Circle -->
        <circle cx="300" cy="440" r="105" fill="${isVip ? '#fffbeb' : '#f8fafc'}" stroke="${isVip ? '#d97706' : '#0f172a'}" stroke-width="4"/>
        <text x="300" y="475" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="82" fill="${isVip ? '#b45309' : '#0f172a'}" text-anchor="middle">
          ${initials}
        </text>

        <!-- Username Only (Clean & Bold) -->
        <text x="300" y="625" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="44" fill="#0f172a" text-anchor="middle" letter-spacing="-1">
          ${displayName}
        </text>

        <!-- Subtle Barcode / Security Strip -->
        <line x1="90" y1="720" x2="510" y2="720" stroke="#e2e8f0" stroke-width="2"/>
        <g fill="#94a3b8" opacity="0.6">
          <rect x="110" y="745" width="8" height="50"/>
          <rect x="125" y="745" width="18" height="50"/>
          <rect x="150" y="745" width="6" height="50"/>
          <rect x="165" y="745" width="24" height="50"/>
          <rect x="195" y="745" width="12" height="50"/>
          <rect x="215" y="745" width="8" height="50"/>
          <rect x="230" y="745" width="20" height="50"/>
          <rect x="260" y="745" width="12" height="50"/>
          <rect x="280" y="745" width="28" height="50"/>
          <rect x="320" y="745" width="8" height="50"/>
          <rect x="335" y="745" width="16" height="50"/>
          <rect x="360" y="745" width="22" height="50"/>
          <rect x="390" y="745" width="10" height="50"/>
          <rect x="410" y="745" width="30" height="50"/>
          <rect x="450" y="745" width="14" height="50"/>
          <rect x="475" y="745" width="8" height="50"/>
        </g>
        <text x="300" y="830" font-family="monospace" font-weight="700" font-size="16" fill="#94a3b8" text-anchor="middle" letter-spacing="5">
          TOUCH CARD TO FLIP
        </text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // Ultra-crisp, premium pure white card for the BACK (All Settings directly printed on the back of the card)
  const backBadgeDataUrl = () => {
    const selectedTeamObj = ALL_TEAMS.find(t => t.id === favoriteTeamId);
    const teamText = selectedTeamObj ? selectedTeamObj.displayName : 'None Selected';
    const qualityText = streamQualityMode === 'highest' ? 'Highest (1080p FHD)' : 'Consistent Stream (Auto)';
    const spoilerText = hideScores ? 'Scores Hidden (Active)' : 'Show Live Scores';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
        <rect width="600" height="900" rx="46" fill="#ffffff" stroke="#ea580c" stroke-width="4"/>
        
        <!-- Top Slot -->
        <circle cx="300" cy="70" r="20" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="3"/>

        <!-- Header -->
        <text x="300" y="160" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="28" fill="#0f172a" text-anchor="middle" letter-spacing="3">
          CARD SETTINGS
        </text>
        <line x1="80" y1="195" x2="520" y2="195" stroke="#f1f5f9" stroke-width="3"/>

        <!-- Setting 1: Favorite Team -->
        <text x="80" y="240" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="16" fill="#94a3b8" letter-spacing="2">
          FAVORITE TEAM
        </text>
        <rect x="80" y="255" width="440" height="60" rx="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
        <text x="110" y="295" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="20" fill="#0f172a">
          ${teamText.length > 22 ? teamText.slice(0, 22) + '...' : teamText}
        </text>

        <!-- Setting 2: Spoiler Shield -->
        <text x="80" y="350" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="16" fill="#94a3b8" letter-spacing="2">
          HIDE FINAL SCORES
        </text>
        <rect x="80" y="365" width="440" height="60" rx="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
        <text x="110" y="405" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="20" fill="${hideScores ? '#ea580c' : '#0f172a'}">
          ${spoilerText}
        </text>

        <!-- Setting 3: Playback Quality -->
        <text x="80" y="460" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="16" fill="#94a3b8" letter-spacing="2">
          PLAYBACK STREAM
        </text>
        <rect x="80" y="475" width="440" height="60" rx="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
        <text x="110" y="515" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="20" fill="#0f172a">
          ${qualityText}
        </text>

        <!-- Setting 4: Cyberdash IPTV -->
        <text x="80" y="570" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="16" fill="#94a3b8" letter-spacing="2">
          CYBERDASH / IPTV PLAYLIST
        </text>
        <rect x="80" y="585" width="440" height="60" rx="14" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
        <text x="110" y="623" font-family="monospace" font-weight="800" font-size="18" fill="#ea580c">
          /playlist.m3u
        </text>

        <!-- Footer Help -->
        <line x1="80" y1="695" x2="520" y2="695" stroke="#f1f5f9" stroke-width="3"/>
        <text x="300" y="745" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="700" font-size="18" fill="#64748b" text-anchor="middle">
          Tap controls below to edit or copy
        </text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Direct Full-Screen Lanyard Experience (Zero Big White Box Overlay) */}
      <div className="relative w-full max-w-sm sm:max-w-md h-[88vh] flex flex-col items-center justify-between">
        
        {/* Floating Close Button Top Right */}
        <div className="w-full flex justify-end px-2 pt-2">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer active:scale-95 shadow-lg border border-white/20"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Interactive Swinging Lanyard Badge (White finish, flips on click/drag) */}
        <div className="w-full flex-1 relative flex items-center justify-center overflow-hidden">
          <Lanyard
            frontImage={frontBadgeDataUrl()}
            backImage={backBadgeDataUrl()}
            cardColor="#ffffff"
            strapColor={isVip ? '#d97706' : '#1e293b'}
            metal={isVip ? 'gold' : 'silver'}
            size={0.8}
            strapLength={0.4}
            strapWidth={0.65}
            finish="glossy"
            gravity={1.2}
            damping={0.45}
            elasticity={0.45}
            breeze={0.25}
            interactive={true}
            intro={true}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />
        </div>

        {/* Minimal Transparent Floating Control Dock (No box around badge) */}
        <div className="w-full px-2 pb-4 space-y-2 z-20">
          
          {/* Quick Team / Shield / Stream Toggle Pills */}
          <div className="flex items-center justify-center space-x-2">
            
            {/* Quick Favorite Team Selector */}
            <div className="relative">
              <select
                value={favoriteTeamId}
                onChange={handleFavoriteTeamChange}
                className="bg-black/75 hover:bg-black/90 text-white text-xs font-bold py-2 px-3.5 rounded-full border border-white/20 shadow-lg backdrop-blur-md transition cursor-pointer focus:outline-none"
              >
                <option value="" className="text-gray-900 bg-white">Team: None</option>
                <optgroup label="🏀 NBA Basketball" className="text-gray-900 bg-white">
                  {ALL_TEAMS.filter(t => t.league === 'NBA').map(team => (
                    <option key={team.id} value={team.id} className="text-gray-900 bg-white">
                      Team: {team.displayName}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏈 NFL Football" className="text-gray-900 bg-white">
                  {ALL_TEAMS.filter(t => t.league === 'NFL').map(team => (
                    <option key={team.id} value={team.id} className="text-gray-900 bg-white">
                      Team: {team.displayName}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Quick Spoiler Toggle Pill */}
            <button
              onClick={handleToggleHideScores}
              className={`text-xs font-bold py-2 px-3.5 rounded-full border shadow-lg backdrop-blur-md transition cursor-pointer active:scale-95 ${
                hideScores
                  ? 'bg-orange-600 text-white border-orange-500'
                  : 'bg-black/75 hover:bg-black/90 text-white border-white/20'
              }`}
            >
              {hideScores ? 'Scores: Hidden' : 'Scores: Visible'}
            </button>

            {/* Quality Mode Toggle Pill */}
            <button
              onClick={handleToggleQuality}
              className="bg-black/75 hover:bg-black/90 text-white text-xs font-bold py-2 px-3.5 rounded-full border border-white/20 shadow-lg backdrop-blur-md transition cursor-pointer active:scale-95"
            >
              {streamQualityMode === 'highest' ? 'Quality: 1080p' : 'Quality: Auto'}
            </button>

          </div>

          {/* Cyberdash / IPTV M3U Playlist Quick-Copy Pill */}
          <div className="flex justify-center pt-0.5">
            <button
              onClick={handleCopyIptv}
              className={`text-xs font-bold py-1.5 px-4 rounded-full border shadow-lg backdrop-blur-md transition cursor-pointer active:scale-95 flex items-center space-x-1.5 ${
                copiedIptv
                  ? 'bg-green-600/90 text-white border-green-400'
                  : 'bg-black/75 hover:bg-black/90 text-white border-orange-500/50 hover:border-orange-400'
              }`}
              title="Copy M3U Playlist link for Cyberdash / CyberTube IPTV"
            >
              <span className="text-sm">📺</span>
              <span>{copiedIptv ? '✓ Copied /playlist.m3u!' : 'Copy Cyberdash IPTV Link'}</span>
            </button>
          </div>

          {/* Report a Problem Button with 'i' icon & Caption underneath */}
          <div className="flex flex-col items-center justify-center pt-1">
            <button
              onClick={handleReport}
              className="bg-black/80 hover:bg-black text-white text-xs font-bold py-2 px-5 rounded-full border border-white/20 shadow-lg backdrop-blur-md transition cursor-pointer flex items-center space-x-1.5 active:scale-95"
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black italic">
                i
              </span>
              <span>{problemReported ? 'Problem Reported!' : 'Report a problem'}</span>
            </button>
            <span className="text-[11px] font-semibold text-white/90 drop-shadow-sm mt-1">
              It'll be fixed ASAP
            </span>
          </div>

          {/* Clean Sign Out link */}
          <div className="flex justify-center pt-0.5">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="text-[11px] font-bold text-white/70 hover:text-white transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ProfileModal;
