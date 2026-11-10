import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Check, ChevronRight, Trash2 } from 'lucide-react';
import { type SportsTeam, searchSportsTeams, findTeamByQuery } from '../data/nbaTeams';

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
  // Ensure Autoplay with sound is enabled automatically for everyone
  useEffect(() => {
    try {
      localStorage.setItem('bss_autoplay_sound', 'true');
    } catch {}
  }, []);

  // 1. Preferences State
  const [selectedTeam, setSelectedTeam] = useState<SportsTeam | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bss_favorite_team') || '';
      return findTeamByQuery(saved) || null;
    }
    return null;
  });

  const [hideScores, setHideScores] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('bss_hide_scores') === 'true';
  });

  // 2. Playback State
  const [lowLatency, setLowLatency] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('bss_low_latency') === 'true';
  });

  const [cacheCleared, setCacheCleared] = useState(false);

  // Team Selector Search & Dropdown State
  const [isSearchingTeam, setIsSearchingTeam] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSearchingTeam) {
          setIsSearchingTeam(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSearchingTeam]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsSearchingTeam(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Membership Determination: sandhu.suhail@gmail.com is the ONLY VIP member account
  const isVip = Boolean(
    currentUser?.email?.toLowerCase() === 'sandhu.suhail@gmail.com' ||
    currentUser?.username?.toLowerCase() === 'sandhu.suhail@gmail.com'
  );

  const displayName = currentUser?.displayName || currentUser?.username || 'Member';
  const email = currentUser?.email || (currentUser?.username ? `${currentUser.username}@bss.internal` : 'member@bss.internal');
  const userInitials = (displayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'ME').toUpperCase();

  // Handlers
  const handleSelectTeam = (team: SportsTeam) => {
    setSelectedTeam(team);
    localStorage.setItem('bss_favorite_team', team.id);
    setIsSearchingTeam(false);
    setTeamSearchQuery('');
    onSettingsChange?.();
  };

  const handleClearTeam = () => {
    setSelectedTeam(null);
    localStorage.removeItem('bss_favorite_team');
    setIsSearchingTeam(false);
    setTeamSearchQuery('');
    onSettingsChange?.();
  };

  const handleToggleHideScores = () => {
    const next = !hideScores;
    setHideScores(next);
    localStorage.setItem('bss_hide_scores', next ? 'true' : 'false');
    onSettingsChange?.();
  };

  const handleToggleLatency = () => {
    const next = !lowLatency;
    setLowLatency(next);
    localStorage.setItem('bss_low_latency', next ? 'true' : 'false');
    onSettingsChange?.();
  };

  const handleClearCache = () => {
    try {
      sessionStorage.removeItem('hls_buffer_cache');
      sessionStorage.removeItem('stream_metrics');
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2500);
    } catch {
      // ignore
    }
  };

  const searchResults = searchSportsTeams(teamSearchQuery);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* iOS Mobile Sheet Handle */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Modal Top Navigation Bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
            Account & Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition flex items-center justify-center cursor-pointer active:scale-95"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-gray-800">
          
          {/* SECTION 1: Clean, Minimal Profile Header */}
          <div className="flex items-center space-x-4 pb-2">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200/80 flex items-center justify-center text-gray-800 font-extrabold text-lg tracking-wider shrink-0 shadow-2xs">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {displayName}
                </span>
                {isVip ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                    VIP Member
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200/60">
                    Basic Member
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5 font-normal">
                {email}
              </p>
            </div>
          </div>

          {/* SECTION 2: General Preferences Panel */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
              Preferences & Schedule
            </h3>
            
            <div className="bg-neutral-50/80 rounded-2xl border border-gray-200/70 p-4 space-y-4">
              {/* Setting: Add Favorite Team (NBA & NFL) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-900">
                      Add Favorite Team
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Subtly highlights your team's game cards with their official colors
                    </div>
                  </div>

                  {selectedTeam && !isSearchingTeam && (
                    <button
                      type="button"
                      onClick={handleClearTeam}
                      className="text-[11px] text-gray-400 hover:text-red-500 font-medium transition cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Selected Team Pill or Search Field */}
                {!isSearchingTeam ? (
                  selectedTeam ? (
                    <div
                      onClick={() => {
                        setIsSearchingTeam(true);
                        setTimeout(() => searchInputRef.current?.focus(), 50);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={selectedTeam.logo}
                          alt={selectedTeam.displayName}
                          className="w-7 h-7 object-contain"
                        />
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-gray-900">
                            {selectedTeam.displayName}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {selectedTeam.league}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-gray-400 group-hover:text-gray-700">
                        <span className="text-[11px] font-medium">Change</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchingTeam(true);
                        setTimeout(() => searchInputRef.current?.focus(), 50);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition text-left cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <Search className="w-3.5 h-3.5 text-gray-400" />
                        <span>Search teams (e.g. Lakers, Chiefs, Celtics, 49ers)...</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                        Select
                      </span>
                    </button>
                  )
                ) : (
                  /* Autocomplete Search Dropdown Container */
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={teamSearchQuery}
                        onChange={(e) => setTeamSearchQuery(e.target.value)}
                        placeholder="Type team name, city, or abbreviation..."
                        className="w-full pl-9 pr-9 py-2 bg-white border border-black rounded-xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchingTeam(false);
                          setTeamSearchQuery('');
                        }}
                        className="absolute right-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Results Dropdown Menu */}
                    <div
                      ref={dropdownRef}
                      className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-20 py-1 divide-y divide-gray-50"
                    >
                      {searchResults.length > 0 ? (
                        searchResults.map((t) => {
                          const isSelected = selectedTeam?.id === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleSelectTeam(t)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-left transition cursor-pointer ${
                                isSelected ? 'bg-gray-50 font-bold' : 'hover:bg-gray-50/80'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <img
                                  src={t.logo}
                                  alt={t.displayName}
                                  className="w-5 h-5 object-contain"
                                />
                                <span className="text-xs text-gray-900">
                                  {t.displayName}
                                </span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-500">
                                  {t.league}
                                </span>
                              </div>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-gray-900" />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-gray-400">
                          No matching teams found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200/60" />

              {/* Setting 3: Hide Final Scores (Spoiler Shield) */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    Hide Final Scores (Spoiler Shield)
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Hides final scores on completed games until tapped
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleHideScores}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    hideScores ? 'bg-gray-900' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle Hide Final Scores"
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      hideScores ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>

          {/* SECTION 2: Playback Settings */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
              Playback & Video Engine
            </h3>

            <div className="bg-neutral-50/80 rounded-2xl border border-gray-200/70 p-4 space-y-4">
              {/* Ultra-Low Latency Mode */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    Ultra-Low Latency Mode
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Minimizes broadcast delay behind live real-time action (1–2s buffer)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleLatency}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    lowLatency ? 'bg-gray-900' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle Ultra-Low Latency Mode"
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      lowLatency ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-gray-200/60" />

              {/* Clear Stream Cache */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    Clear Stream Cache
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Flush temporary video buffer data and reset player state
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearCache}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                >
                  {cacheCleared ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Cleared</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                      <span>Clear Cache</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* SECTION 5: Subtle Account Actions & Sign Out */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              Encrypted Session
            </span>

            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 transition underline underline-offset-4 cursor-pointer"
            >
              Sign Out
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
