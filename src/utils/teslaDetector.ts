/**
 * Tesla In-Car Infotainment & Browser Capability Detection Engine
 * Reverse-engineered from Tesla OS Chromium behavior and CyberDash telemetry.
 */

export interface TeslaDeviceInfo {
  isTesla: boolean;
  confidence: 'high' | 'medium' | 'none';
  mcuType: 'amd-ryzen' | 'intel-atom' | 'unknown';
  renderer: string;
  supportsWebCodecs: boolean;
  supportsVideoFrameCallback: boolean;
  supportsAudioWorklet: boolean;
  screenResolution: { width: number; height: number; dpr: number };
}

export function detectTeslaEnvironment(): TeslaDeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isTesla: false,
      confidence: 'none',
      mcuType: 'unknown',
      renderer: 'SSR',
      supportsWebCodecs: false,
      supportsVideoFrameCallback: false,
      supportsAudioWorklet: false,
      screenResolution: { width: 0, height: 0, dpr: 1 }
    };
  }

  const ua = navigator.userAgent || '';

  // 1. Explicit User-Agent Pattern (Official Tesla Browser)
  const isExplicitTesla = /Tesla|QtCarBrowser/i.test(ua);

  // 2. CyberDash Reverse-Engineered Heuristic:
  // Newer Tesla firmware (2024.x+) masks user agent to standard Linux Chrome
  // Signature: Linux + Chrome, but NOT Android, iOS, Windows, Mac, or ChromeOS
  const isLinux = /\bLinux\b/i.test(ua);
  const isAndroid = /\bAndroid\b/i.test(ua);
  const isChrome = /\bChrome\//i.test(ua) || /\bCriOS\//i.test(ua);
  const isCommonOS = /\b(iPhone|iPad|iPod|Windows|Macintosh|Mac OS X|CrOS)\b/i.test(ua);
  const isHeuristicTesla = isLinux && isChrome && !isAndroid && !isCommonOS;

  const isTesla = isExplicitTesla || isHeuristicTesla;
  const confidence: 'high' | 'medium' | 'none' = isExplicitTesla
    ? 'high'
    : isHeuristicTesla
    ? 'medium'
    : 'none';

  // 3. WebGL GPU Hardware Profiling (Detects AMD Ryzen MCU vs Intel Atom MCU)
  let renderer = 'Unknown';
  let mcuType: 'amd-ryzen' | 'intel-atom' | 'unknown' = 'unknown';

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbgExt) {
        renderer = gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL) || 'Unknown';
        const lowerRenderer = renderer.toLowerCase();
        if (lowerRenderer.includes('amd') || lowerRenderer.includes('radeon') || lowerRenderer.includes('navi')) {
          mcuType = 'amd-ryzen'; // Model 3/Y (2022+), Model S/X (2021+), Cybertruck
        } else if (lowerRenderer.includes('intel') || lowerRenderer.includes('hd graphics')) {
          mcuType = 'intel-atom'; // Legacy MCU2 (2018-2021)
        }
      }
    }
  } catch {
    // WebGL disabled or sandboxed
  }

  // 4. Modern Chromium Media API Support
  const supportsWebCodecs = typeof (window as any).VideoDecoder === 'function';
  const testVideo = document.createElement('video');
  const supportsVideoFrameCallback = typeof (testVideo as any).requestVideoFrameCallback === 'function';
  const supportsAudioWorklet = typeof window.AudioContext !== 'undefined' && typeof window.AudioWorklet !== 'undefined';

  return {
    isTesla,
    confidence,
    mcuType,
    renderer,
    supportsWebCodecs,
    supportsVideoFrameCallback,
    supportsAudioWorklet,
    screenResolution: {
      width: window.screen.width,
      height: window.screen.height,
      dpr: window.devicePixelRatio || 1
    }
  };
}
