import {
  Controller,
  Post,
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
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { DisconnectDeviceDto } from './dto/disconnect-device.dto';
import { EvictDeviceDto } from './dto/evict-device.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Mobile Authentication (Google OAuth 2.0 & Session Security)')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Google Sign-In with official ID Token verification and 2-device check',
    description:
      'Receives Google ID Token, validates signature & audience on Google Cloud, enforces max 2 active devices, and returns application JWT tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful. Application access and refresh tokens returned.',
  })
  @ApiResponse({
    status: 401,
    description: 'GOOGLE_TOKEN_INVALID: Invalid Google ID token or unverified email.',
  })
  @ApiResponse({
    status: 403,
    description: 'DEVICE_LIMIT_EXCEEDED: Account is already active on 2 devices.',
  })
  async googleSignIn(@Body() dto: GoogleAuthDto) {
    return this.authService.authenticateGoogle(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate Refresh Token',
    description:
      'Exchanges a valid long-lived refresh token for a new access token and rotated refresh token with reuse detection.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed and rotated.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token, expired, or token reuse attempt detected.',
  })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshSession(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke current device refresh token' })
  async logout(
    @CurrentUser() user: any,
    @Body() body: { deviceId?: string },
  ) {
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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile, subscriptions, and active device count' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getUserProfile(user.userId, user.deviceId);
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
  async disconnectMyDevice(
    @CurrentUser() user: any,
    @Param('deviceId') deviceId: string,
  ) {
    return this.authService.disconnectDevice(user.userId, deviceId);
  }

  @Post('devices/evict')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evict device using Google ID token verification (Pre-login)' })
  async evictWithGoogleToken(@Body() dto: EvictDeviceDto) {
    return this.authService.evictDeviceWithGoogleToken(dto.idToken, dto.deviceIdToRemove);
  }

  // ---------------------------------------------------------------------------
  // Pre-login device limit resolution endpoints (for mobile DeviceLimitModal)
  // ---------------------------------------------------------------------------
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
  async disconnectUserDevice(
    @Param('userId') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.authService.disconnectDevice(userId, deviceId);
  }

  @Post('devices/:userId/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect device by User ID for pre-login slot release' })
  async disconnectDeviceByUserId(
    @Param('userId') userId: string,
    @Body() dto: DisconnectDeviceDto,
  ) {
    const deviceId = dto.deviceIdToRemove;
    if (!deviceId) {
      return { success: false, message: 'deviceIdToRemove is required' };
    }
    return this.authService.disconnectDevice(userId, deviceId);
  }

  // ---------------------------------------------------------------------------
  // Email OTP Fallback Endpoints
  // ---------------------------------------------------------------------------
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send 6-digit verification code to Gmail (Fallback)' })
  async sendOtp(@Body() body: { email: string }) {
    return this.authService.sendOtp(body.email);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit code and authenticate user (Fallback)' })
  async verifyOtp(
    @Body()
    body: {
      email: string;
      code: string;
      deviceId?: string;
      deviceModel?: string;
    },
  ) {
    return this.authService.verifyOtp(
      body.email,
      body.code,
      body.deviceId,
      body.deviceModel,
    );
  }
}
