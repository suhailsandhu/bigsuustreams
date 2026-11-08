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
      lowLatencyMode: false, // Stable segment buffering eliminates stutter and audio/video desync
      backBufferLength: 0, // Immediately free consumed chunks to preserve Tizen video RAM
      maxBufferLength: 20, // Generous 20s forward buffer prevents WiFi starvation lag
      maxMaxBufferLength: 35,
      maxBufferSize: 35 * 1024 * 1024, // 35 MB max memory
      liveSyncDurationCount: 5, // 5-segment cushion eliminates live-edge buffering loops
      liveMaxLatencyDurationCount: 14,
      nudgeOffset: 0.2, // Smoothly bypasses MPEG-TS timestamp jitter
      nudgeMaxRetry: 10,
      fragLoadingTimeOut: 20000,
      manifestLoadingTimeOut: 15000,
      fragLoadingMaxRetry: 8,
      manifestLoadingMaxRetry: 8
    };
  }

  // Standard Desktop / Mobile Configuration
  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 20,
    maxBufferLength: 30, // 30s forward buffer
    maxMaxBufferLength: 60,
    maxBufferSize: 60 * 1024 * 1024,
    liveSyncDurationCount: 4, // 4-segment cushion for smooth 60fps playback without lag
    liveMaxLatencyDurationCount: 12,
    nudgeOffset: 0.15,
    nudgeMaxRetry: 8,
    fragLoadingTimeOut: 20000,
    manifestLoadingTimeOut: 15000,
    fragLoadingMaxRetry: 8,
    manifestLoadingMaxRetry: 8
  };
}
