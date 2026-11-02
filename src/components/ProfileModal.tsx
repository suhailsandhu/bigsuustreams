import React, { useState, useEffect } from 'react';
import { X, Star, Volume2, Tv, Zap, LogOut, ShieldCheck, Crown } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onLogout: () => void;
  onSettingsChange?: () => void;
}

const EMOJI_OPTIONS = ['👤', '👑', '⚡', '🏀', '🏈', '🔥'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onSettingsChange
}) => {
  const [emoji, setEmoji] = useState(() => localStorage.getItem('bss_profile_emoji') || '👑');
  const [quality, setQuality] = useState(() => localStorage.getItem('bss_default_quality') || '1080p');
  const [favoriteTeam, setFavoriteTeam] = useState(() => localStorage.getItem('bss_favorite_team') || '');
  const [autoplaySound, setAutoplaySound] = useState(() => localStorage.getItem('bss_autoplay_sound') === 'true');
  const [lowLatency, setLowLatency] = useState(() => localStorage.getItem('bss_low_latency') === 'true');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSelectEmoji = (selected: string) => {
    setEmoji(selected);
    localStorage.setItem('bss_profile_emoji', selected);
    onSettingsChange?.();
  };

  const handleQualityChange = (q: string) => {
    setQuality(q);
    localStorage.setItem('bss_default_quality', q);
    onSettingsChange?.();
  };

  const handleFavoriteChange = (team: string) => {
    setFavoriteTeam(team);
    localStorage.setItem('bss_favorite_team', team);
    onSettingsChange?.();
  };

  const handleToggleSound = () => {
    const next = !autoplaySound;
    setAutoplaySound(next);
    localStorage.setItem('bss_autoplay_sound', next ? 'true' : 'false');
    onSettingsChange?.();
  };

  const handleToggleLatency = () => {
    const next = !lowLatency;
    setLowLatency(next);
    localStorage.setItem('bss_low_latency', next ? 'true' : 'false');
    onSettingsChange?.();
  };

  const displayName = currentUser?.displayName || currentUser?.username || 'VIP Member';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* iOS Grabber on Mobile */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{emoji}</span>
            <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
              Member Profile
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition flex items-center justify-center cursor-pointer active:scale-95"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-gray-800 text-xs sm:text-sm">
          
          {/* User Profile Card */}
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-2xl p-4 shadow-md flex items-center space-x-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                {emoji}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-neutral-900" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm sm:text-base font-black truncate">{displayName}</span>
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              </div>
              <p className="text-[11px] text-gray-400 truncate">
                {currentUser?.email || 'vip@bss.internal'}
              </p>
              <div className="mt-1 flex items-center space-x-1.5 text-[10px] font-bold text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>VIP Member • Lifetime Access</span>
              </div>
            </div>
          </div>

          {/* Emoji Avatar Selector */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Choose Profile Emoji
            </label>
            <div className="flex items-center justify-between gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-200/80">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => handleSelectEmoji(em)}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                    emoji === em
                      ? 'bg-white shadow-xs scale-105 border border-amber-300'
                      : 'hover:bg-gray-200/70 opacity-70 hover:opacity-100'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Feature 1: Default Video Quality */}
          <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Tv className="w-4 h-4 text-gray-700" />
                <span className="font-extrabold text-gray-900">Default Quality</span>
              </div>
              <span className="text-[11px] font-bold text-gray-500">{quality}</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-2.5">
              Auto-select highest fidelity (1080p) or bandwidth saver (720p).
            </p>
            <div className="grid grid-cols-2 gap-1.5 bg-gray-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleQualityChange('1080p')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  quality === '1080p' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                1080p (Full HD)
              </button>
              <button
                type="button"
                onClick={() => handleQualityChange('720p')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  quality === '720p' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                720p (Data Saver)
              </button>
            </div>
          </div>

          {/* Feature 2: Favorite Team Pinning ⭐ */}
          <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/80">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-500 fill-current" />
                <span className="font-extrabold text-gray-900">Favorite Team Pinning</span>
              </div>
              {favoriteTeam && (
                <button
                  type="button"
                  onClick={() => handleFavoriteChange('')}
                  className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mb-2">
              Pins games featuring your team straight to the top of your schedule.
            </p>
            <input
              type="text"
              value={favoriteTeam}
              onChange={(e) => handleFavoriteChange(e.target.value)}
              placeholder="e.g. Lakers, Celtics, Chiefs..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-black"
            />
          </div>

          {/* Feature 3: Audio Preferences & Ultra-Low Latency */}
          <div className="space-y-2.5">
            {/* Audio Toggle */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-200/80">
              <div className="flex items-center space-x-2.5">
                <Volume2 className="w-4 h-4 text-gray-700" />
                <div>
                  <div className="font-bold text-gray-900 text-xs">Autoplay With Sound</div>
                  <div className="text-[10px] text-gray-400">Attempt unmuted audio when opening stream</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  autoplaySound ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    autoplaySound ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Low Latency Toggle */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-200/80">
              <div className="flex items-center space-x-2.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="font-bold text-gray-900 text-xs">Ultra-Low Latency Mode</div>
                  <div className="text-[10px] text-gray-400">Reduces live broadcast delay (1-2s behind live)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleLatency}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  lowLatency ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    lowLatency ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Security & Passcode Notice */}
          <div className="flex items-center space-x-2 text-[11px] text-gray-400 justify-center pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Passcode 2222 Verified • Encrypted Session</span>
          </div>

          {/* Sign Out Action Button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs transition active:scale-98 flex items-center justify-center space-x-2 cursor-pointer border border-red-200/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Account</span>
          </button>

        </div>

      </div>
    </div>
  );
};
