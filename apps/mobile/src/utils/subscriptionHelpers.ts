export type AccessStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'LOCKED';

export interface GradeAccessInfo {
  gradeId: number;
  status: AccessStatus;
  daysRemaining: number;
  planName?: string;
  subjectId?: string | null;
  expiresAt?: string | null;
  expiresAtFormatted?: string;
}

/**
 * Re-evaluates a cached grade subscription against current wall-clock time so
 * expired monthly plans lock automatically even offline before the next API sync.
 */
export function evaluateGradeAccessExpiry(
  info: GradeAccessInfo,
  nowMs: number = Date.now(),
): GradeAccessInfo {
  if (!info.expiresAt) {
    return info;
  }
  const expiresMs = Date.parse(info.expiresAt);
  if (!Number.isFinite(expiresMs)) {
    return info;
  }
  if (expiresMs <= nowMs) {
    return {
      ...info,
      status: 'EXPIRED',
      daysRemaining: 0,
    };
  }
  const diffDays = Math.max(1, Math.ceil((expiresMs - nowMs) / (86400 * 1000)));
  const status: AccessStatus = diffDays <= 5 ? 'EXPIRING_SOON' : 'ACTIVE';
  return {
    ...info,
    status,
    daysRemaining: diffDays,
  };
}

/**
 * Strict validity check ensuring monthly subscriptions lock immediately on expiry.
 */
export function isGradeAccessValid(
  info?: GradeAccessInfo | null,
  nowMs: number = Date.now(),
): boolean {
  if (!info) return false;
  const evaluated = evaluateGradeAccessExpiry(info, nowMs);
  return evaluated.status === 'ACTIVE' || evaluated.status === 'EXPIRING_SOON';
}
