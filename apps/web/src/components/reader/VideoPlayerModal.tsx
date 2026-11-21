import React, { useEffect, useRef } from 'react';
import { X, Video } from 'lucide-react';

interface VideoPlayerModalProps {
  isOpen: boolean;
  videoUrl?: string;
  title?: string;
  unitLabel?: string;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  videoUrl,
  title = 'Video Dars',
  unitLabel,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-[#15181E]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#FBFBF9] dark:bg-[#1E222A] rounded-3xl border border-[#D9DCD5] dark:border-[#353B47] shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="p-4 bg-[#FBFBF9] dark:bg-[#1E222A] border-b border-[#D9DCD5] dark:border-[#353B47] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FDF1F4] dark:bg-[#C23B5A]/20 text-[#C23B5A] dark:text-[#FF8FA6] flex items-center justify-center shrink-0 border border-[#C23B5A]/20 dark:border-[#C23B5A]/30">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-extrabold text-[#1F2933] dark:text-white truncate">{title}</h4>
              {unitLabel && (
                <p className="text-[11px] font-semibold text-[#5B6672] dark:text-[#9AA3B0] truncate">{unitLabel}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#1F2933] dark:hover:text-white hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] transition-colors"
            aria-label="Close video player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Canvas Container */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="p-8 text-center text-[#5B6672] dark:text-[#9AA3B0] text-xs">
              Video fayl manzili topilmadi
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
