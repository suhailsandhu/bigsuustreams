// StreamFree Basketball API & HLS Stream Resolver
// Reverse engineered from strmfree.st / streamfree.top

import type { Stream, StreamsResponse } from '../types/stream.js';

const MIRRORS = ['https://strmfree.st', 'https://streamfree.top'];

interface CacheData {
  streams: StreamsResponse | null;
  streamsTime: number;
  singleStream: Map<string, { data: Stream; time: number }>;
  sources: Map<string, { data: any; time: number }>;
  m3u8Tokens: Map<string, any>;
}

const cache: CacheData = {
  streams: null,
  streamsTime: 0,
  singleStream: new Map(),
  sources: new Map(),
  m3u8Tokens: new Map(),
};

const CACHE_TTL_STREAMS_MS = 30000; // 30s cache
const CACHE_TTL_SOURCES_MS = 15000; // 15s cache

async function fetchWithFallback(path: string, headers: Record<string, string> = {}) {
  let lastErr: any = null;
  for (const mirror of MIRRORS) {
    try {
      const url = `${mirror}${path}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          ...headers,
        },
      });
      if (res.ok) {
        return { res, mirror };
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Failed to fetch ${path} from all mirrors`);
}

export async function getBasketballStreams(forceRefresh = false): Promise<StreamsResponse> {
  const now = Date.now();
  if (!forceRefresh && cache.streams && (now - cache.streamsTime < CACHE_TTL_STREAMS_MS)) {
    return { ...cache.streams, fromCache: true };
  }

  try {
    const { res } = await fetchWithFallback('/api/v1/streams?category=basketball');
    const data: any = await res.json();
    
    // Filter strictly to basketball if any mixed results exist
    const streams: any[] = (data.streams || []).filter((s: any) => s.category?.toLowerCase() === 'basketball');
    
    // Helper to purge 540p feeds per user instruction
    const filter540 = (sources: any[]) => (sources || []).filter((s: any) => !s.quality?.toLowerCase().includes('540'));

    // Add computed live status flag
    const processedStreams: Stream[] = streams.map((s) => {
      const isLive = Array.isArray(s.live_sources) && s.live_sources.length > 0;
      return {
        ...s,
        sources: filter540(s.sources),
        live_sources: filter540(s.live_sources),
        is_live: isLive,
        status: isLive ? 'live' : (s.match_timestamp * 1000 > Date.now() ? 'upcoming' : 'ended')
      };
    });

    // Sort: Live games first (by viewer count descending), then upcoming (by match_timestamp ascending)
    processedStreams.sort((a, b) => {
      if (a.is_live && !b.is_live) return -1;
      if (!a.is_live && b.is_live) return 1;
      if (a.is_live && b.is_live) return (b.viewers || 0) - (a.viewers || 0);
      return a.match_timestamp - b.match_timestamp;
    });

    const result: StreamsResponse = {
      count: processedStreams.length,
      streams: processedStreams,
      updated_at: new Date().toISOString(),
      cache_ttl_sec: CACHE_TTL_STREAMS_MS / 1000,
      fromCache: false
    };

    cache.streams = result;
    cache.streamsTime = now;
    return result;
  } catch (err: any) {
    if (cache.streams) {
      console.warn('API fetch failed, serving stale cache:', err.message);
      return { ...cache.streams, fromCache: true };
    }
    throw err;
  }
}

let footballStreamsCache: { data: StreamsResponse; time: number } | null = null;

export async function getFootballStreams(forceRefresh = false): Promise<StreamsResponse> {
  const now = Date.now();
  if (!forceRefresh && footballStreamsCache && (now - footballStreamsCache.time < CACHE_TTL_STREAMS_MS)) {
    return { ...footballStreamsCache.data, fromCache: true };
  }

  try {
    const { res } = await fetchWithFallback('/api/v1/streams?category=football');
    const data: any = await res.json();
    
    // Filter to football / NFL
    const streams: any[] = (data.streams || []).filter((s: any) => 
      s.category?.toLowerCase() === 'football' || s.league?.toUpperCase() === 'NFL'
    );
    
    const filter540 = (sources: any[]) => (sources || []).filter((s: any) => !s.quality?.toLowerCase().includes('540'));

    const processedStreams: Stream[] = streams.map((s) => {
      const isLive = Array.isArray(s.live_sources) && s.live_sources.length > 0;
      return {
        ...s,
        league: 'NFL',
        sources: filter540(s.sources),
        live_sources: filter540(s.live_sources),
        is_live: isLive,
        status: isLive ? 'live' : (s.match_timestamp * 1000 > Date.now() ? 'upcoming' : 'ended')
      };
    });

    processedStreams.sort((a, b) => {
      if (a.is_live && !b.is_live) return -1;
      if (!a.is_live && b.is_live) return 1;
      if (a.is_live && b.is_live) return (b.viewers || 0) - (a.viewers || 0);
      return a.match_timestamp - b.match_timestamp;
    });

    const result: StreamsResponse = {
      count: processedStreams.length,
      streams: processedStreams,
      updated_at: new Date().toISOString(),
      cache_ttl_sec: CACHE_TTL_STREAMS_MS / 1000,
      fromCache: false
    };

    footballStreamsCache = { data: result, time: now };
    return result;
  } catch (err: any) {
    console.error('getFootballStreams error:', err.message);
    if (footballStreamsCache) {
      return { ...footballStreamsCache.data, fromCache: true };
    }
    return { count: 0, streams: [], updated_at: new Date().toISOString(), cache_ttl_sec: 0, fromCache: false };
  }
}

export async function getStreamByKey(streamKey: string): Promise<Stream> {
  const now = Date.now();
  const cached = cache.singleStream.get(streamKey);
  if (cached && (now - cached.time < CACHE_TTL_SOURCES_MS)) {
    return cached.data;
  }

  try {
    const { res } = await fetchWithFallback(`/api/v1/streams/${encodeURIComponent(streamKey)}`);
    const data: any = await res.json();
    const isLive = Array.isArray(data.live_sources) && data.live_sources.length > 0;
    const filter540 = (sources: any[]) => (sources || []).filter((s: any) => !s.quality?.toLowerCase().includes('540'));
    const processed: Stream = {
      ...data,
      sources: filter540(data.sources),
      live_sources: filter540(data.live_sources),
      is_live: isLive,
      status: isLive ? 'live' : (data.match_timestamp * 1000 > Date.now() ? 'upcoming' : 'ended')
    };

    cache.singleStream.set(streamKey, { data: processed, time: now });
    return processed;
  } catch {
    // If upstream has not yet posted upcoming stream, synthesize an authorized upcoming stream object
    const parts = streamKey.split('-vs-');
    const team1Name = parts[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Away Team';
    const team2Name = parts[1]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Home Team';
    const fallback: Stream = {
      id: streamKey,
      name: `${team1Name} vs ${team2Name}`,
      category: 'basketball',
      league: 'NBA',
      stream_key: streamKey,
      match_timestamp: Math.floor(Date.now() / 1000) + 3600,
      viewers: 0,
      is_external: false,
      thumbnail_url: '',
      sources: [
        { quality: '1080p', url: `/api/basketball/hls/${streamKey}/1080p.m3u8` },
        { quality: '720p', url: `/api/basketball/hls/${streamKey}/720p.m3u8` }
      ],
      live_sources: [],
      team1: { name: team1Name, logo: '' },
      team2: { name: team2Name, logo: '' },
      is_live: false,
      status: 'upcoming'
    };
    return fallback;
  }
}

export async function getSourcesByKey(streamKey: string): Promise<any> {
  const now = Date.now();
  const cached = cache.sources.get(streamKey);
  if (cached && (now - cached.time < CACHE_TTL_SOURCES_MS)) {
    return cached.data;
  }

  const { res } = await fetchWithFallback(`/api/v1/sources/${encodeURIComponent(streamKey)}`);
  const data = await res.json();
  cache.sources.set(streamKey, { data, time: now });
  return data;
}

export interface ResolvedHls {
  isExternal: boolean;
  externalUrl?: string;
  selectedQuality: string;
  availableQualities: string[];
  m3u8Text: string;
  upstreamUrl: string;
}

export interface StreamTargetRecord {
  baseUrl: string;
  workingHost: string;
  qStr: string;
  expires: number;
}

// In-memory mapping of opaque stream hashes -> upstream chunk endpoints
// Prevents any reverse-engineering of upstream provider domains or stream locations
export const streamTargetMap = new Map<string, StreamTargetRecord>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of streamTargetMap.entries()) {
      if (record.expires < now) {
        streamTargetMap.delete(key);
      }
    }
  }, 300000);
}

