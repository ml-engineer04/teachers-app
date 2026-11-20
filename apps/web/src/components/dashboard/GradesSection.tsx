import React, { useEffect, useMemo, useState } from 'react';
import type { Book, Grade } from '@smartteacherbook/shared';
import {
  BookOpen,
  Filter,
  GraduationCap,
  Lock,
  Play,
  Volume2,
  Sparkles,
  ArrowRight,
  Search,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface GradesSectionProps {
  grades: Grade[];
  subjects: any[];
  books: Book[];
  initialGradeId?: number;
  onOpenReader: (book: Book) => void;
  onRequestSubscription: (gradeId: number, subjectId?: string) => void;
}

export const GradesSection: React.FC<GradesSectionProps> = ({
  grades,
  subjects,
  books,
  initialGradeId = 5,
  onOpenReader,
  onRequestSubscription,
}) => {
  const { t, formatGrade, formatSubject, formatBookType } = useI18n();

  const gradeList = useMemo(() => {
    return [...grades].sort((a, b) => (a.gradeNumber || a.id) - (b.gradeNumber || b.id));
  }, [grades]);

  const [selectedGradeId, setSelectedGradeId] = useState<number>(() => {
    if (gradeList.length > 0) {
      const match = gradeList.find((g) => g.id === initialGradeId || g.gradeNumber === initialGradeId);
      return match ? match.id : gradeList[0].id;
    }
    return initialGradeId;
  });

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const [selectedBookType, setSelectedBookType] = useState<string>('ALL');

  useEffect(() => {
    if (gradeList.length > 0 && !gradeList.some((g) => g.id === selectedGradeId)) {
      setSelectedGradeId(gradeList[0].id);
    }
  }, [gradeList, selectedGradeId]);

  // Books filtered by selected grade
  const booksInGrade = useMemo(
    () => books.filter((b) => Number(b.gradeId) === Number(selectedGradeId)),
    [books, selectedGradeId],
  );

  // Available subjects for the selected grade
  const availableSubjects = useMemo(() => {
    const idsInGrade = new Set(booksInGrade.map((b) => b.subjectId));
    if (idsInGrade.size === 0) return subjects;
    return subjects.filter((s) => idsInGrade.has(s.id));
  }, [booksInGrade, subjects]);

  // Filtered books by subject & book type
  const displayBooks = useMemo(() => {
    return booksInGrade.filter((book) => {
      const matchSubject =
        selectedSubjectId === 'ALL' || book.subjectId === selectedSubjectId;
      const matchType =
        selectedBookType === 'ALL' ||
        String(book.type).toUpperCase() === selectedBookType;
      return matchSubject && matchType;
    });
  }, [booksInGrade, selectedSubjectId, selectedBookType]);

  const bookTypeTabs = [
    { id: 'ALL', label: t('common.all') },
    { id: 'STUDENT_BOOK', label: t('grades.bookTypeStudent') },
    { id: 'TEACHER_BOOK', label: t('grades.bookTypeTeacher') },
    { id: 'WORKBOOK', label: t('grades.bookTypeWorkbook') },
    { id: 'AUDIO', label: t('grades.bookTypeAudio') },
  ];

  if (gradeList.length === 0) {
    return (
      <div className="rounded-3xl p-10 bg-white dark:bg-[#121A2D] border border-dashed border-slate-300 dark:border-slate-700 text-center max-w-lg mx-auto my-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {t('dashboard.emptyGradesCabinetTitle')}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
          {t('dashboard.emptyGradesCabinetDesc')}
        </p>
        <button
          type="button"
          onClick={() => onRequestSubscription(5)}
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 active:scale-95 transition-all inline-flex items-center gap-2"
        >
          <span>{t('dashboard.goToPlansBtn')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grade Selector Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {gradeList.map((g) => {
          const count = books.filter((b) => Number(b.gradeId) === Number(g.id)).length;
          const active = selectedGradeId === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setSelectedGradeId(g.id);
                setSelectedSubjectId('ALL');
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 border ${
                active
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-glow scale-[1.02]'
                  : 'bg-white dark:bg-[#121A2D] text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-[#23304E] hover:border-indigo-300'
              }`}
            >
              <span>{formatGrade(g.gradeNumber || g.id)}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-md font-extrabold ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Row: Subject Tags & Book Type Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft">
        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSubjectId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
              selectedSubjectId === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                : 'bg-slate-50 dark:bg-[#1A243E] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#293A60]'
            }`}
          >
            {t('common.allSubjects')}
          </button>
          {availableSubjects.map((sub) => {
            const active = selectedSubjectId === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                  active
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700'
                    : 'bg-slate-50 dark:bg-[#1A243E] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#293A60]'
                }`}
              >
                <span>{sub.icon || '📘'}</span>
                <span>{formatSubject(sub.name, sub.id)}</span>
              </button>
            );
          })}
        </div>

        {/* Book Type Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl shrink-0 overflow-x-auto">
          {bookTypeTabs.map((tab) => {
            const active = selectedBookType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedBookType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-white dark:bg-[#121A2D] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Books Grid */}
      {displayBooks.length === 0 ? (
        <div className="rounded-3xl p-12 bg-white dark:bg-[#121A2D] border border-dashed border-slate-300 dark:border-slate-700 text-center max-w-md mx-auto my-8">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            {t('grades.noBooksInGrade')}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {t('dashboard.emptyFilterPrompt')}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedSubjectId('ALL');
              setSelectedBookType('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100"
          >
            {t('common.clear')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayBooks.map((book) => {
            const subj = subjects.find((s) => s.id === book.subjectId);
            return (
              <div
                key={book.id}
                className="group rounded-3xl p-5 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft hover:shadow-elevated hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between"
              >
                {/* Book Cover Container */}
                <div className="relative w-full aspect-[3/4] rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 overflow-hidden mb-4 shadow-sm flex items-center justify-center">
                  {book.coverImageUrl ? (
                    <img
                      src={book.coverImageUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-center p-4 text-white">
                      <span className="text-4xl block mb-2">{subj?.icon || '📘'}</span>
                      <span className="text-xs font-black uppercase tracking-wider block opacity-90">
                        {formatGrade(book.gradeId)}
                      </span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/90 dark:bg-[#121A2D]/90 text-indigo-700 dark:text-indigo-300 backdrop-blur-sm shadow-sm">
                      {formatBookType(book.type)}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-900/70 text-white backdrop-blur-sm">
                      {book.totalPages} {t('common.pages')}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{subj?.icon || '📘'}</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {formatSubject(subj?.name, book.subjectId)}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {book.title}
                  </h4>
                </div>

                {/* Bottom Action */}
                <button
                  type="button"
                  onClick={() => onOpenReader(book)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t('grades.openBookBtn')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom CTA Banner to subscribe to more subjects */}
      <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {t('dashboard.addMoreSubjectTitle')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('dashboard.addMoreSubjectDesc')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRequestSubscription(selectedGradeId)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>{t('dashboard.goToPlansSimple')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
