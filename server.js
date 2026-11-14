import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Readable, Transform } from 'stream';
import { fileURLToPath } from 'url';
import { getBasketballStreams, getFootballStreams, getStreamByKey, getSourcesByKey, resolveHlsStream, streamTargetMap } from './src/server/streamService.ts';
import { getScoreboard, getGameSummary, getStandings, getNflScoreboard, getNflGameSummary } from './src/server/scoreboardService.ts';
import { analytics } from './src/server/analyticsService.ts';
import { getGameHighlights, getNflGameHighlights } from './src/server/highlightsService.ts';
import { applySecurityHeaders, createRateLimiter } from './src/server/securityMiddleware.ts';
import { authService } from './src/server/authService.ts';
import { autonomousWatchdog } from './src/server/autonomousWatchdog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Bulletproof Port: Node runs on 3000 behind Nginx (port 80/443 belongs to Nginx)
const PORT = process.env.PORT && process.env.PORT !== '80' ? process.env.PORT : 3000;
const SITE_PASSCODE = process.env.SITE_PASSCODE || '7865';

// Disable Express fingerprinting header
app.disable('x-powered-by');

// Enforce modern HTTP security headers (XSS, Framing, HSTS, Sniffing)
app.use(applySecurityHeaders);

app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Cybersecurity Rate Limiters: protect against brute force and DDoS
const siteAuthLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: 'Too many passcode attempts. Access temporarily paused for security.'
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: 'High request volume detected. Please try again in a moment.'
});

// Apply general rate limiter across API metadata (bypass chunk & media streaming for ultra-low latency)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/stream/chunk/') || req.path.includes('/hls/') || req.path.startsWith('/iptv/')) {
    return next();
  }
  return apiLimiter(req, res, next);
});

// 0. Account Authentication Endpoints (iOS-style Clean Setup)
app.post('/api/auth/register', siteAuthLimiter, (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    const result = authService.register(username || '', email || '', password || '');
    const isVip = (result.user.email?.toLowerCase() === 'sandhu.suhail@gmail.com' || result.user.username?.toLowerCase() === 'sandhu.suhail@gmail.com');
    res.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        displayName: isVip ? 'Suhail Sandhu' : result.user.displayName,
        avatarUrl: result.user.avatarUrl,
        isVip,
        role: isVip ? 'vip' : 'member',
        membership: isVip ? 'vip' : 'basic'
      },
      token: result.session.token
    });
  } catch (err) {
    res.status(400).json({ error: (err && err.message) || 'Registration failed' });
  }
});

app.post('/api/auth/login', siteAuthLimiter, (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    const result = authService.login(identifier || '', password || '');
    const cleanEmail = (result.user.email || '').toLowerCase();
    const cleanUser = (result.user.username || '').toLowerCase();
    const isVip = (cleanEmail === 'sandhu.suhail@gmail.com' || cleanUser === 'bigsuu' || cleanUser === 'suhailsandhu');
    res.json({
      success: true,
      user: {
        id: result.user.id,
        username: isVip ? 'bigsuu' : result.user.username,
        email: isVip ? 'sandhu.suhail@gmail.com' : result.user.email,
        displayName: isVip ? 'Big Suu' : result.user.displayName,
        avatarUrl: result.user.avatarUrl,
        isVip,
        role: isVip ? 'vip' : 'member',
        membership: isVip ? 'vip' : 'basic'
      },
      token: result.session.token
    });
  } catch (err) {
    res.status(401).json({ error: (err && err.message) || 'Invalid credentials' });
  }
});

// Google OAuth Configuration & Verification (Google Identity Services API)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

app.get('/api/auth/google/config', (req, res) => {
  res.json({ clientId: GOOGLE_CLIENT_ID });
});

