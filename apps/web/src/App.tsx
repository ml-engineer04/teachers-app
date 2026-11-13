import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { NotificationHost } from './components/common/NotificationHost';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal, AuthModalView } from './components/auth/AuthModal';
import { TeacherDashboard } from './components/dashboard/TeacherDashboard';
import { AdminApp } from './admin/AdminApp';
import { checkIsAdminRoute, navigateToAdmin, navigateToTeacher } from './utils/subdomainRouter';
import { Shield, GraduationCap } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState<boolean>(checkIsAdminRoute);

  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    view: AuthModalView;
  }>({
    isOpen: false,
    view: 'LOGIN',
  });

  // Listen to popstate / history navigation
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminMode(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Is this running on localhost / dev environment?
  const isDevEnvironment =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.localhost'));

  // If on admin subdomain (admin.ilmchi.uz) or /admin path:
  if (isAdminMode) {
    return (
      <>
        <NotificationHost />
        <AdminApp />

        {/* Development Quick Switcher Pill */}
        {isDevEnvironment && (
          <div className="fixed bottom-4 right-4 z-50">
            <button
              onClick={navigateToTeacher}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-lg border border-white/20 transition-all hover:scale-105"
              title="O'qituvchi kabinetiga o'tish (localhost:3000/)"
            >
              <GraduationCap className="w-4 h-4" />
              <span>O'qituvchi Kabineti</span>
            </button>
          </div>
        )}
      </>
    );
  }

  // Teacher Web App (ilmchi.uz or localhost:3000/)
  return (
    <>
      <NotificationHost />

      {!isAuthenticated ? (
        <>
          <LandingPage
            onOpenAuth={(mode) =>
              setAuthModal({
                isOpen: true,
                view: mode === 'register' ? 'REGISTER' : 'LOGIN',
              })
            }
          />
          <AuthModal
            isOpen={authModal.isOpen}
            initialView={authModal.view}
            onClose={() => setAuthModal((prev) => ({ ...prev, isOpen: false }))}
          />
        </>
      ) : (
        <TeacherDashboard />
      )}

      {/* Development Quick Switcher Pill */}
      {isDevEnvironment && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={navigateToAdmin}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-900 text-amber-400 text-xs font-semibold rounded-full shadow-lg border border-amber-500/30 backdrop-blur-md transition-all hover:scale-105"
            title="Admin panelga o'tish (localhost:3000/admin yoki admin.localhost:3000)"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Admin Panel (/admin)</span>
          </button>
        </div>
      )}
    </>
  );
};
