export type WebThemeMode = 'light' | 'dark';
export type WebLanguage = 'uz' | 'ru' | 'en';

const ACCESS_TOKEN_KEY = 'STB_WEB_ACCESS_TOKEN';
const REFRESH_TOKEN_KEY = 'STB_WEB_REFRESH_TOKEN';
const DEVICE_ID_KEY = 'STB_WEB_DEVICE_ID';
const USER_PROFILE_KEY = 'STB_WEB_USER_PROFILE';
const THEME_KEY = 'STB_WEB_THEME_MODE';
const LANG_KEY = 'STB_WEB_LANG';
const PIN_HASH_KEY = 'STB_WEB_PIN_HASH';

function getLocal(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return null;
}

function setLocal(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
}

function removeLocal(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export const webStorage = {
  getOrCreateDeviceId(): string {
    let id = getLocal(DEVICE_ID_KEY);
    if (!id) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = `web_${crypto.randomUUID()}`;
      } else {
        id = `web_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      }
      setLocal(DEVICE_ID_KEY, id);
    }
    return id;
  },

  getAccessToken(): string | null {
    return getLocal(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return getLocal(REFRESH_TOKEN_KEY);
  },

  saveTokens(accessToken: string, refreshToken: string): void {
    setLocal(ACCESS_TOKEN_KEY, accessToken);
    setLocal(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearAuthTokens(): void {
    removeLocal(ACCESS_TOKEN_KEY);
    removeLocal(REFRESH_TOKEN_KEY);
    removeLocal(USER_PROFILE_KEY);
  },

  getUserProfile<T = any>(): T | null {
    const raw = getLocal(USER_PROFILE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  saveUserProfile(profile: any): void {
    if (profile == null) {
      removeLocal(USER_PROFILE_KEY);
    } else {
      setLocal(USER_PROFILE_KEY, JSON.stringify(profile));
    }
  },

  getTheme(): WebThemeMode {
    const raw = getLocal(THEME_KEY);
    return raw === 'dark' ? 'dark' : 'light';
  },

  saveTheme(mode: WebThemeMode): void {
    setLocal(THEME_KEY, mode);
  },

  getLanguage(): WebLanguage {
    const raw = getLocal(LANG_KEY);
    if (raw === 'ru' || raw === 'en') return raw;
    return 'uz';
  },

  saveLanguage(lang: WebLanguage): void {
    setLocal(LANG_KEY, lang);
  },

  getPinHash(): string | null {
    return getLocal(PIN_HASH_KEY);
  },

  savePinHash(hash: string): void {
    setLocal(PIN_HASH_KEY, hash);
  },

  clearPinHash(): void {
    removeLocal(PIN_HASH_KEY);
  },
};
