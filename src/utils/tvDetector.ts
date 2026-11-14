// Samsung Smart TV (Tizen OS) and Smart TV Engine Optimizer
// Provides hardware-aware HLS configuration, Remote Control key mapping, and Tizen video pipeline fallbacks

export function isSamsungSmartTv(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /SMART-TV|Tizen|SamsungBrowser|SmartTV|Maple|Dolfin/i.test(ua) ||
    /Tizen\s*([0-9.]+)/i.test(ua) ||
    (typeof window !== 'undefined' && Boolean((window as any).tizen || (window as any).webapis))
  );
}

export function isSmartTv(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    isSamsungSmartTv() ||
    /Web0S|NetCast|LG Browser|AppleTV|BRAVIA|Hisense|Vizio|Android TV|CrKey|GoogleTV|AFTT|AFTM|FireTV|Roku|Espial|Vewd|Opera TV|HbbTV/i.test(ua) ||
    /TV/i.test(ua)
  );
}

// Samsung TV Remote Control (Tizen Standard) KeyCodes
export const TV_KEYS = {
  ENTER: 13,
  RETURN: 10009, // Tizen Physical 'Return / Back' button
  BACKSPACE: 8,
  ESCAPE: 27,
  SPACE: 32,
  PLAY: 415, // Remote MediaPlay button
  PAUSE: 19, // Remote MediaPause button
  PLAY_PAUSE: 10252, // Remote MediaPlayPause toggle button
  STOP: 413, // Remote MediaStop button
  FAST_FORWARD: 417,
  REWIND: 412,
  MUTE: 449,
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39
} as const;

export interface TvHlsConfig {
  enableWorker: boolean;
  lowLatencyMode: boolean;
  backBufferLength: number;
  maxBufferLength: number;
  maxMaxBufferLength: number;
  maxBufferSize: number;
  liveSyncDurationCount: number;
  liveMaxLatencyDurationCount: number;
  nudgeOffset: number;
  nudgeMaxRetry: number;
  fragLoadingTimeOut: number;
  manifestLoadingTimeOut: number;
  fragLoadingMaxRetry: number;
  manifestLoadingMaxRetry: number;
}

// Low-latency, jitter-tolerant HLS engine configuration for Smart TVs and Desktop
export function getTvHlsConfig(isTv: boolean): TvHlsConfig {
  if (isTv) {
    return {
      enableWorker: false, // CRITICAL: Samsung Tizen browser worker transfer crashes MediaSource
      lowLatencyMode: false, // Standard HLS (4s chunks): false prevents buffer-draining playback speedups
      backBufferLength: 5,
      maxBufferLength: 20, // 20s forward buffer (~5 chunks) gives TV decoders breathing room
      maxMaxBufferLength: 30,
      maxBufferSize: 20 * 1024 * 1024, // 20 MB max memory
      liveSyncDurationCount: 3, // 3-segment cushion (~12s) prevents live-edge starvation
      liveMaxLatencyDurationCount: 8,
      nudgeOffset: 0.2,
      nudgeMaxRetry: 10,
      fragLoadingTimeOut: 15000,
      manifestLoadingTimeOut: 12000,
      fragLoadingMaxRetry: 6,
      manifestLoadingMaxRetry: 6
    };
  }

  // Standard Desktop / Mobile Configuration
  return {
    enableWorker: true,
    lowLatencyMode: false, // Standard HLS: false prevents aggressive playback speedups that drain buffer
    backBufferLength: 15,
    maxBufferLength: 30, // 30s forward buffer allows smooth, jitter-free playback
    maxMaxBufferLength: 60,
    maxBufferSize: 60 * 1024 * 1024,
    liveSyncDurationCount: 3, // 3-segment cushion (~12s) eliminates live edge buffer dry-out
    liveMaxLatencyDurationCount: 10,
    nudgeOffset: 0.2,
    nudgeMaxRetry: 10,
    fragLoadingTimeOut: 15000,
    manifestLoadingTimeOut: 12000,
    fragLoadingMaxRetry: 6,
    manifestLoadingMaxRetry: 6
  };
}

// Ultra-fast starting HLS configuration specifically engineered for 4-Stream Multi-View
export function getMultiViewHlsConfig(isTv: boolean) {
  if (isTv) {
    return {
      enableWorker: false, // Samsung Tizen / webOS stability
      lowLatencyMode: false,
      backBufferLength: 0,
      maxBufferLength: 10, // Lean buffer for running 4 concurrent streams on TV chipsets
      maxMaxBufferLength: 16,
      maxBufferSize: 8 * 1024 * 1024, // 8MB per stream prevents TV browser crashes
      liveSyncDurationCount: 2, // 2-segment cushion for multi-view
      liveMaxLatencyDurationCount: 6,
      initialLiveManifestSize: 1, // Starts playing immediately on 1st manifest
      nudgeOffset: 0.2,
      nudgeMaxRetry: 8,
      fragLoadingTimeOut: 12000,
      manifestLoadingTimeOut: 8000,
      fragLoadingMaxRetry: 5,
      manifestLoadingMaxRetry: 5,
      startLevel: -1, // Auto level selection
      capLevelToPlayerSize: true
    };
  }

  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 5,
    maxBufferLength: 15,
    maxMaxBufferLength: 25,
    maxBufferSize: 20 * 1024 * 1024,
    liveSyncDurationCount: 2,
    liveMaxLatencyDurationCount: 8,
    initialLiveManifestSize: 1,
    nudgeOffset: 0.2,
    nudgeMaxRetry: 8,
    fragLoadingTimeOut: 12000,
    manifestLoadingTimeOut: 10000,
    fragLoadingMaxRetry: 6,
    manifestLoadingMaxRetry: 6,
    startLevel: -1,
    capLevelToPlayerSize: true
  };
}

// Export Tesla in-car browser detection and driving profile
export * from './teslaDetector';
