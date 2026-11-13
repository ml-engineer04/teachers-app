import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import {
  CreateGradeDto,
  UpdateGradeDto,
  UpsertGradeSubjectPricingDto,
} from '@smartteacherbook/shared';

@ApiTags('Grades Catalog')
@Controller('api/v1/grades')
export class GradesController {
  constructor(private gradesService: GradesService) {}

  @Get()
  @ApiOperation({ summary: 'List configured grades with optional activeOnly filter' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  async getAllGrades(@Query('activeOnly') activeOnly?: string) {
    return this.gradesService.findAll(activeOnly === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Admin create a new grade' })
  async createGrade(@Body() dto: CreateGradeDto) {
    return this.gradesService.create(dto);
  }

  @Get('pricing/plans')
  @ApiOperation({ summary: 'Get subscription plans & pricing (supports gradeId + subjectId filter)' })
  @ApiQuery({ name: 'gradeId', required: false, type: Number })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  async getGeneralPricing(
    @Query('gradeId') gradeId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    const parsedGrade = gradeId ? parseInt(gradeId, 10) : undefined;
    return this.gradesService.getGeneralPricing(
      parsedGrade && !isNaN(parsedGrade) ? parsedGrade : undefined,
      subjectId,
    );
  }

  @Put('pricing/plans')
  @ApiOperation({ summary: 'Admin update global subscription plans & pricing' })
  async updateGeneralPricing(@Body() body: any) {
    const plans = Array.isArray(body) ? body : body?.plans || [];
    return this.gradesService.updateGeneralPricing(plans);
  }

  @Get('pricing/matrix')
  @ApiOperation({ summary: 'Get full (grade x subject) pricing matrix (Admin)' })
  async getPricingMatrix() {
    return this.gradesService.getPricingMatrix();
  }

  @Put('pricing/matrix')
  @ApiOperation({ summary: 'Upsert per-(grade, subject) pricing entry or batch (Admin)' })
  async upsertPricingMatrix(
    @Body()
    body:
      | UpsertGradeSubjectPricingDto
      | { entries: UpsertGradeSubjectPricingDto[] },
  ) {
    const payload = Array.isArray((body as any)?.entries) ? (body as any).entries : body;
    return this.gradesService.upsertPricingMatrix(payload);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single grade by number' })
  async getGradeById(@Param('id', ParseIntPipe) id: number) {
    return this.gradesService.findOne(id);
  }

  @Put(':id')
  @Patch(':id')
  @ApiOperation({ summary: 'Update grade title, status & pricing (Monthly, Quarterly, Yearly)' })
  async updateGrade(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGradeDto) {
    return this.gradesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin delete a grade' })
  async deleteGrade(@Param('id', ParseIntPipe) id: number) {
    return this.gradesService.delete(id);
  }
}
