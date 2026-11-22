import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('✅ Connected to PostgreSQL database successfully.');
    } catch (error: any) {
      this.isConnected = false;
      this.logger.error(`🚨 [CRITICAL_DB_FALLBACK] PostgreSQL connection not established: ${error.message}`);
      this.logger.error(
        '🚨 [CRITICAL_DB_FALLBACK] Operating in IN-MEMORY / JSON STORE fallback mode! Database writes will NOT persist to PostgreSQL until DATABASE_URL connection is restored.',
      );
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}
