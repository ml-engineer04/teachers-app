import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  CreateAccessRequestDto,
  AccessRequest,
  Subscription,
  SignedLicense,
  Grade,
  Book,
  AuthTokensResponse,
  GoogleAuthDto,
} from '@smartteacherbook/shared';
import { secureStorage } from '../storage/secureStorage';

export const PRODUCTION_API_URL = 'https://api.ilmchi.uz/api/v1';

const getMetroHost = (): string | null => {
  try {
    const hostUri =
      Constants?.expoConfig?.hostUri ||
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any)?.manifest?.debuggerHost;
    if (hostUri) {
      const match = hostUri.match(/^([^/:]+)/);
      if (match?.[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {}

  try {
    const sourceCode = NativeModules?.SourceCode;
    const scriptURL: string | undefined =
      (typeof sourceCode?.getConstants === 'function'
        ? sourceCode.getConstants()?.scriptURL
        : undefined) || sourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)/i);
      if (match?.[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {}

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const getDevServer = require('react-native/Libraries/Core/Devtools/getDevServer');
    const devUrl: string | undefined = typeof getDevServer === 'function' ? getDevServer()?.url : undefined;
    const match = devUrl?.match(/^https?:\/\/([^/:]+)/i);
    if (match?.[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return match[1];
    }
  } catch {}

  return null;
};

// Automatic platform + LAN host discovery (works on Web, Emulator, and Expo Go on physical phone)
const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // If explicitly configured to a remote/production URL, use it directly
  const isLocalEnv = !envUrl || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(envUrl);
  if (envUrl && !isLocalEnv) {
    return envUrl.replace(/\/+$/, '');
  }

  // Web in browser
  if (Platform.OS === 'web') {
    return envUrl || 'http://localhost:4000/api/v1';
  }

  // Mobile device connected to Metro on LAN
  const metroHost = getMetroHost();
  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return `http://${metroHost}:4000/api/v1`;
  }

  // Fallback for real mobile devices where 10.0.2.2 or localhost does not exist
  return PRODUCTION_API_URL;
};

export const API_BASE = getApiBaseUrl();
export const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '');

export function resolveAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  let trimmed = url.trim();
  if (!trimmed) return undefined;

  // Clean any legacy duplicate /api/v1/api/ prefix
  if (trimmed.includes('/api/v1/api/')) {
    trimmed = trimmed.replace('/api/v1/api/', '/api/v1/');
  }

  // Replace any loopback / local IP or localhost (with any port) with API_ORIGIN
  if (/^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i.test(trimmed)) {
    return trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i, API_ORIGIN);
  }

  // Handle relative paths
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('/api/v1/')) {
      return `${API_ORIGIN}${trimmed}`;
    }
    if (trimmed.startsWith('/api/')) {
      return `${API_ORIGIN}/api/v1${trimmed.slice(4)}`;
    }
    if (trimmed.startsWith('/content/')) {
      return `${API_ORIGIN}/api/v1${trimmed}`;
    }
    return `${API_BASE}${trimmed}`;
  }

  return trimmed;
}

export function resolveAssetUrls(urls?: (string | null | undefined)[] | null): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.map((u) => resolveAssetUrl(u)).filter((u): u is string => Boolean(u));
}

export interface ApiError extends Error {
  status?: number;
  data?: any;
  isNetworkError?: boolean;
}

// Mutex / Queue to prevent multiple simultaneous refresh requests
let isRefreshing = false;
let refreshSubscribers: Array<(newToken: string) => void> = [];

