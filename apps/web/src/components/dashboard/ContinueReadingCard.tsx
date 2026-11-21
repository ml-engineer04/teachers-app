import React from 'react';
import type { Book } from '@smartteacherbook/shared';
import {
  Bookmark,
  BookOpen,
  ArrowRight,
  Sparkles,
  Clock,
  Compass,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface ContinueReadingCardProps {
  progressItem?: {
    bookId: string;
    lastPageNumber: number;
    updatedAt?: string;
    bookTitle?: string;
    coverImageUrl?: string;
    totalPages?: number;
    gradeId?: number;
    subjectId?: string;
  } | null;
  books: Book[];
  onOpenReader: (book: Book, initialPage?: number) => void;
  onExploreCatalog: () => void;
}

export const ContinueReadingCard: React.FC<ContinueReadingCardProps> = ({
  progressItem,
  books,
  onOpenReader,
  onExploreCatalog,
}) => {
  const { t, formatGrade, formatBookType } = useI18n();

  const targetBook = React.useMemo(() => {
    if (!progressItem) return null;
    return books.find((b) => b.id === progressItem.bookId) || null;
  }, [progressItem, books]);

  if (!progressItem || !targetBook) {
    return (
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#2A4FB8] via-[#223F94] to-[#0E7C70] text-white shadow-[0_12px_32px_-4px_rgba(42,79,184,0.25)] relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            {t('dashboard.continueHeroBadge')}
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            {t('dashboard.continueHeroTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
            {t('dashboard.continueHeroDesc')}
          </p>
        </div>

        <button
          type="button"
          onClick={onExploreCatalog}
          className="shrink-0 px-6 py-3.5 rounded-2xl bg-[#FBFBF9] text-[#2A4FB8] font-extrabold text-xs sm:text-sm shadow-lg hover:bg-[#EEF4FF] active:scale-95 transition-all flex items-center gap-2"
        >
          <Compass className="w-4 h-4" />
          <span>{t('dashboard.textbookCatalogBtn')}</span>
        </button>
      </div>
    );
  }

  const lastPage = progressItem.lastPageNumber || 1;
  const total = targetBook.totalPages || progressItem.totalPages || 100;
  const percent = Math.min(100, Math.max(1, Math.round((lastPage / total) * 100)));

  return (
    <div className="rounded-3xl p-6 sm:p-7 bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] shadow-soft hover:shadow-[0_12px_32px_-4px_rgba(42,79,184,0.15)] transition-all flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Left: Book Cover & Progress Info */}
      <div className="flex items-center gap-5 w-full md:w-auto">
        {/* Book Cover */}
        <div className="w-20 h-28 rounded-2xl bg-gradient-to-tr from-[#2A4FB8] to-[#1C3375] text-white overflow-hidden shrink-0 shadow-md flex items-center justify-center relative">
          {targetBook.coverImageUrl ? (
            <img
              src={targetBook.coverImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-2">
              <BookOpen className="w-6 h-6 mx-auto mb-1 opacity-80" />
              <span className="text-[10px] font-black uppercase">
                {formatGrade(targetBook.gradeId)}
              </span>
            </div>
          )}
        </div>

        {/* Title & Reading Meter */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-[#E6F6F4] dark:bg-[#0E7C70]/20 text-[#0E7C70] dark:text-[#5ED3C4] border border-[#0E7C70]/30">
              <Clock className="w-3 h-3 text-[#0E7C70] dark:text-[#5ED3C4]" />
              {t('home.continueReading')}
            </span>
            <span className="text-xs font-semibold text-[#5B6672] dark:text-[#9AA3B0]">
              {formatGrade(targetBook.gradeId)} • {formatBookType(targetBook.type)}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-[#142452] dark:text-[#E6E8EC] truncate">
            {targetBook.title}
          </h3>

          {/* Progress Bar & Page Stats */}
          <div className="space-y-1.5 max-w-sm">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#2A4FB8] dark:text-[#5B93FA]">
                {lastPage}-bet ({percent}%)
              </span>
              <span className="text-[#5B6672] dark:text-[#9AA3B0]">
                {total} {t('common.pages')}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#ECEEEA] dark:bg-[#272C36] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2A4FB8] to-[#0E7C70] rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Action: Continue Reading Button */}
      <button
        type="button"
        onClick={() => onOpenReader(targetBook, lastPage)}
        className="w-full md:w-auto px-7 py-3.5 rounded-2xl bg-[#2A4FB8] hover:bg-[#223F94] text-white font-extrabold text-sm shadow-md shadow-[#2A4FB8]/25 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
      >
        <Bookmark className="w-4 h-4" />
        <span>{t('home.continueReading')}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
