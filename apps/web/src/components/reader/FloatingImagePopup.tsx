import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';

export interface FloatingImagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string | null;
  type?: 'ANSWER' | 'TRANSCRIPT';
  initialOffset?: { x: number; y: number };
}

export const FloatingImagePopup: React.FC<FloatingImagePopupProps> = ({
  isOpen,
  onClose,
  imageUrl,
  initialOffset = { x: 0, y: 0 },
}) => {
  // Dimensions strictly initialized / updated to natural image size (~0.30vw / 0.35vh)
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 280, height: 200 });
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 80, y: 80 });

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imageAspectRef = useRef<number | null>(null);
  const naturalDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Resizing state
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; startW: number; startH: number }>({
    mouseX: 0,
    mouseY: 0,
    startW: 0,
    startH: 0,
  });

  // Calculate and apply compact ~0.30vw / 0.35vh dimensions so it never blocks the whole screen
  const applyImageDimensions = useCallback(
    (nw: number, nh: number) => {
      if (nw <= 0 || nh <= 0) return;
      const aspect = nw / nh;
      imageAspectRef.current = aspect;
      naturalDimensionsRef.current = { width: nw, height: nh };

      const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
      const isMobile = winW < 640;

      // User requested compact ~0.30vw or ~0.35vh:
      // "0.3vh yoki 0.3 vw bilan qilsak boladimi... shunda kichikroq chiqadi va modal ham ortiqcha joy egallamaydi"
      const targetMaxW = isMobile
        ? Math.max(220, Math.min(winW - 24, winW * 0.70))
        : Math.max(240, Math.min(winW * 0.30, 420));

      const targetMaxH = isMobile
        ? Math.max(160, Math.min(winH - 80, winH * 0.40))
        : Math.max(180, Math.min(winH * 0.35, 360));

      // Scale strictly to fit within the compact ~0.30vw/vh box, preserving 100% exact aspect ratio
      const scale = Math.min(targetMaxW / nw, targetMaxH / nh, 1);
      const targetW = Math.max(120, Math.round(nw * scale));
      const targetH = Math.max(80, Math.round(nh * scale));

      setSize({ width: targetW, height: targetH });

      // Snug initial placement with slight offset
      if (typeof window !== 'undefined') {
        const cx = Math.max(12, Math.round((winW - targetW) / 2) + (initialOffset.x || 0));
        const cy = Math.max(48, Math.round((winH - targetH) / 2) + (initialOffset.y || 0));
        setPosition({ x: cx, y: cy });
      }
    },
    [initialOffset.x, initialOffset.y],
  );

  // Pre-measure and load image as soon as popup opens or imageUrl changes
  useEffect(() => {
    if (!isOpen) return;

    if (!imageUrl) {
      setIsLoaded(true);
      setHasError(false);
      setSize({ width: 240, height: 140 });
      return;
    }

    setIsLoaded(false);
    setHasError(false);
    imageAspectRef.current = null;

    const img = new window.Image();
    img.src = imageUrl;

    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        applyImageDimensions(img.naturalWidth, img.naturalHeight);
        setIsLoaded(true);
      }
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoaded(true);
      setSize({ width: 240, height: 140 });
    };
  }, [isOpen, imageUrl, applyImageDimensions]);

  // Recenter if position gets pushed out of viewport
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      setPosition((prev) => {
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;
        const clampedX = Math.max(10, Math.min(maxX, prev.x));
        const clampedY = Math.max(10, Math.min(maxY, prev.y));
        return { x: clampedX, y: clampedY };
      });
    }
  }, [isOpen]);

  // Quick double-click to toggle between compact (~0.3vw) and expanded (~0.6vw) view
  const handleToggleExpand = useCallback(() => {
    if (!imageAspectRef.current || !naturalDimensionsRef.current) return;
    const aspect = imageAspectRef.current;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800;

    const compactThreshold = Math.min(winW * 0.35, 450);
    const isCurrentlyCompact = size.width <= compactThreshold;

    if (isCurrentlyCompact) {
      // Expand to ~0.60vw / 0.65vh for detailed reading
      const maxExpW = winW * 0.58;
      const maxExpH = winH * 0.62;
      const nw = naturalDimensionsRef.current.width;
      const nh = naturalDimensionsRef.current.height;
      const scale = Math.min(maxExpW / nw, maxExpH / nh, 1.8);
      let expW = Math.max(180, Math.round(nw * scale));
      let expH = Math.round(expW / aspect);
      if (expH > maxExpH) {
        expH = Math.round(maxExpH);
        expW = Math.round(expH * aspect);
      }
      setSize({ width: expW, height: expH });
    } else {
      // Return to compact ~0.30vw
      if (naturalDimensionsRef.current) {
        applyImageDimensions(naturalDimensionsRef.current.width, naturalDimensionsRef.current.height);
      }
    }
  }, [size.width, applyImageDimensions]);

  // -------------------------------------------------------------
  // Dragging Handlers (Mouse & Touch across entire image surface)
  // -------------------------------------------------------------
  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      isDraggingRef.current = true;
      dragStartRef.current = {
        mouseX: clientX,
        mouseY: clientY,
        startX: position.x,
        startY: position.y,
      };

      const onMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;
        const currentX =
          'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const currentY =
          'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

        const deltaX = currentX - dragStartRef.current.mouseX;
        const deltaY = currentY - dragStartRef.current.mouseY;

        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;

        const nextX = Math.max(10, Math.min(maxX, dragStartRef.current.startX + deltaX));
        const nextY = Math.max(10, Math.min(maxY, dragStartRef.current.startY + deltaY));

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
    [position],
  );

  // -------------------------------------------------------------
  // Corner Resize Handlers (Enforcing exact image aspect ratio!)
  // -------------------------------------------------------------
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizingRef.current = true;
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startW: size.width,
        startH: size.height,
      };

      const onResizeMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        const deltaX = moveEvent.clientX - resizeStartRef.current.mouseX;
        const rawW = resizeStartRef.current.startW + deltaX;

        const aspect =
          imageAspectRef.current || (resizeStartRef.current.startW / (resizeStartRef.current.startH || 1));
        const maxW = window.innerWidth - position.x - 12;
        const maxH = window.innerHeight - position.y - 12;

        let nextW = Math.max(120, Math.min(maxW, rawW));
        let nextH = Math.round(nextW / aspect);

        if (nextH > maxH) {
          nextH = maxH;
          nextW = Math.round(nextH * aspect);
        }

        setSize({ width: nextW, height: nextH });
      };

      const onResizeEnd = () => {
        isResizingRef.current = false;
        window.removeEventListener('mousemove', onResizeMove);
        window.removeEventListener('mouseup', onResizeEnd);
      };

      window.addEventListener('mousemove', onResizeMove);
      window.addEventListener('mouseup', onResizeEnd);
    },
    [position, size],
  );

  const handleTouchResizeStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!e.touches[0]) return;
      isResizingRef.current = true;
      resizeStartRef.current = {
        mouseX: e.touches[0].clientX,
        mouseY: e.touches[0].clientY,
        startW: size.width,
        startH: size.height,
      };

      const onTouchResizeMove = (moveEvent: TouchEvent) => {
        if (!isResizingRef.current || !moveEvent.touches[0]) return;
        const deltaX = moveEvent.touches[0].clientX - resizeStartRef.current.mouseX;
        const rawW = resizeStartRef.current.startW + deltaX;

        const aspect =
          imageAspectRef.current || (resizeStartRef.current.startW / (resizeStartRef.current.startH || 1));
        const maxW = window.innerWidth - position.x - 12;
        const maxH = window.innerHeight - position.y - 12;

        let nextW = Math.max(120, Math.min(maxW, rawW));
        let nextH = Math.round(nextW / aspect);

        if (nextH > maxH) {
          nextH = maxH;
          nextW = Math.round(nextH * aspect);
        }

        setSize({ width: nextW, height: nextH });
      };

      const onTouchResizeEnd = () => {
        isResizingRef.current = false;
        window.removeEventListener('touchmove', onTouchResizeMove);
        window.removeEventListener('touchend', onTouchResizeEnd);
      };

      window.addEventListener('touchmove', onTouchResizeMove, { passive: false });
      window.addEventListener('touchend', onTouchResizeEnd);
    },
    [position, size],
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Discreet loading indicator before natural dimensions are measured */}
      {!isLoaded && !hasError && imageUrl && (
        <div
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
          className="fixed z-50 px-3 py-1.5 rounded-2xl bg-[#FBFBF9]/95 dark:bg-[#1E222A]/90 backdrop-blur-md border border-[#D9DCD5] dark:border-[#353B47] shadow-xl flex items-center gap-2 text-[#1F2933] dark:text-white/90 text-xs font-bold pointer-events-none select-none"
        >
          <Loader2 className="w-3.5 h-3.5 text-[#2A4FB8] dark:text-[#5B93FA] animate-spin" />
          <span>Yuklanmoqda...</span>
        </div>
      )}

      {/* Floating Snug Image Popup — Compact (~0.30vw/0.35vh) and tightly wrapped */}
      <div
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          opacity: isLoaded || hasError || !imageUrl ? 1 : 0,
        }}
        onDoubleClick={handleToggleExpand}
        onMouseDown={(e) => {
          if (
            (e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).closest('.resize-handle')
          ) {
            return;
          }
          handleDragStart(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          if (
            (e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).closest('.resize-handle')
          ) {
            return;
          }
          handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
        }}
        className="fixed z-50 rounded-2xl bg-[#FBFBF9]/95 dark:bg-[#1E222A]/95 backdrop-blur-md border border-[#D9DCD5] dark:border-[#353B47] shadow-[0_15px_45px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_45px_rgba(0,0,0,0.6)] select-none overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center group transition-[box-shadow]"
        title="Surish uchun bosing va torting • Kattalashtirish uchun ikki marta bosing"
      >
        {/* Discreet Close Button (X) placed over the image corner */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-30 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-md border border-white/25 flex items-center justify-center shadow-md transition-all active:scale-90"
          title="Yopish (Esc)"
          aria-label="Yopish"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>

        {/* Image Display — Fills the container edge-to-edge */}
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden rounded-2xl">
          {!imageUrl ? (
            <div className="p-3 text-center text-[#5B6672] dark:text-white/60 space-y-1">
              <ImageIcon className="w-6 h-6 mx-auto text-[#5B6672]/50 dark:text-white/30 mb-0.5" />
              <p className="text-[11px] font-semibold text-[#1F2933] dark:text-white/80">Rasm biriktirilmagan</p>
            </div>
          ) : hasError ? (
            <div className="p-3 text-center text-rose-500 dark:text-rose-300 space-y-1">
              <ImageIcon className="w-6 h-6 mx-auto text-rose-400/50 mb-0.5" />
              <p className="text-[11px] font-bold">Rasmni ochib bo‘lmadi</p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="Javob yoki Transkript"
              onLoad={(e) => {
                const nw = e.currentTarget.naturalWidth;
                const nh = e.currentTarget.naturalHeight;
                if (nw > 0 && nh > 0) {
                  applyImageDimensions(nw, nh);
                }
                setIsLoaded(true);
              }}
              onError={() => {
                setIsLoaded(true);
                setHasError(true);
              }}
              className="w-full h-full object-contain block pointer-events-none select-none rounded-2xl drop-shadow-md"
            />
          )}
        </div>

        {/* Delicate Bottom-Right Corner Resize Grip */}
        <div
          onMouseDown={handleResizeStart}
          onTouchStart={handleTouchResizeStart}
          className="resize-handle absolute bottom-1 right-1 z-30 w-4 h-4 flex items-center justify-center cursor-nwse-resize text-[#5B6672] dark:text-white/50 hover:text-[#1F2933] dark:hover:text-white transition-colors"
          title="O‘lchamini o‘zgartirish (tortib kattalashtiring)"
        >
          <svg className="w-3 h-3 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
          </svg>
        </div>
      </div>
    </>
  );
};