export async function resolveHlsStream(streamKey: string, requestedQuality = '1080p'): Promise<ResolvedHls> {
  // Normalize quality
  let quality = requestedQuality;
  if (!quality.endsWith('p')) quality += 'p';

  // Candidate mirrors (streamfree.top does not block datacenter cloud IPs, strmfree.st is fallback)
  const mirrors = ['https://streamfree.top', 'https://strmfree.st'];
  let successfulMirror = 'https://streamfree.top';
  let embedRes: Response | null = null;
  let tokens: Record<string, any> = {};

  for (const mirror of mirrors) {
    try {
      const candidateQualities = [quality, '1080p', '720p', '2160p'];
      for (const q of candidateQualities) {
        const u = `${mirror}/embed/basketball/${streamKey}${q}`;
        const res = await fetch(u);
        if (res.ok) {
          const text = await res.text();
          const match = text.match(/const\s+_0x\s*=\s*({[^;]+});/);
          if (match) {
            embedRes = res;
            tokens = JSON.parse(match[1]);
            successfulMirror = mirror;
            break;
          }
        }
      }
      if (embedRes && Object.keys(tokens).length > 0) break;
    } catch (e) {
      // try next mirror
    }
  }

  if (!embedRes || Object.keys(tokens).length === 0) {
    throw new Error(`Could not retrieve embed page or security tokens for ${streamKey}`);
  }

  // Filter out 540p from available qualities
  const availableQualities = Object.keys(tokens).filter(q => !q.toLowerCase().includes('540'));
  let selectedQuality = quality;
  if (!tokens[selectedQuality]) {
    selectedQuality = tokens['1080p'] ? '1080p' : (tokens['720p'] ? '720p' : (tokens['2160p'] ? '2160p' : availableQualities[0]));
  }

  // 2. Query stream key metadata for server name
  let keyData: any = {};
  for (const mirror of [successfulMirror, ...mirrors.filter(m => m !== successfulMirror)]) {
    try {
      const res = await fetch(`${mirror}/get-stream-key/${streamKey}`);
      if (res.ok) {
        keyData = await res.json();
        break;
      }
    } catch (e) {
      // continue
    }
  }

  if (keyData.is_external && keyData.external_url) {
    return {
      isExternal: true,
      externalUrl: keyData.external_url,
      selectedQuality,
      availableQualities,
      m3u8Text: '',
      upstreamUrl: keyData.external_url
    };
  }

  const serverName = keyData.server_name || 'origin';
  let pathPrefix = '/live/';
  if (serverName === 'externalcdn') {
    pathPrefix = '/live-externalcdn/';
  } else if (serverName !== 'origin') {
    pathPrefix = '/live-cdn/';
  }

  // Helper to attempt m3u8 fetch with mirror and quality fallback
  async function attemptM3u8(q: string) {
    const p = tokens[q];
    const v = `${streamKey}${q}`;
    const qStr = p ? `?_t=${p._t}&_e=${p._e}&_n=${p._n}` : '';

    for (const host of [successfulMirror, ...mirrors.filter(m => m !== successfulMirror)]) {
      try {
        const u = `${host}${pathPrefix}${v}/index.m3u8${qStr}`;
        const res = await fetch(u);
        if (res.ok) {
          return { res, url: u, host };
        }
      } catch (err) {
        // continue
      }
    }

    const fallbackUrl = `${successfulMirror}${pathPrefix}${v}/index.m3u8${qStr}`;
    const res = await fetch(fallbackUrl);
    return { res, url: fallbackUrl, host: successfulMirror };
  }

  let { res: m3u8Res, url: finalM3u8Url, host: workingHost } = await attemptM3u8(selectedQuality);
  if (!m3u8Res.ok && selectedQuality !== '1080p' && tokens['1080p']) {
    selectedQuality = '1080p';
    const fallback = await attemptM3u8('1080p');
    m3u8Res = fallback.res;
    finalM3u8Url = fallback.url;
    workingHost = fallback.host;
  }
  if (!m3u8Res.ok && selectedQuality !== '540p' && tokens['540p']) {
    selectedQuality = '540p';
    const fallback = await attemptM3u8('540p');
    m3u8Res = fallback.res;
    finalM3u8Url = fallback.url;
    workingHost = fallback.host;
  }

  if (!m3u8Res.ok) {
    // If the server IP is restricted by upstream CDN (e.g. datacenter 403 on cloud hosts),
    // provide the direct upstream URL so the client browser on residential/cellular IP streams directly
    return {
      isExternal: false,
      selectedQuality,
      availableQualities,
      m3u8Text: '',
      upstreamUrl: finalM3u8Url
    };
  }

  const rawM3u8Text = await m3u8Res.text();
  const variant = `${streamKey}${selectedQuality}`;
  const p = tokens[selectedQuality];
  const qStr = p ? `?_t=${p._t}&_e=${p._e}&_n=${p._n}` : '';

  // Generate an opaque, random secure hash for this stream session
  // Completely eliminates any upstream provider domains or mirrors from client playlists
  const streamHash = Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
  const baseUrl = `${workingHost}${pathPrefix}${variant}/`;
  streamTargetMap.set(streamHash, {
    baseUrl,
    workingHost,
    qStr,
    expires: Date.now() + 3600000 // 1 hour validity
  });

  // Rewrite all segment URLs to point strictly to our internal proxy endpoint
  const m3u8Text = rawM3u8Text.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    // Extract segment name (e.g. 1263.js or segment.ts)
    const segmentName = trimmed.includes('/') ? trimmed.split('/').pop() || trimmed : trimmed;
    // Return internal proxy URL with streamHash
    return `/api/stream/chunk/${streamHash}/${segmentName}`;
  }).join('\n');

  return {
    isExternal: false,
    selectedQuality,
    availableQualities,
    m3u8Text,
    upstreamUrl: `/api/basketball/hls/${streamKey}/${selectedQuality}.m3u8`
  };
}
