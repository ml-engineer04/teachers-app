import * as crypto from 'crypto';

interface ClockAnchorState {
  lastKnownServerTimeSec: number;
  lastKnownMonotonicElapsedMs: number;
  recordedWallClockSec: number;
  tamperDetected: boolean;
}

function verifyEffectiveTime(
  anchor: ClockAnchorState,
  currentWallClockSec: number,
  currentMonotonicElapsedMs: number,
): { effectiveTimeSec: number; isTampered: boolean; reason?: string } {
  // Heuristic 1: Wall clock set backwards behind last known server time
  if (currentWallClockSec < anchor.lastKnownServerTimeSec - 60) {
    return {
      effectiveTimeSec: currentWallClockSec,
      isTampered: true,
      reason: 'Device wall clock set backwards behind last recorded server timestamp',
    };
  }

  // Heuristic 2: Monotonic progress check (since boot)
  if (currentMonotonicElapsedMs >= anchor.lastKnownMonotonicElapsedMs) {
    const elapsedDeltaSec = Math.floor((currentMonotonicElapsedMs - anchor.lastKnownMonotonicElapsedMs) / 1000);
    const calculatedServerTime = anchor.lastKnownServerTimeSec + elapsedDeltaSec;

    // If wall clock rolled backwards while monotonic timer kept ticking forward
    const wallDrift = Math.abs(currentWallClockSec - calculatedServerTime);
    if (wallDrift > 300 && currentWallClockSec < calculatedServerTime) {
      return {
        effectiveTimeSec: calculatedServerTime,
        isTampered: true,
        reason: 'Monotonic timer advanced faster than wall clock (clock rollback detected)',
      };
    }

    return { effectiveTimeSec: calculatedServerTime, isTampered: false };
  } else {
    // Device was rebooted (monotonic reset to 0)
    if (currentWallClockSec < anchor.lastKnownServerTimeSec) {
      return {
        effectiveTimeSec: currentWallClockSec,
        isTampered: true,
        reason: 'Device rebooted with clock set behind previous session',
      };
    }
    return { effectiveTimeSec: currentWallClockSec, isTampered: false };
  }
}

export function runClockTamperTests(): { name: string; passed: boolean; details: string }[] {
  const results: { name: string; passed: boolean; details: string }[] = [];
  const baseServerTime = 1794123200; // Mock server timestamp

  const initialAnchor: ClockAnchorState = {
    lastKnownServerTimeSec: baseServerTime,
    lastKnownMonotonicElapsedMs: 3600000, // 1 hour after boot
    recordedWallClockSec: baseServerTime,
    tamperDetected: false,
  };

  // Test 1: Normal legitimate clock advancement (10 minutes later)
  const t1 = verifyEffectiveTime(initialAnchor, baseServerTime + 600, 3600000 + 600000);
  results.push({
    name: 'Legitimate Time Progression (No Tampering)',
    passed: !t1.isTampered,
    details: `Effective time: ${t1.effectiveTimeSec}, Tampered: ${t1.isTampered}`,
  });

  // Test 2: User sets phone clock back by 30 days to bypass subscription expiry
  const thirtyDaysSec = 30 * 86400;
  const t2 = verifyEffectiveTime(initialAnchor, baseServerTime - thirtyDaysSec, 3600000 + 600000);
  results.push({
    name: '30-Day Clock Rollback Attack Detection',
    passed: t2.isTampered && t2.reason?.includes('backwards') === true,
    details: `Tamper detected: ${t2.isTampered}, Reason: ${t2.reason}`,
  });

  // Test 3: Monotonic anchor detection (Clock frozen while timer progresses)
  const t3 = verifyEffectiveTime(initialAnchor, baseServerTime, 3600000 + 3600000); // 1hr later but wall clock not moving
  results.push({
    name: 'Frozen Clock / Timer Drift Attack Detection',
    passed: t3.isTampered && t3.reason?.includes('Monotonic') === true,
    details: `Tamper detected: ${t3.isTampered}, Reason: ${t3.reason}`,
  });

  // Test 4: Device reboot with clock rolled back behind anchor
  const t4 = verifyEffectiveTime(initialAnchor, baseServerTime - 500, 10000); // rebooted (10s uptime), clock behind anchor
  results.push({
    name: 'Device Reboot with Past Timestamp Attack Detection',
    passed: t4.isTampered === true,
    details: `Tamper detected: ${t4.isTampered}, Reason: ${t4.reason}`,
  });

  return results;
}
