import { Module } from '@nestjs/common';
import { AnswerMappingsService } from './answer-mappings.service';
import { AnswerMappingsController } from './answer-mappings.controller';

@Module({
  controllers: [AnswerMappingsController],
  providers: [AnswerMappingsService],
  exports: [AnswerMappingsService],
})
export class AnswerMappingsModule {}
