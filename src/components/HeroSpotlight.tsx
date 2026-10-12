import React, { useEffect, useState, useMemo } from 'react';
import { Play } from 'lucide-react';
import { AppLanguage, MediaDetails, MediaItem } from '../types/tmdb';
import {
  fetchMediaDetails,
  getBackdropUrl,
  getDisplayTitle,
  getGenreName,
  getLogoUrl,
  getPosterUrl,
  inferMediaType,
} from '../services/tmdb';

interface HeroSpotlightProps {
  items: MediaItem[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  onPlay: (item: MediaItem) => void;
  onMoreInfo: (item: MediaItem) => void;
  lang: AppLanguage;
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  items,
  activeIndex,
  onPlay,
  onMoreInfo,
  lang,
}) => {
  const [logoCache, setLogoCache] = useState<Record<string, string | null>>({});
  const slideItems = items.slice(0, 6);
  const featured = slideItems[activeIndex] || slideItems[0];

  useEffect(() => {
    if (!featured) return;
    const cacheKey = `${featured.id}-${lang}`;
    if (logoCache[cacheKey] !== undefined) return;

    let isMounted = true;
    const type = inferMediaType(featured);
    fetchMediaDetails(featured.id, type, lang)
      .then((details: MediaDetails) => {
        if (!isMounted) return;
        const logo = getLogoUrl(details, lang);
        setLogoCache((prev) => ({ ...prev, [cacheKey]: logo }));
      })
      .catch(() => {
        if (!isMounted) return;
        setLogoCache((prev) => ({ ...prev, [cacheKey]: null }));
      });
    return () => {
      isMounted = false;
    };
  }, [featured, lang, logoCache]);

  if (!featured) return null;

  const title = getDisplayTitle(featured);
  const posterUrl = getPosterUrl(featured.poster_path, 'w780');
  const backdropUrl = getBackdropUrl(featured.backdrop_path, 'original');
  const officialLogoUrl = logoCache[`${featured.id}-${lang}`];

  const genreTags = (featured.genre_ids || [])
    .map((id) => getGenreName(id, lang))
    .filter(Boolean)
    .slice(0, 2);

  const acclaimLabel =
    lang === 'en' ? 'Critically Acclaimed' : 'Aclamada por la Crítica';
  const tagsToShow =
    genreTags.length > 0
      ? [...genreTags, acclaimLabel]
      : [lang === 'en' ? 'Drama' : 'Drama', acclaimLabel];

  return (
    <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 pt-2 pb-5 flex justify-center">
      {/* Framed Vertical Portrait Hero Card with Liquid Glass */}
      <div
        onClick={() => onMoreInfo(featured)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onMoreInfo(featured);
        }}
        className="relative w-full max-w-[460px] sm:max-w-[490px] aspect-[3/4.2] overflow-hidden liquid-hero-card bg-black cursor-pointer group select-none"
      >
        {posterUrl ? (
          <img
            key={`${featured.id}-${lang}`}
            src={posterUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : backdropUrl ? (
          <img
            src={backdropUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : null}

        {/* Smooth Bottom Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Bottom Content Inside Hero Card */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col items-center text-center z-10">
          {/* Official Movie / Series Title Logo */}
          <div className="mb-3 flex items-center justify-center min-h-[56px] max-w-[88%]">
            {officialLogoUrl ? (
              <img
                src={officialLogoUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="max-h-16 sm:max-h-20 w-auto object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.95)]"
              />
            ) : (
              <h1
                className="text-3xl sm:text-4xl font-extrabold tracking-wider text-white font-display uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] line-clamp-2"
                style={{ textWrap: 'balance' }}
              >
                {title}
              </h1>
            )}
          </div>

          {/* Bullet Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-[13px] font-medium text-white/90 mb-4">
            {tagsToShow.map((tag, idx) => (
              <React.Fragment key={tag}>
                {idx > 0 && (
                  <span aria-hidden="true" className="text-white/50">
                    •
                  </span>
                )}
                <span>{tag}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Clean Single Play Button in White Liquid Capsule */}
          <div
            className="w-full max-w-[240px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onPlay(featured)}
              className="w-full min-h-[46px] px-6 py-2.5 rounded-full bg-white hover:bg-white/90 active:scale-[0.98] text-black font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black text-black shrink-0" />
              <span>{lang === 'en' ? 'Play' : 'Reproducir'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
