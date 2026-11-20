import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { NotificationHost } from './components/common/NotificationHost';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal, AuthModalView } from './components/auth/AuthModal';
import { TeacherDashboard } from './components/dashboard/TeacherDashboard';
import { AdminApp } from './admin/AdminApp';
import { ReaderPage } from './pages/ReaderPage';
import { Shield, GraduationCap } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    view: AuthModalView;
  }>({
    isOpen: false,
    view: 'LOGIN',
  });

  // Is this running on localhost / dev environment?
  const isDevEnvironment =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.localhost'));

  const isAdminSubdomain =
    typeof window !== 'undefined' &&
    (window.location.hostname.startsWith('admin.') ||
      window.location.hostname === 'admin.localhost');

  // If on admin subdomain directly, route everything to AdminApp
  if (isAdminSubdomain) {
    return (
      <>
        <NotificationHost />
        <AdminApp />
      </>
    );
  }

  const onAdminPath = location.pathname.startsWith('/admin');

  return (
    <>
      <NotificationHost />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialView={authModal.view}
        onClose={() => setAuthModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <Routes>
        {/* Admin Multi-Page Routes */}
        <Route path="/admin/*" element={<AdminApp />} />

        {/* Dedicated Interactive Book Reader Route */}
        <Route path="/reader/:bookId" element={<ReaderPage />} />

        {/* Teacher Panel Multi-Page Routes */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <TeacherDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/dashboard/grades"
          element={
            isAuthenticated ? (
              <TeacherDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/dashboard/plans"
          element={
            isAuthenticated ? (
              <TeacherDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            isAuthenticated ? (
              <TeacherDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Root Route: If authenticated -> Teacher Dashboard; else Landing Page */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <TeacherDashboard />
            ) : (
              <LandingPage
                onOpenAuth={(mode) =>
                  setAuthModal({
                    isOpen: true,
                    view: mode === 'register' ? 'REGISTER' : 'LOGIN',
                  })
                }
              />
            )
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Development Quick Switcher Pill */}
      {isDevEnvironment && (
        <div className="fixed bottom-4 right-4 z-50">
          {onAdminPath ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-lg border border-white/20 transition-all hover:scale-105"
              title="Öqituvçi kabinetiga ötiş (/dashboard)"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Öqituvçi Kabineti</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-900 text-amber-400 text-xs font-semibold rounded-full shadow-lg border border-amber-500/30 backdrop-blur-md transition-all hover:scale-105"
              title="Admin panelga ötiş (/admin)"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Admin Panel (/admin)</span>
            </button>
          )}
        </div>
      )}
    </>
  );
};
