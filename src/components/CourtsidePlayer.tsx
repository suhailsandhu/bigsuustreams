import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RefreshCw, AlertCircle, ShieldCheck,
  Layers
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
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<any>(null);

  // Available qualities in requested order: 540p, 720p, 1080p, 2160p
  const availableQualities = ['540p', '720p', '1080p', '2160p'];

  // Autohide controls on inactivity
  const handleMouseMove = () => {
    if (isLoading) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const loadHlsStream = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setIsVerified(false);
    setShowControls(false);

    // Clear watchdog timer
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

    // Watchdog: If playback does not start within 12 seconds, try quality fallback or alert
    watchdogTimerRef.current = setTimeout(() => {
      if (video.paused && video.readyState < 2) {
        console.warn('Playback watchdog timeout fired for', stream.stream_key, selectedQuality);
        if (selectedQuality === '1080p') {
          console.log('Watchdog attempting quality fallback to 720p...');
          onQualityChange('720p');
        } else if (selectedQuality === '720p') {
          console.log('Watchdog attempting quality fallback to 540p...');
          onQualityChange('540p');
        } else {
          setIsLoading(false);
          setHasError(true);
          setErrorMessage('Stream feed is connecting. Tap Retry Feed to reconnect.');
        }
      }
    }, 12000);

    // Destroy existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Load direct HLS stream via backend proxy route
    const targetUrl = `/api/basketball/hls/${stream.stream_key}/${selectedQuality}.m3u8`;

    // 1. Check if Hls.js is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        fragLoadingMaxRetry: 5,
        manifestLoadingMaxRetry: 5,
        levelLoadingMaxRetry: 5,
      });

      hlsRef.current = hls;
      hls.loadSource(targetUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setIsVerified(true);
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

        video.play().then(() => {
          setIsPlaying(true);
          retryCountRef.current = 0;
        }).catch(() => {
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
          if (retryCountRef.current < 4) {
            retryCountRef.current += 1;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            }
          } else {
            if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            hls.destroy();
            setIsLoading(false);
            setHasError(true);
            setErrorMessage('Network connection lost. Tap Retry Feed to reconnect.');
          }
        }
      });
    } 
    // 2. Native HLS support (Safari on iPhone / iPad / Mac)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = targetUrl;
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
        setHasError(true);
        setErrorMessage('Playback encountered an error. Tap Retry to reconnect.');
        setIsLoading(false);
      });
    } else {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      setHasError(true);
      setErrorMessage('Your browser does not support HLS video playback.');
      setIsLoading(false);
    }
  }, [onQualityChange, selectedQuality, stream.stream_key]);

  useEffect(() => {
    loadHlsStream();
    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [loadHlsStream]);

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

    const onWebkitBegin = () => setIsFullscreen(true);
    const onWebkitEnd = () => setIsFullscreen(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('webkitbeginfullscreen', onWebkitBegin);
    video.addEventListener('webkitendfullscreen', onWebkitEnd);

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

  return (
    <div className="w-full flex flex-col space-y-2.5">
      {/* Top Header Status */}
      <div className="flex items-center justify-end px-0.5">
        {stream.is_live ? (
          <div className="flex items-center space-x-1.5 bg-red-50 border border-red-200/80 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
            <span className="text-[10px] font-semibold tracking-wider text-red-600 uppercase">LIVE</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
            <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">SCHEDULED</span>
          </div>
        )}
      </div>

      {/* Main Video Viewport (Light/Clean Styled Container) */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchStart={() => {
          if (!isLoading) setShowControls(true);
        }}
        className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-gray-200 shadow-sm group select-none"
      >
        {/* Direct HTML5 Video Element */}
        <video
          ref={videoRef}
          playsInline
          // @ts-ignore
          webkit-playsinline="true"
          x-webkit-airplay="allow"
          className="w-full h-full object-contain"
          onClick={togglePlay}
        />

        {/* Loading Indicator (Clean, Lightweight, Centered - No Overlapping Controls) */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/95 z-20 pointer-events-none p-4">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
            <p className="mt-3 text-xs font-semibold text-gray-800">
              Loading Live Feed...
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 font-normal">
              {selectedQuality} HD
            </p>
          </div>
        )}

        {/* Error Notice */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 p-4 text-center z-30">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Stream Connecting</h3>
            <p className="text-xs text-gray-500 max-w-xs mb-3 leading-relaxed">
              {errorMessage || 'Direct stream temporarily initializing.'}
            </p>
            <button
              onClick={() => {
                retryCountRef.current = 0;
                loadHlsStream();
              }}
              className="flex items-center space-x-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-full transition cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Feed</span>
            </button>
          </div>
        )}

        {/* Controls Overlay: Only shown when video is ready & user hovers/taps */}
        {!isLoading && !hasError && (
          <div
            className={`absolute inset-0 flex flex-col justify-between p-3 sm:p-4 bg-gradient-to-t from-black/50 via-transparent to-black/20 transition-opacity duration-200 pointer-events-none z-10 ${
              showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Top Bar: Compact title badge */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center space-x-1.5 bg-white/90 border border-gray-200 px-2 py-0.5 rounded-lg shadow-xs backdrop-blur-xs max-w-[70%]">
                <span className="text-[11px] font-semibold text-gray-900 truncate">
                  {stream.name}
                </span>
              </div>

              {isVerified && (
                <div className="flex items-center space-x-1 bg-white/90 border border-emerald-200 px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] font-semibold text-emerald-700">Verified</span>
                </div>
              )}
            </div>

            {/* Center Play/Pause Touch Button */}
            <div className="flex items-center justify-center pointer-events-auto">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-white/90 hover:bg-white text-gray-900 flex items-center justify-center shadow-lg border border-gray-200 transition-transform active:scale-90 cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between gap-2 pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 shadow-md text-gray-800">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={togglePlay}
                  className="text-gray-700 hover:text-black transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>

                <div className="flex items-center space-x-1.5 group/vol">
                  <button
                    onClick={toggleMute}
                    className="text-gray-700 hover:text-black transition-colors cursor-pointer"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-14 h-1 accent-black bg-gray-200 rounded-lg cursor-pointer hidden sm:block"
                  />
                </div>

                {/* Live Indicator */}
                <button
                  onClick={() => {
                    retryCountRef.current = 0;
                    loadHlsStream();
                  }}
                  className="flex items-center space-x-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded transition cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                  <span>LIVE</span>
                </button>
              </div>

              {/* Right: PiP & Fullscreen */}
              <div className="flex items-center space-x-0.5">
                <button
                  onClick={togglePiP}
                  className="text-gray-600 hover:text-black p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  title="Picture in Picture"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="text-gray-600 hover:text-black p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Under-player Quality Switcher (Apple-style Segmented Control) */}
      <div className="flex items-center space-x-2 px-0.5 pt-0.5">
        <span className="text-[11px] font-medium text-gray-500">Quality:</span>
        <div className="inline-flex bg-gray-100 p-0.5 rounded-lg space-x-0.5 border border-gray-200/60">
          {availableQualities.map((q) => (
            <button
              key={q}
              onClick={() => onQualityChange(q)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                selectedQuality === q
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
