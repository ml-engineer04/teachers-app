import React, { useState, useMemo } from 'react';
import {
  X,
  Headphones,
  Video,
  Play,
  Film,
  Music,
  BookOpen,
} from 'lucide-react';
import { pdfPageToBookDisplay } from '@smartteacherbook/shared';
import { useI18n } from '../../i18n/I18nContext';

export interface MediaLibraryItem {
  id: string;
  type: 'AUDIO' | 'VIDEO';
  title: string;
  subtitle?: string;
  durationLabel?: string;
  durationSeconds?: number | null;
  pageNumber?: number;
  url?: string;
}

interface MediaLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems?: MediaLibraryItem[];
  totalPages?: number;
  contentStartPdfPage?: number;
  onPlayMedia: (item: MediaLibraryItem) => void;
  onSelectPage?: (page: number) => void;
}

export const MediaLibraryDrawer: React.FC<MediaLibraryDrawerProps> = ({
  isOpen,
  onClose,
  mediaItems = [],
  totalPages = 100,
  contentStartPdfPage = 1,
  onPlayMedia,
  onSelectPage,
}) => {
  const { strings } = useI18n();
  const [filter, setFilter] = useState<'ALL' | 'AUDIO' | 'VIDEO'>('ALL');

  const filtered = useMemo(() => {
    if (filter === 'ALL') return mediaItems;
    return mediaItems.filter((m) => m.type === filter);
  }, [mediaItems, filter]);

  const formatDur = (item: MediaLibraryItem) => {
    if (item.durationLabel) return item.durationLabel;
    if (item.durationSeconds && item.durationSeconds > 0) {
      const m = Math.floor(item.durationSeconds / 60);
      const s = item.durationSeconds % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    }
    return item.type === 'VIDEO' ? 'Video' : 'Audio';
  };

  const formatPage = (pdfPage?: number) => {
    if (!pdfPage) return null;
    const info = pdfPageToBookDisplay(pdfPage, totalPages, contentStartPdfPage);
    if (info.isFrontMatter) {
      return `${strings.common?.introShort || 'Kirish'} ${info.frontMatterIndex}`;
    }
    return `${info.bookPage ?? pdfPage}-${strings.common?.pageShort || 'bet'}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {strings.reader?.mediaLibrary || 'Media kutubxona'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jami {mediaItems.length} ta audio va video fayl
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

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 p-1 m-3 rounded-xl gap-1">
        <button
          onClick={() => setFilter('ALL')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'ALL'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Barchasi ({mediaItems.length})
        </button>
        <button
          onClick={() => setFilter('AUDIO')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'AUDIO'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Music className="h-3 w-3" />
          <span>Audio ({mediaItems.filter((m) => m.type === 'AUDIO').length})</span>
        </button>
        <button
          onClick={() => setFilter('VIDEO')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'VIDEO'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Video className="h-3 w-3" />
          <span>Video ({mediaItems.filter((m) => m.type === 'VIDEO').length})</span>
        </button>
      </div>

      {/* Media List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <Headphones className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              Fayllar topilmadi
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Ushbu darslikka biriktirilgan audio yoki video materiallar mavjud emas.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isAudio = item.type === 'AUDIO';
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1 mr-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isAudio
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isAudio ? <Headphones className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        {formatDur(item)}
                      </span>
                      {item.pageNumber && (
                        <button
                          onClick={() => {
                            if (onSelectPage && item.pageNumber) {
                              onSelectPage(item.pageNumber);
                              onClose();
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <BookOpen className="h-2.5 w-2.5" />
                          <span>{formatPage(item.pageNumber)}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onPlayMedia(item)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow transition-transform hover:scale-105 ${
                    isAudio
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                  title={isAudio ? 'Audioni eshitish' : "Videoni ko'rish"}
                >
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
