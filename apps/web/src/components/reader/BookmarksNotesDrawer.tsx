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
      return `${strings.common?.introShort || 'Kirish'} ${info.frontMatterIndex}`;
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
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            {activeTab === 'BOOKMARKS' ? (
              <Bookmark className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {activeTab === 'BOOKMARKS'
                ? strings.reader?.bookmark || "Xatcho'plar"
                : strings.reader?.notes || 'Izohlar va eslatmalar'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Joriy sahifa: {formatPageBadge(currentPage)}
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 p-1 m-3 rounded-xl gap-1">
        <button
          onClick={() => setActiveTab('BOOKMARKS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'BOOKMARKS'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" />
          <span>{strings.reader?.bookmark || "Xatcho'plar"} ({bookmarks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('NOTES')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'NOTES'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>{strings.reader?.notes || 'Izohlar'} ({notes.length})</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'BOOKMARKS' && (
          <>
            {/* Quick bookmark current page toggle */}
            <button
              onClick={() => onToggleBookmark(currentPage)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all ${
                isCurrentBookmarked
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80'
              }`}
            >
              {isCurrentBookmarked ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Joriy sahifa saqlangan (olib tashlash)</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Joriy sahifani xatcho'pga qo'shish ({formatPageBadge(currentPage)})</span>
                </>
              )}
            </button>

            {bookmarks.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                  <Bookmark className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  Xatcho'plar mavjud emas
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Muhim sahifalarni tezda topish uchun ularni xatcho'p qilib saqlang.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.pageNumber}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <button
                      onClick={() => {
                        onSelectPage(bm.pageNumber);
                        onClose();
                      }}
                      className="flex items-center gap-3 min-w-0 text-left flex-1"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold text-xs">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {formatPageBadge(bm.pageNumber)}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {bm.title || `PDF sahifa ${bm.pageNumber}`}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => onToggleBookmark(bm.pageNumber)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
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
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {formatPageBadge(currentPage)} uchun yangi izoh:
              </label>
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Dars rejasi, muhim eslatma yoki mashq ko'rsatmasi..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!noteText.trim() || isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Izohni saqlash</span>
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800" />

            {notes.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                  <FileText className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  Izohlar mavjud emas
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Darslik sahifalariga o'z fikrlaringiz va o'qitish metodikangizni yozib qoldiring.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          onSelectPage(note.pageNumber);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:underline"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>{formatPageBadge(note.pageNumber)}</span>
                      </button>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {note.text}
                    </p>
                    {note.createdAt && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1">
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
