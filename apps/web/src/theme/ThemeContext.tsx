import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { WebThemeMode, webStorage } from '../services/storage/webStorage';

export interface WebThemePalette {
  mode: WebThemeMode;
  isDark: boolean;
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryDark: string;
  primaryText: string;
  primarySoft: string;
  accent: string;
  warning: string;
  danger: string;
}

export const LIGHT_THEME: WebThemePalette = {
  mode: 'light',
  isDark: false,
  background: '#F6F7FB',
  backgroundSecondary: '#EEF1F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F7FB',
  textPrimary: '#1B2238',
  textSecondary: '#7A8299',
  textMuted: '#9AA1B5',
  border: '#E6E9F2',
  primary: '#2A4FB8',
  primaryDark: '#234399',
  primaryText: '#2A4FB8',
  primarySoft: '#E8EDFB',
  accent: '#2A4FB8',
  warning: '#8A5A0B',
  danger: '#C0392B',
};

export const DARK_THEME: WebThemePalette = {
  mode: 'dark',
  isDark: true,
  background: '#0E1220',
  backgroundSecondary: '#10152A',
  surface: '#171C2E',
  surfaceAlt: '#1E2A55',
  textPrimary: '#E9ECF7',
  textSecondary: '#8B93AD',
  textMuted: '#69718C',
  border: '#262C42',
  primary: '#4F72EE',
  primaryDark: '#6384F1',
  primaryText: '#8FA8F7',
  primarySoft: '#1E2A55',
  accent: '#8FA8F7',
  warning: '#F0B95B',
  danger: '#F0857A',
};

interface ThemeContextValue {
  themeMode: WebThemeMode;
  isDark: boolean;
  colors: WebThemePalette;
  setThemeMode: (mode: WebThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'light',
  isDark: false,
  colors: LIGHT_THEME,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

function syncHtmlDarkClass(mode: WebThemeMode) {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<WebThemeMode>(() => {
    const initial = webStorage.getTheme();
    syncHtmlDarkClass(initial);
    return initial;
  });

  useEffect(() => {
    syncHtmlDarkClass(themeMode);
  }, [themeMode]);

  const setThemeMode = (mode: WebThemeMode) => {
    setThemeModeState(mode);
    webStorage.saveTheme(mode);
    syncHtmlDarkClass(mode);
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const colors = useMemo(() => (themeMode === 'dark' ? DARK_THEME : LIGHT_THEME), [themeMode]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark: themeMode === 'dark',
        colors,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
