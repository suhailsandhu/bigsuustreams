import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getBasketballStreams, getFootballStreams, getStreamByKey, getSourcesByKey, resolveHlsStream } from './src/server/streamService.ts';
import { getScoreboard, getGameSummary, getStandings, getNflScoreboard, getNflGameSummary } from './src/server/scoreboardService.ts';
import { analytics } from './src/server/analyticsService.ts';
import { getGameHighlights } from './src/server/highlightsService.ts';
import { applySecurityHeaders, createRateLimiter } from './src/server/securityMiddleware.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_PASSCODE = process.env.SITE_PASSCODE || 'lebronisthegoat';

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

// Apply general rate limiter across API
app.use('/api', apiLimiter);

// 0. Site-Wide Access Gate Passcode Verification
app.post('/api/auth/site-gate', siteAuthLimiter, (req, res) => {
  const { password } = req.body || {};
  if (typeof password === 'string' && password.trim().toLowerCase() === SITE_PASSCODE) {
    const token = Buffer.from(`bigsuu_${Date.now()}_lebronisthegoat`).toString('base64');
    return res.json({ success: true, token });
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

// 4. HLS Stream Resolution and Proxy
const handleResolve = async (req, res) => {
  try {
    const key = req.params.key;
    const quality = req.params.quality || req.query.quality || '1080p';
    const hls = await resolveHlsStream(key, quality);
    res.json({
      success: true,
      streamUrl: hls.upstreamUrl,
      proxyUrl: `/api/basketball/hls/${key}/${hls.selectedQuality}.m3u8`,
      selectedQuality: hls.selectedQuality,
      availableQualities: hls.availableQualities,
      isExternal: hls.isExternal
    });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Failed to resolve stream' });
  }
};

app.get('/api/basketball/resolve/:key', handleResolve);
app.get('/api/basketball/resolve/:key/:quality', handleResolve);

const handleHls = async (req, res) => {
  const key = req.params.key;
  const quality = req.params.quality || req.query.quality || '1080p';
  try {
    const hls = await resolveHlsStream(key, quality);
    if (hls.isExternal && hls.externalUrl) {
      return res.redirect(hls.externalUrl);
    }

    // If server couldn't fetch proxy playlist (e.g. cloud datacenter 403), redirect directly to working CDN
    if (!hls.m3u8Text && hls.upstreamUrl) {
      return res.redirect(302, hls.upstreamUrl);
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Stream-Quality', hls.selectedQuality);
    res.setHeader('X-Available-Qualities', hls.availableQualities.join(','));
    res.send(hls.m3u8Text);
  } catch (err) {
    res.status(502).json({ error: 'Stream resolution failed: ' + ((err && err.message) || '') });
  }
};

app.get('/api/basketball/hls/:key.m3u8', handleHls);
app.get('/api/basketball/hls/:key/:quality.m3u8', handleHls);

// 5. Real-Time Visitor & Stream Analytics Endpoints
app.post('/api/analytics/ping', (req, res) => {
  try {
    const { sessionId, device, path, streamKey, gameName, isInitial } = req.body || {};
    if (sessionId) {
      const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
      analytics.recordPing(sessionId, { device, path, streamKey, gameName, isInitial }, clientIp);
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

app.listen(PORT, () => {
  console.log(`Courtside Stream production server running on http://localhost:${PORT}`);
});
