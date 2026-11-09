import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Volume2, VolumeX, X, Plus, Maximize2, ArrowLeft, 
  RefreshCw, AlertCircle, LayoutGrid, Check, Trophy, Search, Tv
} from 'lucide-react';
import type { Stream } from '../types/stream.ts';
import type { ScoreboardGame } from '../types/scoreboard.ts';
import { isSmartTv, getTvHlsConfig } from '../utils/tvDetector.ts';
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
// Single Multi-View Stream Tile Component
// ============================================================================
const MultiViewTile: React.FC<{
  slot: MultiStreamSlot;
  index: number;
  isAudioActive: boolean;
  onFocusAudio: () => void;
  onWatchBigScreen: () => void;
  onClose?: () => void;
  canClose: boolean;
  isBigScreen?: boolean;
}> = ({
  slot,
  index,
  isAudioActive,
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

  // Load HLS Stream with Bulletproof Concurrent iOS Safari & Desktop Support
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
    const targetUrl = `/api/${sportPrefix}/hls/${stream.stream_key}/${quality}.m3u8${tokenParam}`;

    // Desktop Chrome, Firefox, Edge, Android (MSE Support)
    if (Hls.isSupported()) {
      const tvConfig = getTvHlsConfig(isTv);
      const hls = new Hls({
        enableWorker: tvConfig.enableWorker,
        lowLatencyMode: false,
        backBufferLength: 10,
        maxBufferLength: 15,
        maxMaxBufferLength: 25,
        maxBufferSize: 25 * 1024 * 1024,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        maxBufferHole: 0.5,
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
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {
            setIsLoading(false);
          });
        });
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
      // In iOS Safari, concurrent videos must explicitly have muted=true on DOM creation to avoid autoplay blocking
      video.muted = !isAudioActive;
      video.src = targetUrl;
      video.load();

      const onCanPlay = () => {
        setIsLoading(false);
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      };

      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('loadedmetadata', () => setIsLoading(false), { once: true });
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, [stream.stream_key, stream.category, stream.league, stream.name, quality, isAudioActive, isTv]);

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
        className={`relative aspect-video bg-black rounded-2xl overflow-hidden shadow-md transition-all ${
          isAudioActive ? 'ring-2 ring-emerald-500' : 'border border-gray-200'
        }`}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${stream.youtubeVideoId}?autoplay=1&mute=${isAudioActive ? 0 : 1}&modestbranding=1&rel=0&playsinline=1`}
          title={stream.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="w-full h-full border-0 pointer-events-none"
        />
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-auto">
          <div className="flex items-center space-x-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-white text-[10px] font-bold">
            <span>{team1Name} @ {team2Name}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onWatchBigScreen(); }}
              className="bg-black/70 hover:bg-black text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Big Screen</span>
            </button>
            {canClose && onClose && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
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
      className={`group relative aspect-video bg-neutral-950 rounded-2xl overflow-hidden shadow-md select-none cursor-pointer transition-all duration-200 ${
        isAudioActive 
          ? 'ring-2 ring-emerald-500 shadow-emerald-500/20' 
          : 'border border-gray-800 hover:border-gray-600'
      }`}
    >
      {/* Video Element with iOS Safari concurrency attributes */}
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

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider mt-1.5">
            Connecting Stream {index + 1}...
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-3 text-center z-10">
          <AlertCircle className="w-5 h-5 text-orange-500 mb-1" />
          <span className="text-[11px] font-bold text-white">Stream Initializing</span>
          <button
            onClick={(e) => { e.stopPropagation(); loadStream(); }}
            className="mt-1.5 inline-flex items-center space-x-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Top Header Overlay Bar */}
      <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-2 sm:left-2 sm:right-2 flex items-center justify-between z-20 pointer-events-auto">
        {/* Left: Team Matchup & Score */}
        <div className="flex items-center space-x-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-white shadow-xs max-w-[60%]">
          {game?.awayTeam?.logo && (
            <img src={game.awayTeam.logo} alt="" className="w-3 h-3 object-contain" />
          )}
          <span className="text-[10px] sm:text-[11px] font-black truncate">
            {team1Name} {isLive && awayScore > 0 ? awayScore : ''}
          </span>
          <span className="text-[9px] text-gray-400 font-bold">@</span>
          {game?.homeTeam?.logo && (
            <img src={game.homeTeam.logo} alt="" className="w-3 h-3 object-contain" />
          )}
          <span className="text-[10px] sm:text-[11px] font-black truncate">
            {team2Name} {isLive && homeScore > 0 ? homeScore : ''}
          </span>
        </div>

        {/* Right: Audio Focus, Big Screen Expand, Close */}
        <div className="flex items-center space-x-1">
          {/* Audio Focus Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFocusAudio();
            }}
            title={isAudioActive ? 'Sound playing from this stream' : 'Click to listen to this stream'}
            className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center space-x-1 transition-all active:scale-95 ${
              isAudioActive
                ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                : 'bg-black/70 hover:bg-black text-gray-300 border border-white/10'
            }`}
          >
            {isAudioActive ? (
              <>
                <Volume2 className="w-3 h-3 animate-pulse text-white" />
                <span className="font-extrabold hidden sm:inline">Listening</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3 text-gray-400" />
                <span className="hidden sm:inline">Listen</span>
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
              className="bg-black/70 hover:bg-black text-white/90 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center space-x-1 border border-white/10 transition-colors"
            >
              <Tv className="w-3 h-3 text-orange-400" />
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
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Hint on Tap/Hover */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span className="text-[8px] sm:text-[9px] font-bold text-white/80 bg-black/60 px-1.5 py-0.5 rounded-md">
          {stream.league || 'NBA'} • Tap for sound
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onWatchBigScreen();
          }}
          className="pointer-events-auto text-[8px] sm:text-[9px] font-bold text-orange-400 bg-black/70 hover:bg-black px-1.5 py-0.5 rounded-md flex items-center space-x-0.5"
        >
          <Maximize2 className="w-2.5 h-2.5" />
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
}> = ({ currentCount, maxStreams, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative aspect-video rounded-2xl border-2 border-dashed border-gray-300 hover:border-gray-400 bg-white/60 hover:bg-white text-gray-600 hover:text-gray-900 flex flex-col items-center justify-center p-3 sm:p-6 transition-all duration-200 group cursor-pointer shadow-2xs hover:shadow-sm"
    >
      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-gray-100 group-hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-transform group-hover:scale-110 mb-1.5 sm:mb-2">
        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <span className="text-xs sm:text-sm font-extrabold text-gray-900 group-hover:text-black">
        Add Game
      </span>
      <span className="text-[10px] sm:text-xs text-gray-500 font-medium mt-0.5">
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-gray-900">
              Add Game to Multi-View
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">
              Select any live or scheduled game to watch simultaneously.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search */}
        <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search team or matchup..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-gray-400 shadow-2xs"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            {(['all', 'nba', 'nfl'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSportFilter(s)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  sportFilter === s
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
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
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/70 transition-all bg-white"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 p-1 flex items-center justify-center shrink-0">
                      {game.awayTeam?.logo ? (
                        <img src={game.awayTeam.logo} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Trophy className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-extrabold text-gray-900 truncate">
                          {awayName}
                        </span>
                        <span className="text-xs text-gray-400 font-bold">@</span>
                        <span className="text-xs font-extrabold text-gray-900 truncate">
                          {homeName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                          {game.league || 'NBA'}
                        </span>
                        {isLive ? (
                          <span className="inline-flex items-center space-x-1 text-[9px] font-extrabold text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            <span>{game.status?.shortDetail || 'LIVE'}</span>
                            <span className="tabular-nums font-black ml-1">
                              ({game.awayTeam?.score} - {game.homeTeam?.score})
                            </span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-gray-500">
                            {game.status?.shortDetail || 'Scheduled'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isAlreadyActive ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                        <Check className="w-3 h-3" />
                        <span>Watching</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectGame(game);
                          onClose();
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-white bg-black hover:bg-neutral-800 px-3 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
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

  // Up to 4 active stream slots
  const [slots, setSlots] = useState<MultiStreamSlot[]>([
    {
      id: initialStream.stream_key || 'slot_1',
      stream: initialStream,
      game: initialGame,
      quality: '720p'
    }
  ]);

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
        setBigScreenIndex(null); // return to quad grid if the big screen tile was removed
      } else if (bigScreenIndex > index) {
        setBigScreenIndex(bigScreenIndex - 1);
      }
    }
  };

  // Add a new game to Multi-View
  const handleAddGame = async (game: ScoreboardGame) => {
    if (slots.length >= 4) return;

    let streamObj: Stream;

    // 1. Direct streamData if already matched
    if (game.stream?.streamData) {
      streamObj = game.stream.streamData;
    } else {
      // 2. Build reliable stream object for playback
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
    <div ref={containerRef} className="w-full space-y-3">
      {/* Top Multi-View Control Header */}
      <div className="flex items-center justify-between bg-white border border-gray-200/90 rounded-2xl px-3 sm:px-4 py-2.5 shadow-2xs">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onExit}
            className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 hover:text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Single View</span>
          </button>

          <div className="h-4 w-px bg-gray-200" />

          {/* Toggle between 2x2 Grid View and Big Screen View */}
          {bigScreenIndex !== null ? (
            <button
              onClick={() => setBigScreenIndex(null)}
              className="flex items-center space-x-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Switch to 2x2 Grid</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5">
              <LayoutGrid className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-extrabold text-gray-900">
                2x2 Multi-View ({slots.length}/4)
              </span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {slots.length < 4 && (
            <button
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center space-x-1 text-xs font-bold text-white bg-black hover:bg-neutral-800 px-3 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Game</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: Big Screen Focus View (1 Big Screen on top, other 3 mini-tiles below) */}
      {bigScreenIndex !== null && slots[bigScreenIndex] && (
        <div className="space-y-3">
          {/* Featured Big Screen Player */}
          <div className="w-full">
            <MultiViewTile
              slot={slots[bigScreenIndex]}
              index={bigScreenIndex}
              isAudioActive={audioSlotIndex === bigScreenIndex}
              onFocusAudio={() => setAudioSlotIndex(bigScreenIndex)}
              onWatchBigScreen={() => {}}
              canClose={slots.length > 1}
              onClose={() => handleRemoveSlot(bigScreenIndex)}
              isBigScreen={true}
            />
          </div>

          {/* Other streams in mini strip below */}
          {slots.length > 1 && (
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                Other Active Streams (Tap to switch Big Screen)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {slots.map((slot, idx) => {
                  if (idx === bigScreenIndex) return null;
                  return (
                    <div key={slot.id} className="relative">
                      <MultiViewTile
                        slot={slot}
                        index={idx}
                        isAudioActive={audioSlotIndex === idx}
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
                    onClick={() => setIsPickerOpen(true)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: Quad 2x2 Grid View (Optimized for iPhone & Desktop: 2 on top, 2 on bottom) */}
      {bigScreenIndex === null && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
          {slots.map((slot, idx) => (
            <MultiViewTile
              key={slot.id}
              slot={slot}
              index={idx}
              isAudioActive={audioSlotIndex === idx}
              onFocusAudio={() => setAudioSlotIndex(idx)}
              onWatchBigScreen={() => {
                setBigScreenIndex(idx);
                setAudioSlotIndex(idx);
              }}
              canClose={slots.length > 1}
              onClose={() => handleRemoveSlot(idx)}
            />
          ))}

          {/* Add Stream Slot if < 4 active streams */}
          {slots.length < 4 && (
            <AddStreamCard
              currentCount={slots.length}
              maxStreams={4}
              onClick={() => setIsPickerOpen(true)}
            />
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
