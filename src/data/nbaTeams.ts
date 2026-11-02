// Official 30 NBA Teams Data with ESPN Logo CDN URLs, Primary Colors, and Keywords

export interface NbaTeam {
  id: string; // e.g. 'lal'
  name: string; // 'Lakers'
  displayName: string; // 'Los Angeles Lakers'
  city: string; // 'Los Angeles'
  abbreviation: string; // 'LAL'
  logo: string;
  primaryColor: string; // hex
  secondaryColor?: string;
  keywords: string[]; // for autocomplete/fuzzy search
}

export const NBA_TEAMS: NbaTeam[] = [
  {
    id: 'atl',
    name: 'Hawks',
    displayName: 'Atlanta Hawks',
    city: 'Atlanta',
    abbreviation: 'ATL',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/atl.png',
    primaryColor: '#E03A3E',
    keywords: ['atlanta', 'hawks', 'atl']
  },
  {
    id: 'bos',
    name: 'Celtics',
    displayName: 'Boston Celtics',
    city: 'Boston',
    abbreviation: 'BOS',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/bos.png',
    primaryColor: '#007A33',
    keywords: ['boston', 'celtics', 'bos', "c's"]
  },
  {
    id: 'bkn',
    name: 'Nets',
    displayName: 'Brooklyn Nets',
    city: 'Brooklyn',
    abbreviation: 'BKN',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/bkn.png',
    primaryColor: '#000000',
    keywords: ['brooklyn', 'nets', 'bkn', 'new york']
  },
  {
    id: 'cha',
    name: 'Hornets',
    displayName: 'Charlotte Hornets',
    city: 'Charlotte',
    abbreviation: 'CHA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/cha.png',
    primaryColor: '#1D1160',
    keywords: ['charlotte', 'hornets', 'cha', 'buzz']
  },
  {
    id: 'chi',
    name: 'Bulls',
    displayName: 'Chicago Bulls',
    city: 'Chicago',
    abbreviation: 'CHI',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/chi.png',
    primaryColor: '#CE1141',
    keywords: ['chicago', 'bulls', 'chi']
  },
  {
    id: 'cle',
    name: 'Cavaliers',
    displayName: 'Cleveland Cavaliers',
    city: 'Cleveland',
    abbreviation: 'CLE',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/cle.png',
    primaryColor: '#860038',
    keywords: ['cleveland', 'cavaliers', 'cavs', 'cle']
  },
  {
    id: 'dal',
    name: 'Mavericks',
    displayName: 'Dallas Mavericks',
    city: 'Dallas',
    abbreviation: 'DAL',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/dal.png',
    primaryColor: '#00538C',
    keywords: ['dallas', 'mavericks', 'mavs', 'dal']
  },
  {
    id: 'den',
    name: 'Nuggets',
    displayName: 'Denver Nuggets',
    city: 'Denver',
    abbreviation: 'DEN',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/den.png',
    primaryColor: '#0E2240',
    keywords: ['denver', 'nuggets', 'nugs', 'den']
  },
  {
    id: 'det',
    name: 'Pistons',
    displayName: 'Detroit Pistons',
    city: 'Detroit',
    abbreviation: 'DET',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/det.png',
    primaryColor: '#C8102E',
    keywords: ['detroit', 'pistons', 'det']
  },
  {
    id: 'gsw',
    name: 'Warriors',
    displayName: 'Golden State Warriors',
    city: 'San Francisco',
    abbreviation: 'GSW',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/gsw.png',
    primaryColor: '#1D428A',
    keywords: ['golden state', 'warriors', 'dubs', 'gsw', 'bay area', 'sf']
  },
  {
    id: 'hou',
    name: 'Rockets',
    displayName: 'Houston Rockets',
    city: 'Houston',
    abbreviation: 'HOU',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/hou.png',
    primaryColor: '#CE1141',
    keywords: ['houston', 'rockets', 'hou']
  },
  {
    id: 'ind',
    name: 'Pacers',
    displayName: 'Indiana Pacers',
    city: 'Indiana',
    abbreviation: 'IND',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/ind.png',
    primaryColor: '#002D62',
    keywords: ['indiana', 'pacers', 'ind', 'indy']
  },
  {
    id: 'lac',
    name: 'Clippers',
    displayName: 'LA Clippers',
    city: 'Los Angeles',
    abbreviation: 'LAC',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/lac.png',
    primaryColor: '#C8102E',
    keywords: ['los angeles', 'la', 'clippers', 'clips', 'lac']
  },
  {
    id: 'lal',
    name: 'Lakers',
    displayName: 'Los Angeles Lakers',
    city: 'Los Angeles',
    abbreviation: 'LAL',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/lal.png',
    primaryColor: '#552583',
    keywords: ['los angeles', 'la', 'lakers', 'lal', 'lake show', 'purple and gold']
  },
  {
    id: 'mem',
    name: 'Grizzlies',
    displayName: 'Memphis Grizzlies',
    city: 'Memphis',
    abbreviation: 'MEM',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/mem.png',
    primaryColor: '#5D76A9',
    keywords: ['memphis', 'grizzlies', 'grizz', 'mem']
  },
  {
    id: 'mia',
    name: 'Heat',
    displayName: 'Miami Heat',
    city: 'Miami',
    abbreviation: 'MIA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/mia.png',
    primaryColor: '#98002E',
    keywords: ['miami', 'heat', 'mia']
  },
  {
    id: 'mil',
    name: 'Bucks',
    displayName: 'Milwaukee Bucks',
    city: 'Milwaukee',
    abbreviation: 'MIL',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/mil.png',
    primaryColor: '#00471B',
    keywords: ['milwaukee', 'bucks', 'mil']
  },
  {
    id: 'min',
    name: 'Timberwolves',
    displayName: 'Minnesota Timberwolves',
    city: 'Minnesota',
    abbreviation: 'MIN',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/min.png',
    primaryColor: '#0C2340',
    keywords: ['minnesota', 'timberwolves', 'wolves', 'min', 'twolves']
  },
  {
    id: 'nop',
    name: 'Pelicans',
    displayName: 'New Orleans Pelicans',
    city: 'New Orleans',
    abbreviation: 'NOP',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/nop.png',
    primaryColor: '#0C2340',
    keywords: ['new orleans', 'pelicans', 'pels', 'nop', 'nola']
  },
  {
    id: 'nyk',
    name: 'Knicks',
    displayName: 'New York Knicks',
    city: 'New York',
    abbreviation: 'NYK',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/nyk.png',
    primaryColor: '#006BB6',
    keywords: ['new york', 'knicks', 'nyk', 'nyc']
  },
  {
    id: 'okc',
    name: 'Thunder',
    displayName: 'Oklahoma City Thunder',
    city: 'Oklahoma City',
    abbreviation: 'OKC',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/okc.png',
    primaryColor: '#007AC1',
    keywords: ['oklahoma city', 'thunder', 'okc']
  },
  {
    id: 'orl',
    name: 'Magic',
    displayName: 'Orlando Magic',
    city: 'Orlando',
    abbreviation: 'ORL',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/orl.png',
    primaryColor: '#0077C0',
    keywords: ['orlando', 'magic', 'orl']
  },
  {
    id: 'phi',
    name: '76ers',
    displayName: 'Philadelphia 76ers',
    city: 'Philadelphia',
    abbreviation: 'PHI',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/phi.png',
    primaryColor: '#006BB6',
    keywords: ['philadelphia', '76ers', 'sixers', 'phi', 'philly']
  },
  {
    id: 'phx',
    name: 'Suns',
    displayName: 'Phoenix Suns',
    city: 'Phoenix',
    abbreviation: 'PHX',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/phx.png',
    primaryColor: '#1D1160',
    keywords: ['phoenix', 'suns', 'phx']
  },
  {
    id: 'por',
    name: 'Trail Blazers',
    displayName: 'Portland Trail Blazers',
    city: 'Portland',
    abbreviation: 'POR',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/por.png',
    primaryColor: '#E03A3E',
    keywords: ['portland', 'trail blazers', 'blazers', 'por', 'rip city']
  },
  {
    id: 'sac',
    name: 'Kings',
    displayName: 'Sacramento Kings',
    city: 'Sacramento',
    abbreviation: 'SAC',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/sac.png',
    primaryColor: '#5A2D81',
    keywords: ['sacramento', 'kings', 'sac', 'beam']
  },
  {
    id: 'sas',
    name: 'Spurs',
    displayName: 'San Antonio Spurs',
    city: 'San Antonio',
    abbreviation: 'SAS',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/sas.png',
    primaryColor: '#000000',
    keywords: ['san antonio', 'spurs', 'sas']
  },
  {
    id: 'tor',
    name: 'Raptors',
    displayName: 'Toronto Raptors',
    city: 'Toronto',
    abbreviation: 'TOR',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/tor.png',
    primaryColor: '#CE1141',
    keywords: ['toronto', 'raptors', 'tor', 'we the north', 'canada']
  },
  {
    id: 'uta',
    name: 'Jazz',
    displayName: 'Utah Jazz',
    city: 'Utah',
    abbreviation: 'UTA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/uta.png',
    primaryColor: '#002B5C',
    keywords: ['utah', 'jazz', 'uta', 'salt lake']
  },
  {
    id: 'was',
    name: 'Wizards',
    displayName: 'Washington Wizards',
    city: 'Washington',
    abbreviation: 'WAS',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/was.png',
    primaryColor: '#002B5C',
    keywords: ['washington', 'wizards', 'was', 'dc']
  }
];

export function findTeamByQuery(query: string): NbaTeam | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();
  return NBA_TEAMS.find(
    (t) =>
      t.id === q ||
      t.abbreviation.toLowerCase() === q ||
      t.displayName.toLowerCase() === q ||
      t.name.toLowerCase() === q ||
      t.displayName.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q)
  );
}

export function searchNbaTeams(query: string): NbaTeam[] {
  if (!query || !query.trim()) return NBA_TEAMS;
  const q = query.trim().toLowerCase();
  return NBA_TEAMS.filter((t) => {
    if (t.displayName.toLowerCase().includes(q)) return true;
    if (t.name.toLowerCase().includes(q)) return true;
    if (t.abbreviation.toLowerCase().includes(q)) return true;
    if (t.city.toLowerCase().includes(q)) return true;
    return t.keywords.some((k) => k.includes(q));
  });
}
