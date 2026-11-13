import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  fullName?: string;
  deviceId?: string;
  role?: string;
  type?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    const secretOrKey =
      configService.get<string>('JWT_SECRET') ||
      configService.get<string>('JWT_ACCESS_SECRET') ||
      (isProduction ? '' : 'stb_jwt_super_access_secret_key_change_in_production_min32chars');
    if (!secretOrKey) {
      throw new Error('JWT_SECRET (or JWT_ACCESS_SECRET) must be configured in production');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Yaroqsiz autentifikatsiya tokeni');
    }

    if (payload.type === 'refresh') {
      throw new UnauthorizedException('Refresh token API so‘rovlari uchun ishlatilmaydi');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      deviceId: payload.deviceId,
      role: payload.role || 'TEACHER',
    };
  }
}
