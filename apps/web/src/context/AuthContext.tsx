import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthTokensResponse } from '@smartteacherbook/shared';
import { webStorage } from '../services/storage/webStorage';
import { setOnSessionExpired, webApi } from '../services/api/webApi';
import { notify } from '../utils/notify';
import { useI18n } from '../i18n/I18nContext';

interface AuthContextValue {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithTokens: (tokens: AuthTokensResponse) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginWithTokens: async () => {},
  logout: async () => {},
  logoutAll: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();
  const [user, setUser] = useState<any | null>(() => webStorage.getUserProfile());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!webStorage.getAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    const token = webStorage.getAccessToken();
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }
    try {
      const profile = await webApi.getProfile();
      if (profile) {
        const userData = profile.user || profile;
        setUser(userData);
        webStorage.saveUserProfile(userData);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      if (err?.status === 401) {
        webStorage.clearAuthTokens();
        setUser(null);
        setIsAuthenticated(false);
      }
    }
  };

  useEffect(() => {
    setOnSessionExpired(() => {
      setUser(null);
      setIsAuthenticated(false);
      notify.warning(
        'Xavfsizlik maqsadida tizimdan chiqildi. Iltimos, qayta kiring.',
        'Sessiya muddati tugadi',
      );
    });

    const initAuth = async () => {
      if (webStorage.getAccessToken()) {
        await refreshProfile();
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const loginWithTokens = async (tokens: AuthTokensResponse) => {
    webStorage.saveTokens(tokens.accessToken, tokens.refreshToken);
    if (tokens.user) {
      const userData = (tokens.user as any).user || tokens.user;
      setUser(userData);
      webStorage.saveUserProfile(userData);
    }
    setIsAuthenticated(true);
    // Refresh full profile in background
    refreshProfile().catch(() => {});
  };

  const logout = async () => {
    try {
      await webApi.logout();
    } catch {
      webStorage.clearAuthTokens();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      notify.info('Hisobdan muvaffaqiyatli chiqildi.', t('common.appName'));
    }
  };

  const logoutAll = async () => {
    try {
      await webApi.logoutAll();
    } catch {
      webStorage.clearAuthTokens();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      notify.info('Barcha qurilmalardan muvaffaqiyatli chiqildi.', t('common.appName'));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        loginWithTokens,
        logout,
        logoutAll,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
