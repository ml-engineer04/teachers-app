import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ACCESS_TOKEN_KEY = 'STB_SECURE_ACCESS_TOKEN';
const REFRESH_TOKEN_KEY = 'STB_SECURE_REFRESH_TOKEN';
const DEVICE_ID_KEY = 'STB_SECURE_DEVICE_ID';
const USER_PROFILE_KEY = 'STB_USER_PROFILE_DATA';
const PIN_HASH_KEY = 'STB_SECURE_PIN_HASH';
const LAST_ACTIVITY_KEY = 'STB_LAST_ACTIVITY_AT';
const BIOMETRIC_ENABLED_KEY = 'STB_BIOMETRIC_ENABLED';

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

// High-speed In-Memory Cache to eliminate repeated Keystore IPC round-trips
let memAccessToken: string | null = null;
let memRefreshToken: string | null = null;
let memDeviceId: string | null = null;
let memUserProfile: any = null;
let memLastActivityAt: number | null = null;
let memPinHash: string | null = null;

async function hashPinSafely(pin: string): Promise<string> {
  const salted = `salt_stb_${pin}`;
  try {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salted);
  } catch {
    // Deterministic fallback hash for non-secure origins / Web environments
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < salted.length; i++) {
      const ch = salted.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0) + '';
  }
}

export const secureStorage = {
  /**
   * Retrieves or initializes a unique hardware/installation device UUID.
   * Stored securely so the device retains its stable hardware ID across restarts.
   */
  async getOrCreateDeviceId(): Promise<string> {
    if (memDeviceId) return memDeviceId;

    if (Platform.OS === 'web') {
      let devId = webStorage.get(DEVICE_ID_KEY);
      if (!devId) {
        devId = `web_${Crypto.randomUUID()}`;
        webStorage.set(DEVICE_ID_KEY, devId);
      }
      memDeviceId = devId;
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
      memDeviceId = devId;
      return devId;
    } catch {
      memDeviceId = `fallback_${Date.now()}`;
      return memDeviceId;
    }
  },

  /**
   * Saves Access and Refresh tokens into hardware-backed secure storage.
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    memAccessToken = accessToken;
    memRefreshToken = refreshToken;

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
    if (memAccessToken !== null) return memAccessToken;

    if (Platform.OS === 'web') {
      memAccessToken = webStorage.get(ACCESS_TOKEN_KEY);
      return memAccessToken;
    }
    try {
      memAccessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      return memAccessToken;
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    if (memRefreshToken !== null) return memRefreshToken;

    if (Platform.OS === 'web') {
      memRefreshToken = webStorage.get(REFRESH_TOKEN_KEY);
      return memRefreshToken;
    }
    try {
      memRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      return memRefreshToken;
    } catch {
      return null;
    }
  },

  async saveUserProfile(profile: any): Promise<void> {
    memUserProfile = profile;
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
    if (memUserProfile !== null) return memUserProfile as T;

    try {
      const data =
        Platform.OS === 'web'
          ? webStorage.get(USER_PROFILE_KEY)
          : await SecureStore.getItemAsync(USER_PROFILE_KEY);
      const parsed = data ? JSON.parse(data) : null;
      memUserProfile = parsed;
      return parsed;
    } catch {
      return null;
    }
  },

  async clearAuthTokens(): Promise<void> {
    memAccessToken = null;
    memRefreshToken = null;
    memUserProfile = null;
    memLastActivityAt = null;

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
    const hash = await hashPinSafely(pin);
    memPinHash = hash;
    webStorage.set(PIN_HASH_KEY, hash);
    if (Platform.OS !== 'web') {
      try {
        const options = Platform.OS === 'ios' ? { keychainAccessible: SecureStore.WHEN_UNLOCKED } : undefined;
        await SecureStore.setItemAsync(PIN_HASH_KEY, hash, options);
      } catch {}
    }
  },

  async verifyPinCode(pin: string): Promise<boolean> {
    try {
      const inputHash = await hashPinSafely(pin);
      if (memPinHash && memPinHash === inputHash) return true;

      let storedHash: string | null = null;
      if (Platform.OS === 'web') {
        storedHash = webStorage.get(PIN_HASH_KEY);
      } else {
        try {
          storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
        } catch {}
        if (!storedHash) {
          storedHash = webStorage.get(PIN_HASH_KEY);
        }
      }
      if (storedHash) memPinHash = storedHash;
      return !!storedHash && storedHash === inputHash;
    } catch {
      return false;
    }
  },

  async hasPinCode(): Promise<boolean> {
    if (memPinHash) return true;
    if (Platform.OS === 'web') {
      return !!webStorage.get(PIN_HASH_KEY);
    }
    try {
      const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
      if (stored) {
        memPinHash = stored;
        return true;
      }
    } catch {}
    const webStored = webStorage.get(PIN_HASH_KEY);
    if (webStored) {
      memPinHash = webStored;
      return true;
    }
    return false;
  },

  async clearPinCode(): Promise<void> {
    memPinHash = null;
    webStorage.delete(PIN_HASH_KEY);
    if (Platform.OS !== 'web') {
      try {
        await SecureStore.deleteItemAsync(PIN_HASH_KEY);
      } catch {}
    }
  },

  async saveLastActivityAt(timestampMs: number): Promise<void> {
    memLastActivityAt = timestampMs;
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
    if (memLastActivityAt !== null) return memLastActivityAt;

    let raw: string | null = null;
    if (Platform.OS === 'web') {
      raw = webStorage.get(LAST_ACTIVITY_KEY);
    } else {
      try {
        raw = await SecureStore.getItemAsync(LAST_ACTIVITY_KEY);
      } catch {}
    }
    const parsed = raw ? Number(raw) : NaN;
    const result = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    memLastActivityAt = result;
    return result;
  },

  async isBiometricEnabled(): Promise<boolean> {
    if (Platform.OS === 'web') {
      const val = webStorage.get(BIOMETRIC_ENABLED_KEY);
      return val === null ? true : val === 'true';
    }
    try {
      const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    const val = String(enabled);
    if (Platform.OS === 'web') {
      webStorage.set(BIOMETRIC_ENABLED_KEY, val);
      return;
    }
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, val);
    } catch {}
  },
};
