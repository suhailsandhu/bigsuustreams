import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Volume2, VolumeX, X, Plus, Maximize2, ArrowLeft, 
  RefreshCw, AlertCircle, LayoutGrid, Check, Trophy, Search, Tv, RotateCw
} from 'lucide-react';
import type { Stream } from '../types/stream.ts';
import type { ScoreboardGame } from '../types/scoreboard.ts';
import { isSmartTv, getMultiViewHlsConfig, TV_KEYS } from '../utils/tvDetector.ts';
import { formatTipoffTime } from '../services/api.ts';

interface MultiStreamSlot {
  id: string;
  stream: Stream;
  game?: ScoreboardGame | null;
  quality: string;
}

interface MultiViewPlayerProps {
  initialStream: Stream;
  initialGame?: ScoreboardGame | null;
  allGames?: ScoreboardGame[];
  onExit: () => void;
}

// ============================================================================
// Single Multi-View Stream Tile Component (Ultra-fast Loading Engine)
// ============================================================================
const MultiViewTile: React.FC<{
  slot: MultiStreamSlot;
  index: number;
  isAudioActive: boolean;
  isFocused?: boolean;
  onFocusAudio: () => void;
  onWatchBigScreen: () => void;
  onClose?: () => void;
  canClose: boolean;
  isBigScreen?: boolean;
}> = ({
  slot,
  index,
  isAudioActive,
  isFocused = false,
  onFocusAudio,
  onWatchBigScreen,
  onClose,
  canClose,
  isBigScreen = false
}) => {
  const { stream, game, quality } = slot;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isTv = isSmartTv();

  const team1Name = game?.awayTeam?.shortDisplayName || game?.awayTeam?.name || stream.team1?.name || 'Away';
  const team2Name = game?.homeTeam?.shortDisplayName || game?.homeTeam?.name || stream.team2?.name || 'Home';
  const awayScore = game?.awayTeam?.score ?? 0;
  const homeScore = game?.homeTeam?.score ?? 0;
  const isLive = game?.status?.isLive ?? stream.is_live;
  const statusDetail = game?.status?.shortDetail || game?.status?.detail || (isLive ? 'LIVE' : formatTipoffTime(stream.match_timestamp));

  // Sync Audio State to HTML5 Video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isAudioActive;
    if (isAudioActive) {
      video.volume = 1;
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  }, [isAudioActive]);

  // Load HLS Stream with Sub-Second Start & Smart TV Hardware Acceleration
  const loadStream = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const token = localStorage.getItem('bigsuu_auth_token') || sessionStorage.getItem('bigsuu_auth_token') || '';
    const tokenParam = token ? `?t=${encodeURIComponent(token)}` : '';
    const isNfl = stream.category === 'football' || stream.league === 'NFL' || stream.name.toLowerCase().includes('nfl');
    const sportPrefix = isNfl ? 'football' : 'basketball';
    // Use 720p for fast lightweight loading in 2x2 grid, 1080p when big screen
    const targetQuality = isBigScreen ? '1080p' : (quality || '720p');
    const targetUrl = `/api/${sportPrefix}/hls/${stream.stream_key}/${targetQuality}.m3u8${tokenParam}`;

    // Desktop Chrome, Firefox, Edge, Android, Smart TVs (MSE Support)
    if (Hls.isSupported()) {
      const mvConfig = getMultiViewHlsConfig(isTv);
      const hls = new Hls({
        enableWorker: mvConfig.enableWorker,
        lowLatencyMode: true,
        backBufferLength: mvConfig.backBufferLength,
        maxBufferLength: isBigScreen ? 12 : mvConfig.maxBufferLength,
        maxMaxBufferLength: isBigScreen ? 20 : mvConfig.maxMaxBufferLength,
        maxBufferSize: isBigScreen ? 15 * 1024 * 1024 : mvConfig.maxBufferSize,
        liveSyncDurationCount: isBigScreen ? 2 : mvConfig.liveSyncDurationCount,
        liveMaxLatencyDurationCount: mvConfig.liveMaxLatencyDurationCount,
        initialLiveManifestSize: 1, // Start on 1st manifest immediately
        startLevel: isBigScreen ? -1 : 0, // Instant start on low bitrate, then step up smoothly
        capLevelToPlayerSize: !isBigScreen, // Free TV hardware decoders from over-rendering
        maxBufferHole: 0.5,
        nudgeOffset: mvConfig.nudgeOffset,
        nudgeMaxRetry: mvConfig.nudgeMaxRetry,
        fragLoadingTimeOut: mvConfig.fragLoadingTimeOut,
        manifestLoadingTimeOut: mvConfig.manifestLoadingTimeOut,
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
        video.muted = !isAudioActive;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            video.muted = true;
            video.play().catch(() => {
              setIsLoading(false);
            });
          });
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setIsLoading(false);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setIsLoading(false);
            setHasError(true);
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // iPhone / iPad / Safari Native HLS:
      video.muted = !isAudioActive;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = targetUrl;
      video.load();

      const onCanPlay = () => {
        setIsLoading(false);
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      };

      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(() => {});
      }, { once: true });
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, [stream.stream_key, stream.category, stream.league, stream.name, quality, isAudioActive, isTv, isBigScreen]);

  useEffect(() => {
    loadStream();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [loadStream]);

  // If YouTube Highlights
  if (stream.youtubeVideoId) {
    return (
      <div 
        onClick={onFocusAudio}
        className={`relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-md transition-all ${
          isFocused ? 'ring-4 ring-orange-500 scale-[1.01]' : isAudioActive ? 'ring-2 ring-emerald-500' : 'border border-gray-800'
        }`}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${stream.youtubeVideoId}?autoplay=1&mute=${isAudioActive ? 0 : 1}&modestbranding=1&rel=0&playsinline=1`}
          title={stream.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="w-full h-full border-0 pointer-events-none"
        />
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-auto">
          <div className="flex items-center space-x-1.5 bg-black/90 px-2.5 py-1 rounded-full border border-white/10 text-white text-[11px] font-bold">
            <span>{team1Name} @ {team2Name}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onWatchBigScreen(); }}
              className="bg-black/80 hover:bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1 border border-white/10"
            >
              <Maximize2 className="w-3 h-3 text-orange-400" />
              <span>Big Screen</span>
            </button>
            {canClose && onClose && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-7 h-7 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onFocusAudio}
      tabIndex={0}
      className={`group relative aspect-video w-full bg-neutral-950 rounded-2xl overflow-hidden select-none cursor-pointer transition-all duration-150 transform-gpu ${
        isFocused 
          ? 'ring-4 ring-orange-500 scale-[1.01] shadow-2xl z-10' 
          : isAudioActive 
            ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20' 
            : 'border border-gray-800/80 hover:border-gray-600'
      }`}
    >
      {/* Video Element with iOS Safari concurrency & TV attributes */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted={!isAudioActive}
        preload="auto"
        // @ts-ignore
        webkit-playsinline="true"
        // @ts-ignore
        autoPictureInPicture="true"
        x-webkit-airplay="allow"
        className="w-full h-full object-contain bg-black"
      />

      {/* Instant Fast Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-950/70 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider mt-2 bg-black/70 px-2 py-0.5 rounded-full">
            Loading Stream {index + 1}...
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-3 text-center z-10">
          <AlertCircle className="w-6 h-6 text-orange-500 mb-1" />
          <span className="text-xs font-bold text-white">Stream Connecting</span>
          <button
            onClick={(e) => { e.stopPropagation(); loadStream(); }}
            className="mt-2 inline-flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Top Header Overlay Bar (High contrast for Living Room TV & Mobile) */}
      <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-2 sm:left-2 sm:right-2 flex items-center justify-between z-20 pointer-events-auto">
        {/* Left: Team Matchup & Score */}
        <div className="flex items-center space-x-1.5 bg-black/85 px-2.5 py-1 rounded-full border border-white/15 text-white shadow-md max-w-[65%]">
          {game?.awayTeam?.logo && (
            <img src={game.awayTeam.logo} alt="" className="w-3.5 h-3.5 object-contain" />
          )}
          <span className="text-[10px] sm:text-xs font-black truncate">
            {team1Name} {isLive && awayScore > 0 ? awayScore : ''}
          </span>
          <span className="text-[9px] text-gray-400 font-bold">@</span>
          {game?.homeTeam?.logo && (
            <img src={game.homeTeam.logo} alt="" className="w-3.5 h-3.5 object-contain" />
          )}
          <span className="text-[10px] sm:text-xs font-black truncate">
            {team2Name} {isLive && homeScore > 0 ? homeScore : ''}
          </span>
          {statusDetail && (
            <span className="text-[9px] text-gray-400 font-bold ml-1 hidden sm:inline">
              • {statusDetail}
            </span>
          )}
        </div>

        {/* Right: Audio Focus, Big Screen Expand, Close */}
        <div className="flex items-center space-x-1.5">
          {/* Audio Focus Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFocusAudio();
            }}
            title={isAudioActive ? 'Sound playing from this stream' : 'Click to listen to this stream'}
            className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer ${
              isAudioActive
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                : 'bg-black/80 hover:bg-black text-gray-300 border border-white/15'
            }`}
          >
            {isAudioActive ? (
              <>
                <Volume2 className="w-3.5 h-3.5 animate-pulse text-white" />
                <span>Audio Active</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-gray-400" />
                <span>Listen</span>
              </>
            )}
          </button>

          {/* Big Screen Watch Button */}
          {!isBigScreen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWatchBigScreen();
              }}
              title="Watch in Big Screen"
              className="bg-black/80 hover:bg-black text-white/95 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold flex items-center space-x-1 border border-white/15 transition-colors cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Big Screen</span>
            </button>
          )}

          {/* Close Tile Button */}
          {canClose && onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Remove stream"
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/80 hover:bg-red-600 text-gray-300 hover:text-white flex items-center justify-center border border-white/15 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Hint for Sound & Expand */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span className="text-[9px] sm:text-[10px] font-bold text-white/90 bg-black/75 px-2 py-0.5 rounded-md">
          {stream.league || 'NBA'} • Click for sound
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onWatchBigScreen();
          }}
          className="pointer-events-auto text-[9px] sm:text-[10px] font-bold text-orange-400 bg-black/80 hover:bg-black px-2 py-0.5 rounded-md flex items-center space-x-1"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Expand</span>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Add Stream Slot Card (Dashed 16:9 Tile)
