import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
  Music,
} from 'lucide-react';

interface AudioPlayerModalProps {
  isOpen: boolean;
  audioUrl?: string;
  title?: string;
  unitLabel?: string;
  onClose: () => void;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  isOpen,
  audioUrl,
  title = 'Listening Audio',
  unitLabel,
  onClose,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (isOpen && audioUrl) {
      setIsPlaying(true);
      setCurrentTime(0);
    } else {
      setIsPlaying(false);
    }
  }, [isOpen, audioUrl]);

  if (!isOpen) return null;

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

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg rounded-3xl bg-white/95 dark:bg-[#121A2D]/95 backdrop-blur-xl border border-slate-200 dark:border-[#23304E] shadow-2xl p-4 sm:p-5 animate-in slide-in-from-bottom-4 duration-200">
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

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {title}
            </h4>
            {unitLabel && (
              <p className="text-[11px] font-semibold text-slate-400 truncate">{unitLabel}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          aria-label="Close audio player"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrubber & Duration */}
      <div className="space-y-1 mb-3">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between">
        {/* Speed Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
          {[0.75, 1, 1.25, 1.5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSpeedChange(s)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                speed === s
                  ? 'bg-white dark:bg-[#121A2D] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Center Main Transport Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSkip(-10)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="-10s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-glow active:scale-95 transition-all"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(10)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="+10s"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Volume & Mute */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (!audioRef.current) return;
              const next = !isMuted;
              setIsMuted(next);
              audioRef.current.muted = next;
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const val = Number(e.target.value);
              setVolume(val);
              setIsMuted(false);
              if (audioRef.current) {
                audioRef.current.volume = val;
                audioRef.current.muted = false;
              }
            }}
            className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 hidden sm:block"
          />
        </div>
      </div>
    </div>
  );
};
