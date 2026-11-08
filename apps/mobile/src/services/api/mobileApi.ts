import { Platform } from 'react-native';
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

// Automatic platform host discovery
const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'android') {
    // Check if running on Android Emulator or Physical Device
    // For local development on physical phone over Wi-Fi, fallback to local LAN IP
    return 'http://10.0.2.2:4000/api/v1';
  }
  // Web or iOS Simulator
  return 'http://localhost:4000/api/v1';
};

const API_BASE = getApiBaseUrl();

export interface ApiError extends Error {
  status?: number;
  data?: any;
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

/**
 * Robust HTTP client with Automatic 401 Access Token Refresh Interceptor
 */
async function request<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
  const token = await secureStorage.getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as any),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options,
  });

  // Handle 401 Unauthorized -> Transparent Token Refresh
  if (res.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/google') && !endpoint.includes('/auth/refresh')) {
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

            // Retry original request with newly acquired access token
            return request<T>(endpoint, options, true);
          } else {
            // Refresh token has expired or was revoked
            isRefreshing = false;
            refreshSubscribers = [];
            await secureStorage.clearAuthTokens();
          }
        } catch {
          isRefreshing = false;
          refreshSubscribers = [];
        }
      } else {
        // Another request is already refreshing the token, wait for it
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

export const mobileApi = {
  /**
   * Section 14: Google OAuth 2.0 Sign-In
   */
  async googleSignInWithDto(dto: GoogleAuthDto): Promise<AuthTokensResponse> {
    return await request<AuthTokensResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Section 17: Explicit Refresh Session
   */
  async refreshToken(refreshToken: string, deviceId: string) {
    return await request<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken, deviceId }),
    });
  },

  /**
   * Section 18: Current Authenticated User Profile
   */
  async getProfile() {
    return await request<any>('/auth/me');
  },

  /**
   * Section 22: List Current User's Active Devices
   */
  async getMyDevices() {
    return await request<any>('/auth/devices');
  },

  /**
   * Section 21: Disconnect Active Device (Authenticated)
   */
  async disconnectDevice(deviceId: string) {
    return await request<any>(`/auth/devices/${deviceId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Section 21: Evict Device with Google ID Token (Pre-login Device Eviction)
   */
  async evictDeviceWithGoogleToken(idToken: string, deviceIdToRemove: string) {
    return await request<any>('/auth/devices/evict', {
      method: 'POST',
      body: JSON.stringify({ idToken, deviceIdToRemove }),
    });
  },

  /**
   * Disconnect Device by User ID (Fallback for pre-login modal)
   */
  async disconnectDeviceByUserId(userId: string, deviceIdToRemove: string) {
    return await request<any>(`/auth/devices/${userId}/disconnect`, {
      method: 'POST',
      body: JSON.stringify({ deviceIdToRemove }),
    });
  },

  /**
   * Section 18: Logout
   */
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

  // -------------------------------------------------------------
  // Educational Content & Subscriptions
  // -------------------------------------------------------------
  async getGrades(): Promise<Grade[]> {
    try {
      return await request<Grade[]>('/grades');
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

  async getBooksByGrade(gradeId: number): Promise<Book[]> {
    try {
      return await request<Book[]>(`/content/grades/${gradeId}/books`);
    } catch {
      return [];
    }
  },

  async getAllBooks(): Promise<Book[]> {
    try {
      return await request<Book[]>('/content/books');
    } catch {
      return [];
    }
  },

  async getAnswerMappings(gradeId?: number, subjectId?: string): Promise<any[]> {
    try {
      const q = new URLSearchParams();
      if (gradeId) q.set('gradeId', String(gradeId));
      if (subjectId) q.set('subjectId', subjectId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return await request<any[]>(`/answer-mappings${qs}`);
    } catch {
      return [];
    }
  },

  async getBookHotspots(bookId: string): Promise<any[]> {
    try {
      return await request<any[]>(`/content/books/${bookId}/hotspots`);
    } catch {
      return [];
    }
  },

  async getMedia(bookId?: string): Promise<any[]> {
    try {
      const q = bookId ? `?bookId=${bookId}` : '';
      return await request<any[]>(`/content/media${q}`);
    } catch {
      return [];
    }
  },

  async createAccessRequest(dto: CreateAccessRequestDto): Promise<AccessRequest> {
    try {
      return await request<AccessRequest>('/access-requests', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    } catch {
      return {
        id: `req_${Date.now()}`,
        userId: 'user_1',
        gradeId: dto.gradeId,
        plan: dto.plan,
        phoneNumber: dto.phoneNumber,
        status: 'PENDING' as any,
        priceUzs: dto.plan === 'MONTHLY' ? 119000 : dto.plan === 'THREE_MONTHS' ? 299000 : 890000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  async getMyRequests(): Promise<AccessRequest[]> {
    try {
      return await request<AccessRequest[]>('/access-requests/my');
    } catch {
      return [];
    }
  },

  async getMySubscriptions(): Promise<Subscription[]> {
    try {
      return await request<Subscription[]>('/subscriptions/my');
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

  async getBookManifest(bookId: string) {
    try {
      return await request<any>(`/content/books/${bookId}/manifest`);
    } catch {
      return null;
    }
  },

  // -------------------------------------------------------------
  // Email OTP Fallback
  // -------------------------------------------------------------
  async sendOtp(email: string): Promise<{ success: boolean; message: string }> {
    return await request<{ success: boolean; message: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(
    email: string,
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: { email: string; fullName: string; id: string } }> {
    return await request<{ accessToken: string; refreshToken: string; user: { email: string; fullName: string; id: string } }>(
      '/auth/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      },
    );
  },
};
