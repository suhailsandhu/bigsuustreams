import React, { useState, useEffect } from 'react';
import { 
  X, Check, ChevronRight, ChevronDown,
  User, Play, Monitor, Layers, Sliders,
  LogOut, CheckCircle2,
  Sun, Moon
} from 'lucide-react';
import { ALL_TEAMS } from '../data/nbaTeams';
import { applyTheme } from '../utils/theme.ts';

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
    return (typeof window !== 'undefined' && localStorage.getItem('bss_stream_quality_mode')) || '720p';
  });

  const [bufferMode, setBufferMode] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_buffer_mode')) || 'smooth';
  });

  const [autoPlay, setAutoPlay] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('bss_autoplay') !== 'false' : true;
  });

  const [themeMode, setThemeMode] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_theme_mode')) || 'light';
  });

  const [layoutDensity, setLayoutDensity] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_layout_density')) || 'comfortable';
  });

  const [defaultSport, setDefaultSport] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_default_sport')) || 'nba';
  });

  const [audioCommentary, setAudioCommentary] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_audio_commentary')) || 'english';
  });

  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  // Apply dark/light theme to document
  const handleThemeChange = (newTheme: string) => {
    setThemeMode(newTheme);
    localStorage.setItem('bss_theme_mode', newTheme);
    applyTheme(newTheme as any);
    onSettingsChange?.();
  };

  const handleDensityChange = (newDensity: string) => {
    setLayoutDensity(newDensity);
    localStorage.setItem('bss_layout_density', newDensity);
    onSettingsChange?.();
  };

  const handleDefaultSportChange = (sport: 'nba' | 'nfl') => {
    setDefaultSport(sport);
    localStorage.setItem('bss_default_sport', sport);
    onSettingsChange?.();
  };

  const handleSaveChanges = () => {
    localStorage.setItem('bss_theme_mode', themeMode);
    localStorage.setItem('bss_layout_density', layoutDensity);
    localStorage.setItem('bss_stream_quality_mode', streamQualityMode);
    localStorage.setItem('bss_default_sport', defaultSport);
    localStorage.setItem('bss_hide_scores', hideScores ? 'true' : 'false');
    localStorage.setItem('bss_autoplay', autoPlay ? 'true' : 'false');
    localStorage.setItem('bss_audio_commentary', audioCommentary);
    onSettingsChange?.();
    onClose();
  };

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

  const displayName = currentUser?.displayName || currentUser?.username || 'BigSuu';
  const roleName = isVip ? 'VIP Member' : 'Basic Membership';
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

  const toggleAccordion = (section: string) => {
    setOpenAccordion(prev => (prev === section ? null : section));
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
      
      {/* Frosted Glass Settings Modal Card */}
      <div className="bss-settings-card relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#141416] rounded-[32px] p-4 sm:p-5 shadow-2xl border border-slate-100 dark:border-white/[0.08] flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header: Title and Close button */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-[#1d4ed8] dark:text-blue-400 flex items-center justify-center">
              <Sliders className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-neutral-100 tracking-tight">
                Settings
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
                {displayName} • <span className="text-[#1d4ed8] dark:text-blue-400 font-bold">{roleName}</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-600 dark:text-neutral-300 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-xs"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable List of Settings Accordions */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 scrollbar-thin">
          
          {/* 1. Account Dropdown */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#18181b] shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => toggleAccordion('account')}
              className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-white/[0.04] cursor-pointer transition"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center text-slate-700 dark:text-neutral-200">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-neutral-100">Account</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-neutral-500 transition-transform duration-200 ${openAccordion === 'account' ? 'rotate-180 text-[#1d4ed8] dark:text-blue-400' : ''}`} />
            </button>

            {openAccordion === 'account' && (
              <div className="p-3.5 pt-1 space-y-2.5 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/[0.06]">
                  <span className="text-slate-500 dark:text-neutral-400 font-semibold">User</span>
                  <span className="font-black text-slate-900 dark:text-neutral-100">{displayName}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/[0.06]">
                  <span className="text-slate-500 dark:text-neutral-400 font-semibold">Status</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 dark:bg-blue-950/60 text-[#1d4ed8] dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                    {roleName}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/[0.06]">
                  <span className="text-slate-500 dark:text-neutral-400 font-semibold">Email</span>
                  <span className="font-semibold text-slate-600 dark:text-neutral-300 truncate max-w-[160px]">{currentUser?.email || 'sandhu.suhail@gmail.com'}</span>
                </div>
                {/* Sign Out Button */}
                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-700 dark:text-neutral-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-98"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Playback Dropdown */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#18181b] shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => toggleAccordion('playback')}
              className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-white/[0.04] cursor-pointer transition"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center text-slate-700 dark:text-neutral-200">
                  <Play className="w-4 h-4 fill-slate-700 dark:fill-neutral-200" />
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-neutral-100">Playback</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-neutral-500 transition-transform duration-200 ${openAccordion === 'playback' ? 'rotate-180 text-[#1d4ed8] dark:text-blue-400' : ''}`} />
            </button>

            {openAccordion === 'playback' && (
              <div className="p-3.5 pt-1 space-y-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-xs">
                <div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-neutral-400 mb-1.5">Stream Quality</div>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-white/[0.06] p-1.5 rounded-2xl">
                    <button
                      onClick={() => {
                        setStreamQualityMode('720p');
                        localStorage.setItem('bss_stream_quality_mode', '720p');
                        onSettingsChange?.();
                      }}
                      className={`py-2 px-1 rounded-xl transition cursor-pointer text-center flex flex-col items-center justify-center ${
                        streamQualityMode === '720p' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white font-bold'
                      }`}
                    >
                      <span className="text-xs">720p</span>
                      <span className="text-[9px] text-slate-400 dark:text-neutral-500 leading-tight">(more stable)</span>
                    </button>

                    <button
                      onClick={() => {
                        setStreamQualityMode('1080p');
                        localStorage.setItem('bss_stream_quality_mode', '1080p');
                        onSettingsChange?.();
                      }}
                      className={`py-2 px-1 rounded-xl transition cursor-pointer text-center flex flex-col items-center justify-center ${
                        streamQualityMode === '1080p' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white font-bold'
                      }`}
                    >
                      <span className="text-xs">1080p</span>
                      <span className="text-[9px] text-slate-400 dark:text-neutral-500 leading-tight">(high def)</span>
                    </button>

                    <button
                      onClick={() => {
                        setStreamQualityMode('auto');
                        localStorage.setItem('bss_stream_quality_mode', 'auto');
                        onSettingsChange?.();
                      }}
                      className={`py-2 px-1 rounded-xl transition cursor-pointer text-center flex flex-col items-center justify-center ${
                        streamQualityMode === 'auto' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white font-bold'
                      }`}
                    >
                      <span className="text-xs">Auto</span>
                      <span className="text-[9px] text-slate-400 dark:text-neutral-500 leading-tight">(automatic)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-neutral-400 mb-1.5">Latency Mode</div>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-white/[0.06] p-1.5 rounded-2xl">
                    <button
                      onClick={() => {
                        setBufferMode('smooth');
                        localStorage.setItem('bss_buffer_mode', 'smooth');
                        onSettingsChange?.();
                      }}
                      className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                        bufferMode === 'smooth' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Smooth (Buffer)
                    </button>
                    <button
                      onClick={() => {
                        setBufferMode('low-latency');
                        localStorage.setItem('bss_buffer_mode', 'low-latency');
                        onSettingsChange?.();
                      }}
                      className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                        bufferMode === 'low-latency' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Ultra Low-Latency
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Display Dropdown */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#18181b] shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => toggleAccordion('display')}
              className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-white/[0.04] cursor-pointer transition"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center text-slate-700 dark:text-neutral-200">
                  <Monitor className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-neutral-100">Display</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-neutral-500 transition-transform duration-200 ${openAccordion === 'display' ? 'rotate-180 text-[#1d4ed8] dark:text-blue-400' : ''}`} />
            </button>

            {openAccordion === 'display' && (
              <div className="p-3.5 pt-1 space-y-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-xs">
                {/* Theme Selection: Clean Lucide Vector Art (Sun, Moon, Monitor) */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-neutral-400 mb-1.5">Theme</div>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-white/[0.06] p-1.5 rounded-2xl">
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
                        themeMode === 'light' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                      title="Light Theme"
                    >
                      <Sun className="w-4 h-4 stroke-[2.2]" />
                    </button>

                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
                        themeMode === 'dark' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                      title="Dark Theme"
                    >
                      <Moon className="w-4 h-4 stroke-[2.2]" />
                    </button>

                    <button
                      onClick={() => handleThemeChange('system')}
                      className={`py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
                        themeMode === 'system' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                      title="System Theme"
                    >
                      <Monitor className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>
                </div>

                {/* Density Selection */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-neutral-400 mb-1.5">Layout Density</div>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-white/[0.06] p-1.5 rounded-2xl">
                    <button
                      onClick={() => handleDensityChange('comfortable')}
                      className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                        layoutDensity === 'comfortable' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Comfortable
                    </button>
                    <button
                      onClick={() => handleDensityChange('compact')}
                      className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                        layoutDensity === 'compact' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Compact
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Content Dropdown */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#18181b] shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => toggleAccordion('content')}
              className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-white/[0.04] cursor-pointer transition"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center text-slate-700 dark:text-neutral-200">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-neutral-100">Content</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-neutral-500 transition-transform duration-200 ${openAccordion === 'content' ? 'rotate-180 text-[#1d4ed8] dark:text-blue-400' : ''}`} />
            </button>

            {openAccordion === 'content' && (
              <div className="p-3.5 pt-1 space-y-3.5 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-xs">
                
                {/* Favorite Teams Selector */}
                <div 
                  onClick={() => setActiveDialog('team')}
                  className="bg-white dark:bg-[#141416] hover:bg-slate-50 dark:hover:bg-white/[0.04] rounded-2xl p-3 border border-slate-200/90 dark:border-white/[0.08] transition cursor-pointer flex items-center justify-between shadow-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800 dark:text-neutral-200 text-xs">
                      Favorite Teams ({selectedTeams.length})
                    </div>
                    <div className="flex items-center space-x-1.5 mt-1 overflow-x-auto max-w-[200px]">
                      {selectedTeams.length > 0 ? (
                        selectedTeams.slice(0, 4).map(team => (
                          <img key={team.id} src={team.logo} alt={team.name} className="w-5 h-5 object-contain" />
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-neutral-500">None selected yet</span>
                      )}
                      {selectedTeams.length > 4 && (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500">+{selectedTeams.length - 4}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400 flex items-center bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl">
                    Choose <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>

                {/* Spoiler Shield (Hide Scores) */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-neutral-200 text-xs">Spoiler Shield</div>
                    <div className="text-[11px] text-slate-400 dark:text-neutral-500">Hide live & final game scores</div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !hideScores;
                      setHideScores(next);
                      localStorage.setItem('bss_hide_scores', next ? 'true' : 'false');
                      onSettingsChange?.();
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${hideScores ? 'bg-[#1d4ed8]' : 'bg-slate-300 dark:bg-white/20'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${hideScores ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Default Sport Tab with Official NBA and NFL logos */}
                <div>
                  <div className="font-bold text-slate-800 dark:text-neutral-200 text-xs mb-1.5">Default Sport Tab</div>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-white/[0.06] p-1.5 rounded-2xl">
                    <button
                      onClick={() => handleDefaultSportChange('nba')}
                      className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 ${
                        defaultSport === 'nba' ? 'bg-white dark:bg-[#222226] text-slate-900 dark:text-white shadow-xs font-black ring-1 ring-blue-300 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 font-bold hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <img src="/nba-logo.png" alt="NBA" className="h-5 w-auto object-contain" />
                      <span className="text-xs font-black">NBA</span>
                    </button>
                    <button
                      onClick={() => handleDefaultSportChange('nfl')}
                      className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 ${
                        defaultSport === 'nfl' ? 'bg-white dark:bg-[#222226] text-slate-900 dark:text-white shadow-xs font-black ring-1 ring-blue-300 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 font-bold hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <img src="/nfl-shield.png" alt="NFL" className="h-5 w-auto object-contain" />
                      <span className="text-xs font-black">NFL</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* 5. Preferences Dropdown */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#18181b] shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => toggleAccordion('preferences')}
              className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-white/[0.04] cursor-pointer transition"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center text-slate-700 dark:text-neutral-200">
                  <Sliders className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-neutral-100">Preferences</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-neutral-500 transition-transform duration-200 ${openAccordion === 'preferences' ? 'rotate-180 text-[#1d4ed8] dark:text-blue-400' : ''}`} />
            </button>

            {openAccordion === 'preferences' && (
              <div className="p-3.5 pt-1 space-y-3.5 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-xs">
                {/* Autoplay Stream */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-neutral-200 text-xs">Auto-Play Stream</div>
                    <div className="text-[11px] text-slate-400 dark:text-neutral-500">Play instantly when opening a game</div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !autoPlay;
                      setAutoPlay(next);
                      localStorage.setItem('bss_autoplay', next ? 'true' : 'false');
                      onSettingsChange?.();
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${autoPlay ? 'bg-[#1d4ed8]' : 'bg-slate-300 dark:bg-white/20'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${autoPlay ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Commentary Audio */}
                <div>
                  <div className="font-bold text-slate-800 dark:text-neutral-200 text-xs mb-1.5">Audio Commentary Track</div>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-white/[0.06] p-1.5 rounded-2xl">
                    <button
                      onClick={() => {
                        setAudioCommentary('english');
                        localStorage.setItem('bss_audio_commentary', 'english');
                        onSettingsChange?.();
                      }}
                      className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                        audioCommentary === 'english' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => {
                        setAudioCommentary('spanish');
                        localStorage.setItem('bss_audio_commentary', 'spanish');
                        onSettingsChange?.();
                      }}
                      className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                        audioCommentary === 'spanish' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Español
                    </button>
                    <button
                      onClick={() => {
                        setAudioCommentary('arena');
                        localStorage.setItem('bss_audio_commentary', 'arena');
                        onSettingsChange?.();
                      }}
                      className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                        audioCommentary === 'arena' ? 'bg-white dark:bg-[#222226] text-[#1d4ed8] dark:text-blue-400 shadow-xs font-black ring-1 ring-blue-200 dark:ring-blue-500/30' : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Arena Sounds
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Card Footer: Save Changes Button in NBA Royal Blue */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
          <button
            onClick={handleSaveChanges}
            className="w-full py-2.5 rounded-2xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-black text-xs transition cursor-pointer active:scale-98 shadow-md shadow-blue-700/25 flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Changes</span>
          </button>
        </div>

      </div>

      {/* Pop-up Dialog: Multi-Team Logo Picker */}
      {activeDialog === 'team' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141416] rounded-3xl p-5 max-w-sm sm:max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/[0.08] animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-neutral-100 uppercase tracking-wide">Choose Your Favorite Teams</h3>
                <p className="text-[11px] text-slate-400 dark:text-neutral-500 font-semibold">Select all your teams ({favoriteTeamIds.length} selected)</p>
              </div>
              <button 
                onClick={() => setActiveDialog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.12] flex items-center justify-center text-slate-600 dark:text-neutral-300 cursor-pointer transition active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* League Tabs & Search Bar */}
            <div className="pt-3 pb-2 space-y-2">
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-xl">
                <button
                  onClick={() => setTeamTab('NBA')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                    teamTab === 'NBA' ? 'bg-white dark:bg-[#222226] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  🏀 NBA
                </button>
                <button
                  onClick={() => setTeamTab('NFL')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                    teamTab === 'NFL' ? 'bg-white dark:bg-[#222226] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  🏈 NFL
                </button>
                <button
                  onClick={() => setTeamTab('ALL')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                    teamTab === 'ALL' ? 'bg-white dark:bg-[#222226] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
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
                  className="flex-1 bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                />
                {favoriteTeamIds.length > 0 && (
                  <button
                    onClick={handleClearTeams}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 px-2 py-1 bg-red-50 dark:bg-red-950/40 rounded-lg cursor-pointer"
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
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 shadow-md ring-2 ring-orange-500/20'
                        : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#18181b] hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-xs'
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
                    <span className="text-[10px] font-black text-slate-900 dark:text-neutral-100 leading-tight line-clamp-1">
                      {team.name}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 dark:text-neutral-500 uppercase">
                      {team.abbreviation}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">
                {favoriteTeamIds.length} {favoriteTeamIds.length === 1 ? 'team' : 'teams'} selected
              </span>
              <button
                onClick={() => setActiveDialog(null)}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black transition cursor-pointer active:scale-95 shadow-md shadow-orange-600/20"
              >
                Save & Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Pop-up Dialog: Interactive Report Problem Modal */}
      {activeDialog === 'report' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141416] rounded-3xl p-5 max-w-sm sm:max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/[0.08] animate-in zoom-in-95 duration-150 flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 font-serif font-black italic text-sm">
                  i
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-neutral-100">Report an Issue</h3>
              </div>
              <button
                onClick={() => setActiveDialog(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
                <h4 className="text-sm font-black text-slate-900 dark:text-neutral-100">Report Received!</h4>
                <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">It'll be fixed ASAP</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="pt-3 space-y-3">
                <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
                  Notice an issue with a stream or playback? Describe what's happening:
                </p>

                <textarea
                  value={problemMessage}
                  onChange={(e) => setProblemMessage(e.target.value)}
                  placeholder="e.g. Thunder vs Blazers stream is buffering on Cyberdash..."
                  rows={4}
                  required
                  autoFocus
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-white dark:focus:bg-[#18181b] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition resize-none"
                />

                <div className="flex flex-col items-center space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingReport || !problemMessage.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-orange-600/20 transition active:scale-98 cursor-pointer"
                  >
                    <span>{isSubmittingReport ? 'Sending...' : 'Send Report'}</span>
                  </button>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500">
                    It'll be fixed ASAP
                  </span>
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
