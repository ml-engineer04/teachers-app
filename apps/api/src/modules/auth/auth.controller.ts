import {
  Controller,
  Post,
  Patch,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import {
  EmailLoginDto,
  EmailRegisterDto,
  ForgotPasswordDto,
  LinkGoogleAccountDto,
  ResendVerificationDto,
  ResetPasswordDto,
  SendGoogleLinkCodeDto,
  SendOtpDto,
  VerifyEmailDto,
  VerifyOtpDto,
} from './dto/email-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { DisconnectDeviceDto } from './dto/disconnect-device.dto';
import { EvictDeviceDto } from './dto/evict-device.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthRateLimit, AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication (Email/Password, Google OIDC & 2-Device Security)')
@UseGuards(AuthRateLimitGuard)
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ---------------------------------------------------------------------------
  // Email + Password Authentication Flows
  // ---------------------------------------------------------------------------
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @AuthRateLimit({ limit: 5, windowSeconds: 60 })
  @ApiOperation({ summary: 'Register a new teacher account with email and password' })
  @ApiResponse({ status: 201, description: 'Account created; 6-digit verification code sent.' })
  @ApiResponse({ status: 409, description: 'EMAIL_ALREADY_EXISTS' })
  async register(@Body() dto: EmailRegisterDto) {
    return this.authService.registerWithEmail(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 10, windowSeconds: 60 })
  @ApiOperation({ summary: 'Verify registered email address and issue session tokens' })
  @ApiResponse({ status: 200, description: 'Email verified and JWT session tokens returned.' })
  @ApiResponse({ status: 401, description: 'VERIFICATION_CODE_INVALID or VERIFICATION_CODE_EXPIRED' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 5, windowSeconds: 60 })
  @ApiOperation({ summary: 'Resend 6-digit email verification code' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendEmailVerification(dto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 10, windowSeconds: 60 })
  @ApiOperation({ summary: 'Sign in with email and password (2-device limit enforced)' })
  @ApiResponse({ status: 200, description: 'JWT access and rotated refresh tokens returned.' })
  @ApiResponse({ status: 401, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: 403, description: 'EMAIL_NOT_VERIFIED or DEVICE_LIMIT_EXCEEDED' })
  async login(@Body() dto: EmailLoginDto) {
    return this.authService.loginWithEmail(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 5, windowSeconds: 60 })
  @ApiOperation({ summary: 'Request 6-digit password reset code via email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 5, windowSeconds: 60 })
  @ApiOperation({ summary: 'Verify reset code and set a new password (revokes active refresh tokens)' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ---------------------------------------------------------------------------
  // Google Sign-In & Safe Verified Account Linking
  // ---------------------------------------------------------------------------
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 15, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Google Sign-In with official ID Token or OAuth code verification and 2-device check',
    description:
      'Verifies Google OIDC token signature, iss, aud, exp, nonce, and email_verified. Requires explicit verification before linking an existing email/password account.',
  })
  @ApiResponse({ status: 200, description: 'Authentication successful.' })
  @ApiResponse({ status: 401, description: 'GOOGLE_TOKEN_INVALID or GOOGLE_EMAIL_NOT_VERIFIED' })
  @ApiResponse({ status: 409, description: 'ACCOUNT_LINKING_REQUIRED: Existing account must verify ownership.' })
  @ApiResponse({ status: 403, description: 'DEVICE_LIMIT_EXCEEDED: Account is already active on 2 devices.' })
  async googleSignIn(@Body() dto: GoogleAuthDto) {
    return this.authService.authenticateGoogle(dto);
  }

  @Post('google/link/send-code')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 5, windowSeconds: 60 })
  @ApiOperation({ summary: 'Send 6-digit confirmation code to link Google onto an existing account' })
  async sendGoogleLinkCode(@Body() dto: SendGoogleLinkCodeDto) {
    return this.authService.sendGoogleLinkCode(dto);
  }

  @Post('google/link')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 10, windowSeconds: 60 })
  @ApiOperation({ summary: 'Verify account ownership via password or email code and link Google account' })
  @ApiResponse({ status: 200, description: 'Google account verified and linked; JWT tokens returned.' })
  @ApiResponse({ status: 401, description: 'INVALID_CREDENTIALS, LINK_TOKEN_INVALID, or VERIFICATION_CODE_INVALID' })
  async linkGoogleAccount(@Body() dto: LinkGoogleAccountDto) {
    return this.authService.linkGoogleAccount(dto);
  }

  // ---------------------------------------------------------------------------
  // Session Refresh & Logout
  // ---------------------------------------------------------------------------
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 30, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Rotate Refresh Token',
    description: 'Exchanges a valid refresh token for a rotated access/refresh token pair with reuse detection.',
  })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshSession(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke current device refresh token' })
  async logout(@CurrentUser() user: any, @Body() body: { deviceId?: string }) {
    const targetDeviceId = body.deviceId || user.deviceId;
    return this.authService.logout(user.userId, targetDeviceId);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all user sessions across all devices' })
  async logoutAll(@CurrentUser() user: any) {
    return this.authService.logoutAll(user.userId);
  }

  // ---------------------------------------------------------------------------
  // User Profile & Device Management
  // ---------------------------------------------------------------------------
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile, subscriptions, and active device count' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getUserProfile(user.userId, user.deviceId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current user profile name' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() body: { fullName?: string; firstName?: string; lastName?: string },
  ) {
    return this.authService.updateUserProfile(user.userId, body);
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List active devices for current user (Max 2)' })
  async getMyDevices(@CurrentUser() user: any) {
    return this.authService.getActiveDevices(user.userId, user.deviceId);
  }

  @Delete('devices/:deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Disconnect an active device to allow another login (Authenticated)' })
  async disconnectMyDevice(@CurrentUser() user: any, @Param('deviceId') deviceId: string) {
    return this.authService.disconnectDevice(user.userId, deviceId);
  }

  @Post('devices/evict')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 10, windowSeconds: 60 })
  @ApiOperation({ summary: 'Evict device using Google ID token verification (Pre-login)' })
  async evictWithGoogleToken(@Body() dto: EvictDeviceDto) {
    return this.authService.evictDeviceWithGoogleToken(dto.idToken, dto.deviceIdToRemove);
  }

  @Get('devices/:userId')
  @ApiOperation({ summary: 'List active devices by User ID for device limit resolution' })
  async getDevicesByUserId(@Param('userId') userId: string) {
    return this.authService.getActiveDevices(userId);
  }

  @Get('devices/user/:userId')
  @ApiOperation({ summary: 'List active devices by User ID (Alias)' })
  async getDevicesByUserIdAlias(@Param('userId') userId: string) {
    return this.authService.getActiveDevices(userId);
  }

  @Delete('devices/user/:userId/:deviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect device by User ID and Device ID (Pre-login)' })
  async disconnectUserDevice(@Param('userId') userId: string, @Param('deviceId') deviceId: string) {
    return this.authService.disconnectDevice(userId, deviceId);
  }

  @Post('devices/:userId/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect device by User ID for pre-login slot release' })
  async disconnectDeviceByUserId(@Param('userId') userId: string, @Body() dto: DisconnectDeviceDto) {
    const deviceId = dto.deviceIdToRemove;
    if (!deviceId) {
      return { success: false, message: 'deviceIdToRemove is required' };
    }
    return this.authService.disconnectDevice(userId, deviceId);
  }

  // ---------------------------------------------------------------------------
  // Passwordless Email OTP Flow
  // ---------------------------------------------------------------------------
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 5, windowSeconds: 60 })
  @ApiOperation({ summary: 'Send 6-digit verification code to email (Passwordless OTP)' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.email);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 10, windowSeconds: 60 })
  @ApiOperation({ summary: 'Verify 6-digit code and authenticate user (Passwordless OTP)' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.code, dto.deviceId, dto.deviceModel, dto.platform);
  }
}
