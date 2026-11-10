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
  'https://strmfree.st',
  'https://streamfree.top'
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
  activeVariantSuffix: string;
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
  let activeVariantSuffix = quality;
  let rawM3u8Text = '';

  const now = Date.now();
  const cachedTarget = tokenCacheMap.get(streamKey);

  // If cached, attempt fast validation to ensure stream is actively healthy
  if (cachedTarget && cachedTarget.expires > now && Object.keys(cachedTarget.tokens).length > 0) {
    tokens = cachedTarget.tokens;
    workingHost = cachedTarget.workingHost;
    serverName = cachedTarget.serverName;
    pathPrefix = cachedTarget.pathPrefix;
    isExternal = Boolean(cachedTarget.isExternal);
    externalUrl = cachedTarget.externalUrl || '';
    activeVariantSuffix = cachedTarget.activeVariantSuffix || quality;

    if (!isExternal) {
      const qKey = activeVariantSuffix.replace(/\d+$/, '');
      const p = tokens[qKey] || tokens[quality] || Object.values(tokens)[0];
      const qStr = p ? `?_t=${p._t}&_e=${p._e}&_n=${p._n}` : '';
      const v = `${streamKey}${activeVariantSuffix}`;
      const fastUrl = `${workingHost}${pathPrefix}${v}/index.m3u8${qStr}`;
      try {
        const res = await fetch(fastUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
          }
        });
        if (res.ok) {
          const txt = await res.text();
          if (txt.includes('#EXTM3U')) {
            rawM3u8Text = txt;
          }
        }
      } catch {}
    }
  }

  // If not cached or fast validation failed, perform full multi-feed failover scan
  if (!rawM3u8Text && !isExternal) {
    // 1. Gather all candidate variant suffixes in priority order
    const candidateSuffixes: string[] = [];

    // Prioritize requested quality variants
    candidateSuffixes.push(quality, `${quality}2`, `${quality}3`);

    // Extract any explicitly broadcast variant suffixes from upstream streams registry
    try {
      const listGetter = sportCategory === 'football' ? getFootballStreams : getBasketballStreams;
      const streamsData = await listGetter().catch(() => ({ streams: [] }));
      const matchStream = (streamsData.streams || []).find((s: any) => s.stream_key === streamKey || s.id === streamKey);
      if (matchStream && Array.isArray(matchStream.sources)) {
        for (const src of matchStream.sources) {
          const u = src.url || '';
          const v = u.split('/').pop()?.split('?')[0];
          if (v && v.startsWith(streamKey)) {
            const suf = v.replace(streamKey, '');
            if (suf && !candidateSuffixes.includes(suf)) {
              candidateSuffixes.unshift(suf); // Put active live sources at the very front!
            }
          }
        }
      }
    } catch {}

    // Add standard fallbacks
    for (const fb of ['1080p', '1080p2', '1080p3', '720p', '720p2', '2160p']) {
      if (!candidateSuffixes.includes(fb)) candidateSuffixes.push(fb);
    }

    const sportCandidates: ('basketball' | 'football')[] =
      sportCategory === 'football' ? ['football', 'basketball'] : ['basketball', 'football'];

    let foundWorkingFeed = false;

    for (const suf of candidateSuffixes) {
      for (const mirror of mirrors) {
        for (const cat of sportCandidates) {
          try {
            const embedUrl = `${mirror}/embed/${cat}/${streamKey}${suf}`;
            const res = await fetch(embedUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
              }
            });
            if (!res.ok) continue;
            const html = await res.text();
            const match = html.match(/const\s+_0x\s*=\s*({[^;]+});/);
            if (!match) continue;

            const isLiveMatch = html.match(/const\s+IS_LIVE\s*=\s*([^;]+);/);
            if (isLiveMatch && isLiveMatch[1].trim() === 'false' && candidateSuffixes.indexOf(suf) < candidateSuffixes.length - 1) {
              continue; // If marked offline and we have other candidate variants, try the active feeds first
            }

            const parsedTokens = JSON.parse(match[1]);
            const qKey = suf.replace(/\d+$/, '');
            const p = parsedTokens[qKey] || parsedTokens[quality] || Object.values(parsedTokens)[0];
            const qStr = p ? `?_t=${p._t}&_e=${p._e}&_n=${p._n}` : '';

            // Query server metadata
            let keyData: any = {};
            try {
              const kRes = await fetch(`${mirror}/get-stream-key/${streamKey}`);
              if (kRes.ok) keyData = await kRes.json();
            } catch {}

            if (keyData.is_external && keyData.external_url) {
              isExternal = true;
              externalUrl = keyData.external_url;
              foundWorkingFeed = true;
              break;
            }

            const sName = keyData.server_name || 'origin';
            const prefix = sName === 'externalcdn' ? '/live-externalcdn/' : (sName !== 'origin' ? '/live-cdn/' : '/live/');

            const m3u8Url = `${mirror}${prefix}${streamKey}${suf}/index.m3u8${qStr}`;
            const m3u8Res = await fetch(m3u8Url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
              }
            });
            if (!m3u8Res.ok) continue;
            const m3u8Txt = await m3u8Res.text();

            // Strict playlist validation: MUST begin with #EXTM3U
            if (m3u8Txt.includes('#EXTM3U')) {
              tokens = parsedTokens;
              workingHost = mirror;
              serverName = sName;
              pathPrefix = prefix;
              activeVariantSuffix = suf;
              rawM3u8Text = m3u8Txt;
              foundWorkingFeed = true;
              recordMirrorSuccess(mirror, 80);
              break;
            }
          } catch {
            recordMirrorFailure(mirror);
          }
        }
        if (foundWorkingFeed) break;
      }
      if (foundWorkingFeed) break;
    }

    if (!foundWorkingFeed && !isExternal) {
      tokenCacheMap.delete(streamKey);
      throw new Error(`Could not locate active live broadcast or security tokens for ${streamKey}`);
    }

    tokenCacheMap.set(streamKey, {
      tokens,
      workingHost,
      serverName,
      pathPrefix,
      activeVariantSuffix,
      isExternal,
      externalUrl,
      expires: now + 180000 // Cache active route for 3 minutes
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

  const variant = `${streamKey}${activeVariantSuffix}`;
  const qKey = activeVariantSuffix.replace(/\d+$/, '');
  const p = tokens[qKey] || tokens[selectedQuality] || Object.values(tokens)[0];
  const qStr = p ? `?_t=${p._t}&_e=${p._e}&_n=${p._n}` : '';

  // STABLE DETERMINISTIC STREAM HASH: Never changes between playlist polls!
  const streamHash = Buffer.from(`${streamKey}-${selectedQuality}`).toString('hex').substring(0, 16);
  const baseUrl = `${workingHost}${pathPrefix}${variant}/`;
  const backupHosts = mirrors.filter(m => m !== workingHost);
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
        fullSegmentUrl = `${workingHost}${fullSegmentUrl}`;
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
    workingHost,
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
