export type MediaType = 'movie' | 'tv';

export type AppLanguage = 'es' | 'en';

export type MainTab = 'home' | 'search';

export interface CategoryOption {
  id: string;
  labelEs: string;
  labelEn: string;
  genreId?: number;
  isAnime?: boolean;
}

export interface ExternalRatings {
  imdbRating?: string | null;
  imdbVotes?: string | null;
  rottenTomatoes?: string | null;
  metascore?: string | null;
}

export interface MediaItem {
  id: number;
  imdb_id?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type?: MediaType;
  content_type?: 'movie' | 'series' | 'anime';
  genre_ids?: number[];
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  origin_country?: string[];
  original_language?: string;
  popularity?: number;
}

export interface VimeusStreamEmbed {
  format: string | null;
  lang: string;
  quality: string;
  resolution: string | null;
  sala_id: number;
  server: string;
  size: string | null;
  subtitle: number;
  url: string;
}

export interface VimeusEpisodeEntry {
  episode: number;
  season: number;
  title: string;
  poster: string | null;
}

export interface VimeusSeasonEntry {
  season?: number;
  episodes: VimeusEpisodeEntry[];
}

export interface VimeusResolvedData {
  available: boolean;
  tmdb_id: number;
  type: 'movie' | 'serie' | 'anime';
  title?: string;
  poster?: string | null;
  backdrop?: string | null;
  embeds: VimeusStreamEmbed[];
  seasons?: VimeusSeasonEntry[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface VideoResult {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface ImageLogo {
  file_path: string;
  iso_639_1: string | null;
  aspect_ratio: number;
  vote_average: number;
  width: number;
}

export interface SeasonSummary {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview: string;
}

export interface EpisodeItem {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview: string;
  still_path: string | null;
  vote_average: number;
  runtime: number | null;
  air_date: string | null;
}

export interface MediaDetails extends MediaItem {
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres: { id: number; name: string }[];
  tagline?: string;
  status?: string;
  seasons?: SeasonSummary[];
  external_ids?: {
    imdb_id?: string | null;
  };
  ratings?: ExternalRatings;
  credits?: {
    cast: CastMember[];
    crew?: CrewMember[];
  };
  videos?: {
    results: VideoResult[];
  };
  images?: {
    logos: ImageLogo[];
  };
  similar?: {
    results: MediaItem[];
  };
  recommendations?: {
    results: MediaItem[];
  };
}
