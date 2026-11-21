import React, { useEffect, useMemo, useState } from 'react';
import type { Book, Grade } from '@smartteacherbook/shared';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Crown,
  Globe2,
  GraduationCap,
  HelpCircle,
  Infinity,
  KeyRound,
  Layers,
  Lock,
  MonitorPlay,
  PenTool,
  Play,
  Send,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Volume2,
  Wifi,
  Zap,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { webApi } from '../../services/api/webApi';
import { LandingHeader } from './LandingHeader';
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqItems = useMemo(
    () => [
      {
        icon: Users,
        q: t('landing.faqQ1'),
        a: t('landing.faqA1'),
      },
      {
        icon: Smartphone,
        q: t('landing.faqQ2'),
        a: t('landing.faqA2'),
      },
      {
        icon: Wifi,
        q: t('landing.faqQ3'),
        a: t('landing.faqA3'),
      },
      {
        icon: PenTool,
        q: t('landing.faqQ4'),
        a: t('landing.faqA4'),
      },
      {
        icon: Play,
        q: t('landing.faqQ5'),
        a: t('landing.faqA5'),
      },
    ],
    [t],
  );

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
      const matchedGrade = grades.find((g) => g.id === pricingGrade || g.gradeNumber === pricingGrade);
      setPricingPlans([
        {
          id: 'MONTHLY',
          durationDays: 30,
          priceUzs: matchedGrade?.priceMonthlyUzs ?? 79000,
          badge: '',
        },
        {
          id: 'THREE_MONTHS',
          durationDays: 90,
          priceUzs: matchedGrade?.priceQuarterlyUzs ?? 199000,
          badge: t('landing.pricingPopularBadge'),
        },
        {
          id: 'YEARLY',
          durationDays: 365,
          priceUzs: matchedGrade?.priceYearlyUzs ?? 630000,
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
      iconBg: 'bg-[#EEF4FF] dark:bg-[#2A4FB8]/20',
      iconBorder: 'border-[#BAD2FF] dark:border-[#223F94]',
      iconColor: 'text-[#2A4FB8] dark:text-[#5B93FA]',
      bottomBar: 'bg-gradient-to-r from-[#2A4FB8] via-[#3461D6] to-[#5B93FA]',
      bottomShadow: 'shadow-[0_16px_36px_-10px_rgba(42,79,184,0.32)] dark:shadow-[0_16px_36px_-10px_rgba(42,79,184,0.2)]',
      arrowColor: 'text-[#2A4FB8]',
      title: t('landing.feat1Title'),
      desc: t('landing.feat1Desc'),
    },
    {
      icon: Volume2,
      iconBg: 'bg-[#E6F6F4] dark:bg-[#0E7C70]/20',
      iconBorder: 'border-[#C2EAE5] dark:border-[#0E7C70]/40',
      iconColor: 'text-[#0E7C70] dark:text-[#5ED3C4]',
      bottomBar: 'bg-gradient-to-r from-[#0E7C70] via-[#14A294] to-[#5ED3C4]',
      bottomShadow: 'shadow-[0_16px_36px_-10px_rgba(14,124,112,0.32)] dark:shadow-[0_16px_36px_-10px_rgba(14,124,112,0.2)]',
      arrowColor: 'text-[#0E7C70]',
      title: t('landing.feat2Title'),
      desc: t('landing.feat2Desc'),
    },
    {
      icon: PenTool,
      iconBg: 'bg-[#FFFBEB] dark:bg-[#F5B82E]/20',
      iconBorder: 'border-[#FCD34D]/60 dark:border-[#E0A21A]/40',
      iconColor: 'text-[#B45309] dark:text-[#FBBF24]',
      bottomBar: 'bg-gradient-to-r from-[#B45309] via-[#F5B82E] to-[#FCD34D]',
      bottomShadow: 'shadow-[0_16px_36px_-10px_rgba(245,184,46,0.32)] dark:shadow-[0_16px_36px_-10px_rgba(245,184,46,0.2)]',
      arrowColor: 'text-[#B45309]',
      title: t('landing.feat3Title'),
      desc: t('landing.feat3Desc'),
    },
    {
      icon: KeyRound,
      iconBg: 'bg-[#F4F0FD] dark:bg-[#6D3FD1]/20',
      iconBorder: 'border-[#E6DCFA] dark:border-[#6D3FD1]/40',
      iconColor: 'text-[#6D3FD1] dark:text-[#B69CFF]',
      bottomBar: 'bg-gradient-to-r from-[#5A30B0] via-[#6D3FD1] to-[#B69CFF]',
      bottomShadow: 'shadow-[0_16px_36px_-10px_rgba(109,63,209,0.32)] dark:shadow-[0_16px_36px_-10px_rgba(109,63,209,0.2)]',
      arrowColor: 'text-[#6D3FD1]',
      title: t('landing.feat4Title'),
      desc: t('landing.feat4Desc'),
    },
    {
      icon: Cloud,
      iconBg: 'bg-[#EEF8FD] dark:bg-[#0369A1]/20',
      iconBorder: 'border-[#BAD2FF] dark:border-[#0369A1]/40',
      iconColor: 'text-[#0369A1] dark:text-[#7DD3FC]',
      bottomBar: 'bg-gradient-to-r from-[#075985] via-[#0369A1] to-[#7DD3FC]',
      bottomShadow: 'shadow-[0_16px_36px_-10px_rgba(3,105,161,0.32)] dark:shadow-[0_16px_36px_-10px_rgba(3,105,161,0.2)]',
      arrowColor: 'text-[#0369A1]',
      title: t('landing.feat5Title'),
      desc: t('landing.feat5Desc'),
    },
    {
      icon: Globe2,
      iconBg: 'bg-[#FDF1F4] dark:bg-[#C23B5A]/20',
      iconBorder: 'border-[#FBDCE4] dark:border-[#C23B5A]/40',
      iconColor: 'text-[#C23B5A] dark:text-[#FF8FA6]',
      bottomBar: 'bg-gradient-to-r from-[#9E2D47] via-[#C23B5A] to-[#FF8FA6]',
      bottomShadow: 'shadow-[0_16px_36px_-10px_rgba(194,59,90,0.32)] dark:shadow-[0_16px_36px_-10px_rgba(194,59,90,0.2)]',
      arrowColor: 'text-[#C23B5A]',
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
    <div className="min-h-screen flex flex-col bg-[#F4F5F2] dark:bg-[#15181E] text-[#1F2933] dark:text-[#E6E8EC] transition-colors">
      <LandingHeader
        onOpenLogin={() => onOpenAuth('login')}
        onOpenRegister={() => onOpenAuth('register')}
      />

      <main className="flex-1">
        {/* ============================================================ */}
        {/* 1. HERO SECTION — Modern 2026 SaaS/EdTech Redesign           */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden bg-[#F4F5F2] dark:bg-[#15181E] -mt-[68px] sm:-mt-[76px] pt-[100px] sm:pt-[116px] lg:pt-[124px] pb-8 sm:pb-12 min-h-screen flex flex-col justify-start lg:justify-center transition-colors">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#2A4FB8]/[0.06] dark:bg-[#2A4FB8]/15 rounded-full pointer-events-none" />
          <div className="absolute top-1/4 right-1/10 w-[500px] h-[500px] bg-[#0369A1]/[0.06] dark:bg-[#0369A1]/15 rounded-full pointer-events-none" />

          {/* Bottom-Left Crisp Curved Wave (Reference Design) */}
          <svg
            className="absolute bottom-0 left-0 w-[380px] sm:w-[480px] lg:w-[560px] h-[150px] sm:h-[190px] lg:h-[220px] pointer-events-none z-0"
            viewBox="0 0 560 220"
            fill="none"
          >
            <path
              d="M -10 230 L -10 60 C 130 50, 250 100, 360 155 C 440 195, 500 215, 570 230 Z"
              fill="url(#botLeftGradClean)"
            />
            <defs>
              <linearGradient id="botLeftGradClean" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#BAD2FF" stopOpacity="0.75" />
                <stop offset="45%" stopColor="#8DB5FF" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#EEF4FF" stopOpacity="0.08" />
              </linearGradient>
            </defs>
          </svg>

          {/* Bottom-Right Crisp Curved Wave (Reference Design) */}
          <svg
            className="absolute bottom-0 right-0 w-[420px] sm:w-[540px] lg:w-[620px] h-[160px] sm:h-[200px] lg:h-[240px] pointer-events-none z-0"
            viewBox="0 0 620 240"
            fill="none"
          >
            <path
              d="M 630 250 L 630 50 C 500 40, 380 95, 260 155 C 160 205, 80 230, -10 250 Z"
              fill="url(#botRightGradClean)"
            />
            <defs>
              <linearGradient id="botRightGradClean" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0369A1" stopOpacity="0.65" />
                <stop offset="45%" stopColor="#14A294" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0E7C70" stopOpacity="0.08" />
              </linearGradient>
            </defs>
          </svg>

          {/* Top-Right Decorative Dot Matrix */}
          <div className="absolute top-24 right-8 lg:right-16 hidden sm:grid grid-cols-6 gap-2.5 opacity-40 dark:opacity-20 pointer-events-none z-10">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#2A4FB8]/60 dark:bg-[#5B93FA]" />
            ))}
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-4 sm:pt-6 lg:pt-2 pb-8 sm:pb-12 text-center">
            {/* Center Column: Heading, Subtitle, CTAs, Statistics */}
            <div className="space-y-6 sm:space-y-7 max-w-4xl mx-auto flex flex-col items-center">
              {/* Modern Glassmorphism Pill Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FBFBF9]/80 dark:bg-[#1E222A]/80 backdrop-blur-xl border border-[#BAD2FF] dark:border-[#223F94] text-[#2A4FB8] dark:text-[#5B93FA] text-xs sm:text-sm font-semibold shadow-[0_4px_16px_rgba(42,79,184,0.1),inset_0_1px_1px_rgba(255,255,255,0.9)] mt-2 sm:mt-0">
                <Sparkles className="w-3.5 h-3.5 fill-[#2A4FB8] text-[#2A4FB8] dark:fill-[#5B93FA] dark:text-[#5B93FA]" />
                <span>{t('landing.heroBadge')}</span>
              </div>

              {/* Bold Display Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[62px] font-black tracking-tight text-[#142452] dark:text-white leading-[1.14] max-w-4xl">
                {t('landing.heroTitlePart1')}
                <span className="block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-[#2A4FB8] via-[#0369A1] to-[#0E7C70]">
                  {t('landing.heroTitleAccent')}
                </span>
              </h1>

              {/* Subtitle / Description */}
              <p className="text-base sm:text-lg lg:text-xl text-[#52617A] dark:text-[#9AA3B0] max-w-2xl mx-auto leading-relaxed font-normal">
                {t('landing.heroSubtitle')}
              </p>

              {/* Primary & Secondary CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-full bg-[#2A4FB8] hover:bg-[#223F94] text-white font-bold text-sm sm:text-base shadow-[0_14px_32px_-6px_rgba(42,79,184,0.45),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_18px_36px_-6px_rgba(42,79,184,0.55)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
                >
                  <span>{t('landing.heroCtaPrimary')}</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="#pricing"
                  className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-full bg-[#FBFBF9]/90 dark:bg-[#1E222A]/90 backdrop-blur-xl hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] text-[#1F2933] dark:text-[#E6E8EC] font-bold text-sm sm:text-base border border-[#D9DCD5] dark:border-[#353B47] shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06),inset_0_1px_2px_rgba(255,255,255,1)] hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>{t('landing.heroCtaSecondary')}</span>
                  <ChevronRight className="w-4 h-4 text-[#5B6672] dark:text-[#9AA3B0] group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>

              {/* 4 Statistics in Modern Glassmorphic Containers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-8 sm:pt-10 w-full max-w-3xl">
                {/* Stat 1: 1–11 */}
                <div className="flex flex-col items-center text-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#EEF4FF] dark:bg-[#142452]/50 border border-[#BAD2FF] dark:border-[#223F94] backdrop-blur-md shadow-[0_4px_14px_rgba(42,79,184,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_14px_rgba(42,79,184,0.3)] flex items-center justify-center text-[#2A4FB8] dark:text-[#5B93FA]">
                    <Zap className="w-5 h-5 fill-[#2A4FB8] text-[#2A4FB8] dark:fill-[#5B93FA] dark:text-[#5B93FA]" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-black text-[#2A4FB8] dark:text-[#5B93FA] tracking-tight">
                      {t('landing.statGradesVal')}
                    </p>
                    <p className="text-xs font-medium text-[#52617A] dark:text-[#9AA3B0] mt-0.5">
                      {t('landing.statGradesLabel')}
                    </p>
                  </div>
                </div>

                {/* Stat 2: Audio & Video */}
                <div className="flex flex-col items-center text-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#E6F6F4] dark:bg-[#0B6259]/40 border border-[#C2EAE5] dark:border-[#0E7C70]/50 backdrop-blur-md shadow-[0_4px_14px_rgba(14,124,112,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_14px_rgba(14,124,112,0.3)] flex items-center justify-center text-[#0E7C70] dark:text-[#5ED3C4]">
                    <Play className="w-4 h-4 fill-[#0E7C70] text-[#0E7C70] ml-0.5 dark:fill-[#5ED3C4] dark:text-[#5ED3C4]" />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-black text-[#1F2933] dark:text-[#E6E8EC] tracking-tight leading-snug">
                      {t('landing.statMediaVal')}
                    </p>
                    <p className="text-xs font-medium text-[#52617A] dark:text-[#9AA3B0] mt-0.5">
                      {t('landing.statMediaLabel')}
                    </p>
                  </div>
                </div>

                {/* Stat 3: 2 ta qurilma */}
                <div className="flex flex-col items-center text-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#FFFBEB] dark:bg-[#92400E]/30 border border-[#FCD34D]/60 dark:border-[#B45309]/50 backdrop-blur-md shadow-[0_4px_14px_rgba(245,184,46,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_14px_rgba(245,184,46,0.3)] flex items-center justify-center text-[#B45309] dark:text-[#FBBF24]">
                    <Star className="w-4 h-4 fill-[#B45309] text-[#B45309] dark:fill-[#FBBF24] dark:text-[#FBBF24]" />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-black text-[#B45309] dark:text-[#FBBF24] tracking-tight leading-snug">
                      {t('landing.statDevicesVal')}
                    </p>
                    <p className="text-xs font-medium text-[#52617A] dark:text-[#9AA3B0] mt-0.5">
                      {t('landing.statDevicesLabel')}
                    </p>
                  </div>
                </div>

                {/* Stat 4: 100% Onlayn */}
                <div className="flex flex-col items-center text-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#EEF8FD] dark:bg-[#0369A1]/30 border border-[#BAD2FF] dark:border-[#0369A1]/50 backdrop-blur-md shadow-[0_4px_14px_rgba(3,105,161,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_14px_rgba(3,105,161,0.3)] flex items-center justify-center text-[#0369A1] dark:text-[#7DD3FC]">
                    <Infinity className="w-5 h-5 text-[#0369A1] dark:text-[#7DD3FC]" />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-black text-[#1F2933] dark:text-[#E6E8EC] tracking-tight leading-snug">
                      {t('landing.statSyncVal')}
                    </p>
                    <p className="text-xs font-medium text-[#52617A] dark:text-[#9AA3B0] mt-0.5">
                      {t('landing.statSyncLabel')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 2. FEATURES SECTION — Clean Minimalist Surface (No noise)    */}
        {/* ============================================================ */}
        <section
          id="features"
          className="relative py-20 sm:py-24 bg-[#F4F5F2] dark:bg-[#15181E]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
              {/* Badge with horizontal side lines (Reference Design) */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-[1px] bg-[#BAD2FF] dark:bg-[#223F94]" />
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EEF4FF] dark:bg-[#2A4FB8]/20 text-[#2A4FB8] dark:text-[#5B93FA] border border-[#BAD2FF] dark:border-[#223F94] text-xs font-bold uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 fill-[#2A4FB8] text-[#2A4FB8] dark:fill-[#5B93FA] dark:text-[#5B93FA]" />
                  <span>{t('landing.navFeatures')}</span>
                </div>
                <div className="w-12 h-[1px] bg-[#BAD2FF] dark:bg-[#223F94]" />
              </div>

              {/* Solid Heading (Reference Design) */}
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black tracking-tight text-[#142452] dark:text-white mb-3.5 leading-tight">
                {t('landing.featuresTitle')}
              </h2>

              {/* Description */}
              <p className="text-base sm:text-lg text-[#52617A] dark:text-[#9AA3B0] max-w-2xl mx-auto leading-relaxed font-normal">
                {t('landing.featuresSubtitle')}
              </p>
            </div>

            {/* Feature Cards Grid (3 Columns Desktop, 2 Tablet, 1 Mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">
              {features.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className={`group relative rounded-[28px] p-7 sm:p-8 bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] ${feat.bottomShadow} hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden`}
                  >
                    <div>
                      {/* Top Row: Icon Container on Left, Arrow Button on Right */}
                      <div className="flex items-center justify-between mb-6">
                        <div
                          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${feat.iconBg} ${feat.iconBorder} ${feat.iconColor}`}
                        >
                          <Icon className="w-6 h-6 transition-transform duration-300 group-hover:rotate-3" />
                        </div>

                        <div className="w-9 h-9 rounded-full bg-[#ECEEEA] dark:bg-[#272C36] border border-[#D9DCD5] dark:border-[#353B47] flex items-center justify-center text-[#5B6672] dark:text-[#9AA3B0] group-hover:bg-[#2A4FB8] group-hover:text-white group-hover:border-[#2A4FB8] transition-all duration-300 shadow-sm">
                          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </div>
                      </div>

                      {/* Card Title */}
                      <h3 className="text-lg sm:text-[19px] font-bold text-[#1F2933] dark:text-white mb-2.5 leading-snug group-hover:text-[#2A4FB8] dark:group-hover:text-[#5B93FA] transition-colors">
                        {feat.title}
                      </h3>

                      {/* Card Description */}
                      <p className="text-xs sm:text-sm text-[#52617A] dark:text-[#9AA3B0] leading-relaxed font-normal">
                        {feat.desc}
                      </p>
                    </div>

                    {/* Bottom Accent Gradient Bar (Reference Design) */}
                    <div className={`absolute inset-x-0 bottom-0 h-[3.5px] ${feat.bottomBar}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. LIVE 1-11 GRADES & TEXTBOOK CATALOG SHOWCASE             */}
        {/* ============================================================ */}
        <section id="grades" className="relative py-20 sm:py-24 bg-[#F4F5F2] dark:bg-[#15181E] overflow-hidden">
          {/* Top-Left Soft Lavender Organic Wave */}
          <svg
            className="absolute -top-10 -left-10 w-[360px] sm:w-[460px] h-[220px] sm:h-[280px] pointer-events-none z-0 opacity-70 dark:opacity-20"
            viewBox="0 0 460 280"
            fill="none"
          >
            <path
              d="M -10 -10 L 320 -10 C 260 80, 160 180, 40 240 C -10 260, -10 280, -10 280 Z"
              fill="url(#gradesTopLeftGrad)"
            />
            <defs>
              <linearGradient id="gradesTopLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#BAD2FF" stopOpacity="0.75" />
                <stop offset="60%" stopColor="#DCE8FF" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#EEF4FF" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>

          {/* Top-Right Soft Cyan Organic Wave */}
          <svg
            className="absolute -top-10 -right-10 w-[380px] sm:w-[480px] h-[240px] sm:h-[300px] pointer-events-none z-0 opacity-70 dark:opacity-20"
            viewBox="0 0 480 300"
            fill="none"
          >
            <path
              d="M 490 -10 L 160 -10 C 220 80, 320 180, 440 250 C 490 270, 490 300, 490 300 Z"
              fill="url(#gradesTopRightGrad)"
            />
            <defs>
              <linearGradient id="gradesTopRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#BAD2FF" stopOpacity="0.65" />
                <stop offset="60%" stopColor="#C2EAE5" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#E6F6F4" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>

          {/* Left-Side Dot Matrix */}
          <div className="absolute top-[32%] left-3 sm:left-6 hidden md:grid grid-cols-6 gap-2.5 opacity-35 dark:opacity-15 pointer-events-none z-0">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#BAD2FF]" />
            ))}
          </div>

          {/* Right-Side Dot Matrix */}
          <div className="absolute top-[32%] right-3 sm:right-6 hidden md:grid grid-cols-6 gap-2.5 opacity-35 dark:opacity-15 pointer-events-none z-0">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#BAD2FF]" />
            ))}
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF9F1] dark:bg-[#166534]/60 text-[#15803D] dark:text-[#4ADE80] text-xs font-bold uppercase tracking-wider mb-3 border border-[#22A45A]/30">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>1–11</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#142452] dark:text-white mb-3">
                {t('landing.gradesTitle')}
              </h2>
              <p className="text-base text-[#5B6672] dark:text-[#9AA3B0]">
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
                        ? 'bg-[#2A4FB8] text-white border-[#2A4FB8] shadow-md shadow-[#2A4FB8]/25 scale-[1.02]'
                        : 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#1F2933] dark:text-[#E6E8EC] border-[#D9DCD5] dark:border-[#353B47] hover:border-[#2A4FB8] dark:hover:border-[#5B93FA]'
                    }`}
                  >
                    <span>{formatGrade(g.gradeNumber || g.id)}</span>
                    {count > 0 && (
                      <span
                        className={`px-1.5 py-0.5 text-[11px] rounded-md font-extrabold ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-[#EEF4FF] dark:bg-[#142452] text-[#2A4FB8] dark:text-[#5B93FA]'
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
                      ? 'bg-[#142452] dark:bg-white text-white dark:text-[#142452] border-transparent'
                      : 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#5B6672] dark:text-[#9AA3B0] border-[#D9DCD5] dark:border-[#353B47]'
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
                          ? 'bg-[#EEF4FF] dark:bg-[#142452] text-[#2A4FB8] dark:text-[#5B93FA] border-[#BAD2FF] dark:border-[#223F94]'
                          : 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#5B6672] dark:text-[#9AA3B0] border-[#D9DCD5] dark:border-[#353B47]'
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
                    className="h-44 rounded-3xl bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] animate-pulse p-6"
                  />
                ))}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="max-w-lg mx-auto text-center rounded-3xl p-10 bg-[#FBFBF9] dark:bg-[#1E222A] border border-dashed border-[#D9DCD5] dark:border-[#353B47]">
                <BookOpen className="w-10 h-10 text-[#5B6672] dark:text-[#9AA3B0] mx-auto mb-3" />
                <p className="text-sm font-bold text-[#1F2933] dark:text-[#E6E8EC]">
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
                      className="group cursor-pointer rounded-3xl p-5 bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] shadow-soft hover:shadow-elevated hover:border-[#2A4FB8] dark:hover:border-[#5B93FA] transition-all flex items-start gap-4"
                    >
                      {/* Book Cover Thumbnail */}
                      <div className="w-20 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-[#2A4FB8] to-[#1C3375] shrink-0 shadow-md flex items-center justify-center relative">
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
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-[#EEF4FF] dark:bg-[#142452] text-[#2A4FB8] dark:text-[#5B93FA] border border-[#BAD2FF] dark:border-[#223F94]">
                              {formatBookType(book.type)}
                            </span>
                            <span className="text-[11px] font-semibold text-[#5B6672] dark:text-[#9AA3B0] truncate">
                              {subj.name}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-sm sm:text-base text-[#1F2933] dark:text-white line-clamp-2 group-hover:text-[#2A4FB8] dark:group-hover:text-[#5B93FA] transition-colors">
                            {book.title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#D9DCD5] dark:border-[#353B47]">
                          <span className="text-xs font-semibold text-[#5B6672] dark:text-[#9AA3B0]">
                            {book.totalPages} {t('common.pages')}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2A4FB8] dark:text-[#5B93FA]">
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
        {/* 4. HOW IT WORKS (WORKFLOW) — Gradient Aesthetic             */}
        {/* ============================================================ */}
        <section
          id="workflow"
          className="relative py-20 sm:py-24 bg-[#F4F5F2] dark:bg-[#15181E] overflow-hidden"
        >
          {/* Top-Left Soft Lavender Wave */}
          <svg
            className="absolute -top-10 -left-10 w-[360px] sm:w-[460px] h-[220px] sm:h-[280px] pointer-events-none z-0 opacity-80 dark:opacity-30"
            viewBox="0 0 460 280"
            fill="none"
          >
            <path
              d="M -10 -10 L 320 -10 C 260 80, 160 180, 40 240 C -10 260, -10 280, -10 280 Z"
              fill="url(#flowTopLeftGrad)"
            />
            <defs>
              <linearGradient id="flowTopLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#BAD2FF" stopOpacity="0.75" />
                <stop offset="60%" stopColor="#DCE8FF" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#EEF4FF" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>

          {/* Top-Right Soft Cyan Wave */}
          <svg
            className="absolute -top-10 -right-10 w-[380px] sm:w-[480px] h-[240px] sm:h-[300px] pointer-events-none z-0 opacity-80 dark:opacity-30"
            viewBox="0 0 480 300"
            fill="none"
          >
            <path
              d="M 490 -10 L 160 -10 C 220 80, 320 180, 440 250 C 490 270, 490 300, 490 300 Z"
              fill="url(#flowTopRightGrad)"
            />
            <defs>
              <linearGradient id="flowTopRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#BAD2FF" stopOpacity="0.65" />
                <stop offset="60%" stopColor="#C2EAE5" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#E6F6F4" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>

          {/* Left-Side Dot Matrix */}
          <div className="absolute top-[32%] left-3 sm:left-6 hidden md:grid grid-cols-6 gap-2.5 opacity-40 dark:opacity-20 pointer-events-none z-0">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#BAD2FF]" />
            ))}
          </div>

          {/* Right-Side Dot Matrix */}
          <div className="absolute top-[32%] right-3 sm:right-6 hidden md:grid grid-cols-6 gap-2.5 opacity-40 dark:opacity-20 pointer-events-none z-0">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#BAD2FF]" />
            ))}
          </div>

          {/* Bottom-Left Soft Cyan Wave */}
          <svg
            className="absolute -bottom-8 -left-8 w-[320px] sm:w-[420px] h-[180px] sm:h-[220px] pointer-events-none z-0 opacity-75 dark:opacity-25"
            viewBox="0 0 420 220"
            fill="none"
          >
            <path
              d="M -10 230 L -10 60 C 100 70, 200 120, 280 165 C 350 205, 390 220, 430 230 Z"
              fill="url(#flowBotLeftGrad)"
            />
            <defs>
              <linearGradient id="flowBotLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14A294" stopOpacity="0.55" />
                <stop offset="60%" stopColor="#0369A1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#2A4FB8" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>

          {/* Bottom-Right Soft Sky Blue Circular Shape */}
          <div
            className="absolute -bottom-16 -right-16 w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] rounded-full pointer-events-none z-0 opacity-60 dark:opacity-20"
            style={{
              background:
                'linear-gradient(135deg, rgba(141, 181, 255, 0.4) 0%, rgba(42, 79, 184, 0.2) 60%, transparent 100%)',
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EEF4FF] dark:bg-[#2A4FB8]/20 text-[#2A4FB8] dark:text-[#5B93FA] border border-[#BAD2FF] dark:border-[#223F94] text-xs font-bold uppercase tracking-wider shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-[#2A4FB8] text-[#2A4FB8] dark:fill-[#5B93FA] dark:text-[#5B93FA]" />
                  <span>{t('landing.workflowBadge')}</span>
                </div>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black tracking-tight text-[#142452] dark:text-white mb-3.5 leading-tight">
                {t('landing.workflowTitle')}
              </h2>
              <p className="text-base sm:text-lg text-[#52617A] dark:text-[#9AA3B0] max-w-2xl mx-auto leading-relaxed font-normal">
                {t('landing.workflowSubtitle')}
              </p>
            </div>

            {/* 3 Step Cards Grid (Matching Image 2) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 items-stretch">
              {[
                {
                  num: '01',
                  title: t('landing.step1Title'),
                  desc: t('landing.step1Desc'),
                  numColor: 'text-[#2A4FB8] dark:text-[#5B93FA]',
                  numBg: 'bg-[#EEF4FF] dark:bg-[#2A4FB8]/20',
                  numBorder: 'border-[#BAD2FF] dark:border-[#223F94]',
                  accentGlow: 'shadow-[0_16px_36px_-10px_rgba(42,79,184,0.18)] dark:shadow-[0_16px_36px_-10px_rgba(42,79,184,0.1)]',
                  bottomGradient:
                    'from-[#DCE8FF]/60 via-[#EEF4FF]/30 to-transparent dark:from-[#1C3375]/30 dark:via-[#142452]/20 dark:to-transparent',
                },
                {
                  num: '02',
                  title: t('landing.step2Title'),
                  desc: t('landing.step2Desc'),
                  numColor: 'text-[#0369A1] dark:text-[#7DD3FC]',
                  numBg: 'bg-[#EEF8FD] dark:bg-[#0369A1]/20',
                  numBorder: 'border-[#BAD2FF] dark:border-[#0369A1]/30',
                  accentGlow: 'shadow-[0_16px_36px_-10px_rgba(3,105,161,0.18)] dark:shadow-[0_16px_36px_-10px_rgba(3,105,161,0.1)]',
                  bottomGradient:
                    'from-[#BAD2FF]/60 via-[#EEF8FD]/30 to-transparent dark:from-[#075985]/30 dark:via-[#142452]/20 dark:to-transparent',
                },
                {
                  num: '03',
                  title: t('landing.step3Title'),
                  desc: t('landing.step3Desc'),
                  numColor: 'text-[#0E7C70] dark:text-[#5ED3C4]',
                  numBg: 'bg-[#E6F6F4] dark:bg-[#0E7C70]/20',
                  numBorder: 'border-[#C2EAE5] dark:border-[#0E7C70]/30',
                  accentGlow: 'shadow-[0_16px_36px_-10px_rgba(14,124,112,0.18)] dark:shadow-[0_16px_36px_-10px_rgba(14,124,112,0.1)]',
                  bottomGradient:
                    'from-[#C2EAE5]/60 via-[#E6F6F4]/30 to-transparent dark:from-[#0B6259]/30 dark:via-[#15181E]/20 dark:to-transparent',
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className={`group relative rounded-[28px] p-7 sm:p-8 bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] ${step.accentGlow} hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden min-h-[240px]`}
                >
                  <div className="relative z-10">
                    {/* Top Row: Squircle number + Circular Arrow Button */}
                    <div className="flex items-center justify-between mb-6">
                      <div
                        className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center font-black text-xl transition-transform duration-300 group-hover:scale-105 ${step.numBg} ${step.numBorder} ${step.numColor}`}
                      >
                        {step.num}
                      </div>

                      <div className="w-9 h-9 rounded-full bg-[#ECEEEA] dark:bg-[#272C36] border border-[#D9DCD5] dark:border-[#353B47] flex items-center justify-center text-[#5B6672] dark:text-[#9AA3B0] group-hover:bg-[#2A4FB8] group-hover:text-white group-hover:border-[#2A4FB8] transition-all duration-300 shadow-sm">
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </div>
                    </div>

                    <h3 className="text-lg sm:text-[19px] font-bold text-[#1F2933] dark:text-white mb-2 leading-snug">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#52617A] dark:text-[#9AA3B0] leading-relaxed font-normal">
                      {step.desc}
                    </p>
                  </div>

                  {/* Soft Curved Gradient Inside Bottom of Card */}
                  <div
                    className={`absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t ${step.bottomGradient} pointer-events-none rounded-b-[28px]`}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. TRANSPARENT LIVE PRICING PLANS — Clean Minimalist Surface */}
        {/* ============================================================ */}
        <section
          id="pricing"
          className="relative py-20 sm:py-24 bg-[#F4F5F2] dark:bg-[#15181E]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EEF4FF] dark:bg-[#2A4FB8]/20 text-[#2A4FB8] dark:text-[#5B93FA] border border-[#BAD2FF] dark:border-[#223F94] text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
                <Layers className="w-3.5 h-3.5" />
                <span>{t('landing.navPricing')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black tracking-tight text-[#142452] dark:text-white mb-3.5 leading-tight">
                {t('landing.pricingTitle')}
              </h2>
              <p className="text-base sm:text-lg text-[#52617A] dark:text-[#9AA3B0] max-w-2xl mx-auto leading-relaxed font-normal">
                {t('landing.pricingSubtitle')}
              </p>
            </div>

            {/* Grade Selector for Dynamic Pricing */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-12 sm:mb-14">
              <span className="text-xs sm:text-sm font-semibold text-[#5B6672] dark:text-[#9AA3B0] mr-2">
                {t('landing.pricingSelectGrade')}:
              </span>
              {gradeList.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setPricingGrade(g.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    pricingGrade === g.id
                      ? 'bg-[#2A4FB8] text-white border-[#2A4FB8] shadow-md shadow-[#2A4FB8]/25 scale-105'
                      : 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#5B6672] dark:text-[#9AA3B0] border-[#D9DCD5] dark:border-[#353B47] hover:border-[#2A4FB8]'
                  }`}
                >
                  {formatGrade(g.gradeNumber || g.id)}
                </button>
              ))}
            </div>

            {/* 3 Pricing Cards Grid (Matching Image 1) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 max-w-6xl mx-auto items-stretch">
              {(loadingPricing && pricingPlans.length === 0
                ? [
                    { id: 'MONTHLY', priceUzs: grades.find((g) => g.id === pricingGrade)?.priceMonthlyUzs || 20000 },
                    { id: 'THREE_MONTHS', priceUzs: grades.find((g) => g.id === pricingGrade)?.priceQuarterlyUzs || 55000 },
                    { id: 'YEARLY', priceUzs: grades.find((g) => g.id === pricingGrade)?.priceYearlyUzs || 200000 },
                  ]
                : pricingPlans
              ).map((plan) => {
                const isThreeMonths = plan.id === 'THREE_MONTHS';
                const isYearly = plan.id === 'YEARLY';
                const title =
                  plan.name ||
                  (plan.id === 'MONTHLY'
                    ? t('landing.pricingMonthly')
                    : plan.id === 'THREE_MONTHS'
                    ? t('landing.pricingThreeMonths')
                    : t('landing.pricingYearly'));
                const duration =
                  plan.id === 'MONTHLY'
                    ? '30 kun'
                    : plan.id === 'THREE_MONTHS'
                    ? '90 kun'
                    : '365 kun';
                const badge =
                  plan.badge !== undefined && plan.badge !== null && plan.badge !== ''
                    ? plan.badge
                    : isYearly
                    ? 'ENG FOYDALI'
                    : isThreeMonths
                    ? 'TEJAMKOR'
                    : '';

                if (isYearly) {
                  return (
                    <div
                      key={plan.id}
                      className="group rounded-[28px] p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 bg-gradient-to-br from-[#2A4FB8] via-[#223F94] to-[#0E7C70] text-white shadow-[0_24px_50px_-10px_rgba(42,79,184,0.45)] ring-1 ring-white/25 hover:-translate-y-1.5 relative"
                    >
                      {badge && (
                        <span className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-lg bg-[#F5B82E] text-[#142452] z-20">
                          {badge}
                        </span>
                      )}

                      <div>
                        {/* Top Row: Grade Badge + Crown Icon Squircle */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm">
                            {formatGrade(pricingGrade)}
                          </span>
                          <div className="w-12 h-12 rounded-2xl bg-white/20 text-white backdrop-blur-sm flex items-center justify-center shadow-inner">
                            <Crown className="w-5 h-5 text-white" />
                          </div>
                        </div>

                        <h3 className="text-xl font-black text-white mt-2 mb-3">{title}</h3>

                        <div className="flex items-baseline gap-1.5 mb-6">
                          <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                            {formatPriceUzs(plan.priceUzs)}
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-white/80">
                            {t('common.currencySom')} / {duration}
                          </span>
                        </div>

                        <ul className="space-y-3 mb-8 text-xs sm:text-sm">
                          {[
                            t('landing.pricingFeat1'),
                            t('landing.pricingFeat2'),
                            t('landing.pricingFeat3'),
                            t('landing.pricingFeat4'),
                          ].map((item, i) => (
                            <li key={i} className="flex items-center gap-2.5 text-white/95">
                              <Check className="w-4 h-4 shrink-0 text-white" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenAuth('register')}
                        className="w-full py-3.5 rounded-full font-extrabold text-sm transition-all duration-200 bg-white text-[#2A4FB8] hover:bg-[#EEF4FF] shadow-lg flex items-center justify-center gap-2 active:scale-95"
                      >
                        <span>{t('landing.pricingChooseBtn')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                }

                // Monthly and Three Months Cards (Clean Premium White Surface)
                return (
                  <div
                    key={plan.id}
                    className="group rounded-[28px] p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] shadow-[0_16px_36px_-10px_rgba(42,79,184,0.12)] hover:-translate-y-1.5 relative"
                  >
                    {badge && (
                      <span className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md bg-[#0E7C70] text-white z-20">
                        {badge}
                      </span>
                    )}

                    <div>
                      {/* Top Row: Grade Badge + Icon Squircle */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#EEF4FF] text-[#2A4FB8] dark:bg-[#142452] dark:text-[#5B93FA]">
                          {formatGrade(pricingGrade)}
                        </span>
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            isThreeMonths
                              ? 'bg-[#E6F6F4] text-[#0E7C70] dark:bg-[#0E7C70]/20 dark:text-[#5ED3C4]'
                              : 'bg-[#EEF4FF] text-[#2A4FB8] dark:bg-[#2A4FB8]/20 dark:text-[#5B93FA]'
                          }`}
                        >
                          {isThreeMonths ? (
                            <Star className="w-5 h-5 fill-[#0E7C70]" />
                          ) : (
                            <BookOpen className="w-5 h-5" />
                          )}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-[#1F2933] dark:text-white mt-2 mb-3">
                        {title}
                      </h3>

                      <div className="flex items-baseline gap-1.5 mb-6">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#1F2933] dark:text-white">
                          {formatPriceUzs(plan.priceUzs)}
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-[#52617A] dark:text-[#9AA3B0]">
                          {t('common.currencySom')} / {duration}
                        </span>
                      </div>

                      <ul className="space-y-3 mb-8 text-xs sm:text-sm">
                        {[
                          t('landing.pricingFeat1'),
                          t('landing.pricingFeat2'),
                          t('landing.pricingFeat3'),
                          t('landing.pricingFeat4'),
                        ].map((item, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2.5 text-[#52617A] dark:text-[#9AA3B0]"
                          >
                            <Check className="w-4 h-4 shrink-0 text-[#0E7C70]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenAuth('register')}
                      className="w-full py-3.5 rounded-full font-bold text-sm transition-all duration-200 border border-[#BAD2FF] dark:border-[#223F94] text-[#2A4FB8] dark:text-[#5B93FA] hover:bg-[#EEF4FF] dark:hover:bg-[#142452] flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>{t('landing.pricingChooseBtn')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 6. FAQ SECTION — Gradient Aesthetic & Compact Normal Padding */}
        {/* ============================================================ */}
        <section
          id="faq"
          className="relative py-14 sm:py-16 bg-[#F4F5F2] dark:bg-[#15181E] overflow-hidden"
        >
          {/* Top-Left Soft Lavender Wave */}
          <svg
            className="absolute -top-10 -left-10 w-[360px] sm:w-[460px] h-[220px] sm:h-[280px] pointer-events-none z-0 opacity-80 dark:opacity-30"
            viewBox="0 0 460 280"
            fill="none"
          >
            <path
              d="M -10 -10 L 320 -10 C 260 80, 160 180, 40 240 C -10 260, -10 280, -10 280 Z"
              fill="url(#faqTopLeftGrad)"
            />
            <defs>
              <linearGradient id="faqTopLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#BAD2FF" stopOpacity="0.75" />
                <stop offset="60%" stopColor="#DCE8FF" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#EEF4FF" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>

          {/* Top-Right Soft Cyan Wave */}
          <svg
            className="absolute -top-10 -right-10 w-[380px] sm:w-[480px] h-[240px] sm:h-[300px] pointer-events-none z-0 opacity-80 dark:opacity-30"
            viewBox="0 0 480 300"
            fill="none"
          >
            <path
              d="M 490 -10 L 160 -10 C 220 80, 320 180, 440 250 C 490 270, 490 300, 490 300 Z"
              fill="url(#faqTopRightGrad)"
            />
            <defs>
              <linearGradient id="faqTopRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#BAD2FF" stopOpacity="0.65" />
                <stop offset="60%" stopColor="#C2EAE5" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#E6F6F4" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>

          {/* Left-Side Dot Matrix */}
          <div className="absolute top-[32%] left-3 sm:left-6 hidden md:grid grid-cols-6 gap-2.5 opacity-40 dark:opacity-20 pointer-events-none z-0">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#BAD2FF]" />
            ))}
          </div>

          {/* Right-Side Dot Matrix */}
          <div className="absolute top-[32%] right-3 sm:right-6 hidden md:grid grid-cols-6 gap-2.5 opacity-40 dark:opacity-20 pointer-events-none z-0">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#BAD2FF]" />
            ))}
          </div>

          {/* Bottom-Left Soft Cyan Wave */}
          <svg
            className="absolute -bottom-8 -left-8 w-[320px] sm:w-[420px] h-[180px] sm:h-[220px] pointer-events-none z-0 opacity-75 dark:opacity-25"
            viewBox="0 0 420 220"
            fill="none"
          >
            <path
              d="M -10 230 L -10 60 C 100 70, 200 120, 280 165 C 350 205, 390 220, 430 230 Z"
              fill="url(#faqBotLeftGrad)"
            />
            <defs>
              <linearGradient id="faqBotLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14A294" stopOpacity="0.55" />
                <stop offset="60%" stopColor="#0369A1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#2A4FB8" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>

          {/* Bottom-Right Soft Sky Blue Circular Shape */}
          <div
            className="absolute -bottom-16 -right-16 w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] rounded-full pointer-events-none z-0 opacity-60 dark:opacity-20"
            style={{
              background:
                'linear-gradient(135deg, rgba(141, 181, 255, 0.4) 0%, rgba(42, 79, 184, 0.2) 60%, transparent 100%)',
            }}
          />

          <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Section Header with Side Lines */}
            <div className="text-center mb-8 sm:mb-10">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-[1px] bg-[#BAD2FF] dark:bg-[#223F94]" />
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EEF4FF] dark:bg-[#2A4FB8]/20 text-[#2A4FB8] dark:text-[#5B93FA] border border-[#BAD2FF] dark:border-[#223F94] text-xs font-bold uppercase tracking-wider shadow-sm">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{t('landing.faqBadge')}</span>
                </div>
                <div className="w-12 h-[1px] bg-[#BAD2FF] dark:bg-[#223F94]" />
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[38px] font-black tracking-tight text-[#142452] dark:text-white mb-2.5 leading-tight">
                {t('landing.faqTitle')}
              </h2>
              <p className="text-sm sm:text-base text-[#52617A] dark:text-[#9AA3B0] max-w-xl mx-auto leading-relaxed font-normal">
                {t('landing.faqSubtitle')}
              </p>
            </div>

            {/* Compact Normal-Padded FAQ Accordion List */}
            <div className="space-y-3">
              {faqItems.map((item, idx) => {
                const Icon = item.icon || HelpCircle;
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#D9DCD5] dark:border-[#353B47] bg-[#FBFBF9] dark:bg-[#1E222A] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-200 hover:border-[#2A4FB8] dark:hover:border-[#5B93FA]"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-5 sm:px-6 py-3.5 sm:py-4 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-[15px] text-[#1F2933] dark:text-white hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#EEF4FF] dark:bg-[#142452] text-[#2A4FB8] dark:text-[#5B93FA] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="leading-snug">{item.q}</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#5B6672] dark:text-[#9AA3B0] shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#2A4FB8] dark:text-[#5B93FA]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-4 pt-1 pl-[54px] sm:pl-[62px] text-xs sm:text-sm text-[#52617A] dark:text-[#9AA3B0] leading-relaxed border-t border-[#D9DCD5] dark:border-[#353B47] font-normal">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 7. BOTTOM CTA BANNER — Image 3 Redesign                      */}
        {/* ============================================================ */}
        <section className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#F4F5F2] dark:bg-[#15181E] overflow-hidden">
          <div className="max-w-6xl mx-auto rounded-[32px] bg-gradient-to-r from-[#2A4FB8] via-[#223F94] to-[#0E7C70] p-8 sm:p-12 lg:p-14 text-white shadow-[0_24px_50px_-10px_rgba(42,79,184,0.45)] flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
            {/* Right decorative dot matrix inside banner (Matching Image 3) */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:grid grid-cols-6 gap-2.5 opacity-25 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 max-w-2xl relative z-10 text-center sm:text-left">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-lg">
                <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-md" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black mb-2.5 leading-snug">
                  {t('landing.ctaTitle')}
                </h2>
                <p className="text-white/85 text-xs sm:text-sm sm:leading-relaxed font-normal max-w-xl">
                  {t('landing.ctaSubtitle')}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 shrink-0 relative z-10 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white text-[#2A4FB8] font-extrabold text-sm hover:bg-[#EEF4FF] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>{t('landing.ctaPrimary')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/30 backdrop-blur-sm active:scale-95 transition-all"
              >
                {t('landing.ctaSecondary')}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 8. FOOTER — Gradient Aesthetic                              */}
      {/* ============================================================ */}
      <footer className="relative bg-gradient-to-b from-[#F4F5F2] via-[#ECEEEA] to-[#ECEEEA] dark:from-[#15181E] dark:via-[#1A202C] dark:to-[#1E222A] pt-16 pb-10 border-t border-[#D9DCD5] dark:border-[#353B47] overflow-hidden">
        {/* Bottom-Left Soft Lavender Organic Wave */}
        <svg
          className="absolute -bottom-8 -left-8 w-[320px] sm:w-[420px] h-[180px] sm:h-[220px] pointer-events-none z-0 opacity-75 dark:opacity-25"
          viewBox="0 0 420 220"
          fill="none"
        >
          <path
            d="M -10 230 L -10 60 C 100 70, 200 120, 280 165 C 350 205, 390 220, 430 230 Z"
            fill="url(#footerBotLeftGrad)"
          />
          <defs>
            <linearGradient id="footerBotLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BAD2FF" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#DCE8FF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#EEF4FF" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>

        {/* Bottom-Right Soft Cyan Organic Wave */}
        <svg
          className="absolute -bottom-8 -right-8 w-[340px] sm:w-[440px] h-[200px] sm:h-[240px] pointer-events-none z-0 opacity-70 dark:opacity-20"
          viewBox="0 0 440 240"
          fill="none"
        >
          <path
            d="M 450 250 L 450 70 C 350 80, 250 130, 170 175 C 100 215, 60 230, 20 240 Z"
            fill="url(#footerBotRightGrad)"
          />
          <defs>
            <linearGradient id="footerBotRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#BAD2FF" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#C2EAE5" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#E6F6F4" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>

        {/* Left-Side Dot Matrix */}
        <div className="absolute top-1/2 -translate-y-1/2 left-3 sm:left-6 hidden md:grid grid-cols-6 gap-2.5 opacity-35 dark:opacity-15 pointer-events-none z-0">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#BAD2FF]" />
          ))}
        </div>

        {/* Right-Side Dot Matrix */}
        <div className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-6 hidden md:grid grid-cols-6 gap-2.5 opacity-35 dark:opacity-15 pointer-events-none z-0">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#BAD2FF]" />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div>
            <div className="mb-3">
              <BrandLogo size={32} />
            </div>
            <p className="text-sm text-[#52617A] dark:text-[#9AA3B0] leading-relaxed max-w-xs">
              {t('landing.footerDesc')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#142452] dark:text-white mb-4">
              {t('landing.footerNavTitle')}
            </h4>
            <ul className="space-y-2.5 text-sm text-[#52617A] dark:text-[#9AA3B0]">
              <li>
                <a
                  href="#features"
                  className="hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition-colors"
                >
                  {t('landing.navFeatures')}
                </a>
              </li>
              <li>
                <a
                  href="#grades"
                  className="hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition-colors"
                >
                  {t('landing.navGrades')}
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition-colors"
                >
                  {t('landing.navPricing')}
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition-colors"
                >
                  Savol-Javoblar
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#142452] dark:text-white mb-4">
              {t('landing.footerSupportTitle')}
            </h4>
            <a
              href="https://t.me/ilmchi_support"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#EEF8FD] dark:bg-[#0369A1]/30 text-[#0369A1] dark:text-[#7DD3FC] border border-[#BAD2FF] dark:border-[#0369A1]/50 text-xs font-bold hover:bg-[#DCE8FF] dark:hover:bg-[#0369A1]/50 transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('landing.footerTelegram')}</span>
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-[#D9DCD5] dark:border-[#353B47] text-center text-xs text-[#5B6672] dark:text-[#9AA3B0]">
          {t('landing.footerCopyright')}
        </div>
      </footer>
    </div>
  );
};
