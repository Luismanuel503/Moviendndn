import React, { useEffect, useState, useMemo } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import {
  AppLanguage,
  CategoryOption,
  MainTab,
  MediaItem,
} from './types/tmdb';
import {
  fetchByGenreFilter,
  fetchHomeCatalog,
  searchMultiMedia,
} from './services/tmdb';
import { TopNav } from './components/TopNav';
import { HeroSpotlight } from './components/HeroSpotlight';
import { MediaRow } from './components/MediaRow';
import { PosterCard } from './components/PosterCard';
import { MediaModal } from './components/MediaModal';
import { BottomDock } from './components/BottomDock';

const CATEGORIES: CategoryOption[] = [
  { id: 'all', labelEs: 'Todas las Categorías', labelEn: 'All Categories' },
  { id: 'series', labelEs: 'Series', labelEn: 'Series' },
  { id: 'movies', labelEs: 'Películas', labelEn: 'Movies' },
  { id: 'anime', labelEs: 'Anime', labelEn: 'Anime', isAnime: true },
  { id: 'action', labelEs: 'Acción', labelEn: 'Action', genreId: 28 },
  { id: 'scifi', labelEs: 'Ciencia Ficción', labelEn: 'Sci-Fi', genreId: 878 },
  { id: 'drama', labelEs: 'Drama', labelEn: 'Drama', genreId: 18 },
  { id: 'thriller', labelEs: 'Suspense', labelEn: 'Thriller', genreId: 53 },
  { id: 'comedy', labelEs: 'Comedia', labelEn: 'Comedy', genreId: 35 },
  { id: 'horror', labelEs: 'Terror', labelEn: 'Horror', genreId: 27 },
  { id: 'fantasy', labelEs: 'Fantasía', labelEn: 'Fantasy', genreId: 14 },
  { id: 'romance', labelEs: 'Romance', labelEn: 'Romance', genreId: 10749 },
];

