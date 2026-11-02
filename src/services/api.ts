import type { Stream, StreamsResponse } from '../types/stream.ts';
import type { ScoreboardResponse, GameSummaryResponse, ConferenceStandings } from '../types/scoreboard.ts';

// Client-side in-memory cache
let streamsCache: { data: StreamsResponse; timestamp: number } | null = null;
const scoreboardClientCache = new Map<string, { data: ScoreboardResponse; timestamp: number }>();
let standingsClientCache: { data: ConferenceStandings[]; timestamp: number } | null = null;
const CLIENT_CACHE_TTL_MS = 20000; // 20 seconds

// Security Helper: Attach active session token to all internal API calls
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  try {
    const token = localStorage.getItem('bigsuu_auth_token') || sessionStorage.getItem('bigsuu_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return headers;
}

export async function fetchStandings(): Promise<ConferenceStandings[]> {
  const now = Date.now();
  if (standingsClientCache && (now - standingsClientCache.timestamp < 300000)) {
    return standingsClientCache.data;
  }
  const res = await fetch('/api/basketball/standings', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load standings');
  const data = await res.json();
  standingsClientCache = { data, timestamp: now };
  return data;
}

export async function fetchScoreboard(dateStr?: string, forceRefresh = false): Promise<ScoreboardResponse> {
  const targetDate = dateStr || '';
  const now = Date.now();
  const cached = scoreboardClientCache.get(targetDate);

  if (!forceRefresh && cached && (now - cached.timestamp < CLIENT_CACHE_TTL_MS)) {
    return cached.data;
  }

  const url = `/api/basketball/scoreboard${targetDate ? `?date=${targetDate}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Scoreboard request returned HTTP ${res.status}`);
  }

  const data: ScoreboardResponse = await res.json();
  scoreboardClientCache.set(targetDate, { data, timestamp: now });
  return data;
}

export async function fetchGameSummary(eventId: string): Promise<GameSummaryResponse> {
  const url = `/api/basketball/game-summary/${encodeURIComponent(eventId)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Game summary request returned HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchNflScoreboard(dateStr?: string, forceRefresh = false): Promise<ScoreboardResponse> {
  const targetDate = dateStr || '';
  const now = Date.now();
  const cached = scoreboardClientCache.get(`nfl_${targetDate}`);

  if (!forceRefresh && cached && (now - cached.timestamp < CLIENT_CACHE_TTL_MS)) {
    return cached.data;
  }

  const url = `/api/football/scoreboard${targetDate ? `?date=${targetDate}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`NFL Scoreboard request returned HTTP ${res.status}`);
  }

  const data: ScoreboardResponse = await res.json();
  scoreboardClientCache.set(`nfl_${targetDate}`, { data, timestamp: now });
  return data;
}

export async function fetchNflGameSummary(eventId: string): Promise<GameSummaryResponse> {
  const url = `/api/football/game-summary/${encodeURIComponent(eventId)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`NFL Game summary request returned HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchBasketballStreams(forceRefresh = false): Promise<StreamsResponse> {
  const now = Date.now();
  if (!forceRefresh && streamsCache && (now - streamsCache.timestamp < CLIENT_CACHE_TTL_MS)) {
    return streamsCache.data;
  }

  const res = await fetch(`/api/basketball/streams${forceRefresh ? '?refresh=true' : ''}`, {
    headers: getAuthHeaders(),
  });
  if (res.ok) {
    const data: StreamsResponse = await res.json();
    streamsCache = { data, timestamp: now };
    return data;
  }

  if (streamsCache) {
    return streamsCache.data;
  }

  throw new Error('Unable to connect to streaming portal. Please check your credentials.');
}

export async function fetchStreamDetails(streamKey: string): Promise<Stream> {
  const res = await fetch(`/api/basketball/stream/${encodeURIComponent(streamKey)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error('Game stream not found or has concluded.');
  }
  const data = await res.json();
  const isLive = Array.isArray(data.live_sources) && data.live_sources.length > 0;
  return {
    ...data,
    is_live: isLive,
    status: isLive ? 'live' : (data.match_timestamp * 1000 > Date.now() ? 'upcoming' : 'ended')
  };
}

export function formatTipoffTime(timestampSec: number): string {
  if (!timestampSec) return 'TBD';
  const date = new Date(timestampSec * 1000);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    return `${dateStr} • ${timeStr}`;
  }
}

export function getTimeUntilTipoff(timestampSec: number): string {
  const diffMs = timestampSec * 1000 - Date.now();
  if (diffMs <= 0) return 'Tipoff in progress';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Starts in ${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `Starts in ${hours}h ${mins}m`;
  }
  return `Starts in ${mins}m`;
}
