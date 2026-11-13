import { Platform } from 'react-native';
import { offlineStore } from './offlineStore';
import {
  clampBookPage,
  mergeReadingProgressLists,
  normalizeProgressUserKey,
  ReadingProgressEntry,
} from '../../utils/readingProgressHelpers';

const STORAGE_PREFIX = 'stb_reading_progress_v1:';
const OFFLINE_KEY_PREFIX = 'reading_progress_v1:';
const MAX_PROGRESS_BOOKS = 50;

class ReadingProgressStore {
  private memoryByUser = new Map<string, ReadingProgressEntry[]>();
  private hydratedUsers = new Set<string>();

  private getWebStorageKey(userKey?: string | null): string {
    return `${STORAGE_PREFIX}${normalizeProgressUserKey(userKey)}`;
  }

  private getOfflineStoreKey(userKey?: string | null): string {
    return `${OFFLINE_KEY_PREFIX}${normalizeProgressUserKey(userKey)}`;
  }

  private readWebSync(userKey?: string | null): ReadingProgressEntry[] {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(this.getWebStorageKey(userKey));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? mergeReadingProgressLists(parsed, [], MAX_PROGRESS_BOOKS) : [];
    } catch {
      return [];
    }
  }

  private writeWebSync(userKey: string | null | undefined, entries: ReadingProgressEntry[]): void {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(this.getWebStorageKey(userKey), JSON.stringify(entries));
    } catch {
      // Ignore quota / private mode storage errors
    }
  }

  private async persistList(
    userKey: string | null | undefined,
    entries: ReadingProgressEntry[],
  ): Promise<ReadingProgressEntry[]> {
    const scope = normalizeProgressUserKey(userKey);
    const cleaned = mergeReadingProgressLists(entries, [], MAX_PROGRESS_BOOKS);
    this.memoryByUser.set(scope, cleaned);
    this.hydratedUsers.add(scope);
    this.writeWebSync(scope, cleaned);
    await offlineStore.putJson(this.getOfflineStoreKey(scope), cleaned).catch(() => {});
    return cleaned;
  }

  /**
   * Synchronously reads cached progress (frame-1 Web localStorage or already-warmed memory)
   * so opening a book renders immediately at the remembered page with zero page-1 flash.
   */
  getBookProgressSync(userKey: string | null | undefined, bookId: string): ReadingProgressEntry | null {
    if (!bookId) return null;
    const scope = normalizeProgressUserKey(userKey);
    let list = this.memoryByUser.get(scope);
    if (!list) {
      const webList = this.readWebSync(scope);
      if (webList.length > 0) {
        this.memoryByUser.set(scope, webList);
        list = webList;
      }
    }
    return (list || []).find((item) => item.bookId === bookId) || null;
  }

  /**
   * Loads all persisted reading progress for the user from memory, localStorage, and offlineStore.
   */
  async getAllProgress(userKey?: string | null): Promise<ReadingProgressEntry[]> {
    const scope = normalizeProgressUserKey(userKey);
    const memList = this.memoryByUser.get(scope) || [];
    const webList = this.readWebSync(scope);

    if (this.hydratedUsers.has(scope) && memList.length > 0) {
      return mergeReadingProgressLists(memList, webList, MAX_PROGRESS_BOOKS);
    }

    const storedList =
      (await offlineStore.getJson<ReadingProgressEntry[]>(this.getOfflineStoreKey(scope)).catch(() => null)) ||
      [];

    const merged = mergeReadingProgressLists(webList, storedList, MAX_PROGRESS_BOOKS);
    const withMem = mergeReadingProgressLists(memList, merged, MAX_PROGRESS_BOOKS);
    this.memoryByUser.set(scope, withMem);
    this.hydratedUsers.add(scope);
    if (withMem.length > 0) {
      this.writeWebSync(scope, withMem);
    }
    return withMem;
  }

  /**
   * Returns the saved progress entry for a single book from persistent storage.
   */
  async getBookProgress(
    userKey: string | null | undefined,
    bookId: string,
  ): Promise<ReadingProgressEntry | null> {
    if (!bookId) return null;
    const all = await this.getAllProgress(userKey);
    return all.find((item) => item.bookId === bookId) || null;
  }

  /**
   * Updates and persists the remembered page number for a book immediately in memory,
   * synchronous Web storage, and durable IndexedDB / native FileSystem storage.
   */
  async saveBookProgress(
    userKey: string | null | undefined,
    bookId: string,
    pageNumber: number,
    totalPages = 9999,
    lastOpenedAt = new Date().toISOString(),
  ): Promise<ReadingProgressEntry> {
    const scope = normalizeProgressUserKey(userKey);
    const clampedPage = clampBookPage(pageNumber, totalPages);
    const nextEntry: ReadingProgressEntry = {
      bookId,
      lastPageNumber: clampedPage,
      lastOpenedAt,
    };

    const current = this.memoryByUser.get(scope) || this.readWebSync(scope);
    const nextList = mergeReadingProgressLists([nextEntry], current, MAX_PROGRESS_BOOKS);
    // Write synchronously first so instant tab close/reload or immediate Home return sees it
    this.memoryByUser.set(scope, nextList);
    this.hydratedUsers.add(scope);
    this.writeWebSync(scope, nextList);
    await offlineStore.putJson(this.getOfflineStoreKey(scope), nextList).catch(() => {});
    return nextEntry;
  }

  /**
   * Merges backend reading progress with durable device progress, always keeping whichever
   * record has the newest timestamp per bookId and updating device cache accordingly.
   */
  async mergeRemoteAndLocal(
    userKey: string | null | undefined,
    remoteList: ReadingProgressEntry[] | null | undefined,
  ): Promise<ReadingProgressEntry[]> {
    const localList = await this.getAllProgress(userKey);
    const merged = mergeReadingProgressLists(localList, remoteList || [], MAX_PROGRESS_BOOKS);
    if (merged.length > 0) {
      await this.persistList(userKey, merged);
    }
    return merged;
  }
}

export const readingProgressStore = new ReadingProgressStore();
export type { ReadingProgressEntry };