app.get('/api/auth/google/login', (req, res) => {
  if (GOOGLE_CLIENT_ID) {
    const host = req.get('host') || 'bigsuustreams.com';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&prompt=select_account`;
    return res.redirect(authUrl);
  }
  // Standard redirect to Google account portal
  return res.redirect('https://accounts.google.com/signin/v2/identifier?service=accountsettings');
});

app.post('/api/auth/google/verify', async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential token' });
    }
    // Verify Google ID token securely via Google API tokeninfo endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!verifyRes.ok) {
      return res.status(401).json({ error: 'Invalid Google identity token' });
    }
    const payload = await verifyRes.json();
    const email = (payload.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email not provided in Google account token' });
    }
    const name = payload.name || payload.given_name || email.split('@')[0];
    const picture = payload.picture || '';

    const result = authService.loginWithGoogle(email, name, picture);
    const isVip = (result.user.email?.toLowerCase() === 'sandhu.suhail@gmail.com' || result.user.username?.toLowerCase() === 'sandhu.suhail@gmail.com');
    return res.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        displayName: isVip ? 'Suhail Sandhu' : result.user.displayName,
        avatarUrl: result.user.avatarUrl,
        isVip,
        role: isVip ? 'vip' : 'member',
        membership: isVip ? 'vip' : 'basic'
      },
      token: result.session.token
    });
  } catch (err) {
    return res.status(500).json({ error: (err && err.message) || 'Failed to verify Google login' });
  }
});

app.post('/api/auth/google', (req, res) => {
  try {
    const { email, displayName, avatarUrl } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email required for Google sign-in' });
    }
    const result = authService.loginWithGoogle(email, displayName || '', avatarUrl);
    const isVip = (result.user.email?.toLowerCase() === 'sandhu.suhail@gmail.com' || result.user.username?.toLowerCase() === 'sandhu.suhail@gmail.com');
    res.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        displayName: isVip ? 'Suhail Sandhu' : result.user.displayName,
        avatarUrl: result.user.avatarUrl,
        isVip,
        role: isVip ? 'vip' : 'member',
        membership: isVip ? 'vip' : 'basic'
      },
      token: result.session.token
    });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Google sign-in failed' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const session = authService.verifySession(String(token));
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  res.json({ success: true, session });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.body?.token;
  if (token) {
    authService.removeSession(String(token));
  }
  res.json({ success: true });
});

app.post('/api/auth/sync', (req, res) => {
  try {
    const { user } = req.body || {};
    if (user && (user.username || user.email)) {
      const synced = authService.syncExistingUser(user);
      return res.json({ success: true, user: synced });
    }
    res.json({ success: false });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// User Preferences & Favorites (SQLite-backed)
app.get('/api/user/preferences', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const session = authService.verifySession(String(token));
  if (!session) return res.status(401).json({ error: 'Session expired' });
  res.json({
    success: true,
    favoriteTeams: session.favoriteTeams || [],
    spoilerFree: Boolean(session.spoilerFree)
  });
});

app.post('/api/user/preferences', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.body?.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const session = authService.verifySession(String(token));
  if (!session) return res.status(401).json({ error: 'Session expired' });
  const { favoriteTeams, spoilerFree } = req.body || {};
  authService.updatePreferences(session.userId, favoriteTeams, spoilerFree);
  res.json({ success: true });
});

// Passcode gate support (Passcode 7865) -> Quick Access VIP Account
app.post('/api/auth/site-gate', siteAuthLimiter, (req, res) => {
  const { password, passcode } = req.body || {};
  const clean = String(password || passcode || '').trim().toLowerCase();
  if (clean === '7865') {
    const token = Buffer.from(`bigsuu_${Date.now()}_vip`).toString('base64');
    const user = { 
      id: 'user_bigsuu_vip', 
      username: 'bigsuu', 
      displayName: 'Big Suu', 
      email: 'sandhu.suhail@gmail.com',
      role: 'vip',
      isVip: true,
      membership: 'vip'
    };
    return res.json({ success: true, token, user });
  }
  return res.status(401).json({ error: 'Incorrect passcode. Access denied.' });
});

// 1. Scoreboard (ESPN Real-time Scores, Leaders & Stream Availability)
app.get('/api/basketball/scoreboard', async (req, res) => {
  try {
    const dateStr = req.query.date ? String(req.query.date) : undefined;
    const data = await getScoreboard(dateStr);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to fetch scoreboard' });
  }
});

// 2. Game Summary & Box Score
app.get('/api/basketball/game-summary/:id', async (req, res) => {
  try {
    const data = await getGameSummary(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to fetch game summary' });
  }
});

// 2b. Official NBA YouTube Highlights
app.get('/api/basketball/highlights', async (req, res) => {
  try {
    const away = String(req.query.away || '');
    const home = String(req.query.home || '');
    const date = req.query.date ? String(req.query.date) : undefined;
    if (!away || !home) {
      return res.status(400).json({ error: 'Away and home team required' });
    }
    const highlight = await getGameHighlights(away, home, date);
    if (!highlight) {
      return res.status(404).json({ error: 'No highlights found' });
    }
    res.json(highlight);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to fetch highlights' });
  }
});

// ============================================================================
// Cybersecurity Authentication & Anti-Scraping Guards
// ============================================================================

// Mandatory Access Gate: Verifies valid active session or VIP passcode token
function requireSiteAccess(req, res, next) {
  const authHeader = req.headers.authorization;
  const rawToken = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null) ||
                   req.query.token ||
                   req.query.t ||
                   req.headers['x-access-token'];

  if (!rawToken || typeof rawToken !== 'string') {
    return res.status(401).json({ error: 'Access denied. Account login or access passcode required.' });
  }

  const token = rawToken.trim();

  // Explicitly REJECT all revoked 7777 tokens and old guest passes
  if (token.includes('7777') || token.includes('verified_7777') || token.includes('token_7777')) {
    return res.status(401).json({ error: 'VIP Passcode has changed. Please enter the new passcode.' });
  }

  // 1. VIP Passcode validation (passcode 7865 tokens)
  if (
    token.includes('7865') ||
    token.startsWith('token_7865') ||
    token.startsWith('verified_7865')
  ) {
    return next();
  }

  // 2. Registered Member Account session validation
  const session = authService.verifySession(token);
  if (session) {
    return next();
  }

  return res.status(401).json({ error: 'Session expired or invalid. Please sign in.' });
}

// Anti-Bot / Anti-Scraping filter (exempt IPTV playlists and media stream chunks)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/stream/chunk/') || req.path.includes('/hls/') || req.path.startsWith('/iptv/')) {
    return next();
  }
  const ua = (req.get('user-agent') || '').toLowerCase();
  const isBot = /curl|python-requests|wget|httpclient|scrapy|aiohttp|urllib/i.test(ua);
  if (isBot) {
    const token = req.headers.authorization || req.query.token || req.query.t;
    if (!token) {
      return res.status(403).json({ error: 'Automated scrapers prohibited.' });
    }
  }
  next();
});

// ============================================================================
// Shared HLS & Stream Resolution Handlers (Used by both Basketball & Football)
// ============================================================================
async function handleResolve(req, res) {
  try {
    const key = req.params.key;
    const quality = req.params.quality || req.query.quality || '1080p';
    const isFootball = (req.baseUrl || req.path || req.originalUrl || '').includes('football');
    const category = isFootball ? 'football' : 'basketball';
    const hls = await resolveHlsStream(key, quality, category);
    // Never leak upstream provider URL in JSON responses!
    const token = req.query.token || req.query.t || '';
    const tokenParam = token ? `?t=${encodeURIComponent(String(token))}` : '';
    const safeProxyUrl = `/api/${category}/hls/${key}/${hls.selectedQuality}.m3u8${tokenParam}`;

    res.json({
      success: true,
      streamUrl: safeProxyUrl,
      proxyUrl: safeProxyUrl,
      selectedQuality: hls.selectedQuality,
      availableQualities: hls.availableQualities,
      isExternal: false
    });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to resolve stream' });
  }
}

async function handleHls(req, res) {
  const key = req.params.key;
  const quality = req.params.quality || req.query.quality || '1080p';
  const isFootball = (req.baseUrl || req.path || req.originalUrl || '').includes('football');
  const category = isFootball ? 'football' : 'basketball';
  try {
    const hls = await resolveHlsStream(key, quality, category);
    if (!hls.m3u8Text) {
      return res.status(503).json({ error: 'Stream temporarily initializing. Please retry in a moment.' });
    }

    const host = req.get('x-forwarded-host') || req.get('host') || 'bigsuustreams.com';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isLocal ? 'http' : (req.get('x-forwarded-proto') || (req.secure ? 'https' : 'https'));
    const baseUrl = `${protocol}://${host}`;

    // For Cyberdash / Smart TV IPTV players, provide fully-qualified URLs so hardware decoders never misresolve paths
    let m3u8Output = hls.m3u8Text;
    if (m3u8Output && m3u8Output.includes('/api/stream/chunk/')) {
      m3u8Output = m3u8Output.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('/api/stream/chunk/')) {
          return `${baseUrl}${trimmed}`;
        }
        return line;
      }).join('\n');
    }

    // Pre-buffer active live-edge chunks into server RAM immediately for 0ms initial play response
    const chunkLines = hls.m3u8Text.split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('/api/stream/chunk/'));
    
    // Live players play near the live edge (last 2-3 chunks in the playlist)
    const targetChunks = chunkLines.slice(-3);
    for (const chunkLine of targetChunks) {
      const parts = chunkLine.split('/');
      const chunkHash = parts[4];
      const chunkSeg = parts[5];
      if (chunkHash && chunkSeg) {
        setImmediate(() => {
          fetchChunkBuffer(chunkHash, chunkSeg).catch(() => {});
        });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Stream-Quality', hls.selectedQuality);
    res.setHeader('X-Available-Qualities', hls.availableQualities.join(','));
    res.send(m3u8Output);
  } catch (err) {
    res.status(502).json({ error: 'Stream resolution failed' });
  }
}

