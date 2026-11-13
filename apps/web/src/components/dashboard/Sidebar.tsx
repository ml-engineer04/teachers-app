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
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';

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
  const { t } = useI18n();
  const { user, logout } = useAuth();

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
          <BrandLogo size={34} subtitle="O‘QITUVCHI KABINETI" />
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
                    ? 'bg-indigo-600 text-white shadow-glow'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A243E] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4 text-white/80" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm uppercase shadow-sm">
            {user?.fullName ? user.fullName[0] : user?.email ? user.email[0] : 'O'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-900 dark:text-white truncate">
              {user?.fullName || 'O‘qituvchi'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {user?.email || 'teacher@ilmchi.uz'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-colors"
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
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#090D18]/95 backdrop-blur-xl h-screen sticky top-0 z-30 transition-colors">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-[#090D18] h-full shadow-2xl z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
