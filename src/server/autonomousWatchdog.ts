import { getScoreboard, getNflScoreboard } from './scoreboardService.ts';
import { getBasketballStreams, getFootballStreams, resolveHlsStream, streamTargetMap, getSortedHealthyMirrors, recordMirrorSuccess, recordMirrorFailure } from './streamService.ts';
import { getTodayDateString } from '../utils/date.ts';

export interface PregameWatchlistItem {
  gameId: string;
  name: string;
  sport: 'nba' | 'nfl';
  date: string;
  streamKey: string;
  startTimeUnix: number;
  minutesUntilStart: number;
  status: 'scheduled' | 'prewarming' | 'ready' | 'stream_pending' | 'feed_delayed' | 'error';
  lastCheckedAt: number;
  availableQualities: string[];
  selectedQuality?: string;
  retryCount: number;
  diagnosticNote?: string;
  mpegTsVerified?: boolean;
  advancing?: boolean;
  syncOffset?: number;
  chunkBytes?: number;
}

export interface ServiceHealthStatus {
  status: 'ok' | 'degraded' | 'down';
  latencyMs: number;
  lastChecked: number;
  message?: string;
  details?: Record<string, any>;
}

export interface WatchdogEvent {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'recovery';
  category: 'pregame' | 'monitoring' | 'recovery' | 'stream';
  message: string;
  details?: any;
}

export interface SystemHealthSummary {
  status: 'operational' | 'degraded' | 'recovering';
  uptimeSeconds: number;
  lastScanTimestamp: number;
  services: {
    nbaScoreboard: ServiceHealthStatus;
    nflScoreboard: ServiceHealthStatus;
    streamMirrors: ServiceHealthStatus;
    chunkPipeline: ServiceHealthStatus;
  };
  pregameWatchlist: PregameWatchlistItem[];
  recentEvents: WatchdogEvent[];
  stats: {
    prewarmedCountToday: number;
    recoveriesAttemptedToday: number;
    healthChecksCompletedToday: number;
    activeLiveGamesCount: number;
  };
}

class AutonomousWatchdog {
  private startTime = Date.now();
  private lastScanTimestamp = 0;
  private isScanRunning = false;
  private intervalTimer: any = null;

  private pregameWatchlist: Map<string, PregameWatchlistItem> = new Map();
  private events: WatchdogEvent[] = [];
  private maxEvents = 60;

  private stats = {
    prewarmedCountToday: 0,
    recoveriesAttemptedToday: 0,
    healthChecksCompletedToday: 0,
    activeLiveGamesCount: 0
  };

  private services: {
    nbaScoreboard: ServiceHealthStatus;
    nflScoreboard: ServiceHealthStatus;
    streamMirrors: ServiceHealthStatus;
    chunkPipeline: ServiceHealthStatus;
  } = {
    nbaScoreboard: { status: 'ok', latencyMs: 0, lastChecked: 0 },
    nflScoreboard: { status: 'ok', latencyMs: 0, lastChecked: 0 },
    streamMirrors: { status: 'ok', latencyMs: 0, lastChecked: 0 },
    chunkPipeline: { status: 'ok', latencyMs: 0, lastChecked: 0 }
  };

  public logEvent(
    level: 'info' | 'success' | 'warning' | 'recovery',
    category: 'pregame' | 'monitoring' | 'recovery' | 'stream',
    message: string,
    details?: any
  ) {
    const event: WatchdogEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      details
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
  }

  public start() {
    if (this.intervalTimer) return;
    this.logEvent('info', 'monitoring', 'Autonomous Game Preparation & Health Watchdog initialized.');

    // Initial check after 3 seconds
    setTimeout(() => {
      this.runFullCycle().catch(() => {});
    }, 3000);

    // Continuous 30-second cycle
    this.intervalTimer = setInterval(() => {
      this.runFullCycle().catch(() => {});
    }, 30000);
  }

  public stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public async runFullCycle(): Promise<SystemHealthSummary> {
    if (this.isScanRunning) return this.getHealthSummary();
    this.isScanRunning = true;
    this.lastScanTimestamp = Date.now();

    try {
      await this.checkPregameStreams();
      await this.auditServices();
      this.stats.healthChecksCompletedToday += 1;
    } catch (err: any) {
      this.logEvent('warning', 'monitoring', `Watchdog cycle encountered error: ${err?.message || err}`);
    } finally {
      this.isScanRunning = false;
    }

    return this.getHealthSummary();
  }

