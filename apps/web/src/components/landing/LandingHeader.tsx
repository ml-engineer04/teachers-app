import React, { useState } from 'react';
import {
  BookOpen,
  Sun,
  Moon,
  Menu,
  X,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';
import type { WebLanguage } from '../../services/storage/webStorage';
import { BrandLogo } from '../common/BrandLogo';

interface LandingHeaderProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onOpenLogin,
  onOpenRegister,
}) => {
  const { themeMode, isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const languages: Array<{ code: WebLanguage; label: string; flag: string }> = [
    { code: 'uz', label: 'O‘zbekcha', flag: '🇺🇿' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/85 dark:bg-[#090D18]/90 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <a
          href="#"
          className="flex items-center gap-3 group focus:outline-none"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <BrandLogo size={36} />
          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            Web
          </span>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-8">
          <button
            type="button"
            onClick={() => scrollToSection('features')}
            className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t('landing.navFeatures')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('grades')}
            className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t('landing.navGrades')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('workflow')}
            className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t('landing.navWorkflow')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t('landing.navPricing')}
          </button>
        </nav>

        {/* Desktop Right Controls & Auth Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  language === item.code
                    ? 'bg-white dark:bg-[#121A2D] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={item.label}
              >
                <span className="mr-1">{item.flag}</span>
                <span className="uppercase">{item.code}</span>
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 transition-colors"
            aria-label="Toggle dark/light mode"
            title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Login Button */}
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
          >
            <LogIn className="w-4 h-4" />
            <span>{t('auth.loginTab')}</span>
          </button>

          {/* Register Button */}
          <button
            type="button"
            onClick={onOpenRegister}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm shadow-glow active:scale-95 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('auth.registerTab')}</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            aria-label="Open navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#090D18]/95 px-4 pt-3 pb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 uppercase">{t('landing.navFeatures')}</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              {languages.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLanguage(item.code)}
                  className={`px-2 py-1 text-xs font-bold rounded-md ${
                    language === item.code ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection('features')}
            className="text-left py-2 font-semibold text-slate-700 dark:text-slate-200"
          >
            {t('landing.navFeatures')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('grades')}
            className="text-left py-2 font-semibold text-slate-700 dark:text-slate-200"
          >
            {t('landing.navGrades')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('workflow')}
            className="text-left py-2 font-semibold text-slate-700 dark:text-slate-200"
          >
            {t('landing.navWorkflow')}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="text-left py-2 font-semibold text-slate-700 dark:text-slate-200"
          >
            {t('landing.navPricing')}
          </button>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-700 dark:text-slate-200 text-center"
            >
              {t('auth.loginTab')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRegister();
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm text-center shadow-md"
            >
              {t('auth.registerTab')}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