// ============================================================================
const AddStreamCard: React.FC<{
  currentCount: number;
  maxStreams: number;
  onClick: () => void;
  isFocused?: boolean;
}> = ({ currentCount, maxStreams, onClick, isFocused = false }) => {
  return (
    <button
      onClick={onClick}
      tabIndex={0}
      className={`relative aspect-video w-full rounded-2xl border-2 border-dashed border-gray-400 hover:border-white bg-neutral-900/60 hover:bg-neutral-900 text-gray-300 hover:text-white flex flex-col items-center justify-center p-3 sm:p-6 transition-all duration-150 group cursor-pointer ${
        isFocused ? 'ring-4 ring-orange-500 border-solid border-orange-500 scale-[1.01]' : ''
      }`}
    >
      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/10 group-hover:bg-white/20 text-white flex items-center justify-center transition-transform group-hover:scale-110 mb-1.5 sm:mb-2">
        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <span className="text-xs sm:text-sm font-black text-white">
        Add Game
      </span>
      <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-0.5">
        Stream {currentCount + 1} of {maxStreams}
      </span>
    </button>
  );
};

// ============================================================================
// Game Picker Modal
// ============================================================================
const GamePickerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  allGames: ScoreboardGame[];
  activeStreamKeys: string[];
  onSelectGame: (game: ScoreboardGame) => void;
}> = ({ isOpen, onClose, allGames, activeStreamKeys, onSelectGame }) => {
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<'all' | 'nba' | 'nfl'>('all');

  if (!isOpen) return null;

  const filteredGames = allGames.filter((g) => {
    const isNfl = g.league === 'NFL' || g.id?.startsWith('nfl_');
    if (sportFilter === 'nba' && isNfl) return false;
    if (sportFilter === 'nfl' && !isNfl) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const away = (g.awayTeam?.displayName || g.awayTeam?.name || '').toLowerCase();
    const home = (g.homeTeam?.displayName || g.homeTeam?.name || '').toLowerCase();
    return away.includes(q) || home.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-gray-700 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              Add Game to Multi-View
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-400 font-medium mt-0.5">
              Select any live or scheduled game to watch simultaneously.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search */}
        <div className="p-3 sm:p-4 border-b border-gray-800 bg-neutral-950/50 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search team or matchup..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-800 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-white placeholder:text-gray-400 focus:outline-hidden focus:border-orange-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            {(['all', 'nba', 'nfl'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSportFilter(s)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  sportFilter === s
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700 border border-gray-700'
                }`}
              >
                {s === 'all' ? 'All Games' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Games List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
          {filteredGames.length > 0 ? (
            filteredGames.map((game) => {
              const streamKey = game.stream?.streamKey || '';
              const isAlreadyActive = activeStreamKeys.some(
                (k) => k === streamKey || (k && streamKey && k.includes(streamKey))
              );
              const isLive = game.status?.isLive;
              const awayName = game.awayTeam?.displayName || game.awayTeam?.name || 'Away';
              const homeName = game.homeTeam?.displayName || game.homeTeam?.name || 'Home';

              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-gray-800 hover:border-gray-700 hover:bg-neutral-800/80 transition-all bg-neutral-900"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-gray-700 p-1 flex items-center justify-center shrink-0">
                      {game.awayTeam?.logo ? (
                        <img src={game.awayTeam.logo} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Trophy className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-extrabold text-white truncate">
                          {awayName}
                        </span>
                        <span className="text-xs text-gray-400 font-bold">@</span>
                        <span className="text-xs font-extrabold text-white truncate">
                          {homeName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                          {game.league || 'NBA'}
                        </span>
                        {isLive ? (
                          <span className="inline-flex items-center space-x-1 text-[9px] font-extrabold text-red-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span>{game.status?.shortDetail || 'LIVE'}</span>
                            <span className="tabular-nums font-black ml-1">
                              ({game.awayTeam?.score} - {game.homeTeam?.score})
                            </span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-gray-400">
                            {game.status?.shortDetail || 'Scheduled'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isAlreadyActive ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-gray-400 bg-neutral-800 px-3 py-1.5 rounded-full border border-gray-700">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Watching</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectGame(game);
                          onClose();
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-white bg-orange-600 hover:bg-orange-500 px-3.5 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-400 text-xs font-semibold">
              No games found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Primary Multi-View Player Component
// ============================================================================
export const MultiViewPlayer: React.FC<MultiViewPlayerProps> = ({
  initialStream,
  initialGame,
  allGames = [],
  onExit
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [audioSlotIndex, setAudioSlotIndex] = useState(0);
  const [bigScreenIndex, setBigScreenIndex] = useState<number | null>(null);
  const [tvFocusIndex, setTvFocusIndex] = useState(0);

  // Detect mobile & iPhone for full-screen landscape court presentation
  const isIPhone = typeof navigator !== 'undefined' && /iPhone|iPod|iPad/i.test(navigator.userAgent);
  const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || isIPhone);
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > window.innerHeight;
  });

  // Track window orientation
  useEffect(() => {
    const handleOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);

    // Auto-request landscape orientation & fullscreen on iPhone / mobile
    if (isMobile) {
      try {
        // @ts-ignore
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          // @ts-ignore
          screen.orientation.lock('landscape').catch(() => {});
        }
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {}
    }

    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [isMobile]);

  // Up to 4 active stream slots
  const [slots, setSlots] = useState<MultiStreamSlot[]>([
    {
      id: initialStream.stream_key || 'slot_1',
      stream: initialStream,
      game: initialGame,
      quality: '720p'
    }
  ]);

  // Remote Control (Smart TV D-Pad & Keyboard navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode;

      // RETURN / BACK on Samsung Tizen & LG TV remotes, Escape, Backspace
      if (code === TV_KEYS.RETURN || code === TV_KEYS.ESCAPE || code === TV_KEYS.BACKSPACE) {
        if (isPickerOpen) {
          setIsPickerOpen(false);
          e.preventDefault();
          return;
        }
        if (bigScreenIndex !== null) {
          setBigScreenIndex(null);
          e.preventDefault();
          return;
        }
        onExit();
        e.preventDefault();
        return;
      }

      // ARROW KEYS (D-PAD Navigation across 2x2 grid)
      if (code === TV_KEYS.LEFT) {
        setTvFocusIndex((prev) => Math.max(0, prev - 1));
        e.preventDefault();
      } else if (code === TV_KEYS.RIGHT) {
        setTvFocusIndex((prev) => Math.min(slots.length - 1, prev + 1));
        e.preventDefault();
      } else if (code === TV_KEYS.UP) {
        setTvFocusIndex((prev) => (prev >= 2 ? prev - 2 : prev));
        e.preventDefault();
      } else if (code === TV_KEYS.DOWN) {
        setTvFocusIndex((prev) => (prev + 2 < slots.length ? prev + 2 : prev));
        e.preventDefault();
      } else if (code === TV_KEYS.ENTER) {
        // ENTER activates audio or toggles Big Screen
        if (tvFocusIndex >= 0 && tvFocusIndex < slots.length) {
          if (audioSlotIndex !== tvFocusIndex) {
            setAudioSlotIndex(tvFocusIndex);
          } else {
            setBigScreenIndex(bigScreenIndex === tvFocusIndex ? null : tvFocusIndex);
          }
        }
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slots.length, tvFocusIndex, audioSlotIndex, bigScreenIndex, isPickerOpen, onExit]);

  // Remove a slot
  const handleRemoveSlot = (index: number) => {
    if (slots.length <= 1) return;
    const updated = slots.filter((_, i) => i !== index);
    setSlots(updated);
    if (audioSlotIndex >= updated.length) {
      setAudioSlotIndex(0);
    }
    if (bigScreenIndex !== null) {
      if (bigScreenIndex === index) {
        setBigScreenIndex(null);
      } else if (bigScreenIndex > index) {
        setBigScreenIndex(bigScreenIndex - 1);
      }
    }
  };

  // Add a new game to Multi-View
  const handleAddGame = async (game: ScoreboardGame) => {
    if (slots.length >= 4) return;

    let streamObj: Stream;

    if (game.stream?.streamData) {
      streamObj = game.stream.streamData;
    } else {
      const isNfl = game.league === 'NFL' || game.id?.startsWith('nfl_');
      const awayName = game.awayTeam?.displayName || game.awayTeam?.name || 'Away';
      const homeName = game.homeTeam?.displayName || game.homeTeam?.name || 'Home';
      const cleanKey = game.stream?.streamKey || 
        `${awayName.toLowerCase().replace(/[^a-z0-9]/g, '')}-vs-${homeName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      streamObj = {
        id: cleanKey,
        name: `${awayName} at ${homeName}`,
        category: isNfl ? 'football' : 'basketball',
        league: isNfl ? 'NFL' : 'NBA',
        stream_key: cleanKey,
        match_timestamp: Math.floor(new Date(game.date).getTime() / 1000) || Math.floor(Date.now() / 1000),
        viewers: 0,
        is_external: false,
        thumbnail_url: '',
        sources: [
          { quality: '1080p', url: '' },
          { quality: '720p', url: '' }
        ],
        live_sources: [
          { quality: '1080p', url: '' },
          { quality: '720p', url: '' }
        ],
        team1: { name: awayName, logo: game.awayTeam?.logo || '' },
        team2: { name: homeName, logo: game.homeTeam?.logo || '' },
        is_live: Boolean(game.status?.isLive),
        status: game.status?.isLive ? 'live' : 'upcoming'
      };
    }

    setSlots((prev) => [
      ...prev,
      {
        id: streamObj.stream_key || `slot_${Date.now()}`,
        stream: streamObj,
        game,
        quality: '720p'
      }
    ]);
  };

  const activeStreamKeys = slots.map((s) => s.stream.stream_key);

  return (
    <div 
      ref={containerRef} 
      className={`w-full ${
        isMobile 
          ? 'fixed inset-0 z-50 bg-black flex flex-col w-screen h-screen overflow-hidden p-1.5' 
          : 'space-y-3'
      }`}
    >
      {/* Top Multi-View Control Header (Clean, minimalist, TV & iPhone optimized) */}
      <div className="flex items-center justify-between bg-neutral-900 border border-gray-800 rounded-2xl px-3 sm:px-4 py-2 shadow-md shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onExit}
            className="flex items-center space-x-1.5 text-xs font-bold text-gray-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Single View</span>
          </button>

          <div className="h-4 w-px bg-gray-700" />

          {/* Toggle between 2x2 Grid View and Big Screen View */}
          {bigScreenIndex !== null ? (
            <button
              onClick={() => setBigScreenIndex(null)}
              className="flex items-center space-x-1.5 text-xs font-extrabold text-orange-400 bg-orange-950/60 hover:bg-orange-900/60 border border-orange-500/40 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Switch to 2x2 Grid</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5">
              <LayoutGrid className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-extrabold text-white">
                2x2 Court View ({slots.length}/4)
              </span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* iPhone Portrait Warning Hint */}
          {isMobile && !isLandscape && (
            <div className="hidden sm:flex items-center space-x-1 text-[11px] font-bold text-orange-400 bg-orange-950/60 px-2.5 py-1 rounded-full border border-orange-500/30">
              <RotateCw className="w-3 h-3 animate-spin" />
              <span>Rotate Landscape for Fullscreen</span>
            </div>
          )}

          {slots.length < 4 && (
            <button
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center space-x-1 text-xs font-extrabold text-white bg-orange-600 hover:bg-orange-500 px-3.5 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Game</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: Big Screen Focus View (1 Big Screen on top, other 3 mini-tiles below) */}
      {bigScreenIndex !== null && slots[bigScreenIndex] && (
        <div className="flex-1 flex flex-col space-y-2 overflow-y-auto min-h-0">
          {/* Featured Big Screen Player */}
          <div className="w-full flex-1 min-h-0 flex items-center justify-center">
            <MultiViewTile
              slot={slots[bigScreenIndex]}
              index={bigScreenIndex}
              isAudioActive={audioSlotIndex === bigScreenIndex}
              isFocused={tvFocusIndex === bigScreenIndex}
              onFocusAudio={() => setAudioSlotIndex(bigScreenIndex)}
              onWatchBigScreen={() => {}}
              canClose={slots.length > 1}
              onClose={() => handleRemoveSlot(bigScreenIndex)}
              isBigScreen={true}
            />
          </div>

          {/* Other streams in mini strip below */}
          {slots.length > 1 && (
            <div className="shrink-0 pb-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                Other Active Streams (Tap to switch Big Screen)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slots.map((slot, idx) => {
                  if (idx === bigScreenIndex) return null;
                  return (
                    <div key={slot.id} className="relative">
                      <MultiViewTile
                        slot={slot}
                        index={idx}
                        isAudioActive={audioSlotIndex === idx}
                        isFocused={tvFocusIndex === idx}
                        onFocusAudio={() => {
                          setAudioSlotIndex(idx);
                          setBigScreenIndex(idx);
                        }}
                        onWatchBigScreen={() => {
                          setBigScreenIndex(idx);
                          setAudioSlotIndex(idx);
                        }}
                        canClose={slots.length > 1}
                        onClose={() => handleRemoveSlot(idx)}
                      />
                    </div>
                  );
                })}

                {slots.length < 4 && (
                  <AddStreamCard
                    currentCount={slots.length}
                    maxStreams={4}
                    isFocused={tvFocusIndex === slots.length}
                    onClick={() => setIsPickerOpen(true)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: Quad 2x2 Grid View (2 on Top, 2 on Bottom on iPhone and Desktop) */}
      {bigScreenIndex === null && (
        <div 
          className={`grid grid-cols-2 ${
            isMobile 
              ? 'flex-1 grid-rows-2 gap-1.5 w-full h-full min-h-0' 
              : 'gap-2.5 sm:gap-3.5'
          }`}
        >
          {slots.map((slot, idx) => (
            <div 
              key={slot.id} 
              className={isMobile ? 'w-full h-full flex items-center justify-center min-h-0' : ''}
            >
              <MultiViewTile
                slot={slot}
                index={idx}
                isAudioActive={audioSlotIndex === idx}
                isFocused={tvFocusIndex === idx}
                onFocusAudio={() => setAudioSlotIndex(idx)}
                onWatchBigScreen={() => {
                  setBigScreenIndex(idx);
                  setAudioSlotIndex(idx);
                }}
                canClose={slots.length > 1}
                onClose={() => handleRemoveSlot(idx)}
              />
            </div>
          ))}

          {/* Add Stream Slot if < 4 active streams */}
          {slots.length < 4 && (
            <div className={isMobile ? 'w-full h-full flex items-center justify-center min-h-0' : ''}>
              <AddStreamCard
                currentCount={slots.length}
                maxStreams={4}
                isFocused={tvFocusIndex === slots.length}
                onClick={() => setIsPickerOpen(true)}
              />
            </div>
          )}
        </div>
      )}

      {/* Game Selection Modal */}
      <GamePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        allGames={allGames}
        activeStreamKeys={activeStreamKeys}
        onSelectGame={handleAddGame}
      />
    </div>
  );
};
