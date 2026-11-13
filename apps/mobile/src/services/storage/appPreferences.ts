import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

export type AppThemeMode = 'light' | 'dark';
export type AppLanguage = 'uz' | 'ru' | 'en';

export interface AppPreferences {
  themeMode: AppThemeMode;
  language: AppLanguage;
}

const PREFS_KEY = 'stb_app_preferences_v1';
const WEB_THEME_KEY = 'stb_theme_mode';
const WEB_LANG_KEY = 'stb_app_language';
const LEGACY_LANG_KEY = 'stb_selected_language';
const NATIVE_PREFS_FILE = `${FileSystem.documentDirectory || ''}stb_offline/kv/app_preferences.json`;

export function normalizeLanguageCode(code?: string | null): AppLanguage {
  const lower = String(code || '').trim().toLowerCase();
  if (lower.startsWith('ru') || lower === 'рус' || lower === 'russian') return 'ru';
  if (lower.startsWith('en') || lower === 'eng' || lower === 'english') return 'en';
  return 'uz';
}

export function normalizeThemeMode(mode?: string | null): AppThemeMode {
  return String(mode || '').trim().toLowerCase() === 'dark' ? 'dark' : 'light';
}

function readWebInitialPreferences(): AppPreferences {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) {
    return { themeMode: 'light', language: 'uz' };
  }
  try {
    const rawJson = window.localStorage.getItem(PREFS_KEY);
    if (rawJson) {
      const parsed = JSON.parse(rawJson);
      return {
        themeMode: normalizeThemeMode(parsed?.themeMode),
        language: normalizeLanguageCode(parsed?.language),
      };
    }
    const rawTheme = window.localStorage.getItem(WEB_THEME_KEY);
    const rawLang = window.localStorage.getItem(WEB_LANG_KEY) || window.localStorage.getItem(LEGACY_LANG_KEY);
    return {
      themeMode: normalizeThemeMode(rawTheme),
      language: normalizeLanguageCode(rawLang),
    };
  } catch {
    return { themeMode: 'light', language: 'uz' };
  }
}

let cachedPrefs: AppPreferences = readWebInitialPreferences();
const listeners = new Set<(prefs: AppPreferences) => void>();

function notifyListeners() {
  for (const cb of listeners) {
    try {
      cb({ ...cachedPrefs });
    } catch {}
  }
}

export function getCachedPreferences(): AppPreferences {
  return { ...cachedPrefs };
}

export function subscribePreferences(cb: (prefs: AppPreferences) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

async function persistPreferences(next: AppPreferences): Promise<void> {
  cachedPrefs = next;
  notifyListeners();

  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
        window.localStorage.setItem(WEB_THEME_KEY, next.themeMode);
        window.localStorage.setItem(WEB_LANG_KEY, next.language);
        window.localStorage.setItem(LEGACY_LANG_KEY, next.language.toUpperCase());
      }
    } catch {}
    return;
  }

  const serialized = JSON.stringify(next);
  try {
    const kvDir = `${FileSystem.documentDirectory || ''}stb_offline/kv`;
    if (FileSystem.documentDirectory) {
      const dirInfo = await FileSystem.getInfoAsync(kvDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(kvDir, { intermediates: true });
      }
      await FileSystem.writeAsStringAsync(NATIVE_PREFS_FILE, serialized);
    }
  } catch {}

  try {
    await SecureStore.setItemAsync(PREFS_KEY, serialized);
  } catch {}
}

export async function loadAppPreferences(): Promise<AppPreferences> {
  if (Platform.OS === 'web') {
    cachedPrefs = readWebInitialPreferences();
    return { ...cachedPrefs };
  }

  // Try fast local FileSystem store first
  try {
    if (FileSystem.documentDirectory) {
      const info = await FileSystem.getInfoAsync(NATIVE_PREFS_FILE);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(NATIVE_PREFS_FILE);
        const parsed = JSON.parse(raw);
        cachedPrefs = {
          themeMode: normalizeThemeMode(parsed?.themeMode),
          language: normalizeLanguageCode(parsed?.language),
        };
        notifyListeners();
        return { ...cachedPrefs };
      }
    }
  } catch {}

  // Fallback to SecureStore
  try {
    const stored = await SecureStore.getItemAsync(PREFS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      cachedPrefs = {
        themeMode: normalizeThemeMode(parsed?.themeMode),
        language: normalizeLanguageCode(parsed?.language),
      };
      notifyListeners();
      return { ...cachedPrefs };
    }
    const legacyLang = await SecureStore.getItemAsync(LEGACY_LANG_KEY);
    if (legacyLang) {
      cachedPrefs = {
        themeMode: cachedPrefs.themeMode,
        language: normalizeLanguageCode(legacyLang),
      };
      notifyListeners();
      return { ...cachedPrefs };
    }
  } catch {}

  return { ...cachedPrefs };
}

export async function saveThemeMode(themeMode: AppThemeMode): Promise<void> {
  await persistPreferences({
    ...cachedPrefs,
    themeMode: normalizeThemeMode(themeMode),
  });
}

export async function saveLanguage(language: AppLanguage): Promise<void> {
  await persistPreferences({
    ...cachedPrefs,
    language: normalizeLanguageCode(language),
  });
}
