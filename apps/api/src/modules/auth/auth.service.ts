import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { GoogleAuthDto } from './dto/google-auth.dto';
import {
  EmailLoginDto,
  EmailRegisterDto,
  ForgotPasswordDto,
  LinkGoogleAccountDto,
  ResetPasswordDto,
  SendGoogleLinkCodeDto,
  VerifyEmailDto,
} from './dto/email-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleTokenVerifierService, VerifiedGoogleUser } from './services/google-token-verifier.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  isApiTestEnvironment,
  readJsonDiskSync,
  writeJsonDiskSync,
} from '../../common/persistence/local-disk.store';

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    fullName: string;
    avatarUrl?: string | null;
    googleId?: string | null;
    emailVerified: boolean;
    role: string;
    authProvider: string;
    isActive: boolean;
  };
  subscription?: {
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'PENDING';
    plan: string | null;
    expiresAt: string | null;
  };
}

interface DeviceRegistrationMeta {
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  platform?: string;
}

type ChallengePurpose = 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'GOOGLE_LINK' | 'OTP_LOGIN';

interface ChallengeRecord {
  id: string;
  userId?: string | null;
  email: string;
  purpose: ChallengePurpose;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

interface GoogleLinkTokenPayload {
  type: 'google_link';
  userId: string;
  email: string;
  googleSub: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  avatarUrl?: string;
}

const BCRYPT_ROUNDS = 12;
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_CHALLENGE_ATTEMPTS = 5;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  // In-memory fallback stores mirroring DB state when PostgreSQL is offline
  private memUsers: Map<string, any> = new Map();
  private memExternalAccounts: Map<string, any> = new Map();
  private memDevices: Map<string, any[]> = new Map();
  private memSubscriptions: Map<string, any[]> = new Map();
  private memChallenges: Map<string, ChallengeRecord> = new Map();
  private dummyHashPromise: Promise<string> | null = null;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private prisma: PrismaService,
    private googleVerifier: GoogleTokenVerifierService,
    private usersService: UsersService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  private diskEnabled = false;

  onModuleInit() {
    this.diskEnabled = !isApiTestEnvironment();
    if (this.diskEnabled) {
      const saved = readJsonDiskSync<{
        users?: Array<[string, any]>;
        externalAccounts?: Array<[string, any]>;
        devices?: Array<[string, any[]]>;
      }>('auth-state.json');

      if (saved) {
        if (Array.isArray(saved.users)) {
          this.memUsers = new Map(saved.users);
        }
        if (Array.isArray(saved.externalAccounts)) {
          this.memExternalAccounts = new Map(saved.externalAccounts);
        }
        if (Array.isArray(saved.devices)) {
          this.memDevices = new Map(saved.devices);
        }
      }

      // Migrate any admin-registry users from live-snapshot.json if auth-state wasn't populated yet
      const snap = readJsonDiskSync<{ users?: Array<any> }>('live-snapshot.json');
      if (Array.isArray(snap?.users)) {
        let imported = false;
        for (const u of snap.users) {
          if (!u?.id || !u?.email) continue;
          const byEmail = Array.from(this.memUsers.values()).find(
            (existing) => existing.email === this.normalizeEmail(u.email),
          );
          if (!this.memUsers.has(u.id) && !byEmail) {
            this.memUsers.set(u.id, {
              id: u.id,
              email: this.normalizeEmail(u.email),
              passwordHash: null,
              googleId: u.googleId || null,
              firstName: u.firstName || null,
              lastName: u.lastName || null,
              fullName: u.fullName || null,
              avatarUrl: u.avatarUrl || null,
              emailVerified: u.emailVerified ?? true,
              authProvider: u.authProvider || (u.googleId ? 'GOOGLE' : 'OTP'),
              role: u.role || 'TEACHER',
              isActive: u.isActive ?? true,
              isBlocked: u.isBlocked ?? false,
              createdAt: u.createdAt || new Date().toISOString(),
              updatedAt: u.updatedAt || new Date().toISOString(),
              lastLoginAt: u.lastLoginAt || null,
            });
            if (u.googleId) {
              this.memExternalAccounts.set(`GOOGLE:${u.googleId}`, {
                id: `ext_${u.id}`,
                userId: u.id,
                provider: 'GOOGLE',
                providerSubject: u.googleId,
                email: this.normalizeEmail(u.email),
              });
            }
            imported = true;
          }
          if (Array.isArray(u.devices) && u.devices.length > 0 && !this.memDevices.has(u.id)) {
            this.memDevices.set(u.id, u.devices);
            imported = true;
          }
        }
        if (imported) {
          this.persistAuthDisk();
        }
      }
    }

    this.usersService.onDeviceRevoked((userId, deviceId) => {
      const devs = this.memDevices.get(userId) || [];
      const target = devs.find((d) => d.deviceId === deviceId || d.id === deviceId);
      if (target) {
        target.isActive = false;
        target.refreshTokenHash = null;
        this.persistAuthDisk();
      }
    });
  }

  private persistAuthDisk() {
    if (!this.diskEnabled) return;
    writeJsonDiskSync('auth-state.json', {
      users: Array.from(this.memUsers.entries()),
      externalAccounts: Array.from(this.memExternalAccounts.entries()),
      devices: Array.from(this.memDevices.entries()),
    });
  }

  private getAccessSecret(): string {
    const isProd = (this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV) === 'production';
    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      (isProd ? '' : 'stb_jwt_super_access_secret_key_change_in_production_min32chars');
    if (!secret) {
      throw new Error('JWT_SECRET (or JWT_ACCESS_SECRET) must be configured in production');
    }
    return secret;
  }

