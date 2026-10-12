import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { AppLanguage, CategoryOption } from '../types/tmdb';

interface TopNavProps {
  categories: CategoryOption[];
  selectedCategory: CategoryOption;
  onSelectCategory: (cat: CategoryOption) => void;
  lang: AppLanguage;
}

export const TopNav: React.FC<TopNavProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  lang,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCustomCategory = selectedCategory.id !== 'all';
  const activeLabel = isCustomCategory
    ? lang === 'en'
      ? selectedCategory.labelEn
      : selectedCategory.labelEs
    : lang === 'en'
    ? 'Categories'
    : 'Categorías';

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-8 md:px-12 pt-4 pb-2 pointer-events-none">
      <div className="max-w-[1440px] mx-auto flex items-center justify-start">
        {/* Single Floating Liquid Glass Category Capsule on Top-Left Side */}
        <div className="relative pointer-events-auto" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="min-h-[40px] px-4 py-2 rounded-full liquid-glass hover:scale-[1.02] active:scale-[0.98] app-text-primary text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-150 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 opacity-80" />
            <span>{activeLabel}</span>
            <ChevronDown
              className={`w-4 h-4 opacity-75 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Refractive Liquid Glass Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 mt-2.5 w-60 rounded-3xl liquid-glass p-2 z-50 max-h-[70vh] overflow-y-auto shadow-2xl">
              {categories.map((cat) => {
                const selected = selectedCategory.id === cat.id;
                const label = lang === 'en' ? cat.labelEn : cat.labelEs;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 rounded-2xl text-left text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer ${
                      selected
                        ? 'liquid-dock-active app-text-primary font-bold'
                        : 'app-text-secondary hover:bg-white/10 hover:app-text-primary font-medium'
                    }`}
                  >
                    <span>{label}</span>
                    {selected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
