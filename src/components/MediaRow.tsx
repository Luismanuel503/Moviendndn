import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types/tmdb';
import { PosterCard } from './PosterCard';

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  items,
  onSelect,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const { scrollLeft, clientWidth } = rowRef.current;
    const scrollAmount = clientWidth * 0.78;
    rowRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 py-3">
      {/* Row Header */}
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight app-text-primary font-display">
          {title}
        </h2>

        {/* Subtle Desktop Scroll Arrows */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label="Scroll left"
            className="w-8 h-8 rounded-full liquid-glass-subtle hover:opacity-100 flex items-center justify-center app-text-secondary transition-colors duration-150 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label="Scroll right"
            className="w-8 h-8 rounded-full liquid-glass-subtle hover:opacity-100 flex items-center justify-center app-text-secondary transition-colors duration-150 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Clean Vertical Cards Strip — Pure Artwork, Zero Text Underneath */}
      <div
        ref={rowRef}
        className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 scroll-smooth"
      >
        {items.map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="w-[118px] sm:w-[146px] md:w-[168px] lg:w-[186px] shrink-0"
          >
            <PosterCard item={item} onSelect={onSelect} priority={idx < 6} />
          </div>
        ))}
      </div>
    </section>
  );
};
