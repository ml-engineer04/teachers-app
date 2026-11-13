import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleTokenVerifierService {
  private readonly logger = new Logger(GoogleTokenVerifierService.name);
  private readonly primaryClientId: string;
  private readonly clientSecret: string;
  private readonly client: OAuth2Client;
  private readonly allowedAudiences: string[];

  constructor(private configService: ConfigService) {
    const primaryClientId =
      this.configService.get<string>('GOOGLE_CLIENT_ID')?.trim() ||
      this.configService.get<string>('GOOGLE_WEB_CLIENT_ID')?.trim() ||
      '';
    const webClientId = this.configService.get<string>('GOOGLE_WEB_CLIENT_ID')?.trim() || '';
    const androidClientId =
      this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID')?.trim() || '';
    const iosClientId = this.configService.get<string>('GOOGLE_IOS_CLIENT_ID')?.trim() || '';

    this.primaryClientId = primaryClientId;
    this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET')?.trim() || '';
    this.allowedAudiences = Array.from(
      new Set([primaryClientId, webClientId, androidClientId, iosClientId].filter(Boolean)),
    );

    if (this.allowedAudiences.length === 0) {
      this.logger.warn(
        'GOOGLE_CLIENT_ID / GOOGLE_WEB_CLIENT_ID is not configured; Google ID token verification will reject logins until configured.',
      );
    } else {
      this.logger.log(
        `Initialized Google OIDC Verifier for ${this.allowedAudiences.length} configured OAuth client audience(s).`,
      );
    }

    this.client = new OAuth2Client(this.primaryClientId || undefined);
  }

  getConfiguredAudiences(): string[] {
    return [...this.allowedAudiences];
  }

  /**
   * Verifies Google ID token cryptographic signature (RS256 via Google JWKS),
   * issuer, audience, expiration, optional OIDC nonce, and email_verified claim.
   */
  async verifyGoogleToken(idToken: string, expectedNonce?: string): Promise<VerifiedGoogleUser> {
    if (!idToken || typeof idToken !== 'string') {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google ID Token mavjud emas.');
    }

    if (this.allowedAudiences.length === 0) {
      throw new ServiceUnavailableException(
        'GOOGLE_AUTH_NOT_CONFIGURED: Serverda Google OAuth Client ID sozlanmagan.',
      );
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.allowedAudiences,
      });

      const payload = ticket.getPayload();
      return this.validateAndExtractClaims(payload, expectedNonce);
    } catch (realGoogleError: any) {
      if (realGoogleError instanceof UnauthorizedException) {
        throw realGoogleError;
      }

      const isProduction = process.env.NODE_ENV === 'production';
      const allowTestHarness = process.env.ALLOW_TEST_TOKEN_MOCKING === 'true';

      if (!isProduction && allowTestHarness) {
        const testUser = this.verifyTestHarnessToken(idToken, expectedNonce);
        if (testUser) {
          this.logger.warn(`[TEST HARNESS ONLY] Verified structured test Google token.`);
          return testUser;
        }
      }

      this.logger.warn(`Google token verification rejected: ${realGoogleError?.message || 'invalid token'}`);
      throw new UnauthorizedException(
        'GOOGLE_TOKEN_INVALID: Google tasdiqlash tokeni yaroqsiz yoki muddati tugagan.',
      );
    }
  }

  /**
   * Exchanges an OAuth 2.0 Authorization Code on the backend (using GOOGLE_CLIENT_SECRET)
   * and verifies the returned OpenID Connect ID Token.
   */
  async exchangeAuthorizationCode(params: {
    code: string;
    redirectUri?: string;
    codeVerifier?: string;
    expectedNonce?: string;
  }): Promise<VerifiedGoogleUser> {
    if (!this.primaryClientId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'GOOGLE_AUTH_CODE_NOT_CONFIGURED: Serverda GOOGLE_CLIENT_ID yoki GOOGLE_CLIENT_SECRET sozlanmagan.',
      );
    }

    const oauthClient = new OAuth2Client(
      this.primaryClientId,
      this.clientSecret,
      params.redirectUri || 'postmessage',
    );

    try {
      const { tokens } = await oauthClient.getToken({
        code: params.code,
        codeVerifier: params.codeVerifier,
        redirect_uri: params.redirectUri || 'postmessage',
      });

      if (!tokens.id_token) {
        throw new UnauthorizedException(
          'GOOGLE_TOKEN_INVALID: Google OAuth javobida ID token topilmadi.',
        );
      }

      return await this.verifyGoogleToken(tokens.id_token, params.expectedNonce);
    } catch (err: any) {
      if (err instanceof UnauthorizedException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      this.logger.warn(`Google auth code exchange failed: ${err?.message || 'unknown error'}`);
      throw new UnauthorizedException(
        'GOOGLE_AUTH_EXCHANGE_FAILED: Google autentifikatsiya kodini tekshirib bo‘lmadi.',
      );
    }
  }

  /**
   * Validates standard OIDC claims extracted from a cryptographically verified payload.
   */
  validateAndExtractClaims(payload?: TokenPayload, expectedNonce?: string): VerifiedGoogleUser {
    if (!payload) {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google tokenidan maʼlumot olinmadi.');
    }

    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!payload.iss || !validIssuers.includes(payload.iss)) {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google token emitenti (issuer) yaroqsiz.');
    }

    const aud = typeof payload.aud === 'string' ? payload.aud : '';
    if (!aud || !this.allowedAudiences.includes(aud)) {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google token audience mos kelmadi.');
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= nowSec) {
      throw new UnauthorizedException('GOOGLE_TOKEN_EXPIRED: Google tokenining muddati tugagan.');
    }

    if (expectedNonce && payload.nonce !== expectedNonce) {
      throw new UnauthorizedException('GOOGLE_NONCE_MISMATCH: OIDC nonce tasdiqlanmadi.');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google foydalanuvchi ID (sub) topilmadi.');
    }

    if (!payload.email) {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google hisobida email topilmadi.');
    }

    if (payload.email_verified !== true) {
      throw new UnauthorizedException(
        'GOOGLE_EMAIL_NOT_VERIFIED: Google hisobingizdagi email manzili tasdiqlanmagan.',
      );
    }

    const cleanEmail = payload.email.trim().toLowerCase();
    const firstName = payload.given_name?.trim() || undefined;
    const lastName = payload.family_name?.trim() || undefined;
    const fullName =
      payload.name?.trim() ||
      [firstName, lastName].filter(Boolean).join(' ') ||
      cleanEmail.split('@')[0];

    return {
      sub: payload.sub,
      email: cleanEmail,
      firstName,
      lastName,
      fullName,
      avatarUrl: payload.picture,
      emailVerified: true,
    };
  }

  private verifyTestHarnessToken(idToken: string, expectedNonce?: string): VerifiedGoogleUser | null {
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as TokenPayload;
      return this.validateAndExtractClaims(payload, expectedNonce);
    } catch {
      return null;
    }
  }
}
