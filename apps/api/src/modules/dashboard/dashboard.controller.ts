import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Admin Dashboard & KPIs')
@Controller('api/v1/admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get high-level dashboard KPIs and system health metrics' })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Post('reset-database')
  @ApiOperation({ summary: 'Wipe all database content, books, media, users, and requests clean (Admin)' })
  async resetDatabase() {
    return this.dashboardService.resetDatabase();
  }
}
