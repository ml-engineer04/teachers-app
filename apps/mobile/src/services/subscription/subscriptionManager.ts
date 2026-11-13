import { Platform } from 'react-native';
import { mobileApi } from '../api/mobileApi';
import { offlineStore } from '../storage/offlineStore';
import { Subscription } from '@smartteacherbook/shared';
import {
  AccessStatus,
  evaluateGradeAccessExpiry,
  GradeAccessInfo,
  isGradeAccessValid,
} from '../../utils/subscriptionHelpers';

export type { AccessStatus, GradeAccessInfo };

const SUBS_CACHE_KEY = 'stb_subscriptions_cache_v2';

interface PersistedSubCache {
  accessList: GradeAccessInfo[];
  subs: Subscription[];
}

export class SubscriptionManager {
  // Persisted + live backend subscriptions cache keyed by gradeId
  private static gradeAccessCache: Map<number, GradeAccessInfo> = new Map();
  private static allActiveSubscriptions: Subscription[] = [];
  private static initialized = false;
  private static asyncLoaded = false;

  private static loadLocalCache() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(SUBS_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const accessList: GradeAccessInfo[] = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.accessList)
            ? parsed.accessList
            : [];
          const subs: Subscription[] = Array.isArray(parsed?.subs) ? parsed.subs : [];
          accessList.forEach((item) => {
            this.gradeAccessCache.set(item.gradeId, evaluateGradeAccessExpiry(item));
          });
          if (subs.length > 0) this.allActiveSubscriptions = subs;
        }
      }
    } catch {}
  }

  private static async ensureAsyncCacheLoaded() {
    this.loadLocalCache();
    if (this.asyncLoaded) return;
    this.asyncLoaded = true;
    try {
      const stored = await offlineStore.getJson<PersistedSubCache>(SUBS_CACHE_KEY);
      if (stored && Array.isArray(stored.accessList) && this.gradeAccessCache.size === 0) {
        stored.accessList.forEach((item: GradeAccessInfo) => {
          this.gradeAccessCache.set(item.gradeId, evaluateGradeAccessExpiry(item));
        });
      }
      if (stored && Array.isArray(stored.subs) && this.allActiveSubscriptions.length === 0) {
        this.allActiveSubscriptions = stored.subs;
      }
    } catch {}
  }

  private static persistLocalCache() {
    const payload: PersistedSubCache = {
      accessList: Array.from(this.gradeAccessCache.values()),
      subs: this.allActiveSubscriptions,
    };
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(payload));
      }
    } catch {}
    offlineStore.putJson(SUBS_CACHE_KEY, payload).catch(() => {});
  }

  /**
   * Re-evaluates cached entries against current time without dropping offline cache.
   */
  private static refreshCacheExpiries() {
    const now = Date.now();
    this.gradeAccessCache.forEach((val, key) => {
      this.gradeAccessCache.set(key, evaluateGradeAccessExpiry(val, now));
    });
  }

  /**
   * Synchronizes granted subscriptions directly from NestJS (/api/v1/subscriptions/my),
   * and automatically re-evaluates expiration offline without false-offline timeouts.
   */
  static async syncFromBackend(): Promise<GradeAccessInfo[]> {
    await this.ensureAsyncCacheLoaded();
    this.refreshCacheExpiries();
    try {
      const subs = await mobileApi.getMySubscriptionsStrict();
      if (Array.isArray(subs)) {
        this.allActiveSubscriptions = subs;
        const nextMap = new Map<number, GradeAccessInfo>();
        const now = Date.now();

        for (const sub of subs) {
          const expiresIso =
            typeof sub.expiresAt === 'string'
              ? sub.expiresAt
              : sub.expiresAt
              ? new Date(sub.expiresAt).toISOString()
              : null;
          const expiresMs = expiresIso ? new Date(expiresIso).getTime() : 0;
          const diffDays = expiresMs > now ? Math.max(1, Math.ceil((expiresMs - now) / (86400 * 1000))) : 0;
          const isValid = Boolean(sub.isActive) && expiresMs > now;
          const status: AccessStatus = !isValid
            ? 'EXPIRED'
            : diffDays <= 5
            ? 'EXPIRING_SOON'
            : 'ACTIVE';

          const planLabel =
            sub.plan === 'YEARLY'
              ? '1 Yillik Obuna'
              : sub.plan === 'THREE_MONTHS'
              ? '3 Oylik Obuna'
              : '1 Oylik Obuna';

          const existing = nextMap.get(sub.gradeId);
          if (!existing || status === 'ACTIVE' || status === 'EXPIRING_SOON') {
            nextMap.set(sub.gradeId, {
              gradeId: sub.gradeId,
              status,
              daysRemaining: diffDays,
              planName: planLabel,
              subjectId: sub.subjectId,
              expiresAt: expiresIso,
              expiresAtFormatted: expiresIso ? new Date(expiresIso).toLocaleDateString('uz-UZ') : undefined,
            });
          }
        }

        this.gradeAccessCache = nextMap;
        this.persistLocalCache();
      }
    } catch {
      this.persistLocalCache();
    }
    return Array.from(this.gradeAccessCache.values());
  }

  static async getAllActiveAccess(): Promise<GradeAccessInfo[]> {
    await this.syncFromBackend();
    this.refreshCacheExpiries();
    return Array.from(this.gradeAccessCache.values());
  }

  static async getGradeAccess(gradeId: number, forceSync = true): Promise<GradeAccessInfo> {
    await this.ensureAsyncCacheLoaded();
    this.refreshCacheExpiries();
    if (forceSync) {
      await this.syncFromBackend();
      this.refreshCacheExpiries();
    }

    const current = this.gradeAccessCache.get(gradeId);
    if (current) {
      const evaluated = evaluateGradeAccessExpiry(current);
      this.gradeAccessCache.set(gradeId, evaluated);
      return evaluated;
    }

    if (!forceSync) {
      await this.syncFromBackend();
      const afterSync = this.gradeAccessCache.get(gradeId);
      if (afterSync) return evaluateGradeAccessExpiry(afterSync);
    }

    return {
      gradeId,
      status: 'LOCKED',
      daysRemaining: 0,
    };
  }

  private static subjectMatches(subSubjectId?: string | null, bookSubjectId?: string | null): boolean {
    if (!subSubjectId || !bookSubjectId) return true;
    const normalize = (v: string) =>
      v.trim().toLowerCase().replace(/^sub_/, '');
    const a = normalize(subSubjectId);
    const b = normalize(bookSubjectId);
    if (!a || !b) return true;
    if (a === b) return true;
    const aliases: Record<string, string> = {
      english: 'eng',
      eng: 'eng',
      math: 'math',
      matematika: 'math',
      physics: 'phys',
      phys: 'phys',
      fizika: 'phys',
      uzbek: 'uzb',
      uzb: 'uzb',
    };
    return (aliases[a] || a) === (aliases[b] || b);
  }

  /**
   * Unified access gate used across Home, Grade Catalog, Settings Offline List, and ReaderScreen.
   * Automatically locks access as soon as monthly subscription expires while keeping local files/notes intact.
   */
  static async checkBookAccess(params: {
    bookId: string;
    gradeId: number;
    subjectId?: string;
    forceSync?: boolean;
  }): Promise<{ allowed: boolean; access: GradeAccessInfo }> {
    const access = await this.getGradeAccess(params.gradeId || 11, params.forceSync ?? true);

    if (params.subjectId && this.allActiveSubscriptions.length > 0) {
      const now = Date.now();
      const matchingSubs = this.allActiveSubscriptions.filter(
        (sub) =>
          sub.gradeId === (params.gradeId || 11) &&
          this.subjectMatches(sub.subjectId, params.subjectId),
      );
      if (matchingSubs.length > 0) {
        const activeSub = matchingSubs.find(
          (sub) => Boolean(sub.isActive) && new Date(sub.expiresAt).getTime() > now,
        );
        if (activeSub) {
          const diffDays = Math.max(
            1,
            Math.ceil((new Date(activeSub.expiresAt).getTime() - now) / (86400 * 1000)),
          );
          return {
            allowed: true,
            access: {
              ...access,
              subjectId: activeSub.subjectId,
              daysRemaining: diffDays,
              status: diffDays <= 5 ? 'EXPIRING_SOON' : 'ACTIVE',
            },
          };
        }
        return {
          allowed: false,
          access: { ...access, status: 'EXPIRED', daysRemaining: 0 },
        };
      }
      return {
        allowed: false,
        access: { gradeId: params.gradeId || 11, status: 'LOCKED', daysRemaining: 0 },
      };
    }

    if (params.subjectId && access.subjectId && !this.subjectMatches(access.subjectId, params.subjectId)) {
      return {
        allowed: false,
        access: { gradeId: params.gradeId || 11, status: 'LOCKED', daysRemaining: 0 },
      };
    }

    return {
      allowed: this.isAccessValid(access),
      access,
    };
  }

  static grantDemoAccess(gradeId: number, planName: string, days = 30, subjectId?: string): void {
    this.loadLocalCache();
    const expiresDate = new Date(Date.now() + days * 86400 * 1000);
    this.gradeAccessCache.set(gradeId, {
      gradeId,
      status: days > 0 ? 'ACTIVE' : 'EXPIRED',
      daysRemaining: Math.max(0, days),
      planName,
      subjectId: subjectId || null,
      expiresAt: expiresDate.toISOString(),
      expiresAtFormatted: expiresDate.toLocaleDateString('uz-UZ'),
    });
    this.persistLocalCache();
  }

  static clearCache(): void {
    this.gradeAccessCache.clear();
    this.allActiveSubscriptions = [];
    this.persistLocalCache();
  }

  static isAccessValid(info: GradeAccessInfo): boolean {
    return isGradeAccessValid(info);
  }
}
