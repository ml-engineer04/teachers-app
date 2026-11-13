import React, { useState } from 'react';
import {
  Volume2,
  Play,
  Pause,
  CheckCircle2,
  PenTool,
  KeyRound,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export const SmartBoardPreview: React.FC = () => {
  const { t } = useI18n();
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showAnswerTip, setShowAnswerTip] = useState(true);
  const [markerHighlight, setMarkerHighlight] = useState(true);

  return (
    <div className="relative w-full max-w-xl mx-auto lg:mx-0">
      {/* Decorative Ambient Glow */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 via-emerald-400/15 to-amber-400/20 rounded-[2.5rem] blur-2xl opacity-75 pointer-events-none" />

      {/* SmartBoard Bezel Frame */}
      <div className="relative rounded-3xl bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-elevated overflow-hidden transition-all">
        {/* Reader Top Chrome Bar */}
        <div className="px-4 py-3 bg-slate-50/90 dark:bg-[#1A243E]/90 border-b border-slate-200/80 dark:border-[#23304E] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {t('landing.previewBookTitle')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
              {t('landing.previewPageTag')}
            </span>
          </div>
        </div>

        {/* Simulated Digital Textbook Canvas */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-[#F8FAFF] to-[#EEF2FA] dark:from-[#0E1526] dark:to-[#111A30] relative space-y-4">
          {/* Interactive Page Header */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/70 dark:border-emerald-800/50">
              <Sparkles className="w-3 h-3" />
              {t('landing.previewLiveBadge')}
            </span>

            {/* Mini Toolbar Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMarkerHighlight((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border ${
                  markerHighlight
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/70'
                    : 'bg-white dark:bg-[#1A243E] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <PenTool className="w-3 h-3" />
                <span>Marker</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAnswerTip((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border ${
                  showAnswerTip
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-[#1A243E] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <KeyRound className="w-3 h-3" />
                <span>Keys</span>
              </button>
            </div>
          </div>

          {/* Mock Textbook Lesson Card */}
          <div className="rounded-2xl bg-white dark:bg-[#17213B] border border-slate-200 dark:border-[#29385C] p-4 sm:p-5 shadow-soft space-y-4 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Unit 3 • Daily Routines
                </p>
                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  Exercise 4. Listen and complete the dialogue
                </h4>
              </div>
              {/* Audio Hotspot Pill */}
              <button
                type="button"
                onClick={() => setAudioPlaying((prev) => !prev)}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                  audioPlaying
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                    : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900'
                }`}
              >
                {audioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{audioPlaying ? '00:42' : 'Audio'}</span>
              </button>
            </div>

            {/* Simulated Lesson Lines with Interactive Marker Highlight */}
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                1. Every morning I{' '}
                <span
                  className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                    markerHighlight
                      ? 'bg-amber-200/80 dark:bg-amber-500/30 text-slate-900 dark:text-amber-100 underline decoration-amber-500 decoration-2'
                      : 'underline decoration-indigo-400'
                  }`}
                >
                  wake up
                </span>{' '}
                at 7:00 AM and get ready for school.
              </p>
              <p>
                2. My favorite lesson starts at half past{' '}
                <span
                  className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                    markerHighlight
                      ? 'bg-emerald-200/75 dark:bg-emerald-500/25 text-slate-900 dark:text-emerald-100'
                      : 'underline decoration-indigo-400'
                  }`}
                >
                  eight
                </span>{' '}
                in Room 12.
              </p>
            </div>

            {/* Interactive Media & Answer Hotspots Row */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAudioPlaying((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/70 dark:border-indigo-800/60"
              >
                {audioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{t('landing.previewAudioHotspot')}</span>
              </button>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200/70 dark:border-rose-800/60">
                <Play className="w-3.5 h-3.5" />
                <span>{t('landing.previewVideoHotspot')}</span>
              </span>
            </div>

            {/* Collapsible Live Answer Key Popover */}
            {showAnswerTip && (
              <div className="mt-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                      {t('landing.previewAnswerKey')}
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 truncate">
                      1) wake up • 2) eight • 3) breakfast • 4) library
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
