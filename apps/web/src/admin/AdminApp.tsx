import React, { useState } from 'react';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import { ModernAdminPortal } from './components/ModernAdminPortal';

export const AdminApp: React.FC = () => {
  const [adminUser, setAdminUser] = useState<{ email: string; name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('stb_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  if (!adminUser) {
    return (
      <AdminLoginScreen
        onLoginSuccess={(user) => {
          localStorage.setItem('stb_admin_session', JSON.stringify(user));
          setAdminUser(user);
        }}
      />
    );
  }

  return (
    <ModernAdminPortal
      onLogout={() => {
        localStorage.removeItem('stb_admin_session');
        localStorage.removeItem('stb_admin_token');
        setAdminUser(null);
      }}
    />
  );
};