  private getRefreshSecret(): string {
    const isProd = (this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV) === 'production';
    const secret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      (isProd ? '' : 'stb_jwt_super_refresh_secret_key_change_in_production_min32chars');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET must be configured in production');
    }
    return secret;
  }

  private getLinkSecret(): string {
    return this.configService.get<string>('GOOGLE_LINK_SECRET') || `${this.getAccessSecret()}:google-link`;
  }

  private getDummyHash(): Promise<string> {
    if (!this.dummyHashPromise) {
      this.dummyHashPromise = bcrypt.hash('smartteacherbook-constant-time-guard', BCRYPT_ROUNDS);
    }
    return this.dummyHashPromise;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private mergeAuthProvider(existing: string | null | undefined, provider: 'EMAIL' | 'GOOGLE' | 'OTP'): string {
    const parts = (existing || '')
      .split(',')
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);
    if (!parts.includes(provider)) {
      parts.push(provider);
    }
    return parts.join(',');
  }

  private computeNames(input: {
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    email: string;
  }) {
    const firstName = input.firstName?.trim() || null;
    const lastName = input.lastName?.trim() || null;
    const explicitFull = input.fullName?.trim();
    const joined = [firstName, lastName].filter(Boolean).join(' ').trim();
    const fallback = input.email
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      firstName,
      lastName,
      fullName: explicitFull || joined || fallback || 'O‘qituvchi',
    };
  }

  private async syncUserToAdminRegistry(user: any) {
    try {
      const devs = await this.getActiveDevices(user.id);
      const subs = await this.subscriptionsService.findByUserId(user.id);
      const activeSubs = subs.filter((s) => s.isActive && new Date(s.expiresAt) > new Date()).length;
      this.usersService.upsertUserFromAuth(user, devs.devices, activeSubs);
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // User & Challenge Storage Helpers (Prisma + Resilient Memory Fallback)
  // ---------------------------------------------------------------------------
  private async findUserById(userId: string) {
    if (this.prisma.isConnected) {
      try {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user) return user;
      } catch (err: any) {
        this.logger.warn(`Prisma findUserById error, using fallback: ${err.message}`);
      }
    }
    return this.memUsers.get(userId) || null;
  }

  private async findUserByEmail(email: string) {
    const cleanEmail = this.normalizeEmail(email);
    if (this.prisma.isConnected) {
      try {
        const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
        if (user) return user;
      } catch (err: any) {
        this.logger.warn(`Prisma findUserByEmail error, using fallback: ${err.message}`);
      }
    }
    return Array.from(this.memUsers.values()).find((u) => u.email === cleanEmail) || null;
  }

  private async findUserByGoogleSub(sub: string) {
    if (this.prisma.isConnected) {
      try {
        const ext = await this.prisma.externalAccount.findUnique({
          where: { provider_providerSubject: { provider: 'GOOGLE', providerSubject: sub } },
          include: { user: true },
        });
        if (ext?.user) return ext.user;

        const legacyUser = await this.prisma.user.findUnique({ where: { googleId: sub } });
        if (legacyUser) {
          await this.prisma.externalAccount.upsert({
            where: { provider_providerSubject: { provider: 'GOOGLE', providerSubject: sub } },
            update: { email: legacyUser.email },
            create: {
              userId: legacyUser.id,
              provider: 'GOOGLE',
              providerSubject: sub,
              email: legacyUser.email,
            },
          });
          return legacyUser;
        }
        return null;
      } catch (err: any) {
        this.logger.warn(`Prisma findUserByGoogleSub error, using fallback: ${err.message}`);
      }
    }

    const memExt = this.memExternalAccounts.get(`GOOGLE:${sub}`);
    if (memExt) {
      const u = this.memUsers.get(memExt.userId);
      if (u) return u;
    }
    return Array.from(this.memUsers.values()).find((u) => u.googleId === sub) || null;
  }

  private async updateUserRecord(userId: string, data: Record<string, any>) {
    if (this.prisma.isConnected) {
      try {
        const updated = await this.prisma.user.update({
          where: { id: userId },
          data,
        });
        return updated;
      } catch (err: any) {
        this.logger.warn(`Prisma updateUserRecord error, using fallback: ${err.message}`);
      }
    }

    const memUser = this.memUsers.get(userId);
    if (!memUser) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    Object.assign(memUser, data, { updatedAt: new Date() });
    this.persistAuthDisk();
    return memUser;
  }

  private hashChallengeCode(purpose: ChallengePurpose, email: string, code: string): string {
    return crypto.createHash('sha256').update(`${purpose}:${email}:${code}`).digest('hex');
  }

  private async createChallenge(email: string, purpose: ChallengePurpose, userId?: string | null): Promise<string> {
    const cleanEmail = this.normalizeEmail(email);
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashChallengeCode(purpose, cleanEmail, code);
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    if (this.prisma.isConnected) {
      try {
        await this.prisma.authChallenge.deleteMany({
          where: { email: cleanEmail, purpose, consumedAt: null },
        });
        await this.prisma.authChallenge.create({
          data: {
            userId: userId || null,
            email: cleanEmail,
            purpose,
            codeHash,
            attempts: 0,
            expiresAt,
          },
        });
        return code;
      } catch (err: any) {
        this.logger.warn(`Prisma createChallenge error, using fallback: ${err.message}`);
      }
    }

    const key = `${purpose}:${cleanEmail}`;
    this.memChallenges.set(key, {
      id: crypto.randomUUID(),
      userId: userId || null,
      email: cleanEmail,
      purpose,
      codeHash,
      attempts: 0,
      expiresAt,
      consumedAt: null,
      createdAt: new Date(),
    });
    return code;
  }

  private async verifyAndConsumeChallenge(email: string, purpose: ChallengePurpose, code: string) {
    const cleanEmail = this.normalizeEmail(email);
    const cleanCode = code.trim();
    const incomingHash = this.hashChallengeCode(purpose, cleanEmail, cleanCode);

    if (this.prisma.isConnected) {
      try {
        const record = await this.prisma.authChallenge.findFirst({
          where: { email: cleanEmail, purpose, consumedAt: null },
          orderBy: { createdAt: 'desc' },
        });

        if (!record) {
          throw new UnauthorizedException('VERIFICATION_CODE_INVALID: Tasdiqlash kodi topilmadi yoki muddati o‘tgan.');
        }

        if (record.expiresAt.getTime() < Date.now()) {
          await this.prisma.authChallenge.delete({ where: { id: record.id } }).catch(() => {});
          throw new UnauthorizedException('VERIFICATION_CODE_EXPIRED: Tasdiqlash kodi muddati o‘tib ketgan.');
        }

        if (record.attempts >= MAX_CHALLENGE_ATTEMPTS) {
          throw new UnauthorizedException('VERIFICATION_ATTEMPTS_EXCEEDED: Urinishlar soni tugadi. Yangi kod so‘rang.');
        }

        const storedBuf = Buffer.from(record.codeHash, 'utf8');
        const incomingBuf = Buffer.from(incomingHash, 'utf8');
        const matches = storedBuf.length === incomingBuf.length && crypto.timingSafeEqual(storedBuf, incomingBuf);

        if (!matches) {
          await this.prisma.authChallenge.update({
            where: { id: record.id },
            data: { attempts: { increment: 1 } },
          });
          throw new UnauthorizedException('VERIFICATION_CODE_INVALID: Kiritilgan tasdiqlash kodi noto‘g‘ri.');
        }

        await this.prisma.authChallenge.update({
          where: { id: record.id },
          data: { consumedAt: new Date() },
        });
        return record;
      } catch (err: any) {
        if (err instanceof UnauthorizedException) throw err;
        this.logger.warn(`Prisma verifyChallenge error, using fallback: ${err.message}`);
      }
    }

    const key = `${purpose}:${cleanEmail}`;
    const memRecord = this.memChallenges.get(key);
    if (!memRecord || memRecord.consumedAt) {
      throw new UnauthorizedException('VERIFICATION_CODE_INVALID: Tasdiqlash kodi topilmadi yoki muddati o‘tgan.');
    }

    if (memRecord.expiresAt.getTime() < Date.now()) {
      this.memChallenges.delete(key);
      throw new UnauthorizedException('VERIFICATION_CODE_EXPIRED: Tasdiqlash kodi muddati o‘tib ketgan.');
    }

    if (memRecord.attempts >= MAX_CHALLENGE_ATTEMPTS) {
      throw new UnauthorizedException('VERIFICATION_ATTEMPTS_EXCEEDED: Urinishlar soni tugadi. Yangi kod so‘rang.');
    }

    const storedBuf = Buffer.from(memRecord.codeHash, 'utf8');
    const incomingBuf = Buffer.from(incomingHash, 'utf8');
    const matches = storedBuf.length === incomingBuf.length && crypto.timingSafeEqual(storedBuf, incomingBuf);

    if (!matches) {
      memRecord.attempts += 1;
      throw new UnauthorizedException('VERIFICATION_CODE_INVALID: Kiritilgan tasdiqlash kodi noto‘g‘ri.');
    }

    memRecord.consumedAt = new Date();
    this.memChallenges.delete(key);
    return memRecord;
  }

  private async issueUserSession(user: any, deviceMeta: DeviceRegistrationMeta): Promise<AuthSessionResponse> {
    if (user.isBlocked || !user.isActive) {
      this.logger.warn(`🚫 Suspended user attempted to login: ${user.email}`);
      throw new ForbiddenException('ACCOUNT_SUSPENDED: Ushbu hisob maʼmuriyat tomonidan bloklangan.');
    }

    await this.validateAndRegisterDevice(user.id, deviceMeta);
    const session = await this.generateSessionTokens(user, deviceMeta.deviceId);
    await this.storeDeviceRefreshToken(user.id, deviceMeta.deviceId, session.refreshToken);
    const subscriptionInfo = await this.getUserSubscriptionSummary(user.id);
    await this.syncUserToAdminRegistry(user);

    return {
      ...session,
      subscription: subscriptionInfo,
    };
  }

  // ---------------------------------------------------------------------------
  // Email + Password Registration, Verification, Login & Password Reset
  // ---------------------------------------------------------------------------
  async registerWithEmail(dto: EmailRegisterDto) {
    const cleanEmail = this.normalizeEmail(dto.email);
    const names = this.computeNames({
      firstName: dto.firstName,
      lastName: dto.lastName,
      fullName: dto.fullName,
      email: cleanEmail,
    });
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const existing = await this.findUserByEmail(cleanEmail);

    if (existing && existing.emailVerified) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Ushbu email manzili bilan allaqachon ro‘yxatdan o‘tilgan. Tizimga kiring.',
      });
    }

    let targetUser: any;
    if (existing && !existing.emailVerified) {
      targetUser = await this.updateUserRecord(existing.id, {
        passwordHash,
        firstName: names.firstName ?? existing.firstName,
        lastName: names.lastName ?? existing.lastName,
        fullName: names.fullName,
        authProvider: this.mergeAuthProvider(existing.authProvider, 'EMAIL'),
      });
    } else if (this.prisma.isConnected) {
      try {
        targetUser = await this.prisma.user.create({
          data: {
            email: cleanEmail,
            passwordHash,
            firstName: names.firstName,
            lastName: names.lastName,
            fullName: names.fullName,
            emailVerified: false,
            authProvider: 'EMAIL',
            role: 'TEACHER',
            isActive: true,
            isBlocked: false,
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          throw new ConflictException({
            statusCode: 409,
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Ushbu email manzili bilan allaqachon ro‘yxatdan o‘tilgan.',
          });
        }
        this.logger.warn(`Prisma registerWithEmail error, using fallback: ${err.message}`);
      }
    }

    if (!targetUser) {
      targetUser = {
        id: `usr_${crypto.randomUUID()}`,
        email: cleanEmail,
        passwordHash,
        googleId: null,
        firstName: names.firstName,
        lastName: names.lastName,
        fullName: names.fullName,
        avatarUrl: null,
        emailVerified: false,
        authProvider: 'EMAIL',
        role: 'TEACHER',
        isActive: true,
        isBlocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };
      this.memUsers.set(targetUser.id, targetUser);
      this.persistAuthDisk();
    }

    const code = await this.createChallenge(cleanEmail, 'EMAIL_VERIFY', targetUser.id);
    const emailResult = await this.emailService.sendVerificationOtp(cleanEmail, code);
    await this.syncUserToAdminRegistry(targetUser);

    return {
      success: true,
      requiresVerification: true,
      email: cleanEmail,
      delivered: emailResult.delivered,
      message: emailResult.delivered
        ? 'Tasdiqlash kodi email pochtangizga yuborildi!'
        : 'Tasdiqlash kodi tayyorlandi. Emailingizni tasdiqlang.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<AuthSessionResponse> {
    const cleanEmail = this.normalizeEmail(dto.email);
    await this.verifyAndConsumeChallenge(cleanEmail, 'EMAIL_VERIFY', dto.code);

    const existing = await this.findUserByEmail(cleanEmail);
    if (!existing) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const updatedUser = await this.updateUserRecord(existing.id, {
      emailVerified: true,
      lastLoginAt: new Date(),
    });

    return this.issueUserSession(updatedUser, {
      deviceId: dto.deviceId || 'default-device',
      deviceModel: dto.deviceModel || 'Web Browser',
      osVersion: dto.osVersion || 'Web',
      appVersion: dto.appVersion || '1.0.0',
      platform: dto.platform || 'WEB',
    });
  }

  async resendEmailVerification(email: string) {
    const cleanEmail = this.normalizeEmail(email);
    const user = await this.findUserByEmail(cleanEmail);
    let delivered = false;

    if (user && !user.emailVerified && user.isActive && !user.isBlocked) {
      const code = await this.createChallenge(cleanEmail, 'EMAIL_VERIFY', user.id);
      const emailResult = await this.emailService.sendVerificationOtp(cleanEmail, code);
      delivered = emailResult.delivered;
    }

    return {
      success: true,
      delivered,
      message: 'Agar hisob tasdiqlanmagan bo‘lsa, yangi tasdiqlash kodi emailingizga yuborildi.',
    };
  }

  async loginWithEmail(dto: EmailLoginDto): Promise<AuthSessionResponse> {
    const cleanEmail = this.normalizeEmail(dto.email);
    const user = await this.findUserByEmail(cleanEmail);

    const hashToCompare = user?.passwordHash || (await this.getDummyHash());
    const passwordMatches = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !user.passwordHash || !passwordMatches) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email yoki parol noto‘g‘ri.',
      });
    }

    if (!user.emailVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        message: 'Email manzilingiz hali tasdiqlanmagan. Pochtadagi kodni kiriting.',
      });
    }

    const updatedUser = await this.updateUserRecord(user.id, {
      lastLoginAt: new Date(),
    });

    return this.issueUserSession(updatedUser, {
      deviceId: dto.deviceId,
      deviceModel: dto.deviceModel,
      osVersion: dto.osVersion,
      appVersion: dto.appVersion,
      platform: dto.platform || 'ANDROID',
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const cleanEmail = this.normalizeEmail(dto.email);
    const user = await this.findUserByEmail(cleanEmail);

    if (user && user.isActive && !user.isBlocked) {
      const code = await this.createChallenge(cleanEmail, 'PASSWORD_RESET', user.id);
      await this.emailService.sendPasswordResetCode(cleanEmail, code);
    }

    return {
      success: true,
      message: 'Agar ushbu email tizimda mavjud bo‘lsa, parolni tiklash uchun 6 xonali kod yuborildi.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const cleanEmail = this.normalizeEmail(dto.email);
    await this.verifyAndConsumeChallenge(cleanEmail, 'PASSWORD_RESET', dto.code);

    const user = await this.findUserByEmail(cleanEmail);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.updateUserRecord(user.id, {
      passwordHash,
      emailVerified: true,
      authProvider: this.mergeAuthProvider(user.authProvider, 'EMAIL'),
    });

    // Revoke existing refresh tokens after password reset
    await this.logoutAll(user.id);

    return {
      success: true,
      message: 'Parolingiz muvaffaqiyatli yangilandi. Endi yangi parol bilan tizimga kiring.',
    };
  }

  // ---------------------------------------------------------------------------
  // Google Sign-In (Scenarios A, B, C, D) & Verified Account Linking
  // ---------------------------------------------------------------------------
  async authenticateGoogle(dto: GoogleAuthDto): Promise<AuthSessionResponse> {
    this.logger.log(`🔑 Authenticating Google account on device: [${dto.deviceModel} / ${dto.deviceId}]`);

    let googleProfile: VerifiedGoogleUser;
    if (dto.idToken) {
      googleProfile = await this.googleVerifier.verifyGoogleToken(dto.idToken, dto.nonce);
    } else if (dto.authorizationCode) {
      googleProfile = await this.googleVerifier.exchangeAuthorizationCode({
        code: dto.authorizationCode,
        redirectUri: dto.redirectUri,
        codeVerifier: dto.codeVerifier,
        expectedNonce: dto.nonce,
      });
    } else {
      throw new BadRequestException(
        'GOOGLE_CREDENTIAL_REQUIRED: Google ID token yoki authorization code yuborilishi shart.',
      );
    }

    // Scenario B: Returning Google user matched by Google sub
    const existingGoogleUser = await this.findUserByGoogleSub(googleProfile.sub);
    if (existingGoogleUser) {
      const updatedUser = await this.updateUserRecord(existingGoogleUser.id, {
        lastLoginAt: new Date(),
        emailVerified: true,
        firstName: existingGoogleUser.firstName || googleProfile.firstName || null,
        lastName: existingGoogleUser.lastName || googleProfile.lastName || null,
        fullName: existingGoogleUser.fullName || googleProfile.fullName,
        avatarUrl: googleProfile.avatarUrl || existingGoogleUser.avatarUrl,
        authProvider: this.mergeAuthProvider(existingGoogleUser.authProvider, 'GOOGLE'),
      });
      return this.issueUserSession(updatedUser, dto);
    }

    // Scenario C: Email exists already, NOT yet linked to this Google sub -> NEVER auto-link!
    const existingEmailUser = await this.findUserByEmail(googleProfile.email);
    if (existingEmailUser) {
      if (existingEmailUser.isBlocked || !existingEmailUser.isActive) {
        throw new ForbiddenException('ACCOUNT_SUSPENDED: Ushbu hisob maʼmuriyat tomonidan bloklangan.');
      }

      const linkPayload: GoogleLinkTokenPayload = {
        type: 'google_link',
        userId: existingEmailUser.id,
        email: existingEmailUser.email,
        googleSub: googleProfile.sub,
        firstName: googleProfile.firstName,
        lastName: googleProfile.lastName,
        fullName: googleProfile.fullName,
        avatarUrl: googleProfile.avatarUrl,
      };
      const linkToken = this.jwtService.sign(linkPayload, {
        secret: this.getLinkSecret(),
        expiresIn: '10m',
      });

      this.logger.warn(
        `🔐 Account linking verification required for existing email [${existingEmailUser.email}]`,
      );

      throw new ConflictException({
        statusCode: 409,
        code: 'ACCOUNT_LINKING_REQUIRED',
        message:
          'Ushbu email manzili bilan avval ro‘yxatdan o‘tilgan. Google hisobini bog‘lash uchun hisob egasi ekanligingizni tasdiqlang.',
        email: existingEmailUser.email,
        hasPassword: Boolean(existingEmailUser.passwordHash),
        linkToken,
      });
    }

    // Scenario A: New Google user -> create User + ExternalAccount atomically
    const newUser = await this.createGoogleUser(googleProfile);
    return this.issueUserSession(newUser, dto);
  }

  private async createGoogleUser(profile: VerifiedGoogleUser) {
    if (this.prisma.isConnected) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              googleId: profile.sub,
              email: profile.email,
              firstName: profile.firstName || null,
              lastName: profile.lastName || null,
              fullName: profile.fullName,
              avatarUrl: profile.avatarUrl || null,
              emailVerified: true,
              authProvider: 'GOOGLE',
              role: 'TEACHER',
              isActive: true,
              isBlocked: false,
              lastLoginAt: new Date(),
            },
          });

          await tx.externalAccount.create({
            data: {
              userId: created.id,
              provider: 'GOOGLE',
              providerSubject: profile.sub,
              email: profile.email,
            },
          });

          return created;
        });
      } catch (err: any) {
        this.logger.warn(`Prisma createGoogleUser error, using fallback: ${err.message}`);
      }
    }

    const user = {
      id: `usr_${crypto.randomUUID()}`,
      email: profile.email,
      passwordHash: null,
      googleId: profile.sub,
      firstName: profile.firstName || null,
      lastName: profile.lastName || null,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl || null,
      emailVerified: true,
      authProvider: 'GOOGLE',
      role: 'TEACHER',
      isActive: true,
      isBlocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };
    this.memUsers.set(user.id, user);
    this.memExternalAccounts.set(`GOOGLE:${profile.sub}`, {
      id: `ext_${crypto.randomUUID()}`,
      userId: user.id,
      provider: 'GOOGLE',
      providerSubject: profile.sub,
      email: profile.email,
    });
    this.persistAuthDisk();
    return user;
  }

  private verifyLinkToken(linkToken: string): GoogleLinkTokenPayload {
    let payload: any;
    try {
      payload = this.jwtService.verify(linkToken, { secret: this.getLinkSecret() });
    } catch {
      throw new UnauthorizedException(
        'LINK_TOKEN_INVALID: Bog‘lash sessiyasi yaroqsiz yoki muddati o‘tgan. Qaytadan Google bilan urinib ko‘ring.',
      );
    }

    if (payload?.type !== 'google_link' || !payload.userId || !payload.googleSub || !payload.email) {
      throw new UnauthorizedException('LINK_TOKEN_INVALID: Noto‘g‘ri bog‘lash tokeni.');
    }

    return payload as GoogleLinkTokenPayload;
  }

  async sendGoogleLinkCode(dto: SendGoogleLinkCodeDto) {
    const payload = this.verifyLinkToken(dto.linkToken);
    const user = await this.findUserById(payload.userId);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi hisobi topilmadi.');
    }
    if (user.isBlocked || !user.isActive) {
      throw new ForbiddenException('ACCOUNT_SUSPENDED: Ushbu hisob bloklangan.');
    }

    const code = await this.createChallenge(user.email, 'GOOGLE_LINK', user.id);
    const emailResult = await this.emailService.sendAccountLinkCode(user.email, code);

    return {
      success: true,
      email: user.email,
      delivered: emailResult.delivered,
      message: 'Google hisobini bog‘lash uchun tasdiqlash kodi emailingizga yuborildi.',
    };
  }

  async linkGoogleAccount(dto: LinkGoogleAccountDto): Promise<AuthSessionResponse> {
    const payload = this.verifyLinkToken(dto.linkToken);
    const user = await this.findUserById(payload.userId);

    if (!user) {
      throw new NotFoundException('Foydalanuvchi hisobi topilmadi.');
    }
    if (user.isBlocked || !user.isActive) {
      throw new ForbiddenException('ACCOUNT_SUSPENDED: Ushbu hisob bloklangan.');
    }

    // Ownership verification: either existing password OR 6-digit email challenge
    if (dto.password) {
      if (!user.passwordHash) {
        throw new BadRequestException(
          'PASSWORD_NOT_SET: Ushbu hisobda parol o‘rnatilmagan. Email tasdiqlash kodidan foydalaning.',
        );
      }
      const matches = await bcrypt.compare(dto.password, user.passwordHash);
      if (!matches) {
        throw new UnauthorizedException({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Kiritilgan parol noto‘g‘ri.',
        });
      }
    } else if (dto.otpCode) {
      await this.verifyAndConsumeChallenge(user.email, 'GOOGLE_LINK', dto.otpCode);
    } else {
      throw new BadRequestException(
        'LINK_VERIFICATION_REQUIRED: Hisobni bog‘lash uchun joriy parolni yoki 6 xonali email kodni kiriting.',
      );
    }

    // Prevent Google sub hijacking across distinct users
    const alreadyClaimed = await this.findUserByGoogleSub(payload.googleSub);
    if (alreadyClaimed && alreadyClaimed.id !== user.id) {
      throw new ConflictException({
        statusCode: 409,
        code: 'GOOGLE_ACCOUNT_ALREADY_LINKED',
        message: 'Ushbu Google hisobi boshqa foydalanuvchiga biriktirilgan.',
      });
    }

    const mergedProvider = this.mergeAuthProvider(user.authProvider, 'GOOGLE');
    const updatedNames = this.computeNames({
      firstName: user.firstName || payload.firstName,
      lastName: user.lastName || payload.lastName,
      fullName: user.fullName || payload.fullName,
      email: user.email,
    });

    let linkedUser: any = null;
    if (this.prisma.isConnected) {
      try {
        linkedUser = await this.prisma.$transaction(async (tx) => {
          await tx.externalAccount.upsert({
            where: {
              provider_providerSubject: {
                provider: 'GOOGLE',
                providerSubject: payload.googleSub,
              },
            },
            update: { email: user.email, userId: user.id },
            create: {
              userId: user.id,
              provider: 'GOOGLE',
              providerSubject: payload.googleSub,
              email: user.email,
            },
          });

          return await tx.user.update({
            where: { id: user.id },
            data: {
              googleId: payload.googleSub,
              emailVerified: true,
              authProvider: mergedProvider,
              firstName: updatedNames.firstName,
              lastName: updatedNames.lastName,
              fullName: updatedNames.fullName,
              avatarUrl: user.avatarUrl || payload.avatarUrl || null,
              lastLoginAt: new Date(),
            },
          });
        });
      } catch (err: any) {
        this.logger.warn(`Prisma linkGoogleAccount error, using fallback: ${err.message}`);
      }
    }

    if (!linkedUser) {
      linkedUser = await this.updateUserRecord(user.id, {
        googleId: payload.googleSub,
        emailVerified: true,
        authProvider: mergedProvider,
        firstName: updatedNames.firstName,
        lastName: updatedNames.lastName,
        fullName: updatedNames.fullName,
        avatarUrl: user.avatarUrl || payload.avatarUrl || null,
        lastLoginAt: new Date(),
      });
      this.memExternalAccounts.set(`GOOGLE:${payload.googleSub}`, {
        id: `ext_${crypto.randomUUID()}`,
        userId: user.id,
        provider: 'GOOGLE',
        providerSubject: payload.googleSub,
        email: user.email,
      });
      this.persistAuthDisk();
    }

    this.logger.log(`🔗 Google sub linked safely after verification for user [${user.email}]`);
    return this.issueUserSession(linkedUser, dto);
  }

  // ---------------------------------------------------------------------------
  // 2-Device Limit Enforcement & Session Tokens
  // ---------------------------------------------------------------------------
  private async validateAndRegisterDevice(userId: string, dto: DeviceRegistrationMeta) {
    if (this.prisma.isConnected) {
      try {
        const activeDevices = await this.prisma.device.findMany({
          where: { userId, isActive: true },
          orderBy: { lastActiveAt: 'desc' },
        });

        const existingDevice = activeDevices.find((d) => d.deviceId === dto.deviceId);
        if (existingDevice) {
          await this.prisma.device.update({
            where: { id: existingDevice.id },
            data: {
              deviceModel: dto.deviceModel,
              osVersion: dto.osVersion,
              appVersion: dto.appVersion,
              platform: dto.platform || 'ANDROID',
              lastActiveAt: new Date(),
            },
          });
          return;
        }

        if (activeDevices.length >= 2) {
          this.logger.warn(`🚫 Device limit reached for user [${userId}]. Active count: ${activeDevices.length}`);
          throw new ForbiddenException({
            statusCode: 403,
            code: 'DEVICE_LIMIT_EXCEEDED',
            message: 'DEVICE_LIMIT_REACHED: Ushbu hisob allaqachon maksimal 2 ta qurilmada ulangan.',
            devices: activeDevices.map((d) => ({
              id: d.id,
              deviceId: d.deviceId,
              deviceModel: d.deviceModel,
              osVersion: d.osVersion,
              platform: d.platform || 'ANDROID',
              lastActiveAt: d.lastActiveAt.toISOString(),
              isCurrent: false,
            })),
            userId,
          });
        }

        await this.prisma.device.upsert({
          where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
          update: {
            deviceModel: dto.deviceModel,
            osVersion: dto.osVersion,
            appVersion: dto.appVersion,
            platform: dto.platform || 'ANDROID',
            isActive: true,
            lastActiveAt: new Date(),
          },
          create: {
            userId,
            deviceId: dto.deviceId,
            deviceModel: dto.deviceModel,
            osVersion: dto.osVersion,
            appVersion: dto.appVersion,
            platform: dto.platform || 'ANDROID',
            isActive: true,
            lastActiveAt: new Date(),
          },
        });
        return;
      } catch (err: any) {
        if (err instanceof ForbiddenException) throw err;
        this.logger.warn(`Prisma device check error, using resilient fallback: ${err.message}`);
      }
    }

    const userDevs = this.memDevices.get(userId) || [];
    const activeDevs = userDevs.filter((d) => d.isActive);
    const existingDev = activeDevs.find((d) => d.deviceId === dto.deviceId);

    if (existingDev) {
      existingDev.deviceModel = dto.deviceModel;
      existingDev.osVersion = dto.osVersion;
      existingDev.appVersion = dto.appVersion;
      existingDev.platform = dto.platform || 'ANDROID';
      existingDev.lastActiveAt = new Date();
      return;
    }

    // Reactivate device if it previously logged out
    const inactiveDev = userDevs.find((d) => d.deviceId === dto.deviceId && !d.isActive);
    if (inactiveDev) {
      if (activeDevs.length >= 2) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'DEVICE_LIMIT_EXCEEDED',
          message: 'DEVICE_LIMIT_REACHED: Ushbu hisob allaqachon maksimal 2 ta qurilmada ulangan.',
          devices: activeDevs.map((d) => ({
            id: d.id,
            deviceId: d.deviceId,
            deviceModel: d.deviceModel,
            osVersion: d.osVersion,
            platform: d.platform || 'ANDROID',
            lastActiveAt: d.lastActiveAt instanceof Date ? d.lastActiveAt.toISOString() : d.lastActiveAt,
            isCurrent: false,
          })),
          userId,
        });
      }
      inactiveDev.isActive = true;
      inactiveDev.deviceModel = dto.deviceModel;
      inactiveDev.osVersion = dto.osVersion;
      inactiveDev.appVersion = dto.appVersion;
      inactiveDev.platform = dto.platform || 'ANDROID';
      inactiveDev.lastActiveAt = new Date();
      this.persistAuthDisk();
      return;
    }

    if (activeDevs.length >= 2) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'DEVICE_LIMIT_EXCEEDED',
        message: 'DEVICE_LIMIT_REACHED: Ushbu hisob allaqachon maksimal 2 ta qurilmada ulangan.',
        devices: activeDevs.map((d) => ({
          id: d.id,
          deviceId: d.deviceId,
          deviceModel: d.deviceModel,
          osVersion: d.osVersion,
          platform: d.platform || 'ANDROID',
          lastActiveAt: d.lastActiveAt instanceof Date ? d.lastActiveAt.toISOString() : d.lastActiveAt,
          isCurrent: false,
        })),
        userId,
      });
    }

    userDevs.push({
      id: `dev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      deviceId: dto.deviceId,
      deviceModel: dto.deviceModel,
      osVersion: dto.osVersion,
      appVersion: dto.appVersion,
      platform: dto.platform || 'ANDROID',
      isActive: true,
      lastActiveAt: new Date(),
      refreshTokenHash: null,
    });
    this.memDevices.set(userId, userDevs);
    this.persistAuthDisk();
  }

  private async generateSessionTokens(user: any, deviceId: string) {
    const accessSecret = this.getAccessSecret();
    const refreshSecret = this.getRefreshSecret();
    const accessExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m';
    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY') || '90d';

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role || 'TEACHER',
        deviceId,
      },
      {
        secret: accessSecret,
        expiresIn: accessExpiry,
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        deviceId,
        type: 'refresh',
        jti: crypto.randomUUID(),
      },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiry,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        fullName: user.fullName || user.email.split('@')[0],
        avatarUrl: user.avatarUrl || null,
        googleId: user.googleId || null,
        emailVerified: Boolean(user.emailVerified),
        role: user.role || 'TEACHER',
        authProvider: user.authProvider || 'EMAIL',
        isActive: user.isActive !== false,
      },
    };
  }

  private async storeDeviceRefreshToken(userId: string, deviceId: string, refreshToken: string) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    if (this.prisma.isConnected) {
      try {
        await this.prisma.device.updateMany({
          where: { userId, deviceId },
          data: { refreshTokenHash: hash, lastActiveAt: new Date() },
        });
        return;
      } catch (err: any) {
        this.logger.warn(`Prisma store refresh hash error: ${err.message}`);
      }
    }

    const devs = this.memDevices.get(userId) || [];
    const dev = devs.find((d) => d.deviceId === deviceId);
    if (dev) {
      dev.refreshTokenHash = hash;
      dev.lastActiveAt = new Date();
      this.persistAuthDisk();
    }
  }

  async refreshSession(dto: RefreshTokenDto) {
    const refreshSecret = this.getRefreshSecret();

    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('SESSION_EXPIRED: Yangilash tokeni yaroqsiz yoki muddati o‘tgan.');
    }

    if (payload.type !== 'refresh' || !payload.sub || !payload.deviceId) {
      throw new UnauthorizedException('REFRESH_TOKEN_INVALID: Noto‘g‘ri token formati.');
    }

    if (payload.deviceId !== dto.deviceId) {
      throw new UnauthorizedException('REFRESH_TOKEN_INVALID: Qurilma identifikatori mos kelmadi.');
    }

    const userId = payload.sub;
    const incomingHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');

    let storedDevice: any = null;
    if (this.prisma.isConnected) {
      try {
        storedDevice = await this.prisma.device.findFirst({
          where: { userId, deviceId: dto.deviceId, isActive: true },
        });
      } catch {}
    }

    if (!storedDevice) {
      const devs = this.memDevices.get(userId) || [];
      storedDevice = devs.find((d) => d.deviceId === dto.deviceId && d.isActive);
    }

    if (!storedDevice) {
      throw new UnauthorizedException('SESSION_EXPIRED: Qurilma topilmadi yoki sessiya bekor qilingan.');
    }

    if (!storedDevice.refreshTokenHash || storedDevice.refreshTokenHash !== incomingHash) {
      this.logger.warn(
        `🚨 [TOKEN REUSE DETECTED] Replay attack attempt on device [${dto.deviceId}] for user [${userId}]`,
      );
      await this.disconnectDevice(userId, dto.deviceId);
      throw new UnauthorizedException(
        'REFRESH_TOKEN_REVOKED: Xavfsizlik xavfi: eski token qayta ishlatildi. Sessiya bekor qilindi.',
      );
    }

    const profile = await this.getUserProfile(userId);
    if (profile.user.isBlocked) {
      throw new ForbiddenException('ACCOUNT_SUSPENDED: Ushbu hisob bloklangan.');
    }

    const newSession = await this.generateSessionTokens(profile.user, dto.deviceId);
    await this.storeDeviceRefreshToken(userId, dto.deviceId, newSession.refreshToken);

    this.logger.log(`🔄 Session tokens refreshed and rotated for user [${userId}] on device [${dto.deviceId}]`);

    return {
      accessToken: newSession.accessToken,
      refreshToken: newSession.refreshToken,
      expiresIn: newSession.expiresIn,
    };
  }

  async logout(userId: string, deviceId?: string) {
    this.logger.log(`🚪 Logging out device [${deviceId || 'all'}] for user [${userId}]`);
    if (!deviceId) {
      return this.logoutAll(userId);
    }

    if (this.prisma.isConnected) {
      try {
        await this.prisma.device.updateMany({
          where: { userId, deviceId },
          data: { isActive: false, refreshTokenHash: null },
        });
      } catch {}
    }

    const devs = this.memDevices.get(userId) || [];
    let updatedAny = false;
    for (const dev of devs) {
      if (dev.deviceId === deviceId || dev.id === deviceId) {
        dev.isActive = false;
        dev.refreshTokenHash = null;
        updatedAny = true;
      }
    }
    if (updatedAny) {
      this.persistAuthDisk();
    }

    const user = await this.findUserById(userId);
    if (user) {
      await this.syncUserToAdminRegistry(user);
    }

    const remaining = await this.getActiveDevices(userId);

    return {
      success: true,
      message: 'Muvaffaqiyatli chiqildi. Qurilma sessiyasi bekor qilindi.',
      activeDevicesCount: remaining.currentCount,
      devices: remaining.devices,
    };
  }

  async logoutAll(userId: string) {
    this.logger.log(`🚪 Logging out all devices for user [${userId}]`);

    if (this.prisma.isConnected) {
      try {
        await this.prisma.device.updateMany({
          where: { userId },
          data: { isActive: false, refreshTokenHash: null },
        });
      } catch {}
    }

    const devs = this.memDevices.get(userId) || [];
    for (const d of devs) {
      d.isActive = false;
      d.refreshTokenHash = null;
    }
    if (devs.length > 0) {
      this.persistAuthDisk();
    }

    const user = await this.findUserById(userId);
    if (user) {
      await this.syncUserToAdminRegistry(user);
    }

    return {
      success: true,
      message: 'Barcha faol sessiyalardan muvaffaqiyatli chiqildi.',
      activeDevicesCount: 0,
      devices: [],
    };
  }

  async getActiveDevices(userId: string, currentDeviceId?: string) {
    let devices: any[] = [];

    if (this.prisma.isConnected) {
      try {
        devices = await this.prisma.device.findMany({
          where: { userId, isActive: true },
          orderBy: { lastActiveAt: 'desc' },
        });
      } catch {}
    }

    if (devices.length === 0) {
      devices = (this.memDevices.get(userId) || []).filter((d) => d.isActive);
    }

    return {
      devices: devices.map((d) => ({
        id: d.id,
        deviceId: d.deviceId,
        deviceModel: d.deviceModel,
        osVersion: d.osVersion,
        platform: d.platform || 'ANDROID',
        lastActiveAt: d.lastActiveAt instanceof Date ? d.lastActiveAt.toISOString() : d.lastActiveAt,
        isCurrent: d.deviceId === currentDeviceId,
      })),
      maxAllowed: 2,
      currentCount: devices.length,
      exceededLimit: devices.length >= 2,
    };
  }

  async disconnectDevice(userId: string, deviceIdToRemove: string) {
    this.logger.log(`Disconnecting device [${deviceIdToRemove}] for user [${userId}]`);

    if (this.prisma.isConnected) {
      try {
        await this.prisma.device.updateMany({
          where: { userId, deviceId: deviceIdToRemove },
          data: { isActive: false, refreshTokenHash: null },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma error disconnecting device: ${err.message}`);
      }
    }

    const devs = this.memDevices.get(userId) || [];
    let updatedAny = false;
    for (const target of devs) {
      if (target.deviceId === deviceIdToRemove || target.id === deviceIdToRemove) {
        target.isActive = false;
        target.refreshTokenHash = null;
        updatedAny = true;
      }
    }
    if (updatedAny) {
      this.persistAuthDisk();
    }

    const user = await this.findUserById(userId);
    if (user) {
      await this.syncUserToAdminRegistry(user);
    }

    const remaining = await this.getActiveDevices(userId);
    return {
      success: true,
      message: 'Qurilma hisobdan muvaffaqiyatli uzildi.',
      devices: remaining.devices,
    };
  }

  async evictDeviceWithGoogleToken(idToken: string, deviceIdToRemove: string) {
    const verified = await this.googleVerifier.verifyGoogleToken(idToken);
    const existingGoogleUser = await this.findUserByGoogleSub(verified.sub);
    if (!existingGoogleUser) {
      throw new NotFoundException('Ushbu Google hisobiga bog‘langan profil topilmadi.');
    }

    return this.disconnectDevice(existingGoogleUser.id, deviceIdToRemove);
  }

  async getUserSubscriptionSummary(userId: string) {
    try {
      const subs = await this.subscriptionsService.findByUserId(userId);
      const validSub = subs.find((s) => s.isActive && new Date(s.expiresAt) > new Date());
      if (validSub) {
        return {
          status: 'ACTIVE' as const,
          plan: validSub.plan,
          expiresAt: validSub.expiresAt,
        };
      }
    } catch {}

    const userSubs = this.memSubscriptions.get(userId) || [];
    const validMemSub = userSubs.find((s) => s.isActive && new Date(s.expiresAt) > new Date());
    if (validMemSub) {
      return {
        status: 'ACTIVE' as const,
        plan: validMemSub.plan,
        expiresAt: validMemSub.expiresAt,
      };
    }

    return {
      status: 'INACTIVE' as const,
      plan: null,
      expiresAt: null,
    };
  }

  async updateUserProfile(userId: string, data: { fullName?: string; firstName?: string; lastName?: string }) {
    const updateData: Record<string, any> = {};
    if (data.fullName?.trim()) updateData.fullName = data.fullName.trim();
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim() || null;
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim() || null;

    if (Object.keys(updateData).length > 0) {
      const updated = await this.updateUserRecord(userId, updateData);
      await this.syncUserToAdminRegistry(updated);
    }

    return this.getUserProfile(userId);
  }

  async getUserProfile(userId: string, currentDeviceId?: string) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi profili topilmadi');
    }

    const devices = await this.getActiveDevices(userId, currentDeviceId);
    const subscription = await this.getUserSubscriptionSummary(userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        fullName: user.fullName || user.email.split('@')[0],
        avatarUrl: user.avatarUrl || null,
        googleId: user.googleId || null,
        emailVerified: Boolean(user.emailVerified),
        role: user.role || 'TEACHER',
        authProvider: user.authProvider || 'EMAIL',
        isActive: user.isActive !== false,
        isBlocked: !!user.isBlocked,
        createdAt: user.createdAt,
      },
      activeDevicesCount: devices.currentCount,
      maxDevicesAllowed: 2,
      devices: devices.devices,
      subscription,
    };
  }

  // ---------------------------------------------------------------------------
  // Passwordless Email OTP Flow (Hardened: Hash-Verified, Zero Hardcoded Bypass)
  // ---------------------------------------------------------------------------
  async sendOtp(email: string) {
    const cleanEmail = this.normalizeEmail(email);
    const existing = await this.findUserByEmail(cleanEmail);
    const code = await this.createChallenge(cleanEmail, 'OTP_LOGIN', existing?.id || null);
    const emailResult = await this.emailService.sendVerificationOtp(cleanEmail, code);

    return {
      success: true,
      message: emailResult.delivered
        ? 'Tasdiqlash kodi Gmail pochtangizga muvaffaqiyatli yuborildi!'
        : 'Tasdiqlash kodi tayyorlandi.',
      delivered: emailResult.delivered,
    };
  }

  async verifyOtp(
    email: string,
    code: string,
    deviceId = 'android_dev_primary',
    deviceModel = 'Android Device',
    platform = 'ANDROID',
  ): Promise<AuthSessionResponse> {
    const cleanEmail = this.normalizeEmail(email);
    await this.verifyAndConsumeChallenge(cleanEmail, 'OTP_LOGIN', code);

    let user = await this.findUserByEmail(cleanEmail);
    const names = this.computeNames({ email: cleanEmail });

    if (!user) {
      if (this.prisma.isConnected) {
        try {
          user = await this.prisma.user.create({
            data: {
              email: cleanEmail,
              firstName: names.firstName,
              lastName: names.lastName,
              fullName: names.fullName,
              emailVerified: true,
              authProvider: 'OTP',
              role: 'TEACHER',
              isActive: true,
              isBlocked: false,
              lastLoginAt: new Date(),
            },
          });
        } catch (err: any) {
          this.logger.warn(`Prisma verifyOtp user create fallback: ${err.message}`);
        }
      }
      if (!user) {
        user = {
          id: `usr_${crypto.randomUUID()}`,
          email: cleanEmail,
          passwordHash: null,
          googleId: null,
          firstName: names.firstName,
          lastName: names.lastName,
          fullName: names.fullName,
          avatarUrl: null,
          emailVerified: true,
          authProvider: 'OTP',
          role: 'TEACHER',
          isActive: true,
          isBlocked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        };
        this.memUsers.set(user.id, user);
        this.persistAuthDisk();
      }
    } else {
      user = await this.updateUserRecord(user.id, {
        emailVerified: true,
        lastLoginAt: new Date(),
        authProvider: this.mergeAuthProvider(user.authProvider, 'OTP'),
      });
    }

    return this.issueUserSession(user, {
      deviceId,
      deviceModel: deviceModel || 'Mobile Device',
      osVersion: platform === 'WEB' ? 'Web Browser' : 'Android 14',
      appVersion: '1.0.0',
      platform,
    });
  }
}