const subscribeTokenRefresh = (cb: (newToken: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (newToken: string) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

// In-flight GET request deduplication cache to prevent duplicate concurrent network calls
const inFlightGetRequests = new Map<string, Promise<any>>();

/**
 * Robust HTTP client with Automatic 401 Access Token Refresh Interceptor and In-Flight Deduplication
 */
async function executeRequest<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
  const token = await secureStorage.getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as any),
  };

  const timeoutMs = endpoint.includes('/image') || endpoint.includes('/pdf') ? 20000 : 12000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const tStart = typeof __DEV__ !== 'undefined' && __DEV__ ? Date.now() : 0;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      signal: options?.signal || controller.signal,
      ...options,
    });
    if (tStart > 0) {
      console.log(
        `⏱️ [MOBILE_API] ${options?.method || 'GET'} ${endpoint} | ${res.status} | ${Date.now() - tStart}ms`,
      );
    }
  } catch (netErr: any) {
    if (tStart > 0) {
      console.warn(
        `⏱️ [MOBILE_API_ERR] ${options?.method || 'GET'} ${endpoint} | ${Date.now() - tStart}ms | ${netErr?.message}`,
      );
    }
    const isTimeout = netErr?.name === 'AbortError';
    const error: ApiError = new Error(
      isTimeout ? 'Tarmoq so‘rovi vaqti tugadi (timeout)' : netErr?.message || 'Internet aloqasi mavjud emas',
    );
    error.isNetworkError = true;
    throw error;
  } finally {
    clearTimeout(timer);
  }

  // Handle 401 Unauthorized -> Transparent Token Refresh
  if (
    res.status === 401 &&
    !isRetry &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/register') &&
    !endpoint.includes('/auth/verify-email') &&
    !endpoint.includes('/auth/resend-verification') &&
    !endpoint.includes('/auth/forgot-password') &&
    !endpoint.includes('/auth/reset-password') &&
    !endpoint.includes('/auth/google') &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/verify-otp') &&
    !endpoint.includes('/auth/send-otp')
  ) {
    const refreshToken = await secureStorage.getRefreshToken();
    const deviceId = await secureStorage.getOrCreateDeviceId();

    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken, deviceId }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            await secureStorage.saveTokens(refreshData.accessToken, refreshData.refreshToken);
            isRefreshing = false;
            onRefreshed(refreshData.accessToken);

            return request<T>(endpoint, options, true);
          } else {
            isRefreshing = false;
            refreshSubscribers = [];
            await secureStorage.clearAuthTokens();
          }
        } catch {
          isRefreshing = false;
          refreshSubscribers = [];
        }
      } else {
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            try {
              const retryHeaders = {
                ...headers,
                Authorization: `Bearer ${newToken}`,
              };
              const retryRes = await fetch(`${API_BASE}${endpoint}`, {
                headers: retryHeaders,
                ...options,
              });
              const retryText = await retryRes.text();
              resolve(JSON.parse(retryText));
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    }
  }

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const error: ApiError = new Error(json.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = json;
    throw error;
  }

  return json as T;
}

async function request<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  if (method === 'GET' && !isRetry) {
    const existing = inFlightGetRequests.get(endpoint);
    if (existing) return existing as Promise<T>;

    const p = executeRequest<T>(endpoint, options, isRetry).finally(() => {
      inFlightGetRequests.delete(endpoint);
    });
    inFlightGetRequests.set(endpoint, p);
    return p;
  }
  return executeRequest<T>(endpoint, options, isRetry);
}