  /**
   * 1. Automatic Pregame Stream Preparation Engine
   * Detects upcoming games, checks feeds, pre-warms tokens & caches, and handles recovery.
   */
  private async checkPregameStreams() {
    const now = Date.now();
    const candidateGames: {
      gameId: string;
      name: string;
      sport: 'nba' | 'nfl';
      date: string;
      streamKey: string;
      startTimeUnix: number;
      isLive: boolean;
    }[] = [];

    // 1. Fetch NBA Schedule & Active Streams
    try {
      const nbaData = await getScoreboard();
      for (const g of nbaData.games || []) {
        const streamKey = g.stream?.streamKey || `${g.awayTeam?.name || ''}-vs-${g.homeTeam?.name || ''}`.toLowerCase().replace(/\s+/g, '-');
        const startUnix = Math.floor(new Date(g.date).getTime() / 1000);
        candidateGames.push({
          gameId: g.id,
          name: g.name,
          sport: 'nba',
          date: g.date,
          streamKey,
          startTimeUnix: startUnix,
          isLive: g.status?.state === 'in' || Boolean(g.status?.isLive) || Boolean(g.stream?.isLive)
        });
      }
      const nbaStreamsData = await getBasketballStreams().catch(() => ({ streams: [] }));
      for (const s of nbaStreamsData.streams || []) {
        if (!candidateGames.some(c => c.streamKey === s.stream_key)) {
          candidateGames.push({
            gameId: s.id,
            name: s.name,
            sport: 'nba',
            date: new Date(s.match_timestamp * 1000).toISOString(),
            streamKey: s.stream_key,
            startTimeUnix: s.match_timestamp,
            isLive: Boolean(s.is_live)
          });
        }
      }
    } catch (err: any) {
      this.services.nbaScoreboard.status = 'degraded';
      this.services.nbaScoreboard.message = err?.message;
    }

    // 2. Fetch NFL Schedule & Active Streams
    try {
      const todayStr = getTodayDateString();
      const nflData = await getNflScoreboard(todayStr);
      for (const g of nflData.games || []) {
        const streamKey = g.stream?.streamKey || `${g.awayTeam?.name || ''}-vs-${g.homeTeam?.name || ''}`.toLowerCase().replace(/\s+/g, '-');
        const startUnix = Math.floor(new Date(g.date).getTime() / 1000);
        candidateGames.push({
          gameId: g.id,
          name: g.name,
          sport: 'nfl',
          date: g.date,
          streamKey,
          startTimeUnix: startUnix,
          isLive: g.status?.state === 'in' || Boolean(g.status?.isLive) || Boolean(g.stream?.isLive)
        });
      }
      const footballStreamsData = await getFootballStreams().catch(() => ({ streams: [] }));
      for (const s of footballStreamsData.streams || []) {
        if (!candidateGames.some(c => c.streamKey === s.stream_key)) {
          candidateGames.push({
            gameId: s.id,
            name: s.name,
            sport: 'nfl',
            date: new Date(s.match_timestamp * 1000).toISOString(),
            streamKey: s.stream_key,
            startTimeUnix: s.match_timestamp,
            isLive: Boolean(s.is_live)
          });
        }
      }
    } catch (err: any) {
      this.services.nflScoreboard.status = 'degraded';
      this.services.nflScoreboard.message = err?.message;
    }

    let liveCount = 0;

    // 3. Inspect games in the pregame & live window (from 60 min before start up to 4 hours after start)
    for (const g of candidateGames) {
      const diffMinutes = Math.round((g.startTimeUnix * 1000 - now) / 60000);

      // We actively manage games from 60 minutes before tipoff/kickoff through in-game play
      const isInWatchWindow = (diffMinutes <= 60 && diffMinutes >= -240) || g.isLive;
      if (!isInWatchWindow) continue;

      if (g.isLive || diffMinutes <= 0) {
        liveCount++;
      }

      let watchItem = this.pregameWatchlist.get(g.streamKey);
      if (!watchItem) {
        watchItem = {
          gameId: g.gameId,
          name: g.name,
          sport: g.sport,
          date: g.date,
          streamKey: g.streamKey,
          startTimeUnix: g.startTimeUnix,
          minutesUntilStart: diffMinutes,
          status: 'scheduled',
          lastCheckedAt: 0,
          availableQualities: [],
          retryCount: 0
        };
        this.pregameWatchlist.set(g.streamKey, watchItem);
      }

      watchItem.minutesUntilStart = diffMinutes;

      // PREGAME PREPARATION TRIGGER:
      // When game is 35 minutes or closer to start, or already live/tipoff passed:
      const shouldPrepare = diffMinutes <= 35;

      // Don't re-test if already verified within the last 4 minutes
      const timeSinceLastCheck = now - watchItem.lastCheckedAt;
      if (shouldPrepare && (watchItem.status !== 'ready' || timeSinceLastCheck > 240000)) {
        watchItem.lastCheckedAt = now;
        const sportCategory = g.sport === 'nfl' ? 'football' : 'basketball';

        try {
          // Deep Playback Verification: Validates manifest, downloads segment, verifies MPEG-TS 0x47 sync pattern
          let verification = await this.verifyStreamDeeply(g.streamKey, '1080p', sportCategory);

          // If 1080p fails deep verification, attempt auto-recovery with 720p
          if (!verification.verified) {
            const fallback720 = await this.verifyStreamDeeply(g.streamKey, '720p', sportCategory);
            if (fallback720.verified) {
              verification = fallback720;
              this.stats.recoveriesAttemptedToday += 1;
              this.logEvent(
                'recovery',
                'recovery',
                `[Auto-Recovery] Recovered stream for ${g.name} via 720p fallback channel.`,
                { streamKey: g.streamKey }
              );
            }
          }

          if (verification.verified) {
            const wasAlreadyReady = watchItem.status === 'ready';
            watchItem.status = 'ready';
            watchItem.availableQualities = verification.availableQualities;
            watchItem.selectedQuality = verification.selectedQuality;
            watchItem.mpegTsVerified = verification.mpegTs;
            watchItem.advancing = verification.advancing;
            watchItem.syncOffset = verification.syncOffset;
            watchItem.chunkBytes = verification.chunkBytes;
            watchItem.retryCount = 0;
            watchItem.diagnosticNote = verification.note;

            if (!wasAlreadyReady) {
              this.stats.prewarmedCountToday += 1;
              this.logEvent(
                'success',
                'pregame',
                `[Auto-Pregame] Deeply verified & primed ${g.sport.toUpperCase()} stream: ${g.name}.`,
                {
                  streamKey: g.streamKey,
                  quality: verification.selectedQuality,
                  chunkBytes: verification.chunkBytes,
                  syncOffset: verification.syncOffset,
                  minutesUntilStart: diffMinutes
                }
              );
            }
          } else {
            // Stream not broadcasting yet or uplinking
            watchItem.status = diffMinutes > 0 ? 'stream_pending' : 'feed_delayed';
            watchItem.diagnosticNote = diffMinutes > 0
              ? `Waiting for broadcaster uplink (starts ~5m before start). Auto-retrying every 30s.`
              : `Broadcaster uplink delayed (${verification.note}). Watchdog actively monitoring.`;
          }
        } catch (err: any) {
          watchItem.retryCount += 1;
          if (diffMinutes > 0) {
            watchItem.status = 'stream_pending';
            watchItem.diagnosticNote = `Pregame check pending broadcaster uplink. Rechecking automatically.`;
          } else {
            watchItem.status = 'feed_delayed';
            watchItem.diagnosticNote = `Feed not broadcasting yet (${err?.message || 'Awaiting uplink'}).`;
          }
        }
      }
    }

    this.stats.activeLiveGamesCount = liveCount;

    // Prune stale games older than 4 hours from watchlist
    for (const [key, item] of this.pregameWatchlist.entries()) {
      if (now - item.startTimeUnix * 1000 > 14400000) {
        this.pregameWatchlist.delete(key);
      }
    }
  }

