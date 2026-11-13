import React from 'react';
import {
  PenTool,
  Highlighter,
  Eraser,
  RotateCcw,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import {
  DrawStrokeSize,
  DrawTool,
  HIGHLIGHTER_COLORS,
  PEN_COLORS,
} from './DrawingCanvasLayer';
import { useI18n } from '../../i18n/I18nContext';

interface MarkerStudioBarProps {
  activeTool: DrawTool;
  activeColor: string;
  strokeSize: DrawStrokeSize;
  onSelectTool: (tool: DrawTool) => void;
  onSelectColor: (color: string) => void;
  onSelectSize: (size: DrawStrokeSize) => void;
  onUndo: () => void;
  onClear: () => void;
  onClose: () => void;
}

export const MarkerStudioBar: React.FC<MarkerStudioBarProps> = ({
  activeTool,
  activeColor,
  strokeSize,
  onSelectTool,
  onSelectColor,
  onSelectSize,
  onUndo,
  onClear,
  onClose,
}) => {
  const { t } = useI18n();

  const colors = activeTool === 'HIGHLIGHTER' ? HIGHLIGHTER_COLORS : PEN_COLORS;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[94%] sm:w-auto bg-white/95 dark:bg-[#121A2D]/95 backdrop-blur-xl border border-slate-200 dark:border-[#23304E] rounded-3xl p-3 shadow-2xl flex flex-wrap items-center justify-between sm:justify-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
      {/* Tool Selector */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => onSelectTool('PEN')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTool === 'PEN'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
          title="Qalam"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Qalam</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('HIGHLIGHTER')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTool === 'HIGHLIGHTER'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
          title="Marker"
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Marker</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('ERASER')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTool === 'ERASER'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
          title="O‘chirg‘ich"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">O‘chirg‘ich</span>
        </button>
      </div>

      {/* Colors (only when pen or highlighter active) */}
      {activeTool !== 'ERASER' && (
        <div className="flex items-center gap-1.5 px-2">
          {colors.map((c) => {
            const isSelected = activeColor.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectColor(c.hex)}
                className={`w-6 h-6 rounded-full transition-all border ${
                  isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            );
          })}
        </div>
      )}

      {/* Stroke Size */}
      {activeTool !== 'ERASER' && (
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          {(['SM', 'MD', 'LG'] as DrawStrokeSize[]).map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => onSelectSize(sz)}
              className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all ${
                strokeSize === sz
                  ? 'bg-white dark:bg-[#121A2D] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      )}

      {/* Actions: Undo, Clear, Done */}
      <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-2">
        <button
          type="button"
          onClick={onUndo}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Bekor qilish (Undo)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClear}
          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title="Sahifani tozalash"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{t('common.done')}</span>
        </button>
      </div>
    </div>
  );
};
