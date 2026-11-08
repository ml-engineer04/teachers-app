import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, UpdateSubjectDto } from '@smartteacherbook/shared';

@ApiTags('Subjects Management')
@Controller('api/v1/subjects')
export class SubjectsController {
  constructor(private subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List subjects, optionally filtered by gradeId' })
  @ApiQuery({ name: 'gradeId', required: false, type: Number })
  async getSubjects(@Query('gradeId') gradeId?: string) {
    if (gradeId) {
      return this.subjectsService.findByGrade(parseInt(gradeId, 10));
    }
    return this.subjectsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Admin create subject under grade' })
  async createSubject(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Admin update subject metadata' })
  async updateSubject(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin delete subject' })
  async deleteSubject(@Param('id') id: string) {
    const ok = await this.subjectsService.delete(id);
    return { success: ok };
  }
}