export default function App() {
  // Pure 2-Tab Dock: 'home' | 'search' (Zero user tab, zero settings)
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>(
    CATEGORIES[0]
  );

  // Default Spanish language
  const [lang] = useState<AppLanguage>('es');

  // Real-time TMDB Catalog
  const [homeData, setHomeData] = useState<{
    trending: MediaItem[];
    popularMovies: MediaItem[];
    topRatedMovies: MediaItem[];
    popularSeries: MediaItem[];
    animeCatalog: MediaItem[];
    sciFiAction: MediaItem[];
  } | null>(null);

  const [genreItems, setGenreItems] = useState<MediaItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState<number>(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Selected Movie / Series Detail View
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [autoPlayModal, setAutoPlayModal] = useState<boolean>(false);

  // Load TMDB Catalog
  const loadCatalogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHomeCatalog(lang);
      setHomeData(res);
      setHeroIndex(0);
    } catch {
      setError('No se pudo conectar con el catálogo en este momento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, [lang]);

  // Load specific genre when category dropdown changes
  useEffect(() => {
    if (!selectedCategory.genreId) {
      setGenreItems(null);
      return;
    }
    let isMounted = true;
    fetchByGenreFilter(selectedCategory.genreId, lang)
      .then((items) => {
        if (isMounted) setGenreItems(items);
      })
      .catch(() => {
        if (isMounted) setGenreItems(null);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedCategory, lang]);

  // Real-Time TMDB Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      setSearching(true);
      searchMultiMedia(searchQuery, lang)
        .then((res) => setSearchResults(res))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery, lang]);

  const handleOpenMedia = (item: MediaItem, autoPlay = false) => {
    setAutoPlayModal(autoPlay);
    setSelectedMedia(item);
  };

  const handleSelectTab = (tab: MainTab) => {
    setSelectedMedia(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hero Spotlight list based on selected category
  const activeHeroList = useMemo(() => {
    if (genreItems && genreItems.length > 0) return genreItems;
    if (!homeData) return [];
    if (selectedCategory.id === 'series') return homeData.popularSeries;
    if (selectedCategory.id === 'movies') return homeData.popularMovies;
    if (selectedCategory.id === 'anime') return homeData.animeCatalog;
    return homeData.trending;
  }, [homeData, selectedCategory, genreItems]);

  // Auto-advance hero spotlight
  useEffect(() => {
    if (activeTab !== 'home' || activeHeroList.length < 2 || selectedMedia) {
      return;
    }
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % Math.min(activeHeroList.length, 6));
    }, 9000);
    return () => clearInterval(interval);
  }, [activeTab, activeHeroList, selectedMedia]);

  // Content Rows
  const homeRows = useMemo(() => {
    if (!homeData) return [];

    if (genreItems && genreItems.length > 0) {
      return [
        { title: selectedCategory.labelEs, items: genreItems },
        { title: 'Tendencias Ahora', items: homeData.trending },
      ];
    }

    if (selectedCategory.id === 'series') {
      return [
        { title: 'Series Populares', items: homeData.popularSeries },
        { title: 'Tendencias', items: homeData.trending },
      ];
    }

    if (selectedCategory.id === 'movies') {
      return [
        { title: 'Películas Populares', items: homeData.popularMovies },
        { title: 'Mejor Valoradas', items: homeData.topRatedMovies },
        { title: 'Acción y Ciencia Ficción', items: homeData.sciFiAction },
      ];
    }

    if (selectedCategory.id === 'anime') {
      return [
        { title: 'Anime Destacado', items: homeData.animeCatalog },
        { title: 'Tendencias', items: homeData.trending },
      ];
    }

    return [
      { title: 'Tendencias Destacadas', items: homeData.trending },
      { title: 'Películas Populares', items: homeData.popularMovies },
      { title: 'Series Aclamadas', items: homeData.popularSeries },
      { title: 'Anime', items: homeData.animeCatalog },
      { title: 'Acción y Ciencia Ficción', items: homeData.sciFiAction },
    ];
  }, [homeData, selectedCategory, genreItems]);

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Main Viewport */}
        <main className="flex-1 pb-24">
          {selectedMedia ? (
            /* Movie / Series Showcase View */
            <MediaModal
              item={selectedMedia}
              autoPlayOnOpen={autoPlayModal}
              onClose={() => setSelectedMedia(null)}
              onSelectMedia={(nextItem) => {
                setAutoPlayModal(false);
                setSelectedMedia(nextItem);
              }}
              lang={lang}
            />
          ) : activeTab === 'search' ? (
            /* Clean Liquid Glass Search View */
            <section className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 pt-6 pb-24 space-y-6">
              <div className="max-w-xl mx-auto space-y-3">
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-full liquid-glass">
                  <Search className="w-5 h-5 text-white/50 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar películas, series, anime..."
                    autoFocus
                    className="w-full bg-transparent text-white placeholder-white/40 text-sm sm:text-base font-medium focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-white/60 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {searchQuery.trim() ? (
                <div className="space-y-4">
                  <h2 className="text-base sm:text-lg font-bold text-white font-display">
                    {searching
                      ? 'Buscando...'
                      : `Resultados para "${searchQuery}"`}
                  </h2>

                  {searchResults.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5 sm:gap-4">
                      {searchResults.map((item) => (
                        <PosterCard
                          key={`${item.id}-${item.media_type}`}
                          item={item}
                          onSelect={(selected) => handleOpenMedia(selected, false)}
                        />
                      ))}
                    </div>
                  ) : (
                    !searching && (
                      <div className="p-12 rounded-3xl liquid-glass-subtle text-center max-w-md mx-auto my-8">
                        <p className="text-sm text-white/70">
                          No se encontraron resultados para "{searchQuery}"
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                /* Popular Suggestions */
                homeData && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white font-display">
                      Populares Ahora
                    </h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5 sm:gap-4">
                      {homeData.trending.slice(0, 18).map((item) => (
                        <PosterCard
                          key={item.id}
                          item={item}
                          onSelect={(selected) => handleOpenMedia(selected, false)}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </section>
          ) : error ? (
            <div className="max-w-xl mx-auto my-20 p-8 rounded-3xl liquid-glass text-center space-y-4">
              <p className="text-base font-medium text-white">{error}</p>
              <button
                type="button"
                onClick={loadCatalogs}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar</span>
              </button>
            </div>
          ) : (
            /* Tab 1: Home (Top-Left Liquid Glass Categories Pill + Framed Portrait Hero Card + Clean Poster Rows) */
            <>
              <TopNav
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setHeroIndex(0);
                }}
                lang={lang}
              />

              {activeHeroList.length > 0 ? (
                <HeroSpotlight
                  items={activeHeroList}
                  activeIndex={heroIndex}
                  onSelectIndex={setHeroIndex}
                  onPlay={(item) => handleOpenMedia(item, true)}
                  onMoreInfo={(item) => handleOpenMedia(item, false)}
                  lang={lang}
                />
              ) : (
                <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 pt-2 pb-5 flex justify-center">
                  <div className="w-full max-w-[460px] aspect-[3/4.2] rounded-3xl liquid-glass animate-pulse" />
                </div>
              )}

              {loading && !homeData ? (
                <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 space-y-6 py-4">
                  {Array.from({ length: 3 }).map((_, rowIdx) => (
                    <div key={rowIdx} className="space-y-3">
                      <div className="h-5 w-40 rounded-lg liquid-glass-subtle animate-pulse" />
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {Array.from({ length: 6 }).map((__, cardIdx) => (
                          <div
                            key={cardIdx}
                            className="aspect-[2/3] rounded-xl liquid-glass-subtle animate-pulse"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {homeRows.map((row) =>
                    row.items.length > 0 ? (
                      <MediaRow
                        key={row.title}
                        title={row.title}
                        items={row.items}
                        onSelect={(item) => handleOpenMedia(item, false)}
                      />
                    ) : null
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {/* Pure 2-Tab Liquid Glass Bottom Dock: [Home] · [Search] */}
        <BottomDock
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          lang={lang}
        />
      </div>
    </div>
  );
}
