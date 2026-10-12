import {
  AppLanguage,
  EpisodeItem,
  MediaDetails,
  MediaItem,
  MediaType,
  VimeusResolvedData,
} from '../types/tmdb';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5990ea44aeb8e939123cca0dbe9207fc';
const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const getTmdbLocale = (lang: AppLanguage): string =>
  lang === 'en' ? 'en-US' : 'es-MX';

export const getPosterUrl = (
  path: string | null,
  size: 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${IMAGE_BASE_URL}/${size}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getBackdropUrl = (
  path: string | null,
  size: 'w780' | 'w1280' | 'original' = 'original'
): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${IMAGE_BASE_URL}/${size}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getProfileUrl = (
  path: string | null,
  size: 'w185' | 'h632' = 'w185'
): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${IMAGE_BASE_URL}/${size}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getLogoUrl = (
  details: MediaDetails | null,
  lang: AppLanguage = 'es'
): string | null => {
  const logos = details?.images?.logos;
  if (!logos || logos.length === 0) return null;
  const primaryIso = lang === 'en' ? 'en' : 'es';
  const secondaryIso = lang === 'en' ? 'es' : 'en';
  const preferred =
    logos.find((l) => l.iso_639_1 === primaryIso) ||
    logos.find((l) => l.iso_639_1 === secondaryIso) ||
    logos[0];
  if (!preferred?.file_path) return null;
  return `${IMAGE_BASE_URL}/w500${preferred.file_path}`;
};

export const getDisplayTitle = (item: MediaItem | MediaDetails): string => {
  return item.title || item.name || item.original_title || item.original_name || 'Sin título';
};

export const getReleaseYear = (item: MediaItem | MediaDetails): string => {
  const dateStr = item.release_date || item.first_air_date;
  if (!dateStr) return '2025';
  return dateStr.slice(0, 4);
};

export const formatRuntime = (minutes?: number): string => {
  if (!minutes || minutes <= 0) return '2h 05m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

export const inferMediaType = (item: MediaItem, fallback: MediaType = 'movie'): MediaType => {
  if (item.content_type === 'series' || item.content_type === 'anime') {
    return 'tv';
  }
  if (item.content_type === 'movie') {
    return 'movie';
  }
  if (item.media_type === 'movie' || item.media_type === 'tv') {
    return item.media_type;
  }
  if (item.first_air_date !== undefined || item.name !== undefined) {
    return 'tv';
  }
  return fallback;
};

export const isAnimeItem = (item: MediaItem | MediaDetails): boolean => {
  if (item.content_type === 'anime') return true;
  const hasAnimGenre =
    item.genre_ids?.includes(16) ||
    ('genres' in item && item.genres?.some((g) => g.id === 16));
  const isJa = item.original_language === 'ja' || item.origin_country?.includes('JP');
  return Boolean(hasAnimGenre && isJa);
};

export const buildCleanStreamUrl = (
  item: MediaItem | MediaDetails,
  season = 1,
  episode = 1
): string => {
  const mediaType = inferMediaType(item);
  const anime = isAnimeItem(item);
  const endpointType = mediaType === 'movie' ? 'movie' : anime ? 'anime' : 'serie';

  const params = new URLSearchParams({
    tmdb: String(item.id),
    type: endpointType,
    title: getDisplayTitle(item),
  });

  if (endpointType === 'serie' || endpointType === 'anime') {
    params.set('se', String(season));
    params.set('ep', String(episode));
  }

  return `/api/player/stream?${params.toString()}`;
};

export const resolveVimeusStream = async (
  item: MediaItem | MediaDetails,
  season?: number,
  episode?: number
): Promise<VimeusResolvedData> => {
  const mediaType = inferMediaType(item);
  const anime = isAnimeItem(item);
  const endpointType = mediaType === 'movie' ? 'movie' : anime ? 'anime' : 'serie';

  const params = new URLSearchParams({
    tmdb: String(item.id),
    type: endpointType,
  });
  if (season !== undefined) params.set('se', String(season));
  if (episode !== undefined) params.set('ep', String(episode));

  try {
    const res = await fetch(`/api/vimeus/resolve?${params.toString()}`);
    if (!res.ok) {
      return { available: false, tmdb_id: item.id, type: endpointType, embeds: [] };
    }
    return await res.json();
  } catch {
    return { available: false, tmdb_id: item.id, type: endpointType, embeds: [] };
  }
};

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  lang: AppLanguage = 'es'
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', getTmdbLocale(lang));

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB Error: ${response.status}`);
  }
  return response.json();
}

interface TMDBListResponse {
  page: number;
  results: MediaItem[];
  total_pages: number;
}

const filterCleanPosters = (
  items: MediaItem[],
  defaultType?: MediaType,
  contentType?: 'movie' | 'series' | 'anime'
): MediaItem[] => {
  return items
    .filter((item) => Boolean(item.poster_path && item.backdrop_path))
    .map((item) => ({
      ...item,
      media_type: item.media_type || defaultType || (item.first_air_date ? 'tv' : 'movie'),
      content_type:
        contentType ||
        item.content_type ||
        (item.original_language === 'ja' && item.genre_ids?.includes(16)
          ? 'anime'
          : (item.media_type || defaultType) === 'tv'
          ? 'series'
          : 'movie'),
    }));
};

const deduplicateById = (items: MediaItem[]): MediaItem[] => {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const fetchHomeCatalog = async (lang: AppLanguage = 'es') => {
  const [
    trendingAll,
    popularMovies,
    topRatedMovies,
    popularSeries,
    animeSeries,
    animeMovies,
    sciFiMovies,
    actionMovies,
  ] = await Promise.all([
    tmdbFetch<TMDBListResponse>('/trending/all/week', {}, lang),
    tmdbFetch<TMDBListResponse>('/movie/popular', { page: 1 }, lang),
    tmdbFetch<TMDBListResponse>('/movie/top_rated', { page: 1 }, lang),
    tmdbFetch<TMDBListResponse>('/tv/popular', { page: 1 }, lang),
    tmdbFetch<TMDBListResponse>(
      '/discover/tv',
      {
        with_genres: 16,
        with_original_language: 'ja',
        sort_by: 'popularity.desc',
      },
      lang
    ),
    tmdbFetch<TMDBListResponse>(
      '/discover/movie',
      {
        with_genres: 16,
        with_original_language: 'ja',
        sort_by: 'popularity.desc',
      },
      lang
    ),
    tmdbFetch<TMDBListResponse>(
      '/discover/movie',
      {
        with_genres: 878,
        sort_by: 'popularity.desc',
      },
      lang
    ),
    tmdbFetch<TMDBListResponse>(
      '/discover/movie',
      {
        with_genres: 28,
        sort_by: 'popularity.desc',
      },
      lang
    ),
  ]);

  const cleanTrending = filterCleanPosters(trendingAll.results);
  const cleanMovies = deduplicateById([
    ...filterCleanPosters(popularMovies.results, 'movie', 'movie'),
    ...filterCleanPosters(topRatedMovies.results, 'movie', 'movie'),
  ]);
  const cleanSeries = filterCleanPosters(popularSeries.results, 'tv', 'series');
  const cleanAnime = deduplicateById([
    ...filterCleanPosters(animeSeries.results, 'tv', 'anime'),
    ...filterCleanPosters(animeMovies.results, 'movie', 'anime'),
  ]);
  const cleanSciFiAction = deduplicateById([
    ...filterCleanPosters(sciFiMovies.results, 'movie', 'movie'),
    ...filterCleanPosters(actionMovies.results, 'movie', 'movie'),
  ]);

  return {
    trending: cleanTrending.length > 0 ? cleanTrending : cleanMovies,
    popularMovies: cleanMovies,
    topRatedMovies: filterCleanPosters(topRatedMovies.results, 'movie', 'movie'),
    popularSeries: cleanSeries,
    animeCatalog: cleanAnime,
    sciFiAction: cleanSciFiAction,
  };
};

export const fetchByGenreFilter = async (
  genreId: number,
  lang: AppLanguage = 'es'
): Promise<MediaItem[]> => {
  const [movies, series] = await Promise.all([
    tmdbFetch<TMDBListResponse>(
      '/discover/movie',
      { with_genres: genreId, sort_by: 'popularity.desc', page: 1 },
      lang
    ),
    tmdbFetch<TMDBListResponse>(
      '/discover/tv',
      { with_genres: genreId, sort_by: 'popularity.desc', page: 1 },
      lang
    ),
  ]);
  return deduplicateById([
    ...filterCleanPosters(movies.results, 'movie', 'movie'),
    ...filterCleanPosters(series.results, 'tv', 'series'),
  ]);
};

export const fetchMediaDetails = async (
  id: number,
  type: MediaType,
  lang: AppLanguage = 'es'
): Promise<MediaDetails> => {
  const data = await tmdbFetch<MediaDetails>(
    `/${type}/${id}`,
    {
      append_to_response: 'videos,credits,similar,recommendations,images,external_ids',
      include_image_language: 'es,en,null',
    },
    lang
  );

  if (!data.overview && lang === 'es') {
    try {
      const enDetails = await tmdbFetch<MediaDetails>(`/${type}/${id}`, {}, 'en');
      if (enDetails.overview) data.overview = enDetails.overview;
    } catch {
      // ignore
    }
  }

  if (!data.videos?.results?.length) {
    try {
      const enVideos = await tmdbFetch<{ results: MediaDetails['videos']['results'] }>(
        `/${type}/${id}/videos`,
        {},
        'en'
      );
      data.videos = enVideos;
    } catch {
      // ignore
    }
  }

  const imdbId = data.imdb_id || data.external_ids?.imdb_id;
  let ratings = undefined;
  try {
    const rawTitle = data.title || data.name || data.original_title || data.original_name;
    ratings = await fetchExternalRatings(imdbId, rawTitle);
  } catch {
    // fallback gracefully
  }

  return {
    ...data,
    imdb_id: imdbId || undefined,
    media_type: type,
    ratings: ratings || undefined,
  };
};

export const fetchExternalRatings = async (
  imdbId?: string | null,
  title?: string | null
): Promise<{
  imdbRating?: string | null;
  imdbVotes?: string | null;
  rottenTomatoes?: string | null;
  metascore?: string | null;
} | null> => {
  try {
    const url = imdbId
      ? `https://www.omdbapi.com/?i=${imdbId}&apikey=trilogy`
      : title
      ? `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=trilogy`
      : null;
    if (!url) return null;
    const res = await fetch(url);
    const d = await res.json();
    if (d.Response === 'True') {
      const rt = d.Ratings?.find((r: { Source: string; Value: string }) =>
        r.Source.includes('Rotten')
      )?.Value;
      return {
        imdbRating: d.imdbRating && d.imdbRating !== 'N/A' ? d.imdbRating : null,
        imdbVotes: d.imdbVotes && d.imdbVotes !== 'N/A' ? d.imdbVotes : null,
        rottenTomatoes: rt || null,
        metascore: d.Metascore && d.Metascore !== 'N/A' ? d.Metascore : null,
      };
    }
  } catch {
    // ignore
  }
  return null;
};

