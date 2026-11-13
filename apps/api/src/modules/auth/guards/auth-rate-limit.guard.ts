import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const AUTH_RATE_LIMIT_KEY = 'auth_rate_limit_options';

export interface AuthRateLimitOptions {
  limit: number;
  windowSeconds: number;
}

export const AuthRateLimit = (options: AuthRateLimitOptions) =>
  SetMetadata(AUTH_RATE_LIMIT_KEY, options);

interface BucketRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, BucketRecord>();
  private lastCleanupAt = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (process.env.DISABLE_AUTH_RATE_LIMIT === 'true' && process.env.NODE_ENV !== 'production') {
      return true;
    }

    const opts = this.reflector.getAllAndOverride<AuthRateLimitOptions>(AUTH_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!opts) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const ip =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    const routeKey = `${req.method}:${req.route?.path || req.url}`;
    const bucketKey = `${ip}:${routeKey}`;

    const now = Date.now();
    this.cleanupIfNeeded(now);

    const windowMs = opts.windowSeconds * 1000;
    let record = this.buckets.get(bucketKey);

    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + windowMs };
      this.buckets.set(bucketKey, record);
      return true;
    }

    record.count += 1;
    if (record.count > opts.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(retryAfterSeconds));
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Juda ko‘p urinish qilindi. Iltimos, ${retryAfterSeconds} soniyadan so‘ng qayta urinib ko‘ring.`,
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private cleanupIfNeeded(now: number) {
    if (now - this.lastCleanupAt < 60_000) return;
    this.lastCleanupAt = now;
    for (const [key, val] of this.buckets.entries()) {
      if (val.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
