import { mobileApi } from '../api/mobileApi';
import { LicenseVerifierService } from '../license/licenseVerifier';

export type AccessStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'LOCKED';

export interface GradeAccessInfo {
  gradeId: number;
  status: AccessStatus;
  daysRemaining: number;
  planName?: string;
  expiresAtFormatted?: string;
}

export class SubscriptionManager {
  // Demo subscription cache: Grade 11 is ACTIVE (25 days), Grade 10 is EXPIRED, others are LOCKED
  private static gradeAccessCache: Map<number, GradeAccessInfo> = new Map([
    [
      11,
      {
        gradeId: 11,
        status: 'ACTIVE',
        daysRemaining: 25,
        planName: '1 Oylik (30 kun)',
        expiresAtFormatted: new Date(Date.now() + 25 * 86400 * 1000).toLocaleDateString('uz-UZ'),
      },
    ],
    [
      10,
      {
        gradeId: 10,
        status: 'EXPIRED',
        daysRemaining: 0,
        planName: '3 Oylik (90 kun)',
        expiresAtFormatted: 'Kecha tugagan',
      },
    ],
  ]);

  static async getGradeAccess(gradeId: number): Promise<GradeAccessInfo> {
    const cached = this.gradeAccessCache.get(gradeId);
    if (cached) {
      return cached;
    }

    // Default for grades without subscription
    return {
      gradeId,
      status: 'LOCKED',
      daysRemaining: 0,
    };
  }

  static grantDemoAccess(gradeId: number, planName: string, days = 30): void {
    this.gradeAccessCache.set(gradeId, {
      gradeId,
      status: 'ACTIVE',
      daysRemaining: days,
      planName,
      expiresAtFormatted: new Date(Date.now() + days * 86400 * 1000).toLocaleDateString('uz-UZ'),
    });
  }

  static isAccessValid(info: GradeAccessInfo): boolean {
    return info.status === 'ACTIVE' || info.status === 'EXPIRING_SOON';
  }
}