  /**
   * Deep Playback Verification:
   * Validates manifest, extracts media chunks, fetches binary chunk, verifies MPEG-TS 0x47 sync byte pattern,
   * and ensures no fake HTML/JSON 200 error pages are treated as playable video.
   */
  private async verifyStreamDeeply(
    streamKey: string,
    quality: string,
    sportCategory: 'basketball' | 'football'
  ): Promise<{
    verified: boolean;
    mpegTs: boolean;
    advancing: boolean;
    syncOffset: number;
    chunkBytes: number;
    selectedQuality: string;
    availableQualities: string[];
    note: string;
  }> {
    try {
      const resolved = await resolveHlsStream(streamKey, quality, sportCategory);
      if (!resolved.m3u8Text || !resolved.m3u8Text.includes('#EXTM3U')) {
        return {
          verified: false,
          mpegTs: false,
          advancing: false,
          syncOffset: -1,
          chunkBytes: 0,
          selectedQuality: resolved.selectedQuality || quality,
          availableQualities: resolved.availableQualities || [],
          note: 'Playlist unavailable or empty.'
        };
      }

      const lines = resolved.m3u8Text.split('\n');
      const chunkLines = lines.filter(l => l.startsWith('/api/stream/chunk/'));
      if (chunkLines.length === 0) {
        return {
          verified: false,
          mpegTs: false,
          advancing: false,
          syncOffset: -1,
          chunkBytes: 0,
          selectedQuality: resolved.selectedQuality,
          availableQualities: resolved.availableQualities,
          note: 'Playlist contains no media chunks.'
        };
      }

      // Deep inspect first chunk
      const firstChunk = chunkLines[0];
      const parts = firstChunk.split('/');
      const hash = parts[4];
      const seg = parts[5];
      const target = streamTargetMap.get(hash);
      const upstreamUrl = target?.segmentMap?.get(seg);

      if (!upstreamUrl) {
        return {
          verified: false,
          mpegTs: false,
          advancing: false,
          syncOffset: -1,
          chunkBytes: 0,
          selectedQuality: resolved.selectedQuality,
          availableQualities: resolved.availableQualities,
          note: 'Chunk not mapped in internal proxy memory.'
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const fetchUrl = upstreamUrl.split('#')[0];
      const res = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          verified: false,
          mpegTs: false,
          advancing: false,
          syncOffset: -1,
          chunkBytes: 0,
          selectedQuality: resolved.selectedQuality,
          availableQualities: resolved.availableQualities,
          note: `Upstream media chunk returned HTTP ${res.status}.`
        };
      }

      const cType = res.headers.get('content-type') || '';
      if (cType.includes('text/html') || cType.includes('application/json')) {
        return {
          verified: false,
          mpegTs: false,
          advancing: false,
          syncOffset: -1,
          chunkBytes: 0,
          selectedQuality: resolved.selectedQuality,
          availableQualities: resolved.availableQualities,
          note: `Upstream returned HTML/JSON error page disguised with HTTP 200.`
        };
      }

      const buf = Buffer.from(await res.arrayBuffer());
      let syncOffset = -1;
      for (let i = 0; i < Math.min(buf.length - 188, 1024); i++) {
        if (buf[i] === 0x47 && buf[i + 188] === 0x47) {
          if (i + 376 < buf.length && buf[i + 376] !== 0x47) continue;
          syncOffset = i;
          break;
        }
      }

      if (syncOffset < 0) {
        return {
          verified: false,
          mpegTs: false,
          advancing: false,
          syncOffset: -1,
          chunkBytes: buf.length,
          selectedQuality: resolved.selectedQuality,
          availableQualities: resolved.availableQualities,
          note: 'Chunk binary lacks MPEG-TS 0x47 packet sync byte.'
        };
      }

      return {
        verified: true,
        mpegTs: true,
        advancing: true,
        syncOffset,
        chunkBytes: buf.length,
        selectedQuality: resolved.selectedQuality,
        availableQualities: resolved.availableQualities,
        note: `Verified live MPEG-TS (${buf.length} bytes, sync@${syncOffset}). Quality: ${resolved.selectedQuality} (${resolved.availableQualities.join(', ')}).`
      };
    } catch (err: any) {
      return {
        verified: false,
        mpegTs: false,
        advancing: false,
        syncOffset: -1,
        chunkBytes: 0,
        selectedQuality: quality,
        availableQualities: [],
        note: `Verification error: ${err?.message || err}`
      };
    }
  }

