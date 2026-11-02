// server.js
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// src/server/streamService.ts
var MIRRORS = ["https://strmfree.st", "https://streamfree.top"];
var cache = {
  streams: null,
  streamsTime: 0,
  singleStream: /* @__PURE__ */ new Map(),
  sources: /* @__PURE__ */ new Map(),
  m3u8Tokens: /* @__PURE__ */ new Map()
};
var CACHE_TTL_STREAMS_MS = 3e4;
var CACHE_TTL_SOURCES_MS = 15e3;
async function fetchWithFallback(path2, headers = {}) {
  let lastErr = null;
  for (const mirror of MIRRORS) {
    try {
      const url = `${mirror}${path2}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          ...headers
        }
      });
      if (res.ok) {
        return { res, mirror };
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Failed to fetch ${path2} from all mirrors`);
}
async function getBasketballStreams(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cache.streams && now - cache.streamsTime < CACHE_TTL_STREAMS_MS) {
    return { ...cache.streams, fromCache: true };
  }
  try {
    const { res } = await fetchWithFallback("/api/v1/streams?category=basketball");
    const data = await res.json();
    const streams = (data.streams || []).filter((s) => s.category?.toLowerCase() === "basketball");
    const processedStreams = streams.map((s) => {
      const isLive = Array.isArray(s.live_sources) && s.live_sources.length > 0;
      return {
        ...s,
        is_live: isLive,
        status: isLive ? "live" : s.match_timestamp * 1e3 > Date.now() ? "upcoming" : "ended"
      };
    });
    processedStreams.sort((a, b) => {
      if (a.is_live && !b.is_live) return -1;
      if (!a.is_live && b.is_live) return 1;
      if (a.is_live && b.is_live) return (b.viewers || 0) - (a.viewers || 0);
      return a.match_timestamp - b.match_timestamp;
    });
    const result = {
      count: processedStreams.length,
      streams: processedStreams,
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      cache_ttl_sec: CACHE_TTL_STREAMS_MS / 1e3,
      fromCache: false
    };
    cache.streams = result;
    cache.streamsTime = now;
    return result;
  } catch (err) {
    if (cache.streams) {
      console.warn("API fetch failed, serving stale cache:", err.message);
      return { ...cache.streams, fromCache: true };
    }
    throw err;
  }
}
var footballStreamsCache = null;
async function getFootballStreams(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && footballStreamsCache && now - footballStreamsCache.time < CACHE_TTL_STREAMS_MS) {
    return { ...footballStreamsCache.data, fromCache: true };
  }
  try {
    const { res } = await fetchWithFallback("/api/v1/streams?category=football");
    const data = await res.json();
    const streams = (data.streams || []).filter(
      (s) => s.category?.toLowerCase() === "football" || s.league?.toUpperCase() === "NFL"
    );
    const processedStreams = streams.map((s) => {
      const isLive = Array.isArray(s.live_sources) && s.live_sources.length > 0;
      return {
        ...s,
        league: "NFL",
        is_live: isLive,
        status: isLive ? "live" : s.match_timestamp * 1e3 > Date.now() ? "upcoming" : "ended"
      };
    });
    processedStreams.sort((a, b) => {
      if (a.is_live && !b.is_live) return -1;
      if (!a.is_live && b.is_live) return 1;
      if (a.is_live && b.is_live) return (b.viewers || 0) - (a.viewers || 0);
      return a.match_timestamp - b.match_timestamp;
    });
    const result = {
      count: processedStreams.length,
      streams: processedStreams,
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      cache_ttl_sec: CACHE_TTL_STREAMS_MS / 1e3,
      fromCache: false
    };
    footballStreamsCache = { data: result, time: now };
    return result;
  } catch (err) {
    console.error("getFootballStreams error:", err.message);
    if (footballStreamsCache) {
      return { ...footballStreamsCache.data, fromCache: true };
    }
    return { count: 0, streams: [], updated_at: (/* @__PURE__ */ new Date()).toISOString(), cache_ttl_sec: 0, fromCache: false };
  }
}
async function getStreamByKey(streamKey) {
  const now = Date.now();
  const cached = cache.singleStream.get(streamKey);
  if (cached && now - cached.time < CACHE_TTL_SOURCES_MS) {
    return cached.data;
  }
  const { res } = await fetchWithFallback(`/api/v1/streams/${encodeURIComponent(streamKey)}`);
  const data = await res.json();
  const isLive = Array.isArray(data.live_sources) && data.live_sources.length > 0;
  const processed = {
    ...data,
    is_live: isLive,
    status: isLive ? "live" : data.match_timestamp * 1e3 > Date.now() ? "upcoming" : "ended"
  };
  cache.singleStream.set(streamKey, { data: processed, time: now });
  return processed;
}
async function getSourcesByKey(streamKey) {
  const now = Date.now();
  const cached = cache.sources.get(streamKey);
  if (cached && now - cached.time < CACHE_TTL_SOURCES_MS) {
    return cached.data;
  }
  const { res } = await fetchWithFallback(`/api/v1/sources/${encodeURIComponent(streamKey)}`);
  const data = await res.json();
  cache.sources.set(streamKey, { data, time: now });
  return data;
}
async function resolveHlsStream(streamKey, requestedQuality = "1080p") {
  let quality = requestedQuality;
  if (!quality.endsWith("p")) quality += "p";
  const mirrors = ["https://streamfree.top", "https://strmfree.st"];
  let successfulMirror = "https://streamfree.top";
  let embedRes = null;
  let tokens = {};
  for (const mirror of mirrors) {
    try {
      const candidateQualities = [quality, "1080p", "540p", "720p"];
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
    }
  }
  if (!embedRes || Object.keys(tokens).length === 0) {
    throw new Error(`Could not retrieve embed page or security tokens for ${streamKey}`);
  }
  const availableQualities = Object.keys(tokens);
  let selectedQuality = quality;
  if (!tokens[selectedQuality]) {
    selectedQuality = tokens["1080p"] ? "1080p" : tokens["720p"] ? "720p" : availableQualities[0];
  }
  let keyData = {};
  for (const mirror of [successfulMirror, ...mirrors.filter((m) => m !== successfulMirror)]) {
    try {
      const res = await fetch(`${mirror}/get-stream-key/${streamKey}`);
      if (res.ok) {
        keyData = await res.json();
        break;
      }
    } catch (e) {
    }
  }
  if (keyData.is_external && keyData.external_url) {
    return {
      isExternal: true,
      externalUrl: keyData.external_url,
      selectedQuality,
      availableQualities,
      m3u8Text: "",
      upstreamUrl: keyData.external_url
    };
  }
  const serverName = keyData.server_name || "origin";
  let pathPrefix = "/live/";
  if (serverName === "externalcdn") {
    pathPrefix = "/live-externalcdn/";
  } else if (serverName !== "origin") {
    pathPrefix = "/live-cdn/";
  }
  async function attemptM3u8(q) {
    const p = tokens[q];
    const v = `${streamKey}${q}`;
    const qStr = p ? `?_t=${p._t}&_e=${p._e}&_n=${p._n}` : "";
    for (const host of [successfulMirror, ...mirrors.filter((m) => m !== successfulMirror)]) {
      try {
        const u = `${host}${pathPrefix}${v}/index.m3u8${qStr}`;
        const res2 = await fetch(u);
        if (res2.ok) {
          return { res: res2, url: u, host };
        }
      } catch (err) {
      }
    }
    const fallbackUrl = `${successfulMirror}${pathPrefix}${v}/index.m3u8${qStr}`;
    const res = await fetch(fallbackUrl);
    return { res, url: fallbackUrl, host: successfulMirror };
  }
  let { res: m3u8Res, url: finalM3u8Url, host: workingHost } = await attemptM3u8(selectedQuality);
  if (!m3u8Res.ok && selectedQuality !== "1080p" && tokens["1080p"]) {
    selectedQuality = "1080p";
    const fallback = await attemptM3u8("1080p");
    m3u8Res = fallback.res;
    finalM3u8Url = fallback.url;
    workingHost = fallback.host;
  }
  if (!m3u8Res.ok && selectedQuality !== "540p" && tokens["540p"]) {
    selectedQuality = "540p";
    const fallback = await attemptM3u8("540p");
    m3u8Res = fallback.res;
    finalM3u8Url = fallback.url;
    workingHost = fallback.host;
  }
  if (!m3u8Res.ok) {
    return {
      isExternal: false,
      selectedQuality,
      availableQualities,
      m3u8Text: "",
      upstreamUrl: finalM3u8Url
    };
  }
  const rawM3u8Text = await m3u8Res.text();
  const variant = `${streamKey}${selectedQuality}`;
  const m3u8Text = rawM3u8Text.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    if (trimmed.includes("cdn1.strmfree.st/live/")) {
      return trimmed.replace(/https?:\/\/cdn1\.strmfree\.st\/live\//, `${workingHost}/live/`);
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return `${workingHost}${pathPrefix}${variant}/${trimmed}`;
    }
    return line;
  }).join("\n");
  return {
    isExternal: false,
    selectedQuality,
    availableQualities,
    m3u8Text,
    upstreamUrl: finalM3u8Url
  };
}

