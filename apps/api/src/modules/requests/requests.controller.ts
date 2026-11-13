import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessRequestStatus, CreateAccessRequestDto, SubscriptionPlan } from '@smartteacherbook/shared';

@ApiTags('Access Requests (Sales Desk)')
@Controller('api/v1')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  // Mobile App Endpoints
  @Post('access-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit telephone access request from mobile app' })
  async createRequest(
    @Body() dto: CreateAccessRequestDto,
    @CurrentUser() user?: { userId?: string; id?: string; email?: string },
  ) {
    const userId = user?.userId || user?.id || 'user_1';
    const userEmail = user?.email || 'oqtuvchi@maktab.uz';
    return this.requestsService.create(userId, userEmail, dto);
  }

  @Get('access-requests/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user submitted access requests' })
  async getMyRequests(@CurrentUser() user?: { userId?: string; id?: string }) {
    const userId = user?.userId || user?.id || 'user_1';
    return this.requestsService.getMyRequests(userId);
  }

  // Admin Web Panel Endpoints
  @Get('admin/requests')
  @ApiOperation({ summary: 'List all access requests with filters (Admin Panel)' })
  @ApiQuery({ name: 'status', required: false, enum: AccessRequestStatus })
  @ApiQuery({ name: 'gradeId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAdminRequests(
    @Query('status') status?: AccessRequestStatus,
    @Query('gradeId') gradeId?: number,
    @Query('search') search?: string,
  ) {
    return this.requestsService.findAll({ status, gradeId, search });
  }

  @Patch('admin/requests/:id/contacted')
  @ApiOperation({ summary: 'Mark request as contacted / awaiting payment (Admin)' })
  async markContacted(
    @Param('id') id: string,
    @Body() body: { internalNote?: string },
    @CurrentUser() admin?: { id: string },
  ) {
    const adminId = admin?.id || 'admin_1';
    return this.requestsService.markContacted(id, adminId, body?.internalNote);
  }

  @Post('admin/requests/:id/grant')
  @ApiOperation({ summary: 'Approve payment and grant subscription license (Admin)' })
  async grantAccess(
    @Param('id') id: string,
    @Body() body: { durationDays?: number; note?: string },
    @CurrentUser() admin?: { id: string },
  ) {
    const adminId = admin?.id || 'admin_1';
    return this.requestsService.grantAccess({
      requestId: id,
      adminId,
      durationDays: body?.durationDays,
      note: body?.note,
    });
  }

  @Post('admin/requests/:id/reject')
  @ApiOperation({ summary: 'Reject access request with reason (Admin)' })
  async rejectAccess(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() admin?: { userId?: string; id?: string },
  ) {
    const adminId = admin?.userId || admin?.id || 'admin_1';
    return this.requestsService.rejectAccess(id, adminId, body?.reason || 'Sabab ko‘rsatilmadi');
  }

  @Post('admin/subscriptions/manual')
  @ApiOperation({ summary: 'Manually create approved request and grant subscription (Admin)' })
  async grantManual(
    @Body()
    body: {
      teacherNameOrEmail: string;
      phoneNumber?: string;
      gradeId: number;
      subjectId?: string;
      durationDays?: number;
      plan?: SubscriptionPlan;
    },
    @CurrentUser() admin?: { userId?: string; id?: string },
  ) {
    const adminId = admin?.userId || admin?.id || 'admin_1';
    return this.requestsService.grantManualSubscription({
      ...body,
      adminId,
    });
  }
}
