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
  background: '#F5F7FC',
  backgroundSecondary: '#EEF0FF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F7FC',
  textPrimary: '#151B2E',
  textSecondary: '#52617A',
  textMuted: '#8490A5',
  border: '#E5EAF3',
  primary: '#5945F5',
  primaryDark: '#4835D5',
  primaryText: '#5945F5',
  primarySoft: '#EEF0FF',
  accent: '#10CFC3',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export const DARK_THEME: WebThemePalette = {
  mode: 'dark',
  isDark: true,
  background: '#0B1020',
  backgroundSecondary: '#141B2D',
  surface: '#141B2D',
  surfaceAlt: '#1B2540',
  textPrimary: '#E8ECF3',
  textSecondary: '#A5B0C5',
  textMuted: '#8490A5',
  border: '#27334B',
  primary: '#8B7CFF',
  primaryDark: '#705EF5',
  primaryText: '#8B7CFF',
  primarySoft: 'rgba(139, 124, 255, 0.15)',
  accent: '#10CFC3',
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
