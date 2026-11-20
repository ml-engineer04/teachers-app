import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Book, Grade, Subscription } from '@smartteacherbook/shared';
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
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
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
  const { t, formatGrade, formatSubject } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Multi-page routing derived directly from URL path
  const currentTab: DashboardTab = useMemo(() => {
    if (location.pathname.startsWith('/dashboard/grades')) return 'GRADES';
    if (location.pathname.startsWith('/dashboard/plans')) return 'PLANS';
    if (location.pathname.startsWith('/dashboard/settings')) return 'SETTINGS';
    return 'HOME';
  }, [location.pathname]);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [readingProgress, setReadingProgress] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Reader Session (local fallback if needed)
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
        const [gradesData, subjectsData, booksData, progressData, subsData] = await Promise.all([
          webApi.getGrades().catch(() => []),
          webApi.getSubjects().catch(() => []),
          webApi.getAllBooks().catch(() => []),
          webApi.getReadingProgress().catch(() => []),
          webApi.getMySubscriptions().catch(() => []),
        ]);
        if (!mounted) return;
        setGrades((gradesData || []).sort((a, b) => (a.gradeNumber || a.id) - (b.gradeNumber || b.id)));
        setSubjects(subjectsData || []);
        setBooks(booksData || []);
        setReadingProgress(progressData || []);
        setSubscriptions(subsData || []);

        // Check for expiring subscription (<= 3 days remaining)
        const now = Date.now();
        const expiring = (subsData || []).find((s: Subscription) => {
          if (s.isActive === false) return false;
          const exp = new Date(s.expiresAt).getTime();
          if (isNaN(exp)) return false;
          const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
          return days <= 3 && days >= 0;
        });

        if (expiring) {
          const expDays = Math.ceil((new Date(expiring.expiresAt).getTime() - now) / (1000 * 60 * 60 * 24));
          const dayMsg = expDays <= 0 ? t('dashboard.todayLastDay') : t('dashboard.daysRemaining', { n: expDays });
          notify.warning(
            t('dashboard.expiringDesc', { grade: formatGrade(expiring.gradeId), days: dayMsg }),
            t('dashboard.expiringWarning')
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  // Compute active subscriptions
  const activeSubscriptions = useMemo(() => {
    const now = Date.now();
    return subscriptions.filter((s) => {
      if (s.isActive === false) return false;
      const exp = new Date(s.expiresAt).getTime();
      return isNaN(exp) || exp > now;
    });
  }, [subscriptions]);

  // Check if any active subscription is expiring within 3 days
  const expiringSubscription = useMemo(() => {
    const now = Date.now();
    for (const s of activeSubscriptions) {
      const exp = new Date(s.expiresAt).getTime();
      if (!isNaN(exp)) {
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3 && diffDays >= 0) {
          return { ...s, daysLeft: diffDays };
        }
      }
    }
    return null;
  }, [activeSubscriptions]);

  const canonicalSubj = (val?: string | null) =>
    (val || '')
      .trim()
      .toLowerCase()
      .replace(/^sub_/, '')
      .replace(/^english$/, 'eng')
      .replace(/^matematika$/, 'math')
      .replace(/^physics$/, 'phys')
      .replace(/^fizika$/, 'phys')
      .replace(/^ona tili$/, 'uzb');

  // Check if a book belongs to a subscribed grade and subject
  const isBookSubscribed = (book: Book) => {
    return activeSubscriptions.some((s) => {
      if (Number(s.gradeId) !== Number(book.gradeId)) return false;
      if (!s.subjectId) return true; // blanket
      const subKey = canonicalSubj(s.subjectId);
      const bookKey = canonicalSubj(book.subjectId);
      return subKey === bookKey || s.subjectId === book.subjectId;
    });
  };

  // Only subscribed books and grades
  const visibleBooks = useMemo(() => {
    return books.filter(isBookSubscribed);
  }, [books, activeSubscriptions]);

  const visibleGrades = useMemo(() => {
    const gradeIdsWithSub = new Set(activeSubscriptions.map((s) => Number(s.gradeId)));
    return grades.filter((g) => gradeIdsWithSub.has(Number(g.id)) || gradeIdsWithSub.has(Number(g.gradeNumber)));
  }, [grades, activeSubscriptions]);

  const latestProgress = readingProgress.length > 0 ? readingProgress[0] : null;

  const handleSelectTab = (tab: DashboardTab) => {
    if (tab === 'GRADES') navigate('/dashboard/grades');
    else if (tab === 'PLANS') navigate('/dashboard/plans');
    else if (tab === 'SETTINGS') navigate('/dashboard/settings');
    else navigate('/dashboard');
  };

  const handleOpenReader = (book: Book, initialPage?: number) => {
    if (initialPage && initialPage > 0) {
      navigate(`/reader/${book.id}?page=${initialPage}`);
    } else {
      navigate(`/reader/${book.id}`);
    }
  };

  const handleRequestSubscription = (gradeId: number, subjectId?: string) => {
    navigate('/dashboard/plans');
  };

  // If reading a book locally
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
        onSelectTab={handleSelectTab}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          books={visibleBooks.length > 0 ? visibleBooks : books}
          subjects={subjects}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onSelectBook={handleOpenReader}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top Banner: Expiring Subscription Warning (<= 3 days remaining) */}
          {expiringSubscription && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-black">{t('dashboard.expiringWarning')}{' '}</span>
                  {t('dashboard.expiringDesc', {
                    grade: formatGrade(expiringSubscription.gradeId),
                    days: expiringSubscription.daysLeft <= 0 ? t('dashboard.todayLastDay') : t('dashboard.daysRemaining', { n: expiringSubscription.daysLeft }),
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/plans')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 shadow-sm transition-all"
              >
                {t('dashboard.extendSubscriptionBtn')}
              </button>
            </div>
          )}

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-slate-400">{t('common.loading')}</p>
            </div>
          ) : (
            <>
              {/* TAB 1: HOME (/dashboard) */}
              {currentTab === 'HOME' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  {/* Greeting & Quick Stats */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {t('dashboard.greeting', { name: user?.fullName || user?.email || t('common.userFallback') })}
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {t('dashboard.subtitle')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800/60">
                        {t('dashboard.subscribedBooksCount', { count: visibleBooks.length })}
                      </span>
                    </div>
                  </div>

                  {visibleGrades.length === 0 ? (
                    /* No Subscriptions State */
                    <div className="rounded-3xl p-8 sm:p-10 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft text-center max-w-xl mx-auto my-4 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                        <CreditCard className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {t('dashboard.noSubscriptionsTitle')}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        {t('dashboard.noSubscriptionsDesc')}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/plans')}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 active:scale-95 transition-all inline-flex items-center gap-2"
                      >
                        <span>{t('dashboard.goToPlansBtn')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Continue Reading Card (Only for subscribed books) */}
                      <ContinueReadingCard
                        progressItem={latestProgress}
                        books={visibleBooks}
                        onOpenReader={handleOpenReader}
                        onExploreCatalog={() => navigate('/dashboard/grades')}
                      />

                      {/* Quick Grades Overview Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                              {t('dashboard.myClassesTitle')}
                            </h2>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate('/dashboard/grades')}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {t('dashboard.viewAllBtn')}
                          </button>
                        </div>

                        <GradesSection
                          grades={visibleGrades}
                          subjects={subjects}
                          books={visibleBooks}
                          initialGradeId={visibleGrades[0]?.id || 5}
                          onOpenReader={handleOpenReader}
                          onRequestSubscription={handleRequestSubscription}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: GRADES (/dashboard/grades) */}
              {currentTab === 'GRADES' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {t('dashboard.gradesTabTitle')}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('dashboard.gradesTabSubtitle')}
                    </p>
                  </div>

                  <GradesSection
                    grades={visibleGrades}
                    subjects={subjects}
                    books={visibleBooks}
                    initialGradeId={visibleGrades[0]?.id || 5}
                    onOpenReader={handleOpenReader}
                    onRequestSubscription={handleRequestSubscription}
                  />
                </div>
              )}

              {/* TAB 3: PLANS & REQUESTS (/dashboard/plans) */}
              {currentTab === 'PLANS' && (
                <PlansAndRequestsView />
              )}

              {/* TAB 4: SETTINGS (/dashboard/settings) */}
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
