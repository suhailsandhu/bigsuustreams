// Tesla In-Car Infotainment & Driving Optimization Utility
// Tailored for Tesla Model 3 / Model Y / Model S / Model X in-car Chromium browser
// Provides hardware detection, LTE buffering profile, and passenger fullscreen helpers.

export interface TeslaHlsConfig {
  enableWorker: boolean;
  lowLatencyMode: boolean;
  backBufferLength: number;
  maxBufferLength: number;
  maxMaxBufferLength: number;
  maxBufferSize: number;
  liveSyncDurationCount: number;
  liveMaxLatencyDurationCount: number;
  highBufferWatchdogPeriod: number;
  nudgeOffset: number;
  nudgeMaxRetry: number;
  fragLoadingTimeOut: number;
  manifestLoadingTimeOut: number;
  fragLoadingMaxRetry: number;
  manifestLoadingMaxRetry: number;
  fragLoadingRetryDelay: number;
  manifestLoadingRetryDelay: number;
  levelLoadingMaxRetry: number;
  capLevelToPlayerSize: boolean;
}

/**
 * Detects whether the current browser is running on a Tesla infotainment screen.
 * Covers both modern AMD Ryzen (MCU3) / Intel Atom (MCU2) Chromium and older QtCarBrowser (MCU1).
 */
export function isTeslaBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';

  // 1. Direct explicit Tesla token
  if (/Tesla|QtCarBrowser/i.test(ua)) {
    return true;
  }

  // 2. Embedded Linux Chromium heuristic (Tesla infotainment OS signature)
  const isLinux = /\bLinux\b/i.test(ua);
  const isChrome = /\bChrome\//i.test(ua) || /\bCriOS\//i.test(ua);
  const isExcluded = /\b(Android|iPhone|iPad|iPod|Windows|Macintosh|Mac OS X|CrOS)\b/i.test(ua);

  return isLinux && isChrome && !isExcluded;
}

/**
 * Checks if the screen matches a Tesla Model 3/Y landscape center console (typically 1920x1200 or 1920x1080).
 */
export function isTeslaScreen(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.screen.width;
  const h = window.screen.height;
  return w >= 1100 && h >= 650 && w > h;
}

/**
 * Checks if Tesla In-Motion Mode is active (either auto-detected or explicitly enabled by the user).
 */
export function isTeslaModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  const pref = localStorage.getItem('bss_tesla_mode');
  if (pref === 'true') return true;
  if (pref === 'false') return false;
  return isTeslaBrowser();
}

/**
 * Persists the user's Tesla Mode preference.
 */
export function setTeslaModePreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bss_tesla_mode', enabled ? 'true' : 'false');
}

/**
 * Low-latency, jitter-tolerant HLS configuration tuned for cellular LTE/5G driving in a moving vehicle.
 * Cellular handovers between cell towers produce packet loss and 2-4 second latency spikes;
 * this profile cushions the pipeline with a 35s buffer, 4-segment live sync, and generous retry budgets.
 */
export function getTeslaDrivingHlsConfig(): TeslaHlsConfig {
  return {
    enableWorker: true, // Tesla MCU2/MCU3 hardware handles Web Workers cleanly
    lowLatencyMode: false, // Standard HLS prevents buffer dry-out and aggressive speedup artifacts
    backBufferLength: 15, // Prune old segments to conserve MCU browser tab memory
    maxBufferLength: 35, // 35-second forward buffer cushion to ride out cellular dead spots/tunnels
    maxMaxBufferLength: 60, // Maximum cap
    maxBufferSize: 60 * 1024 * 1024, // 60 MB buffer memory allocation
    liveSyncDurationCount: 4, // 4 segments (~16s live edge cushion) prevents starving when tower changes
    liveMaxLatencyDurationCount: 12,
    highBufferWatchdogPeriod: 2, // Rapid buffer health evaluation (every 2s)
    nudgeOffset: 0.2,
    nudgeMaxRetry: 10,
    fragLoadingTimeOut: 20000, // 20s timeout for poor cellular signal
    manifestLoadingTimeOut: 15000,
    fragLoadingMaxRetry: 10, // 10 retries allows riding out temporary cellular blind spots
    manifestLoadingMaxRetry: 10,
    fragLoadingRetryDelay: 1000,
    manifestLoadingRetryDelay: 1000,
    levelLoadingMaxRetry: 8,
    capLevelToPlayerSize: true // Prevents loading 4K data waste on cellular
  };
}

/**
 * Attempts to acquire Screen Wake Lock to keep Tesla screen bright and awake while driving.
 */
export async function requestScreenWakeLock(): Promise<any> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      return await (navigator as any).wakeLock.request('screen');
    } catch {
      return null;
    }
  }
  return null;
}
