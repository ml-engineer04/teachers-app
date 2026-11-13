import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ACCESS_TOKEN_KEY = 'STB_SECURE_ACCESS_TOKEN';
const REFRESH_TOKEN_KEY = 'STB_SECURE_REFRESH_TOKEN';
const DEVICE_ID_KEY = 'STB_SECURE_DEVICE_ID';
const USER_PROFILE_KEY = 'STB_USER_PROFILE_DATA';
const PIN_HASH_KEY = 'STB_SECURE_PIN_HASH';
const LAST_ACTIVITY_KEY = 'STB_LAST_ACTIVITY_AT';

// Fallback in-memory/localStorage store for Web development preview
const webStorage = {
  get: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  set: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
  },
  delete: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  },
};

export const secureStorage = {
  /**
   * Retrieves or initializes a unique hardware/installation device UUID.
   * Stored securely so the device retains its stable hardware ID across restarts.
   */
  async getOrCreateDeviceId(): Promise<string> {
    if (Platform.OS === 'web') {
      let devId = webStorage.get(DEVICE_ID_KEY);
      if (!devId) {
        devId = `web_${Crypto.randomUUID()}`;
        webStorage.set(DEVICE_ID_KEY, devId);
      }
      return devId;
    }

    try {
      let devId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!devId) {
        devId = `android_${Crypto.randomUUID()}`;
        await SecureStore.setItemAsync(DEVICE_ID_KEY, devId, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      }
      return devId;
    } catch {
      return `fallback_${Date.now()}`;
    }
  },

  /**
   * Saves Access and Refresh tokens into hardware-backed secure storage.
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (Platform.OS === 'web') {
      webStorage.set(ACCESS_TOKEN_KEY, accessToken);
      webStorage.set(REFRESH_TOKEN_KEY, refreshToken);
      return;
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  },

  async getAccessToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return webStorage.get(ACCESS_TOKEN_KEY);
    }
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return webStorage.get(REFRESH_TOKEN_KEY);
    }
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async saveUserProfile(profile: any): Promise<void> {
    const json = JSON.stringify(profile);
    if (Platform.OS === 'web') {
      webStorage.set(USER_PROFILE_KEY, json);
      return;
    }
    await SecureStore.setItemAsync(USER_PROFILE_KEY, json, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  },

  async getUserProfile<T = any>(): Promise<T | null> {
    try {
      const data =
        Platform.OS === 'web'
          ? webStorage.get(USER_PROFILE_KEY)
          : await SecureStore.getItemAsync(USER_PROFILE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async clearAuthTokens(): Promise<void> {
    if (Platform.OS === 'web') {
      webStorage.delete(ACCESS_TOKEN_KEY);
      webStorage.delete(REFRESH_TOKEN_KEY);
      webStorage.delete(USER_PROFILE_KEY);
      webStorage.delete(PIN_HASH_KEY);
      webStorage.delete(LAST_ACTIVITY_KEY);
      return;
    }

    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
      await SecureStore.deleteItemAsync(PIN_HASH_KEY);
      await SecureStore.deleteItemAsync(LAST_ACTIVITY_KEY);
    } catch {}
  },

  /**
   * 4-Digit Quick Unlock PIN Code Management
   */
  async savePinCode(pin: string): Promise<void> {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `salt_stb_${pin}`);
    if (Platform.OS === 'web') {
      webStorage.set(PIN_HASH_KEY, hash);
      return;
    }
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  },

  async verifyPinCode(pin: string): Promise<boolean> {
    const inputHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `salt_stb_${pin}`);
    let storedHash: string | null = null;
    if (Platform.OS === 'web') {
      storedHash = webStorage.get(PIN_HASH_KEY);
    } else {
      try {
        storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
      } catch {}
    }
    return !!storedHash && storedHash === inputHash;
  },

  async hasPinCode(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return !!webStorage.get(PIN_HASH_KEY);
    }
    try {
      const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
      return !!stored;
    } catch {
      return false;
    }
  },

  async clearPinCode(): Promise<void> {
    if (Platform.OS === 'web') {
      webStorage.delete(PIN_HASH_KEY);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(PIN_HASH_KEY);
    } catch {}
  },

  async saveLastActivityAt(timestampMs: number): Promise<void> {
    const raw = String(timestampMs);
    if (Platform.OS === 'web') {
      webStorage.set(LAST_ACTIVITY_KEY, raw);
      return;
    }
    try {
      await SecureStore.setItemAsync(LAST_ACTIVITY_KEY, raw);
    } catch {}
  },

  async getLastActivityAt(): Promise<number | null> {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      raw = webStorage.get(LAST_ACTIVITY_KEY);
    } else {
      try {
        raw = await SecureStore.getItemAsync(LAST_ACTIVITY_KEY);
      } catch {}
    }
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  },
};
