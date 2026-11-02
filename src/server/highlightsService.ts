// Official NBA YouTube Highlights Service for completed games

interface HighlightResult {
  videoId: string;
  title: string;
  embedUrl: string;
}

const highlightCache = new Map<string, HighlightResult>();

// In-memory feed cache for the official NBA YouTube channel
let rssCache: { videoId: string; title: string }[] = [];
let lastRssFetch = 0;

async function fetchNbaRssFeed(): Promise<{ videoId: string; title: string }[]> {
  const now = Date.now();
  if (rssCache.length > 0 && now - lastRssFetch < 120000) {
    return rssCache;
  }

  try {
    const url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWJ2lWNubArHWmf3FIHbfcQ';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return rssCache;

    const xml = await res.text();
    const items: { videoId: string; title: string }[] = [];

    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      if (idMatch && titleMatch) {
        items.push({
          videoId: idMatch[1].trim(),
          title: titleMatch[1].trim()
        });
      }
    }

    if (items.length > 0) {
      rssCache = items;
      lastRssFetch = now;
    }
    return rssCache;
  } catch (err) {
    console.warn('NBA RSS feed fetch error:', err);
    return rssCache;
  }
}

export async function getGameHighlights(
  awayTeam: string,
  homeTeam: string,
  gameDate?: string
): Promise<HighlightResult | null> {
  const cacheKey = `${awayTeam.toLowerCase()}_vs_${homeTeam.toLowerCase()}_${gameDate || ''}`;
  if (highlightCache.has(cacheKey)) {
    return highlightCache.get(cacheKey)!;
  }

  const cleanAway = awayTeam.split(' ').pop() || awayTeam; // e.g. "Celtics" from "Boston Celtics"
  const cleanHome = homeTeam.split(' ').pop() || homeTeam; // e.g. "Magic" from "Orlando Magic"

  // 1. Try matching from official NBA YouTube channel RSS feed first (fastest & most accurate)
  const rssVideos = await fetchNbaRssFeed();
  for (const v of rssVideos) {
    const upper = v.title.toUpperCase();
    const awayUpper = cleanAway.toUpperCase();
    const homeUpper = cleanHome.toUpperCase();

    if (
      upper.includes(awayUpper) &&
      upper.includes(homeUpper) &&
      (upper.includes('HIGHLIGHTS') || upper.includes('RECAP'))
    ) {
      const result: HighlightResult = {
        videoId: v.videoId,
        title: v.title,
        embedUrl: `https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`
      };
      highlightCache.set(cacheKey, result);
      return result;
    }
  }

  // 2. Fallback to searching YouTube for the official NBA game highlights
  try {
    const searchQuery = encodeURIComponent(
      `NBA ${cleanAway} at ${cleanHome} FULL GAME HIGHLIGHTS`
    );
    const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (res.ok) {
      const html = await res.text();
      // Look for videoId inside the JSON data of the search page
      const matches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"/g)];
      const valid = matches.find(m => {
        const title = m[2].toUpperCase();
        return !title.includes('#SHORTS') && (title.includes(cleanAway.toUpperCase()) || title.includes(cleanHome.toUpperCase()));
      }) || matches[0];

      if (valid) {
        const firstId = valid[1];
        const result: HighlightResult = {
          videoId: firstId,
          title: valid[2] || `${awayTeam} vs ${homeTeam} Full Game Highlights`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${firstId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`
        };
        highlightCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('YouTube search fallback error:', err);
  }

  return null;
}

export async function getNflGameHighlights(
  awayTeam: string,
  homeTeam: string,
  gameDate?: string
): Promise<HighlightResult | null> {
  const cacheKey = `nfl_${awayTeam.toLowerCase()}_vs_${homeTeam.toLowerCase()}_${gameDate || ''}`;
  if (highlightCache.has(cacheKey)) {
    return highlightCache.get(cacheKey)!;
  }

  const cleanAway = awayTeam.split(' ').pop() || awayTeam;
  const cleanHome = homeTeam.split(' ').pop() || homeTeam;

  try {
    const searchQuery = encodeURIComponent(
      `NFL "${cleanAway}" vs "${cleanHome}" game highlights full NFL`
    );
    const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (res.ok) {
      const html = await res.text();
      const matches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"/g)];
      
      // Filter out shorts and ensure full game highlights
      const valid = matches.find(m => {
        const title = m[2].toUpperCase();
        const isShort = title.includes('#SHORTS') || title.includes('SHORT');
        const hasTeams = (title.includes(cleanAway.toUpperCase()) || awayTeam.toUpperCase().split(' ').some(w => w.length > 3 && title.includes(w))) &&
                         (title.includes(cleanHome.toUpperCase()) || homeTeam.toUpperCase().split(' ').some(w => w.length > 3 && title.includes(w)));
        return !isShort && hasTeams;
      }) || matches.find(m => {
        const title = m[2].toUpperCase();
        return !title.includes('#SHORTS') && (title.includes(cleanAway.toUpperCase()) || title.includes(cleanHome.toUpperCase()));
      }) || matches[0];

      if (valid) {
        const videoId = valid[1];
        const result: HighlightResult = {
          videoId,
          title: valid[2] || `${awayTeam} at ${homeTeam} Official NFL Game Highlights`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`
        };
        highlightCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('NFL YouTube search error:', err);
  }

  return null;
}
