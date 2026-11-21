import React from 'react';
import {
  BookOpen,
  Home,
  GraduationCap,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { BrandLogo } from '../common/BrandLogo';
import type { WebLanguage } from '../../services/storage/webStorage';

export type DashboardTab = 'HOME' | 'GRADES' | 'PLANS' | 'SETTINGS';

interface SidebarProps {
  currentTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { t, language, setLanguage } = useI18n();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const languages: Array<{ code: WebLanguage; label: string; short: string }> = [
    { code: 'uz', label: 'Özbekça', short: 'UZ' },
    { code: 'ru', label: 'Русский', short: 'RU' },
    { code: 'en', label: 'English', short: 'EN' },
  ];

  const navItems: Array<{ id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'HOME', label: t('nav.home'), icon: Home },
    { id: 'GRADES', label: t('nav.grades'), icon: GraduationCap },
    { id: 'PLANS', label: t('nav.requests'), icon: CreditCard },
    { id: 'SETTINGS', label: t('nav.settings'), icon: Settings },
  ];

  const handleSelect = (tab: DashboardTab) => {
    onSelectTab(tab);
    onCloseMobile?.();
  };

  const content = (
    <div className="h-full flex flex-col justify-between p-4 sm:p-5">
      {/* Brand & Workspace Logo */}
      <div>
        <div className="px-2 mb-8">
          <BrandLogo size={34} subtitle={t('dashboard.cabinetSubtitle')} />
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                  active
                    ? 'bg-[#EEF4FF] dark:bg-[#142452]/70 text-[#2A4FB8] dark:text-[#5B93FA] shadow-sm'
                    : 'text-[#5B6672] dark:text-[#9AA3B0] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] hover:text-[#1F2933] dark:hover:text-[#E6E8EC]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-[#2A4FB8] dark:text-[#5B93FA]' : 'text-[#8DB5FF] dark:text-[#9AA3B0]'}`} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4 text-[#2A4FB8] dark:text-[#5B93FA]" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Settings (Language, Dark Mode, Logout) */}
      <div className="pt-4 border-t border-[#D9DCD5] dark:border-[#353B47] space-y-3">
        {/* Quick Preferences: Language + Theme (Mobile drawer only — desktop has these in header) */}
        <div className="lg:hidden flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-[#ECEEEA] dark:bg-[#272C36] border border-[#D9DCD5] dark:border-[#353B47]">
          {/* Language Switcher */}
          <div className="flex items-center gap-1">
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                className={`px-2 py-1 text-[11px] font-black rounded-lg transition-all ${
                  language === item.code
                    ? 'bg-[#FBFBF9] dark:bg-[#1E222A] text-[#2A4FB8] dark:text-[#5B93FA] shadow-xs'
                    : 'text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#1F2933] dark:hover:text-[#E6E8EC]'
                }`}
                title={item.label}
              >
                {item.short}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-xl bg-[#FBFBF9] dark:bg-[#1E222A] text-[#5B6672] dark:text-[#9AA3B0] hover:bg-[#EEF4FF] dark:hover:bg-[#142452] border border-[#D9DCD5] dark:border-[#353B47] transition-colors"
            title={isDark ? 'Yoruğ rejim' : 'Qoronğu rejim'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-[#2A4FB8]" />}
          </button>
        </div>

        {/* User Profile Info */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2A4FB8] to-[#1C3375] text-white flex items-center justify-center font-extrabold text-sm uppercase shadow-sm shrink-0">
            {user?.fullName ? user.fullName[0] : user?.email ? user.email[0] : 'O'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-[#1F2933] dark:text-[#E6E8EC] truncate">
              {user?.fullName || t('common.userFallback')}
            </p>
            <p className="text-[10px] text-[#5B6672] dark:text-[#9AA3B0] truncate mt-0.5">
              {user?.email || 'teacher@ilmchi.uz'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-[#B91C1C] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[#D9DCD5] dark:border-[#353B47] bg-[#FBFBF9]/95 dark:bg-[#1E222A]/95 backdrop-blur-xl h-screen sticky top-0 z-30 transition-colors">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#FBFBF9] dark:bg-[#1E222A] h-full shadow-2xl z-10 border-r border-[#D9DCD5] dark:border-[#353B47]">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
