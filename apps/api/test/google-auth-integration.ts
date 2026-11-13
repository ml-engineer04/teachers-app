import { ConflictException, ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from '../src/modules/auth/auth.service';
import { GoogleTokenVerifierService } from '../src/modules/auth/services/google-token-verifier.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { AuthRateLimitGuard } from '../src/modules/auth/guards/auth-rate-limit.guard';
import { UsersService } from '../src/modules/users/users.service';

export interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const TEST_CLIENT_ID = 'test-client-123456.apps.googleusercontent.com';
const TEST_ACCESS_SECRET = 'test_jwt_access_secret_min_32_characters_long_123';
const TEST_REFRESH_SECRET = 'test_jwt_refresh_secret_min_32_characters_long_456';

function buildConfigService(): ConfigService {
  const map: Record<string, string> = {
    NODE_ENV: 'test',
    GOOGLE_CLIENT_ID: TEST_CLIENT_ID,
    GOOGLE_WEB_CLIENT_ID: TEST_CLIENT_ID,
    JWT_SECRET: TEST_ACCESS_SECRET,
    JWT_ACCESS_SECRET: TEST_ACCESS_SECRET,
    JWT_REFRESH_SECRET: TEST_REFRESH_SECRET,
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '90d',
  };
  return {
    get: (key: string) => map[key],
  } as unknown as ConfigService;
}

export async function runGoogleAuthIntegrationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const capturedEmails: Array<{ to: string; code: string; kind: string }> = [];
  const fakeEmailService: any = {
    sendVerificationOtp: async (to: string, code: string) => {
      capturedEmails.push({ to, code, kind: 'VERIFY' });
      return { success: true, delivered: true };
    },
    sendPasswordResetCode: async (to: string, code: string) => {
      capturedEmails.push({ to, code, kind: 'RESET' });
      return { success: true, delivered: true };
    },
    sendAccountLinkCode: async (to: string, code: string) => {
      capturedEmails.push({ to, code, kind: 'LINK' });
      return { success: true, delivered: true };
    },
  };

  const fakePrisma: any = { isConnected: false };
  const fakeSubsService: any = { findByUserId: async () => [] };
  const configService = buildConfigService();
  const jwtService = new JwtService({});
  const usersService = new UsersService(fakePrisma);
  const verifier = new GoogleTokenVerifierService(configService);
  const authService = new AuthService(
    jwtService,
    configService,
    fakeEmailService,
    fakePrisma,
    verifier,
    usersService,
    fakeSubsService,
  );
  const jwtStrategy = new JwtStrategy(configService);

  // Stub OAuth2Client.prototype.verifyIdToken ONLY to simulate signed Google RS256 payloads per token key
  const mockPayloads = new Map<string, any>();
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  OAuth2Client.prototype.verifyIdToken = (async (options: any) => {
    const payload = mockPayloads.get(options.idToken);
    if (!payload) {
      throw new Error('Invalid token signature');
    }
    return {
      getPayload: () => payload,
    } as any;
  }) as any;

  try {
    const devA = {
      deviceId: 'device_web_01',
      deviceModel: 'Chrome Web',
      osVersion: 'macOS',
      appVersion: '1.0.0',
      platform: 'WEB',
    };
    const devB = { ...devA, deviceId: 'device_android_02', deviceModel: 'Galaxy Tab' };
    const devC = { ...devA, deviceId: 'device_ios_03', deviceModel: 'iPhone 15' };

    // 1. Scenario A: New Google user login creates account + ExternalAccount + JWT
    mockPayloads.set('tok_new_google', {
      iss: 'https://accounts.google.com',
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600,
      sub: 'g_sub_new_001',
      email: 'Nodira.Teacher@Gmail.com',
      email_verified: true,
      given_name: 'Nodira',
      family_name: 'Karimova',
      name: 'Nodira Karimova',
      picture: 'https://lh3.googleusercontent.com/a/nodira',
      nonce: 'nonce_abc_123',
    });

    let googleUserSession: any = null;
    try {
      googleUserSession = await authService.authenticateGoogle({
        idToken: 'tok_new_google',
        nonce: 'nonce_abc_123',
        ...devA,
      });

      const ok =
        Boolean(googleUserSession.accessToken) &&
        Boolean(googleUserSession.refreshToken) &&
        googleUserSession.user.email === 'nodira.teacher@gmail.com' &&
        googleUserSession.user.firstName === 'Nodira' &&
        googleUserSession.user.lastName === 'Karimova' &&
        googleUserSession.user.authProvider === 'GOOGLE' &&
        googleUserSession.user.emailVerified === true;

      results.push({
        name: '1. Scenario A: New Google Account Registration & Profile Extraction',
        passed: ok,
        details: `Created user [${googleUserSession.user.id}] (${googleUserSession.user.firstName} ${googleUserSession.user.lastName}), provider=${googleUserSession.user.authProvider}`,
      });
    } catch (err: any) {
      results.push({ name: '1. Scenario A: New Google User', passed: false, details: err.message });
    }

    // 2. Scenario B: Returning Google user -> same account, no duplicate
    try {
      const returning = await authService.authenticateGoogle({
        idToken: 'tok_new_google',
        nonce: 'nonce_abc_123',
        ...devB,
      });
      const allUsers = await usersService.findAll();
      const matchingUsers = allUsers.filter((u) => u.email === 'nodira.teacher@gmail.com');

      results.push({
        name: '2. Scenario B: Returning Google User Matched Without Duplicate',
        passed: returning.user.id === googleUserSession?.user?.id && matchingUsers.length === 1,
        details: `Same userId [${returning.user.id}] reused across 2 devices, user count=1`,
      });
    } catch (err: any) {
      results.push({ name: '2. Scenario B: Returning Google User', passed: false, details: err.message });
    }

    // 3. Invalid, Wrong Issuer, Wrong Audience, Mismatched Nonce
    try {
      mockPayloads.set('tok_wrong_nonce', {
        iss: 'accounts.google.com',
        aud: TEST_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'g_sub_nonce',
        email: 'nonce@gmail.com',
        email_verified: true,
        nonce: 'different_nonce',
      });
      mockPayloads.set('tok_wrong_aud', {
        iss: 'accounts.google.com',
        aud: 'attacker-other-app.apps.googleusercontent.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'g_sub_aud',
        email: 'aud@gmail.com',
        email_verified: true,
      });
      mockPayloads.set('tok_wrong_iss', {
        iss: 'https://evil-issuer.example',
        aud: TEST_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'g_sub_iss',
        email: 'iss@gmail.com',
        email_verified: true,
      });

      let rejectedInvalid = false;
      let rejectedNonce = false;
      let rejectedAud = false;
      let rejectedIss = false;

      try {
        await authService.authenticateGoogle({ idToken: 'garbage.jwt.sig', ...devA });
      } catch (e) {
        rejectedInvalid = e instanceof UnauthorizedException;
      }
      try {
        await authService.authenticateGoogle({ idToken: 'tok_wrong_nonce', nonce: 'expected_nonce', ...devA });
      } catch (e) {
        rejectedNonce = e instanceof UnauthorizedException;
      }
      try {
        await authService.authenticateGoogle({ idToken: 'tok_wrong_aud', ...devA });
      } catch (e) {
        rejectedAud = e instanceof UnauthorizedException;
      }
      try {
        await authService.authenticateGoogle({ idToken: 'tok_wrong_iss', ...devA });
      } catch (e) {
        rejectedIss = e instanceof UnauthorizedException;
      }

      results.push({
        name: '3. Reject Invalid Signature, Nonce Mismatch, Wrong Aud & Wrong Issuer',
        passed: rejectedInvalid && rejectedNonce && rejectedAud && rejectedIss,
        details: `invalid=${rejectedInvalid}, nonce=${rejectedNonce}, aud=${rejectedAud}, iss=${rejectedIss}`,
      });
    } catch (err: any) {
      results.push({ name: '3. Google Claim Validation', passed: false, details: err.message });
    }

    // 4. Expired Google Token & Unverified Email (Scenario D)
    try {
      mockPayloads.set('tok_expired', {
        iss: 'https://accounts.google.com',
        aud: TEST_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) - 120,
        sub: 'g_sub_exp',
        email: 'exp@gmail.com',
        email_verified: true,
      });
      mockPayloads.set('tok_unverified', {
        iss: 'https://accounts.google.com',
        aud: TEST_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'g_sub_unv',
        email: 'unverified@gmail.com',
        email_verified: false,
      });

      let expMsg = '';
      let unvMsg = '';
      try {
        await authService.authenticateGoogle({ idToken: 'tok_expired', ...devA });
      } catch (e: any) {
        if (e instanceof UnauthorizedException) expMsg = e.message;
      }
      try {
        await authService.authenticateGoogle({ idToken: 'tok_unverified', ...devA });
      } catch (e: any) {
        if (e instanceof UnauthorizedException) unvMsg = e.message;
      }

      results.push({
        name: '4. Reject Expired Google Token & Unverified Google Email (Scenario D)',
        passed: expMsg.includes('GOOGLE_TOKEN_EXPIRED') && unvMsg.includes('GOOGLE_EMAIL_NOT_VERIFIED'),
        details: `expiredCode=${expMsg.split(':')[0]}, unverifiedCode=${unvMsg.split(':')[0]}`,
      });
    } catch (err: any) {
      results.push({ name: '4. Expired & Unverified Google Rejection', passed: false, details: err.message });
    }

    // 5. Email Register -> Verify -> Wrong Password -> Login -> Forgot/Reset Password
    try {
      const regEmail = 'aziz.physics@school.uz';
      const regRes = await authService.registerWithEmail({
        email: regEmail,
        password: 'InitialPassword#1',
        firstName: 'Aziz',
        lastName: 'Rahimov',
      });

      const verifyMail = [...capturedEmails].reverse().find((e) => e.to === regEmail && e.kind === 'VERIFY');

      let blockedUnverified = false;
      try {
        await authService.loginWithEmail({ email: regEmail, password: 'InitialPassword#1', ...devA });
      } catch (e: any) {
        blockedUnverified = e instanceof ForbiddenException && (e.getResponse() as any)?.code === 'EMAIL_NOT_VERIFIED';
      }

      let wrongCodeRejected = false;
      try {
        await authService.verifyEmail({ email: regEmail, code: '000000', ...devA });
      } catch (e) {
        wrongCodeRejected = e instanceof UnauthorizedException;
      }

      const verifiedSession = await authService.verifyEmail({
        email: regEmail,
        code: verifyMail!.code,
        ...devA,
      });

      let dupRejected = false;
      try {
        await authService.registerWithEmail({ email: regEmail, password: 'AnotherPassword#9' });
      } catch (e) {
        dupRejected = e instanceof ConflictException;
      }

      let wrongPwdRejected = false;
      try {
        await authService.loginWithEmail({ email: regEmail, password: 'WrongPassword!1', ...devA });
      } catch (e) {
        wrongPwdRejected = e instanceof UnauthorizedException;
      }

      await authService.forgotPassword({ email: regEmail });
      const resetMail = [...capturedEmails].reverse().find((e) => e.to === regEmail && e.kind === 'RESET');
      await authService.resetPassword({
        email: regEmail,
        code: resetMail!.code,
        newPassword: 'UpdatedPassword#2026',
      });

      let oldRefreshRevokedAfterReset = false;
      try {
        await authService.refreshSession({ refreshToken: verifiedSession.refreshToken, deviceId: devA.deviceId });
      } catch (e) {
        oldRefreshRevokedAfterReset = e instanceof UnauthorizedException;
      }

      const reloginSession = await authService.loginWithEmail({
        email: regEmail,
        password: 'UpdatedPassword#2026',
        ...devA,
      });

      results.push({
        name: '5. Email Register, Verification, Wrong Password, Duplicate Prevention & Reset Password',
        passed:
          regRes.requiresVerification &&
          blockedUnverified &&
          wrongCodeRejected &&
          Boolean(verifiedSession.accessToken) &&
          dupRejected &&
          wrongPwdRejected &&
          oldRefreshRevokedAfterReset &&
          reloginSession.user.authProvider === 'EMAIL',
        details: `Verified, duplicate blocked, wrong pwd rejected, password reset revoked old session & relogged in`,
      });
    } catch (err: any) {
      results.push({ name: '5. Email Auth Flows', passed: false, details: err.message });
    }

    // 6. Scenario C: Existing Email/Password User NEVER Auto-Linked to Google
    try {
      const targetEmail = 'aziz.physics@school.uz';
      mockPayloads.set('tok_aziz_google', {
        iss: 'https://accounts.google.com',
        aud: TEST_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'g_sub_aziz_999',
        email: targetEmail,
        email_verified: true,
        given_name: 'Aziz',
        family_name: 'Rahimov',
      });

      let linkChallenge: any = null;
      try {
        await authService.authenticateGoogle({ idToken: 'tok_aziz_google', ...devA });
      } catch (e: any) {
        if (e instanceof ConflictException) {
          linkChallenge = e.getResponse();
        }
      }

      let badLinkPasswordRejected = false;
      try {
        await authService.linkGoogleAccount({
          linkToken: linkChallenge.linkToken,
          password: 'NotMyPassword',
          ...devA,
        });
      } catch (e) {
        badLinkPasswordRejected = e instanceof UnauthorizedException;
      }

      const linkedSession = await authService.linkGoogleAccount({
        linkToken: linkChallenge.linkToken,
        password: 'UpdatedPassword#2026',
        ...devA,
      });

      const scenarioBAfterLink = await authService.authenticateGoogle({ idToken: 'tok_aziz_google', ...devA });

      results.push({
        name: '6. Scenario C: Existing Email Account Requires Ownership Proof Before Linking Google',
        passed:
          linkChallenge?.code === 'ACCOUNT_LINKING_REQUIRED' &&
          linkChallenge?.hasPassword === true &&
          badLinkPasswordRejected &&
          linkedSession.user.authProvider === 'EMAIL,GOOGLE' &&
          scenarioBAfterLink.user.id === linkedSession.user.id,
        details: `409 ACCOUNT_LINKING_REQUIRED returned first; linked only after password proof -> authProvider=${linkedSession.user.authProvider}`,
      });
    } catch (err: any) {
      results.push({ name: '6. Scenario C Verified Linking', passed: false, details: err.message });
    }

    // 7. Scenario C via 6-digit Email Confirmation Code
    try {
      const otpUserEmail = 'otp-holder@school.uz';
      await authService.sendOtp(otpUserEmail);
      const otpMail = [...capturedEmails].reverse().find((e) => e.to === otpUserEmail && e.kind === 'VERIFY');
      await authService.verifyOtp(otpUserEmail, otpMail!.code, devA.deviceId, devA.deviceModel, devA.platform);

      mockPayloads.set('tok_otp_holder_google', {
        iss: 'https://accounts.google.com',
        aud: TEST_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'g_sub_otp_holder_555',
        email: otpUserEmail,
        email_verified: true,
        name: 'OTP Holder',
      });

      let challenge409: any = null;
      try {
        await authService.authenticateGoogle({ idToken: 'tok_otp_holder_google', ...devA });
      } catch (e: any) {
        if (e instanceof ConflictException) challenge409 = e.getResponse();
      }

      await authService.sendGoogleLinkCode({ linkToken: challenge409.linkToken });
      const linkCodeMail = [...capturedEmails].reverse().find((e) => e.to === otpUserEmail && e.kind === 'LINK');
      const codeLinkedSession = await authService.linkGoogleAccount({
        linkToken: challenge409.linkToken,
        otpCode: linkCodeMail!.code,
        ...devA,
      });

      results.push({
        name: '7. Scenario C via 6-Digit Email Ownership Code (No Password Account)',
        passed:
          challenge409?.hasPassword === false &&
          Boolean(codeLinkedSession.accessToken) &&
          codeLinkedSession.user.authProvider.includes('GOOGLE'),
        details: `Verified link via 6-digit GOOGLE_LINK code -> authProvider=${codeLinkedSession.user.authProvider}`,
      });
    } catch (err: any) {
      results.push({ name: '7. Email Code Linking', passed: false, details: err.message });
    }

    // 8. JWT Protected Route Validation, Google Token Rejection, Rotation, Reuse & Logout
    try {
      const decodedAccess = jwtService.verify(googleUserSession.accessToken, { secret: TEST_ACCESS_SECRET });
      const reqUser = await jwtStrategy.validate(decodedAccess);

      let refreshRejectedAsAccess = false;
      const decodedRefresh = jwtService.verify(googleUserSession.refreshToken, { secret: TEST_REFRESH_SECRET });
      try {
        await jwtStrategy.validate(decodedRefresh);
      } catch (e) {
        refreshRejectedAsAccess = e instanceof UnauthorizedException;
      }

      let googleTokenRejectedByAppJwt = false;
      try {
        jwtService.verify('tok_new_google', { secret: TEST_ACCESS_SECRET });
      } catch {
        googleTokenRejectedByAppJwt = true;
      }

      const rotated = await authService.refreshSession({
        refreshToken: googleUserSession.refreshToken,
        deviceId: devA.deviceId,
      });

      let replayDetected = false;
      try {
        await authService.refreshSession({
          refreshToken: googleUserSession.refreshToken,
          deviceId: devA.deviceId,
        });
      } catch (e: any) {
        replayDetected = e instanceof UnauthorizedException && e.message.includes('REFRESH_TOKEN_REVOKED');
      }

      const loggedOut = await authService.logout(googleUserSession.user.id, devB.deviceId);
      let thirdDeviceBlockedBeforeEvict = false;
      await authService.authenticateGoogle({ idToken: 'tok_new_google', nonce: 'nonce_abc_123', ...devA });
      await authService.authenticateGoogle({ idToken: 'tok_new_google', nonce: 'nonce_abc_123', ...devB });
      try {
        await authService.authenticateGoogle({ idToken: 'tok_new_google', nonce: 'nonce_abc_123', ...devC });
      } catch (e: any) {
        thirdDeviceBlockedBeforeEvict = e instanceof ForbiddenException;
      }

      results.push({
        name: '8. JWT Validation, Refresh Rotation, Replay Reuse Detection, Logout & 2-Device Limit',
        passed:
          reqUser.userId === googleUserSession.user.id &&
          refreshRejectedAsAccess &&
          googleTokenRejectedByAppJwt &&
          rotated.refreshToken !== googleUserSession.refreshToken &&
          replayDetected &&
          loggedOut.success === true &&
          thirdDeviceBlockedBeforeEvict,
        details: `Protected JWT valid, Google token rejected as JWT, refresh rotated & replay revoked device, 3rd device blocked`,
      });
    } catch (err: any) {
      results.push({ name: '8. JWT & Session Security', passed: false, details: err.message });
    }

    // 9. Rate Limiting Guard on Public Auth Routes (429 + Retry-After)
    try {
      const reflector = new Reflector();
      const guard = new AuthRateLimitGuard(reflector);
      const origGetAll = reflector.getAllAndOverride.bind(reflector);
      reflector.getAllAndOverride = (() => ({ limit: 2, windowSeconds: 60 })) as any;

      let setHeaderCalled = false;
      const mockCtx: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ ip: '203.0.113.10', method: 'POST', route: { path: '/api/v1/auth/login' }, headers: {} }),
          getResponse: () => ({
            setHeader: (name: string) => {
              if (name.toLowerCase() === 'retry-after') setHeaderCalled = true;
            },
          }),
        }),
      };

      const pass1 = guard.canActivate(mockCtx);
      const pass2 = guard.canActivate(mockCtx);
      let blocked3 = false;
      try {
        guard.canActivate(mockCtx);
      } catch (e) {
        blocked3 = e instanceof HttpException && e.getStatus() === 429;
      }
      reflector.getAllAndOverride = origGetAll;

      results.push({
        name: '9. Auth Rate Limiter Guard Throttles Excessive Attempts (429 + Retry-After)',
        passed: pass1 && pass2 && blocked3 && setHeaderCalled,
        details: `2 requests allowed, 3rd throttled with 429 & Retry-After header`,
      });
    } catch (err: any) {
      results.push({ name: '9. Rate Limiter Guard', passed: false, details: err.message });
    }
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
  }

  return results;
}
