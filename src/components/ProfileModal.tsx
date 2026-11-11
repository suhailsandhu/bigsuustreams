import React, { useState, useEffect } from 'react';
import { 
  X, Check, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  User, Play, Monitor, Layers, Sliders, ShieldCheck, Info,
  LogOut, Copy, RefreshCw, Trash2, Zap, AlertCircle, CheckCircle2,
  Sparkles, ExternalLink
} from 'lucide-react';
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
    return (typeof window !== 'undefined' && localStorage.getItem('bss_stream_quality_mode')) || '720p';
  });

  const [bufferMode, setBufferMode] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_buffer_mode')) || 'smooth';
  });

  const [autoPlay, setAutoPlay] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('bss_autoplay') !== 'false' : true;
  });

  const [hwAcceleration, setHwAcceleration] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('bss_hw_accel') !== 'false' : true;
  });

  const [themeMode, setThemeMode] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_theme_mode')) || 'light';
  });

  const [layoutDensity, setLayoutDensity] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_layout_density')) || 'comfortable';
  });

  const [autoFullscreen, setAutoFullscreen] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('bss_auto_fullscreen') === 'true';
  });

  const [scoreTicker, setScoreTicker] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('bss_score_ticker') !== 'false' : true;
  });

  const [defaultSport, setDefaultSport] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_default_sport')) || 'nba';
  });

  const [showStandings, setShowStandings] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('bss_show_standings') !== 'false' : true;
  });

  const [clockFormat, setClockFormat] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bss_clock_format')) || '12h';
  });

  const [soundHaptics, setSoundHaptics] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('bss_sound_haptics') !== 'false' : true;
  });

  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('bss_privacy_mode') === 'true';
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  // Sub-dialogs: 'team' picker or 'report' problem dialog
  const [activeDialog, setActiveDialog] = useState<'team' | 'report' | null>(null);

  // Notification feedbacks
  const [copiedIptv, setCopiedIptv] = useState(false);
  const [copiedEpg, setCopiedEpg] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

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
  const roleName = isVip ? 'VIP MEMBER' : 'MEMBER';
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

  const handleCopyIptv = () => {
    const host = window.location.origin;
    const url = `${host}/playlist.m3u8`;
    navigator.clipboard?.writeText(url);
    setCopiedIptv(true);
    setTimeout(() => setCopiedIptv(false), 2200);
  };

  const handleCopyEpg = () => {
    const host = window.location.origin;
    const url = `${host}/epg.xml`;
    navigator.clipboard?.writeText(url);
    setCopiedEpg(true);
    setTimeout(() => setCopiedEpg(false), 2200);
  };

  const handleClearCache = () => {
    try {
      if ('caches' in window) {
        caches.keys().then(names => names.forEach(n => caches.delete(n)));
      }
      localStorage.removeItem('bss_stream_cache');
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2200);
    } catch {
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2200);
    }
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

  // Ultra-crisp Glassy SVG for the FRONT of the 3D card (100% matching Image 1)
  const frontBadgeDataUrl = () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
        <defs>
          <linearGradient id="frontGlass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
            <stop offset="35%" stop-color="#f8fafc" stop-opacity="0.88"/>
            <stop offset="70%" stop-color="#ffffff" stop-opacity="0.94"/>
            <stop offset="100%" stop-color="#edf2f7" stop-opacity="0.88"/>
          </linearGradient>
          <linearGradient id="frontWave" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.65"/>
            <stop offset="45%" stop-color="#ffffff" stop-opacity="0.2"/>
            <stop offset="75%" stop-color="#ffffff" stop-opacity="0.0"/>
          </linearGradient>
          <radialGradient id="frontGlowBL" cx="0%" cy="100%" r="55%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.45"/>
            <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.1"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="frontGlowMR" cx="100%" cy="60%" r="50%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.38"/>
            <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="goldHalo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fde68a"/>
            <stop offset="50%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
        </defs>

        <!-- Frosted Glass Card Base with Soft White Edge -->
        <rect x="15" y="15" width="570" height="870" rx="46" fill="url(#frontGlass)" stroke="rgba(255, 255, 255, 0.95)" stroke-width="4"/>
        <rect x="17" y="17" width="566" height="866" rx="44" fill="none" stroke="rgba(203, 213, 225, 0.45)" stroke-width="2"/>

        <!-- Warm Golden Corner Edge Glows matching photo -->
        <rect x="15" y="15" width="570" height="870" rx="46" fill="url(#frontGlowBL)"/>
        <rect x="15" y="15" width="570" height="870" rx="46" fill="url(#frontGlowMR)"/>

        <!-- Curved Specular Glass Sheen -->
        <path d="M 15 15 L 360 15 C 240 380 400 620 200 885 L 15 885 Z" fill="url(#frontWave)" opacity="0.6"/>

        <!-- Top Lanyard Slot Cutout -->
        <rect x="250" y="55" width="100" height="26" rx="13" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2.5"/>

        <!-- Top VIP MEMBER Pill with Gold Crown -->
        <rect x="195" y="150" width="210" height="48" rx="24" fill="rgba(254, 243, 199, 0.65)" stroke="#f59e0b" stroke-width="2.5"/>
        <g transform="translate(216, 163)">
          <path d="M 0 17 L 3 4 L 8 11 L 14 0 L 20 11 L 25 4 L 28 17 Z" fill="#f59e0b"/>
        </g>
        <text x="312" y="181" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="16" fill="#0f172a" text-anchor="middle" letter-spacing="2">
          ${roleName}
        </text>

        <!-- Circular Avatar Frame with Gold Halo -->
        <circle cx="300" cy="345" r="105" fill="none" stroke="url(#goldHalo)" stroke-width="5"/>
        <circle cx="300" cy="345" r="98" fill="#e2e8f0"/>
        
        <!-- Clean User Silhouette Icon -->
        <circle cx="300" cy="320" r="34" fill="#94a3b8"/>
        <path d="M 235 395 C 235 352 260 352 300 352 C 340 352 365 352 365 395 C 365 405 235 405 235 395 Z" fill="#94a3b8"/>

        <!-- Display Name: BigSuu -->
        <text x="300" y="505" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="44" fill="#0f172a" text-anchor="middle" letter-spacing="-1">
          ${displayName}
        </text>

        <!-- Barcode / Strip -->
        <g fill="#94a3b8" opacity="0.65">
          <rect x="110" y="555" width="6" height="42"/>
          <rect x="122" y="555" width="14" height="42"/>
          <rect x="142" y="555" width="4" height="42"/>
          <rect x="152" y="555" width="18" height="42"/>
          <rect x="176" y="555" width="10" height="42"/>
          <rect x="192" y="555" width="6" height="42"/>
          <rect x="204" y="555" width="16" height="42"/>
          <rect x="226" y="555" width="8" height="42"/>
          <rect x="240" y="555" width="22" height="42"/>
          <rect x="268" y="555" width="6" height="42"/>
          <rect x="280" y="555" width="14" height="42"/>
          <rect x="300" y="555" width="18" height="42"/>
          <rect x="324" y="555" width="8" height="42"/>
          <rect x="338" y="555" width="24" height="42"/>
          <rect x="368" y="555" width="12" height="42"/>
          <rect x="386" y="555" width="6" height="42"/>
          <rect x="398" y="555" width="16" height="42"/>
          <rect x="420" y="555" width="10" height="42"/>
          <rect x="436" y="555" width="20" height="42"/>
          <rect x="462" y="555" width="8" height="42"/>
          <rect x="476" y="555" width="14" height="42"/>
        </g>

        <!-- Bottom Pill Button: Tap for Settings > -->
        <rect x="145" y="660" width="310" height="54" rx="27" fill="rgba(255, 255, 255, 0.9)" stroke="rgba(203, 213, 225, 0.9)" stroke-width="2"/>
        
        <!-- Small gear icon inside button -->
        <g transform="translate(185, 678)" stroke="#0f172a" stroke-width="2.5" fill="none" stroke-linecap="round">
          <circle cx="9" cy="9" r="4"/>
          <path d="M 9 1 L 9 3 M 9 15 L 9 17 M 1 9 L 3 9 M 15 9 L 17 9 M 3.5 3.5 L 5 5 M 13 13 L 14.5 14.5 M 14.5 3.5 L 13 5 M 5 13 L 3.5 14.5"/>
        </g>
        
        <text x="305" y="694" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="16" fill="#0f172a" text-anchor="middle">
          Tap for Settings
        </text>

        <!-- Right Chevron > -->
        <path d="M 416 681 L 424 687 L 416 693" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // Ultra-crisp Glassy SVG for the BACK of the 3D card (100% matching Image 2)
  const backBadgeDataUrl = () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
        <defs>
          <linearGradient id="backGlass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
            <stop offset="40%" stop-color="#f8fafc" stop-opacity="0.88"/>
            <stop offset="100%" stop-color="#edf2f7" stop-opacity="0.92"/>
          </linearGradient>
          <linearGradient id="backWave" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
            <stop offset="50%" stop-color="#ffffff" stop-opacity="0.15"/>
            <stop offset="80%" stop-color="#ffffff" stop-opacity="0.0"/>
          </linearGradient>
          <radialGradient id="backGlowBL" cx="0%" cy="100%" r="55%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.45"/>
            <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.1"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="backGlowMR" cx="100%" cy="60%" r="50%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.38"/>
            <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <rect x="15" y="15" width="570" height="870" rx="46" fill="url(#backGlass)" stroke="rgba(255, 255, 255, 0.95)" stroke-width="4"/>
        <rect x="17" y="17" width="566" height="866" rx="44" fill="none" stroke="rgba(203, 213, 225, 0.45)" stroke-width="2"/>

        <rect x="15" y="15" width="570" height="870" rx="46" fill="url(#backGlowBL)"/>
        <rect x="15" y="15" width="570" height="870" rx="46" fill="url(#backGlowMR)"/>
        <path d="M 15 15 L 360 15 C 240 380 400 620 200 885 L 15 885 Z" fill="url(#backWave)" opacity="0.55"/>

        <!-- Top Lanyard Slot Cutout -->
        <rect x="250" y="55" width="100" height="26" rx="13" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2.5"/>

        <!-- Header: Back Button on Left, Settings Title in Center -->
        <rect x="55" y="130" width="46" height="46" rx="14" fill="rgba(255, 255, 255, 0.85)" stroke="rgba(203, 213, 225, 0.8)" stroke-width="2"/>
        <path d="M 81 146 L 73 153 L 81 160" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        
        <text x="300" y="162" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="28" fill="#0f172a" text-anchor="middle">
          Settings
        </text>

        <!-- 7 Frosted Glass Pill Rows matching Image 2 -->
        <!-- 1. Account -->
        <rect x="55" y="210" width="490" height="58" rx="22" fill="rgba(255, 255, 255, 0.8)" stroke="rgba(255, 255, 255, 0.9)" stroke-width="2"/>
        <circle cx="95" cy="239" r="14" fill="#f1f5f9"/>
        <text x="135" y="246" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="19" fill="#0f172a">Account</text>
        <path d="M 505 235 L 513 243 L 521 235" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- 2. Playback -->
        <rect x="55" y="285" width="490" height="58" rx="22" fill="rgba(255, 255, 255, 0.8)" stroke="rgba(255, 255, 255, 0.9)" stroke-width="2"/>
        <circle cx="95" cy="314" r="14" fill="#f1f5f9"/>
        <text x="135" y="321" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="19" fill="#0f172a">Playback</text>
        <path d="M 505 310 L 513 318 L 521 310" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- 3. Display -->
        <rect x="55" y="360" width="490" height="58" rx="22" fill="rgba(255, 255, 255, 0.8)" stroke="rgba(255, 255, 255, 0.9)" stroke-width="2"/>
        <circle cx="95" cy="389" r="14" fill="#f1f5f9"/>
        <text x="135" y="396" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="19" fill="#0f172a">Display</text>
        <path d="M 505 385 L 513 393 L 521 385" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- 4. Content -->
        <rect x="55" y="435" width="490" height="58" rx="22" fill="rgba(255, 255, 255, 0.8)" stroke="rgba(255, 255, 255, 0.9)" stroke-width="2"/>
        <circle cx="95" cy="464" r="14" fill="#f1f5f9"/>
        <text x="135" y="471" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="19" fill="#0f172a">Content</text>
        <path d="M 505 460 L 513 468 L 521 460" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- 5. Preferences -->
        <rect x="55" y="510" width="490" height="58" rx="22" fill="rgba(255, 255, 255, 0.8)" stroke="rgba(255, 255, 255, 0.9)" stroke-width="2"/>
        <circle cx="95" cy="539" r="14" fill="#f1f5f9"/>
        <text x="135" y="546" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="19" fill="#0f172a">Preferences</text>
        <path d="M 505 535 L 513 543 L 521 535" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- 6. Security -->
        <rect x="55" y="585" width="490" height="58" rx="22" fill="rgba(255, 255, 255, 0.8)" stroke="rgba(255, 255, 255, 0.9)" stroke-width="2"/>
        <circle cx="95" cy="614" r="14" fill="#f1f5f9"/>
        <text x="135" y="621" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="19" fill="#0f172a">Security</text>
        <path d="M 505 610 L 513 618 L 521 610" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- 7. About -->
        <rect x="55" y="660" width="490" height="58" rx="22" fill="rgba(255, 255, 255, 0.8)" stroke="rgba(255, 255, 255, 0.9)" stroke-width="2"/>
        <circle cx="95" cy="689" r="14" fill="#f1f5f9"/>
        <text x="135" y="696" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="19" fill="#0f172a">About</text>
        <path d="M 505 685 L 513 693 L 521 685" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
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
      <div className="relative w-full max-w-sm sm:max-w-md h-[92vh] flex flex-col items-center justify-between">
        
        {/* Floating Close Button Top Right matching user's image */}
        <div className="w-full flex justify-end px-2 pt-1 z-30">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer active:scale-95 shadow-xl border border-white/20"
            title="Close"
          >
            <X className="w-4 h-4" />
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
            
            {/* FRONT FACE: 3D Swinging Lanyard Badge (Matching Image 1) */}
            <div 
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
              onClick={() => setIsFlipped(true)}
              title="Tap card to open settings"
            >
              <Lanyard
                frontImage={frontBadgeDataUrl()}
                backImage={backBadgeDataUrl()}
                cardColor="#ffffff"
                strapColor="#1d4ed8" /* Royal Blue matching photo */
                metal="gold" /* Gold metal clamp & ring matching photo */
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
                onCardClick={() => setIsFlipped(prev => !prev)}
                className="w-full h-full cursor-pointer"
              />
            </div>

            {/* BACK FACE: Frosted Glass Settings Card with Accordion Dropdowns (Matching Image 2) */}
            <div 
              className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-auto"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              {/* Frosted Glass Acrylic Badge Body */}
              <div className="relative w-[310px] sm:w-[340px] max-h-[94%] bg-white/85 backdrop-blur-2xl rounded-[38px] p-4 sm:p-5 shadow-2xl border-4 border-white/80 flex flex-col justify-between overflow-hidden">
                
                {/* Lanyard Top Ribbon & Ring Decor */}
                <div className="w-full flex items-center justify-center -mt-2 pb-2">
                  <div className="w-20 h-4 bg-slate-200/80 rounded-full border border-slate-300 flex items-center justify-center shadow-inner">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-500 shadow-xs" />
                  </div>
                </div>

                {/* Header: Back Button on Left, Settings Title in Center */}
                <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200/60">
                  <button
                    onClick={() => setIsFlipped(false)}
                    className="w-8 h-8 rounded-xl bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-xs border border-slate-200 cursor-pointer transition active:scale-95"
                    title="Back to Front"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Settings
                  </h2>
                  <div className="w-8" />
                </div>

                {/* Scrollable List of 7 Dropdown Pills matching Image 2 */}
                <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 scrollbar-thin">
                  
                  {/* 1. Account Dropdown */}
                  <div className="rounded-2xl border border-white/90 bg-white/70 backdrop-blur-md shadow-xs overflow-hidden transition-all">
                    <button
                      onClick={() => toggleAccordion('account')}
                      className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-white/90 cursor-pointer transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900">Account</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openAccordion === 'account' ? 'rotate-180 text-orange-600' : ''}`} />
                    </button>

                    {openAccordion === 'account' && (
                      <div className="p-3.5 pt-1 space-y-2.5 border-t border-slate-100 bg-white/50 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">User</span>
                          <span className="font-black text-slate-900">{displayName}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Status</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            {roleName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Email</span>
                          <span className="font-semibold text-slate-600 truncate max-w-[160px]">{currentUser?.email || 'sandhu.suhail@gmail.com'}</span>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onLogout();
                          }}
                          className="w-full mt-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. Playback Dropdown */}
                  <div className="rounded-2xl border border-white/90 bg-white/70 backdrop-blur-md shadow-xs overflow-hidden transition-all">
                    <button
                      onClick={() => toggleAccordion('playback')}
                      className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-white/90 cursor-pointer transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                          <Play className="w-4 h-4 fill-slate-700" />
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900">Playback</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openAccordion === 'playback' ? 'rotate-180 text-orange-600' : ''}`} />
                    </button>

                    {openAccordion === 'playback' && (
                      <div className="p-3.5 pt-1 space-y-3 border-t border-slate-100 bg-white/50 text-xs">
                        <div>
                          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Stream Quality</div>
                          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                            {['720p', '1080p', 'auto'].map((q) => (
                              <button
                                key={q}
                                onClick={() => {
                                  setStreamQualityMode(q);
                                  localStorage.setItem('bss_stream_quality_mode', q);
                                  onSettingsChange?.();
                                }}
                                className={`py-1 text-[11px] font-black rounded-lg transition cursor-pointer ${
                                  streamQualityMode === q ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                                }`}
                              >
                                {q === '720p' ? '720p 60fps' : q === '1080p' ? '1080p FHD' : 'Auto'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Buffer Latency</div>
                          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                              onClick={() => {
                                setBufferMode('smooth');
                                localStorage.setItem('bss_buffer_mode', 'smooth');
                              }}
                              className={`py-1 text-[11px] font-black rounded-lg transition cursor-pointer ${
                                bufferMode === 'smooth' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                              }`}
                            >
                              Smooth Buffer (Stable)
                            </button>
                            <button
                              onClick={() => {
                                setBufferMode('low_latency');
                                localStorage.setItem('bss_buffer_mode', 'low_latency');
                              }}
                              className={`py-1 text-[11px] font-black rounded-lg transition cursor-pointer ${
                                bufferMode === 'low_latency' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                              }`}
                            >
                              Low Latency (Fast)
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-slate-800">Auto-Play on Select</span>
                          <button
                            onClick={() => {
                              const next = !autoPlay;
                              setAutoPlay(next);
                              localStorage.setItem('bss_autoplay', String(next));
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${autoPlay ? 'bg-orange-600' : 'bg-slate-300'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${autoPlay ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Display Dropdown */}
                  <div className="rounded-2xl border border-white/90 bg-white/70 backdrop-blur-md shadow-xs overflow-hidden transition-all">
                    <button
                      onClick={() => toggleAccordion('display')}
                      className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-white/90 cursor-pointer transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                          <Monitor className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900">Display</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openAccordion === 'display' ? 'rotate-180 text-orange-600' : ''}`} />
                    </button>

                    {openAccordion === 'display' && (
                      <div className="p-3.5 pt-1 space-y-3 border-t border-slate-100 bg-white/50 text-xs">
                        <div>
                          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Theme</div>
                          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                            {['light', 'dark', 'system'].map((t) => (
                              <button
                                key={t}
                                onClick={() => {
                                  setThemeMode(t);
                                  localStorage.setItem('bss_theme_mode', t);
                                }}
                                className={`py-1 text-[11px] font-black rounded-lg transition capitalize cursor-pointer ${
                                  themeMode === t ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Density</div>
                          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                              onClick={() => {
                                setLayoutDensity('comfortable');
                                localStorage.setItem('bss_layout_density', 'comfortable');
                              }}
                              className={`py-1 text-[11px] font-black rounded-lg transition cursor-pointer ${
                                layoutDensity === 'comfortable' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                              }`}
                            >
                              Comfortable
                            </button>
                            <button
                              onClick={() => {
                                setLayoutDensity('compact');
                                localStorage.setItem('bss_layout_density', 'compact');
                              }}
                              className={`py-1 text-[11px] font-black rounded-lg transition cursor-pointer ${
                                layoutDensity === 'compact' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                              }`}
                            >
                              Compact
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-slate-800">Live Score Pulse Animation</span>
                          <button
                            onClick={() => {
                              const next = !scoreTicker;
                              setScoreTicker(next);
                              localStorage.setItem('bss_score_ticker', String(next));
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${scoreTicker ? 'bg-orange-600' : 'bg-slate-300'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${scoreTicker ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Content Dropdown */}
                  <div className="rounded-2xl border border-white/90 bg-white/70 backdrop-blur-md shadow-xs overflow-hidden transition-all">
                    <button
                      onClick={() => toggleAccordion('content')}
                      className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-white/90 cursor-pointer transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                          <Layers className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900">Content</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openAccordion === 'content' ? 'rotate-180 text-orange-600' : ''}`} />
                    </button>

                    {openAccordion === 'content' && (
                      <div className="p-3.5 pt-1 space-y-3 border-t border-slate-100 bg-white/50 text-xs">
                        {/* Favorite Teams Selector */}
                        <div 
                          onClick={() => setActiveDialog('team')}
                          className="bg-white/90 hover:bg-white rounded-xl p-2.5 border border-slate-200 transition cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Favorite Teams ({selectedTeams.length})
                            </div>
                            <div className="flex items-center space-x-1 mt-1 overflow-x-auto max-w-[190px]">
                              {selectedTeams.length > 0 ? (
                                selectedTeams.slice(0, 3).map(team => (
                                  <img key={team.id} src={team.logo} alt={team.name} className="w-5 h-5 object-contain" />
                                ))
                              ) : (
                                <span className="font-bold text-slate-500">None Selected</span>
                              )}
                              {selectedTeams.length > 3 && (
                                <span className="text-[10px] font-black text-slate-400">+{selectedTeams.length - 3}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-orange-600 flex items-center">
                            Edit <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </span>
                        </div>

                        {/* Spoiler Shield (Hide Scores) */}
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <div className="font-bold text-slate-800">Spoiler Shield</div>
                            <div className="text-[10px] text-slate-400">Hide live & final game scores</div>
                          </div>
                          <button
                            onClick={() => {
                              const next = !hideScores;
                              setHideScores(next);
                              localStorage.setItem('bss_hide_scores', next ? 'true' : 'false');
                              onSettingsChange?.();
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${hideScores ? 'bg-orange-600' : 'bg-slate-300'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${hideScores ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Default Sport Tab */}
                        <div>
                          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Default Sport Tab</div>
                          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                              onClick={() => {
                                setDefaultSport('nba');
                                localStorage.setItem('bss_default_sport', 'nba');
                              }}
                              className={`py-1 text-[11px] font-black rounded-lg transition cursor-pointer ${
                                defaultSport === 'nba' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                              }`}
                            >
                              🏀 NBA
                            </button>
                            <button
                              onClick={() => {
                                setDefaultSport('nfl');
                                localStorage.setItem('bss_default_sport', 'nfl');
                              }}
                              className={`py-1 text-[11px] font-black rounded-lg transition cursor-pointer ${
                                defaultSport === 'nfl' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                              }`}
                            >
                              🏈 NFL
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Preferences Dropdown */}
                  <div className="rounded-2xl border border-white/90 bg-white/70 backdrop-blur-md shadow-xs overflow-hidden transition-all">
                    <button
                      onClick={() => toggleAccordion('preferences')}
                      className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-white/90 cursor-pointer transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900">Preferences</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openAccordion === 'preferences' ? 'rotate-180 text-orange-600' : ''}`} />
                    </button>

                    {openAccordion === 'preferences' && (
                      <div className="p-3.5 pt-1 space-y-3 border-t border-slate-100 bg-white/50 text-xs">
                        {/* IPTV M3U Playlist */}
                        <div className="bg-white/90 rounded-xl p-2.5 border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">IPTV / Cyberdash Feed</span>
                            <button
                              onClick={handleCopyIptv}
                              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1 cursor-pointer"
                            >
                              {copiedIptv ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy M3U</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                            /playlist.m3u8 (720p 60fps)
                          </div>
                        </div>

                        {/* XMLTV EPG */}
                        <div className="bg-white/90 rounded-xl p-2.5 border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">XMLTV EPG Guide</span>
                            <button
                              onClick={handleCopyEpg}
                              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1 cursor-pointer"
                            >
                              {copiedEpg ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy EPG</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                            /epg.xml
                          </div>
                        </div>

                        {/* Clock Format */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-slate-800">Clock Format</span>
                          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg">
                            <button
                              onClick={() => {
                                setClockFormat('12h');
                                localStorage.setItem('bss_clock_format', '12h');
                              }}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded ${clockFormat === '12h' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                            >
                              12h
                            </button>
                            <button
                              onClick={() => {
                                setClockFormat('24h');
                                localStorage.setItem('bss_clock_format', '24h');
                              }}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded ${clockFormat === '24h' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                            >
                              24h
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6. Security Dropdown */}
                  <div className="rounded-2xl border border-white/90 bg-white/70 backdrop-blur-md shadow-xs overflow-hidden transition-all">
                    <button
                      onClick={() => toggleAccordion('security')}
                      className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-white/90 cursor-pointer transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900">Security</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openAccordion === 'security' ? 'rotate-180 text-orange-600' : ''}`} />
                    </button>

                    {openAccordion === 'security' && (
                      <div className="p-3.5 pt-1 space-y-2.5 border-t border-slate-100 bg-white/50 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Session Status</span>
                          <span className="font-bold text-emerald-600 flex items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                            Verified
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1">
                          <div>
                            <div className="font-bold text-slate-800">Incognito Mode</div>
                            <div className="text-[10px] text-slate-400">Don't store watch history</div>
                          </div>
                          <button
                            onClick={() => {
                              const next = !privacyMode;
                              setPrivacyMode(next);
                              localStorage.setItem('bss_privacy_mode', String(next));
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${privacyMode ? 'bg-orange-600' : 'bg-slate-300'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${privacyMode ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <button
                          onClick={handleClearCache}
                          className="w-full mt-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{cacheCleared ? 'Cache Cleared!' : 'Clear Stream Cache'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 7. About Dropdown */}
                  <div className="rounded-2xl border border-white/90 bg-white/70 backdrop-blur-md shadow-xs overflow-hidden transition-all">
                    <button
                      onClick={() => toggleAccordion('about')}
                      className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-white/90 cursor-pointer transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                          <Info className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900">About</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openAccordion === 'about' ? 'rotate-180 text-orange-600' : ''}`} />
                    </button>

                    {openAccordion === 'about' && (
                      <div className="p-3.5 pt-1 space-y-2 border-t border-slate-100 bg-white/50 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">App Version</span>
                          <span className="font-bold text-slate-900">v2.8.4 (Smart TV & PWA)</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Server Health</span>
                          <span className="font-bold text-emerald-600">All Systems Operational 🟢</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">MPEG-TS Engine</span>
                          <span className="font-bold text-slate-700">60fps Ultra Smooth</span>
                        </div>

                        <button
                          onClick={() => setActiveDialog('report')}
                          className="w-full mt-1.5 py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Report an Issue to Admin</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* Card Footer: Back Button */}
                <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between">
                  <button
                    onClick={() => setIsFlipped(false)}
                    className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs transition cursor-pointer active:scale-98 shadow-md"
                  >
                    Done (Back to Badge)
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
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
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
          <div className="bg-white rounded-3xl p-5 max-w-sm sm:max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-serif font-black italic text-sm">
                  i
                </div>
                <h3 className="text-sm font-black text-slate-900">Report an Issue</h3>
              </div>
              <button
                onClick={() => setActiveDialog(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
                <h4 className="text-sm font-black text-slate-900">Report Received!</h4>
                <p className="text-xs font-semibold text-slate-500">It'll be fixed ASAP</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="pt-3 space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Notice an issue with a stream or playback? Describe what's happening:
                </p>

                <textarea
                  value={problemMessage}
                  onChange={(e) => setProblemMessage(e.target.value)}
                  placeholder="e.g. Thunder vs Blazers stream is buffering on Cyberdash..."
                  rows={4}
                  required
                  autoFocus
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition resize-none"
                />

                <div className="flex flex-col items-center space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingReport || !problemMessage.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-orange-600/20 transition active:scale-98 cursor-pointer"
                  >
                    <span>{isSubmittingReport ? 'Sending...' : 'Send Report'}</span>
                  </button>
                  <span className="text-[11px] font-semibold text-slate-400">
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
