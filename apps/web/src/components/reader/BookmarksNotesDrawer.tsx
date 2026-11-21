import React, { useState } from 'react';
import {
  X,
  Bookmark,
  FileText,
  Trash2,
  Plus,
  BookOpen,
  Calendar,
  Check,
} from 'lucide-react';
import { pdfPageToBookDisplay } from '@smartteacherbook/shared';
import { useI18n } from '../../i18n/I18nContext';

export interface BookmarkEntry {
  id?: string;
  pageNumber: number;
  title?: string;
}

export interface NoteEntry {
  id: string;
  pageNumber: number;
  text: string;
  createdAt?: string;
}

interface BookmarksNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  totalPages?: number;
  contentStartPdfPage?: number;
  bookmarks: BookmarkEntry[];
  notes: NoteEntry[];
  initialTab?: 'BOOKMARKS' | 'NOTES';
  onSelectPage: (page: number) => void;
  onToggleBookmark: (page: number) => Promise<void> | void;
  onAddNote: (page: number, text: string) => Promise<void> | void;
  onDeleteNote: (noteId: string) => Promise<void> | void;
}

export const BookmarksNotesDrawer: React.FC<BookmarksNotesDrawerProps> = ({
  isOpen,
  onClose,
  currentPage,
  totalPages = 100,
  contentStartPdfPage = 1,
  bookmarks,
  notes,
  initialTab = 'BOOKMARKS',
  onSelectPage,
  onToggleBookmark,
  onAddNote,
  onDeleteNote,
}) => {
  const { strings } = useI18n();
  const [activeTab, setActiveTab] = useState<'BOOKMARKS' | 'NOTES'>(initialTab);
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCurrentBookmarked = bookmarks.some((b) => b.pageNumber === currentPage);

  const formatPageBadge = (pdfPage: number) => {
    const info = pdfPageToBookDisplay(pdfPage, totalPages, contentStartPdfPage);
    if (info.isFrontMatter) {
      return `${strings.common?.introShort || 'Kiriş'} ${info.frontMatterIndex}`;
    }
    return `${info.bookPage ?? pdfPage}-${strings.common?.pageShort || 'bet'}`;
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteText.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddNote(currentPage, trimmed);
      setNoteText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-[#FBFBF9] dark:bg-[#1E222A] border-l border-[#D9DCD5] dark:border-[#353B47] text-[#1F2933] dark:text-[#E6E8EC] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#D9DCD5] dark:border-[#353B47]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFFBEB] dark:bg-[#F5B82E]/20 text-[#B45309] dark:text-[#F5B82E] border border-[#F5B82E]/30 shrink-0">
            {activeTab === 'BOOKMARKS' ? (
              <Bookmark className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#142452] dark:text-white truncate">
              {activeTab === 'BOOKMARKS'
                ? strings.reader?.bookmark || 'Xatçöplar'
                : strings.reader?.notes || 'Izohlar va eslatmalar'}
            </h2>
            <p className="text-[10px] text-[#5B6672] dark:text-[#9AA3B0] truncate">
              Joriy sahifa: {formatPageBadge(currentPage)}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-[#5B6672] hover:text-[#1F2933] dark:text-white/70 dark:hover:text-white flex items-center justify-center transition active:scale-90"
          title="Yopiş (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#ECEEEA] dark:bg-[#15181E] p-1 m-3 rounded-xl gap-1 border border-[#D9DCD5] dark:border-[#353B47]">
        <button
          onClick={() => setActiveTab('BOOKMARKS')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'BOOKMARKS'
              ? 'bg-[#2A4FB8] text-white shadow-xs'
              : 'text-[#5B6672] hover:text-[#1F2933] dark:text-[#9AA3B0] dark:hover:text-[#E6E8EC]'
          }`}
        >
          <Bookmark className="h-3 w-3" />
          <span>{strings.reader?.bookmark || 'Xatçöplar'} ({bookmarks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('NOTES')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'NOTES'
              ? 'bg-[#2A4FB8] text-white shadow-xs'
              : 'text-[#5B6672] hover:text-[#1F2933] dark:text-[#9AA3B0] dark:hover:text-[#E6E8EC]'
          }`}
        >
          <FileText className="h-3 w-3" />
          <span>{strings.reader?.notes || 'Izohlar'} ({notes.length})</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5 custom-scrollbar">
        {activeTab === 'BOOKMARKS' && (
          <>
            {/* Quick bookmark current page toggle */}
            <button
              onClick={() => onToggleBookmark(currentPage)}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                isCurrentBookmarked
                  ? 'border-[#F5B82E]/40 bg-[#FFFBEB] dark:bg-[#F5B82E]/20 text-[#B45309] dark:text-[#F5B82E]'
                  : 'border-[#D9DCD5] bg-[#ECEEEA] hover:bg-[#D9DCD5] text-[#1F2933] dark:border-[#353B47] dark:bg-[#272C36] dark:hover:bg-[#353B47] dark:text-[#E6E8EC]'
              }`}
            >
              {isCurrentBookmarked ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#B45309] dark:text-[#F5B82E]" />
                  <span>Joriy sahifa saqlangan (oliş)</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Joriy sahifani xatçöp qiliş ({formatPageBadge(currentPage)})</span>
                </>
              )}
            </button>

            {bookmarks.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-[#5B6672] dark:text-[#9AA3B0] mb-2">
                  <Bookmark className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-semibold text-[#1F2933] dark:text-[#E6E8EC] mb-0.5">
                  Xatçöplar mavjud emas
                </h4>
                <p className="text-[11px] text-[#5B6672] dark:text-[#9AA3B0] max-w-xs mx-auto">
                  Muhim sahifalarni tezda topiş uçun ularni xatçöp qilib saqlang.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.pageNumber}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#D9DCD5] hover:border-[#2A4FB8]/40 bg-[#F4F5F2] hover:bg-[#ECEEEA] text-[#1F2933] dark:border-[#353B47] dark:hover:border-[#5B93FA]/40 dark:bg-[#272C36]/60 dark:hover:bg-[#272C36] dark:text-white transition-all"
                  >
                    <button
                      onClick={() => {
                        onSelectPage(bm.pageNumber);
                        onClose();
                      }}
                      className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FFFBEB] dark:bg-[#F5B82E]/20 text-[#B45309] dark:text-[#F5B82E] font-bold text-xs shrink-0">
                        <BookOpen className="h-3 w-3" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-medium text-[#1F2933] dark:text-white truncate">
                          {formatPageBadge(bm.pageNumber)}
                        </h5>
                        <p className="text-[10px] text-[#5B6672] dark:text-[#9AA3B0] truncate">
                          {bm.title || `PDF sahifa ${bm.pageNumber}`}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => onToggleBookmark(bm.pageNumber)}
                      className="p-1 text-[#5B6672] hover:text-[#B91C1C] dark:text-[#9AA3B0] dark:hover:text-[#F87171] rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      title="Öçiriş"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'NOTES' && (
          <>
            {/* Note creation form */}
            <form onSubmit={handleCreateNote} className="space-y-2">
              <label className="text-[11px] font-medium text-[#1F2933] dark:text-[#E6E8EC] block">
                {formatPageBadge(currentPage)} uçun yangi izoh:
              </label>
              <textarea
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Dars rejasi yoki muhim eslatma..."
                className="w-full rounded-xl border border-[#D9DCD5] dark:border-[#353B47] bg-[#ECEEEA] dark:bg-[#15181E] p-2.5 text-xs text-[#1F2933] dark:text-[#E6E8EC] placeholder-[#5B6672] dark:placeholder-[#9AA3B0] focus:border-[#2A4FB8] dark:focus:border-[#5B93FA] focus:outline-none transition-colors"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!noteText.trim() || isSubmitting}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2A4FB8] text-xs font-semibold text-white hover:bg-[#223F94] disabled:opacity-40 transition active:scale-95 shadow-xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>Izohni saqlaş</span>
                </button>
              </div>
            </form>

            <div className="pt-1 border-t border-[#D9DCD5] dark:border-[#353B47]" />

            {notes.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-[#5B6672] dark:text-[#9AA3B0] mb-2">
                  <FileText className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-semibold text-[#1F2933] dark:text-[#E6E8EC] mb-0.5">
                  Izohlar mavjud emas
                </h4>
                <p className="text-[11px] text-[#5B6672] dark:text-[#9AA3B0] max-w-xs mx-auto">
                  Darslik sahifalariga öz fikrlaringiz va öqitiş metodikangizni yozib qoldiring.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl border border-[#D9DCD5] dark:border-[#353B47] bg-[#F4F5F2] dark:bg-[#272C36]/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          onSelectPage(note.pageNumber);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-[#EEF4FF] dark:bg-[#EEF4FF]/10 px-2 py-0.5 text-[10.5px] font-bold text-[#2A4FB8] dark:text-[#5B93FA] hover:underline"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>{formatPageBadge(note.pageNumber)}</span>
                      </button>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 text-[#5B6672] hover:text-[#B91C1C] dark:text-[#9AA3B0] dark:hover:text-[#F87171] rounded transition-colors"
                        title="Öçiriş"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-[#1F2933] dark:text-[#E6E8EC] whitespace-pre-wrap leading-relaxed">
                      {note.text}
                    </p>
                    {note.createdAt && (
                      <div className="flex items-center gap-1 text-[10px] text-[#5B6672] dark:text-[#9AA3B0] pt-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
