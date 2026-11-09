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
      lowLatencyMode: true, // Immediate start
      backBufferLength: 0, // Immediately free consumed chunks to preserve Tizen video RAM
      maxBufferLength: 10, // Lean buffer to prevent WiFi starvation and memory crashes
      maxMaxBufferLength: 18,
      maxBufferSize: 15 * 1024 * 1024, // 15 MB max memory
      liveSyncDurationCount: 2, // 2-segment cushion starts in ~1.5s instead of 15s
      liveMaxLatencyDurationCount: 8,
      nudgeOffset: 0.15,
      nudgeMaxRetry: 8,
      fragLoadingTimeOut: 12000,
      manifestLoadingTimeOut: 10000,
      fragLoadingMaxRetry: 6,
      manifestLoadingMaxRetry: 6
    };
  }

  // Standard Desktop / Mobile Configuration
  return {
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 10,
    maxBufferLength: 15,
    maxMaxBufferLength: 25,
    maxBufferSize: 30 * 1024 * 1024,
    liveSyncDurationCount: 2, // Fast live-edge startup
    liveMaxLatencyDurationCount: 6,
    nudgeOffset: 0.15,
    nudgeMaxRetry: 8,
    fragLoadingTimeOut: 12000,
    manifestLoadingTimeOut: 10000,
    fragLoadingMaxRetry: 6,
    manifestLoadingMaxRetry: 6
  };
}

// Ultra-fast starting HLS configuration specifically engineered for 4-Stream Multi-View
export function getMultiViewHlsConfig(isTv: boolean) {
  if (isTv) {
    return {
      enableWorker: false, // Samsung Tizen / webOS stability
      lowLatencyMode: true,
      backBufferLength: 0,
      maxBufferLength: 6, // Lean buffer for running 4 concurrent streams on TV chipsets
      maxMaxBufferLength: 10,
      maxBufferSize: 6 * 1024 * 1024, // 6MB per stream prevents TV browser crashes
      liveSyncDurationCount: 1, // Instant playback on 1st segment
      liveMaxLatencyDurationCount: 4,
      initialLiveManifestSize: 1, // Starts playing immediately on 1st manifest
      nudgeOffset: 0.1,
      nudgeMaxRetry: 5,
      fragLoadingTimeOut: 8000,
      manifestLoadingTimeOut: 6000,
      fragLoadingMaxRetry: 5,
      manifestLoadingMaxRetry: 5,
      startLevel: 0, // Starts on lowest bitrate in <400ms then smoothly upgrades
      capLevelToPlayerSize: true // Capping quality to tile size saves bandwidth & CPU
    };
  }

  return {
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 5,
    maxBufferLength: 8,
    maxMaxBufferLength: 12,
    maxBufferSize: 10 * 1024 * 1024,
    liveSyncDurationCount: 1, // Starts instantly in <1s
    liveMaxLatencyDurationCount: 5,
    initialLiveManifestSize: 1,
    nudgeOffset: 0.1,
    nudgeMaxRetry: 5,
    fragLoadingTimeOut: 10000,
    manifestLoadingTimeOut: 6000,
    fragLoadingMaxRetry: 5,
    manifestLoadingMaxRetry: 5,
    startLevel: 0,
    capLevelToPlayerSize: true
  };
}
