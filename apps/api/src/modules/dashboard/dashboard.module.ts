import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { RequestsModule } from '../requests/requests.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { ContentModule } from '../content/content.module';
import { AnswerMappingsModule } from '../answer-mappings/answer-mappings.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    RequestsModule,
    SubscriptionsModule,
    UsersModule,
    ContentModule,
    AnswerMappingsModule,
    AuditModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