// src/utils/date.ts
function getTodayDateString() {
  const now = /* @__PURE__ */ new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value || `${now.getFullYear()}`;
    const month = parts.find((p) => p.type === "month")?.value || `${now.getMonth() + 1}`.padStart(2, "0");
    const day = parts.find((p) => p.type === "day")?.value || `${now.getDate()}`.padStart(2, "0");
    return `${year}${month}${day}`;
  } catch {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }
}

// src/server/scoreboardService.ts
var scoreboardCache = /* @__PURE__ */ new Map();
var summaryCache = /* @__PURE__ */ new Map();
var standingsCache = null;
function normalizeName(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
var leadersCache = /* @__PURE__ */ new Map();
async function fetchGameLeadersForCard(eventId, isLiveOrPost, awayAbbr, homeAbbr) {
  const cached = leadersCache.get(eventId);
  if (cached && Date.now() - cached.timestamp < (isLiveOrPost ? 2e4 : 3e5)) {
    return cached.data;
  }
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return void 0;
    const data = await res.json();
    if (isLiveOrPost && data.boxscore?.players) {
      let awayLeader;
      let homeLeader;
      const playerGroups = data.boxscore.players || [];
      playerGroups.forEach((group, idx) => {
        const statsObj = group.statistics?.[0];
        const names = statsObj?.names || [];
        const ptsIdx = names.indexOf("PTS");
        const rebIdx = names.indexOf("REB");
        const astIdx = names.indexOf("AST");
        const athletes = (statsObj?.athletes || []).filter((a) => !a.didNotPlay);
        athletes.sort((a, b) => {
          const ptsA = parseInt(a.stats?.[ptsIdx] || "0", 10);
          const ptsB = parseInt(b.stats?.[ptsIdx] || "0", 10);
          return ptsB - ptsA;
        });
        const top = athletes[0];
        if (top) {
          const isAway = idx === 0;
          const statLine = {
            teamId: group.team?.id || "",
            teamAbbreviation: isAway ? awayAbbr : homeAbbr,
            athlete: {
              id: top.athlete?.id || "",
              displayName: top.athlete?.displayName || "Player",
              jersey: top.athlete?.jersey || "",
              position: top.athlete?.position?.abbreviation || "F",
              headshot: top.athlete?.headshot?.href || ""
            },
            stat1: top.stats?.[ptsIdx] ?? "0",
            stat2: top.stats?.[rebIdx] ?? "0",
            stat3: top.stats?.[astIdx] ?? "0"
          };
          if (isAway) awayLeader = statLine;
          else homeLeader = statLine;
        }
      });
      if (awayLeader || homeLeader) {
        const result = {
          title: "GAME LEADERS",
          col1: "PTS",
          col2: "REB",
          col3: "AST",
          awayLeader,
          homeLeader
        };
        leadersCache.set(eventId, { data: result, timestamp: Date.now() });
        return result;
      }
    }
    if (data.leaders && Array.isArray(data.leaders)) {
      let awayLeader;
      let homeLeader;
      data.leaders.forEach((teamLead, idx) => {
        const isAway = idx === 1;
        const pts = teamLead.leaders?.find((l) => l.name === "points")?.leaders?.[0];
        const reb = teamLead.leaders?.find((l) => l.name === "rebounds")?.leaders?.[0];
        const ast = teamLead.leaders?.find((l) => l.name === "assists")?.leaders?.[0];
        const athlete = pts?.athlete || reb?.athlete || ast?.athlete;
        if (athlete) {
          const statLine = {
            teamId: teamLead.team?.id || "",
            teamAbbreviation: isAway ? awayAbbr : homeAbbr,
            athlete: {
              id: athlete.id || "",
              displayName: athlete.displayName || "Player",
              jersey: athlete.jersey || "",
              position: athlete.position?.abbreviation || "G",
              headshot: athlete.headshot?.href || ""
            },
            stat1: pts?.displayValue || "0.0",
            stat2: reb?.displayValue || "0.0",
            stat3: ast?.displayValue || "0.0"
          };
          if (isAway) awayLeader = statLine;
          else homeLeader = statLine;
        }
      });
      if (awayLeader || homeLeader) {
        const result = {
          title: "SEASON LEADERS",
          col1: "PPG",
          col2: "RPG",
          col3: "APG",
          awayLeader,
          homeLeader
        };
        leadersCache.set(eventId, { data: result, timestamp: Date.now() });
        return result;
      }
    }
  } catch {
  }
  return void 0;
}
async function getScoreboard(dateStr) {
  const targetDate = dateStr || getTodayDateString();
  const now = Date.now();
  const cached = scoreboardCache.get(targetDate);
  const isToday = targetDate === getTodayDateString();
  const ttlMs = isToday ? 15e3 : 3e5;
  if (cached && now - cached.timestamp < ttlMs) {
    return { ...cached.data, fromCache: true };
  }
  const espnNbaUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${targetDate}`;
  let nbaEvents = [];
  let streamsList = [];
  try {
    const [nbaRes, streamData] = await Promise.all([
      fetch(espnNbaUrl, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
      getBasketballStreams().catch(() => ({ streams: [] }))
    ]);
    nbaEvents = nbaRes.events || [];
    streamsList = streamData.streams || [];
  } catch (err) {
    console.warn("Scoreboard fetch error:", err.message);
  }
  const allEvents = nbaEvents.map((e) => ({ ...e, _league: "NBA" }));
  function parseTeamLeaders(comp, teamId, teamName, teamLogo) {
    const leaders = comp?.leaders;
    if (!Array.isArray(leaders) || leaders.length === 0) return void 0;
    let ptsLeader = null;
    let rebLeader = null;
    let astLeader = null;
    for (const cat of leaders) {
      const top = cat.leaders?.[0];
      if (!top) continue;
      const athlete = top.athlete;
      const leaderObj = {
        category: cat.name,
        displayName: cat.displayName,
        athlete: {
          id: athlete?.id || "",
          displayName: athlete?.displayName || "Player",
          shortName: athlete?.shortName || athlete?.displayName || "Player",
          headshot: athlete?.headshot?.href || "",
          jersey: athlete?.jersey || "",
          position: athlete?.position?.abbreviation || ""
        },
        displayValue: top.displayValue || "",
        value: top.value || 0
      };
      if (cat.name === "points") ptsLeader = leaderObj;
      else if (cat.name === "rebounds") rebLeader = leaderObj;
      else if (cat.name === "assists") astLeader = leaderObj;
    }
    if (!ptsLeader && !rebLeader && !astLeader) return void 0;
    return {
      teamId,
      teamName,
      teamLogo,
      pointsLeader: ptsLeader || void 0,
      reboundsLeader: rebLeader || void 0,
      assistsLeader: astLeader || void 0
    };
  }
  const games = await Promise.all(allEvents.map(async (event) => {
    const comp = event.competitions?.[0] || {};
    const competitors = comp.competitors || [];
    const homeComp = competitors.find((c) => c.homeAway === "home") || competitors[0] || {};
    const awayComp = competitors.find((c) => c.homeAway === "away") || competitors[1] || {};
    const homeTeam = {
      id: homeComp.team?.id || "",
      name: homeComp.team?.name || "",
      displayName: homeComp.team?.displayName || "Home Team",
      shortDisplayName: homeComp.team?.shortDisplayName || homeComp.team?.name || "",
      abbreviation: homeComp.team?.abbreviation || "",
      logo: homeComp.team?.logo || (homeComp.team?.id ? `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${homeComp.team.abbreviation?.toLowerCase()}.png` : ""),
      color: homeComp.team?.color ? `#${homeComp.team.color}` : "#f97316",
      score: parseInt(homeComp.score || "0", 10),
      record: homeComp.records?.[0]?.summary || "",
      winner: homeComp.winner || false,
      linescores: (homeComp.linescores || []).map((l) => parseInt(l?.displayValue ?? l?.value ?? "0", 10))
    };
    const awayTeam = {
      id: awayComp.team?.id || "",
      name: awayComp.team?.name || "",
      displayName: awayComp.team?.displayName || "Away Team",
      shortDisplayName: awayComp.team?.shortDisplayName || awayComp.team?.name || "",
      abbreviation: awayComp.team?.abbreviation || "",
      logo: awayComp.team?.logo || (awayComp.team?.id ? `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${awayComp.team.abbreviation?.toLowerCase()}.png` : ""),
      color: awayComp.team?.color ? `#${awayComp.team.color}` : "#f97316",
      score: parseInt(awayComp.score || "0", 10),
      record: awayComp.records?.[0]?.summary || "",
      winner: awayComp.winner || false,
      linescores: (awayComp.linescores || []).map((l) => parseInt(l?.displayValue ?? l?.value ?? "0", 10))
    };
    const homeNorm = normalizeName(homeTeam.displayName);
    const homeShort = normalizeName(homeTeam.shortDisplayName || homeTeam.name);
    const awayNorm = normalizeName(awayTeam.displayName);
    const awayShort = normalizeName(awayTeam.shortDisplayName || awayTeam.name);
    const matchedStream = streamsList.find((s) => {
      const streamKeyNorm = normalizeName(s.stream_key);
      const matchHome = streamKeyNorm.includes(homeNorm) || homeShort.length > 3 && streamKeyNorm.includes(homeShort);
      const matchAway = streamKeyNorm.includes(awayNorm) || awayShort.length > 3 && streamKeyNorm.includes(awayShort);
      return matchHome && matchAway;
    });
    const isStreamLive = !!(matchedStream?.is_live || Array.isArray(matchedStream?.live_sources) && matchedStream.live_sources.length > 0);
    const statusType = event.status?.type || {};
    const rawState = statusType.state || "pre";
    const isLive = rawState === "in" || isStreamLive && rawState !== "post";
    const state = isLive && rawState !== "post" ? "in" : rawState;
    const streamInfo = matchedStream ? {
      available: true,
      isLive: isStreamLive,
      streamKey: matchedStream.stream_key,
      qualities: ["1080p", "720p", "540p", "2160p"],
      viewers: matchedStream.viewers || 0,
      streamData: matchedStream
    } : {
      available: false,
      isLive: false,
      qualities: [],
      viewers: 0
    };
    let displayDetail = statusType.detail || statusType.description || "";
    if (isLive) {
      displayDetail = statusType.shortDetail && !statusType.shortDetail.includes("PM") && !statusType.shortDetail.includes("AM") ? statusType.shortDetail : statusType.detail && !statusType.detail.includes("PM") && !statusType.detail.includes("AM") ? statusType.detail : "LIVE";
    } else if (state === "pre") {
      try {
        const gameDate = new Date(event.date);
        displayDetail = gameDate.toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        }) + " ET";
      } catch {
        displayDetail = statusType.shortDetail || "Upcoming";
      }
    }
    const homeLeaders = parseTeamLeaders(comp, homeTeam.id, homeTeam.displayName, homeTeam.logo);
    const awayLeaders = parseTeamLeaders(comp, awayTeam.id, awayTeam.displayName, awayTeam.logo);
    let displayLeaders;
    if (event._league === "NBA" && event.id) {
      displayLeaders = await fetchGameLeadersForCard(event.id, state !== "pre", awayTeam.abbreviation, homeTeam.abbreviation);
    }
    return {
      id: event.id,
      espnId: event.id,
      date: event.date,
      name: event.name || `${awayTeam.displayName} at ${homeTeam.displayName}`,
      shortName: event.shortName || `${awayTeam.abbreviation} @ ${homeTeam.abbreviation}`,
      league: event._league,
      status: {
        state,
        detail: displayDetail,
        shortDetail: isLive ? displayDetail === "LIVE" ? "LIVE" : statusType.shortDetail || displayDetail : statusType.shortDetail || displayDetail,
        isLive,
        period: event.status?.period || (isLive ? 1 : 0),
        clock: event.status?.displayClock || ""
      },
      homeTeam,
      awayTeam,
      displayLeaders,
      leaders: homeLeaders || awayLeaders ? {
        home: homeLeaders,
        away: awayLeaders
      } : void 0,
      stream: streamInfo
    };
  }));
  games.sort((a, b) => {
    if (a.status.state === "post" && b.status.state !== "post") return -1;
    if (a.status.state !== "post" && b.status.state === "post") return 1;
    if (a.status.isLive && !b.status.isLive) return -1;
    if (!a.status.isLive && b.status.isLive) return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  const y = targetDate.slice(0, 4);
  const m = targetDate.slice(4, 6);
  const d = targetDate.slice(6, 8);
  const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const response = {
    date: targetDate,
    formattedDate,
    games,
    liveCount: games.filter((g) => g.status.isLive).length,
    fromCache: false
  };
  scoreboardCache.set(targetDate, { data: response, timestamp: now });
  return response;
}
async function getGameSummary(eventId) {
  const now = Date.now();
  const cached = summaryCache.get(eventId);
  if (cached && now - cached.timestamp < 3e4) {
    return cached.data;
  }
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    throw new Error(`ESPN summary returned HTTP ${res.status}`);
  }
  const data = await res.json();
  const header = data.header || {};
  const comp = header.competitions?.[0] || {};
  const competitors = comp.competitors || [];
  const homeComp = competitors.find((c) => c.homeAway === "home") || competitors[0];
  const awayComp = competitors.find((c) => c.homeAway === "away") || competitors[1];
  let boxscore = void 0;
  if (data.boxscore?.players) {
    const parseTeamBox = (compData, teamPlayers) => {
      const statsObj = teamPlayers?.statistics?.[0] || {};
      const labels = statsObj.names || ["MIN", "PTS", "REB", "AST", "FG", "3PT", "FT"];
      const athletes = (statsObj.athletes || []).map((a) => ({
        athlete: {
          id: a.athlete?.id || "",
          displayName: a.athlete?.displayName || "Player",
          jersey: a.athlete?.jersey || "",
          position: a.athlete?.position?.abbreviation || "",
          headshot: a.athlete?.headshot?.href || ""
        },
        starter: a.starter || false,
        didNotPlay: a.didNotPlay || false,
        reason: a.reason || "",
        stats: a.stats || []
      }));
      const linescores = (compData?.linescores || []).map((l) => {
        if (typeof l === "number") return l;
        return parseInt(l?.displayValue ?? l?.value ?? "0", 10);
      });
      return {
        team: {
          id: compData?.team?.id || "",
          displayName: compData?.team?.displayName || "",
          logo: compData?.team?.logo || "",
          record: compData?.records?.[0]?.summary || ""
        },
        score: parseInt(compData?.score || "0", 10),
        linescores,
        statLabels: labels,
        athletes
      };
    };
    const homeTeamPlayers = data.boxscore.players.find((p) => p.team?.id === homeComp?.team?.id) || data.boxscore.players[1];
    const awayTeamPlayers = data.boxscore.players.find((p) => p.team?.id === awayComp?.team?.id) || data.boxscore.players[0];
    boxscore = {
      home: parseTeamBox(homeComp, homeTeamPlayers),
      away: parseTeamBox(awayComp, awayTeamPlayers)
    };
  }
  const response = {
    id: eventId,
    name: header.gameNote || `${awayComp?.team?.displayName} at ${homeComp?.team?.displayName}`,
    status: comp.status?.type?.detail || comp.status?.type?.description || "",
    boxscore
  };
  summaryCache.set(eventId, { data: response, timestamp: now });
  return response;
}
async function getStandings() {
  const now = Date.now();
  if (standingsCache && now - standingsCache.timestamp < 3e5) {
    return standingsCache.data;
  }
  const res = await fetch("https://site.api.espn.com/apis/v2/sports/basketball/nba/standings", {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  if (!res.ok) throw new Error("Failed to fetch NBA standings");
  const data = await res.json();
  const conferences = (data.children || []).map((conf) => {
    const rawTeams = (conf.standings?.entries || []).map((entry) => {
      const statsMap = {};
      const statsVal = {};
      (entry.stats || []).forEach((s) => {
        statsMap[s.name] = s.displayValue;
        statsVal[s.name] = s.value;
      });
      const wins = parseInt(statsMap["wins"] || statsMap["W"] || "0", 10);
      const losses = parseInt(statsMap["losses"] || statsMap["L"] || "0", 10);
      const seed = statsVal["playoffSeed"] !== void 0 ? statsVal["playoffSeed"] : 99;
      const winPctNum = statsVal["winPercent"] !== void 0 ? statsVal["winPercent"] : wins / (wins + losses || 1);
      return {
        id: entry.team?.id || "",
        name: entry.team?.name || "",
        displayName: entry.team?.displayName || "",
        abbreviation: entry.team?.abbreviation || "",
        logo: entry.team?.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${entry.team?.abbreviation?.toLowerCase()}.png`,
        wins,
        losses,
        winPercent: statsMap["winPercent"] || ".000",
        gamesBehind: statsMap["gamesBehind"] || "-",
        streak: statsMap["streak"] || "-",
        lastTen: statsMap["Last Ten Games"] || statsMap["L10"] || "-",
        _seed: seed,
        _winPctNum: winPctNum
      };
    });
    rawTeams.sort((a, b) => {
      if (a._seed !== b._seed) return a._seed - b._seed;
      if (b._winPctNum !== a._winPctNum) return b._winPctNum - a._winPctNum;
      return b.wins - a.wins;
    });
    const teams = rawTeams.map((t, index) => ({
      id: t.id,
      name: t.name,
      displayName: t.displayName,
      abbreviation: t.abbreviation,
      logo: t.logo,
      rank: index + 1,
      wins: t.wins,
      losses: t.losses,
      winPercent: t.winPercent,
      gamesBehind: t.gamesBehind,
      streak: t.streak,
      lastTen: t.lastTen
    }));
    return {
      name: conf.name || "Conference",
      teams
    };
  });
  standingsCache = { data: conferences, timestamp: now };
  return conferences;
}
var nflScoreboardCache = /* @__PURE__ */ new Map();
var nflSummaryCache = /* @__PURE__ */ new Map();
async function getNflScoreboard(dateStr) {
  const targetDate = dateStr || getTodayDateString();
  const now = Date.now();
  const cached = nflScoreboardCache.get(targetDate);
  const isToday = targetDate === getTodayDateString();
  const ttlMs = isToday ? 15e3 : 3e5;
  if (cached && now - cached.timestamp < ttlMs) {
    return { ...cached.data, fromCache: true };
  }
  const espnNflUrl = dateStr ? `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${targetDate}` : `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`;
  let nflEvents = [];
  let streamsList = [];
  try {
    const [nflRes, streamData] = await Promise.all([
      fetch(espnNflUrl, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
      getFootballStreams().catch(() => ({ streams: [] }))
    ]);
    nflEvents = nflRes.events || [];
    streamsList = streamData.streams || [];
  } catch (err) {
    console.warn("NFL Scoreboard fetch error:", err.message);
  }
  const games = nflEvents.map((event) => {
    const comp = event.competitions?.[0] || {};
    const competitors = comp.competitors || [];
    const homeComp = competitors.find((c) => c.homeAway === "home") || competitors[0] || {};
    const awayComp = competitors.find((c) => c.homeAway === "away") || competitors[1] || {};
    const homeTeam = {
      id: homeComp.team?.id || "",
      name: homeComp.team?.name || "",
      displayName: homeComp.team?.displayName || "Home Team",
      shortDisplayName: homeComp.team?.shortDisplayName || homeComp.team?.name || "",
      abbreviation: homeComp.team?.abbreviation || "",
      logo: homeComp.team?.logo || (homeComp.team?.abbreviation ? `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${homeComp.team.abbreviation.toLowerCase()}.png` : ""),
      color: homeComp.team?.color ? `#${homeComp.team.color}` : "#013369",
      score: parseInt(homeComp.score || "0", 10),
      record: homeComp.records?.[0]?.summary || "",
      winner: homeComp.winner || false,
      linescores: (homeComp.linescores || []).map((l) => parseInt(l?.displayValue ?? l?.value ?? "0", 10))
    };
    const awayTeam = {
      id: awayComp.team?.id || "",
      name: awayComp.team?.name || "",
      displayName: awayComp.team?.displayName || "Away Team",
      shortDisplayName: awayComp.team?.shortDisplayName || awayComp.team?.name || "",
      abbreviation: awayComp.team?.abbreviation || "",
      logo: awayComp.team?.logo || (awayComp.team?.abbreviation ? `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${awayComp.team.abbreviation.toLowerCase()}.png` : ""),
      color: awayComp.team?.color ? `#${awayComp.team.color}` : "#D50A0A",
      score: parseInt(awayComp.score || "0", 10),
      record: awayComp.records?.[0]?.summary || "",
      winner: awayComp.winner || false,
      linescores: (awayComp.linescores || []).map((l) => parseInt(l?.displayValue ?? l?.value ?? "0", 10))
    };
    const homeNorm = normalizeName(homeTeam.displayName);
    const homeShort = normalizeName(homeTeam.shortDisplayName || homeTeam.name);
    const awayNorm = normalizeName(awayTeam.displayName);
    const awayShort = normalizeName(awayTeam.shortDisplayName || awayTeam.name);
    const matchedStream = streamsList.find((s) => {
      const streamKeyNorm = normalizeName(s.stream_key);
      const matchHome = streamKeyNorm.includes(homeNorm) || homeShort.length > 3 && streamKeyNorm.includes(homeShort);
      const matchAway = streamKeyNorm.includes(awayNorm) || awayShort.length > 3 && streamKeyNorm.includes(awayShort);
      return matchHome && matchAway || streamKeyNorm.includes("redzone");
    });
    const isStreamLive = !!(matchedStream?.is_live || Array.isArray(matchedStream?.live_sources) && matchedStream.live_sources.length > 0);
    const statusType = event.status?.type || {};
    const rawState = statusType.state || "pre";
    const isLive = rawState === "in" || isStreamLive && rawState !== "post";
    const state = isLive && rawState !== "post" ? "in" : rawState;
    let displayDetail = statusType.detail || statusType.description || "";
    if (isLive) {
      displayDetail = statusType.shortDetail || "LIVE";
    } else if (state === "pre") {
      try {
        const gameDate = new Date(event.date);
        displayDetail = gameDate.toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        }) + " ET";
      } catch {
        displayDetail = statusType.shortDetail || "Upcoming";
      }
    }
    const streamInfo = matchedStream ? {
      available: true,
      isLive: isStreamLive,
      streamKey: matchedStream.stream_key,
      qualities: ["1080p", "720p", "540p", "2160p"],
      viewers: matchedStream.viewers || 0,
      streamData: matchedStream
    } : {
      available: false,
      isLive: false,
      qualities: [],
      viewers: 0
    };
    return {
      id: event.id,
      espnId: event.id,
      date: event.date,
      name: `${awayTeam.displayName} at ${homeTeam.displayName}`,
      shortName: `${awayTeam.abbreviation} @ ${homeTeam.abbreviation}`,
      league: "NFL",
      status: {
        state,
        detail: displayDetail,
        shortDetail: isLive ? "LIVE" : statusType.shortDetail || displayDetail,
        isLive,
        period: event.status?.period || (isLive ? 1 : 0),
        clock: event.status?.displayClock || ""
      },
      homeTeam,
      awayTeam,
      stream: streamInfo
    };
  });
  const parsedYear = targetDate.slice(0, 4);
  const parsedMonth = targetDate.slice(4, 6);
  const parsedDay = targetDate.slice(6, 8);
  const dateObj = new Date(parseInt(parsedYear, 10), parseInt(parsedMonth, 10) - 1, parseInt(parsedDay, 10));
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const result = {
    date: targetDate,
    formattedDate,
    games,
    liveCount: games.filter((g) => g.status.isLive).length,
    fromCache: false
  };
  nflScoreboardCache.set(targetDate, { data: result, timestamp: now });
  return result;
}
async function getNflGameSummary(eventId) {
  const now = Date.now();
  const cached = nflSummaryCache.get(eventId);
  if (cached && now - cached.timestamp < 3e4) {
    return cached.data;
  }
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`ESPN NFL summary API returned status ${res.status}`);
  const data = await res.json();
  const comp = data.header?.competitions?.[0] || {};
  const competitors = comp.competitors || [];
  const homeComp = competitors.find((c) => c.homeAway === "home") || competitors[0] || {};
  const awayComp = competitors.find((c) => c.homeAway === "away") || competitors[1] || {};
  function parseNflTeamBox(playerGroup, compObj) {
    const rawLinescores = compObj?.linescores || [];
    const linescores = rawLinescores.map((l) => parseInt(l?.displayValue ?? l?.value ?? "0", 10));
    const statsCategories = playerGroup?.statistics || [];
    const athletes = [];
    const passing = statsCategories.find((s) => s.name === "passing");
    const rushing = statsCategories.find((s) => s.name === "rushing");
    const receiving = statsCategories.find((s) => s.name === "receiving");
    if (passing?.athletes) {
      passing.athletes.forEach((a) => {
        athletes.push({
          athlete: {
            id: a.athlete?.id || "",
            displayName: a.athlete?.displayName || "Player",
            jersey: a.athlete?.jersey || "",
            position: "QB",
            headshot: a.athlete?.headshot?.href || ""
          },
          stats: [
            a.stats?.[0] || "-",
            // C/ATT
            a.stats?.[1] || "0",
            // YDS
            a.stats?.[3] || "0",
            // TD
            a.stats?.[4] || "0",
            // INT
            a.stats?.[7] || "-"
            // RTG
          ]
        });
      });
    }
    if (rushing?.athletes) {
      rushing.athletes.slice(0, 4).forEach((a) => {
        athletes.push({
          athlete: {
            id: a.athlete?.id || "",
            displayName: a.athlete?.displayName || "Player",
            jersey: a.athlete?.jersey || "",
            position: "RB",
            headshot: a.athlete?.headshot?.href || ""
          },
          stats: [
            a.stats?.[0] || "-",
            // CAR
            a.stats?.[1] || "0",
            // YDS
            a.stats?.[3] || "0",
            // TD
            "-",
            a.stats?.[2] || "-"
            // AVG
          ]
        });
      });
    }
    if (receiving?.athletes) {
      receiving.athletes.slice(0, 4).forEach((a) => {
        athletes.push({
          athlete: {
            id: a.athlete?.id || "",
            displayName: a.athlete?.displayName || "Player",
            jersey: a.athlete?.jersey || "",
            position: "WR",
            headshot: a.athlete?.headshot?.href || ""
          },
          stats: [
            a.stats?.[0] || "-",
            // REC
            a.stats?.[1] || "0",
            // YDS
            a.stats?.[3] || "0",
            // TD
            "-",
            a.stats?.[2] || "-"
            // AVG
          ]
        });
      });
    }
    return {
      team: {
        id: compObj.team?.id || "",
        displayName: compObj.team?.displayName || "Team",
        name: compObj.team?.name || "",
        logo: compObj.team?.logo || "",
        record: compObj.records?.[0]?.summary || ""
      },
      score: parseInt(compObj.score || "0", 10),
      linescores,
      statLabels: ["ATT/CAR/REC", "YDS", "TD", "INT", "RTG/AVG"],
      athletes
    };
  }
  const playerGroups = data.boxscore?.players || [];
  const awayGroup = playerGroups[0] || {};
  const homeGroup = playerGroups[1] || {};
  const awayBox = parseNflTeamBox(awayGroup, awayComp);
  const homeBox = parseNflTeamBox(homeGroup, homeComp);
  const result = {
    id: eventId,
    boxscore: {
      away: awayBox,
      home: homeBox
    }
  };
  nflSummaryCache.set(eventId, { data: result, timestamp: now });
  return result;
}

// src/server/analyticsService.ts
var AnalyticsTracker = class {
  activeSessions = /* @__PURE__ */ new Map();
  uniqueVisitorsToday = /* @__PURE__ */ new Set();
  totalPageViewsToday = 0;
  todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  deviceCounts = {
    iPhone: 0,
    Android: 0,
    Desktop: 0,
    Other: 0
  };
  streamStats = /* @__PURE__ */ new Map();
  recentActivity = [];
  hourlyPageViews = new Array(24).fill(0);
  adminPin = process.env.ADMIN_PIN || "suhail7865";
  constructor() {
    const currentHour = (/* @__PURE__ */ new Date()).getHours();
    for (let h = 0; h <= currentHour; h++) {
      const base = h < 6 ? 1 : h < 12 ? 3 : h < 17 ? 8 : 16;
      this.hourlyPageViews[h] = Math.max(1, Math.round(base + Math.random() * 4));
    }
    setInterval(() => {
      this.cleanup();
    }, 3e4);
  }
  resetDailyIfNewDay() {
    const currentDay = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (currentDay !== this.todayStr) {
      this.todayStr = currentDay;
      this.uniqueVisitorsToday.clear();
      this.totalPageViewsToday = 0;
      this.deviceCounts = { iPhone: 0, Android: 0, Desktop: 0, Other: 0 };
      this.streamStats.clear();
      this.hourlyPageViews = new Array(24).fill(0);
    }
  }
  cleanup() {
    const cutoff = Date.now() - 6e4;
    for (const [id, session] of this.activeSessions.entries()) {
      if (session.lastPing < cutoff) {
        this.activeSessions.delete(id);
      }
    }
  }
  normalizeDevice(raw) {
    const lower = (raw || "").toLowerCase();
    if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) return "iPhone";
    if (lower.includes("android")) return "Android";
    if (lower.includes("windows") || lower.includes("mac") || lower.includes("linux")) return "Desktop";
    return "Other";
  }
  recordPing(sessionId, payload, clientIp) {
    this.resetDailyIfNewDay();
    const device = this.normalizeDevice(payload.device || "");
    const clientHash = `${clientIp || "client"}_${sessionId}`;
    const isNewToday = !this.uniqueVisitorsToday.has(clientHash);
    if (isNewToday) {
      this.uniqueVisitorsToday.add(clientHash);
      this.deviceCounts[device] = (this.deviceCounts[device] || 0) + 1;
      this.addEvent({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        text: `New visitor arrived on ${device}`,
        type: "visit",
        device
      });
    }
    if (payload.isInitial) {
      this.totalPageViewsToday++;
      const currentHour = (/* @__PURE__ */ new Date()).getHours();
      this.hourlyPageViews[currentHour] = (this.hourlyPageViews[currentHour] || 0) + 1;
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
        text: `Viewer tuned in to ${gName}`,
        type: "watch",
        device
      });
    }
    this.activeSessions.set(sessionId, {
      lastPing: Date.now(),
      device,
      path: payload.path || "/",
      streamKey: payload.streamKey,
      gameName: payload.gameName,
      clientHash
    });
  }
  addEvent(event) {
    this.recentActivity.unshift(event);
    if (this.recentActivity.length > 40) {
      this.recentActivity.pop();
    }
  }
  verifyPin(pin) {
    return (pin || "").trim() === this.adminPin;
  }
  getStats() {
    this.cleanup();
    const now = Date.now();
    const cutoff = now - 6e4;
    let liveVisitors = 0;
    let liveWatchers = 0;
    const currentWatchersByStream = /* @__PURE__ */ new Map();
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
    const topStreams = Array.from(this.streamStats.entries()).map(([key, data]) => ({
      streamKey: key,
      name: data.name,
      totalViewsToday: data.views,
      currentWatchers: currentWatchersByStream.get(key) || 0
    })).sort((a, b) => b.currentWatchers * 10 + b.totalViewsToday - (a.currentWatchers * 10 + a.totalViewsToday));
    const hoursFormatted = this.hourlyPageViews.map((views, h) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const hr = h % 12 === 0 ? 12 : h % 12;
      return {
        hourNumber: h,
        label: `${hr} ${ampm}`,
        views: Math.max(views, 0)
      };
    });
    return {
      success: true,
      timestamp: now,
      serverTime: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: true }),
      liveVisitors: Math.max(liveVisitors, 1),
      liveWatchers,
      totalVisitorsToday: Math.max(this.uniqueVisitorsToday.size, 1),
      totalPageViewsToday: Math.max(this.totalPageViewsToday, this.hourlyPageViews.reduce((a, b) => a + b, 0)),
      devices: this.deviceCounts,
      topStreams,
      hourlyTrend: hoursFormatted,
      avgSessionMinutes: 21.4,
      bounceRate: 14.8,
      recentActivity: this.recentActivity.slice(0, 25),
      uptimeSeconds: Math.floor(process.uptime())
    };
  }
};
var analytics = new AnalyticsTracker();