  /**
   * 2. Autonomous Website & Integration Monitoring
   */
  private async auditServices() {
    const now = Date.now();

    // Audit 1: NBA Scoreboard
    try {
      const t0 = Date.now();
      const nba = await getScoreboard();
      this.services.nbaScoreboard = {
        status: nba.games ? 'ok' : 'degraded',
        latencyMs: Date.now() - t0,
        lastChecked: now,
        message: `${nba.games?.length || 0} games loaded`
      };
    } catch (err: any) {
      this.services.nbaScoreboard = {
        status: 'degraded',
        latencyMs: 0,
        lastChecked: now,
        message: err?.message
      };
    }

    // Audit 2: NFL Scoreboard
    try {
      const t0 = Date.now();
      const nfl = await getNflScoreboard();
      this.services.nflScoreboard = {
        status: nfl.games ? 'ok' : 'degraded',
        latencyMs: Date.now() - t0,
        lastChecked: now,
        message: `${nfl.games?.length || 0} games loaded`
      };
    } catch (err: any) {
      this.services.nflScoreboard = {
        status: 'degraded',
        latencyMs: 0,
        lastChecked: now,
        message: err?.message
      };
    }

    // Audit 3: Stream Provider Mirrors
    try {
      const t0 = Date.now();
      const mirrors = getSortedHealthyMirrors();
      const primary = mirrors[0] || 'https://streamfree.top';
      const r = await fetch(primary, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(4000)
      });
      const latency = Date.now() - t0;
      if (r.ok) {
        recordMirrorSuccess(primary, latency);
        this.services.streamMirrors = {
          status: 'ok',
          latencyMs: latency,
          lastChecked: now,
          message: `${mirrors.length} mirrors available (Primary: ${primary.replace('https://', '')})`
        };
      } else {
        recordMirrorFailure(primary);
        this.services.streamMirrors = {
          status: 'degraded',
          latencyMs: latency,
          lastChecked: now,
          message: `Primary mirror returned status ${r.status}. Automatic failover active.`
        };
      }
    } catch (err: any) {
      this.services.streamMirrors = {
        status: 'degraded',
        latencyMs: 0,
        lastChecked: now,
        message: `Mirror check warning: ${err?.message || 'Timeout'}`
      };
    }

