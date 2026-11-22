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
    const itemsPerUnit = Math.max(8, Math.floor(totalPages / 6));
    const generated: TocEntry[] = [];
    let start = 1;
    let unitNum = 1;
    while (start <= totalPages) {
      const end = Math.min(totalPages, start + itemsPerUnit - 1);
      const isIntro = start < contentStartPdfPage;
      generated.push({
        id: `gen_unit_${unitNum}`,
        unit: isIntro ? strings.common?.introShort || 'Kiriş' : `Unit ${unitNum}`,
        title: isIntro
          ? 'Kiriş qismi va darslik bilan tanişuv'
          : `Mavzular töplami ${unitNum}`,
        pageNumber: start,
        endPageNumber: end,
      });
      start = end + 1;
      unitNum++;
    }
    return generated;
  }, [tocItems, totalPages, contentStartPdfPage, strings.common?.introShort]);

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
      return `${strings.common?.introShort || 'Kiriş'} ${info.frontMatterIndex}`;
    }
    return `${info.bookPage ?? pdfPage}-bet`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 backdrop-blur-2xl border-l border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-[#E9ECF7] shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E6E9F2] dark:border-[#262C42]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#2A4FB8] dark:text-[#8FA8F7] border border-[#C9D6F5] dark:border-[#34478C] shrink-0">
            <List className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#1B2238] dark:text-[#E9ECF7] truncate">
              {strings.reader?.contents || 'Mundarija'}
            </h2>
            <p className="text-[10px] text-[#7A8299] dark:text-[#8B93AD] truncate">
              {contentTotal} asosiy darslik beti
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-[#7A8299] hover:text-[#1B2238] dark:text-[#8B93AD] dark:hover:text-[#E9ECF7] flex items-center justify-center transition active:scale-90"
          title="Yopiş (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quick Jump Bar */}
      <form
        onSubmit={handleGoToInput}
        className="flex items-center gap-2 px-4 py-2.5 border-b border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8]/60 dark:bg-[#10152A]/40"
      >
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#7A8299] dark:text-[#8B93AD]">
            <Compass className="h-3.5 w-3.5" />
          </div>
          <input
            type="number"
            min={1}
            max={contentTotal}
            placeholder={`Bet raqami (1 - ${contentTotal})...`}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="w-full rounded-lg border border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A] pl-8 pr-2 py-1.5 text-xs text-[#1B2238] dark:text-[#E9ECF7] placeholder-[#9AA1B5] dark:placeholder-[#69718C] focus:border-[#2A4FB8] dark:focus:border-[#4F72EE] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <button
          type="submit"
          disabled={!pageInput}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2A4FB8] text-xs font-semibold text-white hover:bg-[#234399] dark:bg-[#4F72EE] dark:hover:bg-[#6384F1] disabled:opacity-40 transition active:scale-95 shadow-xs"
        >
          <span>Ötiş</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </form>

      {/* Chapter List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {effectiveToc.map((item, idx) => {
          const isActive = idx === activeUnitIndex;
          return (
            <button
              key={item.id || idx}
              onClick={() => {
                onSelectPage(item.pageNumber);
                onClose();
              }}
              className={`w-full text-left rounded-xl p-2.5 transition-all flex items-center justify-between border ${
                isActive
                  ? 'bg-[#EEF2FD] dark:bg-[#182252] border-[#2A4FB8]/40 dark:border-[#4F72EE]/40 text-[#2A4FB8] dark:text-[#8FA8F7] shadow-xs'
                  : 'bg-[#EEF1F8] hover:bg-[#E4E9F7] border-[#E6E9F2] text-[#1B2238] dark:bg-[#10152A] dark:hover:bg-[#262C42] dark:border-[#262C42] dark:text-[#E9ECF7]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                    isActive
                      ? 'bg-[#2A4FB8] dark:bg-[#4F72EE] text-white'
                      : 'bg-[#E4E9F7] text-[#7A8299] dark:bg-[#262C42] dark:text-[#8B93AD]'
                  }`}
                >
                  <BookOpen className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.unit && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#2A4FB8] dark:text-[#8FA8F7]">
                        {item.unit}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-medium truncate text-[#1B2238] dark:text-[#E9ECF7]">
                    {item.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="rounded-md bg-[#E4E9F7] dark:bg-[#262C42] px-1.5 py-0.5 text-[10.5px] font-mono text-[#7A8299] dark:text-[#8B93AD]">
                  {formatPdfPage(item.pageNumber)}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#7A8299] dark:text-[#8B93AD]" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
