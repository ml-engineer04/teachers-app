import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmailModule } from './modules/email/email.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { GradesModule } from './modules/grades/grades.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { ContentModule } from './modules/content/content.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { RequestsModule } from './modules/requests/requests.module';
import { AnswerMappingsModule } from './modules/answer-mappings/answer-mappings.module';
import { UsersModule } from './modules/users/users.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    PrismaModule,
    AuditModule,
    EmailModule,
    AuthModule,
    AdminAuthModule,
    GradesModule,
    SubjectsModule,
    ContentModule,
    SubscriptionsModule,
    RequestsModule,
    AnswerMappingsModule,
    UsersModule,
    DashboardModule,
  ],
})
export class AppModule {}
