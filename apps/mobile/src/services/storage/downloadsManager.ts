import { Platform } from 'react-native';
import { normalizeContentStartPage } from '@smartteacherbook/shared';
import { API_BASE, API_ORIGIN, mobileApi, resolveAssetUrl } from '../api/mobileApi';
import { secureStorage } from './secureStorage';
import { offlineStore } from './offlineStore';

const INDEX_KEY = 'downloads_index_v2';
const PKG_PREFIX = 'book_pkg_v2:';
const LEGACY_LS_KEY = 'stb_offline_bundles_v2';

export interface DownloadedItem {
  key: string;
  bookId: string;
  gradeId: number;
  subjectCode: string;
  subjectId?: string;
  title: string;
  bookType?: string;
  totalPages: number;
  contentStartPdfPage?: number;
  coverImageUrl?: string;
  hasPdf: boolean;
  assetsCount: number;
  sizeBytes: number;
  downloadedAt: string;
  isEncrypted: boolean;
}

export interface OfflineBookPackage {
  version: 2;
  bookId: string;
  downloadedAt: string;
  sizeBytes: number;
  book: {
    id: string;
    title: string;
    gradeId: number;
    subjectId: string;
    totalPages: number;
    contentStartPdfPage?: number;
    type?: string;
    coverImageUrl?: string;
  };
  pdfInfo: { hasPdf: boolean; totalPages: number; contentStartPdfPage?: number };
  pdfAssetKey?: string;
  pages: any[];
  hotspots: any[];
  media: any[];
  answerMappings: any[];
  answerKeys: any[];
  toc: any[];
  bookmarks: any[];
  notes: any[];
  drawings: any[];
  assetUrlMap: Record<string, string>;
}

function makeBundleKey(gradeId: number, subjectCode: string, bookId?: string): string {
  return `${gradeId}_${subjectCode || 'ALL'}_${bookId || 'bundle'}`;
}

function inferAssetExtension(rawUrl: string, fallbackExt = ''): string {
  try {
    const clean = rawUrl.split('#')[0].split('?')[0];
    const lastSeg = clean.split('/').pop() || '';
    const m = lastSeg.match(/\.([a-z0-9]{2,5})$/i);
    if (m?.[1]) {
      return `.${m[1].toLowerCase()}`;
    }
  } catch {}
  return fallbackExt;
}

export function normalizeUrlKeys(rawUrl?: string | null): string[] {
  if (!rawUrl || typeof rawUrl !== 'string') return [];
  const keys = new Set<string>();
  const trimmed = rawUrl.trim();
  if (!trimmed) return [];
  keys.add(trimmed);
  const resolved = resolveAssetUrl(trimmed);
  if (resolved) {
    keys.add(resolved);
    try {
      const parsed = new URL(resolved);
      const pathWithQuery = `${parsed.pathname}${parsed.search}`;
      keys.add(pathWithQuery);
      if (parsed.pathname.startsWith('/api/v1/')) {
        keys.add(`${API_ORIGIN}${pathWithQuery}`);
        keys.add(`http://localhost:4000${pathWithQuery}`);
      }
    } catch {
      // Relative path already added
    }
  }
  return Array.from(keys);
}

