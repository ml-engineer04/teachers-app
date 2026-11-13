import React, { useEffect, useMemo, useState } from 'react';
import type { Book, Grade } from '@smartteacherbook/shared';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Cloud,
  Globe2,
  GraduationCap,
  KeyRound,
  Layers,
  Lock,
  MonitorPlay,
  PenTool,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { webApi } from '../../services/api/webApi';
import { LandingHeader } from './LandingHeader';
import { SmartBoardPreview } from './SmartBoardPreview';
import { BrandLogo } from '../common/BrandLogo';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

function formatPriceUzs(amount?: number): string {
  const num = Number(amount || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const { t, formatGrade, formatSubject, formatBookType } = useI18n();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);

  const [selectedGrade, setSelectedGrade] = useState<number>(5);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');

  const [pricingGrade, setPricingGrade] = useState<number>(5);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [loadingPricing, setLoadingPricing] = useState<boolean>(false);

  // Fetch catalog once
  useEffect(() => {
    let mounted = true;
    const loadCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const [gradesList, subjectsList, booksList] = await Promise.all([
          webApi.getGrades().catch(() => []),
          webApi.getSubjects().catch(() => []),
          webApi.getAllBooks().catch(() => []),
        ]);
        if (!mounted) return;
        const sortedGrades = (gradesList || []).sort((a, b) => a.gradeNumber - b.gradeNumber);
        setGrades(sortedGrades);
        setSubjects(subjectsList || []);
        setBooks(booksList || []);

        // Default to first grade that actually has books, or Grade 5 / Grade 1
        if (booksList && booksList.length > 0) {
          const firstGradeWithBook = sortedGrades.find((g) =>
            booksList.some((b) => b.gradeId === g.id),
          );
          if (firstGradeWithBook) {
            setSelectedGrade(firstGradeWithBook.id);
            setPricingGrade(firstGradeWithBook.id);
          }
        } else if (sortedGrades.length > 0) {
          setSelectedGrade(sortedGrades[0].id);
          setPricingGrade(sortedGrades[0].id);
        }
      } finally {
        if (mounted) setLoadingCatalog(false);
      }
    };
    loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch pricing whenever pricingGrade changes
  useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      setLoadingPricing(true);
      try {
        const plans = await webApi.getPricingPlans(pricingGrade);
        if (mounted && Array.isArray(plans) && plans.length > 0) {
          setPricingPlans(plans);
          setLoadingPricing(false);
          return;
        }
      } catch {
        // fallback below
      }
      if (!mounted) return;
      const matchedGrade = grades.find((g) => g.id === pricingGrade);
      setPricingPlans([
        {
          id: 'MONTHLY',
          durationDays: 30,
          priceUzs: matchedGrade?.priceMonthlyUzs ?? 89000,
          badge: '',
        },
        {
          id: 'THREE_MONTHS',
          durationDays: 90,
          priceUzs: matchedGrade?.priceQuarterlyUzs ?? 222000,
          badge: t('landing.pricingPopularBadge'),
        },
        {
          id: 'YEARLY',
          durationDays: 365,
          priceUzs: matchedGrade?.priceYearlyUzs ?? 712000,
          badge: t('landing.pricingBestValueBadge'),
        },
      ]);
      setLoadingPricing(false);
    };
    loadPlans();
  }, [pricingGrade, grades, t]);

  const gradeList = useMemo(() => {
    if (grades.length > 0) return grades;
    return Array.from({ length: 11 }, (_, idx) => ({
      id: idx + 1,
      gradeNumber: idx + 1,
      title: `${idx + 1}-sinf`,
      priceMonthlyUzs: 89000,
      priceQuarterlyUzs: 222000,
      priceYearlyUzs: 712000,
      isActive: true,
    }));
  }, [grades]);

  const booksInSelectedGrade = useMemo(
    () => books.filter((b) => Number(b.gradeId) === Number(selectedGrade)),
    [books, selectedGrade],
  );

  const availableSubjectsForGrade = useMemo(() => {
    const idsInGrade = new Set(booksInSelectedGrade.map((b) => b.subjectId));
    if (idsInGrade.size === 0) return subjects;
    return subjects.filter((s) => idsInGrade.has(s.id));
  }, [booksInSelectedGrade, subjects]);

  const filteredBooks = useMemo(() => {
    if (selectedSubjectId === 'ALL') return booksInSelectedGrade;
    return booksInSelectedGrade.filter((b) => b.subjectId === selectedSubjectId);
  }, [booksInSelectedGrade, selectedSubjectId]);

  const features = [
    {
      icon: MonitorPlay,
      color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/70 dark:border-indigo-800/50',
      title: t('landing.feat1Title'),
      desc: t('landing.feat1Desc'),
    },
    {
      icon: Volume2,
      color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/50',
      title: t('landing.feat2Title'),
      desc: t('landing.feat2Desc'),
    },
    {
      icon: PenTool,
      color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/70 dark:border-amber-800/50',
      title: t('landing.feat3Title'),
      desc: t('landing.feat3Desc'),
    },
    {
      icon: KeyRound,
      color: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-200/70 dark:border-violet-800/50',
      title: t('landing.feat4Title'),
      desc: t('landing.feat4Desc'),
    },
    {
      icon: Cloud,
      color: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200/70 dark:border-sky-800/50',
      title: t('landing.feat5Title'),
      desc: t('landing.feat5Desc'),
    },
    {
      icon: Globe2,
      color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/70 dark:border-rose-800/50',
      title: t('landing.feat6Title'),
      desc: t('landing.feat6Desc'),
    },
  ];

  const getSubjectDisplay = (subjectId: string) => {
    const found = subjects.find((s) => s.id === subjectId);
    return {
      name: formatSubject(found?.name, subjectId),
      icon: found?.icon || '📘',
      color: found?.color || '#4F46E5',
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FC] dark:bg-[#090D18] text-slate-900 dark:text-slate-100 transition-colors">
      <LandingHeader
        onOpenLogin={() => onOpenAuth('login')}
        onOpenRegister={() => onOpenAuth('register')}
      />

      <main className="flex-1">
        {/* ============================================================ */}
        {/* 1. HERO SECTION */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
          {/* Subtle Ambient Radial Backgrounds */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
              {/* Left Text Column */}
              <div className="lg:col-span-6 space-y-7 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t('landing.heroBadge')}</span>
                </div>

                <h1 className="text-4xl sm:text-5xl xl:text-[54px] font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                  {t('landing.heroTitlePart1')}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 dark:from-indigo-400 dark:via-indigo-300 dark:to-emerald-400">
                    {t('landing.heroTitleAccent')}
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  {t('landing.heroSubtitle')}
                </p>

                {/* Primary & Secondary CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-base shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{t('landing.heroCtaPrimary')}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <a
                    href="#pricing"
                    className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white dark:bg-[#121A2D] hover:bg-slate-50 dark:hover:bg-[#1A243E] text-slate-800 dark:text-slate-100 font-bold text-base border border-slate-200 dark:border-[#23304E] shadow-soft transition-all flex items-center justify-center gap-2"
                  >
                    <span>{t('landing.heroCtaSecondary')}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </a>
                </div>

                {/* 4 Trust Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                  <div>
                    <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {t('landing.statGradesVal')}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('landing.statGradesLabel')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {t('landing.statMediaVal')}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('landing.statMediaLabel')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                      {t('landing.statDevicesVal')}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('landing.statDevicesLabel')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">
                      {t('landing.statSyncVal')}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('landing.statSyncLabel')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive SmartBoard Preview */}
              <div className="lg:col-span-6 flex justify-center lg:justify-end">
                <SmartBoardPreview />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 2. FEATURES SECTION */}
        {/* ============================================================ */}
        <section
          id="features"
          className="py-20 bg-white/70 dark:bg-[#0D1322]/70 border-y border-slate-200/70 dark:border-slate-800/70"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
                {t('landing.featuresTitle')}
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                {t('landing.featuresSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-3xl p-7 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft hover:shadow-elevated hover:-translate-y-1 transition-all"
                  >
                    <div
                      className={`w-13 h-13 w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${feat.color}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. LIVE 1-11 GRADES & TEXTBOOK CATALOG SHOWCASE */}
        {/* ============================================================ */}
        <section id="grades" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-200 dark:border-emerald-800/50">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>1–11</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
                {t('landing.gradesTitle')}
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                {t('landing.gradesSubtitle')}
              </p>
            </div>

            {/* Grade Pill Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              {gradeList.map((g) => {
                const count = books.filter((b) => Number(b.gradeId) === Number(g.id)).length;
                const active = selectedGrade === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setSelectedGrade(g.id);
                      setSelectedSubjectId('ALL');
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-glow scale-[1.02]'
                        : 'bg-white dark:bg-[#121A2D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#23304E] hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <span>{formatGrade(g.gradeNumber || g.id)}</span>
                    {count > 0 && (
                      <span
                        className={`px-1.5 py-0.5 text-[11px] rounded-md font-extrabold ${
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

            {/* Subject Filter Pills */}
            {availableSubjectsForGrade.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                <button
                  type="button"
                  onClick={() => setSelectedSubjectId('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedSubjectId === 'ALL'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                      : 'bg-white dark:bg-[#121A2D] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#23304E]'
                  }`}
                >
                  {t('landing.gradesFilterAll')}
                </button>
                {availableSubjectsForGrade.map((sub) => {
                  const active = selectedSubjectId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        active
                          ? 'bg-indigo-100 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700'
                          : 'bg-white dark:bg-[#121A2D] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#23304E]'
                      }`}
                    >
                      <span>{sub.icon || '📘'}</span>
                      <span>{formatSubject(sub.name, sub.id)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Books Grid */}
            {loadingCatalog ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-44 rounded-3xl bg-white dark:bg-[#121A2D] border border-slate-200 dark:border-[#23304E] animate-pulse p-6"
                  />
                ))}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="max-w-lg mx-auto text-center rounded-3xl p-10 bg-white dark:bg-[#121A2D] border border-dashed border-slate-300 dark:border-slate-700">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {t('landing.gradesEmpty')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.map((book) => {
                  const subj = getSubjectDisplay(book.subjectId);
                  return (
                    <div
                      key={book.id}
                      onClick={() => onOpenAuth('login')}
                      className="group cursor-pointer rounded-3xl p-5 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft hover:shadow-elevated hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex items-start gap-4"
                    >
                      {/* Book Cover Thumbnail */}
                      <div className="w-20 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-700 shrink-0 shadow-md flex items-center justify-center relative">
                        {book.coverImageUrl ? (
                          <img
                            src={book.coverImageUrl}
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="text-center p-2 text-white">
                            <span className="text-2xl block mb-1">{subj.icon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-tight opacity-90 line-clamp-2">
                              {formatGrade(book.gradeId)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Book Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-28">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                              {formatBookType(book.type)}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate">
                              {subj.name}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {book.title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {book.totalPages} {t('common.pages')}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            <Lock className="w-3 h-3" />
                            <span>{t('landing.gradesViewInside')}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. HOW IT WORKS (WORKFLOW) */}
        {/* ============================================================ */}
        <section
          id="workflow"
          className="py-20 bg-white/70 dark:bg-[#0D1322]/70 border-y border-slate-200/70 dark:border-slate-800/70"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
                {t('landing.workflowTitle')}
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                {t('landing.workflowSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { num: '01', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
                { num: '02', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
                { num: '03', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
              ].map((step) => (
                <div
                  key={step.num}
                  className="relative rounded-3xl p-8 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft"
                >
                  <span className="text-5xl font-black text-indigo-100 dark:text-indigo-950/80 select-none block mb-3">
                    {step.num}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. TRANSPARENT LIVE PRICING PLANS */}
        {/* ============================================================ */}
        <section id="pricing" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3 border border-indigo-200 dark:border-indigo-800/50">
                <Layers className="w-3.5 h-3.5" />
                <span>{t('landing.navPricing')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
                {t('landing.pricingTitle')}
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                {t('landing.pricingSubtitle')}
              </p>
            </div>

            {/* Grade Selector for Dynamic Pricing */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-2">
                {t('landing.pricingSelectGrade')}
              </span>
              {gradeList.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setPricingGrade(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    pricingGrade === g.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-[#121A2D] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#23304E] hover:border-indigo-300'
                  }`}
                >
                  {formatGrade(g.gradeNumber || g.id)}
                </button>
              ))}
            </div>

            {/* 3 Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
              {(loadingPricing && pricingPlans.length === 0
                ? [
                    { id: 'MONTHLY', priceUzs: 89000 },
                    { id: 'THREE_MONTHS', priceUzs: 222000 },
                    { id: 'YEARLY', priceUzs: 712000 },
                  ]
                : pricingPlans
              ).map((plan) => {
                const isThreeMonths = plan.id === 'THREE_MONTHS';
                const isYearly = plan.id === 'YEARLY';
                const title =
                  plan.id === 'MONTHLY'
                    ? t('landing.pricingMonthly')
                    : plan.id === 'THREE_MONTHS'
                    ? t('landing.pricingThreeMonths')
                    : t('landing.pricingYearly');
                const duration =
                  plan.id === 'MONTHLY'
                    ? t('landing.pricingPerMonth')
                    : plan.id === 'THREE_MONTHS'
                    ? t('landing.pricingPerThreeMonths')
                    : t('landing.pricingPerYear');
                const badge = isYearly
                  ? t('landing.pricingBestValueBadge')
                  : isThreeMonths
                  ? t('landing.pricingPopularBadge')
                  : '';

                return (
                  <div
                    key={plan.id}
                    className={`rounded-3xl p-8 flex flex-col justify-between transition-all relative ${
                      isYearly
                        ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-xl ring-4 ring-indigo-500/20'
                        : 'bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft'
                    }`}
                  >
                    {badge && (
                      <span
                        className={`absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm ${
                          isYearly
                            ? 'bg-amber-400 text-slate-900'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {badge}
                      </span>
                    )}

                    <div>
                      <p
                        className={`text-sm font-extrabold uppercase tracking-wide ${
                          isYearly ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {formatGrade(pricingGrade)}
                      </p>
                      <h3 className="text-xl font-black mt-1 mb-4">{title}</h3>

                      <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight">
                          {formatPriceUzs(plan.priceUzs)}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isYearly ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {t('common.currencySom')} / {duration}
                        </span>
                      </div>

                      <ul className="space-y-3 mb-8 text-sm">
                        {[
                          t('landing.pricingFeat1'),
                          t('landing.pricingFeat2'),
                          t('landing.pricingFeat3'),
                          t('landing.pricingFeat4'),
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2.5">
                            <Check
                              className={`w-4 h-4 shrink-0 ${
                                isYearly
                                  ? 'text-emerald-300'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            />
                            <span
                              className={
                                isYearly ? 'text-indigo-50' : 'text-slate-700 dark:text-slate-300'
                              }
                            >
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenAuth('register')}
                      className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
                        isYearly
                          ? 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                      }`}
                    >
                      {t('landing.pricingChooseBtn')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 6. BOTTOM CTA BANNER */}
        {/* ============================================================ */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto rounded-[2rem] bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 p-8 sm:p-14 text-white shadow-elevated flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="max-w-xl text-center lg:text-left relative z-10">
              <h2 className="text-2xl sm:text-4xl font-black mb-3">{t('landing.ctaTitle')}</h2>
              <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
                {t('landing.ctaSubtitle')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 relative z-10 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 shadow-lg active:scale-95 transition-all"
              >
                {t('landing.ctaPrimary')}
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/25 backdrop-blur-sm active:scale-95 transition-all"
              >
                {t('landing.ctaSecondary')}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 7. FOOTER */}
      {/* ============================================================ */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D18] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="mb-3">
              <BrandLogo size={32} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
              {t('landing.footerDesc')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              {t('landing.footerNavTitle')}
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  {t('landing.navFeatures')}
                </a>
              </li>
              <li>
                <a href="#grades" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  {t('landing.navGrades')}
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  {t('landing.navPricing')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              {t('landing.footerSupportTitle')}
            </h4>
            <a
              href="https://t.me/ilmchi_support"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-sm font-bold hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{t('landing.footerTelegram')}</span>
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('landing.footerCopyright')}
        </div>
      </footer>
    </div>
  );
};
