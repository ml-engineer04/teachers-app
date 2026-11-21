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
      <div className="absolute -inset-4 bg-gradient-to-tr from-[#2A4FB8]/20 via-[#0E7C70]/15 to-[#F5B82E]/20 rounded-[2.5rem] blur-2xl opacity-75 pointer-events-none" />

      {/* SmartBoard Bezel Frame */}
      <div className="relative rounded-3xl bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] shadow-elevated overflow-hidden transition-all">
        {/* Reader Top Chrome Bar */}
        <div className="px-4 py-3 bg-[#ECEEEA]/90 dark:bg-[#272C36]/90 border-b border-[#D9DCD5] dark:border-[#353B47] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#2A4FB8] text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-[#1F2933] dark:text-[#E6E8EC] truncate">
              {t('landing.previewBookTitle')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EEF4FF] dark:bg-[#142452] text-[#2A4FB8] dark:text-[#5B93FA] border border-[#BAD2FF] dark:border-[#223F94]">
              {t('landing.previewPageTag')}
            </span>
          </div>
        </div>

        {/* Simulated Digital Textbook Canvas */}
        <div className="p-5 sm:p-6 bg-[#F4F5F2] dark:bg-[#15181E] relative space-y-4">
          {/* Interactive Page Header */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EDF9F1] dark:bg-[#166534]/50 text-[#15803D] dark:text-[#4ADE80] text-[11px] font-bold border border-[#22A45A]/30">
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
                    ? 'bg-[#FFFBEB] dark:bg-[#B45309]/30 text-[#B45309] dark:text-[#FBBF24] border-[#F5B82E]'
                    : 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#5B6672] dark:text-[#9AA3B0] border-[#D9DCD5] dark:border-[#353B47]'
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
                    ? 'bg-[#6D3FD1] text-white border-[#6D3FD1] shadow-sm'
                    : 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#5B6672] dark:text-[#9AA3B0] border-[#D9DCD5] dark:border-[#353B47]'
                }`}
              >
                <KeyRound className="w-3 h-3" />
                <span>Keys</span>
              </button>
            </div>
          </div>

          {/* Mock Textbook Lesson Card */}
          <div className="rounded-2xl bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] p-4 sm:p-5 shadow-soft space-y-4 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#2A4FB8] dark:text-[#5B93FA]">
                  Unit 3 • Daily Routines
                </p>
                <h4 className="text-base sm:text-lg font-extrabold text-[#1F2933] dark:text-[#E6E8EC] mt-0.5">
                  Exercise 4. Listen and complete the dialogue
                </h4>
              </div>
              {/* Audio Hotspot Pill */}
              <button
                type="button"
                onClick={() => setAudioPlaying((prev) => !prev)}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                  audioPlaying
                    ? 'bg-[#0E7C70] text-white ring-4 ring-[#0E7C70]/20'
                    : 'bg-[#E6F6F4] dark:bg-[#0B6259]/50 text-[#0E7C70] dark:text-[#5ED3C4]'
                }`}
              >
                {audioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{audioPlaying ? '00:42' : 'Audio'}</span>
              </button>
            </div>

            {/* Simulated Lesson Lines with Interactive Marker Highlight */}
            <div className="space-y-2.5 text-xs sm:text-sm text-[#1F2933] dark:text-[#E6E8EC] leading-relaxed">
              <p>
                1. Every morning I{' '}
                <span
                  className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                    markerHighlight
                      ? 'bg-[#FACC15]/40 dark:bg-[#FACC15]/30 text-[#0F172A] dark:text-[#F1F5F9] underline decoration-[#F5B82E] decoration-2'
                      : 'underline decoration-[#2A4FB8]'
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
                      ? 'bg-[#EDF9F1] dark:bg-[#15803D]/30 text-[#15803D] dark:text-[#4ADE80]'
                      : 'underline decoration-[#2A4FB8]'
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E6F6F4] dark:bg-[#0B6259]/40 text-[#0E7C70] dark:text-[#5ED3C4] text-xs font-bold border border-[#C2EAE5] dark:border-[#0B6259]/60"
              >
                {audioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{t('landing.previewAudioHotspot')}</span>
              </button>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDF1F4] dark:bg-[#9E2D47]/40 text-[#C23B5A] dark:text-[#FF8FA6] text-xs font-bold border border-[#FBDCE4] dark:border-[#9E2D47]/60">
                <Play className="w-3.5 h-3.5" />
                <span>{t('landing.previewVideoHotspot')}</span>
              </span>
            </div>

            {/* Collapsible Live Answer Key Popover */}
            {showAnswerTip && (
              <div className="mt-3 rounded-xl bg-[#F4F0FD] dark:bg-[#5A30B0]/30 border border-[#E6DCFA] dark:border-[#6D3FD1]/60 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-[#6D3FD1] dark:text-[#B69CFF] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#6D3FD1] dark:text-[#B69CFF] truncate">
                      {t('landing.previewAnswerKey')}
                    </p>
                    <p className="text-[11px] text-[#5A30B0] dark:text-[#B69CFF]/90 truncate">
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