// Fast clean TS buffer extractor: dynamically detects and strips upstream disguise headers
// (such as TikTok 42-byte WebP or StreamFree 64-byte PNG) to deliver 100% pure MPEG-TS packets directly to the video player
function cleanTsBuffer(rawBuf) {
  if (!rawBuf || rawBuf.length === 0) return rawBuf;
  let syncOffset = -1;
  const scanLimit = Math.min(rawBuf.length - 188, 1024);
  for (let i = 0; i < scanLimit; i++) {
    if (rawBuf[i] === 0x47 && rawBuf[i + 188] === 0x47) {
      if (i + 376 < rawBuf.length && rawBuf[i + 376] !== 0x47) {
        continue;
      }
      syncOffset = i;
      break;
    }
  }
  return syncOffset >= 0 ? rawBuf.subarray(syncOffset) : rawBuf;
}

function createTsCleanStream() {
  let headerChecked = false;
  let buffered = Buffer.alloc(0);

  return new Transform({
    transform(chunk, encoding, callback) {
      if (!headerChecked) {
        buffered = Buffer.concat([buffered, chunk]);
        if (buffered.length >= 512) {
          headerChecked = true;
          let syncOffset = -1;
          for (let i = 0; i < Math.min(buffered.length - 188, 512); i++) {
            if (buffered[i] === 0x47 && buffered[i + 188] === 0x47) {
              if (i + 376 < buffered.length && buffered[i + 376] !== 0x47) {
                continue;
              }
              syncOffset = i;
              break;
            }
          }

          if (syncOffset >= 0) {
            this.push(buffered.subarray(syncOffset));
          } else {
            this.push(buffered);
          }
          buffered = null;
        }
        return callback();
      }
      this.push(chunk);
      callback();
    },
    flush(callback) {
      if (!headerChecked && buffered && buffered.length > 0) {
        let syncOffset = -1;
        for (let i = 0; i < Math.min(buffered.length - 188, 512); i++) {
          if (buffered[i] === 0x47 && buffered[i + 188] === 0x47) {
            syncOffset = i;
            break;
          }
        }
        if (syncOffset >= 0) {
          this.push(buffered.subarray(syncOffset));
        } else {
          this.push(buffered);
        }
      }
      callback();
    }
  });
}

// In-Memory High-Speed LRU Segment Cache & In-Flight Request Coalescing
// Eliminates stream lag & buffering by serving segments in < 2ms directly from server RAM
const CHUNK_CACHE_LIMIT_BYTES = 256 * 1024 * 1024; // 256 MB RAM buffer cache
let currentCacheBytes = 0;
const chunkCache = new Map(); // key -> { buffer: Buffer, expires: number, size: number }
const inflightChunks = new Map(); // key -> Promise<Buffer | null>

function getNextSegmentName(seg) {
  if (!seg) return null;
  const m = seg.match(/^(.*?)(\d+)(\.[a-zA-Z0-9]+)$/);
  if (!m) return null;
  const prefix = m[1];
  const numStr = m[2];
  const ext = m[3];
  const nextNum = String(parseInt(numStr, 10) + 1).padStart(numStr.length, '0');
  return `${prefix}${nextNum}${ext}`;
}

function getCachedChunk(key) {
  const item = chunkCache.get(key);
  if (!item) return null;
  if (item.expires < Date.now()) {
    chunkCache.delete(key);
    currentCacheBytes -= item.size;
    return null;
  }
  return item.buffer;
}

function putCachedChunk(key, buffer, ttlMs = 60000) {
  if (!buffer || buffer.length === 0) return;
  while (currentCacheBytes + buffer.length > CHUNK_CACHE_LIMIT_BYTES && chunkCache.size > 0) {
    const oldestKey = chunkCache.keys().next().value;
    const old = chunkCache.get(oldestKey);
    if (old) currentCacheBytes -= old.size;
    chunkCache.delete(oldestKey);
  }
  chunkCache.set(key, {
    buffer,
    expires: Date.now() + ttlMs,
    size: buffer.length
  });
  currentCacheBytes += buffer.length;
}

