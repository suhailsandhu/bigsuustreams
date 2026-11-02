import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { getBasketballStreams, getStreamByKey, getSourcesByKey, resolveHlsStream } from './src/server/streamService.ts';
import { getScoreboard, getGameSummary, getStandings } from './src/server/scoreboardService.ts';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'basketball-api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
          
          // CORS headers for local testing
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          // 1. Scoreboard (ESPN real scores, leaders & stream matching)
          if (url.pathname === '/api/basketball/scoreboard') {
            try {
              const dateStr = url.searchParams.get('date') || undefined;
              const data = await getScoreboard(dateStr);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Failed to fetch scoreboard' }));
            }
            return;
          }

          // 2. Game Summary / Boxscore
          const summaryMatch = url.pathname.match(/^\/api\/basketball\/game-summary\/([^/]+)$/);
          if (summaryMatch) {
            const eventId = decodeURIComponent(summaryMatch[1]);
            try {
              const data = await getGameSummary(eventId);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Failed to fetch game summary' }));
            }
            return;
          }

          // 2b. Standings
          if (url.pathname === '/api/basketball/standings') {
            try {
              const data = await getStandings();
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Failed to fetch standings' }));
            }
            return;
          }

          // 3. Streams list
          if (url.pathname === '/api/basketball/streams') {
            try {
              const refresh = url.searchParams.get('refresh') === 'true';
              const data = await getBasketballStreams(refresh);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Failed to fetch streams' }));
            }
            return;
          }

          // 4. Single stream
          const streamMatch = url.pathname.match(/^\/api\/basketball\/stream\/([^/]+)$/);
          if (streamMatch) {
            const key = decodeURIComponent(streamMatch[1]);
            try {
              const data = await getStreamByKey(key);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(data));
            } catch (err) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Stream not found' }));
            }
            return;
          }

          // 5. Sources
          const sourcesMatch = url.pathname.match(/^\/api\/basketball\/sources\/([^/]+)$/);
          if (sourcesMatch) {
            const key = decodeURIComponent(sourcesMatch[1]);
            try {
              const data = await getSourcesByKey(key);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(data));
            } catch (err) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Sources not found' }));
            }
            return;
          }

          // 6. HLS manifest resolution & proxy
          const hlsMatch = url.pathname.match(/^\/api\/basketball\/hls\/([^/]+?)(?:\/([^/]+))?\.m3u8$/);
          if (hlsMatch) {
            const key = decodeURIComponent(hlsMatch[1]);
            const quality = hlsMatch[2] || url.searchParams.get('quality') || '1080p';
            try {
              const hls = await resolveHlsStream(key, quality);
              if (hls.isExternal) {
                res.statusCode = 302;
                res.setHeader('Location', hls.externalUrl || '/');
                res.end();
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              res.setHeader('X-Stream-Quality', hls.selectedQuality);
              res.setHeader('X-Available-Qualities', hls.availableQualities.join(','));
              res.end(hls.m3u8Text);
            } catch (err: any) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Stream resolution failed: ' + (err.message || '') }));
            }
            return;
          }

          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    host: true
  }
});
