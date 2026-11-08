// StreamFree Basketball API & Multi-Source HLS Stream Resolver
// Multi-Source Failover Architecture with Circuit Breaking & Resilient Mirror Routing

import type { Stream, StreamsResponse } from '../types/stream.js';

interface MirrorState {
  url: string;
  healthy: boolean;
  failCount: number;
  lastFailure: number;
  latencyMs: number;
}

const MIRROR_URLS = [
  'https://streamfree.top',
  'https://strmfree.st',
  'https://strmfree.to'
];

// Active health monitoring and circuit breaker for upstream mirrors
const mirrorRegistry: Map<string, MirrorState> = new Map(
  MIRROR_URLS.map(url => [
    url,
    { url, healthy: true, failCount: 0, lastFailure: 0, latencyMs: 0 }
  ])
);

const COOLDOWN_PERIOD_MS = 45000; // 45s cooldown after failure

export function getSortedHealthyMirrors(): string[] {
  const now = Date.now();
  const mirrors = Array.from(mirrorRegistry.values());

  // Reset healthy state if cooldown expired
  for (const m of mirrors) {
    if (!m.healthy && now - m.lastFailure > COOLDOWN_PERIOD_MS) {
      m.healthy = true;
      m.failCount = 0;
    }
  }

  // Sort: healthy first, then lowest failure count, then lowest latency
  return mirrors
    .sort((a, b) => {
      if (a.healthy && !b.healthy) return -1;
      if (!a.healthy && b.healthy) return 1;
      if (a.failCount !== b.failCount) return a.failCount - b.failCount;
      return a.latencyMs - b.latencyMs;
    })
    .map(m => m.url);
}

export function recordMirrorSuccess(url: string, durationMs: number) {
  const m = mirrorRegistry.get(url);
  if (m) {
    m.healthy = true;
    m.failCount = 0;
    m.latencyMs = durationMs;
  }
}

