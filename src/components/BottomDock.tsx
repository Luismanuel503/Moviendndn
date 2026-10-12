import React from 'react';
import { Home, Search } from 'lucide-react';
import { AppLanguage, MainTab } from '../types/tmdb';

interface BottomDockProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  lang: AppLanguage;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  activeTab,
  onSelectTab,
  lang,
}) => {
  return (
    <div className="fixed bottom-4 inset-x-0 z-50 px-4 flex justify-center pointer-events-none">
      <nav
        aria-label="Navigation"
        className="pointer-events-auto w-full max-w-[260px] p-1.5 rounded-full liquid-dock grid grid-cols-2 items-center gap-1.5"
      >
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`min-h-[50px] rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
            activeTab === 'home'
              ? 'liquid-dock-active text-white font-semibold'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 tracking-tight font-medium">Home</span>
        </button>

        {/* 2. Search */}
        <button
          type="button"
          onClick={() => onSelectTab('search')}
          className={`min-h-[50px] rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
            activeTab === 'search'
              ? 'liquid-dock-active text-white font-semibold'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 tracking-tight font-medium">
            {lang === 'en' ? 'Search' : 'Buscar'}
          </span>
        </button>
      </nav>
    </div>
  );
};
