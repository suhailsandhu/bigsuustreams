import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Volume2, VolumeX, X, Plus, Maximize2, Minimize2, ArrowLeft, 
  RefreshCw, AlertCircle, LayoutGrid, Check, Trophy, Search, ChevronDown
} from 'lucide-react';
import type { Stream } from '../types/stream.ts';
import type { ScoreboardGame } from '../types/scoreboard.ts';
import { isSmartTv, getTvHlsConfig } from '../utils/tvDetector.ts';
import { fetchStreamDetails, formatTipoffTime } from '../services/api.ts';

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
  onClose?: () => void;
  canClose: boolean;
  onQualityChange: (quality: string) => void;
}> = ({
  slot,
  index,
  isAudioActive,
  onFocusAudio,
  onClose,
  canClose,
  onQualityChange
}) => {
  const { stream, game, quality } = slot;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
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
      // Attempt play if paused due to unmuting restrictions
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  }, [isAudioActive]);

  // Load HLS Stream
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
    const sportPrefix = (stream.category === 'football' || stream.league === 'NFL') ? 'football' : 'basketball';
    const targetUrl = `/api/${sportPrefix}/hls/${stream.stream_key}/${quality}.m3u8${tokenParam}`;

    if (Hls.isSupported()) {
      const tvConfig = getTvHlsConfig(isTv);
      const hls = new Hls({
        enableWorker: tvConfig.enableWorker,
        lowLatencyMode: false,
        backBufferLength: 15,
        maxBufferLength: 20,
        maxMaxBufferLength: 30,
        maxBufferSize: 30 * 1024 * 1024,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
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
        // Start muted unless this tile has audio focus
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
      video.src = targetUrl;
      video.muted = !isAudioActive;
      video.play().catch(() => {});
      setIsLoading(false);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, [stream.stream_key, stream.category, stream.league, quality, isAudioActive, isTv]);

  useEffect(() => {
    loadStream();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [loadStream]);

  // If this stream is a YouTube highlights video
  if (stream.youtubeVideoId) {
    return (
      <div 
        onClick={onFocusAudio}
        className={`relative aspect-video bg-black rounded-2xl overflow-hidden shadow-md transition-all ${
          isAudioActive ? 'ring-2 ring-emerald-500 shadow-emerald-500/10' : 'border border-gray-200'
        }`}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${stream.youtubeVideoId}?autoplay=1&mute=${isAudioActive ? 0 : 1}&modestbranding=1&rel=0&playsinline=1`}
          title={stream.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="w-full h-full border-0 pointer-events-none"
        />
        {/* Top Controls Overlay */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-auto">
          <div className="flex items-center space-x-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-white text-[10px] font-bold">
            <span>{team1Name} @ {team2Name}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onFocusAudio(); }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1 transition-all ${
                isAudioActive ? 'bg-emerald-600 text-white' : 'bg-black/70 hover:bg-black/90 text-white/80'
              }`}
            >
              {isAudioActive ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              <span>{isAudioActive ? 'Audio ON' : 'Muted'}</span>
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
      className={`group relative aspect-video bg-neutral-950 rounded-2xl overflow-hidden shadow-lg select-none cursor-pointer transition-all duration-200 ${
        isAudioActive 
          ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-neutral-900 shadow-emerald-500/20' 
          : 'border border-gray-800 hover:border-gray-600'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        preload="auto"
        className="w-full h-full object-contain bg-black"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-[10px] font-extrabold text-white uppercase tracking-wider mt-2">
            Loading Stream {index + 1}...
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-4 text-center z-10">
          <AlertCircle className="w-6 h-6 text-orange-500 mb-1.5" />
          <span className="text-xs font-bold text-white">Stream Connecting</span>
          <button
            onClick={(e) => { e.stopPropagation(); loadStream(); }}
            className="mt-2 inline-flex items-center space-x-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Feed</span>
          </button>
        </div>
      )}

      {/* Top Header Overlay Bar */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-auto">
        {/* Left: Team Matchup & Score */}
        <div className="flex items-center space-x-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-white shadow-xs max-w-[65%]">
          {game?.awayTeam?.logo && (
            <img src={game.awayTeam.logo} alt="" className="w-3.5 h-3.5 object-contain" />
          )}
          <span className="text-[11px] font-extrabold truncate">
            {team1Name} {isLive && awayScore > 0 ? awayScore : ''}
          </span>
          <span className="text-[9px] text-gray-400 font-bold">@</span>
          {game?.homeTeam?.logo && (
            <img src={game.homeTeam.logo} alt="" className="w-3.5 h-3.5 object-contain" />
          )}
          <span className="text-[11px] font-extrabold truncate">
            {team2Name} {isLive && homeScore > 0 ? homeScore : ''}
          </span>
          {isLive && (
            <span className="inline-flex items-center space-x-1 text-[9px] font-bold text-red-400 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="hidden sm:inline">{statusDetail}</span>
            </span>
          )}
        </div>

        {/* Right: Audio Toggle, Quality, and Close */}
        <div className="flex items-center space-x-1.5">
          {/* Audio Focus Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFocusAudio();
            }}
            title={isAudioActive ? 'Sound is playing from this stream' : 'Click to listen to this stream'}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1 shadow-xs transition-all active:scale-95 ${
              isAudioActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-black/70 hover:bg-black/90 text-gray-300 hover:text-white border border-white/10'
            }`}
          >
            {isAudioActive ? (
              <>
                <Volume2 className="w-3.5 h-3.5 animate-pulse text-white" />
                <span className="font-extrabold">Listening</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-gray-400" />
                <span>Listen</span>
              </>
            )}
          </button>

          {/* Quality Selector */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQualityMenu(!showQualityMenu);
              }}
              className="bg-black/70 hover:bg-black/90 text-white/90 text-[10px] font-bold px-2 py-1 rounded-full border border-white/10 flex items-center space-x-0.5"
            >
              <span>{quality}</span>
              <ChevronDown className="w-2.5 h-2.5 ml-0.5 opacity-60" />
            </button>
            {showQualityMenu && (
              <div 
                className="absolute right-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl py-1 shadow-2xl z-30 min-w-[70px]"
                onClick={(e) => e.stopPropagation()}
              >
                {['720p', '1080p'].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      onQualityChange(q);
                      setShowQualityMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1 text-[11px] font-bold flex items-center justify-between ${
                      quality === q ? 'text-emerald-400 bg-neutral-800' : 'text-gray-300 hover:bg-neutral-800'
                    }`}
                  >
                    <span>{q}</span>
                    {quality === q && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Close Tile Button */}
          {canClose && onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Remove this stream"
              className="w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Subtle Overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span className="text-[9px] font-bold text-white/70 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
          {stream.league || 'NBA'} HD • Tile {index + 1}
        </span>
        <span className="text-[9px] font-semibold text-white/60 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
          {isAudioActive ? 'Sound Unmuted' : 'Click to un-mute'}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Add Stream Slot Card (Minimalist Dashed Tile)
// ============================================================================
const AddStreamCard: React.FC<{
  currentCount: number;
  maxStreams: number;
  onClick: () => void;
}> = ({ currentCount, maxStreams, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative aspect-video rounded-2xl border-2 border-dashed border-gray-300 hover:border-gray-400 bg-white/60 hover:bg-white text-gray-600 hover:text-gray-900 flex flex-col items-center justify-center p-6 transition-all duration-200 group cursor-pointer shadow-2xs hover:shadow-sm"
    >
      <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-transform group-hover:scale-110 mb-3">
        <Plus className="w-6 h-6" />
      </div>
      <span className="text-sm font-extrabold text-gray-900 group-hover:text-black">
        Add Game to Multi-View
      </span>
      <span className="text-xs text-gray-500 font-medium mt-1">
        Stream {currentCount + 1} of {maxStreams}
      </span>
    </button>
  );
};

// ============================================================================
// Game Picker Modal (Allows choosing from live & scheduled games)
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
    const isNfl = g.league === 'NFL';
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
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">
              Add Game to Multi-View
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Choose a live or scheduled game to watch simultaneously.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search team or game..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9.5 pr-4 py-2 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-gray-400 shadow-2xs"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            {(['all', 'nba', 'nfl'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSportFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${
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
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
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
                  className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/70 transition-all bg-white"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Away Team Logo */}
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 p-1 flex items-center justify-center shrink-0">
                      {game.awayTeam?.logo ? (
                        <img src={game.awayTeam.logo} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Trophy className="w-4 h-4 text-gray-400" />
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
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          {game.league || 'NBA'}
                        </span>
                        {isLive ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            <span>{game.status?.shortDetail || 'LIVE'}</span>
                            <span className="tabular-nums font-black ml-1">
                              ({game.awayTeam?.score} - {game.homeTeam?.score})
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-500">
                            {game.status?.shortDetail || 'Scheduled'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    {isAlreadyActive ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        <span>Watching</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectGame(game);
                          onClose();
                        }}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-white bg-black hover:bg-neutral-800 px-3.5 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Stream</span>
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [audioSlotIndex, setAudioSlotIndex] = useState(0);

  // Read default quality setting
  const defaultQuality = typeof window !== 'undefined'
    ? localStorage.getItem('bss_default_quality') || '720p'
    : '720p';

  // State: Up to 4 active stream slots
  const [slots, setSlots] = useState<MultiStreamSlot[]>([
    {
      id: initialStream.stream_key || 'slot_1',
      stream: initialStream,
      game: initialGame,
      quality: defaultQuality
    }
  ]);

  // Fullscreen support for the entire Multi-View stage
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Handle removing a slot
  const handleRemoveSlot = (index: number) => {
    if (slots.length <= 1) return;
    const updated = slots.filter((_, i) => i !== index);
    setSlots(updated);
    if (audioSlotIndex >= updated.length) {
      setAudioSlotIndex(0);
    }
  };

  // Handle quality change for a slot
  const handleQualityChange = (index: number, newQuality: string) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, quality: newQuality } : s))
    );
  };

  // Handle adding a new game
  const handleAddGame = async (game: ScoreboardGame) => {
    if (slots.length >= 4) return;

    let streamObj: Stream;

    if (game.stream?.streamKey) {
      try {
        streamObj = await fetchStreamDetails(game.stream.streamKey);
      } catch {
        // Fallback stream builder
        const awayName = game.awayTeam?.displayName || game.awayTeam?.name || 'Away';
        const homeName = game.homeTeam?.displayName || game.homeTeam?.name || 'Home';
        const isNfl = game.league === 'NFL';
        const streamKey = game.stream.streamKey;
        streamObj = {
          id: streamKey,
          name: `${awayName} at ${homeName}`,
          category: isNfl ? 'football' : 'basketball',
          league: isNfl ? 'NFL' : 'NBA',
          stream_key: streamKey,
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
    } else {
      const awayName = game.awayTeam?.displayName || game.awayTeam?.name || 'Away';
      const homeName = game.homeTeam?.displayName || game.homeTeam?.name || 'Home';
      const isNfl = game.league === 'NFL';
      const streamKey = `${awayName.toLowerCase().replace(/[^a-z0-9]/g, '')}-vs-${homeName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      streamObj = {
        id: streamKey,
        name: `${awayName} at ${homeName}`,
        category: isNfl ? 'football' : 'basketball',
        league: isNfl ? 'NFL' : 'NBA',
        stream_key: streamKey,
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

  // Determine grid columns based on slot count:
  // 1: 1 col, 2: 2 cols, 3: 2 or 3 cols, 4: 2x2 grid
  const getGridColsClass = () => {
    const totalTiles = slots.length < 4 ? slots.length + 1 : slots.length;
    if (slots.length === 1 && totalTiles === 1) return 'grid-cols-1';
    if (totalTiles === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalTiles === 3) return 'grid-cols-1 md:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2'; // 2x2 quad grid for 4
  };

  const activeStreamKeys = slots.map((s) => s.stream.stream_key);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-3xl transition-all ${
        isFullscreen ? 'bg-black p-4 fixed inset-0 z-50 overflow-y-auto' : 'space-y-4'
      }`}
    >
      {/* Top Multi-View Control Header */}
      <div className="flex items-center justify-between bg-white border border-gray-200/90 rounded-2xl px-4 py-3 shadow-2xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={onExit}
            className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 hover:text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Single View</span>
          </button>

          <div className="h-4 w-px bg-gray-200" />

          <div className="flex items-center space-x-2">
            <LayoutGrid className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-extrabold text-gray-900">
              Multi-View Mode
            </span>
            <span className="text-[10px] font-extrabold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
              {slots.length} / 4 Streams
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {slots.length < 4 && (
            <button
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-black hover:bg-neutral-800 px-3.5 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Game</span>
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center border border-gray-200 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Multi-View Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Grid of Streams */}
      <div className={`grid gap-3.5 ${getGridColsClass()}`}>
        {slots.map((slot, idx) => (
          <MultiViewTile
            key={slot.id}
            slot={slot}
            index={idx}
            isAudioActive={audioSlotIndex === idx}
            onFocusAudio={() => setAudioSlotIndex(idx)}
            canClose={slots.length > 1}
            onClose={() => handleRemoveSlot(idx)}
            onQualityChange={(q) => handleQualityChange(idx, q)}
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
