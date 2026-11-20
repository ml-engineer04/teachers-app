import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  X,
  FileText,
  HelpCircle,
  Headphones,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  BookOpen,
  Volume2,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export interface AnswerItem {
  id?: string;
  studentExerciseLabel: string;
  studentPageNumber: number;
  solutionKey?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  answerImages?: string[];
  transcriptText?: string | null;
  transcriptImages?: string[];
  targetMediaId?: string | null;
  targetMediaTitle?: string | null;
  targetMediaUrl?: string | null;
  targetTeacherBookId?: string | null;
  targetTeacherPageNumber?: number | null;
}

interface AnswerKeyDrawerProps {
  isOpen: boolean;
  currentPage: number;
  bookTitle?: string;
  answers: AnswerItem[];
  selectedHotspotId?: string | null;
  onClose: () => void;
  onSwitchToPage?: (page: number) => void;
}

const parseSolutionPills = (text?: string | null): Array<{ num: string; ans: string }> => {
  if (!text) return [];
  const raw = text.trim();
  if (!raw) return [];
  const tokens: Array<{ num: string; ans: string }> = [];
  const parts = raw.split(/[\n,;|]+/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*[.):\-–]\s*(.+)$/);
    if (m && m[2].length <= 36) {
      tokens.push({ num: m[1], ans: m[2].trim() });
    }
  }
  return tokens.length >= 1 ? tokens : [];
};

