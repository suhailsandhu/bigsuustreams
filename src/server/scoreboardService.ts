import type { 
  ScoreboardGame, ScoreboardResponse, GameSummaryResponse, CompetitorTeam, 
  TeamLeaderSummary, AthleteBoxscoreStat, GameLeadersDisplay, LeaderStatLine,
  ConferenceStandings, StandingsTeam
} from '../types/scoreboard.ts';
import { getBasketballStreams, getFootballStreams } from './streamService.ts';
import { getTodayDateString } from '../utils/date.ts';

interface ScoreboardCache {
  data: ScoreboardResponse;
  timestamp: number;
}

const scoreboardCache = new Map<string, ScoreboardCache>();
const summaryCache = new Map<string, { data: GameSummaryResponse; timestamp: number }>();
let standingsCache: { data: ConferenceStandings[]; timestamp: number } | null = null;

function normalizeName(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export { getTodayDateString };

// Quick cache for game leaders from summary
const leadersCache = new Map<string, { data: GameLeadersDisplay; timestamp: number }>();

async function fetchGameLeadersForCard(eventId: string, isLiveOrPost: boolean, awayAbbr: string, homeAbbr: string): Promise<GameLeadersDisplay | undefined> {
  const cached = leadersCache.get(eventId);
  if (cached && (Date.now() - cached.timestamp < (isLiveOrPost ? 20000 : 300000))) {
    return cached.data;
  }

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return undefined;
    const data: any = await res.json();

    if (isLiveOrPost && data.boxscore?.players) {
      // Extract top scorers for each team from boxscore
      let awayLeader: LeaderStatLine | undefined;
      let homeLeader: LeaderStatLine | undefined;

      const playerGroups = data.boxscore.players || [];
      playerGroups.forEach((group: any, idx: number) => {
        const statsObj = group.statistics?.[0];
        const names = statsObj?.names || [];
        const ptsIdx = names.indexOf('PTS');
        const rebIdx = names.indexOf('REB');
        const astIdx = names.indexOf('AST');

        const athletes = (statsObj?.athletes || []).filter((a: any) => !a.didNotPlay);
        athletes.sort((a: any, b: any) => {
          const ptsA = parseInt(a.stats?.[ptsIdx] || '0', 10);
          const ptsB = parseInt(b.stats?.[ptsIdx] || '0', 10);
          return ptsB - ptsA;
        });

        const top = athletes[0];
        if (top) {
          const isAway = idx === 0;
          const statLine: LeaderStatLine = {
            teamId: group.team?.id || '',
            teamAbbreviation: isAway ? awayAbbr : homeAbbr,
            athlete: {
              id: top.athlete?.id || '',
              displayName: top.athlete?.displayName || 'Player',
              jersey: top.athlete?.jersey || '',
              position: top.athlete?.position?.abbreviation || 'F',
              headshot: top.athlete?.headshot?.href || ''
            },
            stat1: top.stats?.[ptsIdx] ?? '0',
            stat2: top.stats?.[rebIdx] ?? '0',
            stat3: top.stats?.[astIdx] ?? '0'
          };

          if (isAway) awayLeader = statLine;
          else homeLeader = statLine;
        }
      });

      if (awayLeader || homeLeader) {
        const result: GameLeadersDisplay = {
          title: 'GAME LEADERS',
          col1: 'PTS',
          col2: 'REB',
          col3: 'AST',
          awayLeader,
          homeLeader
        };
        leadersCache.set(eventId, { data: result, timestamp: Date.now() });
        return result;
      }
    }

    // Season Leaders for scheduled / pregame games
    if (data.leaders && Array.isArray(data.leaders)) {
      let awayLeader: LeaderStatLine | undefined;
      let homeLeader: LeaderStatLine | undefined;

      data.leaders.forEach((teamLead: any, idx: number) => {
        const isAway = idx === 1; // ESPN usually orders home first in summary leaders
        const pts = teamLead.leaders?.find((l: any) => l.name === 'points')?.leaders?.[0];
        const reb = teamLead.leaders?.find((l: any) => l.name === 'rebounds')?.leaders?.[0];
        const ast = teamLead.leaders?.find((l: any) => l.name === 'assists')?.leaders?.[0];

        const athlete = pts?.athlete || reb?.athlete || ast?.athlete;
        if (athlete) {
          const statLine: LeaderStatLine = {
            teamId: teamLead.team?.id || '',
            teamAbbreviation: isAway ? awayAbbr : homeAbbr,
            athlete: {
              id: athlete.id || '',
              displayName: athlete.displayName || 'Player',
              jersey: athlete.jersey || '',
              position: athlete.position?.abbreviation || 'G',
              headshot: athlete.headshot?.href || ''
            },
            stat1: pts?.displayValue || '0.0',
            stat2: reb?.displayValue || '0.0',
            stat3: ast?.displayValue || '0.0'
          };

          if (isAway) awayLeader = statLine;
          else homeLeader = statLine;
        }
      });

      if (awayLeader || homeLeader) {
        const result: GameLeadersDisplay = {
          title: 'SEASON LEADERS',
          col1: 'PPG',
          col2: 'RPG',
          col3: 'APG',
          awayLeader,
          homeLeader
        };
        leadersCache.set(eventId, { data: result, timestamp: Date.now() });
        return result;
      }
    }
  } catch {
    // Graceful fallback
  }

  return undefined;
}

