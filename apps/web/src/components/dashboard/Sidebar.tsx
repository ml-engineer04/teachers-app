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
                    ? 'bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#1D3A8F] dark:text-[#B3C4FA] shadow-sm'
                    : 'text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#F0F3FB] dark:hover:bg-[#1C2236] hover:text-[#1B2238] dark:hover:text-[#E9ECF7]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-[#1D3A8F] dark:text-[#B3C4FA]' : 'text-[#9AA1B5] dark:text-[#69718C]'}`} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4 text-[#1D3A8F] dark:text-[#B3C4FA]" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Settings (Language, Dark Mode, Logout) */}
      <div className="pt-4 border-t border-[#E6E9F2] dark:border-[#262C42] space-y-3">
        {/* Quick Preferences: Language + Theme (Mobile drawer only — desktop has these in header) */}
        <div className="lg:hidden flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42]">
          {/* Language Switcher */}
          <div className="flex items-center gap-1">
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                className={`px-2 py-1 text-[11px] font-black rounded-lg transition-all ${
                  language === item.code
                    ? 'bg-[#FFFFFF] dark:bg-[#171C2E] text-[#2A4FB8] dark:text-[#4F72EE] shadow-xs'
                    : 'text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E9ECF7]'
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
            className="p-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#171C2E] text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#E8EDFB] dark:hover:bg-[#1E2A55] border border-[#E6E9F2] dark:border-[#262C42] transition-colors"
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
            <p className="text-xs font-black text-[#1B2238] dark:text-[#E9ECF7] truncate">
              {user?.fullName || t('common.userFallback')}
            </p>
            <p className="text-[10px] text-[#7A8299] dark:text-[#8B93AD] truncate mt-0.5">
              {user?.email || 'teacher@ilmchi.uz'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#FCEBEA] dark:border-[#3A1B1D] text-[#B3322A] dark:text-[#F0857A] hover:bg-[#FCEBEA] dark:hover:bg-[#3A1B1D] text-xs font-bold transition-colors"
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
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[#E6E9F2] dark:border-[#262C42] bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 backdrop-blur-xl h-screen sticky top-0 z-30 transition-colors">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#0E1220]/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#FFFFFF] dark:bg-[#171C2E] h-full shadow-2xl z-10 border-r border-[#E6E9F2] dark:border-[#262C42]">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
