import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RefreshCw, AlertCircle, ShieldCheck,
  Layers, Car, Zap
} from 'lucide-react';
import type { Stream } from '../types/stream.ts';
import { detectTeslaEnvironment, type TeslaDeviceInfo } from '../utils/teslaDetector.ts';
import { teslaAudioBeacon } from '../utils/teslaAudioBeacon.ts';

interface CourtsidePlayerProps {
  stream: Stream;
  selectedQuality: string;
  onQualityChange: (quality: string) => void;
}

// Dedicated 1080p NBA Highlights YouTube Player
const NbaYoutubePlayer: React.FC<{ videoId: string; title: string }> = ({ videoId, title }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Send postMessage commands to enforce 1080p playback quality
    const enforce1080p = () => {
      try {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'setPlaybackQuality', args: ['hd1080'] }),
            '*'
          );
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'setPlaybackQualityRange', args: ['hd1080'] }),
            '*'
          );
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'setSuggestedQuality', args: ['hd1080'] }),
            '*'
          );
        }
      } catch {
        // cross-origin safe
      }
    };

    const t1 = setTimeout(enforce1080p, 400);
    const t2 = setTimeout(enforce1080p, 1200);
    const t3 = setTimeout(enforce1080p, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [videoId]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border border-gray-200 select-none">
      <iframe
        ref={iframeRef}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1&vq=hd1080&hd=1&enablejsapi=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
        onLoad={() => {
          try {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'setPlaybackQuality', args: ['hd1080'] }),
              '*'
            );
          } catch {}
        }}
      />
      <div className="absolute top-3 left-3 pointer-events-none z-10 flex items-center space-x-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
        <span className="text-[11px] font-black text-white uppercase tracking-wider">
          Official NBA Highlights • 1080p HD
        </span>
      </div>
    </div>
  );
};

