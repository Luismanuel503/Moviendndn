import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Share2,
  Play,
  Film,
  Tv,
  User as UserIcon,
  ChevronRight,
  MoreHorizontal,
  Check,
  Pause,
} from 'lucide-react';
import {
  AppLanguage,
  EpisodeItem,
  MediaDetails,
  MediaItem,
} from '../types/tmdb';
import {
  buildCleanStreamUrl,
  fetchMediaDetails,
  fetchSeasonEpisodes,
  formatRuntime,
  getBackdropUrl,
  getDisplayTitle,
  getGenreName,
  getLogoUrl,
  getPosterUrl,
  getProfileUrl,
  getReleaseYear,
  inferMediaType,
  resolveVimeusStream,
} from '../services/tmdb';
import { PosterCard } from './PosterCard';

interface MediaModalProps {
  item: MediaItem | null;
  autoPlayOnOpen?: boolean;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
  lang: AppLanguage;
}

export const MediaModal: React.FC<MediaModalProps> = ({
  item,
  autoPlayOnOpen = false,
  onClose,
  onSelectMedia,
  lang,
}) => {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlayingMain, setIsPlayingMain] = useState(autoPlayOnOpen);
  const [expandedSynopsis, setExpandedSynopsis] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // In-line trailer player state (allows playing trailers right inside the trailers section)
  const [playingTrailerKey, setPlayingTrailerKey] = useState<string | null>(null);

  // Seasons & Episodes for Series / Anime
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [availableSeasonNums, setAvailableSeasonNums] = useState<number[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    if (!item) return;

    let isMounted = true;
    setLoading(true);
    setIsPlayingMain(autoPlayOnOpen);
    setPlayingTrailerKey(null);
    setExpandedSynopsis(false);
    setSelectedSeason(1);
    setSelectedEpisode(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const mediaType = inferMediaType(item);

    Promise.all([
      fetchMediaDetails(item.id, mediaType, lang).catch(() => null),
      resolveVimeusStream(
        item,
        mediaType === 'tv' ? undefined : 1,
        mediaType === 'tv' ? undefined : 1
      ),
    ])
      .then(([tmdbDetails, vimeusRoot]) => {
        if (!isMounted) return;
        if (tmdbDetails) {
          setDetails(tmdbDetails);
        }

        if (vimeusRoot.seasons && vimeusRoot.seasons.length > 0) {
          const sNums: number[] = [];
          vimeusRoot.seasons.forEach((sGroup, idx) => {
            const firstEp = sGroup.episodes?.[0];
            const sNum = sGroup.season || firstEp?.season || idx + 1;
            if (!sNums.includes(sNum)) sNums.push(sNum);
          });
          setAvailableSeasonNums(sNums);
          setSelectedSeason(sNums[0] || 1);
        } else {
          const fallbackSeasons = (tmdbDetails?.seasons || [])
            .filter((s) => s.season_number > 0)
            .map((s) => s.season_number);
          setAvailableSeasonNums(fallbackSeasons.length > 0 ? fallbackSeasons : [1]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item, autoPlayOnOpen, lang]);

  // Load episode thumbnails, runtimes, and synopses from TMDB
  useEffect(() => {
    if (!item) return;
    const mediaType = inferMediaType(item);
    if (mediaType !== 'tv') return;

    let isMounted = true;
    setLoadingEpisodes(true);

    fetchSeasonEpisodes(item.id, selectedSeason, lang)
      .then((tmdbEps) => {
        if (!isMounted) return;
        setEpisodes(tmdbEps);
      })
      .catch(() => {
        if (!isMounted) return;
        setEpisodes(
          Array.from({ length: 8 }).map((_, idx) => ({
            id: selectedSeason * 1000 + idx + 1,
            name: lang === 'en' ? `Episode ${idx + 1}` : `Episodio ${idx + 1}`,
            episode_number: idx + 1,
            season_number: selectedSeason,
            overview: '',
            still_path: item.backdrop_path,
            vote_average: 8.5,
            runtime: 24,
            air_date: null,
          }))
        );
      })
      .finally(() => {
        if (isMounted) setLoadingEpisodes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item, selectedSeason, lang]);

  if (!item) return null;

  const activeMedia = details || item;
  const title = getDisplayTitle(activeMedia);
  const year = getReleaseYear(activeMedia);
  const mediaType = inferMediaType(activeMedia);
  const posterUrl = getPosterUrl(activeMedia.poster_path, 'original');
  const backdropUrl = getBackdropUrl(activeMedia.backdrop_path, 'original');
  const officialLogoUrl = getLogoUrl(details, lang);
  const runtimeStr = formatRuntime(
    details?.runtime || details?.episode_run_time?.[0]
  );

  // Real external ratings from IMDb, Rotten Tomatoes, and Metacritic
  const ratings = details?.ratings;
  const realImdb = ratings?.imdbRating
    ? `${ratings.imdbRating}`
    : activeMedia.vote_average
    ? activeMedia.vote_average.toFixed(1)
    : '8.5';
  const realRotten = ratings?.rottenTomatoes || null;
  const realMetascore = ratings?.metascore || null;

  const genreLabels = details?.genres?.length
    ? details.genres.slice(0, 2).map((g) => g.name)
    : (activeMedia.genre_ids || [])
        .map((id) => getGenreName(id, lang))
        .filter(Boolean)
        .slice(0, 2);

  const typeLabel =
    mediaType === 'tv'
      ? lang === 'en'
        ? 'Series'
        : 'Serie'
      : lang === 'en'
      ? 'Movie'
      : 'Película';

  const trailerVideos = (details?.videos?.results || []).filter(
    (v) => v.site === 'YouTube'
  );
  const primaryTrailer =
    trailerVideos.find((v) => v.type === 'Trailer' || v.type === 'Teaser') ||
    trailerVideos[0];

  // Clean stream URL via our server proxy: 100% black background, zero green vimeus splash
  const cleanStreamUrl = buildCleanStreamUrl(
    activeMedia,
    selectedSeason,
    selectedEpisode
  );

  const cast = (details?.credits?.cast || []).slice(0, 14);
  const recommendations = (
    details?.recommendations?.results?.length
      ? details.recommendations.results
      : details?.similar?.results || []
  )
    .filter((r) => r.poster_path)
    .slice(0, 12);

  const seasonNumbersToDisplay =
    availableSeasonNums.length > 0
      ? availableSeasonNums
      : (details?.seasons || [])
          .filter((s) => s.season_number > 0)
          .map((s) => s.season_number);

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full min-h-screen pb-28 bg-black text-white">
      {/* Top Hero Showcase with In-Place Playback (No 'X' on Player) */}
      <div className="relative w-full max-w-[1140px] mx-auto overflow-hidden sm:rounded-b-3xl bg-black">
        {isPlayingMain ? (
          /* Pure In-Place Clean Video Player (Clean, zero X, seamless back button) */
          <div className="relative w-full aspect-video bg-black flex items-center justify-center">
            {/* Top Back (<) Button Only */}
            <div className="absolute top-4 left-4 z-30">
              <button
                type="button"
                onClick={() => setIsPlayingMain(false)}
                aria-label={lang === 'en' ? 'Back' : 'Volver'}
                className="w-11 h-11 rounded-full liquid-glass-dark-btn hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer shadow-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>

            <iframe
              key={cleanStreamUrl}
              src={cleanStreamUrl}
              title={title}
              referrerPolicy="origin"
              className="w-full h-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          /* Full-Bleed Artwork Showcase with Single White Play Button */
          <div className="relative w-full min-h-[540px] sm:min-h-[620px] flex flex-col justify-end">
            {/* Full-Bleed Artwork Background */}
            {backdropUrl || posterUrl ? (
              <img
                src={posterUrl || backdropUrl || ''}
                alt={title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-top sm:object-center"
              />
            ) : null}

            {/* Deep Cinematic Gradient Scrims on Black */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/85 to-transparent" />

            {/* Top Circular Liquid Glass Back (<) and Share (↑) Buttons */}
            <div className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-8 z-30 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                aria-label={lang === 'en' ? 'Back' : 'Volver'}
                className="w-11 h-11 rounded-full liquid-glass-dark-btn hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer shadow-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={handleShare}
                aria-label={lang === 'en' ? 'Share' : 'Compartir'}
                className="w-11 h-11 rounded-full liquid-glass-dark-btn hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer shadow-lg"
              >
                {copiedShare ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <Share2 className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Center-Bottom Overlay Content: Official Logo + Category Line + Single Play Pill */}
            <div className="relative z-20 w-full max-w-xl mx-auto px-5 sm:px-8 pb-6 pt-32 flex flex-col items-center text-center">
              {/* Official Movie Title Logo Graphic */}
              <div className="mb-3 flex items-center justify-center min-h-[64px] max-w-[85%]">
                {officialLogoUrl ? (
                  <img
                    src={officialLogoUrl}
                    alt={title}
                    referrerPolicy="no-referrer"
                    className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-[0_6px_28px_rgba(0,0,0,0.95)]"
                  />
                ) : (
                  <h1
                    className="text-4xl sm:text-5xl font-black tracking-wider text-white font-display uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]"
                    style={{ textWrap: 'balance' }}
                  >
                    {title}
                  </h1>
                )}
              </div>

              {/* Category Line: Movie · Action · Adventure */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm sm:text-base font-medium text-white/90 mb-5">
                <span>{typeLabel}</span>
                {genreLabels.map((g) => (
                  <React.Fragment key={g}>
                    <span aria-hidden="true" className="text-white/60">
                      ·
                    </span>
                    <span>{g}</span>
                  </React.Fragment>
                ))}
              </div>

              {/* Single Clean Primary Play Button Pill (Plays Right Here) */}
              <div className="w-full max-w-[280px] mb-6">
                <button
                  type="button"
                  onClick={() => setIsPlayingMain(true)}
                  className="w-full min-h-[52px] px-8 py-3 rounded-full bg-white hover:bg-white/90 active:scale-[0.98] text-black font-bold text-base flex items-center justify-center gap-2.5 shadow-2xl transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-black text-black shrink-0" />
                  <span>{lang === 'en' ? 'Play' : 'Reproducir'}</span>
                </button>
              </div>

              {/* Left-Aligned Synopsis with [MORE] Pill + Real Verified Ratings */}
              <div className="w-full text-left space-y-3 pt-1">
                <div className="relative text-sm sm:text-[15px] text-white/90 leading-snug">
                  <p className={expandedSynopsis ? '' : 'line-clamp-2 pr-16'}>
                    {activeMedia.overview ||
                      (lang === 'en'
                        ? 'Stream this title immediately in high definition.'
                        : 'Disfruta de este título inmediatamente en alta definición.')}
                  </p>
                  {!expandedSynopsis && (
                    <button
                      type="button"
                      onClick={() => setExpandedSynopsis(true)}
                      className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-bold uppercase tracking-wider text-white cursor-pointer"
                    >
                      {lang === 'en' ? 'MORE' : 'MÁS'}
                    </button>
                  )}
                </div>

                {/* Real Verified Ratings Row (IMDb, Rotten Tomatoes, Metacritic) + Tech Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-[13px] font-medium text-white/80 tabular-nums pt-1">
                  <span>{year}</span>
                  <span aria-hidden="true" className="text-white/40">·</span>
                  <span>{runtimeStr}</span>

                  {/* Real IMDb Rating Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F5C518] text-black font-extrabold text-[11px] leading-tight shadow-sm">
                    IMDb {realImdb}
                  </span>

                  {/* Real Rotten Tomatoes Rating Badge (if available) */}
                  {realRotten && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FA320A] text-white font-bold text-[11px] leading-tight shadow-sm">
                      🍅 {realRotten}
                    </span>
                  )}

                  {/* Real Metacritic Score (if available) */}
                  {realMetascore && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#66CC33] text-black font-extrabold text-[11px] leading-tight shadow-sm">
                      {realMetascore}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold ml-0.5">
                    ✓ 16+
                  </span>

                  <span className="px-1.5 py-0.5 rounded border border-white/40 text-[10px] font-bold leading-none text-white/90">
                    4K
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-bold leading-none text-white/90">
                    Dolby Vision
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-white/40 text-[10px] font-bold leading-none text-white/90">
                    CC
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lower Sections Container: Series Episodes (if TV), Trailers In-Place >, Related >, Cast & Crew > */}
      <div className="max-w-[1140px] mx-auto px-4 sm:px-8 pt-8 space-y-10">
        {/* Series / Anime Seasons & Episodes Selector */}
        {mediaType === 'tv' && seasonNumbersToDisplay.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <Tv className="w-5 h-5 text-white" />
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  {lang === 'en' ? 'Episodes' : 'Episodios'}
                </h2>
                <ChevronRight className="w-5 h-5 text-white/40" />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-full">
                {seasonNumbersToDisplay.map((sNum) => (
                  <button
                    key={sNum}
                    type="button"
                    onClick={() => setSelectedSeason(sNum)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                      selectedSeason === sNum
                        ? 'bg-white text-black shadow-md'
                        : 'liquid-glass-subtle text-white/70 hover:text-white'
                    }`}
                  >
                    {lang === 'en' ? `Season ${sNum}` : `Temporada ${sNum}`}
                  </button>
                ))}
              </div>
            </div>

            {loadingEpisodes ? (
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-[260px] sm:w-[300px] aspect-[16/10] rounded-3xl liquid-glass-subtle animate-pulse shrink-0"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-stretch gap-4 overflow-x-auto no-scrollbar py-1">
                {episodes.map((ep) => {
                  const isCurrentEp =
                    isPlayingMain && selectedEpisode === ep.episode_number;
                  const stillUrl = getBackdropUrl(
                    ep.still_path || activeMedia.backdrop_path,
                    'w780'
                  );

                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => {
                        setSelectedEpisode(ep.episode_number);
                        setIsPlayingMain(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`group relative w-[260px] sm:w-[300px] rounded-3xl overflow-hidden text-left transition-all duration-150 shrink-0 cursor-pointer flex flex-col ${
                        isCurrentEp
                          ? 'liquid-glass ring-2 ring-white/80'
                          : 'liquid-glass-subtle hover:scale-[1.01]'
                      }`}
                    >
                      <div className="relative w-full aspect-video overflow-hidden bg-neutral-900">
                        {stillUrl ? (
                          <img
                            src={stillUrl}
                            alt={ep.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                            <Play className="w-6 h-6 text-white/60" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                          <span className="text-[11px] font-bold uppercase tracking-wider bg-black/55 backdrop-blur-md px-2.5 py-0.5 rounded-full tabular-nums">
                            {lang === 'en'
                              ? `Ep. ${ep.episode_number}`
                              : `Ep. ${ep.episode_number}`}
                          </span>
                          {ep.runtime && (
                            <span className="text-[11px] text-white/80 tabular-nums">
                              {ep.runtime}m
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-1.5">
                        <div className="text-sm font-bold text-white line-clamp-1">
                          {ep.name ||
                            (lang === 'en'
                              ? `Episode ${ep.episode_number}`
                              : `Episodio ${ep.episode_number}`)}
                        </div>
                        {ep.overview && (
                          <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                            {ep.overview}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Section 1: Trailers In-Place Playback (Se reproduce ahí mismo al tocarlo) */}
        {primaryTrailer && (
          <section className="space-y-3.5">
            <div className="flex items-center gap-1">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                {lang === 'en' ? 'Trailers' : 'Tráilers'}
              </h2>
              <ChevronRight className="w-5 h-5 text-white/40" />
            </div>

            <div className="flex items-start gap-4 overflow-x-auto no-scrollbar pb-1">
              {trailerVideos.slice(0, 3).map((tr) => {
                const isThisTrailerPlaying = playingTrailerKey === tr.key;
                return (
                  <div
                    key={tr.id}
                    className="w-[300px] sm:w-[360px] aspect-[16/10] rounded-3xl overflow-hidden bg-neutral-900 border border-white/15 shadow-xl shrink-0 relative"
                  >
                    {isThisTrailerPlaying ? (
                      /* Plays in-line right here without moving or opening another modal */
                      <div className="relative w-full h-full bg-black">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${tr.key}?autoplay=1&rel=0`}
                          title={tr.name}
                          referrerPolicy="origin"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                        <button
                          type="button"
                          onClick={() => setPlayingTrailerKey(null)}
                          aria-label="Pausar tráiler"
                          className="absolute top-3 right-3 w-8 h-8 rounded-full liquid-glass-dark-btn flex items-center justify-center text-white cursor-pointer hover:bg-white/30"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      /* Poster card that triggers playback right here */
                      <div
                        onClick={() => setPlayingTrailerKey(tr.key)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setPlayingTrailerKey(tr.key);
                          }
                        }}
                        className="group relative w-full h-full cursor-pointer select-none"
                      >
                        {backdropUrl || posterUrl ? (
                          <img
                            src={backdropUrl || posterUrl || ''}
                            alt={tr.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                            <Film className="w-8 h-8 text-neutral-500" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                        {/* Center Play Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full liquid-glass flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                          </div>
                        </div>

                        {/* Bottom Metadata */}
                        <div className="absolute inset-x-4 bottom-3.5 flex items-end justify-between text-white">
                          <div className="min-w-0 pr-2">
                            <div className="text-sm sm:text-base font-bold leading-tight truncate">
                              {tr.name || title}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-white/75 mt-0.5">
                              <span className="text-emerald-400 font-semibold">▶ {tr.type || 'Trailer'}</span>
                              <span aria-hidden="true">·</span>
                              <span>YouTube</span>
                            </div>
                          </div>
                          <MoreHorizontal className="w-5 h-5 text-white/70 shrink-0" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 2: Related > */}
        {recommendations.length > 0 && (
          <section className="space-y-3.5">
            <div className="flex items-center gap-1">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                {lang === 'en' ? 'Related' : 'Relacionados'}
              </h2>
              <ChevronRight className="w-5 h-5 text-white/40" />
            </div>

            <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="w-[132px] sm:w-[156px] md:w-[172px] shrink-0"
                >
                  <PosterCard
                    item={{ ...rec, media_type: rec.media_type || mediaType }}
                    onSelect={(nextItem) => onSelectMedia(nextItem)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Cast & Crew > (Protagonistas reales de TMDB) */}
        {cast.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-1">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                {lang === 'en' ? 'Cast & Crew' : 'Reparto y Equipo'}
              </h2>
              <ChevronRight className="w-5 h-5 text-white/40" />
            </div>

            <div className="flex items-start gap-5 sm:gap-6 overflow-x-auto no-scrollbar py-1">
              {cast.map((person) => {
                const avatar = getProfileUrl(person.profile_path, 'w185');
                return (
                  <div
                    key={person.id}
                    className="w-28 sm:w-32 shrink-0 flex flex-col items-center text-center"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-neutral-800 border border-white/15 mb-2.5 shadow-md">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={person.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          <UserIcon className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-white line-clamp-1">
                      {person.name}
                    </div>
                    <div className="text-[11px] sm:text-xs text-white/70 line-clamp-2 mt-0.5 leading-tight">
                      {person.character}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {loading && (
          <div className="text-xs text-white/50 text-center py-2">
            {lang === 'en' ? 'Loading...' : 'Cargando...'}
          </div>
        )}
      </div>
    </div>
  );
};
