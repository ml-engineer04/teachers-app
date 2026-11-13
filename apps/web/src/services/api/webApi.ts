import type {
  AccessRequest,
  AuthTokensResponse,
  Book,
  CreateAccessRequestDto,
  GoogleAuthDto,
  Grade,
  Subscription,
} from '@smartteacherbook/shared';
import { webStorage } from '../storage/webStorage';

const envApiUrl =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:4000/api/v1';

export const API_BASE: string = String(envApiUrl).replace(/\/+$/, '');
export const API_ORIGIN: string = API_BASE.replace(/\/api\/v1\/?$/, '');

export function resolveAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\/(localhost|127\.0\.0\.1):4000/i.test(url)) {
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):4000/i, API_ORIGIN);
  }
  if (url.startsWith('/')) {
    if (url.startsWith('/api/v1')) {
      return `${API_ORIGIN}${url}`;
    }
    return `${API_BASE}${url}`;
  }
  return url;
}

export interface ApiError extends Error {
  status?: number;
  data?: any;
  isNetworkError?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: Array<(newToken: string) => void> = [];
let onSessionExpiredCallback: (() => void) | null = null;

export function setOnSessionExpired(cb: (() => void) | null) {
  onSessionExpiredCallback = cb;
}

const subscribeTokenRefresh = (cb: (newToken: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (newToken: string) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

async function request<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
  const token = webStorage.getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    const error: ApiError = new Error(netErr?.message || 'Internet aloqasi mavjud emas');
    error.isNetworkError = true;
    throw error;
  }

  const isAuthEndpoint =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/verify-email') ||
    endpoint.includes('/auth/resend-verification') ||
    endpoint.includes('/auth/forgot-password') ||
    endpoint.includes('/auth/reset-password') ||
    endpoint.includes('/auth/google') ||
    endpoint.includes('/auth/refresh') ||
    endpoint.includes('/auth/verify-otp') ||
    endpoint.includes('/auth/send-otp');

  if (res.status === 401 && !isRetry && !isAuthEndpoint) {
    const refreshToken = webStorage.getRefreshToken();
    const deviceId = webStorage.getOrCreateDeviceId();

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
            webStorage.saveTokens(refreshData.accessToken, refreshData.refreshToken);
            isRefreshing = false;
            onRefreshed(refreshData.accessToken);
            return request<T>(endpoint, options, true);
          } else {
            isRefreshing = false;
            refreshSubscribers = [];
            webStorage.clearAuthTokens();
            onSessionExpiredCallback?.();
          }
        } catch {
          isRefreshing = false;
          refreshSubscribers = [];
        }
      } else {
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            try {
              const retryRes = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: {
                  ...headers,
                  Authorization: `Bearer ${newToken}`,
                },
              });
              const retryText = await retryRes.text();
              const parsed = retryText ? JSON.parse(retryText) : {};
              if (!retryRes.ok) {
                const err: ApiError = new Error(parsed.message || `HTTP ${retryRes.status}`);
                err.status = retryRes.status;
                err.data = parsed;
                reject(err);
                return;
              }
              resolve(parsed as T);
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
    json = text ? JSON.parse(text) : {};
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

function detectBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent || '';
  if (ua.includes('Edg/')) return 'Microsoft Edge (Web)';
  if (ua.includes('Chrome/')) return 'Google Chrome (Web)';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox (Web)';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Apple Safari (Web)';
  return 'Web Browser';
}

