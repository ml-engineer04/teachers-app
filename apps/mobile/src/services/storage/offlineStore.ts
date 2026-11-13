import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const DB_NAME = 'stb_offline_db_v2';
const DB_VERSION = 1;
const STORE_KV = 'kv';
const STORE_ASSETS = 'assets';
const LS_FALLBACK_PREFIX = 'stb_offline_kv_';

export interface StoredBinaryAsset {
  key: string;
  mimeType: string;
  sizeBytes: number;
  data: ArrayBuffer;
  updatedAt: string;
}

export interface BinaryDownloadResult {
  key: string;
  sizeBytes: number;
  mimeType: string;
}

function sanitizeKey(key: string): string {
  return encodeURIComponent(key).replace(/%/g, '_');
}

function isIndexedDbAvailable(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.indexedDB !== 'undefined'
  );
}

class OfflineStoreEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private nativeDirsReady = false;
  private blobUrlCache = new Map<string, string>();

  private getNativeBaseDir(): string {
    return `${FileSystem.documentDirectory || ''}stb_offline/`;
  }

  private async ensureNativeDirs(): Promise<void> {
    if (Platform.OS === 'web' || this.nativeDirsReady) return;
    const base = this.getNativeBaseDir();
    await FileSystem.makeDirectoryAsync(`${base}kv/`, { intermediates: true }).catch(() => {});
    await FileSystem.makeDirectoryAsync(`${base}assets/`, { intermediates: true }).catch(() => {});
    this.nativeDirsReady = true;
  }

  private openDb(): Promise<IDBDatabase> {
    if (!isIndexedDbAvailable()) {
      return Promise.reject(new Error('IndexedDB is unavailable'));
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_ASSETS)) {
          db.createObjectStore(STORE_ASSETS, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        this.dbPromise = null;
        reject(req.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  private async idbGet<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  private async idbPut(storeName: string, record: any): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
    });
  }

  private async idbDelete(storeName: string, key: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async idbListKeys(storeName: string, prefix?: string): Promise<string[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const all = (req.result || []).map(String);
        resolve(prefix ? all.filter((k) => k.startsWith(prefix)) : all);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // =========================================================================
  // JSON Key-Value Storage (Cross-Platform Web IndexedDB + Native FileSystem)
  // =========================================================================

  async putJson<T>(key: string, value: T): Promise<void> {
    if (Platform.OS === 'web') {
      if (isIndexedDbAvailable()) {
        await this.idbPut(STORE_KV, {
          key,
          value,
          updatedAt: new Date().toISOString(),
        });
      }
      // Keep light localStorage mirror only for small keys so index/catalog boots fast
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = JSON.stringify(value);
          if (raw.length < 256 * 1024) {
            window.localStorage.setItem(`${LS_FALLBACK_PREFIX}${key}`, raw);
          }
        }
      } catch {
        // Ignore quota errors on secondary mirror
      }
      return;
    }

    await this.ensureNativeDirs();
    const filePath = `${this.getNativeBaseDir()}kv/${sanitizeKey(key)}.json`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(value));
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (Platform.OS === 'web') {
      if (isIndexedDbAvailable()) {
        try {
          const rec = await this.idbGet<{ key: string; value: T }>(STORE_KV, key);
          if (rec && rec.value !== undefined) return rec.value;
        } catch {
          // Fall through to localStorage fallback
        }
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(`${LS_FALLBACK_PREFIX}${key}`);
          if (raw) return JSON.parse(raw) as T;
        }
      } catch {
        return null;
      }
      return null;
    }

    try {
      await this.ensureNativeDirs();
      const filePath = `${this.getNativeBaseDir()}kv/${sanitizeKey(key)}.json`;
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) return null;
      const raw = await FileSystem.readAsStringAsync(filePath);
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async deleteJson(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (isIndexedDbAvailable()) {
        await this.idbDelete(STORE_KV, key).catch(() => {});
      }
      try {
        window?.localStorage?.removeItem(`${LS_FALLBACK_PREFIX}${key}`);
      } catch {}
      return;
    }
    const filePath = `${this.getNativeBaseDir()}kv/${sanitizeKey(key)}.json`;
    await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {});
  }

  // =========================================================================
  // Binary Asset Storage (PDFs, Audio, Video, Page Images, Vendor Scripts)
  // =========================================================================

  async putBinary(key: string, data: ArrayBuffer, mimeType: string): Promise<number> {
    const cleanType = mimeType || 'application/octet-stream';
    const sizeBytes = data.byteLength;

    if (Platform.OS === 'web') {
      this.revokeBlobUrl(key);
      if (!isIndexedDbAvailable()) {
        throw new Error('Brauzer IndexedDB xotirasi mavjud emas');
      }
      await this.idbPut(STORE_ASSETS, {
        key,
        mimeType: cleanType,
        sizeBytes,
        data,
        updatedAt: new Date().toISOString(),
      });
      return sizeBytes;
    }

    await this.ensureNativeDirs();
    const targetPath = `${this.getNativeBaseDir()}assets/${sanitizeKey(key)}`;
    const base64 = this.arrayBufferToBase64(data);
    await FileSystem.writeAsStringAsync(targetPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return sizeBytes;
  }

  async putTextAsset(key: string, text: string, mimeType = 'text/plain; charset=utf-8'): Promise<number> {
    const encoded = new TextEncoder().encode(text);
    return this.putBinary(key, encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength), mimeType);
  }

  async getTextAsset(key: string): Promise<string | null> {
    const bin = await this.getBinary(key);
    if (!bin) return null;
    return new TextDecoder().decode(bin.data);
  }

  async getBinary(key: string): Promise<{ data: ArrayBuffer; mimeType: string; sizeBytes: number } | null> {
    if (Platform.OS === 'web') {
      if (!isIndexedDbAvailable()) return null;
      const rec = await this.idbGet<StoredBinaryAsset>(STORE_ASSETS, key).catch(() => null);
      if (!rec || !rec.data) return null;
      return {
        data: rec.data,
        mimeType: rec.mimeType || 'application/octet-stream',
        sizeBytes: rec.sizeBytes || rec.data.byteLength,
      };
    }

    try {
      await this.ensureNativeDirs();
      const targetPath = `${this.getNativeBaseDir()}assets/${sanitizeKey(key)}`;
      const info = await FileSystem.getInfoAsync(targetPath);
      if (!info.exists) return null;
      const base64 = await FileSystem.readAsStringAsync(targetPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const buf = this.base64ToArrayBuffer(base64);
      return {
        data: buf,
        mimeType: 'application/octet-stream',
        sizeBytes: buf.byteLength,
      };
    } catch {
      return null;
    }
  }

  async downloadBinary(
    key: string,
    remoteUrl: string,
    headers: Record<string, string> = {},
    onProgress?: (ratio: number) => void,
  ): Promise<BinaryDownloadResult> {
    if (Platform.OS === 'web') {
      const res = await fetch(remoteUrl, { headers });
      if (!res.ok) {
        throw new Error(`Faylni yuklab bo‘lmadi (HTTP ${res.status})`);
      }

      const mimeType =
        res.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream';
      const contentLength = Number(res.headers.get('content-length') || 0);

      let buffer: ArrayBuffer;
      if (res.body && typeof res.body.getReader === 'function' && contentLength > 0) {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        // Stream chunks to compute real byte-level download percentage
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.byteLength;
            onProgress?.(Math.min(1, received / contentLength));
          }
        }
        const merged = new Uint8Array(received);
        let offset = 0;
        for (const c of chunks) {
          merged.set(c, offset);
          offset += c.byteLength;
        }
        buffer = merged.buffer;
      } else {
        buffer = await res.arrayBuffer();
        onProgress?.(1);
      }

      if (buffer.byteLength === 0) {
        throw new Error('Yuklab olingan fayl bo‘sh');
      }

      await this.putBinary(key, buffer, mimeType);
      return { key, sizeBytes: buffer.byteLength, mimeType };
    }

    await this.ensureNativeDirs();
    const targetPath = `${this.getNativeBaseDir()}assets/${sanitizeKey(key)}`;
    const downloadResumable = FileSystem.createDownloadResumable(
      remoteUrl,
      targetPath,
      { headers },
      (dp) => {
        if (dp.totalBytesExpectedToWrite > 0) {
          onProgress?.(
            Math.min(1, dp.totalBytesWritten / dp.totalBytesExpectedToWrite),
          );
        }
      },
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || (result.status !== 200 && result.status !== 206)) {
      await FileSystem.deleteAsync(targetPath, { idempotent: true }).catch(() => {});
      throw new Error(`Faylni yuklab bo‘lmadi (HTTP ${result?.status || 0})`);
    }
    const info = await FileSystem.getInfoAsync(targetPath);
    const sizeBytes = info.exists && 'size' in info ? Number(info.size || 0) : 0;
    onProgress?.(1);
    return {
      key,
      sizeBytes,
      mimeType: result.headers?.['content-type'] || 'application/octet-stream',
    };
  }

  async hasBinary(key: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (!isIndexedDbAvailable()) return false;
      const keys = await this.idbListKeys(STORE_ASSETS, key).catch((): string[] => []);
      return keys.includes(key);
    }
    const targetPath = `${this.getNativeBaseDir()}assets/${sanitizeKey(key)}`;
    const info = await FileSystem.getInfoAsync(targetPath).catch(() => null);
    return Boolean(info?.exists);
  }

  async getAssetPlayableUri(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      const existing = this.blobUrlCache.get(key);
      if (existing) return existing;

      const asset = await this.getBinary(key);
      if (!asset) return null;
      const blob = new Blob([asset.data], { type: asset.mimeType });
      const blobUrl = URL.createObjectURL(blob);
      this.blobUrlCache.set(key, blobUrl);
      return blobUrl;
    }

    await this.ensureNativeDirs();
    const targetPath = `${this.getNativeBaseDir()}assets/${sanitizeKey(key)}`;
    const info = await FileSystem.getInfoAsync(targetPath).catch(() => null);
    return info?.exists ? targetPath : null;
  }

  async deleteBinary(key: string): Promise<void> {
    this.revokeBlobUrl(key);
    if (Platform.OS === 'web') {
      if (isIndexedDbAvailable()) {
        await this.idbDelete(STORE_ASSETS, key).catch(() => {});
      }
      return;
    }
    const targetPath = `${this.getNativeBaseDir()}assets/${sanitizeKey(key)}`;
    await FileSystem.deleteAsync(targetPath, { idempotent: true }).catch(() => {});
  }

  async deleteAssetsByPrefix(prefix: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (!isIndexedDbAvailable()) return;
      const keys = await this.idbListKeys(STORE_ASSETS, prefix).catch(() => []);
      for (const k of keys) {
        await this.deleteBinary(k);
      }
      return;
    }
    await this.ensureNativeDirs();
    const assetsDir = `${this.getNativeBaseDir()}assets/`;
    const files = await FileSystem.readDirectoryAsync(assetsDir).catch(() => []);
    const sanitizedPrefix = sanitizeKey(prefix);
    for (const file of files) {
      if (file.startsWith(sanitizedPrefix)) {
        await FileSystem.deleteAsync(`${assetsDir}${file}`, { idempotent: true }).catch(() => {});
      }
    }
  }

  async clearAll(): Promise<void> {
    this.blobUrlCache.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    this.blobUrlCache.clear();

    if (Platform.OS === 'web') {
      if (isIndexedDbAvailable()) {
        const db = await this.openDb().catch(() => null);
        if (db) {
          await new Promise<void>((resolve) => {
            const tx = db.transaction([STORE_KV, STORE_ASSETS], 'readwrite');
            tx.objectStore(STORE_KV).clear();
            tx.objectStore(STORE_ASSETS).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          });
        }
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          Object.keys(window.localStorage).forEach((k) => {
            if (k.startsWith(LS_FALLBACK_PREFIX)) {
              window.localStorage.removeItem(k);
            }
          });
        }
      } catch {}
      return;
    }

    await FileSystem.deleteAsync(this.getNativeBaseDir(), { idempotent: true }).catch(() => {});
    this.nativeDirsReady = false;
  }

  private revokeBlobUrl(key: string): void {
    const existing = this.blobUrlCache.get(key);
    if (existing && typeof URL !== 'undefined') {
      try {
        URL.revokeObjectURL(existing);
      } catch {}
      this.blobUrlCache.delete(key);
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunkSize)),
      );
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const offlineStore = new OfflineStoreEngine();