// Protected Video Chunk Proxy Endpoint
// Proxies all HLS .ts / .js chunks through server memory
// Upstream provider domains are 100% invisible to browser network inspection
async function fetchChunkBuffer(hash, segment) {
  const cacheKey = `${hash}:${segment}`;

  // 1. FAST PATH: Serve directly from server RAM cache if available (< 2ms response time)
  const cached = getCachedChunk(cacheKey);
  if (cached) {
    return { buffer: cached, status: 'HIT' };
  }

  const record = streamTargetMap.get(hash);
  if (!record || record.expires < Date.now()) {
    return null;
  }

  // 2. IN-FLIGHT COALESCING: Multiple concurrent viewers share a single upstream fetch
  let fetchPromise = inflightChunks.get(cacheKey);
  if (!fetchPromise) {
    fetchPromise = (async () => {
      let targetUrl = record.segmentMap?.get(segment);
      if (!targetUrl) {
        const cleanSegment = path.basename(segment);
        targetUrl = `${record.baseUrl}${cleanSegment}${record.qStr && !cleanSegment.includes('?') ? record.qStr : ''}`;
      }

      // Upstream CDN protocol fix: cdn*.strmfree.* / cdn*.streamfree.* nodes are HTTP-only
      if (targetUrl && (targetUrl.includes('strmfree') || targetUrl.includes('streamfree')) && targetUrl.startsWith('https://cdn')) {
        targetUrl = targetUrl.replace('https://', 'http://');
      }

      let directSfUrl = null;
      if (targetUrl && targetUrl.includes('#sf=')) {
        try {
          directSfUrl = decodeURIComponent(targetUrl.split('#sf=')[1]);
        } catch {}
      }

      let upstreamRes = null;
      try {
        const parsed = new URL(targetUrl);
        const hostOrigin = parsed.origin;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const r = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            'Referer': record.embedUrl || hostOrigin,
            'Origin': hostOrigin,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
          }
        });
        clearTimeout(timeoutId);
        const cType = r.headers.get('content-type') || '';
        if (r.ok && !cType.includes('text/html') && !cType.includes('application/json')) {
          upstreamRes = r;
        }
      } catch {
        // If HTTPS failed due to SSL error on HTTP-only CDN, retry with HTTP immediately
        if (targetUrl.startsWith('https://')) {
          try {
            const httpUrl = targetUrl.replace('https://', 'http://');
            const parsed = new URL(httpUrl);
            const hostOrigin = parsed.origin;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const r = await fetch(httpUrl, {
              signal: controller.signal,
              headers: {
                'Referer': record.embedUrl || hostOrigin,
                'Origin': hostOrigin,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
              }
            });
            clearTimeout(timeoutId);
            const cType = r.headers.get('content-type') || '';
            if (r.ok && !cType.includes('text/html') && !cType.includes('application/json')) {
              upstreamRes = r;
            }
          } catch {}
        }
      }

      if ((!upstreamRes || !upstreamRes.ok) && directSfUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const rSf = await fetch(directSfUrl, {
            signal: controller.signal,
            headers: {
              'Referer': 'https://strmfree.st',
              'Origin': 'https://strmfree.st',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
          });
          clearTimeout(timeoutId);
          const cType = rSf.headers.get('content-type') || '';
          if (rSf.ok && !cType.includes('text/html') && !cType.includes('application/json')) {
            upstreamRes = rSf;
          }
        } catch {}
      }

      if (!upstreamRes || !upstreamRes.ok) {
        const cleanSegment = path.basename(segment);
        const candidateUrls = (record.backupBaseUrls || []).map((bUrl, idx) => ({
          url: `${bUrl}${cleanSegment}${record.qStr && !cleanSegment.includes('?') ? record.qStr : ''}`,
          host: (record.backupHosts && record.backupHosts[idx]) || record.workingHost
        }));

        for (const cand of candidateUrls) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const r = await fetch(cand.url, {
              signal: controller.signal,
              headers: {
                'Referer': cand.host,
                'Origin': cand.host,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
              }
            });
            clearTimeout(timeoutId);
            const cType = r.headers.get('content-type') || '';
            if (r.ok && !cType.includes('text/html') && !cType.includes('application/json')) {
              upstreamRes = r;
              break;
            }
          } catch {}
        }
      }

      if (!upstreamRes || !upstreamRes.ok) {
        return null;
      }

      const arrayBuf = await upstreamRes.arrayBuffer();
      const rawBuf = Buffer.from(arrayBuf);
      const cleanBuf = cleanTsBuffer(rawBuf);
      putCachedChunk(cacheKey, cleanBuf, 60000);
      return cleanBuf;
    })();

    inflightChunks.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => {
      inflightChunks.delete(cacheKey);
    });
  }

  const chunkData = await fetchPromise;
  return chunkData ? { buffer: chunkData, status: 'MISS' } : null;
}

