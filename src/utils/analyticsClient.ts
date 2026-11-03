// Client-side analytics heartbeat sender for BSS
// Includes Owner Exclusion, Device Fingerprint Tagging, and Retention Tracking

function isOwnerOrAdmin(): boolean {
  try {
    if (sessionStorage.getItem('bigsuu_admin_authorized') === 'true') return true;
    if (localStorage.getItem('bigsuu_admin_bypass') === 'true') return true;
    const raw = localStorage.getItem('bigsuu_auth_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role === 'admin' || u.isAdmin || u.id === 'vip_2222' || u.username === 'admin') return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function getDeviceId(): string {
  try {
    let devId = localStorage.getItem('bigsuu_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('bigsuu_device_id', devId);
    }
    return devId;
  } catch {
    return 'dev_guest';
  }
}

function getVisitCount(): number {
  try {
    const raw = localStorage.getItem('bigsuu_visit_count');
    const count = parseInt(raw || '1', 10);
    return Math.max(1, count);
  } catch {
    return 1;
  }
}

function recordDeviceVisit() {
  try {
    const raw = localStorage.getItem('bigsuu_visit_count');
    const count = parseInt(raw || '0', 10) + 1;
    localStorage.setItem('bigsuu_visit_count', String(count));
  } catch {
    // ignore
  }
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('bigsuu_session_id');
    if (!id) {
      id = 's_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      sessionStorage.setItem('bigsuu_session_id', id);
      recordDeviceVisit();
    }
    return id;
  } catch {
    return 'fallback_' + Math.random().toString(36).substring(2, 8);
  }
}

function getLoggedInUser(): { email?: string; username?: string } | null {
  try {
    const raw = localStorage.getItem('bigsuu_auth_user');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function detectDetailedDevice(): { category: string; tag: string } {
  const ua = navigator.userAgent || '';
  if (/iPhone/.test(ua)) return { category: 'iPhone', tag: 'Apple iPhone (iOS)' };
  if (/iPad/.test(ua)) return { category: 'iPhone', tag: 'Apple iPad (iPadOS)' };
  if (/Android/.test(ua)) {
    const brand = /Samsung/i.test(ua) ? 'Samsung' : /Pixel/i.test(ua) ? 'Google Pixel' : 'Android';
    return { category: 'Android', tag: `${brand} Mobile` };
  }
  if (/Macintosh|Mac OS X/.test(ua)) return { category: 'Desktop', tag: 'Apple Mac (macOS)' };
  if (/Windows/.test(ua)) return { category: 'Desktop', tag: 'Windows PC (Desktop)' };
  if (/Linux/.test(ua)) return { category: 'Desktop', tag: 'Linux Desktop' };
  return { category: 'Other', tag: 'Web Client' };
}

let pingInterval: any = null;
let currentStreamKey: string | undefined = undefined;
let currentGameName: string | undefined = undefined;
const sessionStartTime = Date.now();

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
}

function getSessionDurationSeconds(): number {
  return Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
}

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, any>) => void;
    };
  }
}

export function getUmamiConfig(): { websiteId: string; host: string; isConnected: boolean } {
  try {
    const websiteId = localStorage.getItem('bss_umami_website_id') || localStorage.getItem('bigsuu_umami_id') || '';
    const host = localStorage.getItem('bss_umami_host') || 'https://cloud.umami.is/script.js';
    const isConnected = Boolean(websiteId && websiteId.trim().length > 0);
    return { websiteId, host, isConnected };
  } catch {
    return { websiteId: '', host: 'https://cloud.umami.is/script.js', isConnected: false };
  }
}

export function setUmamiConfig(websiteId: string, host?: string): boolean {
  try {
    const cleanId = websiteId.trim();
    const cleanHost = (host && host.trim()) ? host.trim() : 'https://cloud.umami.is/script.js';

    if (cleanId) {
      localStorage.setItem('bss_umami_website_id', cleanId);
      localStorage.setItem('bigsuu_umami_id', cleanId);
      localStorage.setItem('bss_umami_host', cleanHost);
    } else {
      localStorage.removeItem('bss_umami_website_id');
      localStorage.removeItem('bigsuu_umami_id');
      localStorage.removeItem('bss_umami_host');
    }

    // Hot-reload Umami script tag in DOM
    if (typeof document !== 'undefined') {
      const existing = document.querySelector('script[data-bss-umami="true"]');
      if (existing) {
        existing.remove();
      }
      if (cleanId) {
        const s = document.createElement('script');
        s.defer = true;
        s.src = cleanHost;
        s.setAttribute('data-website-id', cleanId);
        s.setAttribute('data-auto-track', 'true');
        s.setAttribute('data-bss-umami', 'true');
        s.onerror = () => {};
        document.head.appendChild(s);
      }
    }
    return true;
  } catch (err) {
    console.error('Failed to set Umami config:', err);
    return false;
  }
}

export function sendUmamiTestEvent(): boolean {
  try {
    if (typeof window !== 'undefined' && window.umami && typeof window.umami.track === 'function') {
      window.umami.track('admin_test_ping', {
        source: 'BigSuuStreams Admin Hub',
        timestamp: new Date().toISOString()
      });
      return true;
    }
  } catch {
    // fallback
  }
  return false;
}

export function trackUmamiEvent(eventName: string, eventData?: Record<string, any>) {
  try {
    if (typeof window !== 'undefined' && window.umami && typeof window.umami.track === 'function') {
      window.umami.track(eventName, eventData);
    }
  } catch {
    // Non-blocking telemetry
  }
}

export function trackStreamPlaybackStart(streamKey: string, gameName: string, sport: string, quality: string) {
  trackUmamiEvent('stream_playback_start', {
    streamKey,
    game: gameName,
    sport,
    quality,
    timestamp: new Date().toISOString()
  });
}

export function trackQualityChange(streamKey: string, newQuality: string) {
  trackUmamiEvent('quality_change', {
    streamKey,
    quality: newQuality
  });
}

export function trackPageView(streamKey?: string, gameName?: string) {
  currentStreamKey = streamKey;
  currentGameName = gameName;

  trackUmamiEvent('page_view', {
    path: window.location.pathname || '/',
    streamKey: streamKey || 'home',
    game: gameName || 'lobby'
  });

  sendPing(true);

  if (!pingInterval) {
    pingInterval = setInterval(() => {
      sendPing(false);
    }, 20000); // 20s heartbeat
  }
}

export function updateCurrentStream(streamKey?: string, gameName?: string) {
  currentStreamKey = streamKey;
  currentGameName = gameName;
  trackUmamiEvent('watch_stream', { streamKey, game: gameName });
  sendPing(false);
}

function sendPing(isInitial: boolean) {
  // OWNER EXCLUSION: If from admin / owner session, exclude completely from analytics
  if (isOwnerOrAdmin()) {
    return;
  }

  const user = getLoggedInUser();

  const sessionId = getSessionId();
  const deviceId = getDeviceId();
  const visitCount = getVisitCount();
  const { category, tag } = detectDetailedDevice();
  const path = window.location.hash || '/';
  const timezone = getTimezone();
  const sessionDuration = getSessionDurationSeconds();
  const quality = localStorage.getItem('bss_default_quality') || '1080p';

  fetch('/api/analytics/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      deviceId,
      visitCount,
      device: category,
      deviceTag: tag,
      userEmail: user?.email,
      username: user?.username,
      path,
      streamKey: currentStreamKey,
      gameName: currentGameName,
      timezone,
      sessionDuration,
      quality,
      isInitial
    }),
    keepalive: true
  }).catch(() => {
    // silent fail
  });
}
