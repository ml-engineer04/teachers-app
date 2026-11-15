import React, { useEffect, useState } from 'react';
import type { Book, Grade } from '@smartteacherbook/shared';
import {
  BookOpen,
  GraduationCap,
  Layers,
  Sparkles,
  CreditCard,
  Settings,
  HelpCircle,
  Send,
  Loader2,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { webApi } from '../../services/api/webApi';
import { notify } from '../../utils/notify';
import { Sidebar, DashboardTab } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
import { ContinueReadingCard } from './ContinueReadingCard';
import { GradesSection } from './GradesSection';
import { PlansAndRequestsView } from '../plans/PlansAndRequestsView';
import { InteractiveReader } from '../reader/InteractiveReader';
import { SettingsView } from '../settings/SettingsView';

export const TeacherDashboard: React.FC = () => {
  const { t, formatGrade } = useI18n();
  const { user } = useAuth();

  const [currentTab, setCurrentTab] = useState<DashboardTab>('HOME');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [readingProgress, setReadingProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Reader Session
  const [activeReadingBook, setActiveReadingBook] = useState<{
    book: Book;
    initialPage?: number;
  } | null>(null);

  // Load Dashboard Data
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [gradesData, subjectsData, booksData, progressData] = await Promise.all([
          webApi.getGrades().catch(() => []),
          webApi.getSubjects().catch(() => []),
          webApi.getAllBooks().catch(() => []),
          webApi.getReadingProgress().catch(() => []),
        ]);
        if (!mounted) return;
        setGrades((gradesData || []).sort((a, b) => a.gradeNumber - b.gradeNumber));
        setSubjects(subjectsData || []);
        setBooks(booksData || []);
        setReadingProgress(progressData || []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const latestProgress = readingProgress.length > 0 ? readingProgress[0] : null;

  const handleOpenReader = (book: Book, initialPage?: number) => {
    let targetPage = initialPage;
    if (!targetPage) {
      const prog = readingProgress.find((p) => p.bookId === book.id);
      if (prog && prog.lastPageNumber > 0) {
        targetPage = prog.lastPageNumber;
      } else if (book.contentStartPdfPage && book.contentStartPdfPage > 1) {
        targetPage = book.contentStartPdfPage;
      }
    }
    setActiveReadingBook({ book, initialPage: targetPage });
  };

  const handleRequestSubscription = (gradeId: number, subjectId?: string) => {
    setCurrentTab('PLANS');
  };

  // If reading a book, present the full interactive reader
  if (activeReadingBook) {
    return (
      <InteractiveReader
        book={activeReadingBook.book}
        initialPage={activeReadingBook.initialPage}
        onExit={() => {
          setActiveReadingBook(null);
          webApi.getReadingProgress().then((p) => setReadingProgress(p || [])).catch(() => {});
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F6F8FC] dark:bg-[#090D18] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          books={books}
          subjects={subjects}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onSelectBook={handleOpenReader}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-slate-400">{t('common.loading')}</p>
            </div>
          ) : (
            <>
              {/* TAB 1: HOME */}
              {currentTab === 'HOME' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  {/* Greeting & Quick Stats */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Assalomu alaykum, {user?.fullName || user?.email || 'O‘qituvchi'}! 👋
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Bugungi dars mashg‘ulotlari uchun darsliklar va multimedia materiallar
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800/60">
                        {books.length} ta umumiy darslik
                      </span>
                    </div>
                  </div>

                  {/* Continue Reading Card */}
                  <ContinueReadingCard
                    progressItem={latestProgress}
                    books={books}
                    onOpenReader={handleOpenReader}
                    onExploreCatalog={() => setCurrentTab('GRADES')}
                  />

                  {/* Quick Grades Overview Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                          Sinflar va darsliklar
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentTab('GRADES')}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Barchasini ko‘rish →
                      </button>
                    </div>

                    <GradesSection
                      grades={grades}
                      subjects={subjects}
                      books={books}
                      initialGradeId={latestProgress?.gradeId || 5}
                      onOpenReader={handleOpenReader}
                      onRequestSubscription={handleRequestSubscription}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: GRADES */}
              {currentTab === 'GRADES' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      1–11-sinflar darsliklari
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Kerakli sinf va fanni tanlab, barcha darslik, ishchi daftar va metodikalarni oching
                    </p>
                  </div>

                  <GradesSection
                    grades={grades}
                    subjects={subjects}
                    books={books}
                    initialGradeId={5}
                    onOpenReader={handleOpenReader}
                    onRequestSubscription={handleRequestSubscription}
                  />
                </div>
              )}

              {/* TAB 3: PLANS & REQUESTS */}
              {currentTab === 'PLANS' && (
                <PlansAndRequestsView />
              )}

              {/* TAB 4: SETTINGS */}
              {currentTab === 'SETTINGS' && (
                <SettingsView />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