export const AnswerKeyDrawer: React.FC<AnswerKeyDrawerProps> = ({
  isOpen,
  currentPage,
  bookTitle,
  answers,
  selectedHotspotId,
  onClose,
  onSwitchToPage,
}) => {
  const { t } = useI18n();

  // Active Tab: Answers vs Listening Transcript
  const [activeTab, setActiveTab] = useState<'ANSWERS' | 'TRANSCRIPT'>('ANSWERS');

  // Multi-exercise selector
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number>(() => {
    if (selectedHotspotId && answers.length > 0) {
      const idx = answers.findIndex((a) => a.id === selectedHotspotId);
      if (idx !== -1) return idx;
    }
    return 0;
  });

  // Keep selected index strictly in sync whenever selectedHotspotId or answers changes
  useEffect(() => {
    if (selectedHotspotId && answers.length > 0) {
      const idx = answers.findIndex((a) => a.id === selectedHotspotId);
      if (idx !== -1) {
        setSelectedExerciseIndex(idx);
        return;
      }
    }
    setSelectedExerciseIndex((prev) => (prev < answers.length ? prev : 0));
  }, [selectedHotspotId, answers, isOpen]);

  // Transcript font size scaler (A- / A / A+)
  const [transcriptFontSize, setTranscriptFontSize] = useState<number>(16);

  // Fullscreen Ultra-Zoom Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);

  // Active answer item
  const currentItem = useMemo(() => {
    if (answers.length === 0) return null;
    return answers[selectedExerciseIndex] || answers[0];
  }, [answers, selectedExerciseIndex]);

  // Parsed pills
  const parsedPills = useMemo(() => {
    return parseSolutionPills(currentItem?.solutionKey);
  }, [currentItem?.solutionKey]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-white dark:bg-[#121A2D] border-l border-slate-200 dark:border-[#23304E] h-full shadow-2xl flex flex-col justify-between z-10 overflow-hidden">
          {/* Header */}
          <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {currentItem?.studentExerciseLabel || t('reader.answerKeysTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentPage}-bet • Listening & Javoblar
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exercise Switcher (if multiple answers exist on this page) */}
            {answers.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {answers.map((item, idx) => {
                  const isSelected = idx === selectedExerciseIndex;
                  return (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => setSelectedExerciseIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{item.studentExerciseLabel || `Mashq #${idx + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Segmented Dual Tabs: [ 🔑 Javoblar Kaliti ] and [ 📜 Audio Transkript ] */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('ANSWERS')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'ANSWERS'
                    ? 'bg-white dark:bg-[#1E293B] text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Javoblar Kaliti</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TRANSCRIPT')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'TRANSCRIPT'
                    ? 'bg-white dark:bg-[#1E293B] text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Audio Transkript</span>
                {(currentItem?.transcriptText || (currentItem?.transcriptImages && currentItem.transcriptImages.length > 0)) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                )}
              </button>
            </div>
          </div>

          {/* Main Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 pr-3 custom-scrollbar">
            {!currentItem ? (
              <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
                <HelpCircle className="w-10 h-10 mx-auto opacity-40 text-amber-500" />
                <p className="font-extrabold text-slate-700 dark:text-slate-300">
                  Ushbu sahifa uchun javoblar kiritilmagan
                </p>
                <p className="text-[11px] text-slate-400">
                  Visual Hotspot Editor orqali sahifaga javoblar yoki transkript biriktiring.
                </p>
              </div>
            ) : (
              <>
                {/* ========================================================= */}
                {/* TAB 1: ANSWERS                                             */}
                {/* ========================================================= */}
                {activeTab === 'ANSWERS' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Smart Pills Badges */}
                    {parsedPills.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                          To‘g‘ri Javoblar (Katakchalar):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {parsedPills.map((pill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E293B] text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-black text-sm shadow-xs"
                            >
                              <span className="text-emerald-500 font-semibold">{pill.num}.</span>
                              <span>{pill.ans}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Free-form Solution Text */}
                    {currentItem.solutionKey && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Yechim & Tushuntirish:
                        </span>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                          {currentItem.solutionKey}
                        </p>
                      </div>
                    )}

                    {/* Answer Images Gallery */}
                    {(() => {
                      const list = currentItem.answerImages || (currentItem.imageUrl ? [currentItem.imageUrl] : []);
                      if (list.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                            Javob Skrinshotlari ({list.length} ta):
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            {list.map((url, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setLightboxImage(url);
                                  setLightboxZoom(1);
                                }}
                                className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-slate-950 cursor-pointer shadow-sm"
                              >
                                <img
                                  src={url}
                                  alt={`Javob #${idx + 1}`}
                                  className="w-full h-full object-contain group-hover:scale-105 transition duration-200"
                                />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-white">
                                  <ZoomIn className="w-5 h-5" />
                                  <span className="text-xs font-bold">Kattalashtirish</span>
                                </div>
                                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-black/70 text-white text-[10px] font-black">
                                  #{idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Methodology Tips */}
                    {currentItem.notes && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
                        <span className="font-black uppercase tracking-wider text-[10px] block text-amber-800 dark:text-amber-400">
                          Metodik Izoh:
                        </span>
                        <p className="italic">{currentItem.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: TRANSCRIPT                                          */}
                {/* ========================================================= */}
                {activeTab === 'TRANSCRIPT' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Font Size Scaler Bar */}
                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800">
                      <span className="text-xs font-black text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-sky-600" />
                        Listening Transkript Matni
                      </span>

                      <div className="flex items-center gap-1 bg-white dark:bg-[#1E293B] px-2 py-0.5 rounded-xl border border-sky-200 dark:border-sky-700 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setTranscriptFontSize((s) => Math.max(13, s - 2))}
                          className="px-1.5 py-0.5 text-xs font-black text-slate-600 dark:text-slate-300 hover:text-sky-600"
                          title="Shriftni kichiklashtirish"
                        >
                          A-
                        </button>
                        <span className="text-[11px] font-black text-sky-600 dark:text-sky-400 min-w-8 text-center">
                          {transcriptFontSize}px
                        </span>
                        <button
                          type="button"
                          onClick={() => setTranscriptFontSize((s) => Math.min(28, s + 2))}
                          className="px-1.5 py-0.5 text-xs font-black text-slate-600 dark:text-slate-300 hover:text-sky-600"
                          title="Shriftni kattalashtirish"
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    {/* Dialogue Text with Dynamic Font Size */}
                    {currentItem.transcriptText ? (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C]">
                        <p
                          style={{ fontSize: `${transcriptFontSize}px` }}
                          className="font-medium text-slate-900 dark:text-slate-100 whitespace-pre-line leading-relaxed"
                        >
                          {currentItem.transcriptText}
                        </p>
                      </div>
                    ) : (
                      !currentItem.transcriptImages?.length && (
                        <div className="p-8 text-center text-xs text-slate-400 italic">
                          Ushbu mashq uchun dialog transkripti kiritilmagan.
                        </div>
                      )
                    )}

                    {/* Transcript Images Gallery */}
                    {(() => {
                      const list = currentItem.transcriptImages || [];
                      if (list.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                            Transkript Skrinshotlari ({list.length} ta):
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            {list.map((url, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setLightboxImage(url);
                                  setLightboxZoom(1);
                                }}
                                className="group relative rounded-2xl overflow-hidden border border-sky-200 dark:border-sky-800 aspect-video bg-slate-950 cursor-pointer shadow-sm"
                              >
                                <img
                                  src={url}
                                  alt={`Transkript #${idx + 1}`}
                                  className="w-full h-full object-contain group-hover:scale-105 transition duration-200"
                                />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-white">
                                  <ZoomIn className="w-5 h-5" />
                                  <span className="text-xs font-bold">Kattalashtirish</span>
                                </div>
                                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-black/70 text-white text-[10px] font-black">
                                  #{idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Bar: Mini Audio Player & Teacher Book Jump */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#121A2D] space-y-2.5">
            {/* Embedded Audio Player */}
            {currentItem?.targetMediaUrl && (
              <div className="p-2.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">
                      {currentItem.targetMediaTitle || 'Listening Track'}
                    </p>
                    <p className="text-[10px] text-slate-400">Audio Mashq</p>
                  </div>
                </div>
                <audio controls src={currentItem.targetMediaUrl} className="h-8 w-44 max-w-[55%]" />
              </div>
            )}

            {/* Jump to Teacher's Book Page Button */}
            {currentItem?.targetTeacherPageNumber && onSwitchToPage && (
              <button
                type="button"
                onClick={() => {
                  if (currentItem.targetTeacherPageNumber) {
                    onSwitchToPage(currentItem.targetTeacherPageNumber);
                    onClose();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center gap-2 transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>Teacher’s Book #{currentItem.targetTeacherPageNumber}-betga o‘tish</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* ULTRA-ZOOM LIGHTBOX MODAL (400% Zoom & Pan for small text images) */}
      {/* ================================================================= */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-in fade-in duration-200 select-none"
          onClick={() => setLightboxImage(null)}
        >
          {/* Top Controls Bar */}
          <div
            className="w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-2.5 flex items-center justify-between text-white shadow-2xl z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Ultra-Zoom:
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200">
                {Math.round(lightboxZoom * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLightboxZoom((s) => Math.max(0.5, s - 0.5))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                title="Kichiklashtirish (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom(1)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-black text-slate-300 transition"
                title="100% asl o'lcham"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom((s) => Math.min(4, s + 0.5))}
                className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition font-black"
                title="Kattalashtirish (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition"
                title="Yopish (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Zoomable Image Area */}
          <div
            className="flex-1 w-full flex items-center justify-center overflow-auto p-4 my-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Kattalashtirilgan rasm"
              style={{
                transform: `scale(${lightboxZoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
                maxWidth: '90vw',
                maxHeight: '80vh',
              }}
              className="object-contain rounded-2xl shadow-2xl cursor-grab active:cursor-grabbing"
              onDoubleClick={() => setLightboxZoom((s) => (s >= 2 ? 1 : 2.5))}
            />
          </div>

          <p className="text-[11px] font-semibold text-slate-400 text-center pb-1">
            💡 Maslahat: Sichqonchani ikki marta tez bosish (Double-click) orqali darhol 2.5x kattalashtirish mumkin.
          </p>
        </div>
      )}
    </>
  );
};
