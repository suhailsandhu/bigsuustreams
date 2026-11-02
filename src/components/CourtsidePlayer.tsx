import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  Settings, RefreshCw, AlertCircle, ShieldCheck, Tv, ExternalLink,
  Layers, Radio
} from 'lucide-react';
import type { Stream } from '../types/stream.ts';

interface CourtsidePlayerProps {
  stream: Stream;
  selectedQuality: string;
  onQualityChange: (quality: string) => void;
}

export const CourtsidePlayer: React.FC<CourtsidePlayerProps> = ({
  stream,
  selectedQuality,
  onQualityChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef<number>(0);
  const watchdogTimerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [playerMode, setPlayerMode] = useState<'direct' | 'embed'>('direct');
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const controlsTimeoutRef = useRef<any>(null);

  // Available qualities in requested order: 540p, 720p, 1080p, 2160p
  const availableQualities = ['540p', '720p', '1080p', '2160p'];
  const manifestUrl = `/api/basketball/hls/${stream.stream_key}/${selectedQuality}.m3u8`;

  // Autohide controls on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowQualityMenu(false);
      }
    }, 3500);
  };

  const loadHlsStream = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setIsVerified(false);

    // Clear watchdog timer
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

    // Watchdog: If playback does not start within 6 seconds, auto-fallback to embed feed
    watchdogTimerRef.current = setTimeout(() => {
      if (video.paused && video.readyState < 2) {
        console.warn('Playback watchdog timeout fired for', stream.stream_key, selectedQuality);
        console.log('Seamlessly switching to official embed feed...');
        setPlayerMode('embed');
        setIsLoading(false);
      }
    }, 6000);

    // Destroy existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // 1. Check if Hls.js is supported (Chrome, Edge, Firefox, Android)
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        fragLoadingMaxRetry: 3,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
      });

      hlsRef.current = hls;
      hls.loadSource(manifestUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setIsVerified(true);
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

        video.play().then(() => {
          setIsPlaying(true);
          retryCountRef.current = 0;
        }).catch(() => {
          // Autoplay policy prevented unmuted playback, mute and retry
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setIsLoading(false);
        setIsVerified(true);
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('HLS.js event error:', data.type, data.details);
        if (data.fatal) {
          if (retryCountRef.current < 2) {
            retryCountRef.current += 1;
            console.log(`Recovering from fatal error (attempt ${retryCountRef.current}/2)...`);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            }
          } else {
            // Maximum retries reached -> Seamlessly switch to embed mode
            if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            hls.destroy();
            console.log('Direct HLS feed unavailable on host, seamlessly falling back to official live embed...');
            setPlayerMode('embed');
            setIsLoading(false);
          }
        }
      });
    } 
    // 2. Native HLS support (Safari iOS / Safari macOS)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = manifestUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        setIsVerified(true);
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
        video.play().then(() => setIsPlaying(true)).catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
      });

      video.addEventListener('error', () => {
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
        console.warn('Native HLS error, switching to official embed feed...');
        setPlayerMode('embed');
        setIsLoading(false);
      });
    } else {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      setHasError(true);
      setErrorMessage('Your browser does not support HLS video playback.');
      setIsLoading(false);
    }
  }, [manifestUrl, onQualityChange, selectedQuality, stream.stream_key]);

  useEffect(() => {
    if (playerMode === 'direct') {
      loadHlsStream();
    }
    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [loadHlsStream, playerMode]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => {
      setIsLoading(false);
      setIsVerified(true);
    };

    // iOS WebKit Fullscreen listeners
    const onWebkitBegin = () => setIsFullscreen(true);
    const onWebkitEnd = () => setIsFullscreen(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('webkitbeginfullscreen', onWebkitBegin);
    video.addEventListener('webkitendfullscreen', onWebkitEnd);

    // Standard HTML5 Fullscreen listeners
    const onFullscreenChange = () => {
      const doc = document as any;
      const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      setIsFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('webkitbeginfullscreen', onWebkitBegin);
      video.removeEventListener('webkitendfullscreen', onWebkitEnd);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (video) {
      video.volume = val;
      video.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    const container = containerRef.current;

    // 1. Prioritize iOS Safari & Chrome (WebKit) native video fullscreen API
    const webkitVideo = video as any;
    if (webkitVideo && typeof webkitVideo.webkitEnterFullscreen === 'function') {
      try {
        if (webkitVideo.webkitDisplayingFullscreen) {
          if (typeof webkitVideo.webkitExitFullscreen === 'function') {
            webkitVideo.webkitExitFullscreen();
          }
          setIsFullscreen(false);
        } else {
          webkitVideo.webkitEnterFullscreen();
          setIsFullscreen(true);
        }
        return;
      } catch (err) {
        console.warn('WebKit fullscreen error:', err);
      }
    }

    // 2. Standard HTML5 Fullscreen API (Desktop & Android)
    const doc = document as any;
    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);

    if (!isFs) {
      if (container?.requestFullscreen) {
        container.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
      } else if ((container as any)?.webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  // Upstream embed URL for fallback tab (supports streamfree.top and strmfree.st)
  const embedSource = stream.sources.find(s => s.quality.toLowerCase() === selectedQuality.toLowerCase()) || stream.sources[0];
  const embedUrl = embedSource ? embedSource.url.replace('strmfree.st', 'streamfree.top') : `https://streamfree.top/embed/basketball/${stream.stream_key}1080p`;

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Top Header Bar above Video (Clean & Minimal) */}
      <div className="flex items-center justify-between px-1">
        {/* Stream Source Mode Switcher */}
        <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          <button
            onClick={() => setPlayerMode('direct')}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              playerMode === 'direct'
                ? 'bg-black text-white shadow-2xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Direct HLS
          </button>
          <button
            onClick={() => setPlayerMode('embed')}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              playerMode === 'embed'
                ? 'bg-black text-white shadow-2xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Live Embed
          </button>
        </div>

        {/* Live Status Pill */}
        {stream.is_live ? (
          <div className="flex items-center space-x-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse-live"></span>
            <span className="text-[11px] font-bold tracking-wider text-red-600 uppercase">LIVE</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
            <span className="text-[11px] font-bold tracking-wider text-gray-600 uppercase">SCHEDULED</span>
          </div>
        )}
      </div>

      {/* Main Video Viewport Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setShowControls(true)}
        className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl group select-none"
      >
        {playerMode === 'direct' ? (
          <>
            {/* The Direct HTML5 Video Element */}
            <video
              ref={videoRef}
              playsInline
              // @ts-ignore
              webkit-playsinline="true"
              x-webkit-airplay="allow"
              className="w-full h-full object-contain"
              onClick={togglePlay}
            />

            {/* Loading Buffering Indicator */}
            {isLoading && !hasError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs z-10 pointer-events-none">
                <div className="relative">
                  <div className="w-14 h-14 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                  <Radio className="w-6 h-6 text-orange-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <p className="mt-3 text-xs font-semibold tracking-wide text-orange-300/90 uppercase">
                  Resolving Direct Ad-Free HLS Stream...
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Connecting to live {selectedQuality} sports stream
                </p>
              </div>
            )}

            {/* Error or Unavailable Overlay */}
            {hasError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center z-20">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Playback Status Notice</h3>
                <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
                  {errorMessage || 'Direct stream temporarily unavailable or initializing broadcast.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      retryCountRef.current = 0;
                      loadHlsStream();
                    }}
                    className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Feed</span>
                  </button>
                  <button
                    onClick={() => onQualityChange(selectedQuality === '1080p' ? '540p' : '1080p')}
                    className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-orange-400" />
                    <span>Switch to {selectedQuality === '1080p' ? '540p' : '1080p'}</span>
                  </button>
                  <button
                    onClick={() => setPlayerMode('embed')}
                    className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Switch to Embed Feed</span>
                  </button>
                </div>
              </div>
            )}

            {/* Custom Modern Video Controls Overlay */}
            <div
              className={`absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/30 transition-opacity duration-300 pointer-events-none z-10 ${
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Top Bar: Title & Ad-Free Badge */}
              <div className="flex items-center justify-between pointer-events-auto">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white/90 drop-shadow-md truncate max-w-[240px] sm:max-w-md">
                    {stream.name}
                  </span>
                  <span className="hidden sm:inline-block bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    {stream.league}
                  </span>
                </div>

                {isVerified && (
                  <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-300">Verified Ad-Free Feed</span>
                  </div>
                )}
              </div>

              {/* Center Play/Pause Big Touch Button */}
              <div className="flex items-center justify-center pointer-events-auto">
                {!isLoading && (
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-orange-500/90 hover:bg-orange-500 text-white flex items-center justify-center shadow-xl shadow-orange-500/30 transition-transform active:scale-95 cursor-pointer"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Bottom Controls Bar */}
              <div className="flex items-center justify-between gap-3 pointer-events-auto bg-slate-950/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/5">
                {/* Left: Play/Pause, Mute & Volume */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={togglePlay}
                    className="text-white/90 hover:text-orange-400 transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>

                  <div className="flex items-center space-x-1.5 group/vol">
                    <button
                      onClick={toggleMute}
                      className="text-white/90 hover:text-orange-400 transition-colors cursor-pointer"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-red-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 accent-orange-500 bg-slate-700 rounded-lg cursor-pointer hidden sm:block"
                    />
                  </div>

                  {/* Live Sync Pill */}
                  <button
                    onClick={() => {
                      retryCountRef.current = 0;
                      loadHlsStream();
                    }}
                    className="flex items-center space-x-1 text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span>LIVE</span>
                  </button>
                </div>

                {/* Right: Quality Dropdown, PiP, Fullscreen */}
                <div className="flex items-center space-x-2 relative">
                  {/* Quality Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      className="flex items-center space-x-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-orange-400" />
                      <span>{selectedQuality}</span>
                    </button>

                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-32 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-30 flex flex-col space-y-0.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1">
                          Video Quality
                        </div>
                        {availableQualities.map((q) => (
                          <button
                            key={q}
                            onClick={() => {
                              onQualityChange(q);
                              setShowQualityMenu(false);
                            }}
                            className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                              selectedQuality === q
                                ? 'bg-orange-500/20 text-orange-400 font-bold'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span>{q}</span>
                            {selectedQuality === q && <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Picture in Picture */}
                  <button
                    onClick={togglePiP}
                    className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Picture in Picture"
                  >
                    <Layers className="w-4 h-4" />
                  </button>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Official Embed Feed with Transparency & Ad Disclosure */
          <div className="relative w-full h-full bg-slate-950 flex flex-col">
            <div className="bg-amber-950/40 border-b border-amber-500/20 px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-300">
              <span className="flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  Official third-party iframe embed from {embedUrl.includes('strmfree') ? 'StreamFree' : 'source'}.
                </span>
              </span>
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-amber-400 hover:underline shrink-0 ml-2 font-medium"
              >
                <span>Direct Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative flex-1 w-full h-full">
              <iframe
                src={embedUrl}
                title={stream.name}
                allow="fullscreen; picture-in-picture; autoplay; encrypted-media"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Under-player Quality Buttons */}
      <div className="flex items-center flex-wrap gap-2 px-1 text-xs text-gray-600">
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          <span className="font-bold text-gray-800 mr-1">Quality:</span>
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            {availableQualities.map((q) => (
              <button
                key={q}
                onClick={() => onQualityChange(q)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                  selectedQuality === q
                    ? 'bg-black text-white shadow-2xs'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
