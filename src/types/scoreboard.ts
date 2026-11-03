export interface CompetitorTeam {
  id: string;
  name: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  logo: string;
  color?: string;
  score: number;
  record?: string;
  winner?: boolean;
  linescores?: { value: number }[];
}

export interface LeaderStatLine {
  teamId: string;
  teamAbbreviation: string;
  athlete: {
    id: string;
    displayName: string;
    jersey: string;
    position: string;
    headshot?: string;
  };
  stat1: string; // PTS or PPG
  stat2: string; // REB or RPG
  stat3: string; // AST or APG
}

export interface GameLeadersDisplay {
  title: string; // "GAME LEADERS" or "SEASON LEADERS"
  col1: string;  // "PTS" or "PPG"
  col2: string;  // "REB" or "RPG"
  col3: string;  // "AST" or "APG"
  awayLeader?: LeaderStatLine;
  homeLeader?: LeaderStatLine;
}

export interface PlayerLeader {
  category: 'points' | 'rebounds' | 'assists';
  displayName: string;
  athlete: {
    id: string;
    displayName: string;
    shortName: string;
    headshot?: string;
    jersey?: string;
    position?: string;
  };
  displayValue: string;
  value: number;
}

export interface TeamLeaderSummary {
  teamId: string;
  teamName: string;
  teamLogo: string;
  pointsLeader?: PlayerLeader;
  reboundsLeader?: PlayerLeader;
  assistsLeader?: PlayerLeader;
}

export interface ScoreboardGame {
  id: string;
  espnId: string;
  date: string;
  name: string;
  shortName: string;
  league?: 'NBA' | 'NFL' | string;
  status: {
    state: 'pre' | 'in' | 'post';
    detail: string;
    shortDetail: string;
    isLive: boolean;
    period: number;
    clock: string;
  };
  awayTeam: CompetitorTeam;
  homeTeam: CompetitorTeam;
  displayLeaders?: GameLeadersDisplay;
  leaders?: any;
  teamLeaders?: {
    away?: TeamLeaderSummary;
    home?: TeamLeaderSummary;
  };
  stream?: {
    available: boolean;
    streamKey?: string;
    isLive: boolean;
    viewers?: number;
    sourcesCount?: number;
    qualities?: string[];
    streamData?: any;
  };
  youtubeVideoId?: string;
  hasHighlights?: boolean;
  isNfl?: boolean;
}

export interface ScoreboardResponse {
  date: string;
  formattedDate?: string;
  count?: number;
  liveCount?: number;
  games: ScoreboardGame[];
  updated_at?: string;
  fromCache?: boolean;
}

export interface AthleteBoxscoreStat {
  athlete: {
    id: string;
    displayName: string;
    jersey: string;
    position: string;
    headshot?: string;
  };
  starter?: boolean;
  didNotPlay?: boolean;
  reason?: string;
  stats: string[];
}

export interface TeamBoxscore {
  team: {
    id: string;
    displayName: string;
    logo: string;
    record?: string;
  };
  score: number;
  linescores: number[];
  statLabels: string[];
  athletes: AthleteBoxscoreStat[];
}

export interface ShotItem {
  id: string;
  athleteId: string;
  athleteName: string;
  teamId: string;
  period: number;
  periodDisplay: string;
  clock: string;
  text: string;
  scoringPlay: boolean;
  scoreValue: number;
  pointsAttempted: number;
  x: number; // 0 to 50
  y: number; // 0 to 47
}

export interface ShotChartData {
  shots: ShotItem[];
  homeStats: { made: number; attempted: number; pct: string };
  awayStats: { made: number; attempted: number; pct: string };
}

export interface WinProbabilityPoint {
  homeWinPercentage: number;
  awayWinPercentage: number;
  homeScore: number;
  awayScore: number;
  clock: string;
  periodDisplay: string;
}

export interface GameSummaryResponse {
  id: string;
  name?: string;
  status?: string;
  boxscore?: {
    home: TeamBoxscore;
    away: TeamBoxscore;
  };
  leaders?: ScoreboardGame['leaders'];
  shotChart?: ShotChartData;
  winProbability?: WinProbabilityPoint[];
}

export interface StandingsTeam {
  id: string;
  name: string;
  displayName: string;
  abbreviation: string;
  logo: string;
  rank: number;
  wins: number;
  losses: number;
  winPercent: string;
  gamesBehind: string;
  streak: string;
  lastTen: string;
}

export interface ConferenceStandings {
  name: string;
  teams: StandingsTeam[];
}
