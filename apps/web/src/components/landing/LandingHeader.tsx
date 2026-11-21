import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Menu,
  X,
  LogIn,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';
import type { WebLanguage } from '../../services/storage/webStorage';
import { BrandLogo } from '../common/BrandLogo';

interface LandingHeaderProps {
  onOpenLogin: () => void;
  onOpenRegister?: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onOpenLogin,
}) => {
  const { themeMode, isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-2.5 sm:top-3 z-40 w-full px-3 sm:px-6 max-w-7xl mx-auto transition-all duration-200">
      <div className="relative">
        <div className="h-14 sm:h-16 px-3.5 sm:px-5 flex items-center justify-between rounded-2xl bg-[#FBFBF9]/90 dark:bg-[#1E222A]/90 backdrop-blur-xl border border-[#D9DCD5]/80 dark:border-[#353B47]/80 shadow-lg shadow-[#1F2933]/5 dark:shadow-black/40 transition-all">
          {/* Brand / Logo */}
          <a
            href="#"
            className="flex items-center gap-2 group focus:outline-none shrink-0"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <BrandLogo size={28} />
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-[#F5B82E]/15 text-[#B45309] dark:text-[#FBBF24] border border-[#F5B82E]/30">
              Demo
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="text-xs sm:text-sm font-semibold text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition-colors cursor-pointer"
            >
              {t('landing.navFeatures')}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('grades')}
              className="text-xs sm:text-sm font-semibold text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition-colors cursor-pointer"
            >
              {t('landing.navGrades')}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow')}
              className="text-xs sm:text-sm font-semibold text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition-colors cursor-pointer"
            >
              {t('landing.navWorkflow')}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pricing')}
              className="text-xs sm:text-sm font-semibold text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition-colors cursor-pointer"
            >
              {t('landing.navPricing')}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="text-xs sm:text-sm font-semibold text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition-colors cursor-pointer"
            >
              {t('landing.navFaq') || 'Savollar'}
            </button>
          </nav>

          {/* Desktop Right Controls & Auth Actions */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Language Selector */}
            <div className="relative inline-flex items-center">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as WebLanguage)}
                className="appearance-none bg-[#ECEEEA] dark:bg-[#272C36] hover:bg-[#D9DCD5] dark:hover:bg-[#353B47] text-[#1F2933] dark:text-[#E6E8EC] text-xs font-bold pl-2.5 pr-7 py-1.5 rounded-xl border border-[#D9DCD5] dark:border-[#353B47] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8] cursor-pointer transition-all"
                aria-label="Tilni tanlash"
              >
                <option value="uz" className="bg-[#FBFBF9] dark:bg-[#1E222A] text-[#1F2933] dark:text-[#E6E8EC]">
                  🇺🇿 O'zbekcha
                </option>
                <option value="ru" className="bg-[#FBFBF9] dark:bg-[#1E222A] text-[#1F2933] dark:text-[#E6E8EC]">
                  🇷🇺 Русский
                </option>
                <option value="en" className="bg-[#FBFBF9] dark:bg-[#1E222A] text-[#1F2933] dark:text-[#E6E8EC]">
                  🇬🇧 English
                </option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-[#5B6672] dark:text-[#9AA3B0] pointer-events-none" />
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-[#ECEEEA] dark:bg-[#272C36] text-[#1F2933] dark:text-[#E6E8EC] hover:bg-[#D9DCD5] dark:hover:bg-[#353B47] border border-[#D9DCD5] dark:border-[#353B47] transition-colors cursor-pointer"
              aria-label="Toggle dark/light mode"
              title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-[#F5B82E]" /> : <Moon className="w-3.5 h-3.5 text-[#2A4FB8]" />}
            </button>

            <div className="h-5 w-px bg-[#D9DCD5] dark:bg-[#353B47] mx-0.5" />

            {/* Login Button */}
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-1.5 sm:py-2 rounded-xl bg-[#2A4FB8] hover:bg-[#223F94] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#2A4FB8]/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('auth.loginTab')}</span>
            </button>
          </div>

          {/* Mobile Right Controls: Language, Theme & Hamburger */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            {/* Mobile Language Selector */}
            <div className="relative inline-flex items-center">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as WebLanguage)}
                className="appearance-none bg-[#ECEEEA] dark:bg-[#272C36] text-[#1F2933] dark:text-[#E6E8EC] text-[11px] font-bold pl-2 pr-5 py-1 rounded-lg border border-[#D9DCD5] dark:border-[#353B47] focus:outline-none cursor-pointer"
                aria-label="Tilni tanlash"
              >
                <option value="uz" className="bg-[#FBFBF9] dark:bg-[#1E222A] text-[#1F2933] dark:text-[#E6E8EC]">
                  🇺🇿 UZ
                </option>
                <option value="ru" className="bg-[#FBFBF9] dark:bg-[#1E222A] text-[#1F2933] dark:text-[#E6E8EC]">
                  🇷🇺 RU
                </option>
                <option value="en" className="bg-[#FBFBF9] dark:bg-[#1E222A] text-[#1F2933] dark:text-[#E6E8EC]">
                  🇬🇧 EN
                </option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1 text-[#5B6672] dark:text-[#9AA3B0] pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-[#ECEEEA] dark:bg-[#272C36] text-[#1F2933] dark:text-[#E6E8EC] hover:bg-[#D9DCD5] dark:hover:bg-[#353B47] transition cursor-pointer"
              aria-label="Toggle dark/light mode"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-[#F5B82E]" /> : <Moon className="w-3.5 h-3.5 text-[#2A4FB8]" />}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-[#ECEEEA] dark:bg-[#272C36] text-[#1F2933] dark:text-[#E6E8EC] hover:bg-[#D9DCD5] dark:hover:bg-[#353B47] transition active:scale-95 cursor-pointer"
              aria-label="Navigatsiya menyusi"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-[#2A4FB8] dark:text-[#5B93FA]" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Backdrop (click outside to close) */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/25 dark:bg-black/60 backdrop-blur-xs sm:hidden animate-backdrop-fade"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Menu Dropdown - Absolute Positioned (never pushes content down) */}
        {mobileMenuOpen && (
          <div className="absolute top-[calc(100%+8px)] inset-x-0 sm:hidden z-50 rounded-2xl border border-[#D9DCD5]/90 dark:border-[#353B47]/90 bg-[#FBFBF9]/95 dark:bg-[#1E222A]/95 backdrop-blur-2xl p-4 shadow-2xl shadow-[#1F2933]/15 dark:shadow-black/60 flex flex-col gap-1.5 animate-menu-slide-down">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="text-left py-2 px-3 rounded-xl font-semibold text-xs text-[#1F2933] dark:text-[#E6E8EC] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition cursor-pointer"
            >
              {t('landing.navFeatures')}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('grades')}
              className="text-left py-2 px-3 rounded-xl font-semibold text-xs text-[#1F2933] dark:text-[#E6E8EC] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition cursor-pointer"
            >
              {t('landing.navGrades')}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow')}
              className="text-left py-2 px-3 rounded-xl font-semibold text-xs text-[#1F2933] dark:text-[#E6E8EC] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition cursor-pointer"
            >
              {t('landing.navWorkflow')}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pricing')}
              className="text-left py-2 px-3 rounded-xl font-semibold text-xs text-[#1F2933] dark:text-[#E6E8EC] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition cursor-pointer"
            >
              {t('landing.navPricing')}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="text-left py-2 px-3 rounded-xl font-semibold text-xs text-[#1F2933] dark:text-[#E6E8EC] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] hover:text-[#2A4FB8] dark:hover:text-[#5B93FA] transition cursor-pointer"
            >
              {t('landing.navFaq') || 'Savollar'}
            </button>

            <div className="pt-2.5 mt-1 border-t border-[#D9DCD5] dark:border-[#353B47]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full py-2.5 rounded-xl bg-[#2A4FB8] hover:bg-[#223F94] text-white font-bold text-xs text-center shadow-md shadow-[#2A4FB8]/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('auth.loginTab')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
