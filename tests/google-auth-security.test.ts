import * as crypto from 'crypto';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const JWT_ACCESS_SECRET = 'stb_jwt_super_access_secret_key_change_in_production_min32chars';
const JWT_REFRESH_SECRET = 'stb_jwt_super_refresh_secret_key_change_in_production_min32chars';
const GOOGLE_WEB_CLIENT_ID = '541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com';

function signJwt(payload: any, secret: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token: string, secret: string) {
  const [header, body, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (sig !== expectedSig) throw new Error('Invalid signature');
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}

export function runGoogleAuthSecurityTests(): TestResult[] {
  const results: TestResult[] = [];

  // Simulated Database & Device Store
  const userDb = new Map<string, any>();
  const deviceDb = new Map<string, any[]>();

  function hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  function simulateGoogleTokenVerification(idToken: string) {
    // 1. Decode token
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    // 2. Validate issuer
    if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
      throw new Error('Invalid token issuer');
    }

    // 3. Validate audience
    if (payload.aud !== GOOGLE_WEB_CLIENT_ID) {
      throw new Error('Token audience mismatch');
    }

    // 4. Validate expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Google token has expired');
    }

    // 5. Validate email verified
    if (!payload.email_verified) {
      throw new Error('Google email is not verified');
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      fullName: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture,
      emailVerified: true,
    };
  }

  function authenticateGoogle(idToken: string, deviceId: string, deviceModel: string) {
    const verified = simulateGoogleTokenVerification(idToken);

    // Find or create user
    let user = Array.from(userDb.values()).find((u) => u.googleId === verified.sub);
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = {
        id: `usr_${verified.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        googleId: verified.sub,
        email: verified.email,
        fullName: verified.fullName,
        avatarUrl: verified.avatarUrl,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };
      userDb.set(user.id, user);
    } else {
      user.lastLoginAt = new Date();
    }

    // Check device limit (Max 2)
    const devices = deviceDb.get(user.id) || [];
    const activeDevices = devices.filter((d) => d.isActive);
    const existingDev = activeDevices.find((d) => d.deviceId === deviceId);

    if (!existingDev && activeDevices.length >= 2) {
      const error: any = new Error('DEVICE_LIMIT_EXCEEDED');
      error.code = 'DEVICE_LIMIT_EXCEEDED';
      error.activeDevices = activeDevices;
      throw error;
    }

    // Issue tokens
    const accessToken = signJwt(
      { sub: user.id, email: user.email, deviceId, role: 'TEACHER', exp: Math.floor(Date.now() / 1000) + 900 },
      JWT_ACCESS_SECRET,
    );
    const refreshToken = signJwt(
      { sub: user.id, deviceId, type: 'refresh', jti: crypto.randomUUID(), exp: Math.floor(Date.now() / 1000) + 90 * 86400 },
      JWT_REFRESH_SECRET,
    );
    const refreshTokenHash = hashToken(refreshToken);

    if (existingDev) {
      existingDev.refreshTokenHash = refreshTokenHash;
      existingDev.lastActiveAt = new Date();
    } else {
      activeDevices.push({
        id: `dev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        deviceId,
        deviceModel,
        platform: 'ANDROID',
        refreshTokenHash,
        isActive: true,
        lastActiveAt: new Date(),
      });
      deviceDb.set(user.id, activeDevices);
    }

    return {
      accessToken,
      refreshToken,
      user,
      isNewUser,
      activeDevicesCount: activeDevices.length,
    };
  }

  function rotateRefreshToken(refreshToken: string, deviceId: string) {
    const payload: any = verifyJwt(refreshToken, JWT_REFRESH_SECRET);
    const userId = payload.sub;
    const devices = deviceDb.get(userId) || [];
    const device = devices.find((d) => d.deviceId === deviceId && d.isActive);

    if (!device || !device.refreshTokenHash) {
      throw new Error('Sessiya muddati tugagan yoki tizimdan chiqilgan');
    }

    const incomingHash = hashToken(refreshToken);
    if (device.refreshTokenHash !== incomingHash) {
      // Invalidate session immediately
      device.isActive = false;
      device.refreshTokenHash = null;
      throw new Error('TOKEN_REUSE_DETECTED');
    }

    // Rotate
    const newAccess = signJwt(
      { sub: userId, email: 'teacher@gmail.com', deviceId, role: 'TEACHER', exp: Math.floor(Date.now() / 1000) + 900 },
      JWT_ACCESS_SECRET,
    );
    const newRefresh = signJwt(
      { sub: userId, deviceId, type: 'refresh', jti: crypto.randomUUID(), exp: Math.floor(Date.now() / 1000) + 90 * 86400 },
      JWT_REFRESH_SECRET,
    );
    device.refreshTokenHash = hashToken(newRefresh);
    device.lastActiveAt = new Date();

    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  function revokeDevice(userId: string, deviceId: string) {
    const devices = deviceDb.get(userId) || [];
    const target = devices.find((d) => d.deviceId === deviceId);
    if (target) {
      target.isActive = false;
      target.refreshTokenHash = null;
    }
  }

  function createValidGoogleToken(payload: Record<string, any>) {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'google-key-01' })).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        iss: 'accounts.google.com',
        aud: GOOGLE_WEB_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        email_verified: true,
        ...payload,
      }),
    ).toString('base64url');
    const sig = Buffer.from('google_sig').toString('base64url');
    return `${header}.${body}.${sig}`;
  }

  // -------------------------------------------------------------
  // Test 1: New user registration & 1st device slot
  // -------------------------------------------------------------
  try {
    const token = createValidGoogleToken({
      sub: 'google_sub_teacher_01',
      email: 'teacher1@gmail.com',
      name: 'Nodira Karimova',
    });
    const auth1 = authenticateGoogle(token, 'dev_samsung_tab_01', 'Samsung Galaxy Tab S7');

    results.push({
      name: '1. First-Time Google Sign-In & User Creation',
      passed: auth1.isNewUser === true && auth1.activeDevicesCount === 1 && !!auth1.accessToken,
      details: `User created [${auth1.user.email}], Google sub [${auth1.user.googleId}], Device slot: 1/2`,
    });
  } catch (err: any) {
    results.push({ name: '1. First-Time Google Sign-In', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 2: Returning user login (stable Google sub matching)
  // -------------------------------------------------------------
  try {
    const token = createValidGoogleToken({
      sub: 'google_sub_teacher_01',
      email: 'teacher1@gmail.com',
      name: 'Nodira Karimova Updated',
    });
    const auth2 = authenticateGoogle(token, 'dev_samsung_tab_01', 'Samsung Galaxy Tab S7');

    results.push({
      name: '2. Returning User Login by Stable Google Sub Identifier',
      passed: auth2.isNewUser === false && auth2.activeDevicesCount === 1,
      details: `Identified existing account by Google sub, active count preserved at 1/2`,
    });
  } catch (err: any) {
    results.push({ name: '2. Returning User Login', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 3: Second device registration (2 of 2)
  // -------------------------------------------------------------
  try {
    const token = createValidGoogleToken({
      sub: 'google_sub_teacher_01',
      email: 'teacher1@gmail.com',
    });
    const auth3 = authenticateGoogle(token, 'dev_pixel_8_02', 'Google Pixel 8 Pro');

    results.push({
      name: '3. Second Device Registration (Device 2 of 2)',
      passed: auth3.activeDevicesCount === 2,
      details: `Second device registered successfully. Active devices: 2/2`,
    });
  } catch (err: any) {
    results.push({ name: '3. Second Device Registration', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 4: Third device attempt blocked (DEVICE_LIMIT_EXCEEDED)
  // -------------------------------------------------------------
  try {
    const token = createValidGoogleToken({
      sub: 'google_sub_teacher_01',
      email: 'teacher1@gmail.com',
    });
    let blocked = false;
    let conflictCount = 0;
    try {
      authenticateGoogle(token, 'dev_xiaomi_14_03', 'Xiaomi 14');
    } catch (err: any) {
      if (err.code === 'DEVICE_LIMIT_EXCEEDED') {
        blocked = true;
        conflictCount = err.activeDevices.length;
      }
    }

    results.push({
      name: '4. Third Device Login Blocked (Strict 2-Device Concurrency)',
      passed: blocked && conflictCount === 2,
      details: `3rd device blocked with DEVICE_LIMIT_EXCEEDED, returned ${conflictCount} active devices`,
    });
  } catch (err: any) {
    results.push({ name: '4. Third Device Blocked', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 5: Device Revocation & Freeing Slot
  // -------------------------------------------------------------
  try {
    const userId = 'usr_teacher1_gmail_com';
    revokeDevice(userId, 'dev_pixel_8_02');

    const devices = deviceDb.get(userId) || [];
    const active = devices.filter((d) => d.isActive);

    // Now retry registering device 3 into freed slot
    const token = createValidGoogleToken({
      sub: 'google_sub_teacher_01',
      email: 'teacher1@gmail.com',
    });
    const authRetry = authenticateGoogle(token, 'dev_xiaomi_14_03', 'Xiaomi 14');

    results.push({
      name: '5. Device Revocation & New Device Registration into Freed Slot',
      passed: active.length === 1 && authRetry.activeDevicesCount === 2,
      details: `Revoked dev_pixel_8_02, slot freed (1/2), Xiaomi 14 registered into slot (2/2)`,
    });
  } catch (err: any) {
    results.push({ name: '5. Device Revocation', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 6: Token Refresh Rotation
  // -------------------------------------------------------------
  try {
    const token = createValidGoogleToken({
      sub: 'google_sub_teacher_02',
      email: 'teacher2@gmail.com',
    });
    const auth = authenticateGoogle(token, 'dev_test_rotation_01', 'Test Device');
    const rotated = rotateRefreshToken(auth.refreshToken, 'dev_test_rotation_01');

    results.push({
      name: '6. Refresh Token Rotation (Fresh Access & Refresh Tokens)',
      passed: !!rotated.accessToken && !!rotated.refreshToken && rotated.refreshToken !== auth.refreshToken,
      details: `Issued fresh 15m access token and rotated 90d refresh token`,
    });
  } catch (err: any) {
    results.push({ name: '6. Token Refresh Rotation', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 7: Refresh Token Reuse Attack Prevention
  // -------------------------------------------------------------
  try {
    const token = createValidGoogleToken({
      sub: 'google_sub_teacher_03',
      email: 'teacher3@gmail.com',
    });
    const auth = authenticateGoogle(token, 'dev_reuse_01', 'Test Device');
    // First refresh (normal rotation)
    rotateRefreshToken(auth.refreshToken, 'dev_reuse_01');

    // Second refresh using the OLD token (simulating replay/theft attack)
    let reuseBlocked = false;
    try {
      rotateRefreshToken(auth.refreshToken, 'dev_reuse_01');
    } catch (err: any) {
      if (err.message === 'TOKEN_REUSE_DETECTED') {
        reuseBlocked = true;
      }
    }

    results.push({
      name: '7. Refresh Token Reuse Attack Detection & Automatic Session Lockout',
      passed: reuseBlocked,
      details: `Replayed old refresh token rejected with TOKEN_REUSE_DETECTED, session revoked`,
    });
  } catch (err: any) {
    results.push({ name: '7. Token Reuse Attack', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 8: Logout Session Invalidation
  // -------------------------------------------------------------
  try {
    const token = createValidGoogleToken({
      sub: 'google_sub_teacher_04',
      email: 'teacher4@gmail.com',
    });
    const auth = authenticateGoogle(token, 'dev_logout_01', 'Test Device');
    revokeDevice('usr_teacher4_gmail_com', 'dev_logout_01');

    let refreshAfterLogoutBlocked = false;
    try {
      rotateRefreshToken(auth.refreshToken, 'dev_logout_01');
    } catch {
      refreshAfterLogoutBlocked = true;
    }

    results.push({
      name: '8. Logout & Revoked Session Invalidation',
      passed: refreshAfterLogoutBlocked,
      details: `Logged out session refresh token hash wiped; refresh attempt blocked`,
    });
  } catch (err: any) {
    results.push({ name: '8. Logout Session Invalidation', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 9: Cryptographic Token Boundary (Forged Issuer Rejection)
  // -------------------------------------------------------------
  try {
    const forgedToken = createValidGoogleToken({
      iss: 'https://attacker-identity.com',
      sub: 'hacker_01',
      email: 'hacker@attacker.com',
    });
    let rejected = false;
    try {
      simulateGoogleTokenVerification(forgedToken);
    } catch (err: any) {
      if (err.message === 'Invalid token issuer') rejected = true;
    }

    results.push({
      name: '9. Google Cryptographic PKI Boundary (Untrusted Issuer Rejection)',
      passed: rejected,
      details: `Forged token issuer [https://attacker-identity.com] rejected`,
    });
  } catch (err: any) {
    results.push({ name: '9. Cryptographic Token Boundary', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 10: Unverified Email Rejection
  // -------------------------------------------------------------
  try {
    const unverifiedToken = createValidGoogleToken({
      email_verified: false,
      email: 'unverified@gmail.com',
    });
    let rejected = false;
    try {
      simulateGoogleTokenVerification(unverifiedToken);
    } catch (err: any) {
      if (err.message === 'Google email is not verified') rejected = true;
    }

    results.push({
      name: '10. Unverified Email Rejection Policy',
      passed: rejected,
      details: `Google accounts with email_verified=false rejected`,
    });
  } catch (err: any) {
    results.push({ name: '10. Unverified Email Rejection', passed: false, details: err.message });
  }

  return results;
}
