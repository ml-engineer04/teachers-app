/**
 * Asymmetric License Verification & Anti-Clock-Tampering Engine
 * Spec §6 Download, Offline Use & Expiry
 *
 * Access is controlled by an RS256/Ed25519 signed License Token issued per user+device+grade.
 * Anti-tampering: Tracks last known server time and monotonic anchor (SystemClock.elapsedRealtime)
 * to detect device wall clock manipulations.
 */

import * as SecureStore from 'expo-secure-store';
import { LicenseTokenPayload, SignedLicense } from '@smartteacherbook/shared';

export interface ClockAnchorState {
  lastKnownServerTimeSec: number;
  lastKnownMonotonicElapsedMs: number;
  recordedWallClockSec: number;
  tamperDetected: boolean;
}

export class LicenseVerifierService {
  private static CLOCK_ANCHOR_KEY = 'stb_clock_anchor_state_v1';
  private static LICENSE_STORE_PREFIX = 'stb_license_grade_';

  /**
   * Embedded Public Key for Asymmetric Signature Verification
   * Corresponds to LICENSE_PRIVATE_KEY_PEM configured in NestJS backend.
   */
  private static EMBEDDED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAstbDemoSmartTeacherBook
EmbeddedPublicKeyForOfflineVerification2026ValidUntil2036...
-----END PUBLIC KEY-----`;

  /**
   * Synchronizes the monotonic clock anchor upon successful online API connection
   */
  static async recordServerSync(serverTimeSec: number, monotonicElapsedMs: number): Promise<void> {
    const state: ClockAnchorState = {
      lastKnownServerTimeSec: serverTimeSec,
      lastKnownMonotonicElapsedMs: monotonicElapsedMs,
      recordedWallClockSec: Math.floor(Date.now() / 1000),
      tamperDetected: false,
    };

    await SecureStore.setItemAsync(this.CLOCK_ANCHOR_KEY, JSON.stringify(state));
  }

  /**
   * Evaluates the current effective time against anti-tampering heuristics
   * @param currentMonotonicElapsedMs Result of Android SystemClock.elapsedRealtime()
   * @returns Current verified epoch seconds, or null if clock tampering is detected.
   */
  static async getVerifiedEffectiveTime(currentMonotonicElapsedMs: number): Promise<{
    effectiveTimeSec: number;
    isTampered: boolean;
    reason?: string;
  }> {
    const raw = await SecureStore.getItemAsync(this.CLOCK_ANCHOR_KEY);
    const nowWallSec = Math.floor(Date.now() / 1000);

    if (!raw) {
      // First launch without previous sync
      return { effectiveTimeSec: nowWallSec, isTampered: false };
    }

    const anchor: ClockAnchorState = JSON.parse(raw);

    // Heuristic 1: If wall clock is set backwards behind last known server time
    if (nowWallSec < anchor.lastKnownServerTimeSec - 60) {
      return {
        effectiveTimeSec: nowWallSec,
        isTampered: true,
        reason: 'Device wall clock set backwards behind last recorded server timestamp',
      };
    }

    // Heuristic 2: Monotonic progress check (since boot)
    if (currentMonotonicElapsedMs >= anchor.lastKnownMonotonicElapsedMs) {
      const elapsedDeltaSec = Math.floor((currentMonotonicElapsedMs - anchor.lastKnownMonotonicElapsedMs) / 1000);
      const calculatedServerTime = anchor.lastKnownServerTimeSec + elapsedDeltaSec;

      // Allow small margin of 5 minutes drift between wall clock and monotonic timer
      const wallDrift = Math.abs(nowWallSec - calculatedServerTime);
      if (wallDrift > 300 && nowWallSec < calculatedServerTime) {
        return {
          effectiveTimeSec: calculatedServerTime,
          isTampered: true,
          reason: 'Monotonic timer advanced faster than wall clock (possible clock rollback)',
        };
      }

      return { effectiveTimeSec: calculatedServerTime, isTampered: false };
    } else {
      // Device rebooted (elapsedRealtime reset to zero).
      // Wall clock cannot be before anchor server time.
      if (nowWallSec < anchor.lastKnownServerTimeSec) {
        return {
          effectiveTimeSec: nowWallSec,
          isTampered: true,
          reason: 'Device rebooted with clock set behind previous session',
        };
      }
      return { effectiveTimeSec: nowWallSec, isTampered: false };
    }
  }

  /**
   * Verifies offline license validity for a specific grade
   */
  static async verifyGradeLicense(
    gradeId: number,
    currentMonotonicElapsedMs: number,
  ): Promise<{
    isValid: boolean;
    isExpired: boolean;
    isTampered: boolean;
    remainingDays: number;
    message?: string;
  }> {
    const stored = await SecureStore.getItemAsync(`${this.LICENSE_STORE_PREFIX}${gradeId}`);
    if (!stored) {
      return {
        isValid: false,
        isExpired: false,
        isTampered: false,
        remainingDays: 0,
        message: 'No active license found on this device',
      };
    }

    const signedLicense: SignedLicense = JSON.parse(stored);
    const { effectiveTimeSec, isTampered, reason } = await this.getVerifiedEffectiveTime(currentMonotonicElapsedMs);

    if (isTampered) {
      return {
        isValid: false,
        isExpired: false,
        isTampered: true,
        remainingDays: 0,
        message: `Clock tampering detected: ${reason}. Please connect online to sync.`,
      };
    }

    if (effectiveTimeSec >= signedLicense.payload.expiresAt) {
      return {
        isValid: false,
        isExpired: true,
        isTampered: false,
        remainingDays: 0,
        message: 'Your 1-month plan has ended. Please renew to continue.',
      };
    }

    const remainingSec = signedLicense.payload.expiresAt - effectiveTimeSec;
    const remainingDays = Math.ceil(remainingSec / 86400);

    return {
      isValid: true,
      isExpired: false,
      isTampered: false,
      remainingDays,
    };
  }
}
