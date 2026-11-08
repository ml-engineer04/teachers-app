import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleTokenVerifierService {
  private readonly logger = new Logger(GoogleTokenVerifierService.name);
  private client: OAuth2Client;
  private allowedAudiences: string[];

  constructor(private configService: ConfigService) {
    const webClientId =
      this.configService.get<string>('GOOGLE_WEB_CLIENT_ID') ||
      '541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com';
    const androidClientId =
      this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID') ||
      '541312544893-h3tpi0tjfpiinus9l1dok3jon295s717.apps.googleusercontent.com';

    this.client = new OAuth2Client(webClientId);
    this.allowedAudiences = [webClientId, androidClientId].filter(Boolean);

    this.logger.log(`Initialized Google Token Verifier with audiences: ${this.allowedAudiences.join(', ')}`);
  }

  /**
   * Verifies Google ID token cryptographic signature, issuer, audience, and expiration.
   * Extracts Google stable subject identifier (`sub`), verified email, and profile details.
   */
  async verifyGoogleToken(idToken: string): Promise<VerifiedGoogleUser> {
    if (!idToken || typeof idToken !== 'string') {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google ID Token mavjud emas');
    }

    try {
      // 1. Verify cryptographic signature, audience, and expiration via Google's public keys
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.allowedAudiences,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google tokenidan maʼlumot olib bo‘lmadi');
      }

      // 2. Validate token issuer
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (!payload.iss || !validIssuers.includes(payload.iss)) {
        this.logger.warn(`Invalid Google token issuer: ${payload.iss}`);
        throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google token emitenti (issuer) yaroqsiz');
      }

      // 3. Validate Google stable subject identifier
      if (!payload.sub) {
        throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google foydalanuvchi identifikatori (sub) topilmadi');
      }

      // 4. Validate email
      if (!payload.email) {
        throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google hisobida email manzili topilmadi');
      }

      // 5. Validate email verification status
      if (payload.email_verified === false) {
        throw new UnauthorizedException('GOOGLE_TOKEN_INVALID: Google hisobi email manzili tasdiqlanmagan');
      }

      return {
        sub: payload.sub,
        email: payload.email.trim().toLowerCase(),
        fullName: payload.name || payload.email.split('@')[0],
        avatarUrl: payload.picture,
        emailVerified: true,
      };
    } catch (realGoogleError: any) {
      // 6. Controlled test-harness verification:
      // STRICT RULE: Only enabled if ALLOW_TEST_TOKEN_MOCKING === 'true' AND NOT in production environment.
      const isProduction = process.env.NODE_ENV === 'production';
      const allowTestHarness = process.env.ALLOW_TEST_TOKEN_MOCKING === 'true';

      if (!isProduction && allowTestHarness) {
        const testUser = this.verifyTestHarnessToken(idToken);
        if (testUser) {
          this.logger.warn(`🧪 [TEST HARNESS ONLY] Verified test token for: ${testUser.email}`);
          return testUser;
        }
      }

      this.logger.warn(`Google token verification rejected: ${realGoogleError.message}`);
      throw new UnauthorizedException(`GOOGLE_TOKEN_INVALID: ${realGoogleError.message}`);
    }
  }

  /**
   * Strictly validates structured test tokens for automated test runners.
   * Requires valid issuer, audience, unexpired timestamp, and verified email.
   */
  private verifyTestHarnessToken(idToken: string): VerifiedGoogleUser | null {
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
        if (!validIssuers.includes(payload.iss)) return null;
        if (!this.allowedAudiences.includes(payload.aud)) return null;
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        if (!payload.sub || !payload.email || payload.email_verified === false) return null;

        return {
          sub: payload.sub,
          email: payload.email.trim().toLowerCase(),
          fullName: payload.name || payload.fullName || payload.email.split('@')[0],
          avatarUrl: payload.picture || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
          emailVerified: true,
        };
      }
    } catch {}
    return null;
  }
}
