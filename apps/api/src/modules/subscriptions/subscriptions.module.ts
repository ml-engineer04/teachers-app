import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { LicenseSignerService } from './license-signer.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, LicenseSignerService],
  exports: [SubscriptionsService, LicenseSignerService],
})
export class SubscriptionsModule {}
