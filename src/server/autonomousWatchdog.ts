import { getScoreboard, getNflScoreboard } from './scoreboardService.ts';
import { resolveHlsStream, streamTargetMap, getSortedHealthyMirrors, recordMirrorSuccess, recordMirrorFailure } from './streamService.ts';

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

    // 1. Fetch NBA Schedule
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
    } catch (err: any) {
      this.services.nbaScoreboard.status = 'degraded';
      this.services.nbaScoreboard.message = err?.message;
    }

    // 2. Fetch NFL Schedule
    try {
      const nflData = await getNflScoreboard();
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
    } catch (err: any) {
      this.services.nflScoreboard.status = 'degraded';
      this.services.nflScoreboard.message = err?.message;
    }

    let liveCount = 0;

    // 3. Inspect games in the pregame & live window (from 30 min before start up to 2.5 hours after start)
    for (const g of candidateGames) {
      const diffMinutes = Math.round((g.startTimeUnix * 1000 - now) / 60000);

      // We actively manage games from 30 minutes before tipoff/kickoff through in-game play
      const isInWatchWindow = (diffMinutes <= 30 && diffMinutes >= -180) || g.isLive;
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
      // When game is 12 minutes or closer to start, or already live/tipoff passed:
      const shouldPrepare = diffMinutes <= 12;

      // Don't re-test if already verified within the last 4 minutes
      const timeSinceLastCheck = now - watchItem.lastCheckedAt;
      if (shouldPrepare && (watchItem.status !== 'ready' || timeSinceLastCheck > 240000)) {
        watchItem.lastCheckedAt = now;
        const sportCategory = g.sport === 'nfl' ? 'football' : 'basketball';

        try {
          // Proactively resolve stream and prime cache/target record
          const resolved = await resolveHlsStream(g.streamKey, '1080p', sportCategory);

          if (resolved.m3u8Text && resolved.m3u8Text.length > 50) {
            const wasAlreadyReady = watchItem.status === 'ready';
            watchItem.status = 'ready';
            watchItem.availableQualities = resolved.availableQualities;
            watchItem.selectedQuality = resolved.selectedQuality;
            watchItem.retryCount = 0;
            watchItem.diagnosticNote = `Pre-warmed & primed. Quality: ${resolved.selectedQuality} (${resolved.availableQualities.join(', ')}).`;

            if (!wasAlreadyReady) {
              this.stats.prewarmedCountToday += 1;
              this.logEvent(
                'success',
                'pregame',
                `[Auto-Pregame] Verified & primed ${g.sport.toUpperCase()} stream: ${g.name}.`,
                { streamKey: g.streamKey, quality: resolved.selectedQuality, minutesUntilStart: diffMinutes }
              );
            }
          } else {
            // Stream not broadcasting yet
            watchItem.status = diffMinutes > 0 ? 'stream_pending' : 'feed_delayed';
            watchItem.diagnosticNote = diffMinutes > 0
              ? `Waiting for broadcaster feed (starts ~5m before game). Auto-retrying every 30s.`
              : `Broadcaster feed initializing. Watchdog actively monitoring.`;
          }
        } catch (err: any) {
          watchItem.retryCount += 1;

          // Attempt Automatic Recovery: try fallback to 720p or secondary category
          try {
            const fallback = await resolveHlsStream(g.streamKey, '720p', sportCategory);
            if (fallback.m3u8Text && fallback.m3u8Text.length > 50) {
              watchItem.status = 'ready';
              watchItem.availableQualities = fallback.availableQualities;
              watchItem.selectedQuality = fallback.selectedQuality;
              watchItem.diagnosticNote = 'Recovered via 720p failover channel.';
              this.stats.recoveriesAttemptedToday += 1;
              this.logEvent(
                'recovery',
                'recovery',
                `[Auto-Recovery] Recovered stream for ${g.name} via fallback channel.`,
                { streamKey: g.streamKey }
              );
              continue;
            }
          } catch {
            // Fallback also pending
          }

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