export const CourtsidePlayer: React.FC<CourtsidePlayerProps> = ({
  stream,
  selectedQuality,
  onQualityChange
}) => {
  if (stream.youtubeVideoId) {
    const isNfl = stream.league === 'NFL' || stream.category === 'football' || stream.name.toLowerCase().includes('nfl');

    if (isNfl) {
      const ytUrl = `https://www.youtube.com/watch?v=${stream.youtubeVideoId}`;
      const thumbUrl = `https://img.youtube.com/vi/${stream.youtubeVideoId}/maxresdefault.jpg`;

      return (
        <a
          href={ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative w-full aspect-video bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 select-none flex flex-col justify-between p-4 sm:p-6 group cursor-pointer"
        >
          {/* Background Video Poster with subtle dark overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src={thumbUrl}
              alt={stream.name}
              className="w-full h-full object-cover opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-500"
              onError={(e) => {
                (e.target as any).src = `https://img.youtube.com/vi/${stream.youtubeVideoId}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
          </div>

          {/* Top Header Badges */}
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="flex items-center space-x-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="text-[11px] font-black text-white uppercase tracking-wider">
                Official NFL Highlights
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-white/80 bg-black/60 px-2.5 py-1 rounded-full uppercase tracking-widest backdrop-blur-md border border-white/10">
              HD 60fps
            </span>
          </div>

          {/* Center Play Button Only */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            <div className="relative inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-600 group-hover:bg-red-500 text-white shadow-2xl transition-all duration-300 group-hover:scale-110 active:scale-95">
              <Play className="w-9 h-9 sm:w-10 sm:h-10 fill-current ml-1 text-white" />
              <span className="absolute -inset-1.5 rounded-full bg-red-600/40 animate-ping -z-10 pointer-events-none" />
            </div>
          </div>

          {/* Bottom Title Bar */}
          <div className="relative z-10">
            <h3 className="text-xs sm:text-sm font-black text-white line-clamp-1 drop-shadow-md">
              {stream.name}
            </h3>
          </div>
        </a>
      );
    }

    return <NbaYoutubePlayer videoId={stream.youtubeVideoId} title={stream.name} />;
  }

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef<number>(0);
  const watchdogTimerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      const autoSound = localStorage.getItem('bss_autoplay_sound') === 'true';
      return !autoSound; // If autoplay with sound is enabled, attempt unmuted (false)
    }
    return false;
  });
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<any>(null);

  // Tesla Infotainment & Reverse-Engineered CyberDash Architecture
  const [teslaInfo, setTeslaInfo] = useState<TeslaDeviceInfo | null>(null);
  const [isTeslaModeActive, setIsTeslaModeActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bss_tesla_mode');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });
  const [useCanvasRender, setUseCanvasRender] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasAnimFrameRef = useRef<number | null>(null);

  // Available qualities: 720p, 1080p, and 2160p (540p removed per user request)
  const availableQualities = React.useMemo(() => {
    const raw = stream.sources?.map((s) => s.quality) || [];
    const normalized = raw
      .map((q) => {
        const lower = q.toLowerCase();
        if (lower.includes('4k') || lower.includes('2160')) return '2160p';
        if (lower.includes('1080') || lower.includes('fhd')) return '1080p';
        if (lower.includes('720') || lower.includes('hd')) return '720p';
        return q;
      })
      .filter((q) => !q.includes('540') && (q === '720p' || q === '1080p' || q === '2160p'));
    const unique = Array.from(new Set(normalized));
    if (unique.length > 0) {
      const order = ['720p', '1080p', '2160p'];
      return order.filter((o) => unique.includes(o));
    }
    return ['720p', '1080p'];
  }, [stream.sources]);

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

    // Watchdog: If playback does not start within 14 seconds, try quality fallback or alert
    watchdogTimerRef.current = setTimeout(() => {
      if (video.paused && video.readyState === 0) {
        console.warn('Playback watchdog timeout fired for', stream.stream_key, selectedQuality);
        if (selectedQuality === '1080p' && availableQualities.includes('720p')) {
          console.log('Watchdog attempting quality fallback to 720p...');
          onQualityChange('720p');
        } else {
          setIsLoading(false);
          setHasError(true);
          setErrorMessage('Stream feed is connecting. Tap Retry Feed to reconnect.');
        }
      } else {
        setIsLoading(false);
      }
    }, 14000);

    // Destroy existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Load direct HLS stream via protected backend proxy route (dynamically routes NFL vs NBA)
    const token = localStorage.getItem('bigsuu_auth_token') || sessionStorage.getItem('bigsuu_auth_token') || '';
    const tokenParam = token ? `?t=${encodeURIComponent(token)}` : '';
    const sportPrefix = (stream.category === 'football' || stream.league === 'NFL') ? 'football' : 'basketball';
    const targetUrl = `/api/${sportPrefix}/hls/${stream.stream_key}/${selectedQuality}.m3u8${tokenParam}`;

    // 1. Check if Hls.js is supported
    if (Hls.isSupported()) {
      const ultraLow = typeof window !== 'undefined' && localStorage.getItem('bss_low_latency') === 'true';
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: ultraLow,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 15000,
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
        setIsVerified(true);
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

        video.play().then(() => {
          setIsPlaying(true);
          retryCountRef.current = 0;
        }).catch(() => {
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

            // Automatic Failover: If 1080p failed multiple times, switch to 720p
            if (selectedQuality === '1080p' && availableQualities.includes('720p')) {
              console.log('Auto-failover to 720p stream variant...');
              onQualityChange('720p');
              return;
            }

            setIsLoading(false);
            setHasError(true);
            setErrorMessage('Coverage is preparing or reconnecting. Retrying automatically...');
          }
        }
      });
    } 
    // 2. Native HLS support (Safari on iPhone / iPad / Mac)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = targetUrl;

      const markReady = () => {
        setIsLoading(false);
        setIsVerified(true);
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      };

      video.addEventListener('loadedmetadata', markReady, { once: true });
      video.addEventListener('loadeddata', markReady, { once: true });
      video.addEventListener('canplay', markReady, { once: true });
      video.addEventListener('playing', () => {
        markReady();
        setIsPlaying(true);
      });
      video.addEventListener('pause', () => setIsPlaying(false));

      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          markReady();
          setIsPlaying(false);
        });
      });

      video.addEventListener('error', () => {
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
        if (selectedQuality === '1080p' && availableQualities.includes('720p')) {
          onQualityChange('720p');
          return;
        }
        setHasError(true);
        setErrorMessage('Coverage is preparing or reconnecting. Retrying automatically...');
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

  // Auto-recovery: automatically retry connecting every 10 seconds during coverage preparation or interruptions
  useEffect(() => {
    if (!hasError) return;
    const autoRetryTimer = setTimeout(() => {
      console.log('[CourtsidePlayer] Auto-reconnecting to stream feed...');
      retryCountRef.current = 0;
      loadHlsStream();
    }, 10000);
    return () => clearTimeout(autoRetryTimer);
  }, [hasError, loadHlsStream]);

  // Tesla Infotainment Environment Detection
  useEffect(() => {
    const info = detectTeslaEnvironment();
    setTeslaInfo(info);
    if (info.isTesla && localStorage.getItem('bss_tesla_mode') === null) {
      setIsTeslaModeActive(true);
    }
  }, []);

  // Tesla Audio Keepalive Beacon: Prevents Chromium audio suspension during vehicle motion/transitions
  useEffect(() => {
    if (isTeslaModeActive) {
      teslaAudioBeacon.start();
    } else {
      teslaAudioBeacon.stop();
    }
    return () => {
      teslaAudioBeacon.stop();
    };
  }, [isTeslaModeActive]);

  // Canvas GPU Presentation Pipeline (Reverse-Engineered from CyberDash WebCodecs/Canvas Architecture)
  useEffect(() => {
    if (!useCanvasRender || !isPlaying) {
      if (canvasAnimFrameRef.current) cancelAnimationFrame(canvasAnimFrameRef.current);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;
    const renderFrame = () => {
      if (!active) return;
      if (video.readyState >= 2 && !video.paused && !video.ended) {
        if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      canvasAnimFrameRef.current = requestAnimationFrame(renderFrame);
    };
    renderFrame();
    return () => {
      active = false;
      if (canvasAnimFrameRef.current) cancelAnimationFrame(canvasAnimFrameRef.current);
    };
  }, [useCanvasRender, isPlaying]);

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
          autoPlay
          muted={isMuted}
          // @ts-ignore
          webkit-playsinline="true"
          x-webkit-airplay="allow"
          className={`w-full h-full object-contain cursor-pointer ${useCanvasRender ? 'hidden' : 'block'}`}
          onClick={togglePlay}
        />

        {/* Reverse-Engineered CyberDash Canvas GPU Presentation Pipeline */}
        {useCanvasRender && (
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
          />
        )}

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

              <div className="flex items-center space-x-1.5">
                {isTeslaModeActive && (
                  <div className="flex items-center space-x-1 bg-white/90 border border-blue-200 px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                    <Car className="w-3 h-3 text-blue-600" />
                    <span className="text-[10px] font-semibold text-blue-700">Tesla {teslaInfo?.mcuType === 'amd-ryzen' ? 'Ryzen' : 'Infotainment'}</span>
                  </div>
                )}
                {isVerified && (
                  <div className="flex items-center space-x-1 bg-white/90 border border-emerald-200 px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span className="text-[10px] font-semibold text-emerald-700">Verified</span>
                  </div>
                )}
              </div>
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

      {/* Under-player Quality & Infotainment Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 pt-0.5">
        <div className="flex items-center space-x-2">
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

        {/* Tesla In-Car Infotainment Mode Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => {
              const next = !isTeslaModeActive;
              setIsTeslaModeActive(next);
              if (typeof window !== 'undefined') {
                localStorage.setItem('bss_tesla_mode', String(next));
              }
            }}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer ${
              isTeslaModeActive
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                : 'bg-gray-100 text-gray-500 hover:text-gray-900 border-gray-200/60'
            }`}
            title="Tesla Infotainment & Audio Keepalive Beacon Mode"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Tesla Mode</span>
          </button>

          {isTeslaModeActive && (
            <button
              onClick={() => setUseCanvasRender(!useCanvasRender)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all border cursor-pointer ${
                useCanvasRender
                  ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-2xs'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-900 border-gray-200/60'
              }`}
              title="Toggle Canvas 2D/GPU presentation pipeline"
            >
              <Zap className="w-3 h-3" />
              <span>{useCanvasRender ? 'Canvas Active' : 'Enable Canvas'}</span>
            </button>
          )}
        </div>
      </div>

      {isTeslaModeActive && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-1.5 flex items-center space-x-2 text-[10px] text-blue-700">
          <Car className="w-3.5 h-3.5 shrink-0 text-blue-600" />
          <span>
            <strong>Tesla Infotainment Active</strong> ({teslaInfo?.mcuType === 'amd-ryzen' ? 'AMD Ryzen' : 'Chromium'}): Audio beacon keepalive active. Playback optimized for in-car touchscreen display.
          </span>
        </div>
      )}
    </div>
  );
};