export const mobileApi = {
  resolveAssetUrl,
  API_BASE,
  API_ORIGIN,

  async checkConnectivity(): Promise<boolean> {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
      const res = await fetch(`${API_BASE}/grades`, {
        method: 'GET',
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (timer) clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  },

  // -------------------------------------------------------------
  // Authentication & Devices
  // -------------------------------------------------------------
  async getDeviceMeta() {
    const deviceId = await secureStorage.getOrCreateDeviceId();
    const deviceModel =
      Platform.OS === 'android'
        ? 'Android Device'
        : Platform.OS === 'ios'
        ? 'Apple Device'
        : 'Web Browser';
    const osVersion =
      Platform.OS === 'android'
        ? `Android ${Platform.Version || '14'}`
        : Platform.OS === 'ios'
        ? `iOS ${Platform.Version || '17'}`
        : typeof navigator !== 'undefined'
        ? 'Web Browser'
        : 'Web';
    return {
      deviceId,
      deviceModel,
      osVersion,
      appVersion: '1.0.0',
      platform: Platform.OS.toUpperCase(),
    };
  },

  async registerWithEmail(payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  }): Promise<{
    success: boolean;
    requiresVerification: boolean;
    email: string;
    delivered: boolean;
    message: string;
  }> {
    const meta = await this.getDeviceMeta();
    return await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...payload, ...meta }),
    });
  },

  async verifyEmail(email: string, code: string): Promise<AuthTokensResponse> {
    const meta = await this.getDeviceMeta();
    return await request<AuthTokensResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code, ...meta }),
    });
  },

  async resendEmailVerification(email: string): Promise<{ success: boolean; delivered: boolean; message: string }> {
    return await request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async loginWithEmail(email: string, password: string): Promise<AuthTokensResponse> {
    const meta = await this.getDeviceMeta();
    return await request<AuthTokensResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...meta }),
    });
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    return await request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  },

  async sendGoogleLinkCode(
    linkToken: string,
  ): Promise<{ success: boolean; email: string; delivered: boolean; message: string }> {
    return await request('/auth/google/link/send-code', {
      method: 'POST',
      body: JSON.stringify({ linkToken }),
    });
  },

  async linkGoogleAccount(params: {
    linkToken: string;
    password?: string;
    otpCode?: string;
  }): Promise<AuthTokensResponse> {
    const meta = await this.getDeviceMeta();
    return await request<AuthTokensResponse>('/auth/google/link', {
      method: 'POST',
      body: JSON.stringify({ ...params, ...meta }),
    });
  },

  async googleSignInWithDto(dto: GoogleAuthDto): Promise<AuthTokensResponse> {
    return await request<AuthTokensResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async refreshToken(refreshToken: string, deviceId: string) {
    return await request<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken, deviceId }),
    });
  },

  async getProfile() {
    return await request<any>('/auth/me');
  },

  async updateProfile(fullName: string) {
    return await request<any>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ fullName }),
    });
  },

  async getMyDevices() {
    return await request<any>('/auth/devices');
  },

  async disconnectDevice(deviceId: string) {
    return await request<any>(`/auth/devices/${deviceId}`, {
      method: 'DELETE',
    });
  },

  async evictDeviceWithGoogleToken(idToken: string, deviceIdToRemove: string) {
    return await request<any>('/auth/devices/evict', {
      method: 'POST',
      body: JSON.stringify({ idToken, deviceIdToRemove }),
    });
  },

  async disconnectDeviceByUserId(userId: string, deviceIdToRemove: string) {
    return await request<any>(`/auth/devices/${userId}/disconnect`, {
      method: 'POST',
      body: JSON.stringify({ deviceIdToRemove }),
    });
  },

  async logout(deviceId: string) {
    try {
      await request<any>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      });
    } finally {
      await secureStorage.clearAuthTokens();
    }
  },

  async logoutAll() {
    try {
      await request<any>('/auth/logout-all', {
        method: 'POST',
      });
    } finally {
      await secureStorage.clearAuthTokens();
    }
  },

  async sendOtp(email: string): Promise<{ success: boolean; message: string }> {
    return await request<{ success: boolean; message: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(
    email: string,
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any; subscription?: any }> {
    const deviceId = await secureStorage.getOrCreateDeviceId();
    const deviceModel =
      Platform.OS === 'android'
        ? 'Android Device'
        : Platform.OS === 'ios'
        ? 'Apple Device'
        : 'Web Browser';

    return await request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email,
        code,
        deviceId,
        deviceModel,
        platform: Platform.OS.toUpperCase(),
      }),
    });
  },

  // -------------------------------------------------------------
  // Grades, Subjects & Dynamic Pricing
  // -------------------------------------------------------------
  async getGrades(): Promise<Grade[]> {
    try {
      return await request<Grade[]>('/grades?activeOnly=true');
    } catch {
      return [
        { id: 1, gradeNumber: 1, title: '1-sinf', priceMonthlyUzs: 69000, priceQuarterlyUzs: 172000, priceYearlyUzs: 552000, isActive: true },
        { id: 2, gradeNumber: 2, title: '2-sinf', priceMonthlyUzs: 69000, priceQuarterlyUzs: 172000, priceYearlyUzs: 552000, isActive: true },
        { id: 3, gradeNumber: 3, title: '3-sinf', priceMonthlyUzs: 79000, priceQuarterlyUzs: 197000, priceYearlyUzs: 632000, isActive: true },
        { id: 4, gradeNumber: 4, title: '4-sinf', priceMonthlyUzs: 79000, priceQuarterlyUzs: 197000, priceYearlyUzs: 632000, isActive: true },
        { id: 5, gradeNumber: 5, title: '5-sinf', priceMonthlyUzs: 89000, priceQuarterlyUzs: 222000, priceYearlyUzs: 712000, isActive: true },
        { id: 6, gradeNumber: 6, title: '6-sinf', priceMonthlyUzs: 89000, priceQuarterlyUzs: 222000, priceYearlyUzs: 712000, isActive: true },
        { id: 7, gradeNumber: 7, title: '7-sinf', priceMonthlyUzs: 89000, priceQuarterlyUzs: 222000, priceYearlyUzs: 712000, isActive: true },
        { id: 8, gradeNumber: 8, title: '8-sinf', priceMonthlyUzs: 99000, priceQuarterlyUzs: 247000, priceYearlyUzs: 792000, isActive: true },
        { id: 9, gradeNumber: 9, title: '9-sinf', priceMonthlyUzs: 99000, priceQuarterlyUzs: 247000, priceYearlyUzs: 792000, isActive: true },
        { id: 10, gradeNumber: 10, title: '10-sinf', priceMonthlyUzs: 109000, priceQuarterlyUzs: 272000, priceYearlyUzs: 872000, isActive: true },
        { id: 11, gradeNumber: 11, title: '11-sinf', priceMonthlyUzs: 119000, priceQuarterlyUzs: 299000, priceYearlyUzs: 890000, isActive: true },
      ];
    }
  },

  async getPricingPlans(gradeId?: number, subjectId?: string): Promise<any[]> {
    try {
      const parts: string[] = [];
      if (gradeId) parts.push(`gradeId=${encodeURIComponent(String(gradeId))}`);
      if (subjectId) parts.push(`subjectId=${encodeURIComponent(subjectId)}`);
      const q = parts.join('&');
      return await request<any[]>(`/grades/pricing/plans${q ? `?${q}` : ''}`);
    } catch {
      return [
        { id: 'MONTHLY', name: '1 Oylik Obuna', durationDays: 30, priceUzs: 119000, badge: '' },
        { id: 'THREE_MONTHS', name: '3 Oylik Obuna', durationDays: 90, priceUzs: 299000, badge: 'TEJAMKOR' },
        { id: 'YEARLY', name: '1 Yillik Obuna', durationDays: 365, priceUzs: 890000, badge: 'ENG FOYDALI' },
      ];
    }
  },

  async getSubjects(): Promise<any[]> {
    try {
      const list = await request<any[]>('/subjects');
      if (Array.isArray(list) && list.length > 0) {
        const seen = new Set<string>();
        return list.filter((s) => {
          const codeKey = (s.code || s.name || s.id).toUpperCase();
          if (seen.has(codeKey)) return false;
          seen.add(codeKey);
          return s.isActive !== false;
        });
      }
      return [];
    } catch {
      return [
        { id: 'sub_eng', name: 'Ingliz tili', code: 'ENG', icon: '🇬🇧', color: '#2A4FB8' },
        { id: 'sub_uzb', name: 'Ona tili', code: 'UZB', icon: '📖', color: '#B45309' },
        { id: 'sub_math', name: 'Matematika', code: 'MATH', icon: '📐', color: '#15803D' },
        { id: 'sub_phys', name: 'Fizika', code: 'PHYS', icon: '⚛️', color: '#6D3FD1' },
        { id: 'sub_chem', name: 'Kimyo', code: 'CHEM', icon: '🧪', color: '#C23B5A' },
        { id: 'sub_bio', name: 'Biologiya', code: 'BIO', icon: '🧬', color: '#0E7C70' },
      ];
    }
  },

  // -------------------------------------------------------------
  // Books, Pages, Hotspots, Media, Answers & Reader Sync
  // -------------------------------------------------------------
  async getBooksByGrade(gradeId: number): Promise<Book[]> {
    try {
      const list = await request<Book[]>(`/content/grades/${gradeId}/books`);
      return (list || []).map((b) => ({
        ...b,
        coverImageUrl: resolveAssetUrl(b.coverImageUrl),
      }));
    } catch {
      return [];
    }
  },

  async getAllBooks(): Promise<Book[]> {
    try {
      const list = await request<Book[]>('/content/books');
      return (list || []).map((b) => ({
        ...b,
        coverImageUrl: resolveAssetUrl(b.coverImageUrl),
      }));
    } catch {
      return [];
    }
  },

  async getBookPages(bookId: string): Promise<any[]> {
    try {
      const pages = await request<any[]>(`/content/books/${bookId}/pages`);
      return (pages || []).map((p) => ({
        ...p,
        imageHighUrl: resolveAssetUrl(p.imageHighUrl),
        imageNormalUrl: resolveAssetUrl(p.imageNormalUrl),
        imageUrl: resolveAssetUrl(p.imageUrl),
      }));
    } catch {
      return [];
    }
  },

  async getReaderBundle(bookId: string): Promise<{
    pdfInfo: { hasPdf: boolean; totalPages: number; contentStartPdfPage?: number };
    pages: any[];
    hotspots: any[];
  } | null> {
    try {
      return await request<{
        pdfInfo: { hasPdf: boolean; totalPages: number; contentStartPdfPage?: number };
        pages: any[];
        hotspots: any[];
      }>(`/content/books/${bookId}/reader-bundle`);
    } catch {
      return null;
    }
  },

  async getBookPdfInfo(bookId: string): Promise<{ hasPdf: boolean; totalPages: number; contentStartPdfPage?: number }> {
    try {
      return await request<{ hasPdf: boolean; totalPages: number; contentStartPdfPage?: number }>(
        `/content/books/${bookId}/has-pdf`,
      );
    } catch {
      return { hasPdf: false, totalPages: 6 };
    }
  },

  getBookPdfUrl(bookId: string): string {
    return `${API_BASE}/content/books/${bookId}/pdf`;
  },

  getPdfJsUrls() {
    return {
      pdfMinUrl: `${API_BASE}/content/vendor/pdfjs/pdf.min.js`,
      workerUrl: `${API_BASE}/content/vendor/pdfjs/pdf.worker.min.js`,
    };
  },

  async getBookHotspots(bookId: string): Promise<any[]> {
    try {
      const list = await request<any[]>(`/content/books/${bookId}/hotspots`);
      return (list || []).map((h) => ({
        ...h,
        targetUrl: resolveAssetUrl(h.targetUrl) || h.targetUrl,
        imageUrl: resolveAssetUrl(h.imageUrl) || h.imageUrl,
        transcriptImageUrl: resolveAssetUrl(h.transcriptImageUrl) || h.transcriptImageUrl,
        answerImages: resolveAssetUrls(h.answerImages),
        transcriptImages: resolveAssetUrls(h.transcriptImages),
      }));
    } catch (err) {
      console.warn(`[mobileApi] getBookHotspots(${bookId}) failed:`, err);
      return [];
    }
  },

  async getMedia(bookId?: string): Promise<any[]> {
    try {
      const q = bookId ? `?bookId=${encodeURIComponent(bookId)}` : '';
      const list = await request<any[]>(`/content/media${q}`);
      return (list || []).map((m) => ({
        ...m,
        url: resolveAssetUrl(m.url) || m.url,
        thumbnailUrl: resolveAssetUrl(m.thumbnailUrl) || m.thumbnailUrl,
        transcriptImageUrl: resolveAssetUrl(m.transcriptImageUrl) || m.transcriptImageUrl,
        transcriptImages: resolveAssetUrls(m.transcriptImages),
      }));
    } catch (err) {
      console.warn(`[mobileApi] getMedia(${bookId}) failed:`, err);
      return [];
    }
  },

  async getAnswerMappings(gradeId?: number, subjectId?: string): Promise<any[]> {
    try {
      const q = new URLSearchParams();
      if (gradeId) q.set('gradeId', String(gradeId));
      if (subjectId) q.set('subjectId', subjectId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const list = await request<any[]>(`/answer-mappings${qs}`);
      return (list || []).map((a) => ({
        ...a,
        imageUrl: resolveAssetUrl(a.imageUrl),
        answerImages: resolveAssetUrls(a.answerImages),
        transcriptImageUrl: resolveAssetUrl(a.transcriptImageUrl),
        transcriptImages: resolveAssetUrls(a.transcriptImages),
      }));
    } catch (err) {
      console.warn(`[mobileApi] getAnswerMappings failed:`, err);
      return [];
    }
  },

  async getAnswerKeys(studentBookId?: string, studentPage?: number): Promise<any[]> {
    try {
      const q = new URLSearchParams();
      if (studentBookId) q.set('studentBookId', studentBookId);
      if (studentPage) q.set('studentPage', String(studentPage));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const list = await request<any[]>(`/content/answers${qs}`);
      return (list || []).map((a) => ({
        ...a,
        imageUrl: resolveAssetUrl(a.imageUrl),
        answerImages: resolveAssetUrls(a.answerImages),
        transcriptImageUrl: resolveAssetUrl(a.transcriptImageUrl),
        transcriptImages: resolveAssetUrls(a.transcriptImages),
      }));
    } catch (err) {
      console.warn(`[mobileApi] getAnswerKeys failed:`, err);
      return [];
    }
  },

  async getBookToc(bookId: string): Promise<any[]> {
    try {
      return await request<any[]>(`/content/books/${bookId}/toc`);
    } catch {
      return [];
    }
  },

  async getBookmarks(bookId: string): Promise<any[]> {
    try {
      return await request<any[]>(`/content/books/${bookId}/bookmarks`);
    } catch {
      return [];
    }
  },

  async addBookmark(bookId: string, pageNumber: number, title?: string) {
    return await request<any>(`/content/books/${bookId}/bookmarks`, {
      method: 'POST',
      body: JSON.stringify({ pageNumber, title }),
    });
  },

  async deleteBookmark(bookId: string, pageNumber: number) {
    return await request<any>(`/content/books/${bookId}/bookmarks/${pageNumber}`, {
      method: 'DELETE',
    });
  },

  async getNotes(bookId: string): Promise<any[]> {
    try {
      return await request<any[]>(`/content/books/${bookId}/notes`);
    } catch {
      return [];
    }
  },

  async addNote(bookId: string, pageNumber: number, text: string) {
    return await request<any>(`/content/books/${bookId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ pageNumber, text }),
    });
  },

  async deleteNote(bookId: string, noteId: string) {
    return await request<any>(`/content/books/${bookId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  async getDrawings(bookId: string, pageNumber?: number): Promise<any[]> {
    try {
      const q = pageNumber !== undefined ? `?pageNumber=${pageNumber}` : '';
      return await request<any[]>(`/content/books/${bookId}/drawings${q}`);
    } catch {
      return [];
    }
  },

  async saveDrawings(bookId: string, pageNumber: number, strokes: any[]) {
    try {
      return await request<any>(`/content/books/${bookId}/drawings/${pageNumber}`, {
        method: 'PUT',
        body: JSON.stringify({ strokes }),
      });
    } catch {
      return { success: false };
    }
  },

  async getReadingProgress(): Promise<any[]> {
    try {
      const list = await request<any[]>('/content/progress');
      return (list || []).map((p) => ({
        ...p,
        coverImageUrl: resolveAssetUrl(p.coverImageUrl),
      }));
    } catch {
      return [];
    }
  },

  async saveReadingProgress(bookId: string, lastPageNumber: number) {
    try {
      return await request<any>('/content/progress', {
        method: 'POST',
        body: JSON.stringify({ bookId, lastPageNumber }),
      });
    } catch {
      return null;
    }
  },

  async getBookManifest(bookId: string) {
    try {
      return await request<any>(`/content/books/${bookId}/manifest`);
    } catch {
      return null;
    }
  },

  // -------------------------------------------------------------
  // Subscriptions & Access Requests
  // -------------------------------------------------------------
  async createAccessRequest(dto: CreateAccessRequestDto): Promise<AccessRequest> {
    return await request<AccessRequest>('/access-requests', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getMyRequests(): Promise<AccessRequest[]> {
    try {
      return await request<AccessRequest[]>('/access-requests/my');
    } catch {
      return [];
    }
  },

  async getMySubscriptionsStrict(): Promise<Subscription[]> {
    return await request<Subscription[]>('/subscriptions/my');
  },

  async getMySubscriptions(): Promise<Subscription[]> {
    try {
      return await this.getMySubscriptionsStrict();
    } catch {
      return [];
    }
  },

  async getSignedLicense(subscriptionId: string, deviceId: string): Promise<SignedLicense | null> {
    try {
      return await request<SignedLicense>(`/subscriptions/license/${subscriptionId}?deviceId=${deviceId}`);
    } catch {
      return null;
    }
  },
};