export const webApi = {
  API_BASE,
  API_ORIGIN,
  resolveAssetUrl,

  async checkConnectivity(): Promise<boolean> {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
      const res = await fetch(`${API_BASE}/grades?activeOnly=true`, {
        method: 'GET',
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (timer) clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  },

  getDeviceMeta() {
    const deviceId = webStorage.getOrCreateDeviceId();
    return {
      deviceId,
      deviceModel: detectBrowserName(),
      osVersion: typeof navigator !== 'undefined' ? navigator.platform || 'Web' : 'Web',
      appVersion: '1.0.0',
      platform: 'WEB',
    };
  },

  // -------------------------------------------------------------
  // Authentication & Devices
  // -------------------------------------------------------------
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
    const meta = this.getDeviceMeta();
    return await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...payload, ...meta }),
    });
  },

  async verifyEmail(email: string, code: string): Promise<AuthTokensResponse> {
    const meta = this.getDeviceMeta();
    return await request<AuthTokensResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code, ...meta }),
    });
  },

  async resendEmailVerification(
    email: string,
  ): Promise<{ success: boolean; delivered: boolean; message: string }> {
    return await request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async loginWithEmail(email: string, password: string): Promise<AuthTokensResponse> {
    const meta = this.getDeviceMeta();
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

  async googleSignInWithDto(dto: GoogleAuthDto): Promise<AuthTokensResponse> {
    return await request<AuthTokensResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(dto),
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
    const meta = this.getDeviceMeta();
    return await request<AuthTokensResponse>('/auth/google/link', {
      method: 'POST',
      body: JSON.stringify({ ...params, ...meta }),
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

  async getMyDevices(): Promise<{ devices: any[]; maxAllowed?: number; currentCount?: number; exceededLimit?: boolean }> {
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

  async logout(deviceId?: string) {
    const devId = deviceId || webStorage.getOrCreateDeviceId();
    try {
      await request<any>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ deviceId: devId }),
      });
    } finally {
      webStorage.clearAuthTokens();
    }
  },

  async logoutAll() {
    try {
      await request<any>('/auth/logout-all', {
        method: 'POST',
      });
    } finally {
      webStorage.clearAuthTokens();
    }
  },

  // -------------------------------------------------------------
  // Grades, Subjects & Dynamic Pricing
  // -------------------------------------------------------------
  async getGrades(): Promise<Grade[]> {
    return await request<Grade[]>('/grades?activeOnly=true');
  },

  async getPricingPlans(gradeId?: number, subjectId?: string): Promise<any[]> {
    const parts: string[] = [];
    if (gradeId) parts.push(`gradeId=${encodeURIComponent(String(gradeId))}`);
    if (subjectId) parts.push(`subjectId=${encodeURIComponent(subjectId)}`);
    const q = parts.join('&');
    return await request<any[]>(`/grades/pricing/plans${q ? `?${q}` : ''}`);
  },

  async getSubjects(): Promise<any[]> {
    const list = await request<any[]>('/subjects');
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    return list.filter((s) => {
      const codeKey = String(s.code || s.name || s.id).toUpperCase();
      if (seen.has(codeKey)) return false;
      seen.add(codeKey);
      return s.isActive !== false;
    });
  },

  // -------------------------------------------------------------
  // Books, Pages, Hotspots, Media, Answers & Reader Sync
  // -------------------------------------------------------------
  async getBooksByGrade(gradeId: number): Promise<Book[]> {
    const list = await request<Book[]>(`/content/grades/${gradeId}/books`);
    return (list || []).map((b) => ({
      ...b,
      coverImageUrl: resolveAssetUrl(b.coverImageUrl),
    }));
  },

  async getAllBooks(): Promise<Book[]> {
    const list = await request<Book[]>('/content/books');
    return (list || []).map((b) => ({
      ...b,
      coverImageUrl: resolveAssetUrl(b.coverImageUrl),
    }));
  },

  async getBookPages(bookId: string): Promise<any[]> {
    const pages = await request<any[]>(`/content/books/${bookId}/pages`);
    return (pages || []).map((p) => ({
      ...p,
      imageHighUrl: resolveAssetUrl(p.imageHighUrl),
      imageNormalUrl: resolveAssetUrl(p.imageNormalUrl),
      imageUrl: resolveAssetUrl(p.imageUrl),
    }));
  },

  async getBookPdfInfo(
    bookId: string,
  ): Promise<{ hasPdf: boolean; totalPages: number; contentStartPdfPage?: number }> {
    return await request<{ hasPdf: boolean; totalPages: number; contentStartPdfPage?: number }>(
      `/content/books/${bookId}/has-pdf`,
    );
  },

  getBookPdfUrl(bookId: string): string {
    return `${API_BASE}/content/books/${bookId}/pdf`;
  },

  async getBookHotspots(bookId: string): Promise<any[]> {
    return await request<any[]>(`/content/books/${bookId}/hotspots`);
  },

  async getMedia(bookId?: string): Promise<any[]> {
    const q = bookId ? `?bookId=${encodeURIComponent(bookId)}` : '';
    const list = await request<any[]>(`/content/media${q}`);
    return (list || []).map((m) => ({
      ...m,
      url: resolveAssetUrl(m.url) || m.url,
      thumbnailUrl: resolveAssetUrl(m.thumbnailUrl) || m.thumbnailUrl,
    }));
  },

  async getAnswerMappings(gradeId?: number, subjectId?: string): Promise<any[]> {
    const q = new URLSearchParams();
    if (gradeId) q.set('gradeId', String(gradeId));
    if (subjectId) q.set('subjectId', subjectId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const list = await request<any[]>(`/answer-mappings${qs}`);
    return (list || []).map((a) => ({
      ...a,
      imageUrl: resolveAssetUrl(a.imageUrl),
    }));
  },

  async getAnswerKeys(studentBookId?: string, studentPage?: number): Promise<any[]> {
    const q = new URLSearchParams();
    if (studentBookId) q.set('studentBookId', studentBookId);
    if (studentPage) q.set('studentPage', String(studentPage));
    const qs = q.toString() ? `?${q.toString()}` : '';
    const list = await request<any[]>(`/content/answers${qs}`);
    return (list || []).map((a) => ({
      ...a,
      imageUrl: resolveAssetUrl(a.imageUrl),
    }));
  },

  async getBookToc(bookId: string): Promise<any[]> {
    return await request<any[]>(`/content/books/${bookId}/toc`);
  },

  async getBookmarks(bookId: string): Promise<any[]> {
    return await request<any[]>(`/content/books/${bookId}/bookmarks`);
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
    return await request<any[]>(`/content/books/${bookId}/notes`);
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
    const q = pageNumber !== undefined ? `?pageNumber=${pageNumber}` : '';
    return await request<any[]>(`/content/books/${bookId}/drawings${q}`);
  },

  async saveDrawings(bookId: string, pageNumber: number, strokes: any[]) {
    return await request<any>(`/content/books/${bookId}/drawings/${pageNumber}`, {
      method: 'PUT',
      body: JSON.stringify({ strokes }),
    });
  },

  async getReadingProgress(): Promise<any[]> {
    const list = await request<any[]>('/content/progress');
    return (list || []).map((p) => ({
      ...p,
      coverImageUrl: resolveAssetUrl(p.coverImageUrl),
    }));
  },

  async saveReadingProgress(bookId: string, lastPageNumber: number) {
    return await request<any>('/content/progress', {
      method: 'POST',
      body: JSON.stringify({ bookId, lastPageNumber }),
    });
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
    return await request<AccessRequest[]>('/access-requests/my');
  },

  async getMySubscriptions(): Promise<Subscription[]> {
    return await request<Subscription[]>('/subscriptions/my');
  },
};
