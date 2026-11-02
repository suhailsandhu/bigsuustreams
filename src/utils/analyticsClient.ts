// Client-side analytics heartbeat sender for BigSuuStreams

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('bigsuu_session_id');
    if (!id) {
      id = 's_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      sessionStorage.setItem('bigsuu_session_id', id);
    }
    return id;
  } catch {
    return 'fallback_' + Math.random().toString(36).substring(2, 8);
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Desktop';
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
  const sessionId = getSessionId();
  const device = detectDevice();
  const path = window.location.hash || '/';

  fetch('/api/analytics/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      device,
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
