import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
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

  // Core Color Tokens
  background: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accentText: string;
  accentSoft: string;
  accentSoftText: string;
  accentSoftBorder: string;
  subscriptionCard: string;
  successSoft: string;
  successText: string;
  inputFill: string;
  segmentFill: string;
  progressTrack: string;
  progressFill: string;
  disabledChip: string;
  selectedPlanFill: string;
  danger: string;

  // Extended / Legacy Tokens
  backgroundSecondary: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  cardBg: string;
  inputBg: string;
  placeholder: string;
  borderStrong: string;
  primaryDark: string;
  primaryText: string;
  primarySoft: string;
  accent: string;
  warning: string;
  warningSoft: string;
  dangerSoft: string;
  readerBg: string;
  readerChrome: string;
  dockBg: string;
  overlay: string;
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

  // Core Tokens
  background: '#F6F7FB',
  card: '#FFFFFF',
  border: '#E6E9F2',
  textPrimary: '#1B2238',
  textSecondary: '#7A8299',
  textMuted: '#9AA1B5',
  primary: '#2A4FB8',
  onPrimary: '#FFFFFF',
  accentText: '#2A4FB8',
  accentSoft: '#E8EDFB',
  accentSoftText: '#1D3A8F',
  accentSoftBorder: '#C9D6F5',
  subscriptionCard: '#E8EDFB',
  successSoft: '#E3F5EE',
  successText: '#0F6E56',
  inputFill: '#EEF1F8',
  segmentFill: '#EEF1F8',
  progressTrack: '#E4E9F7',
  progressFill: '#2A4FB8',
  disabledChip: '#F0F2F8',
  selectedPlanFill: '#EEF2FD',
  danger: '#C0392B',

  // Compatibility & Extended
  backgroundSecondary: '#EEF1F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F8',
  surfaceElevated: '#FFFFFF',
  cardBg: '#FFFFFF',
  inputBg: '#EEF1F8',
  placeholder: '#9AA1B5',
  borderStrong: '#C9D6F5',
  primaryDark: '#1D3A8F',
  primaryText: '#2A4FB8',
  primarySoft: '#E8EDFB',
  accent: '#2A4FB8',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
  dangerSoft: '#FDE8E8',
  readerBg: '#F6F7FB',
  readerChrome: 'rgba(255, 255, 255, 0.98)',
  dockBg: '#FFFFFF',
  overlay: 'rgba(27, 34, 56, 0.55)',
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

  // Core Tokens
  background: '#0E1220',
  card: '#171C2E',
  border: '#262C42',
  textPrimary: '#E9ECF7',
  textSecondary: '#8B93AD',
  textMuted: '#69718C',
  primary: '#4F72EE',
  onPrimary: '#FFFFFF',
  accentText: '#8FA8F7',
  accentSoft: '#1E2A55',
  accentSoftText: '#B3C4FA',
  accentSoftBorder: '#34478C',
  subscriptionCard: '#1B2650',
  successSoft: '#12332B',
  successText: '#5FD1AC',
  inputFill: '#10152A',
  segmentFill: '#10152A',
  progressTrack: '#262C42',
  progressFill: '#7F9BF7',
  disabledChip: '#262C42',
  selectedPlanFill: '#182252',
  danger: '#F0857A',

  // Compatibility & Extended
  backgroundSecondary: '#10152A',
  surface: '#171C2E',
  surfaceAlt: '#20263D',
  surfaceElevated: '#171C2E',
  cardBg: '#171C2E',
  inputBg: '#10152A',
  placeholder: '#69718C',
  borderStrong: '#34478C',
  primaryDark: '#385BD4',
  primaryText: '#8FA8F7',
  primarySoft: '#1E2A55',
  accent: '#8FA8F7',
  warning: '#FBBF24',
  warningSoft: 'rgba(180, 83, 9, 0.22)',
  dangerSoft: 'rgba(240, 133, 122, 0.16)',
  readerBg: '#0E1220',
  readerChrome: 'rgba(23, 28, 46, 0.98)',
  dockBg: '#171C2E',
  overlay: 'rgba(0, 0, 0, 0.78)',
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

  const setThemeMode = useCallback(async (mode: AppThemeMode) => {
    setThemeModeState(mode);
    await saveThemeMode(mode);
  }, []);

  const toggleTheme = useCallback(async () => {
    setThemeModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveThemeMode(next).catch(() => {});
      return next;
    });
  }, []);

  const colors = useMemo(
    () => (themeMode === 'dark' ? DARK_THEME : LIGHT_THEME),
    [themeMode],
  );

  const contextValue = useMemo(
    () => ({
      themeMode,
      isDark: themeMode === 'dark',
      colors,
      setThemeMode,
      toggleTheme,
      themeReady,
    }),
    [themeMode, colors, setThemeMode, toggleTheme, themeReady],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