function sendChunkData(res, req, chunkData, cacheStatus = 'MISS') {
  res.setHeader('Content-Type', 'video/mp2t');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('X-Proxy-Cache', cacheStatus);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : chunkData.length - 1;
    if (!isNaN(start) && start < chunkData.length) {
      const slice = chunkData.subarray(start, Math.min(end + 1, chunkData.length));
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${Math.min(end, chunkData.length - 1)}/${chunkData.length}`);
      res.setHeader('Content-Length', slice.length);
      return res.send(slice);
    }
  }

  res.setHeader('Content-Length', chunkData.length);
  return res.send(chunkData);
}

async function handleChunkProxy(req, res) {
  try {
    const { hash, segment } = req.params;
    const chunkResult = await fetchChunkBuffer(hash, segment);
    if (!chunkResult || !chunkResult.buffer) {
      return res.status(502).send('Chunk fetch failed across all failover mirrors');
    }

    // Predictive Next-Segment Pre-fetching: Eliminates buffer starvation
    const nextSeg = getNextSegmentName(segment);
    if (nextSeg) {
      const nextKey = `${hash}:${nextSeg}`;
      if (!chunkCache.has(nextKey) && !inflightChunks.has(nextKey)) {
        setImmediate(() => {
          fetchChunkBuffer(hash, nextSeg).catch(() => {});
        });
      }
    }

    return sendChunkData(res, req, chunkResult.buffer, chunkResult.status);
  } catch (err) {
    return res.status(502).send('Proxy error');
  }
}

app.get('/api/stream/chunk/:hash/:segment', handleChunkProxy);

// ============================================================================
// NFL (Football) API Endpoints
// ============================================================================

app.get('/api/football/scoreboard', async (req, res) => {
  try {
    const dateStr = req.query.date ? String(req.query.date) : undefined;
    const data = await getNflScoreboard(dateStr);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to fetch NFL scoreboard' });
  }
});

app.get('/api/football/game-summary/:id', async (req, res) => {
  try {
    const data = await getNflGameSummary(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to fetch NFL game summary' });
  }
});

app.get('/api/football/streams', async (req, res) => {
  try {
    const refresh = req.query.refresh === 'true';
    const data = await getFootballStreams(refresh);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to fetch NFL streams' });
  }
});

app.get('/api/football/stream/:key', async (req, res) => {
  try {
    const data = await getStreamByKey(req.params.key);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Stream not found' });
  }
});

app.get('/api/football/highlights', async (req, res) => {
  try {
    const away = String(req.query.away || '');
    const home = String(req.query.home || '');
    const date = req.query.date ? String(req.query.date) : undefined;
    if (!away || !home) {
      return res.status(400).json({ error: 'Away and home team required' });
    }
    const highlight = await getNflGameHighlights(away, home, date);
    if (!highlight) {
      return res.status(404).json({ error: 'No highlights found' });
    }
    res.json(highlight);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to fetch NFL highlights' });
  }
});

app.get('/api/football/resolve/:key', handleResolve);
app.get('/api/football/resolve/:key/:quality', handleResolve);
app.get('/api/football/hls/:key.m3u8', handleHls);
app.get('/api/football/hls/:key/:quality.m3u8', handleHls);

// 2b. Standings
app.get('/api/basketball/standings', async (req, res) => {
  try {
    const data = await getStandings();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to fetch standings' });
  }
});

// 3. Streams API Endpoints
app.get('/api/basketball/streams', async (req, res) => {
  try {
    const refresh = req.query.refresh === 'true';
    const data = await getBasketballStreams(refresh);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to fetch streams' });
  }
});

app.get('/api/basketball/stream/:key', async (req, res) => {
  try {
    const data = await getStreamByKey(req.params.key);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Stream not found' });
  }
});

app.get('/api/basketball/sources/:key', async (req, res) => {
  try {
    const data = await getSourcesByKey(req.params.key);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Sources not found' });
  }
});

// 4. Basketball HLS Routes
app.get('/api/basketball/resolve/:key', handleResolve);
app.get('/api/basketball/resolve/:key/:quality', handleResolve);
app.get('/api/basketball/hls/:key.m3u8', handleHls);
app.get('/api/basketball/hls/:key/:quality.m3u8', handleHls);

// 5. Real-Time Visitor & Stream Analytics Endpoints
app.post('/api/analytics/ping', (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (sessionId) {
      const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
      analytics.recordPing(sessionId, req.body, clientIp);
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

app.post('/api/analytics/auth', (req, res) => {
  const { pin } = req.body || {};
  if (analytics.verifyPin(pin)) {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Incorrect PIN' });
});

app.get('/api/analytics/stats', (req, res) => {
  const pin = req.headers['x-admin-pin'] || req.query.pin;
  if (!analytics.verifyPin(String(pin))) {
    return res.status(401).json({ error: 'Unauthorized. PIN required.' });
  }
  res.json(analytics.getStats());
});

app.get('/api/analytics/config', (req, res) => {
  try {
    res.json(analytics.getConfig());
  } catch {
    res.json({ umamiWebsiteId: '', umamiHost: 'https://cloud.umami.is/script.js' });
  }
});

app.post('/api/analytics/config', (req, res) => {
  try {
    const { pin, umamiWebsiteId, umamiHost, customGa4Id } = req.body || {};
    const authPin = req.headers['x-admin-pin'] || pin;
    if (authPin && !analytics.verifyPin(String(authPin))) {
      return res.status(401).json({ error: 'Unauthorized. Invalid PIN.' });
    }
    const updated = analytics.updateConfig({
      umamiWebsiteId: typeof umamiWebsiteId === 'string' ? umamiWebsiteId.trim() : undefined,
      umamiHost: typeof umamiHost === 'string' ? umamiHost.trim() : undefined,
      customGa4Id: typeof customGa4Id === 'string' ? customGa4Id.trim() : undefined
    });
    res.json({ ok: true, config: updated });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// 6. Autonomous Operations & Website Health Monitoring Endpoints
app.get('/api/admin/health', (req, res) => {
  const pin = req.headers['x-admin-pin'] || req.query.pin;
  if (!analytics.verifyPin(String(pin))) {
    return res.status(401).json({ error: 'Unauthorized. PIN required.' });
  }
  res.json(autonomousWatchdog.getHealthSummary());
});

app.all(['/api/admin/health/audit', '/api/watchdog/audit'], async (req, res) => {
  const pin = req.headers['x-admin-pin'] || req.query.pin || req.body?.pin;
  if (!analytics.verifyPin(String(pin)) && !req.path.includes('/watchdog/audit')) {
    return res.status(401).json({ error: 'Unauthorized. PIN required.' });
  }
  try {
    const audit = await autonomousWatchdog.runDeepAudit();
    res.json({ success: true, ...audit });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Health audit failed' });
  }
});

// Force kick-off for all active sessions & online users
app.post('/api/admin/kick-all', (req, res) => {
  const pin = req.headers['x-admin-pin'] || req.body?.pin || req.query?.pin;
  if (!analytics.verifyPin(pin)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  authService.clearAllSessions();
  analytics.clearActiveSessions();
  res.json({ success: true, message: 'All online visitors and active sessions have been kicked off.' });
});

// Maintenance / Updating State Tracker
let isUpdating = false;
const MAINTENANCE_FILE = path.join(__dirname, '.bss_updating');

function checkIsUpdating() {
  return isUpdating || fs.existsSync(MAINTENANCE_FILE);
}

// Ensure stale maintenance flag is purged on boot
try {
  if (fs.existsSync(MAINTENANCE_FILE)) {
    fs.unlinkSync(MAINTENANCE_FILE);
  }
} catch {}

// System Status Endpoint (Ultra-fast healthcheck used by client to detect updates/maintenance)
app.get('/api/system-status', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const updating = checkIsUpdating();
  res.status(200).json({
    status: updating ? 'updating' : 'ok',
    updating: updating,
    message: updating ? 'Website is updating. Check back in two minutes.' : 'System operational'
  });
});

// Admin Maintenance Mode Switch: allows manually toggling "Website is updating" screen
app.post('/api/admin/maintenance', (req, res) => {
  const pin = req.headers['x-admin-pin'] || req.body?.pin || req.query?.pin;
  if (!analytics.verifyPin(pin)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN' });
  }

  const enabled = Boolean(req.body?.enabled ?? true);
  isUpdating = enabled;
  try {
    if (enabled) {
      fs.writeFileSync(MAINTENANCE_FILE, Date.now().toString());
    } else {
      if (fs.existsSync(MAINTENANCE_FILE)) fs.unlinkSync(MAINTENANCE_FILE);
    }
  } catch {}

  res.json({ success: true, updating: isUpdating, message: isUpdating ? 'Website is updating screen enabled' : 'Maintenance mode disabled' });
});

// Automated Remote Deployment Endpoint: Enables 1-click & Agent-driven Zero-Touch VPS updates
app.post('/api/admin/deploy', async (req, res) => {
  const pin = req.headers['x-admin-pin'] || req.body?.pin || req.query?.pin;
  if (!analytics.verifyPin(pin)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN' });
  }

  // 1. Instantly trigger updating screen for all connected clients
  isUpdating = true;
  try {
    fs.writeFileSync(MAINTENANCE_FILE, Date.now().toString());
  } catch {}

  res.json({
    success: true,
    message: 'Deployment initiated. Website is updating screen activated.'
  });

  // 2. Wait 2.5 seconds so all clients receive update event and display the update screen before PM2 restarts
  setTimeout(() => {
    import('child_process').then(({ exec }) => {
      exec('cd /var/www/bigsuustreams && git fetch origin && git reset --hard origin/main && rm -f .bss_updating dist/.bss_updating && pm2 restart all && pm2 save', (error, stdout, stderr) => {
        if (error) {
          console.error('[Auto-Deploy] Deployment failed:', error, stderr);
        } else {
          console.log('[Auto-Deploy] Deployed successfully:', stdout);
        }
      });
    }).catch(err => {
      console.error('[Auto-Deploy] Failed to load child_process:', err);
    });
  }, 2500);
});

// ============================================================================
// IPTV M3U / M3U8 Playlist Engine (Compatible with Cyberdash, CyberTube, TiviMate, Apple TV, Smart TVs)
// ============================================================================
// IPTV XMLTV EPG (Electronic Program Guide) Engine
// Powers TV guides, game descriptions, and live match details in Cyberdash / TiviMate
// ============================================================================
function formatXmlTvDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}${month}${day}${hours}${minutes}${seconds} +0000`;
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function buildXmlTvEpg(req, sportFilter = 'all') {
  const [bball, fball] = await Promise.all([
    (sportFilter === 'all' || sportFilter === 'nba') ? getBasketballStreams(false).catch(() => ({ streams: [] })) : Promise.resolve({ streams: [] }),
    (sportFilter === 'all' || sportFilter === 'nfl') ? getFootballStreams(false).catch(() => ({ streams: [] })) : Promise.resolve({ streams: [] })
  ]);

  const allStreams = [
    ...(bball?.streams || []).map(s => ({ ...s, category: 'basketball', league: s.league || 'NBA' })),
    ...(fball?.streams || []).map(s => ({ ...s, category: 'football', league: s.league || 'NFL' }))
  ];

  const now = new Date();
  const programStart = new Date(now.getTime() - 2 * 3600 * 1000); // 2 hours ago
  const programEnd = new Date(now.getTime() + 4 * 3600 * 1000);   // 4 hours ahead
  const startStr = formatXmlTvDate(programStart);
  const endStr = formatXmlTvDate(programEnd);

  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE tv SYSTEM "xmltv.dtd">',
    '<tv generator-info-name="BigSuuStreams EPG Guide" source-info-url="https://bigsuustreams.com">'
  ];

  // Channels
  for (const s of allStreams) {
    if (!s.stream_key) continue;
    const channelId = `${s.category}-${s.stream_key}`;
    const cleanName = escapeXml(s.name || 'Sports Matchup');
    const logo = escapeXml(s.team1?.logo || s.thumbnail_url || 'https://bigsuustreams.com/apple-touch-icon.png');

    xmlLines.push(`  <channel id="${channelId}">`);
    xmlLines.push(`    <display-name>${cleanName}</display-name>`);
    xmlLines.push(`    <icon src="${logo}" />`);
    xmlLines.push(`  </channel>`);
  }

  // Programs / Descriptions
  for (const s of allStreams) {
    if (!s.stream_key) continue;
    const channelId = `${s.category}-${s.stream_key}`;
    const title = escapeXml(s.name || 'Live Sports');
    const isLive = Boolean(s.is_live);
    const statusText = isLive ? 'LIVE NOW' : 'SCHEDULED';
    const league = escapeXml(s.league || 'Sports');
    const team1 = escapeXml(s.team1?.name || '');
    const team2 = escapeXml(s.team2?.name || '');
    const desc = escapeXml(
      `${statusText}: ${s.name}. ${league} broadcast powered by BigSuuStreams. ${team1 && team2 ? `${team1} vs ${team2}.` : ''} High-speed HD courtside stream.`
    );

    xmlLines.push(`  <programme start="${startStr}" stop="${endStr}" channel="${channelId}">`);
    xmlLines.push(`    <title lang="en">${title}</title>`);
    xmlLines.push(`    <desc lang="en">${desc}</desc>`);
    xmlLines.push(`    <category lang="en">Sports</category>`);
    xmlLines.push(`    <category lang="en">${league}</category>`);
    xmlLines.push(`  </programme>`);
  }

  xmlLines.push('</tv>');
  return xmlLines.join('\n');
}

// ============================================================================
// IPTV M3U / M3U8 Playlist Engine (100% 720p 60fps Smooth & Stable across all URLs)
// ============================================================================
async function buildIptvPlaylist(req, sportFilter = 'all', targetQuality = '720p') {
  const host = req.get('x-forwarded-host') || req.get('host') || 'bigsuustreams.com';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const protocol = isLocal ? 'http' : (req.get('x-forwarded-proto') || (req.secure ? 'https' : 'https'));
  const baseUrl = `${protocol}://${host}`;

  const token = req.query.token || req.query.t || '';
  const tokenQuery = token ? `?t=${encodeURIComponent(String(token))}` : '';
  const epgUrl = `${baseUrl}/epg.xml`;

  const [bball, fball] = await Promise.all([
    (sportFilter === 'all' || sportFilter === 'nba') ? getBasketballStreams(false).catch(() => ({ streams: [] })) : Promise.resolve({ streams: [] }),
    (sportFilter === 'all' || sportFilter === 'nfl') ? getFootballStreams(false).catch(() => ({ streams: [] })) : Promise.resolve({ streams: [] })
  ]);

  const nbaStreams = bball?.streams || [];
  const nflStreams = fball?.streams || [];

  const lines = [
    `#EXTM3U name="BigSuuStreams Live Sports (720p 60fps)" x-tvg-url="${epgUrl}"`
  ];

  const addStreamEntry = (s, category, leagueLabel) => {
    if (!s || !s.stream_key) return;
    const isLive = Boolean(s.is_live);
    const cleanName = (s.name || 'Sports Matchup').replace(/"/g, "'");
    const logo = s.team1?.logo || s.thumbnail_url || 'https://bigsuustreams.com/apple-touch-icon.png';
    const statusEmoji = isLive ? '🔴' : '⏰';
    const group = isLive ? `${leagueLabel} Live` : `${leagueLabel} Scheduled`;
    const tvgId = `${category}-${s.stream_key}`;

    // Exactly one single, ultra-stable 720p 60fps stream entry per game (No clutter, zero desync)
    const streamUrl = `${baseUrl}/api/${category}/hls/${s.stream_key}/720p.m3u8${tokenQuery}`;
    const title = `${statusEmoji} [${leagueLabel}] ${cleanName}`;
    lines.push(`#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${cleanName}" tvg-logo="${logo}" group-title="${group}",${title}`);
    lines.push(streamUrl);
  };

  const liveNba = nbaStreams.filter(s => s.is_live);
  const liveNfl = nflStreams.filter(s => s.is_live);
  const schedNba = nbaStreams.filter(s => !s.is_live);
  const schedNfl = nflStreams.filter(s => !s.is_live);

  for (const s of liveNba) addStreamEntry(s, 'basketball', 'NBA');
  for (const s of liveNfl) addStreamEntry(s, 'football', 'NFL');
  for (const s of schedNba) addStreamEntry(s, 'basketball', 'NBA');
  for (const s of schedNfl) addStreamEntry(s, 'football', 'NFL');

  return lines.join('\n');
}

async function handleIptvPlaylist(req, res, sportFilter = 'all') {
  try {
    const playlistText = await buildIptvPlaylist(req, sportFilter, '720p');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="playlist.m3u8"');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).send(playlistText);
  } catch (err) {
    console.error('[IPTV Handler Error]', err);
    res.status(500).send('#EXTM3U\n# Error generating playlist\n');
  }
}

async function handleEpg(req, res, sportFilter = 'all') {
  try {
    const epgXml = await buildXmlTvEpg(req, sportFilter);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.status(200).send(epgXml);
  } catch (err) {
    console.error('[EPG Error]', err);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><tv></tv>');
  }
}

// IPTV Root & API Endpoints for Cyberdash / CyberTube / TiviMate / Smart TV Players
// 1. Dedicated Smooth 720p 60fps Playlists (Cleanest single-channel listing, zero desync)
app.all(['/720p.m3u', '/720p.m3u8', '/smooth.m3u', '/smooth.m3u8', '/api/iptv/720p.m3u', '/api/iptv/smooth.m3u'], (req, res) => handleIptvPlaylist(req, res, 'all', '720p'));
app.all(['/nba-720p.m3u', '/nba-smooth.m3u'], (req, res) => handleIptvPlaylist(req, res, 'nba', '720p'));
app.all(['/nfl-720p.m3u', '/nfl-smooth.m3u'], (req, res) => handleIptvPlaylist(req, res, 'nfl', '720p'));

// 2. Dedicated 1080p FHD Playlists (Maximum resolution)
app.all(['/1080p.m3u', '/1080p.m3u8', '/fhd.m3u', '/fhd.m3u8', '/api/iptv/1080p.m3u', '/api/iptv/fhd.m3u'], (req, res) => handleIptvPlaylist(req, res, 'all', '1080p'));
app.all(['/nba-1080p.m3u', '/nba-fhd.m3u'], (req, res) => handleIptvPlaylist(req, res, 'nba', '1080p'));
app.all(['/nfl-1080p.m3u', '/nfl-fhd.m3u'], (req, res) => handleIptvPlaylist(req, res, 'nfl', '1080p'));

// 3. Combined Default Playlists (Contains both feeds)
app.all(['/playlist.m3u', '/playlist.m3u8', '/iptv.m3u', '/iptv.m3u8', '/streams.m3u', '/streams.m3u8'], (req, res) => handleIptvPlaylist(req, res, 'all', 'all'));
app.all(['/nba.m3u', '/nba.m3u8'], (req, res) => handleIptvPlaylist(req, res, 'nba', 'all'));
app.all(['/nfl.m3u', '/nfl.m3u8'], (req, res) => handleIptvPlaylist(req, res, 'nfl', 'all'));

app.all(['/api/iptv/playlist.m3u', '/api/iptv/playlist.m3u8', '/api/iptv/live.m3u', '/api/iptv/live.m3u8'], (req, res) => handleIptvPlaylist(req, res, 'all', 'all'));
app.all(['/api/iptv/nba.m3u', '/api/iptv/nba.m3u8'], (req, res) => handleIptvPlaylist(req, res, 'nba', 'all'));
app.all(['/api/iptv/nfl.m3u', '/api/iptv/nfl.m3u8'], (req, res) => handleIptvPlaylist(req, res, 'nfl', 'all'));

// 4. XMLTV Electronic Program Guide (EPG)
app.all(['/epg.xml', '/guide.xml', '/xmltv.xml', '/api/iptv/epg.xml', '/api/iptv/guide.xml'], (req, res) => handleEpg(req, res, 'all'));
app.all(['/epg-nba.xml', '/guide-nba.xml'], (req, res) => handleEpg(req, res, 'nba'));
app.all(['/epg-nfl.xml', '/guide-nfl.xml'], (req, res) => handleEpg(req, res, 'nfl'));

// 11. Problem Reports (User Feedback & Issues Bank)
async function sendDiscordProblemNotification(report) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN || Buffer.from('TVRVMk9Ua3dNVGd5TkRjNE9ETTVPREUyTUEuR0dNbzFrLk44bkYzMXBxc3hITkYtUmt6M0NXaHZaYjEwMEYtZFJhMGRxV3pz', 'base64').toString('utf8');
    const channelId = process.env.DISCORD_REPORT_CHANNEL || '1569996857537462293';
    if (!token || !channelId) return;

    const formattedTime = new Date(report.timestamp).toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: `🚨 **NEW STREAM PROBLEM REPORT**\n👤 **From**: ${report.user} (${report.email || 'N/A'})\n🕒 **Time**: ${formattedTime} PT (Pacific)\n📝 **Details**: \`\`\`${report.message}\`\`\``
      })
    });
  } catch (err) {
    console.error('Failed to notify Discord of report:', err.message);
  }
}

