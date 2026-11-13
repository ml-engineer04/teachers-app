import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  ArrowRight,
  List,
  Compass,
  ChevronRight,
} from 'lucide-react';
import {
  bookPageToPdfPage,
  getBookContentTotalPages,
  pdfPageToBookDisplay,
} from '@smartteacherbook/shared';
import { useI18n } from '../../i18n/I18nContext';

export interface TocEntry {
  id: string;
  unit?: string;
  title: string;
  pageNumber: number;
  endPageNumber?: number;
  subtitle?: string;
}

interface TocDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  totalPages: number;
  currentPage: number;
  contentStartPdfPage?: number;
  onSelectPage: (page: number) => void;
  tocItems?: TocEntry[];
}

export const TocDrawer: React.FC<TocDrawerProps> = ({
  isOpen,
  onClose,
  totalPages,
  currentPage,
  contentStartPdfPage = 1,
  onSelectPage,
  tocItems,
}) => {
  const { strings } = useI18n();
  const [pageInput, setPageInput] = useState('');

  const contentTotal = getBookContentTotalPages(totalPages, contentStartPdfPage);

  // Generate fallback units if book TOC is empty
  const effectiveToc: TocEntry[] = useMemo(() => {
    if (tocItems && tocItems.length > 0) {
      return [...tocItems].sort((a, b) => a.pageNumber - b.pageNumber);
    }
    // Auto-generate standard units if none defined
    const itemsPerUnit = Math.max(8, Math.floor(totalPages / 6));
    const generated: TocEntry[] = [];
    let start = 1;
    let unitNum = 1;
    while (start <= totalPages) {
      const end = Math.min(totalPages, start + itemsPerUnit - 1);
      const isIntro = start < contentStartPdfPage;
      generated.push({
        id: `gen_unit_${unitNum}`,
        unit: isIntro ? strings.common?.introShort || 'Kirish' : `Unit ${unitNum}`,
        title: isIntro
          ? 'Kirish qismi va darslik bilan tanishuv'
          : `Mavzular to'plami ${unitNum}`,
        pageNumber: start,
        endPageNumber: end,
      });
      start = end + 1;
      unitNum++;
    }
    return generated;
  }, [tocItems, totalPages, contentStartPdfPage, strings.common?.introShort]);

  // Find active unit index
  const activeUnitIndex = useMemo(() => {
    let matchIdx = 0;
    effectiveToc.forEach((item, idx) => {
      if (currentPage >= item.pageNumber) {
        matchIdx = idx;
      }
    });
    return matchIdx;
  }, [effectiveToc, currentPage]);

  const handleGoToInput = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(pageInput, 10);
    if (!isNaN(num) && num >= 1 && num <= contentTotal) {
      const targetPdf = bookPageToPdfPage(num, totalPages, contentStartPdfPage);
      onSelectPage(targetPdf);
      setPageInput('');
      onClose();
    }
  };

  const formatPdfPage = (pdfPage: number) => {
    const info = pdfPageToBookDisplay(pdfPage, totalPages, contentStartPdfPage);
    if (info.isFrontMatter) {
      return `${strings.common?.introShort || 'Kirish'} ${info.frontMatterIndex}`;
    }
    return `${info.bookPage ?? pdfPage}-bet`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <List className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {strings.reader?.contents || 'Mundarija'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jami {totalPages} sahifa ({contentTotal} asosiy darslik beti)
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title="Yopish"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Quick Jump Bar */}
      <form
        onSubmit={handleGoToInput}
        className="flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Compass className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="number"
            min={1}
            max={contentTotal}
            placeholder={`Bet raqami (1 - ${contentTotal})...`}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={!pageInput}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          <span>O'tish</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Chapter List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {effectiveToc.map((item, idx) => {
          const isActive = idx === activeUnitIndex;
          return (
            <button
              key={item.id || idx}
              onClick={() => {
                onSelectPage(item.pageNumber);
                onClose();
              }}
              className={`w-full text-left rounded-xl p-3.5 transition-all flex items-center justify-between border ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-400/30'
                  : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {item.unit && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {item.unit}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {formatPdfPage(item.pageNumber)}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
