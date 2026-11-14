import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RotateCcw, RotateCw, RefreshCw, AlertCircle, Wifi, 
  ChevronLeft, ChevronRight, X, Radio, Car
} from 'lucide-react';
import type { Stream } from '../types/stream';
import type { ScoreboardGame } from '../types/scoreboard';
import { getTeslaDrivingHlsConfig, requestScreenWakeLock } from '../utils/teslaDetector';
import LatticeLoader from './LatticeLoader';

interface TeslaInMotionPlayerProps {
  stream: Stream;
  game?: ScoreboardGame | null;
  allGames?: ScoreboardGame[];
  selectedQuality: string;
  onQualityChange: (quality: string) => void;
  onCloseTeslaMode: () => void;
  onSelectGame?: (game: ScoreboardGame) => void;
}

export const TeslaInMotionPlayer: React.FC<TeslaInMotionPlayerProps> = ({
  stream,
  game,
  allGames = [],
  selectedQuality,
  onQualityChange,
  onCloseTeslaMode,
  onSelectGame
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef<number>(0);
  const watchdogTimerRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<'stable' | 'buffering' | 'reconnecting'>('stable');
  const [bufferSec, setBufferSec] = useState<number>(0);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const controlsTimeoutRef = useRef<any>(null);

  // Filter only live games for quick in-motion carousel switching
  const liveGames = useMemo(() => {
    return allGames.filter((g) => {
      if (!g.status?.isLive) return false;
      if (g.status?.state === 'pre' || g.status?.state === 'post') return false;
      const detail = (g.status?.shortDetail || g.status?.detail || '').toUpperCase();
      if (detail.includes(' AM') || detail.includes(' PM') || detail.includes(' ET')) return false;
      return true;
    });
  }, [allGames]);

  // Current game index in live games
  const currentGameIndex = useMemo(() => {
    if (!game) return -1;
    return liveGames.findIndex((g) => g.id === game.id);
  }, [liveGames, game]);

  // Next / Previous live game switchers
  const handlePrevGame = useCallback(() => {
    if (liveGames.length <= 1 || currentGameIndex <= 0) return;
    const prev = liveGames[currentGameIndex - 1];
    if (prev && onSelectGame) onSelectGame(prev);
  }, [liveGames, currentGameIndex, onSelectGame]);

  const handleNextGame = useCallback(() => {
    if (liveGames.length <= 1 || currentGameIndex >= liveGames.length - 1) return;
    const next = liveGames[currentGameIndex + 1];
    if (next && onSelectGame) onSelectGame(next);
  }, [liveGames, currentGameIndex, onSelectGame]);

  // Request Wake Lock to prevent Tesla screen dimming
  useEffect(() => {
    requestScreenWakeLock().then((lock) => {
      wakeLockRef.current = lock;
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestScreenWakeLock().then((lock) => {
          wakeLockRef.current = lock;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      try {
        wakeLockRef.current?.release();
      } catch {}
    };
  }, []);

  // Auto-hide controls after 4 seconds of inactivity
  const pokeControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowQualityMenu(false);
      }
    }, 4500);
  }, [isPlaying]);

  const toggleControls = useCallback(() => {
    if (showControls) {
      setShowControls(false);
      setShowQualityMenu(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      pokeControls();
    }
  }, [showControls, pokeControls]);

  // Available qualities
  const availableQualities = useMemo(() => {
    const raw = stream.sources?.map((s) => s.quality) || [];
    const normalized = raw
      .map((q) => {
        const lower = q.toLowerCase();
        if (lower.includes('4k') || lower.includes('2160')) return '2160p';
        if (lower.includes('1080') || lower.includes('fhd')) return '1080p';
        if (lower.includes('720') || lower.includes('hd')) return '720p';
        return q;
      })
      .filter((q) => q === '720p' || q === '1080p' || q === '2160p');
    const unique = Array.from(new Set(normalized));
    if (unique.length > 0) {
      const all = ['720p', '1080p', '2160p'];
      return all.filter((q) => (unique as string[]).includes(q));
    }
    return ['720p', '1080p'];
  }, [stream.sources]);

  // Load HLS Stream with Tesla Driving Profile
  const loadTeslaStream = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setNetworkStatus('buffering');

    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

    // Watchdog: If playback does not start within 15 seconds, attempt recovery
    watchdogTimerRef.current = setTimeout(() => {
      if (video.paused && video.readyState === 0) {
        console.warn('[TeslaMode] Cellular stream watchdog triggered, attempting auto-retry...');
        setNetworkStatus('reconnecting');
        if (selectedQuality === '1080p' && availableQualities.includes('720p')) {
          onQualityChange('720p');
        } else {
          setIsLoading(false);
          setHasError(true);
          setErrorMessage('Cellular connection initializing. Tap to retry stream.');
        }
      }
    }, 15000);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const token = localStorage.getItem('bigsuu_auth_token') || sessionStorage.getItem('bigsuu_auth_token') || '';
    const tokenParam = token ? `?t=${encodeURIComponent(token)}` : '';
    const sportPrefix = (stream.category === 'football' || stream.league === 'NFL') ? 'football' : 'basketball';
    const targetUrl = `/api/${sportPrefix}/hls/${stream.stream_key}/${selectedQuality}.m3u8${tokenParam}`;

    if (Hls.isSupported()) {
      const drivingConfig = getTeslaDrivingHlsConfig();
      const hls = new Hls({
        ...drivingConfig,
        xhrSetup: (xhr) => {
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
        }
      });

      hlsRef.current = hls;
      hls.loadSource(targetUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setNetworkStatus('stable');
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

        video.play().then(() => {
          setIsPlaying(true);
          retryCountRef.current = 0;
        }).catch(() => {
          // In Tesla browser, muted playback always succeeds without initial gesture
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => {
            setIsPlaying(true);
            retryCountRef.current = 0;
          }).catch(() => {
            setIsPlaying(false);
            setIsLoading(false);
          });
        });
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setIsLoading(false);
        setNetworkStatus('stable');
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        console.warn('[TeslaMode] HLS fatal error during drive:', data.type, data.details);
        setNetworkStatus('reconnecting');

        if (retryCountRef.current < 6) {
          retryCountRef.current += 1;
          const delay = Math.min(retryCountRef.current * 1000, 3000);
          setTimeout(() => {
            if (!hlsRef.current) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            }
          }, delay);
        } else {
          // If cellular dropped heavily on 1080p, downgrade to 720p
          if (selectedQuality === '1080p' && availableQualities.includes('720p')) {
            console.log('[TeslaMode] Cellular bandwidth drop: switching to 720p...');
            hls.destroy();
            hlsRef.current = null;
            onQualityChange('720p');
            return;
          }

          hls.destroy();
          hlsRef.current = null;
          setIsLoading(false);
          setHasError(true);
          setErrorMessage('Cellular connection interrupted. Tap to resume.');
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = targetUrl;
      video.play().then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      }).catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => setIsLoading(false));
      });
    }
  }, [availableQualities, onQualityChange, selectedQuality, stream.category, stream.league, stream.stream_key]);

  useEffect(() => {
    loadTeslaStream();
    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [loadTeslaStream]);

  // Buffer length calculation loop
  useEffect(() => {
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.buffered && v.buffered.length > 0) {
        for (let i = 0; i < v.buffered.length; i++) {
          if (v.currentTime >= v.buffered.start(i) && v.currentTime <= v.buffered.end(i)) {
            setBufferSec(Math.round(v.buffered.end(i) - v.currentTime));
            break;
          }
        }
      }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        pokeControls();
      }).catch(console.error);
    } else {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  }, [pokeControls]);

  // Large Mute toggle
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    if (!video.muted && video.volume === 0) {
      video.volume = 1;
      setVolume(1);
    }
    pokeControls();
  }, [pokeControls]);

  // Quick 15s Skip Forward & Backward
  const seekRelative = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime + seconds);
    pokeControls();
  }, [pokeControls]);

  // Native Fullscreen Toggle for Tesla In-Car Passenger Dialog
  const requestTeslaFullscreen = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!container || !video) return;

    // Tesla's Chromium browser intercepts video.requestFullscreen() or container.requestFullscreen()
    // and presents the native "Passenger Playback: I am a passenger" confirmation while in motion.
    const req = 
      video.requestFullscreen || 
      (video as any).webkitRequestFullscreen || 
      container.requestFullscreen || 
      (container as any).webkitRequestFullscreen;

    if (req) {
      req.call(video).then(() => {
        setIsFullscreen(true);
        pokeControls();
      }).catch(() => {
        // Fallback to container fullscreen
        if (container.requestFullscreen) {
          container.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
        }
      });
    }
  }, [pokeControls]);

  const exitTeslaFullscreen = useCallback(() => {
    const doc = document as any;
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (exit) {
      exit.call(doc).then(() => setIsFullscreen(false)).catch(console.error);
    }
    setIsFullscreen(false);
    pokeControls();
  }, [pokeControls]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement);
      setIsFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      onClick={pokeControls}
      className="relative w-full h-full min-h-[500px] sm:min-h-[600px] bg-black text-white flex flex-col justify-between overflow-hidden select-none"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted={isMuted}
        preload="auto"
        tabIndex={0}
        // @ts-ignore
        webkit-playsinline="true"
        // @ts-ignore
        autoPictureInPicture="true"
        className="w-full h-full object-contain cursor-pointer"
        onClick={toggleControls}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setNetworkStatus('buffering')}
        onPlaying={() => {
          setIsLoading(false);
          setNetworkStatus('stable');
        }}
      />

      {/* Top HUD: In-Motion Status & Navigation */}
      <div 
        className={`absolute top-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Back / Exit Tesla Mode Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onCloseTeslaMode}
            className="flex items-center space-x-2 bg-white/15 hover:bg-white/25 active:bg-white/35 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 transition text-sm font-bold cursor-pointer"
            title="Exit In-Motion Mode"
          >
            <X className="w-5 h-5 text-white" />
            <span className="hidden sm:inline">Exit In-Motion</span>
          </button>

          {/* Tesla Mode Active Badge */}
          <div className="flex items-center space-x-2 bg-red-600/90 text-white px-3.5 py-1.5 rounded-2xl border border-red-400/30 text-xs font-black uppercase tracking-wider backdrop-blur-md">
            <Car className="w-4 h-4 animate-pulse" />
            <span>Tesla In-Motion</span>
          </div>
        </div>

        {/* Center: Live Match Title & Score */}
        <div className="flex flex-col items-center max-w-[40%] text-center">
          <span className="text-sm sm:text-base font-black text-white truncate max-w-full drop-shadow-md">
            {stream.name}
          </span>
          {game && (
            <span className="text-xs font-bold text-amber-400 drop-shadow-xs">
              {game.awayTeam?.score !== undefined && game.homeTeam?.score !== undefined
                ? `${game.awayTeam.abbreviation} ${game.awayTeam.score} - ${game.homeTeam.score} ${game.homeTeam.abbreviation} • ${game.status?.shortDetail || 'LIVE'}`
                : game.status?.shortDetail || 'LIVE'}
            </span>
          )}
        </div>

        {/* Right: Cellular / Buffer Status & Quality Selector */}
        <div className="flex items-center space-x-2.5">
          {/* Cellular Network Pill */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl border backdrop-blur-md text-xs font-bold ${
            networkStatus === 'stable' 
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' 
              : networkStatus === 'buffering'
              ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
              : 'bg-red-950/80 border-red-500/40 text-red-300'
          }`}>
            <Wifi className={`w-3.5 h-3.5 ${networkStatus === 'buffering' ? 'animate-bounce' : ''}`} />
            <span>
              {networkStatus === 'stable' ? `LTE • ${bufferSec}s Buf` : networkStatus === 'buffering' ? 'LTE Buffering...' : 'Reconnecting...'}
            </span>
          </div>

          {/* Quality Picker Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQualityMenu((v) => !v);
              }}
              className="bg-white/15 hover:bg-white/25 active:bg-white/35 border border-white/20 px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase text-white cursor-pointer transition backdrop-blur-md"
            >
              {selectedQuality}
            </button>
            {showQualityMenu && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 bg-neutral-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-1.5 shadow-2xl flex flex-col space-y-1 z-40 min-w-[120px]"
              >
                {availableQualities.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      onQualityChange(q);
                      setShowQualityMenu(false);
                      pokeControls();
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-left cursor-pointer transition ${
                      selectedQuality === q ? 'bg-red-600 text-white' : 'text-neutral-300 hover:bg-white/10'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Tap to Play / Fullscreen Passenger Prompt or Loading State */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 pointer-events-none p-4">
          <LatticeLoader
            label="Optimizing for Tesla in-motion..."
            status="working"
            pattern="orbit"
            grid={3}
            cellSize={8}
            gap={3}
            color="#ef4444"
            glow
            glowColor="#ef4444"
            showTimer
            className="text-white font-black"
          />
          <p className="text-xs text-neutral-400 mt-2 font-bold">
            Cellular LTE Buffer: 35s Cushion • {selectedQuality} HD
          </p>
        </div>
      )}

      {/* Error / Reconnect Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center z-30">
          <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white mb-1">
            Cellular Signal Interrupted
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mb-5 leading-relaxed">
            {errorMessage || 'Cellular data encountered high packet loss. Tap retry to reconnect.'}
          </p>
          <button
            onClick={() => {
              retryCountRef.current = 0;
              loadTeslaStream();
            }}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-sm px-6 py-3.5 rounded-2xl shadow-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reconnect Live Feed</span>
          </button>
        </div>
      )}

      {/* Center Big Play/Pause Touch Target (Shows when paused) */}
      {!isPlaying && !isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs z-20">
          <button
            onClick={togglePlay}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center shadow-2xl transition border-4 border-white/30 cursor-pointer group"
            aria-label="Play Stream"
          >
            <Play className="w-12 h-12 fill-current ml-1 transition-transform group-hover:scale-110" />
          </button>
          <div className="mt-4 text-center">
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              Tap to Resume Playback
            </h3>
            <p className="text-xs text-neutral-400 mt-1 font-semibold">
              Tesla Passenger Safe • H.264 / AAC High Definition
            </p>
          </div>
        </div>
      )}

      {/* Bottom Automotive HUD (Big 64px+ Car Controls) */}
      <div
        className={`absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col space-y-4 z-30 transition-opacity duration-300 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Live Channel / Game Quick Switcher Carousel */}
        {liveGames.length > 1 && (
          <div className="flex items-center justify-center space-x-3 w-full">
            <button
              onClick={handlePrevGame}
              disabled={currentGameIndex <= 0}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer backdrop-blur-md border ${
                currentGameIndex > 0
                  ? 'bg-white/15 hover:bg-white/25 active:scale-95 border-white/20 text-white'
                  : 'bg-white/5 border-white/5 text-neutral-600 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev Game</span>
            </button>

            {/* Current Game Indicator */}
            <div className="flex items-center space-x-2 bg-neutral-900/90 border border-white/20 px-4 py-2 rounded-2xl text-xs font-black">
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>
                Game {currentGameIndex + 1} of {liveGames.length}
              </span>
            </div>

            <button
              onClick={handleNextGame}
              disabled={currentGameIndex >= liveGames.length - 1}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer backdrop-blur-md border ${
                currentGameIndex < liveGames.length - 1
                  ? 'bg-white/15 hover:bg-white/25 active:scale-95 border-white/20 text-white'
                  : 'bg-white/5 border-white/5 text-neutral-600 cursor-not-allowed'
              }`}
            >
              <span>Next Game</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Primary Controls Row */}
        <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
          {/* Left: Volume & Mute Large Touch Target */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleMute}
              className="w-14 h-14 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center border border-white/20 transition cursor-pointer backdrop-blur-md"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-6 h-6 text-red-400" />
              ) : (
                <Volume2 className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                if (videoRef.current) {
                  videoRef.current.volume = val;
                  videoRef.current.muted = val === 0;
                  setIsMuted(val === 0);
                }
              }}
              className="w-24 sm:w-32 h-2 accent-red-600 bg-white/20 rounded-lg cursor-pointer hidden md:block"
            />
          </div>

          {/* Center: -15s Seek, GIANT Play/Pause, +15s Seek */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* -15s Seek */}
            <button
              onClick={() => seekRelative(-15)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 flex flex-col items-center justify-center border border-white/15 text-white transition cursor-pointer backdrop-blur-md"
              title="Rewind 15 seconds"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-[10px] font-black leading-none mt-0.5">-15s</span>
            </button>

            {/* GIANT Play/Pause button */}
            <button
              onClick={togglePlay}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-red-600 hover:bg-red-500 active:scale-90 flex items-center justify-center shadow-2xl transition border-2 border-white/30 text-white cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>

            {/* +15s Seek */}
            <button
              onClick={() => seekRelative(15)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 flex flex-col items-center justify-center border border-white/15 text-white transition cursor-pointer backdrop-blur-md"
              title="Fast forward 15 seconds"
            >
              <RotateCw className="w-5 h-5" />
              <span className="text-[10px] font-black leading-none mt-0.5">+15s</span>
            </button>
          </div>

          {/* Right: Fullscreen Button (Triggers Tesla Passenger Confirmation) */}
          <div className="flex items-center space-x-3">
            <button
              onClick={isFullscreen ? exitTeslaFullscreen : requestTeslaFullscreen}
              className="w-14 h-14 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center border border-white/20 text-white transition cursor-pointer backdrop-blur-md"
              title={isFullscreen ? 'Exit Fullscreen' : 'Tesla In-Motion Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-6 h-6 text-white" />
              ) : (
                <Maximize2 className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
