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
      <div className="h-14 sm:h-16 px-3.5 sm:px-5 flex items-center justify-between rounded-2xl bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg shadow-slate-900/5 dark:shadow-black/40 transition-all">
        {/* Brand / Logo */}
        <a
          href="#"
          className="flex items-center gap-2.5 group focus:outline-none"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <BrandLogo size={30} />
          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Demo
          </span>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6">
          <button
            type="button"
            onClick={() => scrollToSection('features')}
            className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t('landing.navFeatures')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('grades')}
            className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t('landing.navGrades')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('workflow')}
            className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t('landing.navWorkflow')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t('landing.navPricing')}
          </button>
        </nav>

        {/* Desktop Right Controls & Auth Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Language Selector */}
          <div className="relative inline-flex items-center">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as WebLanguage)}
              className="appearance-none bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-bold pl-2.5 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
              aria-label="Tilni tanlaş"
            >
              <option value="uz" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                🇺🇿 Özbekça
              </option>
              <option value="ru" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                🇷🇺 Русский
              </option>
              <option value="en" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                🇬🇧 English
              </option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-slate-500 pointer-events-none" />
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 transition-colors"
            aria-label="Toggle dark/light mode"
            title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Login Button */}
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-4 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t('auth.loginTab')}</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-1.5">
          {/* Mobile Language Selector */}
          <div className="relative inline-flex items-center">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as WebLanguage)}
              className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-bold pl-2 pr-5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
              aria-label="Tilni tanlaş"
            >
              <option value="uz" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                🇺🇿 UZ
              </option>
              <option value="ru" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                🇷🇺 RU
              </option>
              <option value="en" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                🇬🇧 EN
              </option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-1 text-slate-500 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            aria-label="Open navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#090D18]/95 backdrop-blur-xl p-3.5 shadow-xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            type="button"
            onClick={() => scrollToSection('features')}
            className="text-left py-1.5 font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600"
          >
            {t('landing.navFeatures')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('grades')}
            className="text-left py-1.5 font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600"
          >
            {t('landing.navGrades')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('workflow')}
            className="text-left py-1.5 font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600"
          >
            {t('landing.navWorkflow')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="text-left py-1.5 font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600"
          >
            {t('landing.navPricing')}
          </button>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="w-full py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs text-center shadow-md flex items-center justify-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('auth.loginTab')}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
