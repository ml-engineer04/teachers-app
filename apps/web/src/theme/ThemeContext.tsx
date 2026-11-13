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
  background: '#F6F8FC',
  backgroundSecondary: '#EDF1FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F6FB',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#8B9BB4',
  border: '#E3E8F2',
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryText: '#4F46E5',
  primarySoft: '#EEF2FF',
  accent: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
};

export const DARK_THEME: WebThemePalette = {
  mode: 'dark',
  isDark: true,
  background: '#090D18',
  backgroundSecondary: '#101728',
  surface: '#121A2D',
  surfaceAlt: '#1A243E',
  textPrimary: '#F1F5F9',
  textSecondary: '#B8C4DA',
  textMuted: '#8292AE',
  border: '#23304E',
  primary: '#5558EC',
  primaryDark: '#4338CA',
  primaryText: '#A5B4FC',
  primarySoft: 'rgba(99, 102, 241, 0.18)',
  accent: '#10B981',
  warning: '#FBBF24',
  danger: '#F87171',
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
