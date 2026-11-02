import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RefreshCw, AlertCircle, ShieldCheck,
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
  const [showControls, setShowControls] = useState(true);
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

    // Watchdog: If playback does not start within 10 seconds, try quality fallback or retry
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
          setErrorMessage('Direct HLS feed is buffering. Click Retry Feed to reconnect.');
        }
      }
    }, 10000);

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
        fragLoadingMaxRetry: 5,
        manifestLoadingMaxRetry: 5,
        levelLoadingMaxRetry: 5,
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
          if (retryCountRef.current < 4) {
            retryCountRef.current += 1;
            console.log(`Recovering from error (attempt ${retryCountRef.current}/4)...`);
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
            setErrorMessage('Direct HLS feed encountered a network obstacle. Click Retry Feed to reconnect.');
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
        setHasError(true);
        setErrorMessage('Native video playback encountered an error. Click Retry to reconnect.');
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

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Top Header Bar above Video (Clean & Minimal) */}
      <div className="flex items-center justify-end px-1">
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

      {/* Main Video Viewport Container (Light Themed) */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setShowControls(true)}
        className="relative w-full aspect-video bg-gray-950 rounded-2xl overflow-hidden border border-gray-200 shadow-md group select-none"
      >
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

        {/* Loading Buffering Indicator (Light Themed) */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/95 backdrop-blur-xs z-10 pointer-events-none">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
              <Radio className="w-6 h-6 text-gray-900 absolute inset-0 m-auto animate-pulse" />
            </div>
            <p className="mt-3 text-xs font-black tracking-wider text-gray-900 uppercase">
              Connecting to Live Feed...
            </p>
            <p className="text-[11px] font-medium text-gray-500 mt-1">
              Loading {selectedQuality} sports stream
            </p>
          </div>
        )}

        {/* Error or Unavailable Overlay (Light Themed) */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/95 p-6 text-center z-20">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Playback Status Notice</h3>
            <p className="text-xs text-gray-500 max-w-md mb-4 leading-relaxed">
              {errorMessage || 'Direct stream temporarily unavailable or initializing broadcast.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  retryCountRef.current = 0;
                  loadHlsStream();
                }}
                className="flex items-center space-x-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Feed</span>
              </button>
            </div>
          </div>
        )}

        {/* Custom Modern Video Controls Overlay (Light/Clean Themed) */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/40 via-transparent to-black/20 transition-opacity duration-300 pointer-events-none z-10 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Top Bar: Title & Ad-Free Badge */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center space-x-2 bg-white/95 border border-gray-200/80 px-2.5 py-1 rounded-lg backdrop-blur-md shadow-xs">
              <span className="text-xs font-bold text-gray-900 truncate max-w-[240px] sm:max-w-md">
                {stream.name}
              </span>
              <span className="hidden sm:inline-block bg-orange-100 text-orange-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                {stream.league}
              </span>
            </div>

            {isVerified && (
              <div className="flex items-center space-x-1.5 bg-white/95 border border-emerald-200 px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-700">Verified Feed</span>
              </div>
            )}
          </div>

          {/* Center Play/Pause Touch Button */}
          <div className="flex items-center justify-center pointer-events-auto">
            {!isLoading && (
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-white/95 hover:bg-white text-gray-900 flex items-center justify-center shadow-xl border border-gray-200 transition-transform active:scale-95 cursor-pointer"
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

          {/* Bottom Controls Bar (Light Themed) */}
          <div className="flex items-center justify-between gap-3 pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-gray-200 shadow-lg text-gray-800">
            {/* Left: Play/Pause, Mute & Volume */}
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePlay}
                className="text-gray-700 hover:text-black transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <div className="flex items-center space-x-1.5 group/vol">
                <button
                  onClick={toggleMute}
                  className="text-gray-700 hover:text-black transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-500" />
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
                  className="w-16 h-1 accent-black bg-gray-200 rounded-lg cursor-pointer hidden sm:block"
                />
              </div>

              {/* Live Sync Pill */}
              <button
                onClick={() => {
                  retryCountRef.current = 0;
                  loadHlsStream();
                }}
                className="flex items-center space-x-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100 transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                <span>LIVE</span>
              </button>
            </div>

            {/* Right: Picture-in-Picture & Fullscreen (Settings gear removed per request) */}
            <div className="flex items-center space-x-1">
              {/* Picture in Picture */}
              <button
                onClick={togglePiP}
                className="text-gray-600 hover:text-black p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="Picture in Picture"
              >
                <Layers className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-gray-600 hover:text-black p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
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
