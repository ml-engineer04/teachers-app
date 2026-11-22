import React, { useRef, useState, useCallback } from 'react';
import {
  PenTool,
  Highlighter,
  Eraser,
  RotateCcw,
  Trash2,
  X,
  GripVertical,
} from 'lucide-react';
import {
  DrawStrokeSize,
  DrawTool,
  HIGHLIGHTER_COLORS,
  PEN_COLORS,
} from './DrawingCanvasLayer';

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

const STROKE_SIZES: DrawStrokeSize[] = ['SM', 'MD', 'LG'];

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const colors = activeTool === 'HIGHLIGHTER' ? HIGHLIGHTER_COLORS : PEN_COLORS;

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      isDraggingRef.current = true;
      const rect = containerRef.current?.getBoundingClientRect();
      const currentX = rect ? rect.left : 80;
      const currentY = rect ? rect.top : 80;

      dragStartRef.current = {
        mouseX: clientX,
        mouseY: clientY,
        startX: currentX,
        startY: currentY,
      };

      const onMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;
        const curX =
          'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const curY =
          'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

        const deltaX = curX - dragStartRef.current.mouseX;
        const deltaY = curY - dragStartRef.current.mouseY;

        const elW = rect?.width || 320;
        const elH = rect?.height || 44;
        const maxX = window.innerWidth - elW - 8;
        const maxY = window.innerHeight - elH - 8;

        const nextX = Math.max(8, Math.min(maxX, dragStartRef.current.startX + deltaX));
        const nextY = Math.max(8, Math.min(maxY, dragStartRef.current.startY + deltaY));

        setPosition({ x: nextX, y: nextY });
      };

      const onEnd = () => {
        isDraggingRef.current = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    },
    [],
  );

  const cycleStrokeSize = () => {
    const curIdx = STROKE_SIZES.indexOf(strokeSize);
    const nextIdx = (curIdx + 1) % STROKE_SIZES.length;
    onSelectSize(STROKE_SIZES[nextIdx]);
  };

  return (
    <div
      ref={containerRef}
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px` }
          : undefined
      }
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        handleDragStart(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }}
      className={`fixed z-40 select-none max-w-[calc(100vw-16px)] rounded-full bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 backdrop-blur-xl border border-[#E6E9F2] dark:border-[#262C42] shadow-[0_15px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.6)] text-[#1B2238] dark:text-[#E6E8EC] px-2 sm:px-2.5 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 ${
        !position ? 'bottom-4 left-1/2 -translate-x-1/2' : ''
      } cursor-grab active:cursor-grabbing animate-in slide-in-from-bottom-2 duration-150`}
    >
      {/* Delicate Drag Handle */}
      <div className="text-[#7A8299]/50 hover:text-[#1B2238] dark:text-white/30 dark:hover:text-white/60 transition-colors hidden sm:flex items-center -mr-1">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Tool Selector: Pen, Highlighter, Eraser */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-full">
        <button
          type="button"
          onClick={() => onSelectTool('PEN')}
          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${
            activeTool === 'PEN'
              ? 'bg-[#2A4FB8] text-white shadow-xs'
              : 'text-[#7A8299] hover:text-[#1B2238] hover:bg-black/5 dark:text-[#8B93AD] dark:hover:text-white dark:hover:bg-white/10'
          }`}
          title="Qalam"
        >
          <PenTool className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('HIGHLIGHTER')}
          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${
            activeTool === 'HIGHLIGHTER'
              ? 'bg-[#F5B82E] text-[#10152A] shadow-xs'
              : 'text-[#7A8299] hover:text-[#1B2238] hover:bg-black/5 dark:text-[#8B93AD] dark:hover:text-white dark:hover:bg-white/10'
          }`}
          title="Marker (Highlighter)"
        >
          <Highlighter className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('ERASER')}
          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${
            activeTool === 'ERASER'
              ? 'bg-[#B91C1C] text-white shadow-xs'
              : 'text-[#7A8299] hover:text-[#1B2238] hover:bg-black/5 dark:text-[#8B93AD] dark:hover:text-white dark:hover:bg-white/10'
          }`}
          title="Öçirğiç"
        >
          <Eraser className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>

      {/* Colors (when tool !== 'ERASER') */}
      {activeTool !== 'ERASER' && (
        <>
          <div className="w-px h-3 bg-[#E6E9F2] dark:bg-[#262C42]" />
          <div className="flex items-center gap-1 sm:gap-1.5 px-0.5">
            {colors.slice(0, 4).map((c) => {
              const isSelected = activeColor.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectColor(c.hex)}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-transform border border-black/20 ${
                    isSelected
                      ? 'ring-2 ring-[#2A4FB8] dark:ring-white ring-offset-1 ring-offset-[#FFFFFF] dark:ring-offset-[#171C2E] scale-110'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Stroke Size Cycle Pill (when tool !== 'ERASER') */}
      {activeTool !== 'ERASER' && (
        <>
          <div className="w-px h-3 bg-[#E6E9F2] dark:bg-[#262C42]" />
          <button
            type="button"
            onClick={cycleStrokeSize}
            className="px-1.5 py-0.5 rounded-full bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] text-[9px] sm:text-[10px] font-mono font-bold transition shrink-0 active:scale-95"
            title="Çiziq qalinligini özgartiriş"
          >
            {strokeSize}
          </button>
        </>
      )}

      {/* Actions: Undo & Clear */}
      <div className="w-px h-3 bg-[#E6E9F2] dark:bg-[#262C42]" />
      <button
        type="button"
        onClick={onUndo}
        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[#7A8299] hover:text-[#1B2238] hover:bg-black/5 dark:text-[#8B93AD] dark:hover:text-white dark:hover:bg-white/10 transition"
        title="Bekor qiliş (Undo)"
      >
        <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      </button>

      <button
        type="button"
        onClick={onClear}
        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[#B91C1C] hover:text-[#EF4444] hover:bg-[#B91C1C]/10 transition"
        title="Sahifani tozalaş"
      >
        <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      </button>

      {/* Delicate Close Button (X) */}
      <div className="w-px h-3 bg-[#E6E9F2] dark:bg-[#262C42]" />
      <button
        type="button"
        onClick={onClose}
        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-[#7A8299] hover:text-[#1B2238] dark:text-[#8B93AD] dark:hover:text-white flex items-center justify-center transition active:scale-90 shrink-0"
        title="Yopiş (M)"
        aria-label="Yopiş"
      >
        <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      </button>
    </div>
  );
};