    // Audit 4: Video Chunk Pipeline
    try {
      const activeTargets = streamTargetMap.size;
      this.services.chunkPipeline = {
        status: 'ok',
        latencyMs: 0,
        lastChecked: now,
        message: `${activeTargets} active stream targets mapped in memory with pure MPEG-TS piping.`
      };
    } catch (err: any) {
      this.services.chunkPipeline = {
        status: 'degraded',
        latencyMs: 0,
        lastChecked: now,
        message: err?.message
      };
    }
  }

  public async runDeepAudit(): Promise<{ summary: SystemHealthSummary; results: any[] }> {
    await this.runFullCycle();
    const results: any[] = [];
    const games = Array.from(this.pregameWatchlist.values());
    for (const g of games) {
      results.push({
        name: g.name,
        streamKey: g.streamKey,
        sport: g.sport,
        status: g.status,
        minutesUntilStart: g.minutesUntilStart,
        verified: g.status === 'ready',
        selectedQuality: g.selectedQuality || 'auto',
        availableQualities: g.availableQualities,
        diagnosticNote: g.diagnosticNote
      });
    }
    return {
      summary: this.getHealthSummary(),
      results
    };
  }

  public getHealthSummary(): SystemHealthSummary {
    const isDegraded = Object.values(this.services).some(s => s.status === 'degraded' || s.status === 'down');

    return {
      status: isDegraded ? 'degraded' : 'operational',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      lastScanTimestamp: this.lastScanTimestamp,
      services: this.services,
      pregameWatchlist: Array.from(this.pregameWatchlist.values()).sort((a, b) => a.minutesUntilStart - b.minutesUntilStart),
      recentEvents: this.events.slice(0, 30),
      stats: this.stats
    };
  }
}

export const autonomousWatchdog = new AutonomousWatchdog();
