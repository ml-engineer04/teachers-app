import { Controller, Get, Put, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { UpdateGradeDto } from '@smartteacherbook/shared';

@ApiTags('Grades Catalog')
@Controller('api/v1/grades')
export class GradesController {
  constructor(private gradesService: GradesService) {}

  @Get()
  @ApiOperation({ summary: 'List all grades 1-11 with subscription prices' })
  async getAllGrades() {
    return this.gradesService.findAll();
  }

  @Get('pricing/plans')
  @ApiOperation({ summary: 'Get global subscription plans & pricing' })
  async getGeneralPricing() {
    return this.gradesService.getGeneralPricing();
  }

  @Put('pricing/plans')
  @ApiOperation({ summary: 'Admin update global subscription plans & pricing' })
  async updateGeneralPricing(@Body() body: any) {
    const plans = Array.isArray(body) ? body : body?.plans || [];
    return this.gradesService.updateGeneralPricing(plans);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single grade by number' })
  async getGradeById(@Param('id', ParseIntPipe) id: number) {
    return this.gradesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update grade pricing (Monthly, Quarterly, Yearly)' })
  async updateGrade(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGradeDto) {
    return this.gradesService.update(id, dto);
  }
}
