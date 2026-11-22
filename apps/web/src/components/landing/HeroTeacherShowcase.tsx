import React, { useState } from 'react';
import {
  BookOpen,
  Volume2,
  Play,
  Pause,
  Video,
  Highlighter,
  CheckCircle2,
  Sparkles,
  Headphones,
  FileText,
  Eraser,
  Monitor,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

interface VocabItem {
  id: string;
  word: string;
  phonetic: string;
  translation: string;
  partOfSpeech: string;
}

const VOCAB_LIST: VocabItem[] = [
  {
    id: 'environment',
    word: 'Environment',
    phonetic: '/ɪnˈvaɪ.rən.mənt/',
    translation: 'Atrof-muhit, tabiat',
    partOfSpeech: 'noun (ot)',
  },
  {
    id: 'education',
    word: 'Education',
    phonetic: '/ˌedʒ.ʊˈkeɪ.ʃən/',
    translation: "Ta'lim, öqitiş",
    partOfSpeech: 'noun (ot)',
  },
  {
    id: 'technology',
    word: 'Technology',
    phonetic: '/tekˈnɒl.ə.dʒi/',
    translation: 'Texnologiya, texnika',
    partOfSpeech: 'noun (ot)',
  },
];

const MARKER_PALETTE = [
  { color: '#FDE047', label: 'Sariq (Yellow)', bgClass: 'bg-[#FDE047]' },
  { color: '#38BDF8', label: 'Moviy (Cyan)', bgClass: 'bg-[#38BDF8]' },
  { color: '#34D399', label: 'Yaşil (Mint)', bgClass: 'bg-[#34D399]' },
  { color: '#F472B6', label: 'Puşti (Rose)', bgClass: 'bg-[#F472B6]' },
];

export const HeroTeacherShowcase: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeVocabId, setActiveVocabId] = useState<string>('environment');
  const [activeMarkerColor, setActiveMarkerColor] = useState<string>('#FDE047');
  const [selectedGrammar, setSelectedGrammar] = useState<'absorb' | 'absorbs'>('absorb');

  return (
    <div className="relative w-full max-w-[560px] sm:max-w-[620px] lg:max-w-[660px] xl:max-w-[700px] mx-auto select-none pt-4 pb-8 lg:py-2">
      {/* ------------------------------------------------------------- */}
      {/* 1. Ambient Background Lighting & 3D Depth Rings               */}
      {/* ------------------------------------------------------------- */}
      {/* Soft Multi-Color Ambient Glow */}
      <div className="absolute -inset-4 sm:-inset-8 rounded-full bg-gradient-to-tr from-[#2A4FB8]/14 via-[#6D3FD1]/10 to-[#14A294]/14 blur-3xl pointer-events-none -z-10" />

      {/* Decorative SVG Orbital Lines for 3D Cosmic SaaS Depth */}
      <svg
        className="absolute -inset-8 sm:-inset-12 w-[calc(100%+64px)] sm:w-[calc(100%+96px)] h-[calc(100%+64px)] sm:h-[calc(100%+96px)] pointer-events-none -z-10"
        viewBox="0 0 760 520"
        fill="none"
      >
        <defs>
          <linearGradient id="orbitSaaSHero" x1="50" y1="440" x2="720" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14A294" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#0369A1" stopOpacity="0.75" />
            <stop offset="75%" stopColor="#2A4FB8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#6D3FD1" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="orbitSaaSHero2" x1="120" y1="100" x2="680" y2="430" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5B93FA" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#14A294" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M 60 380 C 35 220, 140 70, 380 45 C 620 20, 745 130, 730 280 C 715 425, 540 470, 340 455 C 190 445, 80 450, 60 380 Z"
          stroke="url(#orbitSaaSHero)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M 120 415 C 210 465, 580 450, 695 330 C 740 220, 660 90, 460 65"
          stroke="url(#orbitSaaSHero2)"
          strokeWidth="1.4"
          strokeDasharray="4 6"
          strokeLinecap="round"
        />
      </svg>

      {/* ------------------------------------------------------------- */}
      {/* 2. Main 3D Perspective Stage Wrapper                          */}
      {/* ------------------------------------------------------------- */}
      <div className="relative [perspective:1200px] w-full">
        {/* ============================================================ */}
        {/* A. MAIN FOCAL POINT: Floating Interactive English Textbook    */}
        {/* ============================================================ */}
        <div
          className="relative w-full rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#171C2E]/95 backdrop-blur-2xl border border-[#E6E9F2]/80 dark:border-[#262C42]/80 transition-all duration-500 ease-out transform -rotate-1 hover:rotate-0 hover:scale-[1.008]"
          style={{
            boxShadow:
              '0 24px 56px -12px rgba(42, 79, 184, 0.2), 0 12px 28px -8px rgba(15, 23, 42, 0.1), inset 0 1.5px 2px rgba(255, 255, 255, 0.9)',
          }}
        >
          {/* Textbook Chrome / Window Titlebar */}
          <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-[#E6E9F2]/80 dark:border-[#262C42]/80 bg-[#FFFFFF]/90 dark:bg-[#171C2E]/90 rounded-t-2xl sm:rounded-t-3xl">
            {/* Window Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#EF4444]/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#F59E0B]/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#10B981]/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]" />
            </div>

            {/* Book & Unit Identification */}
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7]">
              <div className="w-5 h-5 rounded-md bg-[#2A4FB8]/10 dark:bg-[#8FA8F7]/20 flex items-center justify-center text-[#2A4FB8] dark:text-[#8FA8F7]">
                <BookOpen className="w-3 h-3" />
              </div>
              <span className="tracking-tight">English B1 • 5-Sinf Student's Book</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#1D3A8F] dark:text-[#B3C4FA] text-[10px] font-semibold border border-[#C9D6F5]/50 dark:border-[#34478C]/40">
                Unit 4
              </span>
            </div>

            {/* SmartBoard 4K Live Sync Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEF8FD] dark:bg-[#0369A1]/20 border border-[#BAD2FF] dark:border-[#0369A1]/40 text-[10px] sm:text-[11px] font-semibold text-[#0369A1] dark:text-[#38BDF8]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14A294] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#14A294]" />
              </span>
              <Monitor className="w-3 h-3 hidden sm:inline-block" />
              <span className="font-bold">SmartBoard 4K</span>
            </div>
          </div>

          {/* Textbook Main Reading & Lesson Body */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Unit Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-[#E6E9F2] dark:border-[#262C42]">
              <div>
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#2A4FB8] dark:text-[#8FA8F7]">
                  Lesson 2 • Natural World & Technology
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#1B2238] dark:text-[#E9ECF7] tracking-tight flex items-center gap-2">
                  <span>Protecting Our Environment</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E3F5EE] dark:bg-[#12332B] text-[#0F6E56] dark:text-[#5FD1AC]">
                    CEFR B1
                  </span>
                </h3>
              </div>

              {/* Quick Lesson Hotspots Available in Page */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#1D3A8F] dark:text-[#B3C4FA] border border-[#C9D6F5]/60 dark:border-[#34478C]/40">
                  <Headphones className="w-2.5 h-2.5" /> Audio
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3E8FF] dark:bg-[#6D3FD1]/25 text-[#6D3FD1] dark:text-[#C084FC] border border-[#E9D5FF]/60 dark:border-white/10">
                  <Video className="w-2.5 h-2.5" /> Video
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E3F5EE] dark:bg-[#12332B] text-[#0F6E56] dark:text-[#5FD1AC] border border-[#0F6E56]/30">
                  <Sparkles className="w-2.5 h-2.5" /> Hotspots
                </span>
              </div>
            </div>

            {/* Reading Content Snippet with Interactive Hotspots & Marker Highlight */}
            <div className="relative p-3.5 sm:p-4 rounded-2xl bg-[#EEF1F8]/90 dark:bg-[#10152A]/80 border border-[#E6E9F2]/70 dark:border-[#262C42]/60 text-xs sm:text-[13px] leading-relaxed text-[#1B2238] dark:text-[#E9ECF7]">
              {/* Interactive Audio Hotspot Badge Floating in Margin */}
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#14A294] text-white text-[10px] font-bold shadow-md shadow-[#14A294]/30 mr-2 -translate-y-0.5 cursor-pointer hover:scale-105 transition-transform">
                <Headphones className="w-2.5 h-2.5" />
                <span>Track 18</span>
              </div>

              <span>
                Forests cover 31% of the Earth's total land area.{' '}
                {/* Live Marker Highlighter Annotation */}
                <span
                  className="rounded px-1.5 py-0.5 font-semibold text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-300"
                  style={{
                    backgroundColor: `${activeMarkerColor}66`,
                    boxShadow: `0 0 10px ${activeMarkerColor}44`,
                  }}
                >
                  They produce oxygen and absorb carbon dioxide
                </span>{' '}
                every single day. Modern <strong className="text-[#0369A1] dark:text-[#38BDF8]">education</strong> and green{' '}
                <strong className="text-[#2A4FB8] dark:text-[#8FA8F7]">technology</strong> empower students to build sustainable
                habits and preserve our planet's living ecosystems for future generations.
              </span>

              {/* Inline Hotspots & Action Bar on Page */}
              <div className="mt-3 flex items-center justify-between text-[11px] pt-2.5 border-t border-[#E6E9F2]/50 dark:border-[#262C42]/50">
                <div className="flex items-center gap-2">
                  <span className="text-[#7A8299] dark:text-[#8B93AD] font-medium flex items-center gap-1">
                    <FileText className="w-3 h-3 text-[#2A4FB8] dark:text-[#8FA8F7]" />
                    <span>Exercise 3 • Reading Comprehension</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#6D3FD1]/10 text-[#6D3FD1] dark:text-[#C084FC] hover:bg-[#6D3FD1]/20 font-bold transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-2.5 h-2.5" />
                    <span>Javoblar kaliti</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grammar Exercise Spotlight (Present Simple) */}
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-[#F5F3FF]/90 to-[#EEF2FF]/80 dark:from-[#2E1A47]/40 dark:to-[#1E293B]/40 border border-[#DDD6FE]/70 dark:border-[#6D3FD1]/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-[#6D3FD1] text-white flex items-center justify-center font-black text-[10px]">
                    G
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-[13px] font-black text-[#1E1B4B] dark:text-[#EDE9FE] tracking-tight">
                      Grammar Spotlight: Present Simple
                    </h4>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 dark:bg-white/10 text-[#6D3FD1] dark:text-[#C084FC] border border-[#DDD6FE] dark:border-white/10">
                  Subject + Verb (s/es)
                </span>
              </div>

              {/* Grammar Interactive Fill-in / Choice */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-semibold text-[#1B2238] dark:text-[#E9ECF7] bg-white/80 dark:bg-[#10152A]/80 p-2.5 rounded-xl border border-[#E6E9F2]/60 dark:border-[#262C42]/60">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[#7A8299] dark:text-[#8B93AD]">Qoida:</span>
                  <span>"Healthy trees</span>
                  {/* Option 1: absorb */}
                  <button
                    type="button"
                    onClick={() => setSelectedGrammar('absorb')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedGrammar === 'absorb'
                        ? 'bg-[#2A4FB8] text-white shadow-sm shadow-[#2A4FB8]/30 scale-105'
                        : 'bg-[#EEF1F8] dark:bg-[#171C2E] text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#E4E9F7]'
                    }`}
                  >
                    absorb
                  </button>
                  {/* Option 2: absorbs */}
                  <button
                    type="button"
                    onClick={() => setSelectedGrammar('absorbs')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedGrammar === 'absorbs'
                        ? 'bg-[#2A4FB8] text-white shadow-sm shadow-[#2A4FB8]/30 scale-105'
                        : 'bg-[#EEF1F8] dark:bg-[#171C2E] text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#E4E9F7]'
                    }`}
                  >
                    absorbs
                  </button>
                  <span>carbon dioxide."</span>
                </div>

                {/* Instant Educational Feedback Pill */}
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#0F6E56] dark:text-[#5FD1AC] shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selectedGrammar === 'absorb' ? "Töğri (Fakt)" : "Köplik: absorb"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* B. LAYERED FLOATING SATELLITE 1: Interactive Vocabulary Card  */}
        {/* ============================================================ */}
        <div
          className="absolute -top-6 sm:-top-7 -left-3 sm:-left-6 lg:-left-9 z-30 w-[240px] sm:w-[270px] animate-float-card"
        >
          <div
            className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 backdrop-blur-2xl border border-[#E6E9F2]/80 dark:border-[#262C42]/80 shadow-[0_18px_36px_-6px_rgba(42,79,184,0.22),0_8px_16px_-4px_rgba(15,23,42,0.1)] transition-transform hover:scale-[1.02]"
          >
            {/* Header with pronunciation audio icon */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E6E9F2] dark:border-[#262C42]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#2A4FB8] to-[#14A294] text-white flex items-center justify-center shadow-sm">
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#1B2238] dark:text-[#E9ECF7] tracking-tight">
                    New Vocabulary
                  </h4>
                  <p className="text-[10px] text-[#7A8299] dark:text-[#8B93AD]">Ingliz tili luğati</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#1D3A8F] dark:text-[#B3C4FA]">
                3 ta söz
              </span>
            </div>

            {/* Word List with Uzbek Translations */}
            <div className="space-y-1.5">
              {VOCAB_LIST.map((item) => {
                const isActive = activeVocabId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveVocabId(item.id)}
                    className={`p-2 rounded-xl text-left cursor-pointer transition-all duration-200 border ${
                      isActive
                        ? 'bg-[#EEF8FD] dark:bg-[#0369A1]/20 border-[#BAD2FF] dark:border-[#0369A1]/50 shadow-sm'
                        : 'bg-transparent hover:bg-[#EEF1F8] dark:hover:bg-[#10152A] border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                        {item.word}
                      </span>
                      <span className="text-[10px] font-mono text-[#7A8299] dark:text-[#8B93AD]">
                        {item.phonetic}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 text-[11px]">
                      <span className="font-semibold text-[#14A294] dark:text-[#2DD4BF]">
                        → {item.translation}
                      </span>
                      <span className="text-[9px] text-[#7A8299] dark:text-[#8B93AD] italic">
                        {item.partOfSpeech}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* C. LAYERED FLOATING SATELLITE 2: Teacher Video Preview Card   */}
        {/* ============================================================ */}
        <div
          className="absolute -top-5 sm:-top-7 -right-2 sm:-right-5 lg:-right-8 z-30 w-[185px] sm:w-[215px] animate-float-card"
          style={{ animationDelay: '1.8s' }}
        >
          <div
            className="rounded-2xl sm:rounded-3xl bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 backdrop-blur-2xl border border-[#E6E9F2]/80 dark:border-[#262C42]/80 p-2 sm:p-2.5 shadow-[0_18px_36px_-6px_rgba(109,63,209,0.22),0_8px_16px_-4px_rgba(15,23,42,0.1)] transition-transform hover:scale-[1.02]"
          >
            {/* Video Thumbnail with English Teacher Illustration */}
            <div className="relative h-24 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-[#1E293B] via-[#2A4FB8] to-[#6D3FD1] flex items-center justify-center group cursor-pointer">
              {/* Teacher Avatar Silhouette & Classroom Smartboard Artwork */}
              <div className="absolute inset-0 opacity-85 mix-blend-overlay">
                <svg viewBox="0 0 200 120" className="w-full h-full" fill="none">
                  {/* Smartboard grid in background */}
                  <rect x="25" y="15" width="150" height="75" rx="6" stroke="#BAD2FF" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="40" y1="35" x2="110" y2="35" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" />
                  <line x1="40" y1="48" x2="90" y2="48" stroke="#38BDF8" strokeWidth="1.5" opacity="0.8" />
                  {/* Teacher Stylized Avatar */}
                  <circle cx="150" cy="55" r="18" fill="#FDE047" opacity="0.9" />
                  <path d="M 125 105 C 125 80, 175 80, 175 105 Z" fill="#FFFFFF" opacity="0.85" />
                </svg>
              </div>

              {/* Live Badge */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-red-600/90 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Video Dars</span>
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white text-[9px] font-mono font-bold">
                08:24
              </div>

              {/* 3D Glass Play Icon Tile */}
              <div className="relative z-10 w-9 h-9 rounded-xl bg-white/90 dark:bg-white/20 backdrop-blur-md flex items-center justify-center text-[#2A4FB8] dark:text-white shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
            </div>

            {/* Teacher Details & Topic */}
            <div className="pt-2 px-1 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#1B2238] dark:text-[#E9ECF7] tracking-tight">
                  Ms. Clara Wilson
                </span>
                <span className="text-[9px] font-bold text-[#14A294]">Native ESL</span>
              </div>
              <p className="text-[10px] text-[#7A8299] dark:text-[#8B93AD] truncate mt-0.5">
                Present Simple in Practice
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* D. LAYERED FLOATING SATELLITE 3: Modern Listening Audio Pill  */}
        {/* ============================================================ */}
        <div
          className="absolute -bottom-6 sm:-bottom-7 left-3 sm:left-6 lg:left-8 z-30 max-w-[calc(100%-24px)] sm:max-w-none animate-float-card"
          style={{ animationDelay: '0.9s' }}
        >
          <div
            className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl sm:rounded-full bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 backdrop-blur-2xl border border-[#E6E9F2]/80 dark:border-[#262C42]/80 shadow-[0_18px_36px_-6px_rgba(20,162,148,0.22),0_8px_16px_-4px_rgba(15,23,42,0.1)] transition-transform hover:scale-[1.01]"
          >
            {/* Play / Pause Toggle Button */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-[#2A4FB8] to-[#14A294] hover:opacity-95 text-white flex items-center justify-center shadow-md shadow-[#2A4FB8]/30 transition-transform active:scale-95 cursor-pointer shrink-0"
              title={isPlaying ? "Töxtatiş" : "Eşitiş"}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-white" />
              ) : (
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-white ml-0.5" />
              )}
            </button>

            {/* Track Info & Animated Waveform */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7] tracking-tight">
                  Track 18: Listening Audio Lesson
                </span>
                <span className="text-[10px] font-mono font-semibold text-[#7A8299] dark:text-[#8B93AD]">
                  01:42 / 03:15
                </span>
              </div>

              {/* Dynamic Sound Wave Bars with CSS Animation */}
              <div className="flex items-center gap-0.5 sm:gap-1 h-3 mt-1">
                {[14, 22, 16, 28, 14, 24, 30, 18, 26, 12, 18, 24, 16].map((baseHeight, idx) => (
                  <span
                    key={idx}
                    className={`w-1 rounded-full bg-gradient-to-t from-[#2A4FB8] to-[#14A294] ${
                      isPlaying ? 'animate-eq-pulse' : ''
                    }`}
                    style={{
                      height: `${baseHeight}px`,
                      animationDelay: `${idx * 0.12}s`,
                      opacity: isPlaying ? 0.9 : 0.35,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Interactive Transcript Button */}
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-[#E6E9F2] dark:border-[#262C42]">
              <button
                type="button"
                className="px-2.5 py-1 rounded-full bg-[#E8EDFB] dark:bg-[#1E2A55] hover:bg-[#DCE8FF] text-[#1D3A8F] dark:text-[#B3C4FA] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <FileText className="w-2.5 h-2.5" />
                <span>Transcript</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* E. LAYERED FLOATING SATELLITE 4: Interactive Marker Bar       */}
        {/* ============================================================ */}
        <div
          className="absolute -bottom-4 sm:-bottom-5 right-2 sm:right-6 lg:right-8 z-30 animate-float-card"
          style={{ animationDelay: '2.5s' }}
        >
          <div
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-2xl bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 backdrop-blur-2xl border border-[#E6E9F2]/80 dark:border-[#262C42]/80 shadow-[0_16px_32px_-6px_rgba(15,23,42,0.18)]"
          >
            {/* Active Tool Label */}
            <div className="flex items-center gap-1 text-[10px] font-black text-[#2A4FB8] dark:text-[#8FA8F7] pr-1.5 border-r border-[#E6E9F2] dark:border-[#262C42]">
              <Highlighter className="w-3.5 h-3.5 text-[#EAB308]" />
              <span className="hidden sm:inline">Marker</span>
            </div>

            {/* Color Swatches */}
            <div className="flex items-center gap-1">
              {MARKER_PALETTE.map((item) => {
                const isSelected = activeMarkerColor === item.color;
                return (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => setActiveMarkerColor(item.color)}
                    className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full transition-transform cursor-pointer ${
                      isSelected ? 'scale-125 ring-2 ring-[#2A4FB8] dark:ring-white ring-offset-1' : 'hover:scale-110 opacity-70'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.label}
                  />
                );
              })}
            </div>

            {/* Eraser Tool */}
            <button
              type="button"
              className="p-1 rounded-lg text-[#7A8299] hover:text-[#1B2238] dark:hover:text-[#E9ECF7] transition-colors cursor-pointer"
              title="Öçirğiç (Eraser)"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
