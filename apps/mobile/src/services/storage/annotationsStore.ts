import { Platform } from 'react-native';
import { offlineStore } from './offlineStore';
import { normalizeProgressUserKey } from '../../utils/readingProgressHelpers';
import {
  BookAnnotationsPayload,
  BookmarkRecord,
  createEmptyAnnotationsPayload,
  DrawStrokeRecord,
  NoteRecord,
} from '../../utils/annotationHelpers';

const STORAGE_PREFIX = 'stb_annotations_v1:';
const OFFLINE_KEY_PREFIX = 'annotations_v1:';

class AnnotationsStore {
  private memoryCache = new Map<string, BookAnnotationsPayload>();

  private getScopeKey(userKey: string | null | undefined, bookId: string): string {
    return `${normalizeProgressUserKey(userKey)}:${bookId}`;
  }

  private getWebKey(scopeKey: string): string {
    return `${STORAGE_PREFIX}${scopeKey}`;
  }

  private getOfflineKey(scopeKey: string): string {
    return `${OFFLINE_KEY_PREFIX}${scopeKey}`;
  }

  private readWebSync(scopeKey: string): BookAnnotationsPayload | null {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(this.getWebKey(scopeKey));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as BookAnnotationsPayload) : null;
    } catch {
      return null;
    }
  }

  private writeWebSync(scopeKey: string, payload: BookAnnotationsPayload): void {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(this.getWebKey(scopeKey), JSON.stringify(payload));
    } catch {
      // Ignore Web storage quota / private browsing failures
    }
  }

  private async persistPayload(
    scopeKey: string,
    payload: BookAnnotationsPayload,
  ): Promise<BookAnnotationsPayload> {
    this.memoryCache.set(scopeKey, payload);
    this.writeWebSync(scopeKey, payload);
    await offlineStore.putJson(this.getOfflineKey(scopeKey), payload).catch(() => {});
    return payload;
  }

  /**
   * Synchronously reads cached personal annotations for instant frame-1 rendering on Web/warm memory.
   */
  getBookAnnotationsSync(
    userKey: string | null | undefined,
    bookId: string,
  ): BookAnnotationsPayload {
    if (!bookId) return createEmptyAnnotationsPayload();
    const scopeKey = this.getScopeKey(userKey, bookId);
    const cached = this.memoryCache.get(scopeKey);
    if (cached) return cached;
    const webCached = this.readWebSync(scopeKey);
    if (webCached) {
      this.memoryCache.set(scopeKey, webCached);
      return webCached;
    }
    return createEmptyAnnotationsPayload();
  }

  /**
   * Loads durable device-local teacher annotations (drawings, bookmarks, personal notes)
   * without altering shared textbook data in any backend database.
   */
  async getBookAnnotations(
    userKey: string | null | undefined,
    bookId: string,
  ): Promise<BookAnnotationsPayload> {
    if (!bookId) return createEmptyAnnotationsPayload();
    const scopeKey = this.getScopeKey(userKey, bookId);
    const syncVal = this.memoryCache.get(scopeKey) || this.readWebSync(scopeKey);
    const idbVal = await offlineStore
      .getJson<BookAnnotationsPayload>(this.getOfflineKey(scopeKey))
      .catch(() => null);

    if (syncVal && idbVal) {
      const winner =
        Date.parse(idbVal.updatedAt || '') > Date.parse(syncVal.updatedAt || '') ? idbVal : syncVal;
      this.memoryCache.set(scopeKey, winner);
      return winner;
    }
    const chosen = syncVal || idbVal || createEmptyAnnotationsPayload();
    if (syncVal || idbVal) {
      this.memoryCache.set(scopeKey, chosen);
    }
    return chosen;
  }

  /**
   * Saves marker / pen strokes for a specific page permanently to this device.
   */
  async savePageDrawings(
    userKey: string | null | undefined,
    bookId: string,
    pageNumber: number,
    strokes: DrawStrokeRecord[],
  ): Promise<BookAnnotationsPayload> {
    const scopeKey = this.getScopeKey(userKey, bookId);
    const existing = await this.getBookAnnotations(userKey, bookId);
    const modifiedSet = new Set<number>(existing.modifiedPages || []);
    modifiedSet.add(pageNumber);

    const nextPayload: BookAnnotationsPayload = {
      ...existing,
      updatedAt: new Date().toISOString(),
      modifiedPages: Array.from(modifiedSet),
      drawings: {
        ...(existing.drawings || {}),
        [pageNumber]: Array.isArray(strokes) ? strokes : [],
      },
    };
    return this.persistPayload(scopeKey, nextPayload);
  }

  /**
   * Saves teacher bookmarks locally on the device.
   */
  async saveBookmarks(
    userKey: string | null | undefined,
    bookId: string,
    bookmarks: BookmarkRecord[],
  ): Promise<BookAnnotationsPayload> {
    const scopeKey = this.getScopeKey(userKey, bookId);
    const existing = await this.getBookAnnotations(userKey, bookId);
    const nextPayload: BookAnnotationsPayload = {
      ...existing,
      updatedAt: new Date().toISOString(),
      bookmarksModified: true,
      bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
    };
    return this.persistPayload(scopeKey, nextPayload);
  }

  /**
   * Saves personal teacher notes locally on the device.
   */
  async saveNotes(
    userKey: string | null | undefined,
    bookId: string,
    notes: NoteRecord[],
  ): Promise<BookAnnotationsPayload> {
    const scopeKey = this.getScopeKey(userKey, bookId);
    const existing = await this.getBookAnnotations(userKey, bookId);
    const nextPayload: BookAnnotationsPayload = {
      ...existing,
      updatedAt: new Date().toISOString(),
      notesModified: true,
      notes: Array.isArray(notes) ? notes : [],
    };
    return this.persistPayload(scopeKey, nextPayload);
  }
}

export const annotationsStore = new AnnotationsStore();