export const fetchSeasonEpisodes = async (
  tvId: number,
  seasonNumber: number,
  lang: AppLanguage = 'es'
): Promise<EpisodeItem[]> => {
  const data = await tmdbFetch<{ episodes: EpisodeItem[] }>(
    `/tv/${tvId}/season/${seasonNumber}`,
    {},
    lang
  );
  return data.episodes || [];
};

export const searchMultiMedia = async (
  query: string,
  lang: AppLanguage = 'es'
): Promise<MediaItem[]> => {
  if (!query.trim()) return [];
  const data = await tmdbFetch<TMDBListResponse>(
    '/search/multi',
    {
      query: query.trim(),
      include_adult: 'false',
    },
    lang
  );
  return data.results
    .filter((item) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
    .map((item) => ({
      ...item,
      content_type:
        item.original_language === 'ja' && item.genre_ids?.includes(16)
          ? 'anime'
          : item.media_type === 'tv'
          ? 'series'
          : 'movie',
    }));
};

export const GENRE_MAP_ES: Record<number, string> = {
  28: 'Acción',
  12: 'Aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familia',
  14: 'Fantasía',
  36: 'Historia',
  27: 'Terror',
  10402: 'Música',
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Ciencia Ficción',
  53: 'Suspense',
  10752: 'Bélica',
  37: 'Western',
  10759: 'Acción y Aventura',
  10765: 'Sci-Fi y Fantasía',
};

export const GENRE_MAP_EN: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10765: 'Sci-Fi & Fantasy',
};

export const getGenreName = (id: number, lang: AppLanguage): string => {
  return lang === 'en' ? GENRE_MAP_EN[id] || '' : GENRE_MAP_ES[id] || '';
};
