import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getBasketballStreams, getStreamByKey, getSourcesByKey, resolveHlsStream } from './src/server/streamService.ts';
import { getScoreboard, getGameSummary, getStandings } from './src/server/scoreboardService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

// 4. HLS Manifest resolution and proxy (with normalized M3U8 segments)
const handleHls = async (req, res) => {
  const key = req.params.key;
  const quality = req.params.quality || req.query.quality || '1080p';
  try {
    const hls = await resolveHlsStream(key, quality);
    if (hls.isExternal) {
      return res.redirect(hls.externalUrl || '/');
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

// Detect dist directory whether running from root or dist/
let distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath) && fs.existsSync(path.join(__dirname, 'index.html'))) {
  distPath = __dirname;
}

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
