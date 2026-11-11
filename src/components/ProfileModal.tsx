import React, { useState, useEffect } from 'react';
import { X, Check, Copy, ChevronRight, AlertCircle, Shield, Sliders, Tv, LogOut } from 'lucide-react';
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
  const [isFlipped, setIsFlipped] = useState(false);

  // Sub-dialogs when clicking into a setting on the back of the card
  const [activeDialog, setActiveDialog] = useState<'team' | null>(null);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDialog) setActiveDialog(null);
        else onClose();
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeDialog, onClose]);

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

  const selectedTeamObj = ALL_TEAMS.find(t => t.id === favoriteTeamId);
  const selectedTeamName = selectedTeamObj ? selectedTeamObj.displayName : 'None Selected';

  const handleSelectTeam = (id: string) => {
    setFavoriteTeamId(id);
    if (id) localStorage.setItem('bss_favorite_team', id);
    else localStorage.removeItem('bss_favorite_team');
    onSettingsChange?.();
    setActiveDialog(null);
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
    setTimeout(() => setProblemReported(false), 2500);
  };

  const handleCopyIptv = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bigsuustreams.com';
    const cleanOrigin = origin.includes('localhost') ? 'https://bigsuustreams.com' : origin;
    const url = `${cleanOrigin}/playlist.m3u`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedIptv(true);
    setTimeout(() => setCopiedIptv(false), 2500);
  };

  // Ultra-crisp SVG for the FRONT of the 3D card
  const frontBadgeDataUrl = () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
        <rect width="600" height="900" rx="46" fill="#ffffff" stroke="#e2e8f0" stroke-width="4"/>
        <circle cx="300" cy="70" r="20" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="3"/>

        <text x="300" y="180" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="30" fill="#0f172a" text-anchor="middle" letter-spacing="4">
          COURTSIDE
        </text>
        <rect x="210" y="220" width="180" height="38" rx="19" fill="${isVip ? '#fef3c7' : '#f1f5f9'}" stroke="${isVip ? '#fbbf24' : '#e2e8f0'}" stroke-width="2"/>
        <text x="300" y="245" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="15" fill="${isVip ? '#b45309' : '#64748b'}" text-anchor="middle" letter-spacing="2">
          ${roleName}
        </text>

        <circle cx="300" cy="440" r="105" fill="${isVip ? '#fffbeb' : '#f8fafc'}" stroke="${isVip ? '#d97706' : '#0f172a'}" stroke-width="4"/>
        <text x="300" y="475" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="82" fill="${isVip ? '#b45309' : '#0f172a'}" text-anchor="middle">
          ${initials}
        </text>

        <text x="300" y="625" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="44" fill="#0f172a" text-anchor="middle" letter-spacing="-1">
          ${displayName}
        </text>

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
        <text x="300" y="830" font-family="monospace" font-weight="700" font-size="16" fill="#ea580c" text-anchor="middle" letter-spacing="4">
          TAP CARD TO OPEN SETTINGS
        </text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-sm sm:max-w-md h-[88vh] flex flex-col items-center justify-between">
        
        {/* Floating Close Button Top Right */}
        <div className="w-full flex justify-end px-2 pt-2 z-30">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer active:scale-95 shadow-lg border border-white/20"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Card Area: Interactive 3D Lanyard on FRONT, or Interactive Settings on BACK */}
        <div className="w-full flex-1 relative flex items-center justify-center overflow-hidden my-auto">
          
          {!isFlipped ? (
            /* FRONT: 3D Swinging Lanyard Badge */
            <div 
              className="w-full h-full relative cursor-pointer flex items-center justify-center"
              onClick={() => setIsFlipped(true)}
              title="Click badge to open card settings"
            >
              <Lanyard
                frontImage={frontBadgeDataUrl()}
                backImage={frontBadgeDataUrl()}
                cardColor="#ffffff"
                strapColor={isVip ? '#d97706' : '#1e293b'}
                metal={isVip ? 'gold' : 'silver'}
                size={0.82}
                strapLength={0.4}
                strapWidth={0.65}
                finish="glossy"
                gravity={1.2}
                damping={0.45}
                elasticity={0.45}
                breeze={0.25}
                interactive={true}
                intro={true}
                className="w-full h-full pointer-events-none"
              />
              
              {/* Tap to Flip Hint Button directly over/below badge */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-auto">
                <button
                  onClick={() => setIsFlipped(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-xl border border-orange-400/50 backdrop-blur-md transition active:scale-95 flex items-center space-x-2"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Card Settings ⚙️</span>
                </button>
              </div>
            </div>
          ) : (
            /* BACK: Interactive HTML Settings Card (matching lanyard card proportions) */
            <div className="relative w-[300px] sm:w-[320px] bg-white rounded-3xl p-5 shadow-2xl border-4 border-orange-500 flex flex-col justify-between max-h-[92%] overflow-y-auto animate-in zoom-in-95 duration-200">
              
              {/* Lanyard Top Ring Slot (decorative) */}
              <div className="w-full flex items-center justify-between pb-2 border-b border-gray-100">
                <button
                  onClick={() => setIsFlipped(false)}
                  className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center space-x-1 cursor-pointer"
                >
                  <span>← Flip to Front</span>
                </button>
                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Settings</span>
              </div>

              {/* Editable Setting Rows inside the Card */}
              <div className="space-y-3 pt-3">
                
                {/* 1. Your Team */}
                <div 
                  onClick={() => setActiveDialog('team')}
                  className="bg-slate-50 hover:bg-slate-100 rounded-xl p-3 border border-slate-200 transition cursor-pointer active:scale-[0.98]"
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Your Team</span>
                    <span className="text-orange-600 text-[11px] font-bold">Edit ✎</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-0.5 truncate flex items-center justify-between">
                    <span>{selectedTeamName}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* 2. Show or Hide Final Scores */}
                <div 
                  onClick={handleToggleHideScores}
                  className="bg-slate-50 hover:bg-slate-100 rounded-xl p-3 border border-slate-200 transition cursor-pointer active:scale-[0.98] flex items-center justify-between"
                >
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Show or Hide Final Scores
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {hideScores ? 'Scores Hidden (Spoiler Shield)' : 'Show Live Scores'}
                    </div>
                  </div>
                  <div className={`w-11 h-6 rounded-full p-1 transition-colors ${hideScores ? 'bg-orange-600' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${hideScores ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* 3. Playback Stream */}
                <div 
                  onClick={handleToggleQuality}
                  className="bg-slate-50 hover:bg-slate-100 rounded-xl p-3 border border-slate-200 transition cursor-pointer active:scale-[0.98] flex items-center justify-between"
                >
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Playback Stream
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {streamQualityMode === 'highest' ? 'Highest (1080p FHD)' : 'Consistent Stream (Auto)'}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-orange-600">Toggle</span>
                </div>

                {/* 4. Cyberdash / IPTV Playlist */}
                <div 
                  onClick={handleCopyIptv}
                  className="bg-orange-50 hover:bg-orange-100/80 rounded-xl p-3 border border-orange-200 transition cursor-pointer active:scale-[0.98]"
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-orange-700 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Tv className="w-3 h-3" />
                      <span>Cyberdash / IPTV</span>
                    </span>
                    <span className="text-xs font-bold text-orange-600">
                      {copiedIptv ? '✓ Copied!' : 'Copy'}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-1 truncate">
                    /playlist.m3u
                  </div>
                </div>

                {/* 5. Report a Problem */}
                <div 
                  onClick={handleReport}
                  className="bg-slate-50 hover:bg-slate-100 rounded-xl p-3 border border-slate-200 transition cursor-pointer active:scale-[0.98] flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {problemReported ? 'Problem Reported!' : 'Report a problem'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        It'll be fixed ASAP
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

              </div>

              {/* Sign Out at bottom of card */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3">
                <button
                  onClick={() => setIsFlipped(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Done
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="text-xs font-black text-red-600 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Pop-up Dialog to Select Your Team when clicked inside the card */}
      {activeDialog === 'team' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Select Your Team</h3>
              <button 
                onClick={() => setActiveDialog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 my-2">
              <button
                onClick={() => handleSelectTeam('')}
                className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between"
              >
                <span>None (No favorite)</span>
                {!favoriteTeamId && <Check className="w-4 h-4 text-orange-600" />}
              </button>

              <div className="py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 px-3">
                🏀 NBA Teams
              </div>
              {ALL_TEAMS.filter(t => t.league === 'NBA').map(team => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team.id)}
                  className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center justify-between"
                >
                  <span>{team.displayName}</span>
                  {favoriteTeamId === team.id && <Check className="w-4 h-4 text-orange-600" />}
                </button>
              ))}

              <div className="py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 px-3">
                🏈 NFL Teams
              </div>
              {ALL_TEAMS.filter(t => t.league === 'NFL').map(team => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team.id)}
                  className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center justify-between"
                >
                  <span>{team.displayName}</span>
                  {favoriteTeamId === team.id && <Check className="w-4 h-4 text-orange-600" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveDialog(null)}
              className="w-full py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfileModal;
