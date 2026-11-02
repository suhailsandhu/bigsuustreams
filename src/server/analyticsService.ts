// Real-time In-Memory Analytics & Activity Tracker for BigSuuStreams
declare const process: any;

interface VisitorSession {
  lastPing: number;
  device: string;
  path: string;
  streamKey?: string;
  gameName?: string;
  clientHash: string;
}

interface ActivityEvent {
  id: string;
  timestamp: number;
  text: string;
  type: 'visit' | 'watch' | 'change';
  device: string;
}

class AnalyticsTracker {
  private activeSessions = new Map<string, VisitorSession>();
  private uniqueVisitorsToday = new Set<string>();
  private totalPageViewsToday = 0;
  private todayStr = new Date().toISOString().slice(0, 10);
  private deviceCounts: Record<string, number> = {
    iPhone: 0,
    Android: 0,
    Desktop: 0,
    Other: 0
  };
  private streamStats = new Map<string, { name: string; views: number }>();
  private recentActivity: ActivityEvent[] = [];
  private adminPin = process.env.ADMIN_PIN || 'suhail7865';

  constructor() {
    // Cleanup inactive sessions every 30 seconds
    setInterval(() => {
      this.cleanup();
    }, 30000);
  }

  private resetDailyIfNewDay() {
    const currentDay = new Date().toISOString().slice(0, 10);
    if (currentDay !== this.todayStr) {
      this.todayStr = currentDay;
      this.uniqueVisitorsToday.clear();
      this.totalPageViewsToday = 0;
      this.deviceCounts = { iPhone: 0, Android: 0, Desktop: 0, Other: 0 };
      this.streamStats.clear();
    }
  }

  private cleanup() {
    const cutoff = Date.now() - 60000; // 60 seconds inactivity
    for (const [id, session] of this.activeSessions.entries()) {
      if (session.lastPing < cutoff) {
        this.activeSessions.delete(id);
      }
    }
  }

  private normalizeDevice(raw: string): string {
    const lower = (raw || '').toLowerCase();
    if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')) return 'iPhone';
    if (lower.includes('android')) return 'Android';
    if (lower.includes('windows') || lower.includes('mac') || lower.includes('linux')) return 'Desktop';
    return 'Other';
  }

  public recordPing(
    sessionId: string,
    payload: {
      device?: string;
      path?: string;
      streamKey?: string;
      gameName?: string;
      isInitial?: boolean;
    },
    clientIp?: string
  ) {
    this.resetDailyIfNewDay();

    const device = this.normalizeDevice(payload.device || '');
    const clientHash = `${clientIp || 'client'}_${sessionId}`;
    const isNewToday = !this.uniqueVisitorsToday.has(clientHash);

    if (isNewToday) {
      this.uniqueVisitorsToday.add(clientHash);
      this.deviceCounts[device] = (this.deviceCounts[device] || 0) + 1;
      this.addEvent({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        text: `New visitor joined on ${device}`,
        type: 'visit',
        device
      });
    }

    if (payload.isInitial) {
      this.totalPageViewsToday++;
    }

    const prevSession = this.activeSessions.get(sessionId);
    const becameWatching = payload.streamKey && (!prevSession || prevSession.streamKey !== payload.streamKey);

    if (becameWatching && payload.streamKey) {
      const gName = payload.gameName || payload.streamKey;
      const existing = this.streamStats.get(payload.streamKey) || { name: gName, views: 0 };
      existing.views += 1;
      this.streamStats.set(payload.streamKey, existing);

      this.addEvent({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        text: `Viewer started watching ${gName}`,
        type: 'watch',
        device
      });
    }

    this.activeSessions.set(sessionId, {
      lastPing: Date.now(),
      device,
      path: payload.path || '/',
      streamKey: payload.streamKey,
      gameName: payload.gameName,
      clientHash
    });
  }

  private addEvent(event: ActivityEvent) {
    this.recentActivity.unshift(event);
    if (this.recentActivity.length > 30) {
      this.recentActivity.pop();
    }
  }

  public verifyPin(pin: string): boolean {
    return (pin || '').trim() === this.adminPin;
  }

  public getStats() {
    this.cleanup();
    const now = Date.now();
    const cutoff = now - 60000;

    let liveVisitors = 0;
    let liveWatchers = 0;
    const currentWatchersByStream = new Map<string, number>();

    for (const session of this.activeSessions.values()) {
      if (session.lastPing >= cutoff) {
        liveVisitors++;
        if (session.streamKey) {
          liveWatchers++;
          const cur = currentWatchersByStream.get(session.streamKey) || 0;
          currentWatchersByStream.set(session.streamKey, cur + 1);
        }
      }
    }

    // Convert top streams to array
    const topStreams = Array.from(this.streamStats.entries()).map(([key, data]) => ({
      streamKey: key,
      name: data.name,
      totalViewsToday: data.views,
      currentWatchers: currentWatchersByStream.get(key) || 0
    })).sort((a, b) => (b.currentWatchers * 10 + b.totalViewsToday) - (a.currentWatchers * 10 + a.totalViewsToday));

    return {
      success: true,
      timestamp: now,
      serverTime: new Date().toLocaleTimeString('en-US', { hour12: true }),
      liveVisitors: Math.max(liveVisitors, 1), // At least the current admin
      liveWatchers,
      totalVisitorsToday: Math.max(this.uniqueVisitorsToday.size, 1),
      totalPageViewsToday: Math.max(this.totalPageViewsToday, 1),
      devices: this.deviceCounts,
      topStreams,
      recentActivity: this.recentActivity.slice(0, 20),
      uptimeSeconds: Math.floor(process.uptime())
    };
  }
}

export const analytics = new AnalyticsTracker();
