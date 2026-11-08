import { Controller, Get, Post, Put, Delete, Body, Param, Query, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnswerMappingsService } from './answer-mappings.service';
import { AnswerMapping } from '@smartteacherbook/shared';

@ApiTags('Answer Mappings (Teacher ↔ Student Book)')
@Controller('api/v1/answer-mappings')
export class AnswerMappingsController {
  constructor(private readonly answerMappingsService: AnswerMappingsService) {}

  @Get()
  @ApiOperation({ summary: 'List answer mappings for a grade and subject' })
  @ApiQuery({ name: 'gradeId', required: false, type: Number })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  async findAll(
    @Query('gradeId') gradeId?: number,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.answerMappingsService.findAll(gradeId, subjectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create single answer mapping link (Admin)' })
  async create(@Body() body: Omit<AnswerMapping, 'id'>) {
    return this.answerMappingsService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update answer mapping (Admin)' })
  async update(
    @Param('id') id: string,
    @Body() body: Partial<AnswerMapping>,
  ) {
    return this.answerMappingsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete answer mapping (Admin)' })
  async delete(@Param('id') id: string) {
    return this.answerMappingsService.delete(id);
  }

  @Post('import-csv')
  @ApiOperation({ summary: 'Bulk import answer mappings from CSV (Admin)' })
  async importCsv(
    @Body() body: { gradeId: number; subjectId: string; csvContent: string },
  ) {
    return this.answerMappingsService.importFromCsv(body.gradeId, body.subjectId, body.csvContent);
  }

  @Get('export-csv')
  @ApiOperation({ summary: 'Export answer mappings to CSV (Admin)' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="answer-mappings.csv"')
  async exportCsv(
    @Query('gradeId') gradeId: number,
    @Query('subjectId') subjectId: string,
  ) {
    return this.answerMappingsService.exportToCsv(Number(gradeId), subjectId);
  }
}
