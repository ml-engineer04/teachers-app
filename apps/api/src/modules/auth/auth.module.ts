import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { GoogleTokenVerifierService } from './services/google-token-verifier.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    EmailModule,
    UsersModule,
    SubscriptionsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const secret =
          configService.get<string>('JWT_SECRET') ||
          configService.get<string>('JWT_ACCESS_SECRET') ||
          (isProduction ? '' : 'stb_jwt_super_access_secret_key_change_in_production_min32chars');
        if (!secret) {
          throw new Error('JWT_SECRET (or JWT_ACCESS_SECRET) must be configured in production');
        }
        return { secret };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleTokenVerifierService, JwtStrategy, JwtAuthGuard, AuthRateLimitGuard],
  exports: [AuthService, GoogleTokenVerifierService, JwtAuthGuard, AuthRateLimitGuard],
})
export class AuthModule {}
