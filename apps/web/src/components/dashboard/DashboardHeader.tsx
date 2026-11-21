import React, { useEffect, useRef, useState } from 'react';
import type { Book } from '@smartteacherbook/shared';
import {
  Search,
  X,
  Sun,
  Moon,
  Menu,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { matchesBookSearch } from '../../utils/searchMatch';
import type { WebLanguage } from '../../services/storage/webStorage';

interface DashboardHeaderProps {
  books: Book[];
  subjects: any[];
  onOpenMobileSidebar: () => void;
  onSelectBook: (book: Book) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  books,
  subjects,
  onOpenMobileSidebar,
  onSelectBook,
}) => {
  const { themeMode, isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t, formatGrade, formatBookType, formatSubject } = useI18n();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const languages: Array<{ code: WebLanguage; label: string; flag: string; short: string }> = [
    { code: 'uz', label: 'Özbekça', flag: '🇺🇿', short: 'UZ' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺', short: 'RU' },
    { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
  ];

  // Filter books matching query
  const matchedBooks = React.useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return books
      .filter((b) => matchesBookSearch(b, q, subjects))
      .slice(0, 8);
  }, [books, searchQuery, subjects]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 w-full backdrop-blur-xl bg-[#FBFBF9]/90 dark:bg-[#1E222A]/90 border-b border-[#D9DCD5] dark:border-[#353B47] px-3 sm:px-6 lg:px-10 py-3 sm:py-4 min-h-[60px] sm:min-h-[76px] flex items-center justify-between gap-2.5 sm:gap-6 transition-colors shadow-sm">
      {/* Left: Mobile Sidebar Trigger & Global Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-2xl">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 sm:p-2.5 rounded-xl text-[#1F2933] dark:text-[#E6E8EC] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] transition-colors shrink-0"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Input with Autocomplete Popover */}
        <div ref={searchContainerRef} className="relative w-full">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-[#5B6672] dark:text-[#9AA3B0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) setDropdownOpen(true);
              }}
              placeholder={t('dashboard.searchHint')}
              className="w-full h-11 pl-11 pr-10 text-xs sm:text-sm rounded-2xl bg-[#F4F5F2] dark:bg-[#15181E] border border-[#D9DCD5] dark:border-[#353B47] text-[#1F2933] dark:text-[#E6E8EC] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8]/20 focus:border-[#2A4FB8] transition-all placeholder:text-[#5B6672] dark:placeholder:text-[#9AA3B0]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDropdownOpen(false);
                }}
                className="absolute right-3.5 top-3.5 text-[#5B6672] hover:text-[#1F2933] dark:hover:text-[#E6E8EC]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {dropdownOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-12 rounded-2xl bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] shadow-2xl p-2 z-50 max-h-96 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#5B6672] dark:text-[#9AA3B0] border-b border-[#D9DCD5] dark:border-[#353B47] flex items-center justify-between">
                <span>{t('dashboard.searchFoundTitle')}</span>
                <span>{t('dashboard.searchFoundCount', { count: matchedBooks.length })}</span>
              </div>

              {matchedBooks.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#5B6672] dark:text-[#9AA3B0]">
                  {t('dashboard.searchNoResults', { query: searchQuery })}
                </div>
              ) : (
                <div className="divide-y divide-[#D9DCD5] dark:divide-[#353B47]">
                  {matchedBooks.map((book) => {
                    const subj = subjects.find((s) => s.id === book.subjectId);
                    return (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => {
                          onSelectBook(book);
                          setDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] transition-colors flex items-center gap-3 group"
                      >
                        <div className="w-9 h-12 rounded-lg bg-[#2A4FB8] overflow-hidden shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {book.coverImageUrl ? (
                            <img
                              src={book.coverImageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{subj?.icon || '📘'}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="px-1.5 py-0.2 text-[10px] font-extrabold uppercase rounded bg-[#EEF4FF] dark:bg-[#142452] text-[#2A4FB8] dark:text-[#5B93FA]">
                              {formatGrade(book.gradeId)}
                            </span>
                            <span className="text-[10px] font-semibold text-[#5B6672] dark:text-[#9AA3B0] truncate">
                              {formatBookType(book.type)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-[#1F2933] dark:text-[#E6E8EC] truncate group-hover:text-[#2A4FB8] dark:group-hover:text-[#5B93FA] transition-colors">
                            {book.title}
                          </p>
                        </div>

                        <ArrowRight className="w-4 h-4 text-[#5B6672] group-hover:text-[#2A4FB8] dark:group-hover:text-[#5B93FA] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Languages, Theme, User Avatar (Desktop only - on mobile these are accessible in sidebar menu) */}
      <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Language Switcher */}
        <div className="flex items-center bg-[#ECEEEA] dark:bg-[#272C36] p-0.5 rounded-xl border border-[#D9DCD5] dark:border-[#353B47]">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLanguage(item.code)}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                language === item.code
                  ? 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#2A4FB8] dark:text-[#5B93FA] shadow-sm'
                  : 'text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#1F2933] dark:hover:text-[#E6E8EC]'
              }`}
              title={item.label}
            >
              {item.short}
            </button>
          ))}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-[#ECEEEA] dark:bg-[#272C36] text-[#5B6672] dark:text-[#9AA3B0] hover:bg-[#EEF4FF] dark:hover:bg-[#142452] border border-[#D9DCD5] dark:border-[#353B47] transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#2A4FB8]" />}
        </button>

        {/* User Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2A4FB8] to-[#1C3375] text-white flex items-center justify-center font-extrabold text-sm uppercase shadow-sm">
          {user?.fullName ? user.fullName[0] : user?.email ? user.email[0] : 'O'}
        </div>
      </div>
    </header>
  );
};
