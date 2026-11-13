import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Subscriptions')
@Controller('api/v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List current user active and past subscriptions' })
  async getMySubscriptions(@CurrentUser() user?: { userId?: string; id?: string }) {
    const userId = user?.userId || user?.id || 'user_1';
    return this.subscriptionsService.findByUserId(userId);
  }

  @Get('license/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Generate cryptographic signed license token for offline reader' })
  async getSignedLicense(
    @Param('id') subscriptionId: string,
    @Query('deviceId') deviceId?: string,
  ) {
    const targetDeviceId = deviceId || 'demo_device_default';
    return this.subscriptionsService.issueLicenseToken(subscriptionId, targetDeviceId);
  }

  @Get('public-key')
  @ApiOperation({ summary: 'Get RSA/Ed25519 Public Key for offline app token verification' })
  getPublicKey() {
    return {
      algorithm: 'RSA-SHA256',
      publicKey: this.subscriptionsService.getPublicKey(),
    };
  }
}