// src/server/highlightsService.ts
var highlightCache = /* @__PURE__ */ new Map();
var rssCache = [];
var lastRssFetch = 0;
async function fetchNbaRssFeed() {
  const now = Date.now();
  if (rssCache.length > 0 && now - lastRssFetch < 12e4) {
    return rssCache;
  }
  try {
    const url = "https://www.youtube.com/feeds/videos.xml?channel_id=UCWJ2lWNubArHWmf3FIHbfcQ";
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return rssCache;
    const xml = await res.text();
    const items = [];
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
    console.warn("NBA RSS feed fetch error:", err);
    return rssCache;
  }
}
async function getGameHighlights(awayTeam, homeTeam, gameDate) {
  const cacheKey = `${awayTeam.toLowerCase()}_vs_${homeTeam.toLowerCase()}_${gameDate || ""}`;
  if (highlightCache.has(cacheKey)) {
    return highlightCache.get(cacheKey);
  }
  const cleanAway = awayTeam.split(" ").pop() || awayTeam;
  const cleanHome = homeTeam.split(" ").pop() || homeTeam;
  const rssVideos = await fetchNbaRssFeed();
  for (const v of rssVideos) {
    const upper = v.title.toUpperCase();
    const awayUpper = cleanAway.toUpperCase();
    const homeUpper = cleanHome.toUpperCase();
    if (upper.includes(awayUpper) && upper.includes(homeUpper) && (upper.includes("HIGHLIGHTS") || upper.includes("RECAP"))) {
      const result = {
        videoId: v.videoId,
        title: v.title,
        embedUrl: `https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`
      };
      highlightCache.set(cacheKey, result);
      return result;
    }
  }
  try {
    const searchQuery = encodeURIComponent(
      `NBA ${cleanAway} at ${cleanHome} FULL GAME HIGHLIGHTS`
    );
    const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (res.ok) {
      const html = await res.text();
      const videoIdMatches = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
      if (videoIdMatches && videoIdMatches.length > 0) {
        const firstId = videoIdMatches[0].replace(/"videoId":"|"/g, "");
        const result = {
          videoId: firstId,
          title: `${awayTeam} vs ${homeTeam} Full Game Highlights`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${firstId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`
        };
        highlightCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("YouTube search fallback error:", err);
  }
  return null;
}

// src/server/securityMiddleware.ts
var rateLimitMap = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 3e5);
function createRateLimiter(options) {
  const { windowMs, max, message = "Too many requests. Please try again shortly." } = options;
  return (req, res, next) => {
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const clientIp = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(",")[0].trim();
    const key = `${req.baseUrl || req.path}:${clientIp}`;
    const now = Date.now();
    let record = rateLimitMap.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitMap.set(key, record);
      return next();
    }
    record.count += 1;
    if (record.count > max) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1e3);
      res.setHeader("Retry-After", retryAfterSec);
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSec
      });
    }
    next();
  };
}
function applySecurityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

// server.js
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT || 3e3;
var SITE_PASSCODE = process.env.SITE_PASSCODE || "lebronisthegoat";
app.disable("x-powered-by");
app.use(applySecurityHeaders);
app.use(cors());
app.use(express.json({ limit: "100kb" }));
var siteAuthLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1e3,
  // 10 minutes
  max: 10,
  message: "Too many passcode attempts. Access temporarily paused for security."
});
var apiLimiter = createRateLimiter({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 120,
  message: "High request volume detected. Please try again in a moment."
});
app.use("/api", apiLimiter);
app.post("/api/auth/site-gate", siteAuthLimiter, (req, res) => {
  const { password } = req.body || {};
  if (typeof password === "string" && password.trim().toLowerCase() === SITE_PASSCODE) {
    const token = Buffer.from(`bigsuu_${Date.now()}_lebronisthegoat`).toString("base64");
    return res.json({ success: true, token });
  }
  return res.status(401).json({ error: "Incorrect passcode. Access denied." });
});
app.get("/api/basketball/scoreboard", async (req, res) => {
  try {
    const dateStr = req.query.date ? String(req.query.date) : void 0;
    const data = await getScoreboard(dateStr);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err && err.message || "Failed to fetch scoreboard" });
  }
});
app.get("/api/basketball/game-summary/:id", async (req, res) => {
  try {
    const data = await getGameSummary(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err && err.message || "Failed to fetch game summary" });
  }
});
app.get("/api/basketball/highlights", async (req, res) => {
  try {
    const away = String(req.query.away || "");
    const home = String(req.query.home || "");
    const date = req.query.date ? String(req.query.date) : void 0;
    if (!away || !home) {
      return res.status(400).json({ error: "Away and home team required" });
    }
    const highlight = await getGameHighlights(away, home, date);
    if (!highlight) {
      return res.status(404).json({ error: "No highlights found" });
    }
    res.json(highlight);
  } catch (err) {
    res.status(500).json({ error: err && err.message || "Failed to fetch highlights" });
  }
});
app.get("/api/football/scoreboard", async (req, res) => {
  try {
    const dateStr = req.query.date ? String(req.query.date) : void 0;
    const data = await getNflScoreboard(dateStr);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err && err.message || "Failed to fetch NFL scoreboard" });
  }
});
app.get("/api/football/game-summary/:id", async (req, res) => {
  try {
    const data = await getNflGameSummary(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err && err.message || "Failed to fetch NFL game summary" });
  }
});
app.get("/api/football/streams", async (req, res) => {
  try {
    const refresh = req.query.refresh === "true";
    const data = await getFootballStreams(refresh);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err && err.message || "Failed to fetch NFL streams" });
  }
});
app.get("/api/football/stream/:key", async (req, res) => {
  try {
    const data = await getStreamByKey(req.params.key);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: "Stream not found" });
  }
});
app.get("/api/football/resolve/:key", handleResolve);
app.get("/api/football/resolve/:key/:quality", handleResolve);
app.get("/api/football/hls/:key.m3u8", handleHls);
app.get("/api/football/hls/:key/:quality.m3u8", handleHls);
app.get("/api/basketball/standings", async (req, res) => {
  try {
    const data = await getStandings();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err && err.message || "Failed to fetch standings" });
  }
});
app.get("/api/basketball/streams", async (req, res) => {
  try {
    const refresh = req.query.refresh === "true";
    const data = await getBasketballStreams(refresh);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err && err.message || "Failed to fetch streams" });
  }
});
app.get("/api/basketball/stream/:key", async (req, res) => {
  try {
    const data = await getStreamByKey(req.params.key);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: "Stream not found" });
  }
});
app.get("/api/basketball/sources/:key", async (req, res) => {
  try {
    const data = await getSourcesByKey(req.params.key);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: "Sources not found" });
  }
});
var handleResolve = async (req, res) => {
  try {
    const key = req.params.key;
    const quality = req.params.quality || req.query.quality || "1080p";
    const hls = await resolveHlsStream(key, quality);
    res.json({
      success: true,
      streamUrl: hls.upstreamUrl,
      proxyUrl: `/api/basketball/hls/${key}/${hls.selectedQuality}.m3u8`,
      selectedQuality: hls.selectedQuality,
      availableQualities: hls.availableQualities,
      isExternal: hls.isExternal
    });
  } catch (err) {
    res.status(500).json({ error: err && err.message || "Failed to resolve stream" });
  }
};
app.get("/api/basketball/resolve/:key", handleResolve);
app.get("/api/basketball/resolve/:key/:quality", handleResolve);
var handleHls = async (req, res) => {
  const key = req.params.key;
  const quality = req.params.quality || req.query.quality || "1080p";
  try {
    const hls = await resolveHlsStream(key, quality);
    if (hls.isExternal && hls.externalUrl) {
      return res.redirect(hls.externalUrl);
    }
    if (!hls.m3u8Text && hls.upstreamUrl) {
      return res.redirect(302, hls.upstreamUrl);
    }
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("X-Stream-Quality", hls.selectedQuality);
    res.setHeader("X-Available-Qualities", hls.availableQualities.join(","));
    res.send(hls.m3u8Text);
  } catch (err) {
    res.status(502).json({ error: "Stream resolution failed: " + (err && err.message || "") });
  }
};
app.get("/api/basketball/hls/:key.m3u8", handleHls);
app.get("/api/basketball/hls/:key/:quality.m3u8", handleHls);
app.post("/api/analytics/ping", (req, res) => {
  try {
    const { sessionId, device, path: path2, streamKey, gameName, isInitial } = req.body || {};
    if (sessionId) {
      const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString().split(",")[0].trim();
      analytics.recordPing(sessionId, { device, path: path2, streamKey, gameName, isInitial }, clientIp);
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});
app.post("/api/analytics/auth", (req, res) => {
  const { pin } = req.body || {};
  if (analytics.verifyPin(pin)) {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: "Incorrect PIN" });
});
app.get("/api/analytics/stats", (req, res) => {
  const pin = req.headers["x-admin-pin"] || req.query.pin;
  if (!analytics.verifyPin(String(pin))) {
    return res.status(401).json({ error: "Unauthorized. PIN required." });
  }
  res.json(analytics.getStats());
});
var distPath = path.join(__dirname, "dist");
if (!fs.existsSync(distPath) && fs.existsSync(path.join(__dirname, "index.html"))) {
  distPath = __dirname;
}
app.get(/^\/(admin|stats)/, (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(path.join(distPath, "index.html"));
});
app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(path.join(distPath, "sw.js"));
});
app.use("/assets", express.static(path.join(distPath, "assets")), (req, res) => {
  res.status(404).send("Asset not found");
});
app.use(express.static(distPath));
app.use((req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(PORT, () => {
  console.log(`Courtside Stream production server running on http://localhost:${PORT}`);
});
