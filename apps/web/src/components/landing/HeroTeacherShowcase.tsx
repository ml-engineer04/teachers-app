import React from 'react';

export const HeroTeacherShowcase: React.FC = () => {
  return (
    <div className="relative w-full max-w-lg lg:max-w-xl mx-auto flex items-center justify-center select-none">
      {/* Bilinar-bilinmas yumshoq fon nuri (hech qanday ramkasiz va og'ir soyalarsiz) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[360px] h-[360px] sm:w-[450px] sm:h-[450px] bg-gradient-to-tr from-indigo-400/10 via-purple-400/10 to-transparent dark:from-indigo-500/10 dark:via-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Rasm hech qanday ko'tarilgan qutisiz, ramkasiz va soyalarsiz to'g'ridan-to'g'ri fonga singib turadi */}
      <div className="relative w-full flex items-center justify-center">
        <img
          src="/assets/hero-teacher.png"
          alt="ilmçi — Interaktiv darsliklar"
          className="w-full h-auto max-h-[500px] object-contain"
          style={{
            maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
          }}
          loading="eager"
        />
      </div>
    </div>
  );
};
