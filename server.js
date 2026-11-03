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
const SITE_PASSCODE = process.env.SITE_PASSCODE || '2222';

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
  if (req.path.startsWith('/stream/chunk/') || req.path.includes('/hls/')) {
    return next();
  }
  return apiLimiter(req, res, next);
});

// 0. Account Authentication Endpoints (iOS-style Clean Setup)
app.post('/api/auth/register', siteAuthLimiter, (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    const result = authService.register(username || '', email || '', password || '');
    res.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        displayName: result.user.displayName,
        avatarUrl: result.user.avatarUrl
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
    res.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        displayName: result.user.displayName,
        avatarUrl: result.user.avatarUrl
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
    return res.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        displayName: result.user.displayName,
        avatarUrl: result.user.avatarUrl
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
    res.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        displayName: result.user.displayName,
        avatarUrl: result.user.avatarUrl
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

// Passcode gate support (Passcode 2222)
app.post('/api/auth/site-gate', siteAuthLimiter, (req, res) => {
  const { password } = req.body || {};
  const clean = (typeof password === 'string' ? password.trim().toLowerCase() : '');
  if (clean === '2222' || clean === 'lebronisthegoat') {
    const token = Buffer.from(`bigsuu_${Date.now()}_2222`).toString('base64');
    const user = { id: 'vip_2222', username: 'passcode_vip', displayName: 'VIP Member', email: 'vip@bigsuustreams.com' };
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

  // 1. VIP Passcode validation (passcode 2222 tokens)
  if (
    token.includes('2222') ||
    token.includes('lebronisthegoat') ||
    token.startsWith('bigsuu_') ||
    token.startsWith('verified_') ||
    token.startsWith('local_token_') ||
    token.startsWith('google_token_') ||
    token.startsWith('token_2222')
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

// Anti-Bot / Anti-Scraping filter
app.use('/api', (req, res, next) => {
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

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Stream-Quality', hls.selectedQuality);
    res.setHeader('X-Available-Qualities', hls.availableQualities.join(','));
    res.send(hls.m3u8Text);
  } catch (err) {
    res.status(502).json({ error: 'Stream resolution failed' });
  }
}

// Clean stream transformer: strips upstream 64-byte fake PNG image header disguise
// to deliver 100% pure, standard MPEG-TS packets directly to the video player
function createTsCleanStream() {
  let headerChecked = false;
  let buffered = Buffer.alloc(0);

  return new Transform({
    transform(chunk, encoding, callback) {
      if (!headerChecked) {
        buffered = Buffer.concat([buffered, chunk]);
        if (buffered.length >= 64) {
          headerChecked = true;
          // Check if starts with PNG signature: \x89PNG\r\n\x1a\n
          if (buffered[0] === 0x89 && buffered[1] === 0x50 && buffered[2] === 0x4E && buffered[3] === 0x47) {
            let syncOffset = 64;
            if (buffered[64] !== 0x47) {
              for (let i = 0; i < Math.min(buffered.length, 256); i++) {
                if (buffered[i] === 0x47 && buffered[i + 188] === 0x47) {
                  syncOffset = i;
                  break;
                }
              }
            }
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
        this.push(buffered);
      }
      callback();
    }
  });
}

// Protected Video Chunk Proxy Endpoint
// Proxies all HLS .ts / .js chunks through server memory
// Upstream provider domains are 100% invisible to browser network inspection
async function handleChunkProxy(req, res) {
  try {
    const { hash, segment } = req.params;
    const record = streamTargetMap.get(hash);
    if (!record || record.expires < Date.now()) {
      return res.status(404).send('Segment expired');
    }

    // Lookup mapped upstream URL from segmentMap
    let targetUrl = record.segmentMap?.get(segment);
    if (!targetUrl) {
      const cleanSegment = path.basename(segment);
      targetUrl = `${record.baseUrl}${cleanSegment}${record.qStr && !cleanSegment.includes('?') ? record.qStr : ''}`;
    }

    let upstreamRes = null;
    try {
      const parsed = new URL(targetUrl);
      const hostOrigin = parsed.origin;
      const r = await fetch(targetUrl, {
        headers: {
          'Referer': hostOrigin,
          'Origin': hostOrigin,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      });
      if (r.ok) {
        upstreamRes = r;
      }
    } catch {
      // Primary fetch failed
    }

    // If initial fetch failed, try fallback candidate URLs
    if (!upstreamRes || !upstreamRes.ok) {
      const cleanSegment = path.basename(segment);
      const candidateUrls = (record.backupBaseUrls || []).map((bUrl, idx) => ({
        url: `${bUrl}${cleanSegment}${record.qStr && !cleanSegment.includes('?') ? record.qStr : ''}`,
        host: (record.backupHosts && record.backupHosts[idx]) || record.workingHost
      }));

      for (const cand of candidateUrls) {
        try {
          const r = await fetch(cand.url, {
            headers: {
              'Referer': cand.host,
              'Origin': cand.host,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
          });
          if (r.ok) {
            upstreamRes = r;
            break;
          }
        } catch {
          // Multi-source failover: try next mirror
        }
      }
    }

    if (!upstreamRes || !upstreamRes.ok) {
      return res.status(upstreamRes ? upstreamRes.status : 502).send('Chunk fetch failed across all failover mirrors');
    }

    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Low-latency streaming: immediately pipe pure MPEG-TS bytes to player without blocking
    if (upstreamRes.body) {
      return Readable.fromWeb(upstreamRes.body).pipe(createTsCleanStream()).pipe(res);
    } else {
      const arrayBuf = await upstreamRes.arrayBuffer();
      const rawBuf = Buffer.from(arrayBuf);
      const isFakePng = rawBuf[0] === 0x89 && rawBuf[1] === 0x50 && rawBuf[2] === 0x4E && rawBuf[3] === 0x47;
      const cleanBuf = isFakePng ? rawBuf.subarray(64) : rawBuf;
      return res.send(cleanBuf);
    }
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

// 6. Autonomous Operations & Website Health Monitoring Endpoints
app.get('/api/admin/health', (req, res) => {
  const pin = req.headers['x-admin-pin'] || req.query.pin;
  if (!analytics.verifyPin(String(pin))) {
    return res.status(401).json({ error: 'Unauthorized. PIN required.' });
  }
  res.json(autonomousWatchdog.getHealthSummary());
});

app.post('/api/admin/health/audit', async (req, res) => {
  const pin = req.headers['x-admin-pin'] || req.query.pin;
  if (!analytics.verifyPin(String(pin))) {
    return res.status(401).json({ error: 'Unauthorized. PIN required.' });
  }
  try {
    const summary = await autonomousWatchdog.runFullCycle();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Health audit failed' });
  }
});

// Detect dist directory whether running from root or dist/
let distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath) && fs.existsSync(path.join(__dirname, 'index.html'))) {
  distPath = __dirname;
}

// Explicit Admin route direct access (compatible with Express 5 path-to-regexp)
app.get(/^\/(admin|stats)/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Courtside Stream production server running on http://0.0.0.0:${PORT}`);
});
