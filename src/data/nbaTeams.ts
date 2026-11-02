// Official NBA (30) & NFL (32) Teams with ESPN CDN Logos, Primary Colors, and Search Keywords

export interface SportsTeam {
  id: string; // e.g. 'lal', 'kc'
  name: string; // 'Lakers', 'Chiefs'
  displayName: string; // 'Los Angeles Lakers', 'Kansas City Chiefs'
  city: string; // 'Los Angeles', 'Kansas City'
  abbreviation: string; // 'LAL', 'KC'
  league: 'NBA' | 'NFL';
  logo: string;
  primaryColor: string; // hex
  secondaryColor?: string;
  keywords: string[];
}

// Backward-compatible alias
export type NbaTeam = SportsTeam;

export const ALL_TEAMS: SportsTeam[] = [
  // ==================== NBA TEAMS (30) ====================
  {
    id: 'atl',
    name: 'Hawks',
    displayName: 'Atlanta Hawks',
    city: 'Atlanta',
    abbreviation: 'ATL',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/atl.png',
    primaryColor: '#E03A3E',
    keywords: ['atlanta', 'hawks', 'atl', 'nba']
  },
  {
    id: 'bos',
    name: 'Celtics',
    displayName: 'Boston Celtics',
    city: 'Boston',
    abbreviation: 'BOS',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/bos.png',
    primaryColor: '#007A33',
    keywords: ['boston', 'celtics', 'bos', "c's", 'nba']
  },
  {
    id: 'bkn',
    name: 'Nets',
    displayName: 'Brooklyn Nets',
    city: 'Brooklyn',
    abbreviation: 'BKN',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/bkn.png',
    primaryColor: '#000000',
    keywords: ['brooklyn', 'nets', 'bkn', 'new york', 'nba']
  },
  {
    id: 'cha',
    name: 'Hornets',
    displayName: 'Charlotte Hornets',
    city: 'Charlotte',
    abbreviation: 'CHA',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/cha.png',
    primaryColor: '#1D1160',
    keywords: ['charlotte', 'hornets', 'cha', 'buzz', 'nba']
  },
  {
    id: 'chi',
    name: 'Bulls',
    displayName: 'Chicago Bulls',
    city: 'Chicago',
    abbreviation: 'CHI',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/chi.png',
    primaryColor: '#CE1141',
    keywords: ['chicago', 'bulls', 'chi', 'nba']
  },
  {
    id: 'cle',
    name: 'Cavaliers',
    displayName: 'Cleveland Cavaliers',
    city: 'Cleveland',
    abbreviation: 'CLE',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/cle.png',
    primaryColor: '#860038',
    keywords: ['cleveland', 'cavaliers', 'cavs', 'cle', 'nba']
  },
  {
    id: 'dal',
    name: 'Mavericks',
    displayName: 'Dallas Mavericks',
    city: 'Dallas',
    abbreviation: 'DAL',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/dal.png',
    primaryColor: '#00538C',
    keywords: ['dallas', 'mavericks', 'mavs', 'dal', 'nba']
  },
  {
    id: 'den',
    name: 'Nuggets',
    displayName: 'Denver Nuggets',
    city: 'Denver',
    abbreviation: 'DEN',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/den.png',
    primaryColor: '#0E2240',
    keywords: ['denver', 'nuggets', 'nugs', 'den', 'nba']
  },
  {
    id: 'det',
    name: 'Pistons',
    displayName: 'Detroit Pistons',
    city: 'Detroit',
    abbreviation: 'DET',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/det.png',
    primaryColor: '#C8102E',
    keywords: ['detroit', 'pistons', 'det', 'nba']
  },
  {
    id: 'gsw',
    name: 'Warriors',
    displayName: 'Golden State Warriors',
    city: 'San Francisco',
    abbreviation: 'GSW',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/gsw.png',
    primaryColor: '#1D428A',
    keywords: ['golden state', 'warriors', 'dubs', 'gsw', 'bay area', 'sf', 'nba']
  },
  {
    id: 'hou',
    name: 'Rockets',
    displayName: 'Houston Rockets',
    city: 'Houston',
    abbreviation: 'HOU',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/hou.png',
    primaryColor: '#CE1141',
    keywords: ['houston', 'rockets', 'hou', 'nba']
  },
  {
    id: 'ind',
    name: 'Pacers',
    displayName: 'Indiana Pacers',
    city: 'Indiana',
    abbreviation: 'IND',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/ind.png',
    primaryColor: '#002D62',
    keywords: ['indiana', 'pacers', 'ind', 'indy', 'nba']
  },
  {
    id: 'lac',
    name: 'Clippers',
    displayName: 'LA Clippers',
    city: 'Los Angeles',
    abbreviation: 'LAC',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/lac.png',
    primaryColor: '#C8102E',
    keywords: ['los angeles', 'la', 'clippers', 'clips', 'lac', 'nba']
  },
  {
    id: 'lal',
    name: 'Lakers',
    displayName: 'Los Angeles Lakers',
    city: 'Los Angeles',
    abbreviation: 'LAL',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/lal.png',
    primaryColor: '#552583',
    keywords: ['los angeles', 'la', 'lakers', 'lal', 'lake show', 'purple and gold', 'nba']
  },
  {
    id: 'mem',
    name: 'Grizzlies',
    displayName: 'Memphis Grizzlies',
    city: 'Memphis',
    abbreviation: 'MEM',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/mem.png',
    primaryColor: '#5D76A9',
    keywords: ['memphis', 'grizzlies', 'grizz', 'mem', 'nba']
  },
  {
    id: 'mia',
    name: 'Heat',
    displayName: 'Miami Heat',
    city: 'Miami',
    abbreviation: 'MIA',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/mia.png',
    primaryColor: '#98002E',
    keywords: ['miami', 'heat', 'mia', 'nba']
  },
  {
    id: 'mil',
    name: 'Bucks',
    displayName: 'Milwaukee Bucks',
    city: 'Milwaukee',
    abbreviation: 'MIL',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/mil.png',
    primaryColor: '#00471B',
    keywords: ['milwaukee', 'bucks', 'mil', 'nba']
  },
  {
    id: 'min',
    name: 'Timberwolves',
    displayName: 'Minnesota Timberwolves',
    city: 'Minnesota',
    abbreviation: 'MIN',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/min.png',
    primaryColor: '#0C2340',
    keywords: ['minnesota', 'timberwolves', 'wolves', 'min', 'twolves', 'nba']
  },
  {
    id: 'nop',
    name: 'Pelicans',
    displayName: 'New Orleans Pelicans',
    city: 'New Orleans',
    abbreviation: 'NOP',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/nop.png',
    primaryColor: '#0C2340',
    keywords: ['new orleans', 'pelicans', 'pels', 'nop', 'nola', 'nba']
  },
  {
    id: 'nyk',
    name: 'Knicks',
    displayName: 'New York Knicks',
    city: 'New York',
    abbreviation: 'NYK',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/nyk.png',
    primaryColor: '#006BB6',
    keywords: ['new york', 'knicks', 'nyk', 'nyc', 'nba']
  },
  {
    id: 'okc',
    name: 'Thunder',
    displayName: 'Oklahoma City Thunder',
    city: 'Oklahoma City',
    abbreviation: 'OKC',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/okc.png',
    primaryColor: '#007AC1',
    keywords: ['oklahoma city', 'thunder', 'okc', 'nba']
  },
  {
    id: 'orl',
    name: 'Magic',
    displayName: 'Orlando Magic',
    city: 'Orlando',
    abbreviation: 'ORL',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/orl.png',
    primaryColor: '#0077C0',
    keywords: ['orlando', 'magic', 'orl', 'nba']
  },
  {
    id: 'phi',
    name: '76ers',
    displayName: 'Philadelphia 76ers',
    city: 'Philadelphia',
    abbreviation: 'PHI',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/phi.png',
    primaryColor: '#006BB6',
    keywords: ['philadelphia', '76ers', 'sixers', 'phi', 'philly', 'nba']
  },
  {
    id: 'phx',
    name: 'Suns',
    displayName: 'Phoenix Suns',
    city: 'Phoenix',
    abbreviation: 'PHX',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/phx.png',
    primaryColor: '#1D1160',
    keywords: ['phoenix', 'suns', 'phx', 'nba']
  },
  {
    id: 'por',
    name: 'Trail Blazers',
    displayName: 'Portland Trail Blazers',
    city: 'Portland',
    abbreviation: 'POR',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/por.png',
    primaryColor: '#E03A3E',
    keywords: ['portland', 'trail blazers', 'blazers', 'por', 'rip city', 'nba']
  },
  {
    id: 'sac',
    name: 'Kings',
    displayName: 'Sacramento Kings',
    city: 'Sacramento',
    abbreviation: 'SAC',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/sac.png',
    primaryColor: '#5A2D81',
    keywords: ['sacramento', 'kings', 'sac', 'beam', 'nba']
  },
  {
    id: 'sas',
    name: 'Spurs',
    displayName: 'San Antonio Spurs',
    city: 'San Antonio',
    abbreviation: 'SAS',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/sas.png',
    primaryColor: '#000000',
    keywords: ['san antonio', 'spurs', 'sas', 'nba']
  },
  {
    id: 'tor',
    name: 'Raptors',
    displayName: 'Toronto Raptors',
    city: 'Toronto',
    abbreviation: 'TOR',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/tor.png',
    primaryColor: '#CE1141',
    keywords: ['toronto', 'raptors', 'tor', 'we the north', 'canada', 'nba']
  },
  {
    id: 'uta',
    name: 'Jazz',
    displayName: 'Utah Jazz',
    city: 'Utah',
    abbreviation: 'UTA',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/uta.png',
    primaryColor: '#002B5C',
    keywords: ['utah', 'jazz', 'uta', 'salt lake', 'nba']
  },
  {
    id: 'was',
    name: 'Wizards',
    displayName: 'Washington Wizards',
    city: 'Washington',
    abbreviation: 'WAS',
    league: 'NBA',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/was.png',
    primaryColor: '#002B5C',
    keywords: ['washington', 'wizards', 'was', 'dc', 'nba']
  },

  // ==================== NFL TEAMS (32) ====================
  {
    id: 'buf_nfl',
    name: 'Bills',
    displayName: 'Buffalo Bills',
    city: 'Buffalo',
    abbreviation: 'BUF',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/buf.png',
    primaryColor: '#00338D',
    keywords: ['buffalo', 'bills', 'buf', 'nfl']
  },
  {
    id: 'mia_nfl',
    name: 'Dolphins',
    displayName: 'Miami Dolphins',
    city: 'Miami',
    abbreviation: 'MIA',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/mia.png',
    primaryColor: '#008E97',
    keywords: ['miami', 'dolphins', 'fins', 'mia', 'nfl']
  },
  {
    id: 'ne_nfl',
    name: 'Patriots',
    displayName: 'New England Patriots',
    city: 'New England',
    abbreviation: 'NE',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/ne.png',
    primaryColor: '#002244',
    keywords: ['new england', 'patriots', 'pats', 'ne', 'boston', 'nfl']
  },
  {
    id: 'nyj_nfl',
    name: 'Jets',
    displayName: 'New York Jets',
    city: 'New York',
    abbreviation: 'NYJ',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nyj.png',
    primaryColor: '#125740',
    keywords: ['new york', 'jets', 'nyj', 'gang green', 'nfl']
  },
  {
    id: 'bal_nfl',
    name: 'Ravens',
    displayName: 'Baltimore Ravens',
    city: 'Baltimore',
    abbreviation: 'BAL',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/bal.png',
    primaryColor: '#241773',
    keywords: ['baltimore', 'ravens', 'bal', 'nfl']
  },
  {
    id: 'cin_nfl',
    name: 'Bengals',
    displayName: 'Cincinnati Bengals',
    city: 'Cincinnati',
    abbreviation: 'CIN',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/cin.png',
    primaryColor: '#FB4F14',
    keywords: ['cincinnati', 'bengals', 'cin', 'who dey', 'nfl']
  },
  {
    id: 'cle_nfl',
    name: 'Browns',
    displayName: 'Cleveland Browns',
    city: 'Cleveland',
    abbreviation: 'CLE',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/cle.png',
    primaryColor: '#311D00',
    keywords: ['cleveland', 'browns', 'cle', 'nfl']
  },
  {
    id: 'pit_nfl',
    name: 'Steelers',
    displayName: 'Pittsburgh Steelers',
    city: 'Pittsburgh',
    abbreviation: 'PIT',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/pit.png',
    primaryColor: '#FFB612',
    keywords: ['pittsburgh', 'steelers', 'pit', 'nfl']
  },
  {
    id: 'hou_nfl',
    name: 'Texans',
    displayName: 'Houston Texans',
    city: 'Houston',
    abbreviation: 'HOU',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/hou.png',
    primaryColor: '#03202F',
    keywords: ['houston', 'texans', 'hou', 'nfl']
  },
  {
    id: 'ind_nfl',
    name: 'Colts',
    displayName: 'Indianapolis Colts',
    city: 'Indianapolis',
    abbreviation: 'IND',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/ind.png',
    primaryColor: '#002C5F',
    keywords: ['indianapolis', 'colts', 'ind', 'indy', 'nfl']
  },
  {
    id: 'jax_nfl',
    name: 'Jaguars',
    displayName: 'Jacksonville Jaguars',
    city: 'Jacksonville',
    abbreviation: 'JAX',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/jax.png',
    primaryColor: '#006778',
    keywords: ['jacksonville', 'jaguars', 'jags', 'jax', 'nfl']
  },
  {
    id: 'ten_nfl',
    name: 'Titans',
    displayName: 'Tennessee Titans',
    city: 'Tennessee',
    abbreviation: 'TEN',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/ten.png',
    primaryColor: '#0C2340',
    keywords: ['tennessee', 'titans', 'ten', 'nfl']
  },
  {
    id: 'den_nfl',
    name: 'Broncos',
    displayName: 'Denver Broncos',
    city: 'Denver',
    abbreviation: 'DEN',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/den.png',
    primaryColor: '#FB4F14',
    keywords: ['denver', 'broncos', 'den', 'nfl']
  },
  {
    id: 'kc_nfl',
    name: 'Chiefs',
    displayName: 'Kansas City Chiefs',
    city: 'Kansas City',
    abbreviation: 'KC',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/kc.png',
    primaryColor: '#E31837',
    keywords: ['kansas city', 'chiefs', 'kc', 'mahomes', 'nfl']
  },
  {
    id: 'lv_nfl',
    name: 'Raiders',
    displayName: 'Las Vegas Raiders',
    city: 'Las Vegas',
    abbreviation: 'LV',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/lv.png',
    primaryColor: '#000000',
    keywords: ['las vegas', 'raiders', 'lv', 'vegas', 'nfl']
  },
  {
    id: 'lac_nfl',
    name: 'Chargers',
    displayName: 'Los Angeles Chargers',
    city: 'Los Angeles',
    abbreviation: 'LAC',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/lac.png',
    primaryColor: '#0080C6',
    keywords: ['los angeles', 'chargers', 'bolts', 'lac', 'la', 'nfl']
  },
  {
    id: 'dal_nfl',
    name: 'Cowboys',
    displayName: 'Dallas Cowboys',
    city: 'Dallas',
    abbreviation: 'DAL',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/dal.png',
    primaryColor: '#003594',
    keywords: ['dallas', 'cowboys', 'dal', 'americas team', 'nfl']
  },
  {
    id: 'nyg_nfl',
    name: 'Giants',
    displayName: 'New York Giants',
    city: 'New York',
    abbreviation: 'NYG',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nyg.png',
    primaryColor: '#0B2265',
    keywords: ['new york', 'giants', 'nyg', 'g-men', 'nfl']
  },
  {
    id: 'phi_nfl',
    name: 'Eagles',
    displayName: 'Philadelphia Eagles',
    city: 'Philadelphia',
    abbreviation: 'PHI',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/phi.png',
    primaryColor: '#004C54',
    keywords: ['philadelphia', 'eagles', 'phi', 'philly', 'birds', 'nfl']
  },
  {
    id: 'wsh_nfl',
    name: 'Commanders',
    displayName: 'Washington Commanders',
    city: 'Washington',
    abbreviation: 'WSH',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/wsh.png',
    primaryColor: '#5A1414',
    keywords: ['washington', 'commanders', 'wsh', 'dc', 'nfl']
  },
  {
    id: 'chi_nfl',
    name: 'Bears',
    displayName: 'Chicago Bears',
    city: 'Chicago',
    abbreviation: 'CHI',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/chi.png',
    primaryColor: '#0B162A',
    keywords: ['chicago', 'bears', 'chi', 'monsters of the midway', 'nfl']
  },
  {
    id: 'det_nfl',
    name: 'Lions',
    displayName: 'Detroit Lions',
    city: 'Detroit',
    abbreviation: 'DET',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/det.png',
    primaryColor: '#0076B6',
    keywords: ['detroit', 'lions', 'det', 'nfl']
  },
  {
    id: 'gb_nfl',
    name: 'Packers',
    displayName: 'Green Bay Packers',
    city: 'Green Bay',
    abbreviation: 'GB',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/gb.png',
    primaryColor: '#203731',
    keywords: ['green bay', 'packers', 'gb', 'pack', 'nfl']
  },
  {
    id: 'min_nfl',
    name: 'Vikings',
    displayName: 'Minnesota Vikings',
    city: 'Minnesota',
    abbreviation: 'MIN',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/min.png',
    primaryColor: '#4F2683',
    keywords: ['minnesota', 'vikings', 'min', 'vikes', 'skol', 'nfl']
  },
  {
    id: 'atl_nfl',
    name: 'Falcons',
    displayName: 'Atlanta Falcons',
    city: 'Atlanta',
    abbreviation: 'ATL',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/atl.png',
    primaryColor: '#A71930',
    keywords: ['atlanta', 'falcons', 'atl', 'dirty birds', 'nfl']
  },
  {
    id: 'car_nfl',
    name: 'Panthers',
    displayName: 'Carolina Panthers',
    city: 'Carolina',
    abbreviation: 'CAR',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/car.png',
    primaryColor: '#0085CA',
    keywords: ['carolina', 'panthers', 'car', 'nfl']
  },
  {
    id: 'no_nfl',
    name: 'Saints',
    displayName: 'New Orleans Saints',
    city: 'New Orleans',
    abbreviation: 'NO',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/no.png',
    primaryColor: '#D3BC8D',
    keywords: ['new orleans', 'saints', 'no', 'nola', 'who dat', 'nfl']
  },
  {
    id: 'tb_nfl',
    name: 'Buccaneers',
    displayName: 'Tampa Bay Buccaneers',
    city: 'Tampa Bay',
    abbreviation: 'TB',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/tb.png',
    primaryColor: '#D50A0A',
    keywords: ['tampa bay', 'buccaneers', 'bucs', 'tb', 'tampa', 'nfl']
  },
  {
    id: 'ari_nfl',
    name: 'Cardinals',
    displayName: 'Arizona Cardinals',
    city: 'Arizona',
    abbreviation: 'ARI',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/ari.png',
    primaryColor: '#97233F',
    keywords: ['arizona', 'cardinals', 'cards', 'ari', 'phoenix', 'nfl']
  },
  {
    id: 'lar_nfl',
    name: 'Rams',
    displayName: 'Los Angeles Rams',
    city: 'Los Angeles',
    abbreviation: 'LAR',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/lar.png',
    primaryColor: '#003594',
    keywords: ['los angeles', 'rams', 'lar', 'la', 'nfl']
  },
  {
    id: 'sf_nfl',
    name: '49ers',
    displayName: 'San Francisco 49ers',
    city: 'San Francisco',
    abbreviation: 'SF',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/sf.png',
    primaryColor: '#AA0000',
    keywords: ['san francisco', '49ers', 'niners', 'sf', 'bay area', 'nfl']
  },
  {
    id: 'sea_nfl',
    name: 'Seahawks',
    displayName: 'Seattle Seahawks',
    city: 'Seattle',
    abbreviation: 'SEA',
    league: 'NFL',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/sea.png',
    primaryColor: '#002244',
    keywords: ['seattle', 'seahawks', 'hawks', 'sea', '12th man', 'nfl']
  }
];

export const NBA_TEAMS = ALL_TEAMS.filter((t) => t.league === 'NBA');
export const NFL_TEAMS = ALL_TEAMS.filter((t) => t.league === 'NFL');

export function findTeamByQuery(query: string): SportsTeam | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();
  return ALL_TEAMS.find(
    (t) =>
      t.id === q ||
      t.abbreviation.toLowerCase() === q ||
      t.displayName.toLowerCase() === q ||
      t.name.toLowerCase() === q ||
      t.displayName.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q)
  );
}

export function searchSportsTeams(query: string): SportsTeam[] {
  if (!query || !query.trim()) return ALL_TEAMS;
  const q = query.trim().toLowerCase();
  return ALL_TEAMS.filter((t) => {
    if (t.displayName.toLowerCase().includes(q)) return true;
    if (t.name.toLowerCase().includes(q)) return true;
    if (t.abbreviation.toLowerCase().includes(q)) return true;
    if (t.city.toLowerCase().includes(q)) return true;
    return t.keywords.some((k) => k.includes(q));
  });
}

// Backward-compatible alias
export const searchNbaTeams = searchSportsTeams;
