export interface StreamSource {
  quality: string;
  url: string;
}

export interface Team {
  name: string;
  logo: string;
}

export interface Stream {
  id: string;
  name: string;
  category: string;
  league: string;
  stream_key: string;
  match_timestamp: number;
  viewers: number;
  is_external: boolean;
  thumbnail_url: string;
  sources: StreamSource[];
  live_sources: StreamSource[];
  team1?: Team;
  team2?: Team;
  is_live: boolean;
  status: 'live' | 'upcoming' | 'ended';
  youtubeVideoId?: string;
  is_highlight?: boolean;
}

export interface StreamsResponse {
  count: number;
  streams: Stream[];
  updated_at?: string;
  cache_ttl_sec?: number;
  fromCache?: boolean;
}
