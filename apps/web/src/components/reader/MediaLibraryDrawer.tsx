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
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-[#FFFFFF] dark:bg-[#171C2E] border-l border-[#E6E9F2] dark:border-[#262C42] shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF4FF] dark:bg-[#2A4FB8]/20 text-[#2A4FB8] dark:text-[#8FA8F7]">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1B2238] dark:text-[#E6E8EC]">
              {strings.reader?.mediaLibrary || 'Media kutubxona'}
            </h2>
            <p className="text-xs text-[#7A8299] dark:text-[#8B93AD]">
              Jami {mediaItems.length} ta audio va video fayl
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#EEF1F8] dark:hover:bg-[#262C42] hover:text-[#1B2238] dark:hover:text-[#E6E8EC] transition-colors"
          title="Yopiş"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A] p-1 m-3 rounded-xl gap-1">
        <button
          onClick={() => setFilter('ALL')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'ALL'
              ? 'bg-[#FFFFFF] dark:bg-[#171C2E] text-[#2A4FB8] dark:text-[#8FA8F7] shadow-xs'
              : 'text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E6E8EC]'
          }`}
        >
          Barçasi ({mediaItems.length})
        </button>
        <button
          onClick={() => setFilter('AUDIO')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'AUDIO'
              ? 'bg-[#FFFFFF] dark:bg-[#171C2E] text-[#0E7C70] dark:text-[#5ED3C4] shadow-xs'
              : 'text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E6E8EC]'
          }`}
        >
          <Music className="h-3 w-3" />
          <span>Audio ({mediaItems.filter((m) => m.type === 'AUDIO').length})</span>
        </button>
        <button
          onClick={() => setFilter('VIDEO')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'VIDEO'
              ? 'bg-[#FFFFFF] dark:bg-[#171C2E] text-[#C23B5A] dark:text-[#FF8FA6] shadow-xs'
              : 'text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E6E8EC]'
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF1F8] dark:bg-[#262C42] text-[#7A8299] dark:text-[#8B93AD] mb-3">
              <Headphones className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-[#1B2238] dark:text-[#E6E8EC] mb-1">
              Fayllar topilmadi
            </h4>
            <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] max-w-xs mx-auto">
              Uşbu darslikka biriktirilgan audio yoki video materiallar mavjud emas.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isAudio = item.type === 'AUDIO';
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[#E6E9F2] dark:border-[#262C42] bg-[#FFFFFF] dark:bg-[#171C2E] hover:border-[#2A4FB8]/30 dark:hover:border-[#8FA8F7]/30 transition-colors"
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
                    <h5 className="text-xs font-bold text-[#1B2238] dark:text-[#E6E8EC] truncate">
                      {item.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-block rounded bg-[#EEF1F8] dark:bg-[#262C42] px-1.5 py-0.5 text-[10px] font-medium text-[#7A8299] dark:text-[#8B93AD]">
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
                          className="inline-flex items-center gap-1 rounded bg-[#EEF4FF] dark:bg-[#2A4FB8]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#2A4FB8] dark:text-[#8FA8F7] hover:underline"
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
