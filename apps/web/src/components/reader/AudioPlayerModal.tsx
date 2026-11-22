import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
  FileText,
  GripVertical,
} from 'lucide-react';

interface AudioPlayerModalProps {
  isOpen: boolean;
  audioUrl?: string;
  title?: string;
  unitLabel?: string;
  transcriptImageUrl?: string;
  onOpenTranscript?: () => void;
  onClose: () => void;
}

const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 0.8];

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  isOpen,
  audioUrl,
  onOpenTranscript,
  onClose,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Position state for optional dragging (defaults to bottom-center)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    if (isOpen && audioUrl) {
      setIsPlaying(true);
      setCurrentTime(0);
    } else {
      setIsPlaying(false);
    }
  }, [isOpen, audioUrl]);

  // Dragging support so the user can easily glide the audio pill anywhere
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
        const elH = rect?.height || 48;
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

  if (!isOpen) return null;

  const currentSpeed = PLAYBACK_SPEEDS[speedIndex] || 1;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    setCurrentTime(next);
    if (audioRef.current) {
      audioRef.current.currentTime = next;
    }
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const target = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const cycleSpeed = () => {
    const nextIdx = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIdx);
    const nextSpeed = PLAYBACK_SPEEDS[nextIdx];
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
          return;
        }
        handleDragStart(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
          return;
        }
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }}
      className={`fixed z-50 select-none animate-in slide-in-from-bottom-2 duration-150 max-w-[calc(100vw-16px)] rounded-full bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 backdrop-blur-xl border border-[#E6E9F2] dark:border-[#262C42] shadow-[0_15px_40px_rgba(42,79,184,0.18)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)] text-[#1B2238] dark:text-[#E9ECF7] px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2.5 ${
        !position ? 'bottom-4 left-1/2 -translate-x-1/2' : ''
      } cursor-grab active:cursor-grabbing`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        autoPlay
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Subtle Drag Handle Icon */}
      <div className="text-[#5B6672]/50 hover:text-[#1F2933] dark:text-white/30 dark:hover:text-white/60 transition-colors hidden sm:flex items-center -mr-1">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Play / Pause Circular Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0E7C70] hover:bg-[#14A294] text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm"
        aria-label={isPlaying ? 'Pauza' : 'Ijro etish'}
        title={isPlaying ? 'Pauza' : 'Ijro etish'}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 text-white fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5 text-white fill-current" />
        )}
      </button>

      {/* Quick -5s Replay (Desktop & Tablet) */}
      <button
        type="button"
        onClick={() => handleSkip(-5)}
        className="text-[#5B6672] hover:text-[#1F2933] dark:text-white/70 dark:hover:text-white transition p-1 rounded-full shrink-0 hidden sm:flex"
        title="-5 soniya"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Quick +5s Skip (Desktop & Tablet) */}
      <button
        type="button"
        onClick={() => handleSkip(5)}
        className="text-[#5B6672] hover:text-[#1F2933] dark:text-white/70 dark:hover:text-white transition p-1 rounded-full shrink-0 hidden sm:flex"
        title="+5 soniya"
      >
        <RotateCw className="w-3.5 h-3.5" />
      </button>

      {/* Time & Slim Scrubber */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <span className="text-[10px] sm:text-[10.5px] font-mono text-[#1F2933] dark:text-slate-300">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-14 xs:w-20 sm:w-36 h-1 bg-black/10 dark:bg-white/20 hover:h-1.5 rounded-full appearance-none cursor-pointer accent-[#0E7C70] transition-all"
        />

        <span className="text-[10px] sm:text-[10.5px] font-mono text-[#5B6672] dark:text-slate-400">
          {formatTime(duration)}
        </span>
      </div>

      {/* Speed Toggle Pill */}
      <button
        type="button"
        onClick={cycleSpeed}
        className="px-1.5 py-0.5 rounded-full bg-black/5 hover:bg-black/10 text-[#1F2933] dark:bg-white/10 dark:hover:bg-white/20 text-[9.5px] sm:text-[10px] font-bold dark:text-slate-200 transition shrink-0 active:scale-95"
        title="Tezlikni özgartiriş"
      >
        {currentSpeed}x
      </button>

      {/* Transcript Pill Button */}
      {onOpenTranscript && (
        <button
          type="button"
          onClick={onOpenTranscript}
          className="px-2 sm:px-2.5 py-1 rounded-full bg-[#E6F6F4] text-[#0E7C70] border border-[#0E7C70]/30 hover:bg-[#0E7C70]/20 dark:bg-[#0E7C70]/25 dark:hover:bg-[#0E7C70]/40 dark:text-[#5ED3C4] dark:border-[#0E7C70]/40 text-[10px] sm:text-[11px] font-bold transition flex items-center gap-1 shrink-0 active:scale-95 shadow-xs"
          title="Transkript rasmini oçiş"
        >
          <FileText className="w-3 h-3 text-[#0E7C70] dark:text-[#5ED3C4]" />
          <span className="hidden xs:inline">Transkript</span>
        </button>
      )}

      {/* Mute Toggle */}
      <button
        type="button"
        onClick={() => {
          if (!audioRef.current) return;
          const next = !isMuted;
          setIsMuted(next);
          audioRef.current.muted = next;
        }}
        className="text-[#5B6672] hover:text-[#1F2933] dark:text-white/60 dark:hover:text-white transition p-1 rounded-full shrink-0 hidden xs:flex"
        title={isMuted ? 'Ovozni yoqiş' : 'Ovozni öçiriş'}
      >
        {isMuted ? (
          <VolumeX className="w-3.5 h-3.5 text-[#B91C1C]" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Delicate Close Button (X) */}
      <button
        type="button"
        onClick={onClose}
        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/5 hover:bg-black/10 text-[#5B6672] hover:text-[#1F2933] dark:bg-white/10 dark:hover:bg-white/25 dark:text-white/70 dark:hover:text-white flex items-center justify-center transition active:scale-90 shrink-0"
        title="Yopiş"
        aria-label="Yopiş"
      >
        <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      </button>
    </div>
  );
};
