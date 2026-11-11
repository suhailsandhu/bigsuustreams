import React, { useState, useEffect } from 'react';
import { X, Check, ChevronRight, AlertCircle, LogOut, Send, CheckCircle2 } from 'lucide-react';
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
  // Support multiple favorite teams (array of team IDs)
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('bss_favorite_teams');
      if (stored) return JSON.parse(stored);
      const single = localStorage.getItem('bss_favorite_team');
      return single ? [single] : [];
    } catch {
      return [];
    }
  });

  const [hideScores, setHideScores] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('bss_hide_scores') === 'true';
  });

  const [streamQualityMode, setStreamQualityMode] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_stream_quality_mode')) || 'auto';
  });

  const [isFlipped, setIsFlipped] = useState(false);

  // Sub-dialogs: 'team' picker or 'report' problem dialog
  const [activeDialog, setActiveDialog] = useState<'team' | 'report' | null>(null);

  // Report a problem state
  const [problemMessage, setProblemMessage] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [teamTab, setTeamTab] = useState<'ALL' | 'NBA' | 'NFL'>('NBA');
  const [teamSearch, setTeamSearch] = useState('');

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

  const selectedTeams = ALL_TEAMS.filter(t => favoriteTeamIds.includes(t.id));

  // Toggle favorite team selection (allows adding multiple)
  const handleToggleTeam = (id: string) => {
    let next: string[];
    if (favoriteTeamIds.includes(id)) {
      next = favoriteTeamIds.filter(t => t !== id);
    } else {
      next = [...favoriteTeamIds, id];
    }
    setFavoriteTeamIds(next);
    localStorage.setItem('bss_favorite_teams', JSON.stringify(next));
    if (next.length > 0) {
      localStorage.setItem('bss_favorite_team', next[0]);
    } else {
      localStorage.removeItem('bss_favorite_team');
    }
    onSettingsChange?.();
  };

  const handleClearTeams = () => {
    setFavoriteTeamIds([]);
    localStorage.removeItem('bss_favorite_teams');
    localStorage.removeItem('bss_favorite_team');
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

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemMessage.trim() || isSubmittingReport) return;
    setIsSubmittingReport(true);

    try {
      await fetch('/api/report-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: problemMessage.trim(),
          user: displayName,
          email: currentUser?.email || 'anonymous',
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    } catch {
      // safe fallback
    }

    setIsSubmittingReport(false);
    setReportSubmitted(true);
    setProblemMessage('');
    setTimeout(() => {
      setReportSubmitted(false);
      setActiveDialog(null);
    }, 2200);
  };

  // Ultra-crisp SVG for the FRONT of the 3D card (says BSS STREAMS)
  const frontBadgeDataUrl = () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
        <rect width="600" height="900" rx="46" fill="#ffffff" stroke="#e2e8f0" stroke-width="4"/>
        <circle cx="300" cy="70" r="20" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="3"/>

        <!-- Header Tag: BSS STREAMS -->
        <text x="300" y="180" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="32" fill="#0f172a" text-anchor="middle" letter-spacing="3">
          BSS STREAMS
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

        <!-- Username -->
        <text x="300" y="625" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="44" fill="#0f172a" text-anchor="middle" letter-spacing="-1">
          ${displayName}
        </text>

        <!-- Barcode / Strip -->
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

  // Ultra-crisp SVG for the BACK of the 3D card
  const backBadgeDataUrl = () => {
    const teamsText = selectedTeams.length > 0 
      ? selectedTeams.map(t => t.name).join(', ')
      : 'None Selected';
    const qualityText = streamQualityMode === 'highest' ? 'Highest (1080p FHD)' : 'Consistent Stream (Auto)';
    const spoilerText = hideScores ? 'Scores Hidden (Active)' : 'Show Live Scores';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
        <rect width="600" height="900" rx="46" fill="#ffffff" stroke="#ea580c" stroke-width="4"/>
        <circle cx="300" cy="70" r="20" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="3"/>

        <text x="300" y="160" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="28" fill="#0f172a" text-anchor="middle" letter-spacing="3">
          CARD SETTINGS
        </text>
        <line x1="80" y1="195" x2="520" y2="195" stroke="#f1f5f9" stroke-width="3"/>

        <!-- Setting 1: Favorite Teams -->
        <text x="80" y="240" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="16" fill="#94a3b8" letter-spacing="2">
          FAVORITE TEAMS (${selectedTeams.length})
        </text>
        <rect x="80" y="255" width="440" height="60" rx="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
        <text x="110" y="295" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="18" fill="#0f172a">
          ${teamsText.length > 24 ? teamsText.slice(0, 24) + '...' : teamsText}
        </text>

        <!-- Setting 2: Spoiler Shield -->
        <text x="80" y="360" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="16" fill="#94a3b8" letter-spacing="2">
          HIDE FINAL SCORES
        </text>
        <rect x="80" y="375" width="440" height="60" rx="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
        <text x="110" y="415" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="18" fill="${hideScores ? '#ea580c' : '#0f172a'}">
          ${spoilerText}
        </text>

        <!-- Setting 3: Playback Quality -->
        <text x="80" y="480" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="16" fill="#94a3b8" letter-spacing="2">
          PLAYBACK STREAM
        </text>
        <rect x="80" y="495" width="440" height="60" rx="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
        <text x="110" y="535" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="18" fill="#0f172a">
          ${qualityText}
        </text>

        <!-- Setting 4: Report a Problem -->
        <text x="80" y="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="16" fill="#94a3b8" letter-spacing="2">
          REPORT A PROBLEM
        </text>
        <rect x="80" y="615" width="440" height="60" rx="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
        <text x="110" y="655" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="18" fill="#0f172a">
          Tap to send issue details
        </text>

        <line x1="80" y1="715" x2="520" y2="715" stroke="#f1f5f9" stroke-width="3"/>
        <text x="300" y="775" font-family="monospace" font-weight="700" font-size="16" fill="#ea580c" text-anchor="middle" letter-spacing="4">
          TAP TO EDIT SETTINGS
        </text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const filteredTeams = ALL_TEAMS.filter(t => {
    if (teamTab !== 'ALL' && t.league !== teamTab) return false;
    if (teamSearch.trim()) {
      const q = teamSearch.toLowerCase();
      return t.displayName.toLowerCase().includes(q) || t.abbreviation.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    }
    return true;
  });

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

        {/* 3D Card Flipping Container */}
        <div 
          className="w-full flex-1 relative flex items-center justify-center my-auto"
          style={{ perspective: '1200px' }}
        >
          <div 
            className="w-full h-full relative transition-transform duration-600 ease-in-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            
            {/* FRONT FACE: 3D Swinging Lanyard Badge */}
            <div 
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
              onClick={() => setIsFlipped(true)}
              title="Tap card to flip to settings"
            >
              <Lanyard
                frontImage={frontBadgeDataUrl()}
                backImage={backBadgeDataUrl()}
                cardColor="#ffffff"
                strapColor={isVip ? '#d97706' : '#1e293b'}
                metal={isVip ? 'gold' : 'silver'}
                size={0.82}
                strapLength={0.4}
                strapWidth={0.65}
                finish="glossy"
                gravity={1.2}
                damping={0.6}
                elasticity={0.3}
                breeze={0.15}
                interactive={true}
                intro={true}
                className="w-full h-full cursor-pointer"
              />
            </div>

            {/* BACK FACE: Interactive HTML Settings Card */}
            <div 
              className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-auto"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="relative w-[300px] sm:w-[325px] bg-white rounded-3xl p-5 shadow-2xl border-4 border-orange-500 flex flex-col justify-between max-h-[92%] overflow-y-auto">
                
                {/* Lanyard Top Ring Slot */}
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
                  
                  {/* 1. Favorite Teams (Multi-team with logos) */}
                  <div 
                    onClick={() => setActiveDialog('team')}
                    className="bg-slate-50 hover:bg-slate-100 rounded-2xl p-3 border border-slate-200 transition cursor-pointer active:scale-[0.98]"
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Favorite Teams ({selectedTeams.length})</span>
                      <span className="text-orange-600 text-[11px] font-bold">Edit ✎</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {selectedTeams.length > 0 ? (
                        <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 max-w-[210px] scrollbar-none">
                          {selectedTeams.slice(0, 4).map(team => (
                            <div key={team.id} className="w-8 h-8 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs" title={team.displayName}>
                              <img src={team.logo} alt={team.name} className="w-6 h-6 object-contain" />
                            </div>
                          ))}
                          {selectedTeams.length > 4 && (
                            <div className="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0">
                              +{selectedTeams.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs font-black text-slate-400">
                          None Selected (Tap to add)
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </div>

                  {/* 2. Show or Hide Final Scores */}
                  <div 
                    onClick={handleToggleHideScores}
                    className="bg-slate-50 hover:bg-slate-100 rounded-2xl p-3 border border-slate-200 transition cursor-pointer active:scale-[0.98] flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Show or Hide Final Scores
                      </div>
                      <div className="text-xs font-black text-slate-900 mt-0.5">
                        {hideScores ? 'Scores Hidden (Spoiler Shield)' : 'Show Live Scores'}
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${hideScores ? 'bg-orange-600' : 'bg-slate-300'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${hideScores ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* 3. Playback Stream */}
                  <div 
                    onClick={handleToggleQuality}
                    className="bg-slate-50 hover:bg-slate-100 rounded-2xl p-3 border border-slate-200 transition cursor-pointer active:scale-[0.98] flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Playback Stream
                      </div>
                      <div className="text-xs font-black text-slate-900 mt-0.5">
                        {streamQualityMode === 'highest' ? 'Highest (1080p FHD)' : 'Consistent Stream (Auto)'}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-orange-600 shrink-0">Toggle</span>
                  </div>

                  {/* 4. Report a Problem (Click opens interactive textbox modal) */}
                  <div 
                    onClick={() => setActiveDialog('report')}
                    className="bg-slate-50 hover:bg-slate-100 rounded-2xl p-3 border border-slate-200 transition cursor-pointer active:scale-[0.98] flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">
                          Report a problem
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Send issue details to admin
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>

                </div>

                {/* Sign Out at bottom of card */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3">
                  <button
                    onClick={() => setIsFlipped(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
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
            </div>

          </div>
        </div>

      </div>

      {/* Pop-up Dialog: Multi-Team Logo Picker */}
      {activeDialog === 'team' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 max-w-sm sm:max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Choose Your Favorite Teams</h3>
                <p className="text-[11px] text-slate-400 font-semibold">Select all your teams ({favoriteTeamIds.length} selected)</p>
              </div>
              <button 
                onClick={() => setActiveDialog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer transition active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* League Tabs & Search Bar */}
            <div className="pt-3 pb-2 space-y-2">
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setTeamTab('NBA')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                    teamTab === 'NBA' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🏀 NBA
                </button>
                <button
                  onClick={() => setTeamTab('NFL')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                    teamTab === 'NFL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🏈 NFL
                </button>
                <button
                  onClick={() => setTeamTab('ALL')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                    teamTab === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All Teams
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search team name or city..."
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                />
                {favoriteTeamIds.length > 0 && (
                  <button
                    onClick={handleClearTeams}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 px-2 py-1 bg-red-50 rounded-lg cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Visual Grid with Team Logos */}
            <div className="overflow-y-auto flex-1 my-1 pr-1 grid grid-cols-3 sm:grid-cols-4 gap-2.5 py-2">
              {filteredTeams.map(team => {
                const isSelected = favoriteTeamIds.includes(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => handleToggleTeam(team.id)}
                    className={`group relative flex flex-col items-center justify-center p-2.5 rounded-2xl border transition cursor-pointer active:scale-95 text-center ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 shadow-md ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                    <div className="w-12 h-12 flex items-center justify-center p-1 mb-1 transition-transform group-hover:scale-110 duration-200">
                      <img
                        src={team.logo}
                        alt={team.displayName}
                        className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[10px] font-black text-slate-900 leading-tight line-clamp-1">
                      {team.name}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase">
                      {team.abbreviation}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {favoriteTeamIds.length} team{favoriteTeamIds.length === 1 ? '' : 's'} chosen
              </span>
              <button
                onClick={() => setActiveDialog(null)}
                className="py-2 px-5 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Dialog: Report a Problem with Text Box */}
      {activeDialog === 'report' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Report a problem</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">It'll be fixed ASAP</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveDialog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 animate-in zoom-in-95">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-black text-slate-900">Problem Reported!</h4>
                <p className="text-xs text-slate-500 max-w-[220px]">
                  Thank you for letting us know. We are on it and it will be fixed ASAP.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="pt-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    What is the issue?
                  </label>
                  <textarea
                    rows={4}
                    value={problemMessage}
                    onChange={e => setProblemMessage(e.target.value)}
                    placeholder="Describe the issue (e.g. stream buffering, audio lag, broken link)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 resize-none font-medium"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveDialog(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport || !problemMessage.trim()}
                    className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingReport ? 'Sending...' : 'Send Report'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default ProfileModal;