async function fetchStrictJson<T>(endpoint: string): Promise<T> {
  const token = await secureStorage.getAccessToken();
  const buildHeaders = (tok: string | null): Record<string, string> => ({
    Accept: 'application/json',
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
  });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: buildHeaders(token),
    });
  } catch {
    throw new Error('Internet aloqasi yo‘q. Yuklab olish uchun tarmoqqa ulaning.');
  }

  if (res.status === 401) {
    const rt = await secureStorage.getRefreshToken();
    const deviceId = await secureStorage.getOrCreateDeviceId();
    if (rt) {
      const refreshed = await mobileApi.refreshToken(rt, deviceId).catch(() => null);
      if (refreshed?.accessToken) {
        await secureStorage.saveTokens(refreshed.accessToken, refreshed.refreshToken);
        res = await fetch(`${API_BASE}${endpoint}`, {
          method: 'GET',
          headers: buildHeaders(refreshed.accessToken),
        });
      }
    }
  }

  if (!res.ok) {
    let msg = `Server xatosi (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) {
        msg = Array.isArray(body.message) ? body.message[0] : String(body.message);
      }
    } catch {}
    const err: any = new Error(msg);
    err.statusCode = res.status;
    throw err;
  }

  return (await res.json()) as T;
}

/**
 * Production offline bundle downloader & repository.
 * Persists complete PDF binaries, page images, hotspots, audio/video files, TOC,
 * answer keys, bookmarks, notes, and drawings into IndexedDB (Web) or expo-file-system (Native).
 */
export class DownloadsManager {
  private static indexCache: DownloadedItem[] = [];
  private static initialized = false;
  private static initPromise: Promise<void> | null = null;

  static async init(): Promise<DownloadedItem[]> {
    if (this.initialized) return [...this.indexCache];
    if (this.initPromise) {
      await this.initPromise;
      return [...this.indexCache];
    }

    this.initPromise = (async () => {
      // Remove stale metadata-only localStorage entries from the legacy implementation
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(LEGACY_LS_KEY);
        }
      } catch {}

      const stored = await offlineStore.getJson<DownloadedItem[]>(INDEX_KEY).catch(() => null);
      const valid: DownloadedItem[] = [];
      if (Array.isArray(stored)) {
        for (const item of stored) {
          if (!item?.bookId) continue;
          const pkg = await offlineStore.getJson<OfflineBookPackage>(`${PKG_PREFIX}${item.bookId}`).catch(() => null);
          if (pkg && (!pkg.pdfInfo?.hasPdf || (pkg.pdfAssetKey && (await offlineStore.hasBinary(pkg.pdfAssetKey))))) {
            valid.push(item);
          }
        }
      }
      this.indexCache = valid;
      if (Array.isArray(stored) && valid.length !== stored.length) {
        await offlineStore.putJson(INDEX_KEY, valid).catch(() => {});
      }
      this.initialized = true;
    })();

    await this.initPromise;
    return [...this.indexCache];
  }

  static listDownloadedBundles(): DownloadedItem[] {
    return [...this.indexCache];
  }

  static getAllDownloadedBundles(): DownloadedItem[] {
    return this.listDownloadedBundles();
  }

  static async refreshIndex(): Promise<DownloadedItem[]> {
    this.initialized = false;
    this.initPromise = null;
    return this.init();
  }

  static isBundleDownloaded(gradeId: number, subjectCode: string, bookId?: string): boolean {
    if (bookId) {
      return this.indexCache.some((d) => d.bookId === bookId);
    }
    const key = makeBundleKey(gradeId, subjectCode, bookId);
    return this.indexCache.some((d) => d.key === key || d.gradeId === gradeId);
  }

  static getTotalStorageMb(): number {
    const totalBytes = this.indexCache.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    return Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
  }

  static getTotalStorageUsedMb(): number {
    return this.getTotalStorageMb();
  }

  static async downloadBundle(
    gradeId: number,
    subjectCode: string,
    onProgress?: (pct: number) => void,
    bookId?: string,
    bookTitle?: string,
  ): Promise<DownloadedItem> {
    await this.init();

    if (!bookId) {
      throw new Error('Yuklab olish uchun darslik tanlanmadi');
    }

    const report = (pct: number) => {
      onProgress?.(Math.min(100, Math.max(0, Math.round(pct))));
    };

    report(4);

    // 1. Fetch strict core metadata from backend (throws explicitly when offline)
    const [bookData, pdfInfo, rawPages, rawHotspots, rawToc, rawBookMedia, rawAllMedia, rawAnswerKeys] =
      await Promise.all([
        fetchStrictJson<any>(`/content/books/${encodeURIComponent(bookId)}`),
        fetchStrictJson<{ hasPdf: boolean; totalPages: number }>(
          `/content/books/${encodeURIComponent(bookId)}/has-pdf`,
        ),
        fetchStrictJson<any[]>(`/content/books/${encodeURIComponent(bookId)}/pages`),
        fetchStrictJson<any[]>(`/content/books/${encodeURIComponent(bookId)}/hotspots`),
        fetchStrictJson<any[]>(`/content/books/${encodeURIComponent(bookId)}/toc`),
        fetchStrictJson<any[]>(`/content/media?bookId=${encodeURIComponent(bookId)}`),
        fetchStrictJson<any[]>(`/content/media`),
        fetchStrictJson<any[]>(`/content/answers?studentBookId=${encodeURIComponent(bookId)}`).catch((err) => {
          if (err?.statusCode === 404) return [];
          throw err;
        }),
      ]);

    report(18);

    const effectiveGrade = Number(bookData?.gradeId || gradeId || 1);
    const effectiveSubjectId = String(bookData?.subjectId || subjectCode || 'sub_eng');
    const resolvedTitle = bookTitle || bookData?.title || `${effectiveGrade}-sinf darslik`;

    // Optional teacher answer mappings & user state (don't block book download if 401/404, only real offline fails early above)
    const [answerMappings, bookmarks, notes, drawings] = await Promise.all([
      fetchStrictJson<any[]>(
        `/subscriptions/teacher-answers?grade=${effectiveGrade}&subject=${encodeURIComponent(effectiveSubjectId)}`,
      ).catch(() => []),
      fetchStrictJson<any[]>(`/content/books/${encodeURIComponent(bookId)}/bookmarks`).catch(() => []),
      fetchStrictJson<any[]>(`/content/books/${encodeURIComponent(bookId)}/notes`).catch(() => []),
      fetchStrictJson<any[]>(`/content/books/${encodeURIComponent(bookId)}/drawings`).catch(() => []),
    ]);

    const pages = Array.isArray(rawPages) ? rawPages : [];
    const hotspots = Array.isArray(rawHotspots) ? rawHotspots : [];
    const toc = Array.isArray(rawToc) ? rawToc : [];
    const answerKeys = (Array.isArray(rawAnswerKeys) ? rawAnswerKeys : []).map((a) => ({
      ...a,
      imageUrl: resolveAssetUrl(a.imageUrl),
    }));

    // Merge book-scoped media plus any global media referenced by this book's hotspots
    const referencedMediaIds = new Set(
      hotspots.map((h) => h.targetMediaId).filter(Boolean),
    );
    const mediaMap = new Map<string, any>();
    for (const m of [...(Array.isArray(rawBookMedia) ? rawBookMedia : []), ...(Array.isArray(rawAllMedia) ? rawAllMedia : [])]) {
      if (!m?.id) continue;
      if (m.bookId === bookId || referencedMediaIds.has(m.id)) {
        mediaMap.set(m.id, {
          ...m,
          url: resolveAssetUrl(m.url) || m.url,
          thumbnailUrl: resolveAssetUrl(m.thumbnailUrl) || m.thumbnailUrl,
        });
      }
    }
    const media = Array.from(mediaMap.values());

    // Remove previous asset binaries for this book before writing fresh ones
    const assetPrefix = `book_${bookId}_`;
    await offlineStore.deleteAssetsByPrefix(assetPrefix).catch(() => {});

    const token = await secureStorage.getAccessToken();
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    let totalBytes = 0;
    const assetUrlMap: Record<string, string> = {};
    let pdfAssetKey: string | undefined;

    // 2. Download real PDF binary + Web PDF.js runtime scripts when book has PDF
    if (pdfInfo?.hasPdf) {
      pdfAssetKey = `${assetPrefix}document.pdf`;
      const pdfUrl = mobileApi.getBookPdfUrl(bookId);
      const pdfResult = await offlineStore.downloadBinary(
        pdfAssetKey,
        pdfUrl,
        authHeaders,
        (ratio) => report(20 + ratio * 30),
      );
      totalBytes += pdfResult.sizeBytes;
      for (const k of normalizeUrlKeys(pdfUrl)) {
        assetUrlMap[k] = pdfAssetKey;
      }

      if (Platform.OS === 'web') {
        const urls = mobileApi.getPdfJsUrls();
        await this.ensureWebPdfJsCached(urls.pdfMinUrl, urls.workerUrl).catch(() => {});
      }
    }

    report(52);

    const resolvedTotalPages = Number(pdfInfo?.totalPages || bookData?.totalPages || pages.length || 6);
    const resolvedStartPage = normalizeContentStartPage(
      bookData?.contentStartPdfPage ?? (pdfInfo as any)?.contentStartPdfPage,
      resolvedTotalPages,
    );

    // 3. Collect unique image, audio, video, and rendered page image assets required offline
    const queue: Array<{ assetKey: string; rawUrl: string }> = [];
    const seenUrls = new Set<string>();
    const enqueueUrl = (rawUrl: string | undefined | null, label: string, fallbackExt = '') => {
      const resolved = resolveAssetUrl(rawUrl);
      if (!resolved || resolved.startsWith('data:') || resolved.startsWith('blob:') || resolved.startsWith('file:')) {
        return;
      }
      if (seenUrls.has(resolved)) return;
      seenUrls.add(resolved);
      const ext = inferAssetExtension(resolved, fallbackExt);
      queue.push({
        assetKey: `${assetPrefix}${label}_${queue.length}${ext}`,
        rawUrl: resolved,
      });
    };

    enqueueUrl(bookData?.coverImageUrl, 'cover', '.png');
    for (const pg of pages) {
      enqueueUrl(pg?.imageHighUrl, `pg${pg.pageNumber}_hi`, '.png');
      enqueueUrl(pg?.imageNormalUrl, `pg${pg.pageNumber}_nm`, '.png');
      enqueueUrl(pg?.imageUrl, `pg${pg.pageNumber}_im`, '.png');
    }

    // Ensure rendered PNG/WebP page endpoint images for PDF books are ALSO downloaded so native reader works 100% offline
    if (pdfInfo?.hasPdf && resolvedTotalPages > 0) {
      for (let p = 1; p <= resolvedTotalPages; p++) {
        enqueueUrl(`${API_BASE}/content/books/${encodeURIComponent(bookId)}/pages/${p}/image`, `pg${p}_render`, '.png');
      }
    }

    for (const m of media) {
      const mediaFallbackExt =
        m?.type === 'AUDIO' ? '.mp3' : m?.type === 'VIDEO' ? '.mp4' : '';
      enqueueUrl(m?.url, `media_${m.id}`, mediaFallbackExt);
      enqueueUrl(m?.thumbnailUrl, `thumb_${m.id}`, '.jpg');
    }
    for (const h of hotspots) {
      const hsFallbackExt =
        h?.type === 'AUDIO' ? '.mp3' : h?.type === 'VIDEO' ? '.mp4' : '';
      enqueueUrl(h?.targetUrl, `hs_${h.id || 'target'}`, hsFallbackExt);
      enqueueUrl(h?.targetFile, `hs_file_${h.id || 'file'}`, hsFallbackExt);
      enqueueUrl(h?.imageUrl, `hs_img_${h.id || 'img'}`, '.png');
    }
    for (const ak of answerKeys) {
      enqueueUrl(ak?.imageUrl, `ans_${ak.id || 'img'}`, '.png');
    }
    for (const am of Array.isArray(answerMappings) ? answerMappings : []) {
      enqueueUrl(am?.imageUrl, `map_${am.id || 'img'}`, '.png');
    }

    // Download queued media/images/covers in parallel batches of 4 for fast completion
    let completedCount = 0;
    const totalCount = Math.max(1, queue.length);
    const BATCH_SIZE = 4;

    for (let start = 0; start < queue.length; start += BATCH_SIZE) {
      const batch = queue.slice(start, start + BATCH_SIZE);
      await Promise.all(
        batch.map(async (item) => {
          try {
            const isLocalApi =
              item.rawUrl.startsWith(API_ORIGIN) || item.rawUrl.includes('/api/v1/');
            const dl = await offlineStore.downloadBinary(
              item.assetKey,
              item.rawUrl,
              isLocalApi ? authHeaders : {},
            );
            if (dl.sizeBytes > 0) {
              totalBytes += dl.sizeBytes;
              for (const k of normalizeUrlKeys(item.rawUrl)) {
                assetUrlMap[k] = item.assetKey;
              }
            }
          } catch (assetErr: any) {
            const isFirstPartyMedia = item.rawUrl.includes('/api/v1/content/');
            if (isFirstPartyMedia && assetErr?.message?.includes('Internet aloqasi')) {
              throw assetErr;
            }
          } finally {
            completedCount += 1;
            report(52 + (completedCount / totalCount) * 42);
          }
        }),
      );
    }

    report(95);

    const pkg: OfflineBookPackage = {
      version: 2,
      bookId,
      downloadedAt: new Date().toISOString(),
      sizeBytes: 0,
      book: {
        id: bookId,
        title: resolvedTitle,
        gradeId: effectiveGrade,
        subjectId: effectiveSubjectId,
        totalPages: resolvedTotalPages,
        contentStartPdfPage: resolvedStartPage,
        type: bookData?.type,
        coverImageUrl: resolveAssetUrl(bookData?.coverImageUrl),
      },
      pdfInfo: {
        hasPdf: Boolean(pdfInfo?.hasPdf),
        totalPages: resolvedTotalPages,
        contentStartPdfPage: resolvedStartPage,
      },
      pdfAssetKey,
      pages,
      hotspots,
      media,
      answerMappings: (Array.isArray(answerMappings) ? answerMappings : []).map((a) => ({
        ...a,
        imageUrl: resolveAssetUrl(a.imageUrl),
      })),
      answerKeys,
      toc,
      bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
      notes: Array.isArray(notes) ? notes : [],
      drawings: Array.isArray(drawings) ? drawings : [],
      assetUrlMap,
    };

    const jsonBytes = new TextEncoder().encode(JSON.stringify(pkg)).byteLength;
    pkg.sizeBytes = Math.max(totalBytes + jsonBytes, 1024);

    await offlineStore.putJson(`${PKG_PREFIX}${bookId}`, pkg);

    const item: DownloadedItem = {
      key: makeBundleKey(effectiveGrade, subjectCode, bookId),
      bookId,
      gradeId: effectiveGrade,
      subjectCode: subjectCode || effectiveSubjectId,
      subjectId: effectiveSubjectId,
      title: resolvedTitle,
      bookType: bookData?.type,
      totalPages: pkg.book.totalPages,
      contentStartPdfPage: resolvedStartPage,
      coverImageUrl: pkg.book.coverImageUrl,
      hasPdf: pkg.pdfInfo.hasPdf,
      assetsCount: queue.length + (pdfAssetKey ? 1 : 0),
      sizeBytes: pkg.sizeBytes,
      downloadedAt: pkg.downloadedAt,
      isEncrypted: true,
    };

    this.indexCache = [item, ...this.indexCache.filter((d) => d.bookId !== bookId)];
    await offlineStore.putJson(INDEX_KEY, this.indexCache);

    report(100);
    return item;
  }

  private static async ensureWebPdfJsCached(libUrl: string, workerUrl: string): Promise<void> {
    if (Platform.OS !== 'web') return;
    const [hasLib, hasWorker] = await Promise.all([
      offlineStore.hasBinary('vendor_pdf_js'),
      offlineStore.hasBinary('vendor_pdf_worker_js'),
    ]);
    if (hasLib && hasWorker) return;

    const [libRes, workerRes] = await Promise.all([fetch(libUrl), fetch(workerUrl)]);
    if (libRes.ok) {
      const text = await libRes.text();
      if (text.length > 1000) {
        await offlineStore.putTextAsset('vendor_pdf_js', text, 'application/javascript');
      }
    }
    if (workerRes.ok) {
      const text = await workerRes.text();
      if (text.length > 1000) {
        await offlineStore.putTextAsset('vendor_pdf_worker_js', text, 'application/javascript');
      }
    }
  }

  static async getOfflineVendorScriptUrl(filename: 'pdf.min.js' | 'pdf.worker.min.js'): Promise<string | null> {
    const key = filename === 'pdf.min.js' ? 'vendor_pdf_js' : 'vendor_pdf_worker_js';
    return offlineStore.getAssetPlayableUri(key);
  }

  static async getOfflineBookPackage(bookId: string): Promise<OfflineBookPackage | null> {
    if (!bookId) return null;
    return offlineStore.getJson<OfflineBookPackage>(`${PKG_PREFIX}${bookId}`);
  }

  static async getOfflinePdfBuffer(bookId: string): Promise<ArrayBuffer | null> {
    const pkg = await this.getOfflineBookPackage(bookId);
    if (!pkg?.pdfAssetKey) return null;
    const bin = await offlineStore.getBinary(pkg.pdfAssetKey);
    return bin ? bin.data : null;
  }

  static resolveFromAssetUrlMap(
    urlToLocalUri: Record<string, string>,
    remoteUrl?: string | null,
  ): string | undefined {
    if (!remoteUrl) return undefined;
    if (remoteUrl.startsWith('blob:') || remoteUrl.startsWith('file:') || remoteUrl.startsWith('data:')) {
      return remoteUrl;
    }
    for (const candidate of normalizeUrlKeys(remoteUrl)) {
      if (urlToLocalUri[candidate]) {
        return urlToLocalUri[candidate];
      }
    }
    return undefined;
  }

  static async resolveBookOfflineAssets(
    bookId: string,
    pkgHint?: OfflineBookPackage | null,
  ): Promise<{ pkg: OfflineBookPackage | null; urlToLocalUri: Record<string, string> }> {
    const pkg = pkgHint || (await this.getOfflineBookPackage(bookId));
    if (!pkg?.assetUrlMap) {
      return { pkg: pkg || null, urlToLocalUri: {} };
    }

    const assetKeyToUri: Record<string, string> = {};
    const uniqueAssetKeys = Array.from(new Set(Object.values(pkg.assetUrlMap)));
    await Promise.all(
      uniqueAssetKeys.map(async (assetKey) => {
        const uri = await offlineStore.getAssetPlayableUri(assetKey);
        if (uri) {
          assetKeyToUri[assetKey] = uri;
        }
      }),
    );

    const urlToLocalUri: Record<string, string> = {};
    for (const [urlKey, assetKey] of Object.entries(pkg.assetUrlMap)) {
      const localUri = assetKeyToUri[assetKey];
      if (localUri) {
        urlToLocalUri[urlKey] = localUri;
      }
    }

    return { pkg, urlToLocalUri };
  }

  static async resolveOfflineAssetUri(
    bookId: string,
    remoteUrl?: string | null,
    pkgHint?: OfflineBookPackage | null,
  ): Promise<string | undefined> {
    if (!remoteUrl) return undefined;
    if (remoteUrl.startsWith('blob:') || remoteUrl.startsWith('file:') || remoteUrl.startsWith('data:')) {
      return remoteUrl;
    }

    const pkg = pkgHint || (await this.getOfflineBookPackage(bookId));
    if (!pkg?.assetUrlMap) return undefined;

    for (const candidate of normalizeUrlKeys(remoteUrl)) {
      const assetKey = pkg.assetUrlMap[candidate];
      if (assetKey) {
        const localUri = await offlineStore.getAssetPlayableUri(assetKey);
        if (localUri) return localUri;
      }
    }
    return undefined;
  }

  static async saveOfflineReaderPatch(
    bookId: string,
    patch: Partial<Pick<OfflineBookPackage, 'bookmarks' | 'notes' | 'drawings'>>,
  ): Promise<void> {
    const pkg = await this.getOfflineBookPackage(bookId);
    if (!pkg) return;
    const updated: OfflineBookPackage = {
      ...pkg,
      ...patch,
    };
    await offlineStore.putJson(`${PKG_PREFIX}${bookId}`, updated).catch(() => {});
  }

  static async deleteBundle(
    gradeOrKey: number | string,
    subjectCode?: string,
    explicitBookId?: string,
  ): Promise<void> {
    await this.init();
    const lookupKey =
      typeof gradeOrKey === 'number'
        ? makeBundleKey(gradeOrKey, subjectCode || 'ALL', explicitBookId)
        : gradeOrKey;

    const target = this.indexCache.find(
      (d) =>
        d.key === lookupKey ||
        d.bookId === lookupKey ||
        (explicitBookId && d.bookId === explicitBookId),
    );
    const bookId = target?.bookId || explicitBookId || lookupKey;

    await offlineStore.deleteJson(`${PKG_PREFIX}${bookId}`).catch(() => {});
    await offlineStore.deleteAssetsByPrefix(`book_${bookId}_`).catch(() => {});

    this.indexCache = this.indexCache.filter(
      (d) => d.key !== lookupKey && d.bookId !== bookId,
    );
    await offlineStore.putJson(INDEX_KEY, this.indexCache).catch(() => {});
  }

  static async clearAll(): Promise<void> {
    const items = await this.init();
    for (const item of items) {
      await offlineStore.deleteJson(`${PKG_PREFIX}${item.bookId}`).catch(() => {});
      await offlineStore.deleteAssetsByPrefix(`book_${item.bookId}_`).catch(() => {});
    }
    this.indexCache = [];
    await offlineStore.putJson(INDEX_KEY, []).catch(() => {});
  }

  static async clearAllDownloads(): Promise<void> {
    return this.clearAll();
  }
}
