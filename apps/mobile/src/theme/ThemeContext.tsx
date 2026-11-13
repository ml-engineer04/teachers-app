import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AppThemeMode,
  getCachedPreferences,
  loadAppPreferences,
  saveThemeMode,
  subscribePreferences,
} from '../services/storage/appPreferences';

export interface ThemePalette {
  mode: AppThemeMode;
  isDark: boolean;
  statusBarStyle: 'dark-content' | 'light-content';
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  cardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  placeholder: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryDark: string;
  primaryText: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  readerBg: string;
  readerChrome: string;
  dockBg: string;
  overlay: string;
  onPrimary: string;
  shadowColor: string;
}

export const LIGHT_THEME: ThemePalette = {
  mode: 'light',
  isDark: false,
  statusBarStyle: 'dark-content',
  background: '#F6F8FC',
  backgroundSecondary: '#EDF1FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F6FB',
  surfaceElevated: '#FFFFFF',
  cardBg: '#FFFFFF',
  inputBg: '#F3F6FB',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#8B9BB4',
  placeholder: '#94A3B8',
  border: '#E3E8F2',
  borderStrong: '#CBD5E1',
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryText: '#4F46E5',
  primarySoft: '#EEF2FF',
  accent: '#059669',
  accentSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  readerBg: '#EDF1FA',
  readerChrome: 'rgba(255,255,255,0.97)',
  dockBg: 'rgba(255,255,255,0.97)',
  overlay: 'rgba(15, 23, 42, 0.52)',
  onPrimary: '#FFFFFF',
  shadowColor: '#0F172A',
};

export const DARK_THEME: ThemePalette = {
  mode: 'dark',
  isDark: true,
  statusBarStyle: 'light-content',
  background: '#090D18',
  backgroundSecondary: '#101728',
  surface: '#121A2D',
  surfaceAlt: '#1A243E',
  surfaceElevated: '#1E2B48',
  cardBg: '#141E34',
  inputBg: '#19233C',
  textPrimary: '#F1F5F9',
  textSecondary: '#B8C4DA',
  textMuted: '#8292AE',
  placeholder: '#667794',
  border: '#23304E',
  borderStrong: '#334368',
  primary: '#5558EC',
  primaryDark: '#4338CA',
  primaryText: '#A5B4FC',
  primarySoft: 'rgba(99, 102, 241, 0.18)',
  accent: '#10B981',
  accentSoft: 'rgba(16, 185, 129, 0.16)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.16)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.16)',
  readerBg: '#070B14',
  readerChrome: 'rgba(18, 26, 45, 0.97)',
  dockBg: 'rgba(18, 26, 45, 0.97)',
  overlay: 'rgba(2, 6, 23, 0.78)',
  onPrimary: '#FFFFFF',
  shadowColor: '#000000',
};

interface ThemeContextValue {
  themeMode: AppThemeMode;
  isDark: boolean;
  colors: ThemePalette;
  setThemeMode: (mode: AppThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  themeReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'light',
  isDark: false,
  colors: LIGHT_THEME,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
  themeReady: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<AppThemeMode>(() => getCachedPreferences().themeMode);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadAppPreferences().then((prefs) => {
      if (mounted) {
        setThemeModeState(prefs.themeMode);
        setThemeReady(true);
      }
    });
    const unsub = subscribePreferences((prefs) => {
      if (mounted) setThemeModeState(prefs.themeMode);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const setThemeMode = async (mode: AppThemeMode) => {
    setThemeModeState(mode);
    await saveThemeMode(mode);
  };

  const toggleTheme = async () => {
    await setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const colors = useMemo(
    () => (themeMode === 'dark' ? DARK_THEME : LIGHT_THEME),
    [themeMode],
  );

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark: themeMode === 'dark',
        colors,
        setThemeMode,
        toggleTheme,
        themeReady,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