export async function getScoreboard(dateStr?: string): Promise<ScoreboardResponse> {
  const targetDate = dateStr || getTodayDateString();
  const now = Date.now();
  const cached = scoreboardCache.get(targetDate);
  const isToday = targetDate === getTodayDateString();
  const ttlMs = isToday ? 15000 : 300000; // 15s for today, 5min for past/future

  if (cached && (now - cached.timestamp < ttlMs)) {
    return { ...cached.data, fromCache: true };
  }

  // 1. Fetch ESPN NBA Scoreboard
  const espnNbaUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${targetDate}`;

  let nbaEvents: any[] = [];
  let streamsList: any[] = [];

  try {
    const [nbaRes, streamData] = await Promise.all([
      fetch(espnNbaUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
      getBasketballStreams().catch(() => ({ streams: [] })),
    ]);

    nbaEvents = (nbaRes as any).events || [];
    streamsList = (streamData as any).streams || [];
  } catch (err: any) {
    console.warn('Scoreboard fetch error:', err.message);
  }

  // NBA Only - NCAA excluded per user instruction
  const allEvents = nbaEvents.map(e => ({ ...e, _league: 'NBA' as const }));

  // Helper to parse leaders from competition
  function parseTeamLeaders(comp: any, teamId: string, teamName: string, teamLogo: string): TeamLeaderSummary | undefined {
    const leaders = comp?.leaders;
    if (!Array.isArray(leaders) || leaders.length === 0) return undefined;

    let ptsLeader: any = null;
    let rebLeader: any = null;
    let astLeader: any = null;

    for (const cat of leaders) {
      const top = cat.leaders?.[0];
      if (!top) continue;

      const athlete = top.athlete;
      const leaderObj = {
        category: cat.name as any,
        displayName: cat.displayName,
        athlete: {
          id: athlete?.id || '',
          displayName: athlete?.displayName || 'Player',
          shortName: athlete?.shortName || athlete?.displayName || 'Player',
          headshot: athlete?.headshot?.href || '',
          jersey: athlete?.jersey || '',
          position: athlete?.position?.abbreviation || ''
        },
        displayValue: top.displayValue || '',
        value: top.value || 0
      };

      if (cat.name === 'points') ptsLeader = leaderObj;
      else if (cat.name === 'rebounds') rebLeader = leaderObj;
      else if (cat.name === 'assists') astLeader = leaderObj;
    }

    if (!ptsLeader && !rebLeader && !astLeader) return undefined;

    return {
      teamId,
      teamName,
      teamLogo,
      pointsLeader: ptsLeader || undefined,
      reboundsLeader: rebLeader || undefined,
      assistsLeader: astLeader || undefined,
    };
  }

  // 2. Transform ESPN events into clean ScoreboardGame objects
  const games: ScoreboardGame[] = await Promise.all(allEvents.map(async (event: any) => {
    const comp = event.competitions?.[0] || {};
    const competitors = comp.competitors || [];
    const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0] || {};
    const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1] || {};

    const homeTeam: CompetitorTeam = {
      id: homeComp.team?.id || '',
      name: homeComp.team?.name || '',
      displayName: homeComp.team?.displayName || 'Home Team',
      shortDisplayName: homeComp.team?.shortDisplayName || homeComp.team?.name || '',
      abbreviation: homeComp.team?.abbreviation || '',
      logo: homeComp.team?.logo || (homeComp.team?.id ? `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${homeComp.team.abbreviation?.toLowerCase()}.png` : ''),
      color: homeComp.team?.color ? `#${homeComp.team.color}` : '#f97316',
      score: parseInt(homeComp.score || '0', 10),
      record: homeComp.records?.[0]?.summary || '',
      winner: homeComp.winner || false,
      linescores: (homeComp.linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? '0', 10))
    };

    const awayTeam: CompetitorTeam = {
      id: awayComp.team?.id || '',
      name: awayComp.team?.name || '',
      displayName: awayComp.team?.displayName || 'Away Team',
      shortDisplayName: awayComp.team?.shortDisplayName || awayComp.team?.name || '',
      abbreviation: awayComp.team?.abbreviation || '',
      logo: awayComp.team?.logo || (awayComp.team?.id ? `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${awayComp.team.abbreviation?.toLowerCase()}.png` : ''),
      color: awayComp.team?.color ? `#${awayComp.team.color}` : '#f97316',
      score: parseInt(awayComp.score || '0', 10),
      record: awayComp.records?.[0]?.summary || '',
      winner: awayComp.winner || false,
      linescores: (awayComp.linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? '0', 10))
    };

    // 3. Match with Streams
    const homeNorm = normalizeName(homeTeam.displayName);
    const homeShort = normalizeName(homeTeam.shortDisplayName || homeTeam.name);
    const awayNorm = normalizeName(awayTeam.displayName);
    const awayShort = normalizeName(awayTeam.shortDisplayName || awayTeam.name);

    const matchedStream = streamsList.find((s: any) => {
      const streamKeyNorm = normalizeName(s.stream_key);
      const matchHome = streamKeyNorm.includes(homeNorm) || (homeShort.length > 3 && streamKeyNorm.includes(homeShort));
      const matchAway = streamKeyNorm.includes(awayNorm) || (awayShort.length > 3 && streamKeyNorm.includes(awayShort));
      return matchHome && matchAway;
    });

    const isStreamLive = !!(matchedStream?.is_live || (Array.isArray(matchedStream?.live_sources) && matchedStream.live_sources.length > 0));

    const statusType = event.status?.type || {};
    const rawState = (statusType.state || 'pre') as 'pre' | 'in' | 'post';
    const isLive = rawState === 'in' || (isStreamLive && (rawState as string) !== 'post');
    const state: 'pre' | 'in' | 'post' = (isLive && (rawState as string) !== 'post') ? 'in' : rawState;

    const streamInfo = matchedStream ? {
      available: true,
      isLive: isStreamLive,
      streamKey: matchedStream.stream_key,
      qualities: ['1080p', '720p', '540p', '2160p'],
      viewers: matchedStream.viewers || 0,
      streamData: matchedStream
    } : {
      available: false,
      isLive: false,
      qualities: [],
      viewers: 0
    };

    // Format tipoff time for center display (US Eastern fallback if server is UTC)
    let displayDetail = statusType.detail || statusType.description || '';
    if (isLive) {
      displayDetail = statusType.shortDetail && !statusType.shortDetail.includes('PM') && !statusType.shortDetail.includes('AM') 
        ? statusType.shortDetail 
        : (statusType.detail && !statusType.detail.includes('PM') && !statusType.detail.includes('AM') ? statusType.detail : 'LIVE');
    } else if (state === 'pre') {
      try {
        const gameDate = new Date(event.date);
        displayDetail = gameDate.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) + ' ET';
      } catch {
        displayDetail = statusType.shortDetail || 'Upcoming';
      }
    }

    // Game leaders from competition
    const homeLeaders = parseTeamLeaders(comp, homeTeam.id, homeTeam.displayName, homeTeam.logo);
    const awayLeaders = parseTeamLeaders(comp, awayTeam.id, awayTeam.displayName, awayTeam.logo);

    // 4. Fetch rich game leaders (PTS, REB, AST) for NBA games
    let displayLeaders: GameLeadersDisplay | undefined;
    if (event._league === 'NBA' && event.id) {
      displayLeaders = await fetchGameLeadersForCard(event.id, state !== 'pre', awayTeam.abbreviation, homeTeam.abbreviation);
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
        shortDetail: isLive ? (displayDetail === 'LIVE' ? 'LIVE' : (statusType.shortDetail || displayDetail)) : (statusType.shortDetail || displayDetail),
        isLive,
        period: event.status?.period || (isLive ? 1 : 0),
        clock: event.status?.displayClock || ''
      },
      homeTeam,
      awayTeam,
      displayLeaders,
      leaders: (homeLeaders || awayLeaders) ? {
        home: homeLeaders,
        away: awayLeaders
      } : undefined,
      stream: streamInfo
    };
  }));

  // Sort: Finished games at the top (past games), then Live games, then Upcoming games
  games.sort((a, b) => {
    if (a.status.state === 'post' && b.status.state !== 'post') return -1;
    if (a.status.state !== 'post' && b.status.state === 'post') return 1;
    if (a.status.isLive && !b.status.isLive) return -1;
    if (!a.status.isLive && b.status.isLive) return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Format readable date
  const y = targetDate.slice(0, 4);
  const m = targetDate.slice(4, 6);
  const d = targetDate.slice(6, 8);
  const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const response: ScoreboardResponse = {
    date: targetDate,
    formattedDate,
    games,
    liveCount: games.filter(g => g.status.isLive).length,
    fromCache: false
  };

  scoreboardCache.set(targetDate, { data: response, timestamp: now });
  return response;
}

export async function getGameSummary(eventId: string): Promise<GameSummaryResponse> {
  const now = Date.now();
  const cached = summaryCache.get(eventId);
  if (cached && (now - cached.timestamp < 30000)) {
    return cached.data;
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    throw new Error(`ESPN summary returned HTTP ${res.status}`);
  }

  const data: any = await res.json();
  const header = data.header || {};
  const comp = header.competitions?.[0] || {};
  const competitors = comp.competitors || [];
  const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
  const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

  let boxscore: any = undefined;
  if (data.boxscore?.players) {
    const parseTeamBox = (compData: any, teamPlayers: any) => {
      const statsObj = teamPlayers?.statistics?.[0] || {};
      const labels = statsObj.names || ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT'];
      const athletes: AthleteBoxscoreStat[] = (statsObj.athletes || []).map((a: any) => ({
        athlete: {
          id: a.athlete?.id || '',
          displayName: a.athlete?.displayName || 'Player',
          jersey: a.athlete?.jersey || '',
          position: a.athlete?.position?.abbreviation || '',
          headshot: a.athlete?.headshot?.href || ''
        },
        starter: a.starter || false,
        didNotPlay: a.didNotPlay || false,
        reason: a.reason || '',
        stats: a.stats || []
      }));

      const linescores = (compData?.linescores || []).map((l: any) => {
        if (typeof l === 'number') return l;
        return parseInt(l?.displayValue ?? l?.value ?? '0', 10);
      });

      return {
        team: {
          id: compData?.team?.id || '',
          displayName: compData?.team?.displayName || '',
          logo: compData?.team?.logo || '',
          record: compData?.records?.[0]?.summary || ''
        },
        score: parseInt(compData?.score || '0', 10),
        linescores,
        statLabels: labels,
        athletes
      };
    };

    const homeTeamPlayers = data.boxscore.players.find((p: any) => p.team?.id === homeComp?.team?.id) || data.boxscore.players[1];
    const awayTeamPlayers = data.boxscore.players.find((p: any) => p.team?.id === awayComp?.team?.id) || data.boxscore.players[0];

    boxscore = {
      home: parseTeamBox(homeComp, homeTeamPlayers),
      away: parseTeamBox(awayComp, awayTeamPlayers)
    };
  }

  const response: GameSummaryResponse = {
    id: eventId,
    name: header.gameNote || `${awayComp?.team?.displayName} at ${homeComp?.team?.displayName}`,
    status: comp.status?.type?.detail || comp.status?.type?.description || '',
    boxscore
  };

  summaryCache.set(eventId, { data: response, timestamp: now });
  return response;
}

export async function getStandings(): Promise<ConferenceStandings[]> {
  const now = Date.now();
  if (standingsCache && (now - standingsCache.timestamp < 300000)) {
    return standingsCache.data;
  }

  const res = await fetch('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!res.ok) throw new Error('Failed to fetch NBA standings');

  const data: any = await res.json();
  const conferences: ConferenceStandings[] = (data.children || []).map((conf: any) => {
    const rawTeams = (conf.standings?.entries || []).map((entry: any) => {
      const statsMap: Record<string, string> = {};
      const statsVal: Record<string, number> = {};
      (entry.stats || []).forEach((s: any) => {
        statsMap[s.name] = s.displayValue;
        statsVal[s.name] = s.value;
      });

      const wins = parseInt(statsMap['wins'] || statsMap['W'] || '0', 10);
      const losses = parseInt(statsMap['losses'] || statsMap['L'] || '0', 10);
      const seed = statsVal['playoffSeed'] !== undefined ? statsVal['playoffSeed'] : 99;
      const winPctNum = statsVal['winPercent'] !== undefined ? statsVal['winPercent'] : (wins / (wins + losses || 1));

      return {
        id: entry.team?.id || '',
        name: entry.team?.name || '',
        displayName: entry.team?.displayName || '',
        abbreviation: entry.team?.abbreviation || '',
        logo: entry.team?.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${entry.team?.abbreviation?.toLowerCase()}.png`,
        wins,
        losses,
        winPercent: statsMap['winPercent'] || '.000',
        gamesBehind: statsMap['gamesBehind'] || '-',
        streak: statsMap['streak'] || '-',
        lastTen: statsMap['Last Ten Games'] || statsMap['L10'] || '-',
        _seed: seed,
        _winPctNum: winPctNum
      };
    });

    // Sort by playoffSeed ascending (1st place to 15th place)
    rawTeams.sort((a: any, b: any) => {
      if (a._seed !== b._seed) return a._seed - b._seed;
      if (b._winPctNum !== a._winPctNum) return b._winPctNum - a._winPctNum;
      return b.wins - a.wins;
    });

    const teams: StandingsTeam[] = rawTeams.map((t: any, index: number) => ({
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
      name: conf.name || 'Conference',
      teams
    };
  });

  standingsCache = { data: conferences, timestamp: now };
  return conferences;
}

// ============================================================================
// NFL SCOREBOARD & GAME SUMMARY (Football Support)
// ============================================================================

const nflScoreboardCache = new Map<string, { data: ScoreboardResponse; timestamp: number }>();
const nflSummaryCache = new Map<string, { data: GameSummaryResponse; timestamp: number }>();

export async function getNflScoreboard(dateStr?: string): Promise<ScoreboardResponse> {
  const targetDate = dateStr || getTodayDateString();
  const now = Date.now();
  const cached = nflScoreboardCache.get(targetDate);
  const isToday = targetDate === getTodayDateString();
  const ttlMs = isToday ? 15000 : 300000;

  if (cached && (now - cached.timestamp < ttlMs)) {
    return { ...cached.data, fromCache: true };
  }

  const espnNflUrl = dateStr 
    ? `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${targetDate}`
    : `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`;

  let nflEvents: any[] = [];
  let streamsList: any[] = [];

  try {
    const [nflRes, streamData] = await Promise.all([
      fetch(espnNflUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
      getFootballStreams().catch(() => ({ streams: [] }))
    ]);

    nflEvents = (nflRes as any).events || [];
    streamsList = (streamData as any).streams || [];
  } catch (err: any) {
    console.warn('NFL Scoreboard fetch error:', err.message);
  }

  const games: ScoreboardGame[] = nflEvents.map((event: any) => {
    const comp = event.competitions?.[0] || {};
    const competitors = comp.competitors || [];
    const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0] || {};
    const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1] || {};

    const homeTeam: CompetitorTeam = {
      id: homeComp.team?.id || '',
      name: homeComp.team?.name || '',
      displayName: homeComp.team?.displayName || 'Home Team',
      shortDisplayName: homeComp.team?.shortDisplayName || homeComp.team?.name || '',
      abbreviation: homeComp.team?.abbreviation || '',
      logo: homeComp.team?.logo || (homeComp.team?.abbreviation ? `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${homeComp.team.abbreviation.toLowerCase()}.png` : ''),
      color: homeComp.team?.color ? `#${homeComp.team.color}` : '#013369',
      score: parseInt(homeComp.score || '0', 10),
      record: homeComp.records?.[0]?.summary || '',
      winner: homeComp.winner || false,
      linescores: (homeComp.linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? '0', 10))
    };

    const awayTeam: CompetitorTeam = {
      id: awayComp.team?.id || '',
      name: awayComp.team?.name || '',
      displayName: awayComp.team?.displayName || 'Away Team',
      shortDisplayName: awayComp.team?.shortDisplayName || awayComp.team?.name || '',
      abbreviation: awayComp.team?.abbreviation || '',
      logo: awayComp.team?.logo || (awayComp.team?.abbreviation ? `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${awayComp.team.abbreviation.toLowerCase()}.png` : ''),
      color: awayComp.team?.color ? `#${awayComp.team.color}` : '#D50A0A',
      score: parseInt(awayComp.score || '0', 10),
      record: awayComp.records?.[0]?.summary || '',
      winner: awayComp.winner || false,
      linescores: (awayComp.linescores || []).map((l: any) => parseInt(l?.displayValue ?? l?.value ?? '0', 10))
    };

    const homeNorm = normalizeName(homeTeam.displayName);
    const homeShort = normalizeName(homeTeam.shortDisplayName || homeTeam.name);
    const awayNorm = normalizeName(awayTeam.displayName);
    const awayShort = normalizeName(awayTeam.shortDisplayName || awayTeam.name);

    const matchedStream = streamsList.find((s: any) => {
      const streamKeyNorm = normalizeName(s.stream_key);
      const matchHome = streamKeyNorm.includes(homeNorm) || (homeShort.length > 3 && streamKeyNorm.includes(homeShort));
      const matchAway = streamKeyNorm.includes(awayNorm) || (awayShort.length > 3 && streamKeyNorm.includes(awayShort));
      return (matchHome && matchAway) || streamKeyNorm.includes('redzone');
    });

    const isStreamLive = !!(matchedStream?.is_live || (Array.isArray(matchedStream?.live_sources) && matchedStream.live_sources.length > 0));
    const statusType = event.status?.type || {};
    const rawState = (statusType.state || 'pre') as 'pre' | 'in' | 'post';
    const isLive = rawState === 'in' || (isStreamLive && (rawState as string) !== 'post');
    const state: 'pre' | 'in' | 'post' = (isLive && (rawState as string) !== 'post') ? 'in' : rawState;

    let displayDetail = statusType.detail || statusType.description || '';
    if (isLive) {
      displayDetail = statusType.shortDetail || 'LIVE';
    } else if (state === 'pre') {
      try {
        const gameDate = new Date(event.date);
        displayDetail = gameDate.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) + ' ET';
      } catch {
        displayDetail = statusType.shortDetail || 'Upcoming';
      }
    }

    const streamInfo = matchedStream ? {
      available: true,
      isLive: isStreamLive,
      streamKey: matchedStream.stream_key,
      qualities: ['1080p', '720p', '540p', '2160p'],
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
      league: 'NFL',
      status: {
        state,
        detail: displayDetail,
        shortDetail: isLive ? 'LIVE' : (statusType.shortDetail || displayDetail),
        isLive,
        period: event.status?.period || (isLive ? 1 : 0),
        clock: event.status?.displayClock || ''
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
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const result: ScoreboardResponse = {
    date: targetDate,
    formattedDate,
    games,
    liveCount: games.filter(g => g.status.isLive).length,
    fromCache: false
  };

  nflScoreboardCache.set(targetDate, { data: result, timestamp: now });
  return result;
}

export async function getNflGameSummary(eventId: string): Promise<GameSummaryResponse> {
  const now = Date.now();
  const cached = nflSummaryCache.get(eventId);
  if (cached && (now - cached.timestamp < 30000)) {
    return cached.data;
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`ESPN NFL summary API returned status ${res.status}`);
  const data: any = await res.json();

  const comp = data.header?.competitions?.[0] || {};
  const competitors = comp.competitors || [];
  const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0] || {};
  const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1] || {};

  function parseNflTeamBox(playerGroup: any, compObj: any) {
    const rawLinescores = compObj?.linescores || [];
    const linescores = rawLinescores.map((l: any) => parseInt(l?.displayValue ?? l?.value ?? '0', 10));
    const statsCategories = playerGroup?.statistics || [];

    // Parse top offensive football players
    const athletes: AthleteBoxscoreStat[] = [];
    const passing = statsCategories.find((s: any) => s.name === 'passing');
    const rushing = statsCategories.find((s: any) => s.name === 'rushing');
    const receiving = statsCategories.find((s: any) => s.name === 'receiving');

    if (passing?.athletes) {
      passing.athletes.forEach((a: any) => {
        athletes.push({
          athlete: {
            id: a.athlete?.id || '',
            displayName: a.athlete?.displayName || 'Player',
            jersey: a.athlete?.jersey || '',
            position: 'QB',
            headshot: a.athlete?.headshot?.href || ''
          },
          stats: [
            a.stats?.[0] || '-', // C/ATT
            a.stats?.[1] || '0', // YDS
            a.stats?.[3] || '0', // TD
            a.stats?.[4] || '0', // INT
            a.stats?.[7] || '-'  // RTG
          ]
        });
      });
    }

    if (rushing?.athletes) {
      rushing.athletes.slice(0, 4).forEach((a: any) => {
        athletes.push({
          athlete: {
            id: a.athlete?.id || '',
            displayName: a.athlete?.displayName || 'Player',
            jersey: a.athlete?.jersey || '',
            position: 'RB',
            headshot: a.athlete?.headshot?.href || ''
          },
          stats: [
            a.stats?.[0] || '-', // CAR
            a.stats?.[1] || '0', // YDS
            a.stats?.[3] || '0', // TD
            '-',
            a.stats?.[2] || '-'  // AVG
          ]
        });
      });
    }

    if (receiving?.athletes) {
      receiving.athletes.slice(0, 4).forEach((a: any) => {
        athletes.push({
          athlete: {
            id: a.athlete?.id || '',
            displayName: a.athlete?.displayName || 'Player',
            jersey: a.athlete?.jersey || '',
            position: 'WR',
            headshot: a.athlete?.headshot?.href || ''
          },
          stats: [
            a.stats?.[0] || '-', // REC
            a.stats?.[1] || '0', // YDS
            a.stats?.[3] || '0', // TD
            '-',
            a.stats?.[2] || '-'  // AVG
          ]
        });
      });
    }

    return {
      team: {
        id: compObj.team?.id || '',
        displayName: compObj.team?.displayName || 'Team',
        name: compObj.team?.name || '',
        logo: compObj.team?.logo || '',
        record: compObj.records?.[0]?.summary || ''
      },
      score: parseInt(compObj.score || '0', 10),
      linescores,
      statLabels: ['ATT/CAR/REC', 'YDS', 'TD', 'INT', 'RTG/AVG'],
      athletes
    };
  }

  const playerGroups = data.boxscore?.players || [];
  const awayGroup = playerGroups[0] || {};
  const homeGroup = playerGroups[1] || {};

  const awayBox = parseNflTeamBox(awayGroup, awayComp);
  const homeBox = parseNflTeamBox(homeGroup, homeComp);

  const result: GameSummaryResponse = {
    id: eventId,
    boxscore: {
      away: awayBox,
      home: homeBox
    }
  };

  nflSummaryCache.set(eventId, { data: result, timestamp: now });
  return result;
}

