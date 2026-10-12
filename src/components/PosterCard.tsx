import React, { useState } from 'react';
import { Film } from 'lucide-react';
import { MediaItem } from '../types/tmdb';
import { getDisplayTitle, getPosterUrl } from '../services/tmdb';

interface PosterCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  priority?: boolean;
}

export const PosterCard: React.FC<PosterCardProps> = ({
  item,
  onSelect,
  priority = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const posterUrl = getPosterUrl(item.poster_path, 'w500');
  const title = getDisplayTitle(item);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-label={title}
      className="group relative block w-full aspect-[2/3] overflow-hidden liquid-poster-card bg-neutral-900 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
    >
      {/* Loading Shimmer */}
      {!imgLoaded && !imgError && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/15 to-white/5 animate-pulse" />
      )}

      {/* 100% Pure Clean Vertical Poster Artwork — Zero text underneath, zero watermarks */}
      {posterUrl && !imgError ? (
        <img
          src={posterUrl}
          alt={title}
          loading={priority ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-center">
          <Film className="w-7 h-7 text-neutral-500 mb-2" />
          <span className="text-xs font-medium text-neutral-300 line-clamp-2">{title}</span>
        </div>
      )}

      {/* Subtle Specular Glass Rim */}
      <div className="pointer-events-none absolute inset-0 rounded-[0.875rem] ring-1 ring-inset ring-white/15 group-hover:ring-white/45 transition-all duration-150" />
    </button>
  );
};