export function recordMirrorFailure(url: string) {
  const m = mirrorRegistry.get(url);
  if (m) {
    m.failCount += 1;
    m.lastFailure = Date.now();
    if (m.failCount >= 3) {
      m.healthy = false;
      console.warn(`[MultiSource Failover] Mirror marked degraded: ${url} (fails: ${m.failCount})`);
    }
  }
}

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
  const mirrors = getSortedHealthyMirrors();
  let lastErr: any = null;

  for (const mirror of mirrors) {
    const start = Date.now();
    try {
      const url = `${mirror}${path}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s network timeout

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          ...headers,
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        recordMirrorSuccess(mirror, Date.now() - start);
        return { res, mirror };
      } else {
        recordMirrorFailure(mirror);
      }
    } catch (e) {
      recordMirrorFailure(mirror);
      lastErr = e;
    }
  }

  throw lastErr || new Error(`Failed to fetch ${path} from all multi-source mirrors`);
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
    
    // Helper to purge 540p feeds
    const filter540 = (sources: any[]) => (sources || []).filter((s: any) => !s.quality?.toLowerCase().includes('540'));

    // Add computed live status flag
    const processedStreams: Stream[] = streams.map((s) => {
      const liveSourcesFromSources = (s.sources || []).filter((src: any) => src.live === true || src.is_live === true);
      const combinedLiveSources = (Array.isArray(s.live_sources) && s.live_sources.length > 0)
        ? s.live_sources
        : liveSourcesFromSources;
      const isLive = combinedLiveSources.length > 0 || Boolean(s.is_live) || (typeof s.viewers === 'number' && s.viewers > 10);
      return {
        ...s,
        sources: filter540(s.sources),
        live_sources: filter540(combinedLiveSources),
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
      console.warn('[MultiSource Failover] Serving cached basketball streams:', err.message);
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
      const liveSourcesFromSources = (s.sources || []).filter((src: any) => src.live === true || src.is_live === true);
      const combinedLiveSources = (Array.isArray(s.live_sources) && s.live_sources.length > 0)
        ? s.live_sources
        : liveSourcesFromSources;
      const isLive = combinedLiveSources.length > 0 || Boolean(s.is_live) || (typeof s.viewers === 'number' && s.viewers > 10);
      return {
        ...s,
        league: 'NFL',
        sources: filter540(s.sources),
        live_sources: filter540(combinedLiveSources),
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
    console.error('[MultiSource Failover] getFootballStreams error:', err.message);
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
  backupBaseUrls: string[];
  workingHost: string;
  backupHosts: string[];
  qStr: string;
  expires: number;
  segmentMap?: Map<string, string>;
}

export const streamTargetMap = new Map<string, StreamTargetRecord>();

interface StreamTokenCache {
  tokens: Record<string, any>;
  workingHost: string;
  serverName: string;
  pathPrefix: string;
  isExternal?: boolean;
  externalUrl?: string;
  expires: number;
}

const tokenCacheMap = new Map<string, StreamTokenCache>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of streamTargetMap.entries()) {
      if (record.expires < now) {
        streamTargetMap.delete(key);
      }
    }
    for (const [key, tokenRec] of tokenCacheMap.entries()) {
      if (tokenRec.expires < now) {
        tokenCacheMap.delete(key);
      }
    }
  }, 300000);
}

export async function resolveHlsStream(
  streamKey: string,
  requestedQuality = '1080p',
  sportCategory: 'basketball' | 'football' = 'basketball'
): Promise<ResolvedHls> {
  let quality = requestedQuality;
  if (!quality.endsWith('p')) quality += 'p';

  const mirrors = getSortedHealthyMirrors();
  let tokens: Record<string, any> = {};
  let workingHost = '';
  let serverName = 'origin';
  let pathPrefix = '/live/';
  let isExternal = false;
  let externalUrl = '';

  const now = Date.now();
  const cachedTarget = tokenCacheMap.get(streamKey);

  if (cachedTarget && cachedTarget.expires > now && Object.keys(cachedTarget.tokens).length > 0) {
    tokens = cachedTarget.tokens;
    workingHost = cachedTarget.workingHost;
    serverName = cachedTarget.serverName;
    pathPrefix = cachedTarget.pathPrefix;
    isExternal = Boolean(cachedTarget.isExternal);
    externalUrl = cachedTarget.externalUrl || '';
  } else {
    // 1. Scrape tokens from embed page across mirrors (auto-fallback across sport categories)
    let embedRes: Response | null = null;
    let successfulMirror = mirrors[0] || 'https://streamfree.top';

    const sportCandidates: ('basketball' | 'football')[] =
      sportCategory === 'football' ? ['football', 'basketball'] : ['basketball', 'football'];

    for (const mirror of mirrors) {
      try {
        const candidateQualities = [quality, '1080p', '720p', '2160p'];
        for (const cat of sportCandidates) {
          for (const q of candidateQualities) {
            const u = `${mirror}/embed/${cat}/${streamKey}${q}`;
            const res = await fetch(u, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
              }
            });
            if (res.ok) {
              const text = await res.text();
              const match = text.match(/const\s+_0x\s*=\s*({[^;]+});/);
              if (match) {
                embedRes = res;
                tokens = JSON.parse(match[1]);
                successfulMirror = mirror;
                recordMirrorSuccess(mirror, 100);
                break;
              }
            }
          }
          if (embedRes && Object.keys(tokens).length > 0) break;
        }
        if (embedRes && Object.keys(tokens).length > 0) break;
      } catch {
        recordMirrorFailure(mirror);
      }
    }

    if (!embedRes || Object.keys(tokens).length === 0) {
      throw new Error(`Could not retrieve embed page or security tokens for ${streamKey}`);
    }

    // 2. Query stream key metadata
    let keyData: any = {};
    for (const mirror of [successfulMirror, ...mirrors.filter(m => m !== successfulMirror)]) {
      try {
        const res = await fetch(`${mirror}/get-stream-key/${streamKey}`);
        if (res.ok) {
          keyData = await res.json();
          break;
        }
      } catch {
        // continue
      }
    }

    if (keyData.is_external && keyData.external_url) {
      isExternal = true;
      externalUrl = keyData.external_url;
    }

    serverName = keyData.server_name || 'origin';
    if (serverName === 'externalcdn') {
      pathPrefix = '/live-externalcdn/';
    } else if (serverName !== 'origin') {
      pathPrefix = '/live-cdn/';
    }
    workingHost = successfulMirror;

    tokenCacheMap.set(streamKey, {
      tokens,
      workingHost,
      serverName,
      pathPrefix,
      isExternal,
      externalUrl,
      expires: now + 300000 // Cache tokens for 5 minutes
    });
  }

  if (isExternal && externalUrl) {
    return {
      isExternal: true,
      externalUrl,
      selectedQuality: quality,
      availableQualities: ['1080p', '720p'],
      m3u8Text: '',
      upstreamUrl: externalUrl
    };
  }

  const availableQualities = Object.keys(tokens).filter(q => !q.toLowerCase().includes('540'));
  let selectedQuality = quality;
  if (!tokens[selectedQuality]) {
    selectedQuality = tokens['1080p'] ? '1080p' : (tokens['720p'] ? '720p' : (tokens['2160p'] ? '2160p' : availableQualities[0]));
  }

  async function attemptM3u8(q: string) {
    const p = tokens[q];
    const v = `${streamKey}${q}`;
    const qStr = p ? `?_t=${p._t}&_e=${p._e}&_n=${p._n}` : '';

    for (const host of [workingHost, ...mirrors.filter(m => m !== workingHost)]) {
      try {
        const u = `${host}${pathPrefix}${v}/index.m3u8${qStr}`;
        const res = await fetch(u, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
          }
        });
        if (res.ok) {
          return { res, url: u, host };
        }
      } catch {
        // continue
      }
    }

    const fallbackUrl = `${workingHost}${pathPrefix}${v}/index.m3u8${qStr}`;
    const res = await fetch(fallbackUrl);
    return { res, url: fallbackUrl, host: workingHost };
  }

  let { res: m3u8Res, url: finalM3u8Url, host: activeHost } = await attemptM3u8(selectedQuality);
  if (!m3u8Res.ok && selectedQuality !== '1080p' && tokens['1080p']) {
    selectedQuality = '1080p';
    const fallback = await attemptM3u8('1080p');
    m3u8Res = fallback.res;
    finalM3u8Url = fallback.url;
    activeHost = fallback.host;
  }
  if (!m3u8Res.ok && selectedQuality !== '720p' && tokens['720p']) {
    selectedQuality = '720p';
    const fallback = await attemptM3u8('720p');
    m3u8Res = fallback.res;
    finalM3u8Url = fallback.url;
    activeHost = fallback.host;
  }

  if (!m3u8Res.ok) {
    tokenCacheMap.delete(streamKey);
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

  // STABLE DETERMINISTIC STREAM HASH: Never changes between playlist polls!
  const streamHash = Buffer.from(`${streamKey}-${selectedQuality}`).toString('hex').substring(0, 16);
  const baseUrl = `${activeHost}${pathPrefix}${variant}/`;
  const backupHosts = mirrors.filter(m => m !== activeHost);
  const backupBaseUrls = backupHosts.map(h => `${h}${pathPrefix}${variant}/`);

  // Retain existing segment map so in-flight chunks are never dropped
  const existingRecord = streamTargetMap.get(streamHash);
  const segmentMap = existingRecord?.segmentMap || new Map<string, string>();

  const m3u8Text = rawM3u8Text.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (trimmed.startsWith('#')) {
      if (trimmed.startsWith('#EXT-X-MAP:')) {
        return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
          let fullUri = uri;
          if (!fullUri.startsWith('http://') && !fullUri.startsWith('https://')) {
            try {
              fullUri = new URL(uri, baseUrl).toString();
            } catch {
              fullUri = `${baseUrl}${uri}`;
            }
          }
          const mapKey = 'init.mp4';
          segmentMap.set(mapKey, fullUri);
          return `URI="/api/stream/chunk/${streamHash}/${mapKey}"`;
        });
      }
      return line;
    }

    let fullSegmentUrl = trimmed;
    if (!fullSegmentUrl.startsWith('http://') && !fullSegmentUrl.startsWith('https://')) {
      if (fullSegmentUrl.startsWith('/')) {
        fullSegmentUrl = `${activeHost}${fullSegmentUrl}`;
      } else {
        fullSegmentUrl = `${baseUrl}${fullSegmentUrl}${qStr && !fullSegmentUrl.includes('?') ? qStr : ''}`;
      }
    }

    // Upstream CDN protocol fix: cdn*.strmfree.* nodes are HTTP-only (HTTPS throws ERR_SSL_WRONG_VERSION_NUMBER)
    if (fullSegmentUrl.includes('strmfree') && fullSegmentUrl.startsWith('https://cdn')) {
      fullSegmentUrl = fullSegmentUrl.replace('https://', 'http://');
    }

    // STABLE SEGMENT IDENTIFIER: exact segment file/token name WITHOUT dynamic s1_/s2_ prefix!
    const segKey = trimmed.split('?')[0].split('/').pop()?.replace(/[^a-zA-Z0-9_.-]/g, '') || 'chunk.ts';
    segmentMap.set(segKey, fullSegmentUrl);

    return `/api/stream/chunk/${streamHash}/${segKey}`;
  }).join('\n');

  streamTargetMap.set(streamHash, {
    baseUrl,
    backupBaseUrls,
    workingHost: activeHost,
    backupHosts,
    qStr,
    expires: Date.now() + 3600000, // 1 hour validity
    segmentMap
  });

  return {
    isExternal: false,
    selectedQuality,
    availableQualities,
    m3u8Text,
    upstreamUrl: `/api/${sportCategory}/hls/${streamKey}/${selectedQuality}.m3u8`
  };
}

// ============================================================================
// Replaceable Provider Interface & Registry
// Decouples upstream providers so provider outages never break core architecture
// ============================================================================

export interface IStreamProvider {
  readonly id: string;
  readonly name: string;
  getBasketballStreams(forceRefresh?: boolean): Promise<StreamsResponse>;
  getFootballStreams(forceRefresh?: boolean): Promise<StreamsResponse>;
  resolveHlsStream(streamKey: string, requestedQuality?: string, sportCategory?: 'basketball' | 'football'): Promise<ResolvedHls>;
  resolveStream(streamKey: string, requestedQuality?: string, sportCategory?: 'basketball' | 'football'): Promise<ResolvedHls>;
}

export class StreamFreeProvider implements IStreamProvider {
  public readonly id = 'streamfree';
  public readonly name = 'StreamFree Multi-Mirror Provider';

  public async getBasketballStreams(forceRefresh = false): Promise<StreamsResponse> {
    return getBasketballStreams(forceRefresh);
  }

  public async getFootballStreams(forceRefresh = false): Promise<StreamsResponse> {
    return getFootballStreams(forceRefresh);
  }

  public async resolveHlsStream(
    streamKey: string,
    requestedQuality = '1080p',
    sportCategory: 'basketball' | 'football' = 'basketball'
  ): Promise<ResolvedHls> {
    return resolveHlsStream(streamKey, requestedQuality, sportCategory);
  }

  public async resolveStream(
    streamKey: string,
    requestedQuality = '1080p',
    sportCategory: 'basketball' | 'football' = 'basketball'
  ): Promise<ResolvedHls> {
    return resolveHlsStream(streamKey, requestedQuality, sportCategory);
  }
}

export const activeStreamProvider: IStreamProvider = new StreamFreeProvider();
