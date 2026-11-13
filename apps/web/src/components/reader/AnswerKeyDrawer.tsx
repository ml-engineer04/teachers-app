import React from 'react';
import { KeyRound, X, CheckCircle2, Image as ImageIcon, HelpCircle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export interface AnswerItem {
  id?: string;
  studentExerciseLabel: string;
  studentPageNumber: number;
  solutionKey?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
}

interface AnswerKeyDrawerProps {
  isOpen: boolean;
  currentPage: number;
  bookTitle?: string;
  answers: AnswerItem[];
  onClose: () => void;
}

export const AnswerKeyDrawer: React.FC<AnswerKeyDrawerProps> = ({
  isOpen,
  currentPage,
  bookTitle,
  answers,
  onClose,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#121A2D] border-l border-slate-200 dark:border-[#23304E] h-full shadow-2xl p-6 flex flex-col justify-between z-10 overflow-hidden">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('reader.answerKeysTitle')}
                </h3>
                <p className="text-xs text-slate-400">
                  {currentPage}-bet uchun tekshiruv javoblari
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Answers List */}
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {answers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span>Ushbu sahifa uchun alohida javoblar kiritilmagan</span>
              </div>
            ) : (
              answers.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="rounded-2xl p-4 bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 uppercase">
                      {item.studentExerciseLabel || `Mashq #${idx + 1}`}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Kalit
                    </span>
                  </div>

                  {item.solutionKey && (
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                      {item.solutionKey}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      Metodik izoh: {item.notes}
                    </p>
                  )}

                  {item.imageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={item.imageUrl} alt="Javob tasviri" className="w-full object-contain" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
