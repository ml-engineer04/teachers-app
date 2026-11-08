import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { IngestionWorkerService } from './ingestion.worker';

@Module({
  controllers: [ContentController],
  providers: [ContentService, IngestionWorkerService],
  exports: [ContentService, IngestionWorkerService],
})
export class ContentModule {}
