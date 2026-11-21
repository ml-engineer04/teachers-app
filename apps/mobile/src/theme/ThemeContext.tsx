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
  audio: string;
  audioSoft: string;
  video: string;
  videoSoft: string;
  answer: string;
  answerSoft: string;
  gold: string;
  goldSoft: string;
}

export const LIGHT_THEME: ThemePalette = {
  mode: 'light',
  isDark: false,
  statusBarStyle: 'dark-content',
  background: '#F4F5F2', // Canvas light
  backgroundSecondary: '#ECEEEA', // Surface muted light
  surface: '#FBFBF9', // Surface card light
  surfaceAlt: '#ECEEEA',
  surfaceElevated: '#FFFFFF',
  cardBg: '#FBFBF9',
  inputBg: '#ECEEEA',
  textPrimary: '#1F2933', // Text ink light
  textSecondary: '#5B6672', // Text muted light
  textMuted: '#9AA3B0',
  placeholder: '#9AA3B0',
  border: '#D9DCD5', // Line light
  borderStrong: '#BAD2FF',
  primary: '#2A4FB8', // Ilm ko'k (brand 600)
  primaryDark: '#223F94', // brand 700
  primaryText: '#2A4FB8',
  primarySoft: '#EEF4FF', // brand 50
  accent: '#0E7C70', // Zumrad-teal
  accentSoft: '#E6F6F4',
  warning: '#B45309', // Kehrabo
  warningSoft: '#FFFBEB',
  danger: '#B91C1C', // Qizil
  dangerSoft: '#FEF2F2',
  readerBg: '#F4F5F2', // Canvas light
  readerChrome: 'rgba(251, 251, 249, 0.98)',
  dockBg: 'rgba(251, 251, 249, 0.98)',
  overlay: 'rgba(31, 41, 51, 0.55)',
  onPrimary: '#FFFFFF',
  shadowColor: '#142452',
  audio: '#0E7C70',
  audioSoft: '#E6F6F4',
  video: '#C23B5A',
  videoSoft: '#FDF1F4',
  answer: '#6D3FD1',
  answerSoft: '#F4F0FD',
  gold: '#F5B82E',
  goldSoft: '#FFFBEB',
};

export const DARK_THEME: ThemePalette = {
  mode: 'dark',
  isDark: true,
  statusBarStyle: 'light-content',
  background: '#15181E', // Canvas dark
  backgroundSecondary: '#1E222A', // Surface dark
  surface: '#1E222A', // Surface card dark
  surfaceAlt: '#272C36', // Surface muted dark
  surfaceElevated: '#272C36',
  cardBg: '#1E222A',
  inputBg: '#272C36',
  textPrimary: '#E6E8EC', // Text ink dark
  textSecondary: '#9AA3B0', // Text muted dark
  textMuted: '#5B6672',
  placeholder: '#5B6672',
  border: '#353B47', // Line dark
  borderStrong: '#485265',
  primary: '#5B93FA', // Ilm ko'k (brand 400 dark)
  primaryDark: '#2A4FB8',
  primaryText: '#8DB5FF',
  primarySoft: 'rgba(42, 79, 184, 0.22)',
  accent: '#5ED3C4', // Teal dark
  accentSoft: 'rgba(14, 124, 112, 0.20)',
  warning: '#FBBF24', // Warning dark
  warningSoft: 'rgba(180, 83, 9, 0.22)',
  danger: '#F87171', // Qizil dark
  dangerSoft: 'rgba(185, 28, 28, 0.22)',
  readerBg: '#15181E',
  readerChrome: 'rgba(30, 34, 42, 0.98)',
  dockBg: 'rgba(30, 34, 42, 0.98)',
  overlay: 'rgba(0, 0, 0, 0.78)',
  onPrimary: '#FFFFFF',
  shadowColor: '#000000',
  audio: '#5ED3C4',
  audioSoft: 'rgba(14, 124, 112, 0.20)',
  video: '#FF8FA6',
  videoSoft: 'rgba(194, 59, 90, 0.20)',
  answer: '#B69CFF',
  answerSoft: 'rgba(109, 63, 209, 0.20)',
  gold: '#F5B82E',
  goldSoft: 'rgba(245, 184, 46, 0.20)',
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
