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

  const languages: Array<{ code: WebLanguage; label: string; flag: string }> = [
    { code: 'uz', label: 'O‘zbekcha', flag: '🇺🇿' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
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
    <header className="sticky top-0 z-20 w-full backdrop-blur-xl bg-white/85 dark:bg-[#090D18]/90 border-b border-slate-200/80 dark:border-slate-800/80 px-6 sm:px-8 lg:px-10 py-4 sm:py-5 min-h-[76px] flex items-center justify-between gap-6 transition-colors shadow-sm">
      {/* Left: Mobile Sidebar Trigger & Global Search */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Input with Autocomplete Popover */}
        <div ref={searchContainerRef} className="relative w-full max-w-lg">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
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
              placeholder="Darslik, sinf yoki fanni qidiring... (masalan: 5-sinf, ingliz tili)"
              className="w-full h-11 pl-11 pr-10 text-xs sm:text-sm rounded-2xl bg-slate-100 dark:bg-[#121A2D] border border-slate-200/80 dark:border-[#23304E] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDropdownOpen(false);
                }}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {dropdownOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-12 rounded-2xl bg-white dark:bg-[#121A2D] border border-slate-200 dark:border-[#23304E] shadow-2xl p-2 z-50 max-h-96 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span>Topilgan darsliklar</span>
                <span>{matchedBooks.length} ta natija</span>
              </div>

              {matchedBooks.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  “{searchQuery}” bo‘yicha hech qanday darslik topilmadi
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
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
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1A243E] transition-colors flex items-center gap-3 group"
                      >
                        <div className="w-9 h-12 rounded-lg bg-indigo-600 overflow-hidden shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm">
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
                            <span className="px-1.5 py-0.2 text-[10px] font-extrabold uppercase rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                              {formatGrade(book.gradeId)}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 truncate">
                              {formatBookType(book.type)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {book.title}
                          </p>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Languages, Theme, User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Language Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLanguage(item.code)}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                language === item.code
                  ? 'bg-white dark:bg-[#121A2D] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={item.label}
            >
              {item.code.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* User Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-extrabold text-sm uppercase shadow-sm">
          {user?.fullName ? user.fullName[0] : user?.email ? user.email[0] : 'O'}
        </div>
      </div>
    </header>
  );
};
