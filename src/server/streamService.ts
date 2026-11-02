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
    
    // Add computed live status flag
    const processedStreams: Stream[] = streams.map((s) => {
      const isLive = Array.isArray(s.live_sources) && s.live_sources.length > 0;
      return {
        ...s,
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

export async function getStreamByKey(streamKey: string): Promise<Stream> {
  const now = Date.now();
  const cached = cache.singleStream.get(streamKey);
  if (cached && (now - cached.time < CACHE_TTL_SOURCES_MS)) {
    return cached.data;
  }

  const { res } = await fetchWithFallback(`/api/v1/streams/${encodeURIComponent(streamKey)}`);
  const data: any = await res.json();
  const isLive = Array.isArray(data.live_sources) && data.live_sources.length > 0;
  const processed: Stream = {
    ...data,
    is_live: isLive,
    status: isLive ? 'live' : (data.match_timestamp * 1000 > Date.now() ? 'upcoming' : 'ended')
  };

  cache.singleStream.set(streamKey, { data: processed, time: now });
  return processed;
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

export async function resolveHlsStream(streamKey: string, requestedQuality = '1080p'): Promise<ResolvedHls> {
  // Normalize quality
  let quality = requestedQuality;
  if (!quality.endsWith('p')) quality += 'p';

  // 1. Fetch canonical embed page to extract security tokens (_0x)
  // Try requested quality first, then fallback to 1080p or 540p
  let embedUrl = `https://strmfree.st/embed/basketball/${streamKey}${quality}`;
  let embedRes = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    }
  });

  if (!embedRes.ok) {
    embedUrl = `https://strmfree.st/embed/basketball/${streamKey}1080p`;
    embedRes = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      }
    });
  }

  if (!embedRes.ok) {
    embedUrl = `https://strmfree.st/embed/basketball/${streamKey}540p`;
    embedRes = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      }
    });
  }

  if (!embedRes.ok) {
    throw new Error(`Embed page returned HTTP ${embedRes.status} for ${streamKey}`);
  }

  const html = await embedRes.text();
  const tokenMatch = html.match(/const\s+_0x\s*=\s*({[^;]+});/);
  if (!tokenMatch) {
    throw new Error(`Could not find security tokens (_0x) in embed page for ${streamKey}`);
  }

  const tokens = JSON.parse(tokenMatch[1]);
  const availableQualities = Object.keys(tokens);

  // If requested quality is not in tokens, fall back to best available
  let selectedQuality = quality;
  if (!tokens[selectedQuality]) {
    selectedQuality = tokens['1080p'] ? '1080p' : (tokens['720p'] ? '720p' : availableQualities[0]);
  }

  // 2. Query stream key metadata for server name
  const keyRes = await fetch(`https://strmfree.st/get-stream-key/${streamKey}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': embedUrl
    }
  });

  const keyData: any = await keyRes.json();
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

  // Helper to attempt m3u8 fetch with quality fallback
  async function attemptM3u8(q: string) {
    const p = tokens[q];
    const v = `${streamKey}${q}`;
    const qStr = p ? `?_t=${p._t}&_e=${p._e}&_n=${p._n}` : '';
    const u = `https://strmfree.st${pathPrefix}${v}/index.m3u8${qStr}`;
    const res = await fetch(u, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': embedUrl,
        'Origin': 'https://strmfree.st'
      }
    });
    return { res, url: u };
  }

  let { res: m3u8Res, url: finalM3u8Url } = await attemptM3u8(selectedQuality);
  if (!m3u8Res.ok && selectedQuality !== '1080p' && tokens['1080p']) {
    selectedQuality = '1080p';
    const fallback = await attemptM3u8('1080p');
    m3u8Res = fallback.res;
    finalM3u8Url = fallback.url;
  }
  if (!m3u8Res.ok && selectedQuality !== '540p' && tokens['540p']) {
    selectedQuality = '540p';
    const fallback = await attemptM3u8('540p');
    m3u8Res = fallback.res;
    finalM3u8Url = fallback.url;
  }

  if (!m3u8Res.ok) {
    throw new Error(`Upstream M3U8 returned HTTP ${m3u8Res.status}`);
  }

  const rawM3u8Text = await m3u8Res.text();
  const variant = `${streamKey}${selectedQuality}`;

  // Robust M3U8 Normalization:
  // 1. Rewrite broken/non-SSL CDN hosts (like cdn1.strmfree.st) to official working origin https://strmfree.st/live/
  // 2. Expand relative segment paths (e.g. 1263.js) to absolute URLs on https://strmfree.st/live/${variant}/
  const m3u8Text = rawM3u8Text.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    // Fix cdn1.strmfree.st which fails TLS handshake
    if (trimmed.includes('cdn1.strmfree.st/live/')) {
      return trimmed.replace(/https?:\/\/cdn1\.strmfree\.st\/live\//, 'https://strmfree.st/live/');
    }
    
    // Fix relative segment filenames
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://strmfree.st/live/${variant}/${trimmed}`;
    }

    return line;
  }).join('\n');

  return {
    isExternal: false,
    selectedQuality,
    availableQualities,
    m3u8Text,
    upstreamUrl: finalM3u8Url
  };
}
