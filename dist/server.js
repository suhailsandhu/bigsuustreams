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

// server.js
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT || 3e3;
app.use(cors());
app.use(express.json());
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
var distPath = path.join(__dirname, "dist");
if (!fs.existsSync(distPath) && fs.existsSync(path.join(__dirname, "index.html"))) {
  distPath = __dirname;
}
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
