import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import { ModernAdminPortal } from './components/ModernAdminPortal';

export default function App() {
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
    <BrowserRouter>
      <ModernAdminPortal
        onLogout={() => {
          localStorage.removeItem('stb_admin_session');
          localStorage.removeItem('stb_admin_token');
          setAdminUser(null);
        }}
      />
    </BrowserRouter>
  );
}