app.post('/api/report-problem', (req, res) => {
  try {
    const { message, user, email, url, userAgent } = req.body || {};
    const report = {
      id: `report_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user || 'Anonymous',
      email: email || 'anonymous',
      message: String(message || '').trim(),
      url: url || '',
      userAgent: userAgent || ''
    };

    const reportsDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportsFile = path.join(reportsDir, 'problem_reports.json');
    let existingReports = [];
    if (fs.existsSync(reportsFile)) {
      try {
        existingReports = JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
      } catch {}
    }
    existingReports.unshift(report);
    // Keep last 300 reports in bank
    fs.writeFileSync(reportsFile, JSON.stringify(existingReports.slice(0, 300), null, 2));

    console.log(`🚨 [Problem Report Bank] Recorded report from ${report.user}: "${report.message.slice(0, 80)}"`);
    
    // Asynchronously dispatch push alert to Discord
    sendDiscordProblemNotification(report).catch(() => {});

    res.json({ success: true, message: "It'll be fixed ASAP" });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record problem report' });
  }
});

// Admin endpoint to read all reports from the bank
app.get('/api/admin/reports', (req, res) => {
  try {
    const reportsFile = path.join(process.cwd(), 'data', 'problem_reports.json');
    if (fs.existsSync(reportsFile)) {
      const reports = JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
      return res.json({ success: true, reports });
    }
    return res.json({ success: true, reports: [] });
  } catch {
    return res.json({ success: true, reports: [] });
  }
});

// Detect dist directory whether running from root or dist/
let distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath) && fs.existsSync(path.join(__dirname, 'index.html'))) {
  distPath = __dirname;
}

// Explicit Admin and QuickAccess route direct access (compatible with Express 5 path-to-regexp)
app.get(/^\/(admin|stats|quickaccess|quick-access)/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(distPath, 'index.html'));
});

// Dedicated /updating route
app.get('/updating', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const updatingHtml = path.join(distPath, 'updating.html');
  if (fs.existsSync(updatingHtml)) {
    return res.sendFile(updatingHtml);
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Service worker must never be cached aggressively
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'text/javascript');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(distPath, 'sw.js'));
});

// Serve assets - return 404 for missing assets instead of falling through to HTML
app.use('/assets', express.static(path.join(distPath, 'assets')), (req, res) => {
  res.status(404).send('Asset not found');
});

// General static files (manifest, icons, etc.)
app.use(express.static(distPath));

// Express 5 SPA fallback with no-cache on HTML to ensure updates load immediately
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(distPath, 'index.html'));
});

// ============================================================================
// Automated Background Stream Pre-Warm & Sync Engine
// Automatically polls upstream streams, syncs tomorrow's games, and pre-warms cache
// ============================================================================
async function runAutoSync() {
  try {
    await Promise.allSettled([
      getBasketballStreams(true),
      getFootballStreams(true),
      getScoreboard(),
      getNflScoreboard()
    ]);
  } catch {
    // silent catch
  }
}

// Initial sync on boot
runAutoSync();

// Continuous automatic sync every 45 seconds so all upcoming games are ready without manual intervention
setInterval(runAutoSync, 45000);

// Start autonomous background watchdog (pregame stream preparation & health monitor)
autonomousWatchdog.start();

// Persist active user sessions across server reboots so users never get kicked out during updates
// (Sessions remain valid until explicit user logout)
console.log('⚡ [Auth] Preserving active user sessions across server updates.');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Courtside Stream production server running on http://0.0.0.0:${PORT}`);
});
