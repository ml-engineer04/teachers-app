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
      return `${strings.common?.introShort || 'Kiriş'} ${info.frontMatterIndex}`;
    }
    return `${info.bookPage ?? pdfPage}-${strings.common?.pageShort || 'bet'}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-[#FBFBF9] dark:bg-[#1E222A] border-l border-[#D9DCD5] dark:border-[#353B47] shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9DCD5] dark:border-[#353B47] bg-[#F4F5F2] dark:bg-[#15181E]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF4FF] dark:bg-[#2A4FB8]/20 text-[#2A4FB8] dark:text-[#5B93FA]">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F2933] dark:text-[#E6E8EC]">
              {strings.reader?.mediaLibrary || 'Media kutubxona'}
            </h2>
            <p className="text-xs text-[#5B6672] dark:text-[#9AA3B0]">
              Jami {mediaItems.length} ta audio va video fayl
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-[#5B6672] dark:text-[#9AA3B0] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] hover:text-[#1F2933] dark:hover:text-[#E6E8EC] transition-colors"
          title="Yopiş"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border border-[#D9DCD5] dark:border-[#353B47] bg-[#ECEEEA] dark:bg-[#15181E] p-1 m-3 rounded-xl gap-1">
        <button
          onClick={() => setFilter('ALL')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'ALL'
              ? 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#2A4FB8] dark:text-[#5B93FA] shadow-xs'
              : 'text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#1F2933] dark:hover:text-[#E6E8EC]'
          }`}
        >
          Barçasi ({mediaItems.length})
        </button>
        <button
          onClick={() => setFilter('AUDIO')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'AUDIO'
              ? 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#0E7C70] dark:text-[#5ED3C4] shadow-xs'
              : 'text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#1F2933] dark:hover:text-[#E6E8EC]'
          }`}
        >
          <Music className="h-3 w-3" />
          <span>Audio ({mediaItems.filter((m) => m.type === 'AUDIO').length})</span>
        </button>
        <button
          onClick={() => setFilter('VIDEO')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'VIDEO'
              ? 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#C23B5A] dark:text-[#FF8FA6] shadow-xs'
              : 'text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#1F2933] dark:hover:text-[#E6E8EC]'
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ECEEEA] dark:bg-[#272C36] text-[#5B6672] dark:text-[#9AA3B0] mb-3">
              <Headphones className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-[#1F2933] dark:text-[#E6E8EC] mb-1">
              Fayllar topilmadi
            </h4>
            <p className="text-xs text-[#5B6672] dark:text-[#9AA3B0] max-w-xs mx-auto">
              Uşbu darslikka biriktirilgan audio yoki video materiallar mavjud emas.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isAudio = item.type === 'AUDIO';
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[#D9DCD5] dark:border-[#353B47] bg-[#FBFBF9] dark:bg-[#1E222A] hover:border-[#2A4FB8]/30 dark:hover:border-[#5B93FA]/30 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1 mr-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isAudio
                        ? 'bg-[#E6F6F4] dark:bg-[#0E7C70]/20 text-[#0E7C70] dark:text-[#5ED3C4]'
                        : 'bg-[#FDF1F4] dark:bg-[#C23B5A]/20 text-[#C23B5A] dark:text-[#FF8FA6]'
                    }`}
                  >
                    {isAudio ? <Headphones className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-[#1F2933] dark:text-[#E6E8EC] truncate">
                      {item.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-block rounded bg-[#ECEEEA] dark:bg-[#272C36] px-1.5 py-0.5 text-[10px] font-medium text-[#5B6672] dark:text-[#9AA3B0]">
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
                          className="inline-flex items-center gap-1 rounded bg-[#EEF4FF] dark:bg-[#2A4FB8]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#2A4FB8] dark:text-[#5B93FA] hover:underline"
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
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-xs transition-transform hover:scale-105 ${
                    isAudio
                      ? 'bg-[#0E7C70] hover:bg-[#0B6259]'
                      : 'bg-[#C23B5A] hover:bg-[#9E2D47]'
                  }`}
                  title={isAudio ? 'Audioni eşitiş' : "Videoni köriş"}
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
