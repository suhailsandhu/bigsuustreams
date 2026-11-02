// Client-side analytics heartbeat sender for BigSuuStreams
// Includes Owner Exclusion (newvalorantpc@gmail.com), Device Fingerprint Tagging, and Retention Tracking

const EXCLUDED_EMAILS = ['newvalorantpc@gmail.com'];

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

export function trackPageView(streamKey?: string, gameName?: string) {
  currentStreamKey = streamKey;
  currentGameName = gameName;

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
  sendPing(false);
}

function sendPing(isInitial: boolean) {
  const user = getLoggedInUser();
  const userEmail = (user?.email || '').trim().toLowerCase();

  // OWNER EXCLUSION: If from admin / owner account (newvalorantpc@gmail.com), exclude completely from analytics
  if (EXCLUDED_EMAILS.includes(userEmail)) {
    return;
  }

  // Also check if admin authorized
  if (sessionStorage.getItem('bigsuu_admin_authorized') === 'true') {
    return;
  }

  const sessionId = getSessionId();
  const deviceId = getDeviceId();
  const visitCount = getVisitCount();
  const { category, tag } = detectDetailedDevice();
  const path = window.location.hash || '/';

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
      isInitial
    }),
    keepalive: true
  }).catch(() => {
    // silent fail
  });
}
