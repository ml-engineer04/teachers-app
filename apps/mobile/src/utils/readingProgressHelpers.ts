export interface ReadingProgressEntry {
  bookId: string;
  lastPageNumber: number;
  lastOpenedAt: string;
}

/**
 * Normalizes a user identifier (email or id) into a stable per-user storage key.
 */
export function normalizeProgressUserKey(userKey?: string | null): string {
  const normalized = typeof userKey === 'string' ? userKey.trim().toLowerCase() : '';
  return normalized || 'guest';
}

/**
 * Clamps a 1-based page number cleanly within the book's valid page range.
 */
export function clampBookPage(page: number | undefined | null, totalPages: number): number {
  const safeTotal = Math.max(1, Math.floor(Number(totalPages) || 1));
  const numericPage = Number(page);
  if (!Number.isFinite(numericPage) || numericPage < 1) {
    return 1;
  }
  return Math.min(safeTotal, Math.floor(numericPage));
}

/**
 * Parses an ISO timestamp into milliseconds since epoch (0 when invalid).
 */
export function parseOpenedAtMs(iso?: string | null): number {
  if (!iso || typeof iso !== 'string') return 0;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Picks the freshest valid entry between a local record and a remote record.
 */
export function pickFresherProgressEntry(
  localEntry?: ReadingProgressEntry | null,
  remoteEntry?: ReadingProgressEntry | null,
): ReadingProgressEntry | null {
  const validLocal =
    localEntry && localEntry.bookId && Number(localEntry.lastPageNumber) >= 1 ? localEntry : null;
  const validRemote =
    remoteEntry && remoteEntry.bookId && Number(remoteEntry.lastPageNumber) >= 1
      ? remoteEntry
      : null;

  if (!validLocal) return validRemote;
  if (!validRemote) return validLocal;

  const localMs = parseOpenedAtMs(validLocal.lastOpenedAt);
  const remoteMs = parseOpenedAtMs(validRemote.lastOpenedAt);
  return remoteMs > localMs ? validRemote : validLocal;
}

/**
 * Deduplicates and merges two reading-progress lists, keeping the newest entry per bookId.
 */
export function mergeReadingProgressLists(
  primary: ReadingProgressEntry[] = [],
  secondary: ReadingProgressEntry[] = [],
  maxItems = 50,
): ReadingProgressEntry[] {
  const byBook = new Map<string, ReadingProgressEntry>();

  const consider = (raw: any) => {
    if (!raw || typeof raw.bookId !== 'string' || !raw.bookId.trim()) return;
    const pageNum = Math.floor(Number(raw.lastPageNumber));
    if (!Number.isFinite(pageNum) || pageNum < 1) return;

    const candidate: ReadingProgressEntry = {
      bookId: raw.bookId.trim(),
      lastPageNumber: pageNum,
      lastOpenedAt:
        typeof raw.lastOpenedAt === 'string' && raw.lastOpenedAt
          ? raw.lastOpenedAt
          : '1970-01-01T00:00:00.000Z',
    };

    const existing = byBook.get(candidate.bookId);
    if (!existing) {
      byBook.set(candidate.bookId, candidate);
      return;
    }

    const existingMs = parseOpenedAtMs(existing.lastOpenedAt);
    const candidateMs = parseOpenedAtMs(candidate.lastOpenedAt);
    if (candidateMs > existingMs) {
      byBook.set(candidate.bookId, candidate);
    }
  };

  primary.forEach(consider);
  secondary.forEach(consider);

  return Array.from(byBook.values())
    .sort((a, b) => parseOpenedAtMs(b.lastOpenedAt) - parseOpenedAtMs(a.lastOpenedAt))
    .slice(0, maxItems);
}

/**
 * Resolves which page a book should open to when entering the reader.
 * Saved local/remote progress always takes priority over generic initial defaults
 * so reopening a book from Home, Search, Catalog, or Offline Drawer resumes accurately.
 */
export function resolveInitialBookPage(params: {
  explicitInitialPage?: number | null;
  localEntry?: ReadingProgressEntry | null;
  remoteEntry?: ReadingProgressEntry | null;
  totalPages: number;
}): number {
  const bestSaved = pickFresherProgressEntry(params.localEntry, params.remoteEntry);
  if (bestSaved) {
    return clampBookPage(bestSaved.lastPageNumber, params.totalPages);
  }
  return clampBookPage(params.explicitInitialPage ?? 1, params.totalPages);
}
